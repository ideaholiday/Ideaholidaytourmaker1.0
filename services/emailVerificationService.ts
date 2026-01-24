
import { BRANDING } from '../constants';
import { User } from '../types';
import { dbHelper } from './firestoreHelper';

const COLLECTION = 'verification_tokens';

interface VerificationToken {
  id: string; // Token string acts as ID
  email: string;
  expiresAt: number;
}

class EmailVerificationService {
  
  /**
   * Generates a secure, time-bound verification token and saves to Firestore.
   */
  async generateToken(email: string): Promise<string> {
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 Hours

    const record: VerificationToken = { id: token, email, expiresAt };
    await dbHelper.save(COLLECTION, record);

    return token;
  }

  /**
   * Validates a token from Firestore.
   */
  async validateToken(token: string): Promise<string> {
    const record = await dbHelper.getById<VerificationToken>(COLLECTION, token);

    if (!record) {
      throw new Error("INVALID_TOKEN");
    }

    if (Date.now() > record.expiresAt) {
      await dbHelper.delete(COLLECTION, token);
      throw new Error("TOKEN_EXPIRED");
    }

    // Return email associated with valid token
    return record.email;
  }

  /**
   * Consumes a token (Single-use policy).
   */
  async invalidateToken(token: string) {
    await dbHelper.delete(COLLECTION, token);
  }

  generateEmailTemplate(user: User, token: string): string {
    const link = `https://${BRANDING.website}/#/verify-email?token=${token}`;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background-color: #0f172a; padding: 30px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 1px; }
          .content { padding: 40px 30px; text-align: center; }
          .content h2 { color: #0f172a; margin-top: 0; }
          .btn { display: inline-block; padding: 14px 28px; background-color: #0284c7; color: white !important; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 25px 0; font-size: 16px; }
          .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
          .footer a { color: #0284c7; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${BRANDING.name}</h1>
          </div>
          <div class="content">
            <h2>Welcome to Idea Holiday Partner Network</h2>
            <p>Dear <strong>${user.name}</strong>,</p>
            <p>Thank you for registering. To activate your partner access, verify your email below.</p>
            <a href="${link}" class="btn">Verify Email & Set Password</a>
            <p style="font-size: 13px; color: #666;">Valid for 24 hours.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Idea Holiday Pvt. Ltd.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendVerificationEmail(user: User): Promise<void> {
    const token = await this.generateToken(user.email);
    const html = this.generateEmailTemplate(user, token);

    console.group(`📧 [MOCK EMAIL] To: ${user.email}`);
    console.log(`Link: https://${BRANDING.website}/#/verify-email?token=${token}`);
    console.log(`Template:`, html);
    console.groupEnd();
  }
}

export const emailVerificationService = new EmailVerificationService();
