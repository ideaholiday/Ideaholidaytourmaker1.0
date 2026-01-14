
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { SESSION_CONFIG } from '../constants';

export const useSessionTimeout = () => {
  const { user, logout, sessionStart } = useAuth();
  const [isWarning, setIsWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0); // For warning countdown

  // Timestamps
  const lastActivityRef = useRef<number>(Date.now());
  
  // Timer References
  const warningTimerRef = useRef<any>(null);
  const logoutTimerRef = useRef<any>(null);
  const absoluteTimerRef = useRef<any>(null);

  const resetInactivityTimer = useCallback(() => {
    if (!user) return;

    const now = Date.now();
    lastActivityRef.current = now;

    if (isWarning) {
      setIsWarning(false); // Dismiss warning if user becomes active
    }

    // Clear existing timers
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);

    // Set Warning Timer (Inactivity Limit - Warning Threshold)
    const timeUntilWarning = SESSION_CONFIG.INACTIVITY_TIMEOUT_MS - SESSION_CONFIG.WARNING_THRESHOLD_MS;
    
    warningTimerRef.current = setTimeout(() => {
      setIsWarning(true);
    }, timeUntilWarning);

    // Set Logout Timer (Inactivity Limit)
    logoutTimerRef.current = setTimeout(() => {
      logout("Session timed out due to inactivity.");
    }, SESSION_CONFIG.INACTIVITY_TIMEOUT_MS);

  }, [user, isWarning, logout]);

  // Setup Activity Listeners
  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    // Throttle the reset to avoid performance issues on scroll
    let throttleTimeout: any;
    
    const handleActivity = () => {
      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          resetInactivityTimer();
          throttleTimeout = undefined;
        }, 1000); // Check at most once per second
      }
    };

    events.forEach(event => window.addEventListener(event, handleActivity));
    
    // Initial start
    resetInactivityTimer();

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      if (throttleTimeout) clearTimeout(throttleTimeout);
    };
  }, [user, resetInactivityTimer]);

  // Absolute Session Timeout Check
  useEffect(() => {
    if (!user || !sessionStart) return;

    const now = Date.now();
    const timeElapsed = now - sessionStart;
    const timeRemaining = SESSION_CONFIG.ABSOLUTE_TIMEOUT_MS - timeElapsed;

    if (timeRemaining <= 0) {
      logout("Absolute session limit (8h) reached.");
    } else {
      absoluteTimerRef.current = setTimeout(() => {
        logout("Absolute session limit (8h) reached.");
      }, timeRemaining);
    }

    return () => {
      if (absoluteTimerRef.current) clearTimeout(absoluteTimerRef.current);
    };
  }, [user, sessionStart, logout]);

  // Countdown Effect for Warning Modal
  useEffect(() => {
    if (isWarning) {
        const interval = setInterval(() => {
            const now = Date.now();
            const timeSinceLastActivity = now - lastActivityRef.current;
            const timeLeft = SESSION_CONFIG.INACTIVITY_TIMEOUT_MS - timeSinceLastActivity;
            
            setRemainingTime(Math.max(0, Math.ceil(timeLeft / 1000)));

            if (timeLeft <= 0) {
                clearInterval(interval);
            }
        }, 1000);
        return () => clearInterval(interval);
    }
  }, [isWarning]);

  return { isWarning, remainingTime, setIsWarning };
};
