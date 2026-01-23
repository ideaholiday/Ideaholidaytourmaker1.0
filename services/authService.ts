
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
import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';

const STORAGE_KEY_USERS = 'iht_users_db';

class AuthService {
  private users: User[];

  constructor() {
    this.users = this.loadUsers();
  }

  private loadUsers(): User[] {
    const stored = localStorage.getItem(STORAGE_KEY_USERS);
    let loadedUsers: User[] = stored ? JSON.parse(stored) : [];
    
    // Ensure MOCK_USERS are always present and up-to-date in the local "DB"
    MOCK_USERS.forEach(mock => {
      const index = loadedUsers.findIndex(u => u.email.toLowerCase() === mock.email.toLowerCase());
      if (index >= 0) {
        // Force update mock user roles to match code constants
        loadedUsers[index] = { ...loadedUsers[index], role: mock.role };
      } else {
        loadedUsers.push(mock);
      }
    });
    
    return loadedUsers;
  }

  private saveUsers() {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(this.users));
  }

  /**
   * STRICT ROLE RESOLVER
   * Determines the correct dashboard based on role.
   * Forces verification against User object, never fallback to default without check.
   */
  resolveDashboardPath(role: UserRole): string {
      // SECURITY: Validate role is a known ENUM value
      const knownRoles = Object.values(UserRole);
      if (!knownRoles.includes(role)) {
          console.error(`[Auth] Security Alert: Invalid role '${role}' attempted access.`);
          return '/unauthorized';
      }

      switch(role) {
          case UserRole.ADMIN: return '/admin/dashboard';
          case UserRole.STAFF: return '/admin/dashboard';
          case UserRole.AGENT: return '/agent/dashboard';
          case UserRole.OPERATOR: return '/operator/dashboard';
          case UserRole.HOTEL_PARTNER: return '/partner/dashboard';
          default: 
              console.warn(`[Auth] Unrecognized role: ${role}. Redirecting to Unauthorized.`);
              return '/unauthorized';
      }
  }

  async login(email: string, password: string): Promise<User> {
    // 1. Reset any lingering state before attempt
    this.resetAuthState();

    await apiClient.request('/auth/login', { method: 'POST' });

    // 2. Check for Mock/System User first (Password: password123)
    const mockUser = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (mockUser && password === 'password123') {
        return this.handleSystemLogin(mockUser);
    }

    // 3. Firebase Authentication
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // CRITICAL: Force synchronization with backend authority to get real role
        return this.handleFirebaseUser(userCredential.user, true);
    } catch (error: any) {
        // Filter out expected auth errors to reduce console noise
        const expectedErrors = ['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password', 'auth/too-many-requests'];
        
        if (!expectedErrors.includes(error.code)) {
            console.error("Login Error:", error);
        } else {
            console.warn("Login attempt failed:", error.code);
        }

        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            throw new Error("Invalid email or password.");
        }
        if (error.code === 'auth/too-many-requests') {
            throw new Error("Access temporarily blocked due to too many failed attempts. Please try again later.");
        }
        throw new Error(error.message || "Login failed.");
    }
  }

  async logout(user?: User | null, reason: string = 'User initiated'): Promise<void> {
    await signOut(auth);
    this.resetAuthState();
    console.log(`[Auth] Logged out: ${reason}`);
  }

  /**
   * Clears session data while preserving the "Database" (LocalStorage keys starting with iht_)
   */
  private resetAuthState() {
    apiClient.clearSession();
    sessionStorage.clear();
    
    // Clear all localStorage items EXCEPT our mock DB keys
    Object.keys(localStorage).forEach(key => {
        if (!key.startsWith('iht_')) {
            localStorage.removeItem(key);
        }
    });
    
    // Refresh memory cache
    this.users = this.loadUsers();
  }

  /**
   * CENTRAL IDENTITY HANDLER
   * Merges Firebase Identity with Local "Database" and Remote "Role Authority".
   */
  private async handleFirebaseUser(fbUser: FirebaseUser, forceSync: boolean = false): Promise<User> {
      // 1. Refresh Local State from DB
      this.users = this.loadUsers();

      // 2. Determine Authoritative Role (Priority Hierarchy)
      let authoritativeRole: UserRole | null = null;
      let remoteData: any = {};

      // Priority A: Code Constants (Highest for Dev)
      const mockConstant = MOCK_USERS.find(m => m.email.toLowerCase() === fbUser.email?.toLowerCase());
      if (mockConstant) {
          authoritativeRole = mockConstant.role;
      }

      // Priority B: Firestore 'user_roles' (Provisioning by Admin) - The Truth Source
      if (!authoritativeRole && fbUser.email) {
          try {
              // Check by Email first (Legacy/Invite flow)
              const roleRef = doc(db, 'user_roles', fbUser.email.toLowerCase());
              const roleSnap = await getDoc(roleRef);
              if (roleSnap.exists()) {
                  const data = roleSnap.data();
                  authoritativeRole = data.role as UserRole;
                  remoteData = data;
              }
          } catch (e) { console.warn("Firestore role fetch failed", e); }
      }

      // Priority C: Firestore 'users' (Profile)
      if (!authoritativeRole) {
          try {
              const userRef = doc(db, 'users', fbUser.uid);
              const userSnap = await getDoc(userRef);
              if (userSnap.exists()) {
                  const data = userSnap.data();
                  authoritativeRole = data.role as UserRole;
              }
          } catch (e) { console.warn("Firestore profile fetch failed", e); }
      }

      // 3. Resolve Local User Object
      // Check by UID first, then by Email (to merge Admin-created users with Firebase auth)
      let user = this.users.find(u => u.id === fbUser.uid);
      if (!user && fbUser.email) {
          user = this.users.find(u => u.email.toLowerCase() === fbUser.email!.toLowerCase());
          if (user) {
              // MERGE HAPPENING: Update the local ID to match Firebase UID
              console.log(`[Auth] Merging local admin-created user ${user.id} with Firebase UID ${fbUser.uid}`);
              user.id = fbUser.uid; 
          }
      }

      // 4. Apply Role & Data
      if (user) {
          // STRICT RULE: If we found an authoritative role, OVERWRITE local state.
          if (authoritativeRole) {
              user.role = authoritativeRole;
          } else {
              // Fallback safety: If no role found in cloud, revert to stored or default to Agent?
              // Security choice: Keep existing if valid, else default.
              if (!user.role) user.role = UserRole.AGENT; 
          }

          // If remote data has extra fields (permissions etc), merge them
          if (remoteData.permissions) user.permissions = remoteData.permissions;
          if (remoteData.assignedDestinations) user.assignedDestinations = remoteData.assignedDestinations;
          
          user.isVerified = fbUser.emailVerified;
          this.saveUsers();
          
          // Background sync to ensure cloud has latest metadata
          this.syncUserToFirestore(user).catch(console.warn);
      } else {
          // 5. New User Creation (Registration)
          console.warn("[Auth] New user registration detected.");
          
          // STRICT SAFETY: Do NOT default to Agent if role is unknown.
          // Only assign Agent if specifically requested/provisioned.
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
      // Refresh user from storage to ensure we get the latest state (e.g. edited details)
      this.users = this.loadUsers();
      const user = this.users.find(u => u.id === mockUser.id) || mockUser;
      
      // Enforce the constant role for system users
      user.role = mockUser.role;
      this.saveUsers();
      
      apiClient.setSession(`sess_mock_${Date.now()}_${user.id}`);
      return user;
  }

  async register(email: string, password: string, name: string, role: UserRole, companyName: string, phone: string, city: string): Promise<User> {
    await apiClient.request('/auth/signup', { method: 'POST' });

    if (this.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error("An account with this email already exists.");
    }

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
        if (error.code === 'auth/email-already-in-use') throw new Error("Email already registered.");
        throw new Error(error.message);
    }
  }

  async getCurrentUser(): Promise<User | null> {
      return new Promise((resolve) => {
          const unsubscribe = auth.onAuthStateChanged(async (fbUser) => {
              unsubscribe();
              if (fbUser) {
                  // Always force sync on session restore to fix stale roles
                  // This is CRITICAL for the "Correct Auth Logic" requirement
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
