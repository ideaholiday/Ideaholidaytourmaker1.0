
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ResendVerification } from '../components/ResendVerification';
import { Shield, Lock, Mail, AlertCircle, CheckCircle, Loader2, ArrowRight, Globe, Eye, EyeOff } from 'lucide-react';
import { UserRole } from '../types';
import { BRANDING } from '../constants';

export const Login: React.FC = () => {
  const { login, user, reloadUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
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
              // Optimization: Login just happened, user state is fresh.
              // Removed redundant `await reloadUser()` to speed up redirect.
              
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
                  
                  // Add small delay for UX only if we displayed a success message (like from verification)
                  const delay = successMsg ? 1000 : 0;
                  setTimeout(() => navigate(target, { replace: true }), delay);
              }
          }
      };
      
      checkAndRedirect();
  }, [user, navigate, successMsg]);

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

  if (isRedirecting) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
              <Loader2 className="w-12 h-12 text-brand-600 animate-spin mb-4" />
              <p className="text-slate-600 font-bold text-lg animate-pulse">Entering secure workspace...</p>
          </div>
      );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-brand-900 relative overflow-hidden font-sans p-4">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-brand-500/20 rounded-full blur-3xl opacity-50 animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-3xl opacity-50 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20">
            
            {/* Header Section */}
            <div className="px-8 pt-10 pb-6 text-center">
                <div className="inline-flex items-center justify-center mb-6 transform hover:scale-105 transition-transform duration-300">
                    <div className="w-20 h-20 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-lg rotate-12">
                        <Globe size={40} className="animate-spin-slow" />
                    </div>
                </div>
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
                    {BRANDING.name}
                </h2>
                <p className="text-slate-500 font-bold text-sm uppercase tracking-wide">
                    B2B Partner Portal
                </p>
            </div>

            {/* Form Section */}
            <div className="px-8 pb-10">
                
                {/* Status Messages */}
                {successMsg && (
                    <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 shadow-sm">
                        <CheckCircle className="text-green-600 shrink-0 mt-0.5" size={20} />
                        <p className="text-sm text-green-800 font-bold">{successMsg}</p>
                    </div>
                )}

                {showResend && (
                    <ResendVerification email={email} onDismiss={() => setShowResend(false)} />
                )}

                {error && !showResend && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 shadow-sm">
                        <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
                        <p className="text-sm text-red-800 font-bold">{error}</p>
                    </div>
                )}

                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                        <label htmlFor="email" className="block text-sm font-bold text-slate-700 ml-1">
                            Email Address
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand-600 transition-colors">
                                <Mail className="h-5 w-5" />
                            </div>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all duration-200 font-semibold shadow-sm"
                                placeholder="partner@ideaholiday.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center ml-1">
                            <label htmlFor="password" className="block text-sm font-bold text-slate-700">
                                Password
                            </label>
                            <Link to="/forgot-password" className="text-xs font-bold text-brand-600 hover:text-brand-700 hover:underline transition-colors">
                                Forgot password?
                            </Link>
                        </div>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand-600 transition-colors">
                                <Lock className="h-5 w-5" />
                            </div>
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all duration-200 font-semibold shadow-sm"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-xl shadow-lg shadow-brand-500/30 text-base font-bold text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 transform hover:-translate-y-0.5 mt-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" /> Authenticating...
                            </>
                        ) : (
                            <>
                                Sign In <ArrowRight className="ml-2 h-5 w-5" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-sm text-slate-500 font-medium">
                        Don't have an account?{' '}
                        <Link to="/signup" className="font-extrabold text-brand-600 hover:text-brand-800 transition-colors underline decoration-2 underline-offset-2">
                            Register as Partner
                        </Link>
                    </p>
                </div>
            </div>
            
            {/* Footer Strip */}
            <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1.5 tracking-wider">
                    <Lock size={10} className="text-brand-500" /> Secure SSL Encrypted Connection
                </p>
            </div>
        </div>
        
        <p className="text-center text-slate-400 text-xs mt-8 relative z-10 opacity-60 font-medium">
            &copy; {new Date().getFullYear()} {BRANDING.legalName}. All rights reserved.
        </p>
      </div>
    </div>
  );
};
