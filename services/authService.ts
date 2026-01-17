
import { User, UserRole, UserStatus } from '../types';
import { MOCK_USERS } from '../constants';
import { auditLogService } from './auditLogService';
import { apiClient } from './apiClient';
import { emailVerificationService } from './emailVerificationService';
import { idGeneratorService } from './idGenerator.ts'; // Import
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
import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';

const STORAGE_KEY_USERS = 'iht_users_db';

class AuthService {
  private users: User[];

  constructor() {
    const stored = localStorage.getItem(STORAGE_KEY_USERS);
    const storedUsers: User[] = stored ? JSON.parse(stored) : [];
    
    // DATA CONSISTENCY FIX:
    // Merge stored users with MOCK_USERS constants.
    // If a stored user matches a Mock User ID or Email, FORCE update their Role and Configuration 
    // from the constant. This fixes "stale role" bugs (e.g., Supplier appearing as Agent).
    
    const mergedUsers = storedUsers.map(u => {
        const mockConstant = MOCK_USERS.find(m => m.id === u.id || m.email.toLowerCase() === u.email.toLowerCase());
        if (mockConstant) {
            return {
                ...u,
                // Enforce critical fields from code constants
                role: mockConstant.role, 
                supplierType: mockConstant.supplierType || u.supplierType,
                linkedInventoryIds: mockConstant.linkedInventoryIds || u.linkedInventoryIds,
                assignedDestinations: mockConstant.assignedDestinations || u.assignedDestinations
            };
        }
        return u;
    });

    // Add any new MOCK_USERS that aren't in storage yet
    const existingIds = new Set(mergedUsers.map(u => u.id));
    const newMocks = MOCK_USERS.filter(m => !existingIds.has(m.id)).map(u => {
        if (!u.uniqueId) {
            u.uniqueId = idGeneratorService.generateUniqueId(u.role);
        }
        return u;
    });

    this.users = [...mergedUsers, ...newMocks];
    
    // Always save back to ensure storage is fresh
    this.saveUsers();
  }

