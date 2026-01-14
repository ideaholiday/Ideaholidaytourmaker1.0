
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { CheckCircle, AlertTriangle, XCircle, ArrowRight, Loader2 } from 'lucide-react';
import { BRANDING } from '../constants';

type VerificationStatus = 'VERIFYING' | 'SUCCESS' | 'INVALID' | 'ERROR';

export const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyEmail } = useAuth();
  
  // Firebase params (oobCode is the one-time code)
  const oobCode = searchParams.get('oobCode');
  const mode = searchParams.get('mode');
  
  // Custom Token Param
  const customToken = searchParams.get('token');
  
  const [status, setStatus] = useState<VerificationStatus>('VERIFYING');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!oobCode && !customToken) {
        setStatus('INVALID');
        setErrorMessage("No verification code found.");
        return;
    }

    const verify = async () => {
        try {
            // Case 1: Firebase Link
            if (oobCode && mode === 'verifyEmail') {
                await authService.handleActionCode(oobCode, 'verifyEmail');
                setStatus('SUCCESS');
            } 
            // Case 2: Custom Token Link
            else if (customToken) {
                const success = await verifyEmail(customToken);
                if (success) {
                    setStatus('SUCCESS');
                } else {
                    throw new Error("Invalid or expired token.");
                }
            } else {
               setStatus('INVALID');
               setErrorMessage("Invalid verification link format.");
            }
        } catch (err: any) {
            console.error("Verification Error:", err.message);
            let msg = err.message;
            if (msg.includes('invalid-action-code') || msg.includes('TOKEN_EXPIRED')) {
                msg = "This link is expired or has already been used.";
            }
            setErrorMessage(msg);
            setStatus('ERROR');
        }
    };

    // Small delay for UX
    const timer = setTimeout(() => verify(), 1000);
    return () => clearTimeout(timer);
  }, [oobCode, mode, customToken, verifyEmail]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 max-w-md w-full text-center transition-all duration-300 transform scale-100">
        
        <div className="mb-8">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{BRANDING.name}</h1>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mt-1">Email Verification</p>
        </div>

        {status === 'VERIFYING' && (
            <div className="py-8 animate-in fade-in">
                <div className="mx-auto w-16 h-16 flex items-center justify-center mb-6">
                    <Loader2 className="w-12 h-12 text-brand-600 animate-spin" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Verifying...</h2>
                <p className="text-slate-500">Please wait while we validate your email link.</p>
            </div>
        )}

        {status === 'SUCCESS' && (
            <div className="py-6 animate-in zoom-in-95">
                <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600">
                    <CheckCircle className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Email Verified!</h2>
                <p className="text-slate-600 mb-8">
                    Thank you for verifying your email. Your account is now active.
                </p>
                <Link 
                    to="/login"
                    className="inline-flex items-center justify-center gap-2 w-full bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-200"
                >
                    Login to Dashboard <ArrowRight size={18} />
                </Link>
            </div>
        )}

        {(status === 'INVALID' || status === 'ERROR') && (
            <div className="py-6 animate-in zoom-in-95">
                <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6 text-red-600">
                    {status === 'INVALID' ? <AlertTriangle className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">
                    Verification Failed
                </h2>
                <p className="text-slate-600 mb-8 text-sm">
                    {errorMessage || "The verification link is invalid or has expired."}
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={() => navigate('/login')}
                        className="flex-1 border border-slate-300 text-slate-700 px-4 py-2.5 rounded-lg font-bold hover:bg-slate-50 transition text-sm"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        )}

      </div>
      
      <div className="mt-8 text-center text-xs text-slate-400">
        &copy; {new Date().getFullYear()} {BRANDING.legalName}. All rights reserved.
      </div>
    </div>
  );
};
