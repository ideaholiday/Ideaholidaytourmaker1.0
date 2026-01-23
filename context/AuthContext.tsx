
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, UserRole } from '../types';
import { authService } from '../services/authService';
import { adminService } from '../services/adminService';
import { bookingService } from '../services/bookingService';
import { auth } from '../services/firebase'; 

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: UserRole, companyName: string, phone: string, city: string) => Promise<void>;
  logout: (reason?: string) => void;
  verifyEmail: (token: string) => Promise<boolean>;
  resendVerificationEmail: (email?: string) => Promise<void>;
  reloadUser: () => Promise<void>;
  sessionStart: number | null;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Background Sync - Non Blocking
  const performGlobalSync = async () => {
     console.log("🔄 [AuthContext] Starting Background Sync...");
     try {
         await Promise.all([
             adminService.syncAllFromCloud().catch(e => console.warn("Admin sync failed", e)),
             bookingService.syncAllBookings().catch(e => console.warn("Booking sync failed", e)),
             authService.syncDirectory().catch(e => console.warn("Dir sync failed", e))
         ]);
         console.log("✅ [AuthContext] Background Sync Complete");
     } catch(e) {
         console.warn("Global Sync partial failure", e);
     }
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        // 1. Fast Identity Resolution
        const currentUser = await authService.getCurrentUser();
        
        if (!mounted) return;

        if (currentUser) {
          setUser(currentUser);
          setSessionStart(Date.now());
        } else {
          setUser(null);
          setSessionStart(null);
        }
      } catch (e) {
        console.error("Session check failed", e);
        if (mounted) setUser(null);
      } finally {
        if (mounted) {
             // 2. UNBLOCK UI IMMEDIATELY
             setIsLoading(false);
             
             // 3. Trigger Data Sync in Background (If User Exists)
             if (auth.currentUser) {
                 setTimeout(() => performGlobalSync(), 100); 
             }
        }
      }
    };
    
    initAuth();

    // FAILSAFE: Force stop loading after 5 seconds if auth logic hangs completely
    const failsafeTimer = setTimeout(() => {
        // Note: checking 'isLoading' here refers to closure state, so we just set false to be safe.
        // React batching handles redundancy.
        setIsLoading((currentLoading) => {
            if (currentLoading) {
                console.warn("⚠️ Auth initialization timeout failsafe triggered.");
                return false; 
            }
            return currentLoading;
        });
    }, 5000);

    return () => {
        mounted = false;
        clearTimeout(failsafeTimer);
    };
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      console.warn("[AuthContext] Received 401 Unauthorized signal. Logging out.");
      logout("Session expired or invalidated by server.");
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [user]);

  const login = async (email: string, password: string) => {
    // For login, we WANT to show loading until at least basic auth is done
    setIsLoading(true); 
    setUser(null);
    setSessionStart(null);
    
    try {
      const loggedInUser = await authService.login(email, password);
      if (!loggedInUser.role) throw new Error("User role undefined. Login aborted.");
      
      setUser(loggedInUser);
      setSessionStart(Date.now());
      
      // For manual login, we can await sync briefly or let it run background
      // Letting it run background ensures snappy UX
      performGlobalSync(); 
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string, role: UserRole, companyName: string, phone: string, city: string) => {
    setIsLoading(true);
    try {
      await authService.register(email, password, name, role, companyName, phone, city);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (reason: string = "User initiated logout") => {
    authService.logout(user, reason);
    setUser(null);
    setSessionStart(null);
  };

  const verifyEmail = async (token: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const success = await authService.verifyUser(token);
      return success;
    } finally {
      setIsLoading(false);
    }
  };

  const resendVerificationEmail = async (email?: string): Promise<void> => {
      const targetEmail = email || user?.email;
      if (!targetEmail) return;
      
      setIsLoading(true);
      try {
          await authService.resendVerification(targetEmail);
      } finally {
          setIsLoading(false);
      }
  };

  const reloadUser = async (): Promise<void> => {
      if (auth.currentUser) {
          try {
              await auth.currentUser.reload();
              const refreshed = await authService.getCurrentUser();
              if (refreshed) setUser(refreshed);
          } catch (e) {
              console.error("User reload failed", e);
          }
      }
  };

  return React.createElement(
    AuthContext.Provider,
    {
      value: { 
        user, 
        isAuthenticated: !!user,
        isLoading, 
        login, 
        register,
        logout,
        verifyEmail,
        resendVerificationEmail,
        reloadUser,
        sessionStart
      }
    },
    children
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
