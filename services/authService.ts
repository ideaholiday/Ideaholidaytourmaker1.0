
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
    return MOCK_USERS;
  }

  private saveUsers() {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(this.users));
  }

  async syncDirectory() {
      try {
          const snapshot = await getDocs(collection(db, 'users'));
          const remoteUsers = snapshot.docs.map(d => d.data() as User);
          if (remoteUsers.length > 0) {
              this.users = remoteUsers;
              this.saveUsers();
          }
      } catch (e) { console.warn("User Dir Sync Failed", e); }
  }

  resolveDashboardPath(role: UserRole): string {
      const knownRoles = Object.values(UserRole);
      if (!knownRoles.includes(role)) return '/unauthorized';
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
    
    // Check Mock / System accounts (Offline fallback)
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
    // Refresh memory
    this.users = this.loadUsers();
  }

  /**
   * Core Identity Resolution
   * Timeout set to 3.5s to unblock UI quickly if Firebase hangs.
   */
  async getCurrentUser(): Promise<User | null> {
      // Direct synchronous check if already loaded (Optimization)
      if (auth.currentUser) {
          return this.handleFirebaseUser(auth.currentUser);
      }

      const authPromise = new Promise<User | null>((resolve) => {
          const unsubscribe = auth.onAuthStateChanged(async (fbUser) => {
              unsubscribe();
              if (fbUser) {
                  try {
                      const user = await this.handleFirebaseUser(fbUser, true);
                      resolve(user);
                  } catch (e) {
                      console.warn("User profile resolution failed", e);
                      resolve(null);
                  }
              } else {
                  resolve(null);
              }
          }, (error) => {
              console.error("Auth State Observer Error:", error);
              resolve(null); // Fail safe
          });
      });

      // 3.5-second timeout failsafe
      const timeoutPromise = new Promise<null>((resolve) => 
          setTimeout(() => {
              console.warn("Auth check timed out - assuming logged out.");
              resolve(null);
          }, 3500)
      );

      return Promise.race([authPromise, timeoutPromise]);
  }

  private async handleFirebaseUser(fbUser: FirebaseUser, forceSync: boolean = false): Promise<User> {
      let finalUser: User | null = null;

      // 1. Try Firestore Profile
      try {
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
          if (userDoc.exists()) {
              finalUser = userDoc.data() as User;
          }
      } catch (e) { console.warn("Firestore profile fetch error", e); }

      // 2. Fallback to Local Directory
      if (!finalUser) {
          this.users = this.loadUsers();
          finalUser = this.users.find(u => u.id === fbUser.uid || u.email.toLowerCase() === fbUser.email?.toLowerCase()) || null;
      }

      // 3. New User Registration Logic (If absolutely no record found)
      if (!finalUser) {
          // Check role authority
          let role = UserRole.AGENT;
          if (fbUser.email) {
             // Try catch for role fetch to prevent hanging
             try {
                const roleSnap = await getDoc(doc(db, 'user_roles', fbUser.email.toLowerCase()));
                if (roleSnap.exists()) role = roleSnap.data().role;
             } catch(e) { console.warn("Role fetch failed, defaulting to Agent"); }
          }

          finalUser = {
              id: fbUser.uid,
              uniqueId: idGeneratorService.generateUniqueId(role),
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
              email: fbUser.email || '',
              role: role,
              isVerified: fbUser.emailVerified,
              status: 'ACTIVE',
              joinedAt: new Date().toISOString()
          };
          // Create in DB - Fire and Forget to avoid blocking
          this.syncUserToFirestore(finalUser);
      }

      // 4. Update Local Cache
      this.updateLocalUser(finalUser);
      
      apiClient.setSession(`sess_${Date.now()}_${finalUser.id}`);
      return finalUser;
  }

  private handleSystemLogin(mockUser: User): User {
      this.users = this.loadUsers();
      const user = this.users.find(u => u.id === mockUser.id) || mockUser;
      apiClient.setSession(`sess_mock_${Date.now()}_${user.id}`);
      return user;
  }

  private updateLocalUser(user: User) {
      this.users = this.loadUsers();
      const idx = this.users.findIndex(u => u.id === user.id);
      if (idx >= 0) this.users[idx] = user;
      else this.users.push(user);
      this.saveUsers();
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

        this.syncUserToFirestore(newUser);
        this.updateLocalUser(newUser);
        return newUser;
    } catch (error: any) {
        throw new Error(error.message);
    }
  }
  
  // Helpers
  async requestPasswordReset(email: string) { await sendPasswordResetEmail(auth, email); }
  async handleActionCode(code: string, mode: 'verifyEmail' | 'resetPassword', newPwd?: string) {
      if (mode === 'verifyEmail') {
          await applyActionCode(auth, code);
          if (auth.currentUser) this.syncUserToFirestore({ ...await this.getCurrentUser()!, isVerified: true });
      } else {
          if(newPwd) await confirmPasswordReset(auth, code, newPwd);
      }
  }
  
  async verifyUser(token: string): Promise<boolean> { 
      const email = emailVerificationService.validateToken(token);
      const user = this.users.find(u => u.email === email);
      if(user) {
          user.isVerified = true;
          this.syncUserToFirestore(user);
          this.updateLocalUser(user);
          return true;
      }
      return false;
  }

  async resendVerification(email: string) { if(auth.currentUser) await sendEmailVerification(auth.currentUser); }

  private async syncUserToFirestore(user: User) {
      try {
          await setDoc(doc(db, 'users', user.id), user, { merge: true });
      } catch (e) { console.error("Firestore Sync Error:", e); }
  }
}

export const authService = new AuthService();
