
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, RefreshCw, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface Props {
  email: string;
  onDismiss?: () => void;
}

export const ResendVerification: React.FC<Props> = ({ email, onDismiss }) => {
  const { resendVerificationEmail } = useAuth();
  
  const [status, setStatus] = useState<'IDLE' | 'SENDING' | 'SENT' | 'ERROR'>('IDLE');
  const [msg, setMsg] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleResend = async () => {
    if (countdown > 0) return;
    
    setStatus('SENDING');
    setMsg('');
    
    try {
      await resendVerificationEmail(email);
      setStatus('SENT');
      setMsg('Verification email sent. Please check your inbox.');
      setCountdown(60); // 60s cooldown
    } catch (err: any) {
      setStatus('ERROR');
      setMsg(err.message || "Failed to send email. Try again later.");
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 animate-in fade-in slide-in-from-top-2 mb-6 text-left">
      <div className="flex gap-3">
        <div className="bg-amber-100 p-2 rounded-full h-fit text-amber-600 shrink-0">
          <AlertTriangle size={20} />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-amber-900 text-sm">Verification Required</h4>
          <p className="text-amber-800 text-xs mt-1 leading-relaxed">
            Your email address (<strong>{email}</strong>) is not verified. Please verify your email to continue.
          </p>
          
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={handleResend}
              disabled={status === 'SENDING' || countdown > 0}
              className="flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {status === 'SENDING' ? (
                <>
                  <Loader2 size={12} className="animate-spin" /> Sending...
                </>
              ) : countdown > 0 ? (
                <>
                  <RefreshCw size={12} /> Resend available in {countdown}s
                </>
              ) : (
                <>
                  <Mail size={12} /> Resend Verification Email
                </>
              )}
            </button>
            
            {onDismiss && (
                <button onClick={onDismiss} className="text-xs text-amber-700 hover:underline">
                    Dismiss
                </button>
            )}
          </div>

          {status === 'SENT' && (
            <div className="mt-3 flex items-center gap-2 text-xs font-bold text-green-700 animate-in fade-in">
              <CheckCircle size={14} /> {msg}
            </div>
          )}
          
          {status === 'ERROR' && (
            <div className="mt-3 text-xs font-bold text-red-600 animate-in fade-in">
              {msg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
