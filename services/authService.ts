
import { User, UserRole } from '../types';
import { apiClient } from './apiClient';
import { idGeneratorService } from './idGenerator'; 
import { auth } from './firebase';
import { dbHelper } from './firestoreHelper';
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

class AuthService {
  
  async login(email: string, password: string): Promise<User> {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return await this.handleFirebaseUser(userCredential.user);
    } catch (error: any) {
        throw new Error(error.message || "Login failed.");
    }
  }

  async logout(user?: User | null, reason: string = 'User initiated'): Promise<void> {
    try {
        await signOut(auth);
        // We still clear session storage for the React context/UI state
        sessionStorage.clear();
        apiClient.clearSession();
        console.log(`[Auth] Logged out: ${reason}`);
    } catch (e) {
        console.warn("Sign out error", e);
    }
  }

  async register(email: string, password: string, name: string, role: UserRole, companyName: string, phone: string, city: string): Promise<User> {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const fbUser = userCredential.user;
        await sendEmailVerification(fbUser);
        
        // Generate ID asynchronously from Firestore
        const uniqueId = await idGeneratorService.generateUniqueId(role);
        
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
            dashboardRoute: this.getDashboardRoute(role)
        };

        // Save profile to Firestore
        await dbHelper.save('users', newUser);
        
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
                  try {
                      const user = await this.handleFirebaseUser(fbUser);
                      resolve(user);
                  } catch (e) {
                      console.error("Failed to load user profile", e);
                      resolve(null);
                  }
              } else {
                  resolve(null);
              }
          });
      });
  }

  private async handleFirebaseUser(fbUser: FirebaseUser): Promise<User> {
      // 1. Fetch Profile from Firestore
      let user = await dbHelper.getById<User>('users', fbUser.uid);

      // 2. Auto-Create Profile if missing (Self-Healing / First Login fix)
      if (!user) {
          console.warn("User profile missing in Firestore. Creating default.");
          const uniqueId = await idGeneratorService.generateUniqueId(UserRole.AGENT);
          
          user = {
              id: fbUser.uid,
              uniqueId,
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
              email: fbUser.email || '',
              role: UserRole.AGENT, // Default fallback role
              isVerified: fbUser.emailVerified,
              status: 'ACTIVE',
              joinedAt: new Date().toISOString(),
              dashboardRoute: '/agent/dashboard'
          };
          await dbHelper.save('users', user);
      }

      // 3. Sync verification status
      if (fbUser.emailVerified !== user.isVerified) {
          user.isVerified = fbUser.emailVerified;
          await dbHelper.save('users', user);
      }

      // 4. Ensure Dashboard Route
      if(!user.dashboardRoute) {
          user.dashboardRoute = this.getDashboardRoute(user.role);
      }

      apiClient.setSession(`sess_${Date.now()}_${user.id}`);
      return user;
  }

  private getDashboardRoute(role: UserRole): string {
      switch(role) {
          case UserRole.ADMIN: return '/admin/dashboard';
          case UserRole.STAFF: return '/admin/dashboard';
          case UserRole.AGENT: return '/agent/dashboard';
          case UserRole.OPERATOR: return '/operator/dashboard';
          case UserRole.HOTEL_PARTNER: return '/partner/dashboard';
          default: return '/unauthorized';
      }
  }

  async requestPasswordReset(email: string): Promise<void> {
      await sendPasswordResetEmail(auth, email);
  }

  async handleActionCode(code: string, mode: 'verifyEmail' | 'resetPassword', newPassword?: string): Promise<void> {
      if (mode === 'verifyEmail') {
          await applyActionCode(auth, code);
          if (auth.currentUser) await this.handleFirebaseUser(auth.currentUser);
      } else if (mode === 'resetPassword') {
          if (!newPassword) throw new Error("New password required.");
          await confirmPasswordReset(auth, code, newPassword);
      }
  }

  async verifyUser(token: string): Promise<boolean> { return false; } // Legacy fallback
  
  async resendVerification(email: string): Promise<void> {
      if (auth.currentUser) await sendEmailVerification(auth.currentUser);
  }
  
  async syncDirectory() {
      // No-op for now, or could pre-fetch data if needed.
      // Firestore handles data availability.
  }
}

export const authService = new AuthService();
