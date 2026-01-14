
import { User, UserRole, UserStatus } from '../types';
import { MOCK_USERS } from '../constants';
import { auditLogService } from './auditLogService';
import { apiClient } from './apiClient';
import { emailVerificationService } from './emailVerificationService';
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
    const initialEmails = new Set(storedUsers.map((u: User) => u.email.toLowerCase()));
    const defaults = MOCK_USERS.filter(u => !initialEmails.has(u.email.toLowerCase()));
    this.users = [...defaults, ...storedUsers];
    if (!stored || defaults.length > 0) this.saveUsers();
  }

  private saveUsers() {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(this.users));
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
              email: user.email,
              displayName: user.name,
              role: user.role,
              emailVerified: user.isVerified,
              companyName: user.companyName || '',
              updatedAt: new Date().toISOString()
          }, { merge: true });
      } catch (e) {
          console.error("Firestore Sync Error (Backend Trigger Failed):", e);
      }
  }

  async login(email: string, password: string): Promise<User> {
    await apiClient.request('/auth/login', { method: 'POST' });

    // Mock Login
    const mockUser = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (mockUser) return this.mockLogin(email, password);

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return this.handleFirebaseUser(userCredential.user);
    } catch (error: any) {
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            throw new Error("Invalid email or password.");
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

    const newUser: User = {
        id: firebaseUser.uid,
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
    
    // Sync to Firestore to create initial document (triggers nothing yet as verified=false)
    await this.syncUserToFirestore(newUser);

    if (process.env.NODE_ENV === 'development') {
       await emailVerificationService.sendVerificationEmail(newUser);
    }

    return newUser;
  }

  private async handleFirebaseUser(fbUser: FirebaseUser): Promise<User> {
      // Logic same as before...
      const stored = localStorage.getItem(STORAGE_KEY_USERS);
      if (stored) this.users = JSON.parse(stored);

      let user = this.users.find(u => u.id === fbUser.uid);
      if (!user) user = this.users.find(u => u.email.toLowerCase() === fbUser.email?.toLowerCase());

      if (user) {
          // If verifying now
          if ((fbUser.emailVerified || user.isVerified) && user.status === 'PENDING_VERIFICATION') {
              user.isVerified = true;
              user.status = 'ACTIVE';
              this.saveUsers();
              // CRITICAL: Update Firestore to trigger Welcome Email
              await this.syncUserToFirestore(user);
          }
      } else {
          // New/Restored User
          user = {
              id: fbUser.uid,
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
              email: fbUser.email || '',
              role: UserRole.AGENT,
              isVerified: fbUser.emailVerified,
              status: 'ACTIVE',
              joinedAt: new Date().toISOString(),
              companyName: 'Restored Account'
          };
          this.users.push(user);
          this.saveUsers();
          await this.syncUserToFirestore(user);
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
                  const stored = localStorage.getItem(STORAGE_KEY_USERS);
                  if (stored) this.users = JSON.parse(stored);
                  let user = this.users.find(u => u.id === fbUser.uid);
                  resolve(user || null);
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
              await this.syncUserToFirestore(user);
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
