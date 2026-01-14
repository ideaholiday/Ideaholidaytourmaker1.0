
import { authService } from './authService';

class PasswordService {
  /**
   * Request a password reset.
   */
  async requestReset(email: string): Promise<void> {
      // Delegate to central auth service which handles Firebase logic
      await authService.requestPasswordReset(email);
  }

  // --- MOCK FALLBACKS FOR LEGACY (Kept to prevent breaking changes if called directly) ---
  
  async validateToken(token: string): Promise<string> {
    // Only used if legacy link clicked
    return "email@example.com"; 
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
     // Legacy mock
     console.log("Mock reset for legacy token");
  }
}

export const passwordService = new PasswordService();
