
import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const Unauthorized: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="text-center max-w-md bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
        <p className="text-slate-600 mb-8 leading-relaxed">
          You do not have the required permissions to access this area. This action has been logged for security purposes.
        </p>
        <Link 
          to="/dashboard" 
          className="bg-slate-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-slate-800 transition flex items-center justify-center gap-2"
        >
          <ArrowLeft size={18} /> Return to Dashboard
        </Link>
      </div>
    </div>
  );
};
