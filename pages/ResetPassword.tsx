
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { validatePassword } from '../utils/passwordValidation';
import { Shield, Lock, CheckCircle, AlertCircle, Eye, EyeOff, X, Check, ArrowRight, Loader2 } from 'lucide-react';

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Accept standard Firebase 'oobCode' OR requested 'token' param
  const resetCode = searchParams.get('oobCode') || searchParams.get('token');

  const [isTokenMissing, setIsTokenMissing] = useState(false);
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [validation, setValidation] = useState<{ isValid: boolean; errors: string[] }>({ isValid: false, errors: [] });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
      if (!resetCode) {
          setIsTokenMissing(true);
      }
  }, [resetCode]);

  useEffect(() => {
      // Live validation on type
      if (newPassword) {
          setValidation(validatePassword(newPassword));
      } else {
          setValidation({ isValid: false, errors: [] });
      }
  }, [newPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode) return;
    
    // Final Client-side checks
    if (!validation.isValid) return;
    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      // Pass the code to auth service
      await authService.handleActionCode(resetCode, 'resetPassword', newPassword);
      setIsSuccess(true);
      
      // Auto redirect
      setTimeout(() => navigate('/login'), 4000);
    } catch (e: any) {
      let msg = "Failed to reset password.";
      if (e.message.includes('invalid-action-code')) {
          msg = "This reset link is invalid or has expired. Please request a new one.";
      }
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. MISSING TOKEN STATE
  if (isTokenMissing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-100">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center">
          <div className="mx-auto bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="text-red-600 w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Invalid Link</h2>
          <p className="text-slate-600 mb-6 text-sm">
            The password reset link is missing a valid security token.
          </p>
          <Link to="/forgot-password" className="bg-brand-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-brand-700 transition">
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  // 2. SUCCESS STATE
  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-100">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-xl border border-slate-200 text-center animate-in zoom-in-95">
          <div className="mx-auto bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <CheckCircle className="text-green-600 w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Password Updated!</h2>
          <p className="text-slate-600 mb-8 text-sm">
            Your account has been secured with your new password. You can now log in.
          </p>
          <Link 
            to="/login" 
            className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition"
          >
            Login Now <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    );
  }

  // 3. FORM STATE
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
            <div className="bg-brand-600 p-3 rounded-xl text-white shadow-lg">
                <Shield size={40} />
            </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-slate-900">
          Set New Password
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Choose a strong password to protect your data.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200 sm:rounded-xl sm:px-10 border border-slate-200">
          
          {errorMsg && (
              <div className="mb-6 bg-red-50 p-4 rounded-lg border border-red-200 text-sm text-red-800 flex gap-3 items-start animate-in fade-in">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <p>{errorMsg}</p>
              </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* New Password Field */}
            <div>
              <label className="block text-sm font-medium text-slate-700">New Password</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`block w-full pl-10 pr-10 border rounded-lg p-3 focus:ring-2 outline-none sm:text-sm transition-colors ${
                      validation.isValid && newPassword ? 'border-green-300 focus:ring-green-500' : 'border-slate-300 focus:ring-brand-500'
                  }`}
                  placeholder="Min 8 chars"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Password Strength Meter */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <p className="font-bold text-slate-500 uppercase mb-2 tracking-wide">Password Requirements</p>
                <ul className="space-y-1.5">
                    <RequirementItem met={newPassword.length >= 8} label="At least 8 characters" />
                    <RequirementItem met={/[A-Z]/.test(newPassword)} label="One uppercase letter" />
                    <RequirementItem met={/[a-z]/.test(newPassword)} label="One lowercase letter" />
                    <RequirementItem met={/[0-9]/.test(newPassword)} label="One number" />
                </ul>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-sm font-medium text-slate-700">Confirm Password</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`block w-full pl-10 border rounded-lg p-3 focus:ring-2 outline-none sm:text-sm ${
                      confirmPassword && newPassword !== confirmPassword ? 'border-red-300 focus:ring-red-500' : 'border-slate-300 focus:ring-brand-500'
                  }`}
                  placeholder="Re-enter password"
                />
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                  <p className="mt-1 text-xs text-red-600 font-medium">Passwords do not match</p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting || !validation.isValid || newPassword !== confirmPassword}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? (
                    <>
                        <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" /> Updating...
                    </>
                ) : 'Reset Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Helper Component for checklist
const RequirementItem = ({ met, label }: { met: boolean, label: string }) => (
    <li className={`flex items-center gap-2 ${met ? 'text-green-600 font-medium' : 'text-slate-400'}`}>
        {met ? <Check size={14} className="stroke-[3]" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300"></div>}
        {label}
    </li>
);
