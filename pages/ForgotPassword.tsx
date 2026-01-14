
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { Shield, Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { BRANDING } from '../constants';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    setError('');
    
    try {
      await authService.requestPasswordReset(email);
      // Success case
      setIsSuccess(true);
    } catch (e: any) {
      console.error("Reset Request Error:", e.code);
      
      // SECURITY: Enumeration Protection
      // We treat 'auth/user-not-found' as a success in the UI to prevent 
      // attackers from harvesting valid email addresses.
      if (e.code === 'auth/user-not-found') {
          setIsSuccess(true);
      } 
      // We DO show rate limit errors to the legitimate user
      else if (e.code === 'auth/too-many-requests') {
          setError("Too many requests. Please try again later.");
      } 
      // Fallback for network errors or other issues
      else {
          setError("Unable to process request. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
            <div className="bg-brand-600 p-3 rounded-xl text-white shadow-lg">
                <Shield size={40} />
            </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Reset Password
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Secure Account Recovery
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200 sm:rounded-xl sm:px-10 border border-slate-200">
          
          {isSuccess ? (
            <div className="text-center animate-in fade-in slide-in-from-bottom-2">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Check your email</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                If an account exists for <strong>{email}</strong>, we have sent a password reset link.
              </p>
              <div className="mt-6 bg-slate-50 p-4 rounded-lg border border-slate-100 text-xs text-slate-500">
                <p>Don't see it? Check your spam folder or contact <a href={`mailto:${BRANDING.email}`} className="text-brand-600 hover:underline">support</a>.</p>
              </div>
              <div className="mt-8">
                <Link to="/login" className="text-sm font-bold text-brand-600 hover:text-brand-800 flex items-center justify-center gap-2 transition-colors">
                  <ArrowLeft size={16} /> Return to Login
                </Link>
              </div>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex gap-3 items-start animate-in fade-in">
                  <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800 font-medium">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                  Business Email Address
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
                    className="block w-full pl-10 sm:text-sm border-slate-300 rounded-lg focus:ring-brand-500 focus:border-brand-500 p-3 border"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" /> Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </div>

              <div className="flex items-center justify-center pt-2">
                <Link to="/login" className="font-medium text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors">
                  <ArrowLeft size={14} /> Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
        
        <p className="text-center text-xs text-slate-400 mt-8">
          Protected by Idea Holiday Security.
        </p>
      </div>
    </div>
  );
};
