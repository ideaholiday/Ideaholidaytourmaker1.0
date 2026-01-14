
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MOCK_USERS } from '../constants';
import { ResendVerification } from '../components/ResendVerification';
import { Shield, Lock, Mail, AlertCircle, Briefcase, UserCheck, CheckCircle, Loader2 } from 'lucide-react';
import { UserRole } from '../types';

export const Login: React.FC = () => {
  const { login, user, reloadUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // 1. Handle Messages from Redirects (e.g., "Account active!")
  useEffect(() => {
      const msg = (location.state as any)?.message;
      if (msg) {
          setSuccessMsg(msg);
          // Clear state from history so refresh doesn't show it again
          window.history.replaceState({}, document.title);
      }
  }, [location]);

  // 2. AUTO-REDIRECT LOGIC
  useEffect(() => {
      const checkAndRedirect = async () => {
          if (user) {
              // Refresh user token to get latest emailVerified status
              await reloadUser();
              
              if (user.isVerified) {
                  setIsRedirecting(true);
                  // Determine proper dashboard based on role
                  let target = '/dashboard'; // Default
                  switch(user.role) {
                      case UserRole.AGENT: target = '/agent/dashboard'; break;
                      case UserRole.OPERATOR: target = '/operator/dashboard'; break;
                      case UserRole.ADMIN: 
                      case UserRole.STAFF: target = '/admin/dashboard'; break;
                      case UserRole.SUPPLIER: target = '/supplier/dashboard'; break;
                  }
                  
                  // Add small delay for UX if we just showed a success message
                  const delay = successMsg ? 1500 : 0;
                  setTimeout(() => navigate(target, { replace: true }), delay);
              }
          }
      };
      
      checkAndRedirect();
  }, [user, navigate, successMsg, reloadUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsSubmitting(true);
    setShowResend(false);
    
    try {
      await login(email, password);
      // Navigation is handled by the useEffect above
    } catch (err: any) {
      const msg = err.message.replace('Firebase: ', '').replace('auth/', '');
      
      if (msg.includes('not verified') || msg.includes('email-not-verified')) {
          setShowResend(true);
      } else {
          setError(msg || "Authentication failed. Please check credentials.");
      }
      setIsSubmitting(false);
    }
  };

  const fillCredentials = (uEmail: string) => {
    setEmail(uEmail);
    setPassword('password123');
  };

  if (isRedirecting) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
              <Loader2 className="w-10 h-10 text-brand-600 animate-spin mb-4" />
              <p className="text-slate-500 font-medium">Entering secure workspace...</p>
          </div>
      );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
            <div className="bg-brand-600 p-3 rounded-xl text-white shadow-lg">
                <Shield size={40} />
            </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Idea Holiday B2B Portal
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Secure Access for Partners & Staff
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200 sm:rounded-xl sm:px-10 border border-slate-200">
          
          <div className="mb-6 flex items-center justify-center gap-2 text-xs font-medium text-amber-700 bg-amber-50 p-2 rounded border border-amber-100">
             <Lock size={12} /> Restricted System. Authorized Personnel Only.
          </div>

          {/* Success Message (e.g. from Verification) */}
          {successMsg && (
              <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 animate-in fade-in flex items-start gap-3">
                  <CheckCircle className="text-green-600 shrink-0 mt-0.5" size={18} />
                  <p className="text-sm text-green-700 font-bold">{successMsg}</p>
              </div>
          )}

          {/* Verification Warning Component */}
          {showResend && (
             <ResendVerification email={email} onDismiss={() => setShowResend(false)} />
          )}

          {/* Standard Error Alert */}
          {error && !showResend && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-start">
                  <AlertCircle className="text-red-500 mr-2 shrink-0 mt-0.5" size={18} />
                  <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Business Email
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 sm:text-sm border-slate-300 rounded-lg focus:ring-brand-500 focus:border-brand-500 p-2.5 border"
                  placeholder="name@ideaholiday.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 sm:text-sm border-slate-300 rounded-lg focus:ring-brand-500 focus:border-brand-500 p-2.5 border"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                {isSubmitting ? 'Authenticating...' : 'Sign In'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
             <p className="text-xs text-slate-400">
               Forgot your password? <Link to="/forgot-password" className="text-brand-600 hover:underline">Reset here</Link>.
             </p>
          </div>
        </div>
        
        {/* Demo Accounts Panel */}
        <div className="mt-8">
            <p className="text-center text-xs text-slate-500 mb-3 uppercase tracking-wider font-bold">Quick Access (Demo / Mock Mode)</p>
            <div className="grid grid-cols-1 gap-2">
                {MOCK_USERS.map((u) => (
                    <button 
                        key={u.id}
                        onClick={() => fillCredentials(u.email)}
                        className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg text-xs hover:border-brand-500 hover:shadow-md transition text-left group"
                    >
                        <span className="flex items-center gap-2 font-bold text-slate-700 group-hover:text-brand-700">
                            {u.role === 'ADMIN' ? <Shield size={14} className="text-red-500"/> : 
                             u.role === 'SUPPLIER' ? <Briefcase size={14} className="text-purple-500"/> : 
                             <UserCheck size={14} className="text-blue-500"/>}
                            {u.role}
                        </span>
                        <span className="text-slate-400 font-mono">{u.email}</span>
                    </button>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};
