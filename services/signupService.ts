
import { UserRole } from '../types';
import { authService } from './authService';

export interface SignupRequest {
  companyName: string;
  contactPerson: string;
  email: string;
  password?: string; // Added password
  mobile: string;
  city: string;
  role: UserRole.AGENT | UserRole.OPERATOR | UserRole.HOTEL_PARTNER;
}

class SignupService {
  /**
   * Orchestrates the signup process.
   * 1. Validates B2B constraints
   * 2. Calls Auth Service to create record
   * 3. Handles specific error messages
   */
  async signup(data: SignupRequest): Promise<void> {
    // 1. Validation
    if (!data.companyName || !data.contactPerson || !data.email || !data.mobile || !data.city) {
      throw new Error("All fields are required.");
    }

    // Password validation if provided (Firebase requires it for create)
    if (data.password && data.password.length < 6) {
        throw new Error("Password must be at least 6 characters.");
    }

    if (![UserRole.AGENT, UserRole.OPERATOR, UserRole.HOTEL_PARTNER].includes(data.role)) {
      throw new Error("Invalid account type. Only Agents, Operators, and Hotel Partners can self-register.");
    }

    const mobileRegex = /^[0-9]{10,15}$/;
    if (!mobileRegex.test(data.mobile.replace(/\D/g, ''))) {
      throw new Error("Invalid mobile number format.");
    }

    // 2. Delegate to Auth Service
    await authService.register(
      data.email,
      data.password || 'TempPass123!', // Fallback if UI doesn't provide it, though it should.
      data.contactPerson,
      data.role,
      data.companyName,
      data.mobile,
      data.city
    );
  }
}

export const signupService = new SignupService();
