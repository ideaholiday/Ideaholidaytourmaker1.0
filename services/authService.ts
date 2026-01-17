
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
    const storedUsers = stored ? JSON.parse(stored) : [];
    
    // MOCK DATA MIGRATION: Ensure Mock Users have uniqueId
    const initialEmails = new Set(storedUsers.map((u: User) => u.email.toLowerCase()));
    
    const defaults = MOCK_USERS.map(u => {
        if (!u.uniqueId) {
            // Assign ID if missing (First run migration for mock data)
            u.uniqueId = idGeneratorService.generateUniqueId(u.role);
        }
        return u;
    }).filter(u => !initialEmails.has(u.email.toLowerCase()));

    this.users = [...defaults, ...storedUsers];
    if (!stored || defaults.length > 0) this.saveUsers();
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
          case UserRole.STAFF: return '/admin/dashboard';
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

      // 3. Hydrate or Create Local User
      if (remoteRole) {
          if (user) {
              // Update local user with authoritative remote data
              // We overwrite role even if it matches to ensure consistency
              if (user.role !== remoteRole) {
                  console.log(`[Auth] Role correction: ${user.role} -> ${remoteRole}`);
              }
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
          // 4. Fallback: No Remote Data & No Provisioning
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
      const stored = localStorage.getItem(STORAGE_KEY_USERS);
      if (stored) this.users = JSON.parse(stored);
      const user = this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
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
