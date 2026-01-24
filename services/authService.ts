
import { User, UserRole } from '../types';
import { MOCK_USERS } from '../constants'; // Fallback
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
  
  // No local state 'users' array anymore. We trust the Cloud.

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
        sessionStorage.clear();
        apiClient.clearSession();
    } catch (e) {
        console.warn("Sign out error", e);
    }
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
                  const user = await this.handleFirebaseUser(fbUser);
                  resolve(user);
              } else {
                  resolve(null);
              }
          });
      });
  }

  private async handleFirebaseUser(fbUser: FirebaseUser): Promise<User> {
      // 1. Fetch Profile
      let user = await dbHelper.getById<User>('users', fbUser.uid);

      // 2. Auto-Create Profile if missing (Self-Healing)
      if (!user) {
          console.warn("User profile missing in Firestore. Creating default.");
          user = {
              id: fbUser.uid,
              uniqueId: idGeneratorService.generateUniqueId(UserRole.AGENT),
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
              email: fbUser.email || '',
              role: UserRole.AGENT, // Default role
              isVerified: fbUser.emailVerified,
              status: 'ACTIVE',
              joinedAt: new Date().toISOString(),
              dashboardRoute: '/agent/dashboard'
          };
          await dbHelper.save('users', user);
      }

      // 3. Update verification status if changed
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

  // --- Password Management (Firebase Native) ---
  async requestPasswordReset(email: string): Promise<void> {
      await sendPasswordResetEmail(auth, email);
  }

  async handleActionCode(code: string, mode: 'verifyEmail' | 'resetPassword', newPassword?: string): Promise<void> {
      if (mode === 'verifyEmail') {
          await applyActionCode(auth, code);
          // Reload user to update verification status in DB logic
          if (auth.currentUser) await this.handleFirebaseUser(auth.currentUser);
      } else if (mode === 'resetPassword') {
          if (!newPassword) throw new Error("New password required.");
          await confirmPasswordReset(auth, code, newPassword);
      }
  }

  // Used for non-firebase verification flows (Legacy)
  async verifyUser(token: string): Promise<boolean> { return false; }
  async resendVerification(email: string): Promise<void> {
      if (auth.currentUser) await sendEmailVerification(auth.currentUser);
  }
  
  // Method called by Context to ensure DB is populated
  async syncDirectory() {
      // Check if users collection is empty
      const existing = await dbHelper.getAll<User>('users');
      if (existing.length === 0) {
          console.log("🔥 Seed: Uploading Mock Users to Firestore...");
          await dbHelper.batchSave('users', MOCK_USERS);
      }
  }
}

export const authService = new AuthService();
