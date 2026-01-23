
import { User, UserRole } from '../types';
import { MOCK_USERS } from '../constants';
import { apiClient } from './apiClient';
import { emailVerificationService } from './emailVerificationService';
import { idGeneratorService } from './idGenerator'; 
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
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';

const STORAGE_KEY_USERS = 'iht_users_db';

class AuthService {
  private users: User[];
  private isOffline = false;

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

  private isOfflineError(e: any): boolean {
      return (
          e.code === 'permission-denied' || 
          e.code === 'unavailable' || 
          e.code === 'not-found' || 
          e.message?.includes('permission-denied') || 
          e.message?.includes('not-found') ||
          e.message?.includes('offline')
      );
  }

  /**
   * Syncs the entire user directory from Firestore.
   * Ensures Admin has the latest list of all agents/operators.
   */
  async syncDirectory() {
      if (this.isOffline) return;

      try {
          const snapshot = await getDocs(collection(db, 'users'));
          const remoteUsers = snapshot.docs.map(d => d.data() as User);
          
          if (remoteUsers.length > 0) {
              this.users = remoteUsers;
              this.saveUsers();
              console.log("✅ User Directory Synced from Cloud");
          }
      } catch (e: any) {
          if (this.isOfflineError(e)) {
              console.warn("⚠️ Auth Service: Backend unavailable. Switching to Offline Mode.");
              this.isOffline = true;
          } else {
              console.warn("User Directory Sync Failed:", e);
          }
      }
  }

  async login(email: string, password: string): Promise<User> {
    this.resetAuthState();
    
    // Authenticate with Firebase first
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // Force sync true to ensure we get latest profile on explicit login
        const user = await this.handleFirebaseUser(userCredential.user, true);
        
        // After fetching/resolving user, we can simulate an API login call to sync session
        await apiClient.request(`/auth/${user.role.toLowerCase()}/login`, { 
            method: 'POST',
            body: JSON.stringify({ email, password, device_name: 'web' })
        });
        
        return user;
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
   * Now integrates with Laravel API endpoint to get centralized routing logic.
   */
  private async handleFirebaseUser(fbUser: FirebaseUser, forceSync: boolean = false): Promise<User> {
      let finalUser: User | null = null;
      let isNew = false;
      let dashboardRoute = '/';

      // 1. Try to fetch Authoritative Profile from Backend API
      // This enforces "Centralize role resolution... in the Laravel backend"
      try {
          if (!this.isOffline) {
             const apiResponse: any = await apiClient.request('/auth/me');
             if (apiResponse && apiResponse.user) {
                 finalUser = {
                     ...apiResponse.user,
                     dashboardRoute: apiResponse.dashboard_route
                 };
             }
          }
      } catch (e) {
          console.warn("API Profile Sync Failed, falling back to Firestore/Local", e);
      }

      // 2. Fallback: Fetch from Firestore 'users' collection
      if (!finalUser && !this.isOffline) {
          try {
              const userDocRef = doc(db, 'users', fbUser.uid);
              const userDoc = await getDoc(userDocRef);
              
              if (userDoc.exists()) {
                  finalUser = userDoc.data() as User;
                  if (!finalUser.role) finalUser.role = UserRole.AGENT;
              }
          } catch (e: any) {
              if (this.isOfflineError(e)) {
                  this.isOffline = true;
                  console.warn("⚠️ Firestore unavailable (Profile). Offline mode active.");
              }
          }
      }

      // 3. Fallback to Local Cache
      if (!finalUser) {
          this.users = this.loadUsers();
          finalUser = this.users.find(u => u.id === fbUser.uid || u.email.toLowerCase() === fbUser.email?.toLowerCase()) || null;
      }

      // 4. Default: Create New Agent if absolutely nothing found
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

      // 5. Hydrate Dashboard Route if missing (Offline/Fallback Logic)
      if (!finalUser.dashboardRoute) {
          finalUser.dashboardRoute = this.getOfflineDashboardRoute(finalUser.role);
      }

      // 6. Update Local Cache
      this.updateLocalUser(finalUser);
      
      // 7. Sync back to Cloud if it's a new user or forcing sync
      if ((isNew || forceSync) && !this.isOffline) {
          this.syncUserToFirestore(finalUser).catch(console.warn);
      }
      
      apiClient.setSession(`sess_${Date.now()}_${finalUser.id}`);
      return finalUser;
  }

  // Fallback for offline mode when API is unreachable
  private getOfflineDashboardRoute(role: UserRole): string {
      switch(role) {
          case UserRole.ADMIN: return '/admin/dashboard';
          case UserRole.STAFF: return '/admin/dashboard';
          case UserRole.AGENT: return '/agent/dashboard';
          case UserRole.OPERATOR: return '/operator/dashboard';
          case UserRole.HOTEL_PARTNER: return '/partner/dashboard';
          default: return '/unauthorized';
      }
  }

  private handleSystemLogin(mockUser: User): User {
      this.users = this.loadUsers();
      const existingIndex = this.users.findIndex(u => u.id === mockUser.id);
      
      const userWithRoute = {
          ...mockUser,
          dashboardRoute: this.getOfflineDashboardRoute(mockUser.role)
      };

      if (existingIndex >= 0) {
          this.users[existingIndex] = userWithRoute;
      } else {
          this.users.push(userWithRoute);
      }
      
      this.saveUsers();
      apiClient.setSession(`sess_mock_${Date.now()}_${mockUser.id}`);
      return userWithRoute;
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
            joinedAt: new Date().toISOString(),
            dashboardRoute: this.getOfflineDashboardRoute(role)
        };

        await this.syncUserToFirestore(newUser);
        this.updateLocalUser(newUser);
        
        return newUser;
    } catch (error: any) {
        throw new Error(error.message);
    }
  }

  async getCurrentUser(): Promise<User | null> {
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
      if (this.isOffline) return;
      try {
          const userRef = doc(db, 'users', user.id);
          // Using merge true to preserve fields not in local object if any
          await setDoc(userRef, user, { merge: true });
          
          if (user.email) {
              await setDoc(doc(db, 'user_roles', user.email.toLowerCase()), {
                  email: user.email.toLowerCase(),
                  role: user.role
              }, { merge: true });
          }
      } catch (e: any) { 
           if (this.isOfflineError(e)) {
              this.isOffline = true;
          } else {
              console.error("Firestore Sync Error:", e);
          }
      }
  }
}

export const authService = new AuthService();
