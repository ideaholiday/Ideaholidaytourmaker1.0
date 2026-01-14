
import { BRANDING } from '../constants';
import { User } from '../types';

// Mock database for verification tokens
const STORAGE_KEY_TOKENS = 'iht_verification_tokens';

interface VerificationToken {
  token: string;
  email: string;
  expiresAt: number;
}

class EmailVerificationService {
  
  private getTokens(): VerificationToken[] {
    const stored = localStorage.getItem(STORAGE_KEY_TOKENS);
    return stored ? JSON.parse(stored) : [];
  }

  private saveTokens(tokens: VerificationToken[]) {
    localStorage.setItem(STORAGE_KEY_TOKENS, JSON.stringify(tokens));
  }

  /**
   * Generates a secure, time-bound verification token.
   * Logic: Random string, expires in 24 hours.
   */
  generateToken(email: string): string {
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 Hours

    const tokens = this.getTokens();
    // Remove existing tokens for this email to enforce single valid token per user
    const cleanTokens = tokens.filter(t => t.email !== email);
    
    cleanTokens.push({ token, email, expiresAt });
    this.saveTokens(cleanTokens);

    return token;
  }

  /**
   * Validates a token.
   * Returns the email if valid, throws specific errors if invalid/expired.
   */
  validateToken(token: string): string {
    const tokens = this.getTokens();
    const record = tokens.find(t => t.token === token);

    if (!record) {
      throw new Error("INVALID_TOKEN");
    }

    if (Date.now() > record.expiresAt) {
      // Clean up expired token
      this.saveTokens(tokens.filter(t => t.token !== token));
      throw new Error("TOKEN_EXPIRED");
    }

    // Token is valid - Return email to process verification
    return record.email;
  }

  /**
   * Consumes a token (Single-use policy).
   */
  invalidateToken(token: string) {
    const tokens = this.getTokens();
    const filtered = tokens.filter(t => t.token !== token);
    this.saveTokens(filtered);
  }

  /**
   * Generates the HTML Email Template.
   */
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
            <p>Thank you for registering with <strong>Idea Holiday Pvt. Ltd.</strong></p>
            <p>Your account has been created. To activate your partner access and set your secure password, please verify your email address below.</p>
            
            <a href="${link}" class="btn">Verify Email & Set Password</a>
            
            <p style="font-size: 13px; color: #666;">This link is valid for 24 hours. If you did not request this, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>Need assistance? Contact <a href="mailto:${BRANDING.email}">${BRANDING.email}</a></p>
            <p>${BRANDING.address}</p>
            <p>&copy; ${new Date().getFullYear()} Idea Holiday Pvt. Ltd. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Simulates sending the email (Logs to console in this environment).
   */
  async sendVerificationEmail(user: User): Promise<void> {
    const token = this.generateToken(user.email);
    const html = this.generateEmailTemplate(user, token);

    console.group(`📧 [MOCK EMAIL] To: ${user.email}`);
    console.log(`From: noreply@ideaholiday.com`);
    console.log(`Subject: [ACTION REQUIRED] Activate your Partner Account - ${BRANDING.name}`);
    console.log(`Link: https://${BRANDING.website}/#/verify-email?token=${token}`);
    console.log(`Template:`, html);
    console.groupEnd();

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
  }
}

export const emailVerificationService = new EmailVerificationService();
