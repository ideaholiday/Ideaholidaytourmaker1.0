
import React from 'react';
import { Coins, Lock } from 'lucide-react';

export const CurrencyManagement: React.FC = () => {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Coins className="text-brand-600" /> Currency Settings
        </h1>
        <p className="text-slate-500">Configure system-wide exchange rates.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <Lock size={32} className="text-slate-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">Single Currency Mode Active</h3>
        <p className="text-slate-500 max-w-md mx-auto mb-6">
            The platform is currently locked to <strong>Indian Rupee (INR)</strong> only. Multi-currency features are disabled to ensure consistent pricing.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 font-bold rounded-lg border border-green-200">
            <Coins size={16} /> Base Currency: INR (₹)
        </div>
      </div>
    </div>
  );
};
