
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, UserRole } from '../types';
import { authService } from '../services/authService';
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

  // 1. Initialize Session on Mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          setSessionStart(Date.now()); 
        } else {
          // Explicitly clear if no user found on init
          setUser(null);
          setSessionStart(null);
        }
      } catch (e) {
        console.error("Session check failed", e);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  // 2. Global 401 Listener
  useEffect(() => {
    const handleUnauthorized = () => {
      console.warn("[AuthContext] Received 401 Unauthorized signal. Logging out.");
      logout("Session expired or invalidated by server.");
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [user]);

  const login = async (email: string, password: string) => {
    // RESET STATE BEFORE LOGIN ATTEMPT
    setUser(null);
    setSessionStart(null);
    setIsLoading(true);
    
    try {
      const loggedInUser = await authService.login(email, password);
      // VALIDATE ROLE EXISTS
      if (!loggedInUser.role) {
          throw new Error("User role undefined. Login aborted.");
      }
      setUser(loggedInUser);
      setSessionStart(Date.now());
    } catch (error) {
      // Error handling is managed by the UI component calling this
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
    // 1. Call service to clear backend/storage
    authService.logout(user, reason);
    
    // 2. Clear Context State Immediately
    setUser(null);
    setSessionStart(null);
    
    // 3. Force reload if needed to clear in-memory caches of other components
    // window.location.reload(); // Optional: Drastic but effective for clearing global state variables
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
