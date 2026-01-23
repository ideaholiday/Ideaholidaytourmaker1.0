
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
        try {
            return JSON.parse(stored);
        } catch (e) {
            return MOCK_USERS;
        }
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
   * Background process to keep local cache updated.
   */
  async syncDirectory() {
      try {
          const snapshot = await getDocs(collection(db, 'users'));
          const remoteUsers = snapshot.docs.map(d => d.data() as User);
          
          if (remoteUsers.length > 0) {
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

    // Mock Login Fallback (For Development/Offline)
    this.users = this.loadUsers();
    const mockUser = this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (mockUser && password === 'password123') {
        return this.handleSystemLogin(mockUser);
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // Force sync true to ensure we get latest profile on explicit login
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
    this.users = this.loadUsers();
  }

  /**
   * Core logic to resolve a Firebase User to an App User.
   * Now fetches from 'users' collection to ensure Agent Branding/Data is fresh.
   */
  private async handleFirebaseUser(fbUser: FirebaseUser, forceSync: boolean = false): Promise<User> {
      let finalUser: User | null = null;
      let isNew = false;

      // 1. Try to fetch full profile from Firestore 'users' collection
      // This is the "Truth" for Agent Branding, Permissions, etc.
      try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
              finalUser = userDoc.data() as User;
          }
      } catch (e) {
          console.warn("Firestore profile fetch failed", e);
      }

      // 2. If no full profile, check 'user_roles' for basic role mapping (Legacy/Safety)
      if (!finalUser && fbUser.email) {
          try {
              const roleSnap = await getDoc(doc(db, 'user_roles', fbUser.email.toLowerCase()));
              if (roleSnap.exists()) {
                  // Construct basic user from role map
                  const data = roleSnap.data();
                  finalUser = {
                      id: fbUser.uid,
                      uniqueId: idGeneratorService.generateUniqueId(data.role as UserRole),
                      name: fbUser.displayName || fbUser.email.split('@')[0],
                      email: fbUser.email,
                      role: data.role as UserRole,
                      isVerified: fbUser.emailVerified,
                      status: 'ACTIVE',
                      joinedAt: new Date().toISOString()
                  };
                  isNew = true;
              }
          } catch (e) { console.warn("Role map fetch failed", e); }
      }

      // 3. Fallback to Local Cache (Offline support)
      if (!finalUser) {
          this.users = this.loadUsers();
          finalUser = this.users.find(u => u.id === fbUser.uid || u.email.toLowerCase() === fbUser.email?.toLowerCase()) || null;
      }

      // 4. Default: Create New Agent
      if (!finalUser) {
          isNew = true;
          finalUser = {
              id: fbUser.uid,
              uniqueId: idGeneratorService.generateUniqueId(UserRole.AGENT),
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
              email: fbUser.email || '',
              role: UserRole.AGENT,
              isVerified: fbUser.emailVerified,
              status: 'ACTIVE',
              joinedAt: new Date().toISOString()
          };
      }

      // Update Local Cache
      this.updateLocalUser(finalUser);
      
      // If we constructed a user or it's new, sync back to Cloud "users" collection
      // so next time we hit step #1 successfully
      if (isNew || forceSync) {
          this.syncUserToFirestore(finalUser).catch(console.warn);
      }
      
      apiClient.setSession(`sess_${Date.now()}_${finalUser.id}`);
      return finalUser;
  }

  private handleSystemLogin(mockUser: User): User {
      this.users = this.loadUsers();
      const user = this.users.find(u => u.id === mockUser.id) || mockUser;
      user.role = mockUser.role; // Enforce role from mock constant
      this.saveUsers();
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
            isVerified: false, // Must verify email
            status: 'PENDING_VERIFICATION', // Strict status
            joinedAt: new Date().toISOString()
        };

        // Save immediately to Cloud and Local
        await this.syncUserToFirestore(newUser);
        this.updateLocalUser(newUser);
        
        return newUser;
    } catch (error: any) {
        throw new Error(error.message);
    }
  }

  /**
   * Safe Identity Resolution
   * Includes 4s timeout to prevent infinite hanging on slow networks.
   */
  async getCurrentUser(): Promise<User | null> {
      // Optimization: If auth object is already ready (hot reload)
      if (auth.currentUser) {
          return this.handleFirebaseUser(auth.currentUser);
      }

      const authPromise = new Promise<User | null>((resolve) => {
          const unsubscribe = auth.onAuthStateChanged(async (fbUser) => {
              unsubscribe();
              if (fbUser) {
                  try {
                      const user = await this.handleFirebaseUser(fbUser);
                      resolve(user);
                  } catch (e) {
                      console.warn("Profile resolution error", e);
                      resolve(null);
                  }
              } else {
                  resolve(null);
              }
          }, (err) => {
              console.error("Auth Observer Error", err);
              resolve(null);
          });
      });

      // Timeout Failsafe (4 seconds)
      const timeoutPromise = new Promise<null>((resolve) => 
          setTimeout(() => {
              console.warn("Auth check timed out.");
              resolve(null);
          }, 4000)
      );

      return Promise.race([authPromise, timeoutPromise]);
  }

  async requestPasswordReset(email: string): Promise<void> {
      await sendPasswordResetEmail(auth, email);
  }

  async handleActionCode(code: string, mode: 'verifyEmail' | 'resetPassword', newPassword?: string): Promise<void> {
      if (mode === 'verifyEmail') {
          await applyActionCode(auth, code);
          // Update verification status in DB
          if (auth.currentUser) {
             const user = await this.handleFirebaseUser(auth.currentUser);
             user.isVerified = true;
             user.status = 'ACTIVE';
             await this.syncUserToFirestore(user);
             this.updateLocalUser(user);
          }
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
              this.syncUserToFirestore(user).catch(console.warn);
              this.updateLocalUser(user);
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
          // Merge to avoid overwriting existing fields like createdAt
          await setDoc(userRef, user, { merge: true });
          
          // Also sync user_roles for fast lookups if needed
          if (user.email) {
              await setDoc(doc(db, 'user_roles', user.email.toLowerCase()), {
                  email: user.email.toLowerCase(),
                  role: user.role
              }, { merge: true });
          }
      } catch (e) { console.error("Firestore Sync Error:", e); }
  }
}

export const authService = new AuthService();
