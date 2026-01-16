
import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { BRANDING } from '../constants';
import { Loader2, CheckCircle, XCircle, ArrowRight, ShieldCheck, Lock, Mail, Globe } from 'lucide-react';

type ActionStatus = 'PROCESSING' | 'SUCCESS' | 'ERROR';

export const AuthActionHandler: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const effectRan = useRef(false);
  
  const [status, setStatus] = useState<ActionStatus>('PROCESSING');
  const [message, setMessage] = useState('Verifying your request...');
  const [countdown, setCountdown] = useState(3);

  // Robust Parameter Extraction (Handles ? before and after #)
  const getParam = (key: string): string | null => {
    // 1. Try React Router Search Params (Standard for HashRouter)
    const val = searchParams.get(key);
    if (val) return val;

    // 2. Try Window Location Search (For URLs like domain.com/?mode=...#/auth/action)
    const query = new URLSearchParams(window.location.search);
    return query.get(key);
  };

  useEffect(() => {
    if (effectRan.current) return; // Prevent double execution in React Strict Mode
    effectRan.current = true;

    const mode = getParam('mode');
    const oobCode = getParam('oobCode');

    if (!mode || !oobCode) {
        setStatus('ERROR');
        setMessage('Invalid verification link. Missing required codes.');
        return;
    }

    const handleAction = async () => {
        try {
            // SCENARIO 1: RESET PASSWORD
            if (mode === 'resetPassword') {
                // Redirect immediately to the reset password page with the code
                navigate(`/reset-password?oobCode=${oobCode}`, { replace: true });
                return;
            }

            // SCENARIO 2: VERIFY EMAIL
            if (mode === 'verifyEmail') {
                setMessage('Verifying your email address...');
                await authService.handleActionCode(oobCode, 'verifyEmail');
                
                setStatus('SUCCESS');
                setMessage('Your email has been verified successfully.');
                
                // Countdown to Login
                const timer = setInterval(() => {
                    setCountdown((prev) => {
                        if (prev <= 1) {
                            clearInterval(timer);
                            navigate('/login', { 
                                replace: true, 
                                state: { message: "Account active! Please log in." } 
                            });
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
            } 
            else {
                throw new Error(`Unsupported action: ${mode}`);
            }

        } catch (error: any) {
            console.error("Auth Action Failed:", error);
            
            let userMsg = "An unknown error occurred.";
            const errCode = error.code || error.message;

            if (errCode.includes('invalid-action-code') || errCode.includes('expired')) {
                userMsg = "This verification link has expired or has already been used.";
            } else if (errCode.includes('user-disabled')) {
                userMsg = "This account has been disabled by an administrator.";
            } else {
                userMsg = error.message || "Unable to verify email at this time.";
            }
            
            setStatus('ERROR');
            setMessage(userMsg);
        }
    };

    handleAction();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 font-sans">
        {/* Header */}
        <div className="mb-8 text-center">
            <div className="flex justify-center mb-3">
                <div className="bg-brand-600 p-3 rounded-xl text-white shadow-lg">
                    <Globe size={32} />
                </div>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{BRANDING.name}</h1>
            <p className="text-sm text-slate-500">Secure Partner Gateway</p>
        </div>

        {/* Card */}
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 max-w-md w-full text-center transition-all duration-300">
            
            {status === 'PROCESSING' && (
                <div className="py-8 animate-in fade-in">
                    <Loader2 className="w-12 h-12 text-brand-600 animate-spin mx-auto mb-6" />
                    <h2 className="text-lg font-bold text-slate-900 mb-2">Processing...</h2>
                    <p className="text-slate-500 text-sm">{message}</p>
                </div>
            )}

            {status === 'SUCCESS' && (
                <div className="py-6 animate-in zoom-in-95">
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600">
                        <CheckCircle className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Email Verified!</h2>
                    <p className="text-slate-600 mb-6 text-sm">
                        {message}
                    </p>
                    
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-500 mb-6 flex items-center justify-center gap-2">
                        <Loader2 size={12} className="animate-spin text-slate-400" />
                        Redirecting to login in <span className="font-bold text-slate-900">{countdown}s</span>...
                    </div>

                    <button 
                        onClick={() => navigate('/login')}
                        className="w-full bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition flex items-center justify-center gap-2"
                    >
                        Login Now <ArrowRight size={16} />
                    </button>
                </div>
            )}

            {status === 'ERROR' && (
                <div className="py-6 animate-in zoom-in-95">
                    <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6 text-red-600">
                        <XCircle className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Verification Failed</h2>
                    <p className="text-slate-600 mb-8 text-sm leading-relaxed">
                        {message}
                    </p>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => navigate('/login')}
                            className="flex-1 border border-slate-300 text-slate-700 px-4 py-2.5 rounded-lg font-bold hover:bg-slate-50 transition text-sm"
                        >
                            Back to Login
                        </button>
                        <a 
                            href={`mailto:${BRANDING.email}`}
                            className="flex-1 bg-white border border-slate-300 text-brand-600 px-4 py-2.5 rounded-lg font-bold hover:bg-slate-50 transition text-sm flex items-center justify-center gap-2"
                        >
                            <Mail size={14} /> Contact Support
                        </a>
                    </div>
                </div>
            )}
        </div>

        <div className="mt-8 text-center text-xs text-slate-400">
            <p className="flex items-center justify-center gap-1">
                <Lock size={10} /> Secure SSL Encryption • {BRANDING.legalName}
            </p>
        </div>
    </div>
  );
};
