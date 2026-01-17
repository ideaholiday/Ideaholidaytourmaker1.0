
import { BRANDING } from '../constants';

/**
 * API Client Service
 * 
 * This service acts as the bridge between the frontend and the backend (mock or real).
 * 
 * SECURITY FEATURES:
 * 1. Simulates `credentials: 'include'` by checking the 'mock_http_only_cookie'.
 * 2. Global 401 Interceptor: Dispatches 'auth:unauthorized' event.
 * 3. Centralized Error Handling.
 */

// Simulating a secure HttpOnly cookie. Frontend code should NOT access this directly
// except within this specific service which mocks the Browser/Network layer.
const MOCK_COOKIE_NAME = 'iht_secure_session';

class ApiClient {
  
  /**
   * Dispatches a global event when a 401 is detected.
   * The AuthContext listens to this to force a UI logout.
   */
  private triggerUnauthorized() {
    window.dispatchEvent(new Event('auth:unauthorized'));
  }

  /**
   * Helper to check if we have a valid session (Simulating server-side check)
   */
  private hasValidSession(): boolean {
    // In a real app, the browser sends the cookie automatically.
    // Here, we check if our mock cookie exists.
    return !!localStorage.getItem(MOCK_COOKIE_NAME);
  }

  /**
   * Generic Request Wrapper
   */
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // 1. SIMULATE NETWORK LATENCY
    // Reduced to 50ms for snappier UI response while still async
    await new Promise(resolve => setTimeout(resolve, 50));

    // 2. SIMULATE SECURITY CHECK (Middleware)
    // Public endpoints that don't require auth
    // Note: We use .includes() so partial matches work (e.g. query params)
    const publicEndpoints = [
        '/auth/login', 
        '/auth/forgot-password', 
        '/auth/signup', 
        '/auth/activate', 
        '/auth/resend-verification',
        '/public/',
        '/api/public', // Fallback
        'auth/' // Broad match for auth related routes
    ];
    
    // Normalize endpoint to lowercase for checking
    const lowerEndpoint = endpoint.toLowerCase();
    const isPublic = publicEndpoints.some(p => lowerEndpoint.includes(p.toLowerCase()));

    // Strict check: If NOT public AND NO session => 401
    if (!isPublic && !this.hasValidSession()) {
      console.warn(`[API] 401 Unauthorized access to ${endpoint}`);
      this.triggerUnauthorized();
      throw new Error("401 Unauthorized");
    }

    // 3. MOCK RESPONSE HANDLER
    // In production, this would be: const response = await fetch(url, { ...options, credentials: 'include' });
    // Here we pass through, assuming the 'Service' layer mocks the data return.
    return Promise.resolve({} as T); 
  }

  // --- MOCK COOKIE MANAGEMENT (Server-Side Simulation) ---
  
  /**
   * Sets the session cookie (Called by AuthService on Login)
   */
  setSession(token: string) {
    localStorage.setItem(MOCK_COOKIE_NAME, token);
  }

  /**
   * Clears the session cookie (Called by AuthService on Logout)
   */
  clearSession() {
    localStorage.removeItem(MOCK_COOKIE_NAME);
  }
}

export const apiClient = new ApiClient();
