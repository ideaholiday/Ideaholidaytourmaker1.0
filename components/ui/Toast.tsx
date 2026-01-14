
import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  isVisible: boolean;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const styles = {
    success: 'bg-emerald-600 text-white',
    error: 'bg-red-600 text-white',
    info: 'bg-slate-800 text-white'
  };

  const icons = {
    success: <CheckCircle size={20} />,
    error: <XCircle size={20} />,
    info: <AlertCircle size={20} />
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl transition-all duration-500 transform translate-y-0 ${styles[type]} animate-in slide-in-from-bottom-5 fade-in`}>
      {icons[type]}
      <span className="font-medium text-sm">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-75 transition">
        <X size={16} />
      </button>
    </div>
  );
};
