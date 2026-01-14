
import React from 'react';
import { useSessionTimeout } from '../hooks/useSessionTimeout';
import { useAuth } from '../context/AuthContext';
import { Clock, AlertTriangle, LogOut } from 'lucide-react';

export const SessionWatcher: React.FC = () => {
  const { user, logout } = useAuth();
  const { isWarning, remainingTime, setIsWarning } = useSessionTimeout();

  // If not logged in or no warning, render nothing
  if (!user || !isWarning) return null;

  const handleContinue = () => {
    setIsWarning(false);
    // Trigger a mock activity to reset the timer via the hook's listener
    window.dispatchEvent(new Event('mousedown')); 
  };

  const handleLogout = () => {
    logout("User chose to logout from timeout warning.");
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden transform transition-all scale-100">
        
        {/* Header */}
        <div className="bg-amber-50 p-4 border-b border-amber-100 flex items-center gap-3">
          <div className="bg-amber-100 p-2 rounded-full text-amber-600 animate-pulse">
            <Clock size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Session Expiring</h3>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-slate-600 text-sm mb-4">
            You have been inactive for a while. For security reasons, you will be logged out automatically in:
          </p>
          
          <div className="text-center py-4">
            <span className={`text-4xl font-mono font-bold ${remainingTime < 30 ? 'text-red-600' : 'text-slate-800'}`}>
              {Math.floor(remainingTime / 60)}:{(remainingTime % 60).toString().padStart(2, '0')}
            </span>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wide font-semibold">Time Remaining</p>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg flex gap-2 items-start text-xs text-slate-500 border border-slate-100">
             <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-500" />
             <p>Move your mouse or click 'Stay Logged In' to extend your session.</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button 
            onClick={handleLogout}
            className="flex-1 py-2.5 px-4 border border-slate-300 rounded-lg text-slate-600 hover:bg-white hover:text-red-600 transition font-medium text-sm flex items-center justify-center gap-2"
          >
            <LogOut size={16} /> Logout Now
          </button>
          <button 
            onClick={handleContinue}
            className="flex-1 py-2.5 px-4 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition font-bold text-sm shadow-sm"
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  );
};
