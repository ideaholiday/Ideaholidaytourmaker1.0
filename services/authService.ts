
import { User, UserRole } from '../types';
import { MOCK_USERS } from '../constants';
import { apiClient } from './apiClient';
import { emailVerificationService } from './emailVerificationService';
import { idGeneratorService } from './idGenerator.ts'; 
import { auth, db } from './firebase';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    sendEmailVerification,
    sendPasswordResetEmail,
    applyActionCode,
    confirmPasswordReset,
    User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, updateDoc, getDoc, collection, getDocs } from 'firebase/firestore';

const STORAGE_KEY_USERS = 'iht_users_db';

class AuthService {
  private users: User[];

  constructor() {
    this.users = this.loadUsers();
  }

  private loadUsers(): User[] {
    const stored = localStorage.getItem(STORAGE_KEY_USERS);
    if (stored) {
        return JSON.parse(stored);
    }
    // Initialize with default mocks ONLY if storage is empty
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(MOCK_USERS));
    return MOCK_USERS;
  }

  private saveUsers() {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(this.users));
  }

  /**
   * Syncs the entire user directory from Firestore.
   * Call this on admin login to ensure the user list is up to date.
   */
  async syncDirectory() {
      try {
          const snapshot = await getDocs(collection(db, 'users'));
          const remoteUsers = snapshot.docs.map(d => d.data() as User);
          
          if (remoteUsers.length > 0) {
              // Merge Logic: Overwrite local with remote
              this.users = remoteUsers;
              this.saveUsers();
          }
      } catch (e) {
          console.warn("User Directory Sync Failed:", e);
      }
  }

  resolveDashboardPath(role: UserRole): string {
      const knownRoles = Object.values(UserRole);
      if (!knownRoles.includes(role)) {
          return '/unauthorized';
      }

      switch(role) {
          case UserRole.ADMIN: return '/admin/dashboard';
          case UserRole.STAFF: return '/admin/dashboard';
          case UserRole.AGENT: return '/agent/dashboard';
          case UserRole.OPERATOR: return '/operator/dashboard';
          case UserRole.HOTEL_PARTNER: return '/partner/dashboard';
          default: return '/unauthorized';
      }
  }

  async login(email: string, password: string): Promise<User> {
    this.resetAuthState();
    await apiClient.request('/auth/login', { method: 'POST' });

    // Mock Login Fallback
    this.users = this.loadUsers();
    const mockUser = this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (mockUser && password === 'password123') {
        return this.handleSystemLogin(mockUser);
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return this.handleFirebaseUser(userCredential.user, true);
    } catch (error: any) {
        if (error.code === 'auth/invalid-credential') throw new Error("Invalid email or password.");
        throw new Error(error.message || "Login failed.");
    }
  }

  async logout(user?: User | null, reason: string = 'User initiated'): Promise<void> {
    await signOut(auth);
    this.resetAuthState();
  }

  private resetAuthState() {
    apiClient.clearSession();
    sessionStorage.clear();
    // Do NOT clear IHT keys to preserve offline data, but refresh memory
    this.users = this.loadUsers();
  }

  private async handleFirebaseUser(fbUser: FirebaseUser, forceSync: boolean = false): Promise<User> {
      this.users = this.loadUsers();
      
      let authoritativeRole: UserRole | null = null;
      let remoteData: any = {};

      // Priority: Firestore Role
      if (fbUser.email) {
          try {
              const roleRef = doc(db, 'user_roles', fbUser.email.toLowerCase());
              const roleSnap = await getDoc(roleRef);
              if (roleSnap.exists()) {
                  const data = roleSnap.data();
                  authoritativeRole = data.role as UserRole;
                  remoteData = data;
              }
          } catch (e) { console.warn("Firestore role fetch failed", e); }
      }

      let user = this.users.find(u => u.id === fbUser.uid);
      if (!user && fbUser.email) {
          user = this.users.find(u => u.email.toLowerCase() === fbUser.email!.toLowerCase());
          if (user) user.id = fbUser.uid; 
      }

      if (user) {
          if (authoritativeRole) user.role = authoritativeRole;
          if (remoteData.assignedDestinations) user.assignedDestinations = remoteData.assignedDestinations;
          user.isVerified = fbUser.emailVerified;
          this.saveUsers();
          this.syncUserToFirestore(user).catch(console.warn);
      } else {
          const role = authoritativeRole || UserRole.AGENT; 
          const uniqueId = idGeneratorService.generateUniqueId(role);
          
          user = {
              id: fbUser.uid,
              uniqueId,
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
              email: fbUser.email || '',
              role: role,
              isVerified: fbUser.emailVerified,
              status: 'ACTIVE',
              joinedAt: new Date().toISOString(),
              companyName: remoteData.companyName || 'New Account'
          };
          this.users.push(user);
          this.saveUsers();
          this.syncUserToFirestore(user).catch(console.warn);
      }

      apiClient.setSession(`sess_${Date.now()}_${user.id}`);
      return user;
  }

  private handleSystemLogin(mockUser: User): User {
      this.users = this.loadUsers();
      const user = this.users.find(u => u.id === mockUser.id) || mockUser;
      user.role = mockUser.role;
      this.saveUsers();
      apiClient.setSession(`sess_mock_${Date.now()}_${user.id}`);
      return user;
  }

  async register(email: string, password: string, name: string, role: UserRole, companyName: string, phone: string, city: string): Promise<User> {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const fbUser = userCredential.user;
        await sendEmailVerification(fbUser);
        
        const uniqueId = idGeneratorService.generateUniqueId(role);
        const newUser: User = {
            id: fbUser.uid,
            uniqueId,
            name,
            email,
            role,
            companyName,
            phone,
            city,
            isVerified: false,
            status: 'PENDING_VERIFICATION',
            joinedAt: new Date().toISOString()
        };

        this.users.push(newUser);
        this.saveUsers();
        this.syncUserToFirestore(newUser).catch(console.warn);
        return newUser;
    } catch (error: any) {
        throw new Error(error.message);
    }
  }

  async getCurrentUser(): Promise<User | null> {
      return new Promise((resolve) => {
          const unsubscribe = auth.onAuthStateChanged(async (fbUser) => {
              unsubscribe();
              if (fbUser) {
                  const user = await this.handleFirebaseUser(fbUser, true);
                  resolve(user);
              } else {
                  resolve(null);
              }
          });
      });
  }

  async requestPasswordReset(email: string): Promise<void> {
      await sendPasswordResetEmail(auth, email);
  }

  async handleActionCode(code: string, mode: 'verifyEmail' | 'resetPassword', newPassword?: string): Promise<void> {
      if (mode === 'verifyEmail') {
          await applyActionCode(auth, code);
          if (auth.currentUser) await updateDoc(doc(db, 'users', auth.currentUser.uid), { emailVerified: true });
      } else if (mode === 'resetPassword') {
          if (!newPassword) throw new Error("New password required.");
          await confirmPasswordReset(auth, code, newPassword);
      }
  }

  async verifyUser(token: string): Promise<boolean> {
      try {
          const email = emailVerificationService.validateToken(token);
          const user = this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
          if (user) {
              user.isVerified = true;
              user.status = 'ACTIVE';
              this.saveUsers();
              this.syncUserToFirestore(user).catch(console.warn);
              emailVerificationService.invalidateToken(token);
              return true;
          }
          return false;
      } catch (e) { return false; }
  }
  
  async resendVerification(email: string): Promise<void> {
      if (auth.currentUser) await sendEmailVerification(auth.currentUser);
  }

  private async syncUserToFirestore(user: User) {
      try {
          const userRef = doc(db, 'users', user.id);
          await setDoc(userRef, {
              uid: user.id,
              uniqueId: user.uniqueId,
              email: user.email,
              displayName: user.name,
              role: user.role,
              emailVerified: user.isVerified,
              companyName: user.companyName || '',
              permissions: user.permissions || [],
              assignedDestinations: user.assignedDestinations || [],
              linkedInventoryIds: user.linkedInventoryIds || [],
              partnerType: user.partnerType || null,
              updatedAt: new Date().toISOString()
          }, { merge: true });
      } catch (e) { console.error("Firestore Sync Error:", e); }
  }
}

export const authService = new AuthService();