  private saveUsers() {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(this.users));
  }

  /**
   * CENTRALIZED ROLE RESOLVER
   * Maps User Roles to their specific dashboard paths.
   */
  resolveDashboardPath(role: UserRole): string {
      switch(role) {
          case UserRole.ADMIN: return '/admin/dashboard';
          case UserRole.STAFF: return '/admin/dashboard'; // Staff shares Admin Dashboard with limited permissions
          case UserRole.AGENT: return '/agent/dashboard';
          case UserRole.OPERATOR: return '/operator/dashboard';
          case UserRole.SUPPLIER: return '/supplier/dashboard';
          default: return '/dashboard';
      }
  }

  /**
   * SYNC TO FIRESTORE (Triggers Cloud Functions)
   */
  private async syncUserToFirestore(user: User) {
      try {
          const userRef = doc(db, 'users', user.id);
          // We merge to avoid overwriting existing fields like 'welcomeEmailSent'
          await setDoc(userRef, {
              uid: user.id,
              uniqueId: user.uniqueId, // Sync the ID
              email: user.email,
              displayName: user.name,
              role: user.role,
              emailVerified: user.isVerified,
              companyName: user.companyName || '',
              // Important: Persist advanced role fields
              permissions: user.permissions || [],
              assignedDestinations: user.assignedDestinations || [],
              linkedInventoryIds: user.linkedInventoryIds || [],
              supplierType: user.supplierType || null,
              updatedAt: new Date().toISOString()
          }, { merge: true });
      } catch (e) {
          console.error("Firestore Sync Error (Backend Trigger Failed):", e);
      }
  }

  async login(email: string, password: string): Promise<User> {
    await apiClient.request('/auth/login', { method: 'POST' });

    // Mock Login check (Optional fallback)
    const mockUser = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (mockUser) return this.mockLogin(email, password);

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // Force fresh sync on login to prevent stale role caching
        return this.handleFirebaseUser(userCredential.user, true);
    } catch (error: any) {
        console.error("Login Error:", error);
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            throw new Error("Invalid email or password.");
        }
        if (error.code === 'auth/network-request-failed') {
            throw new Error("Network error. Please check your connection.");
        }
        throw new Error(error.message || "Login failed.");
    }
  }

  async loginWithGoogle(): Promise<User> {
      throw new Error("Google Sign-In is currently disabled.");
  }

  async register(
    email: string, 
    password: string,
    name: string, 
    role: UserRole,
    companyName: string,
    phone: string,
    city: string
  ): Promise<User> {
    await apiClient.request('/auth/signup', { method: 'POST' });

    if (this.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error("An account with this email already exists.");
    }

    let firebaseUser: FirebaseUser;
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        firebaseUser = userCredential.user;
        
        try {
            const actionCodeSettings = {
                url: `${window.location.origin}/#/auth/action`, 
                handleCodeInApp: false
            };
            await sendEmailVerification(firebaseUser, actionCodeSettings);
        } catch (emailErr) {
            console.warn("Firebase email delivery failed.", emailErr);
        }

    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') throw new Error("Email already registered.");
        throw new Error(error.message);
    }

    // GENERATE UNIQUE ID
    const uniqueId = idGeneratorService.generateUniqueId(role);

    const newUser: User = {
        id: firebaseUser.uid,
        uniqueId, // Assign ID
        name,
        email,
        role,
        companyName,
        phone,
        city,
        isVerified: false,
        status: 'PENDING_VERIFICATION',
        joinedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    this.users.push(newUser);
    this.saveUsers();
    
    // Non-blocking sync
    this.syncUserToFirestore(newUser).catch(e => console.warn("Register sync failed", e));

    if (process.env.NODE_ENV === 'development') {
       await emailVerificationService.sendVerificationEmail(newUser);
    }

    return newUser;
  }

  private async handleFirebaseUser(fbUser: FirebaseUser, forceSync: boolean = false): Promise<User> {
      // Reload local data to ensure we aren't working with stale memory state
      const stored = localStorage.getItem(STORAGE_KEY_USERS);
      if (stored) this.users = JSON.parse(stored);

      let user = this.users.find(u => u.id === fbUser.uid);
      if (!user) user = this.users.find(u => u.email.toLowerCase() === fbUser.email?.toLowerCase());

      let remoteRole: UserRole | null = null;
      let remoteData: any = null;

      // 1. Fetch Profile from 'users' collection (The Source of Truth)
      // We perform this check if we don't have a user OR if we want to force-sync role (e.g. on login/refresh)
      if (!user || forceSync) {
          try {
              const userRef = doc(db, 'users', fbUser.uid);
              const snapshot = await getDoc(userRef);
              
              if (snapshot.exists()) {
                  remoteData = snapshot.data();
                  if (remoteData?.role) {
                      remoteRole = remoteData.role as UserRole;
                  }
              }
          } catch (err) {
              console.warn("Failed to fetch user profile from Firestore:", err);
          }
      }

      // 2. If 'users' profile missing, check 'user_roles' (Pre-provisioned by Admin)
      if (!remoteData && fbUser.email) {
          try {
              const roleRef = doc(db, 'user_roles', fbUser.email.toLowerCase());
              const roleSnapshot = await getDoc(roleRef);
              if (roleSnapshot.exists()) {
                  const roleData = roleSnapshot.data();
                  remoteRole = roleData.role as UserRole;
                  remoteData = roleData; // Hydrate with provisioned data
                  console.log(`[Auth] Recovered role from provisioning: ${remoteRole}`);
              }
          } catch (err) {
              console.warn("Failed to fetch provisioned role:", err);
          }
      }

      // 3. OVERRIDE FROM MOCK CONSTANTS (Codebase Authority for System Accounts)
      // This fix ensures that if a developer/admin logs in with a system email, 
      // the role defined in constants.ts takes precedence over any stale DB/Local data.
      const mockConstant = MOCK_USERS.find(m => m.email.toLowerCase() === fbUser.email?.toLowerCase());
      if (mockConstant) {
          console.log(`[Auth] Enforcing system role for ${mockConstant.email}: ${mockConstant.role}`);
          remoteRole = mockConstant.role;
          // Merge specific fields from constant if needed
          if (remoteData) {
              remoteData.role = mockConstant.role;
              remoteData.assignedDestinations = mockConstant.assignedDestinations || remoteData.assignedDestinations;
              remoteData.linkedInventoryIds = mockConstant.linkedInventoryIds || remoteData.linkedInventoryIds;
              remoteData.supplierType = mockConstant.supplierType || remoteData.supplierType;
          } else {
              // Create pseudo remote data if missing
              remoteData = { ...mockConstant };
          }
      }

      // 4. Hydrate or Create Local User
      if (remoteRole) {
          if (user) {
              // Update local user with authoritative remote/constant data
              user.role = remoteRole;
              user.name = remoteData.displayName || remoteData.name || user.name;
              user.companyName = remoteData.companyName || user.companyName;
              user.permissions = remoteData.permissions || user.permissions;
              user.assignedDestinations = remoteData.assignedDestinations || user.assignedDestinations;
              user.linkedInventoryIds = remoteData.linkedInventoryIds || user.linkedInventoryIds;
              user.supplierType = remoteData.supplierType || user.supplierType;
              
              this.saveUsers();
          } else {
              // New Device Login: Create Local from Remote
              user = {
                  id: fbUser.uid,
                  uniqueId: remoteData.uniqueId || idGeneratorService.generateUniqueId(remoteRole),
                  name: remoteData.displayName || remoteData.name || fbUser.displayName || 'User',
                  email: fbUser.email || '',
                  role: remoteRole,
                  isVerified: fbUser.emailVerified,
                  status: remoteData.status || (fbUser.emailVerified ? 'ACTIVE' : 'PENDING_VERIFICATION'),
                  joinedAt: remoteData.joinedAt || new Date().toISOString(),
                  companyName: remoteData.companyName || '',
                  permissions: remoteData.permissions || [],
                  assignedDestinations: remoteData.assignedDestinations || [],
                  linkedInventoryIds: remoteData.linkedInventoryIds || [],
                  supplierType: remoteData.supplierType || undefined
              };
              this.users.push(user);
              this.saveUsers();
          }
      } else {
          // 5. Fallback: No Remote Data & No Provisioning
          // If user exists locally, we trust local and sync UP to cloud.
          if (user) {
              this.syncUserToFirestore(user).catch(console.warn);
          } else {
              // BRAND NEW UNKNOWN USER -> Default to Agent
              console.warn("[Auth] New user with no role assignment. Defaulting to Agent.");
              const uniqueId = idGeneratorService.generateUniqueId(UserRole.AGENT);
              user = {
                  id: fbUser.uid,
                  uniqueId,
                  name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
                  email: fbUser.email || '',
                  role: UserRole.AGENT, // Default Fallback
                  isVerified: fbUser.emailVerified,
                  status: fbUser.emailVerified ? 'ACTIVE' : 'PENDING_VERIFICATION',
                  joinedAt: new Date().toISOString(),
                  companyName: 'Restored Account'
              };
              this.users.push(user);
              this.saveUsers();
              this.syncUserToFirestore(user).catch(console.warn);
          }
      }

      // Final verification sync
      if (user && fbUser.emailVerified && !user.isVerified) {
          user.isVerified = true;
          user.status = 'ACTIVE';
          this.saveUsers();
          this.syncUserToFirestore(user).catch(console.warn);
      }

      apiClient.setSession(`sess_${Date.now()}_${user.id}`);
      return user;
  }

  private mockLogin(email: string, password: string): User {
      // Reload from storage to ensure we have the latest list including constructor updates
      const stored = localStorage.getItem(STORAGE_KEY_USERS);
      if (stored) this.users = JSON.parse(stored);
      
      const userIndex = this.users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
      
      // CRITICAL FIX: Force role update from constants before login check
      // This handles cases where local storage has an old version of the mock user (e.g. cached as Agent)
      const mockConstant = MOCK_USERS.find(m => m.email.toLowerCase() === email.toLowerCase());
      
      if (userIndex !== -1 && mockConstant) {
          // Update the stored user with the role/config from constants
          this.users[userIndex] = {
              ...this.users[userIndex],
              role: mockConstant.role,
              supplierType: mockConstant.supplierType || this.users[userIndex].supplierType,
              assignedDestinations: mockConstant.assignedDestinations || this.users[userIndex].assignedDestinations,
              linkedInventoryIds: mockConstant.linkedInventoryIds || this.users[userIndex].linkedInventoryIds
          };
          this.saveUsers();
      }

      const user = this.users[userIndex];
      
      if (!user || password !== 'password123') throw new Error("Invalid credentials.");
      apiClient.setSession(`sess_${Date.now()}_${user.id}`);
      return user;
  }

  async handleActionCode(code: string, mode: 'verifyEmail' | 'resetPassword', newPassword?: string): Promise<void> {
      if (mode === 'verifyEmail') {
          await applyActionCode(auth, code);
          // We need to sync this state to Firestore immediately
          if (auth.currentUser) {
              await auth.currentUser.reload();
              const uid = auth.currentUser.uid;
              const userRef = doc(db, 'users', uid);
              await updateDoc(userRef, { emailVerified: true });
          }
      } else if (mode === 'resetPassword') {
          if (!newPassword) throw new Error("New password required.");
          await confirmPasswordReset(auth, code, newPassword);
      }
  }

  async logout(user?: User | null, reason: string = 'User initiated'): Promise<void> {
    await signOut(auth);
    apiClient.clearSession();
    // Do not clear STORAGE_KEY_USERS completely as it simulates the DB,
    // but we can optionally force a refresh on next load.
  }

  async requestPasswordReset(email: string): Promise<void> {
      const actionCodeSettings = {
          url: `${window.location.origin}/#/login`,
          handleCodeInApp: false
      };
      await sendPasswordResetEmail(auth, email, actionCodeSettings);
  }

  async getCurrentUser(): Promise<User | null> {
      return new Promise((resolve) => {
          const unsubscribe = auth.onAuthStateChanged(async (fbUser) => {
              unsubscribe();
              if (fbUser) {
                  // Always force sync on session restore to fix stale roles
                  const user = await this.handleFirebaseUser(fbUser, true);
                  resolve(user);
              } else {
                  resolve(null);
              }
          });
      });
  }

  async verifyUser(token: string): Promise<boolean> {
      try {
          const email = emailVerificationService.validateToken(token);
          const user = this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
          if (user) {
              user.isVerified = true;
              user.status = 'ACTIVE';
              this.saveUsers();
              // Non-blocking sync
              this.syncUserToFirestore(user).catch(console.warn);
              emailVerificationService.invalidateToken(token);
              return true;
          }
          return false;
      } catch (e) { return false; }
  }
  
  async resendVerification(email: string): Promise<void> {
      if (auth.currentUser) {
          const actionCodeSettings = {
            url: `${window.location.origin}/#/auth/action`,
            handleCodeInApp: false
          };
          await sendEmailVerification(auth.currentUser, actionCodeSettings);
      }
  }
}

export const authService = new AuthService();
