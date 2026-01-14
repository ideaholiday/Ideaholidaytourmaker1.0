
import React, { useState, useEffect } from 'react';
import { currencyService } from '../../services/currencyService';
import { auditLogService } from '../../services/auditLogService';
import { useAuth } from '../../context/AuthContext';
import { CurrencyConfig } from '../../types';
import { Coins, RefreshCw, Save, TrendingUp, AlertTriangle } from 'lucide-react';

export const CurrencyManagement: React.FC = () => {
  const { user } = useAuth();
  const [currencies, setCurrencies] = useState<CurrencyConfig[]>([]);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [newRate, setNewRate] = useState<string>('');

  useEffect(() => {
    setCurrencies(currencyService.getCurrencies());
  }, []);

  const handleEdit = (code: string, currentRate: number) => {
    setEditingCode(code);
    setNewRate(currentRate.toString());
  };

  const handleSave = (code: string) => {
    if (!user) return;
    const rate = parseFloat(newRate);
    if (isNaN(rate) || rate <= 0) return;

    const oldRate = currencies.find(c => c.code === code)?.rate;
    
    currencyService.updateRate(code, rate);
    setCurrencies(currencyService.getCurrencies());
    setEditingCode(null);

    // Audit Log
    auditLogService.logAction({
        entityType: 'CURRENCY_RATE',
        entityId: code,
        action: 'RATE_UPDATE',
        description: `Updated exchange rate for ${code} from ${oldRate} to ${rate}`,
        user: user,
        previousValue: oldRate,
        newValue: rate
    });
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Coins className="text-brand-600" /> Multi-Currency Engine
        </h1>
        <p className="text-slate-500">Manage daily exchange rates relative to the Base Currency (USD).</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800">Exchange Rates Table</h3>
            <div className="text-xs text-slate-500 flex items-center gap-2">
                <span className="font-medium bg-green-100 text-green-700 px-2 py-1 rounded">Base: USD ($)</span>
            </div>
        </div>
        
        <table className="w-full text-left text-sm">
            <thead className="bg-white text-slate-500 border-b border-slate-100">
                <tr>
                    <th className="px-6 py-4 font-semibold">Currency</th>
                    <th className="px-6 py-4 font-semibold">Code</th>
                    <th className="px-6 py-4 font-semibold">Exchange Rate (1 USD =)</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
                {currencies.map(c => (
                    <tr key={c.code} className={c.isBase ? 'bg-slate-50' : ''}>
                        <td className="px-6 py-4">
                            <div className="font-medium text-slate-900">{c.name}</div>
                        </td>
                        <td className="px-6 py-4">
                            <span className="font-mono bg-slate-100 px-2 py-1 rounded text-xs border border-slate-200">{c.code}</span>
                        </td>
                        <td className="px-6 py-4">
                            {editingCode === c.code ? (
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        value={newRate}
                                        onChange={(e) => setNewRate(e.target.value)}
                                        className="w-24 border border-brand-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                        autoFocus
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 font-mono font-bold text-slate-700">
                                    {c.symbol} {c.rate.toFixed(2)}
                                    {c.isBase && <span className="text-xs font-normal text-slate-400">(Base)</span>}
                                </div>
                            )}
                        </td>
                        <td className="px-6 py-4 text-right">
                            {!c.isBase && (
                                <>
                                    {editingCode === c.code ? (
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setEditingCode(null)} className="text-slate-500 hover:text-slate-800 text-xs px-2 py-1">Cancel</button>
                                            <button onClick={() => handleSave(c.code)} className="bg-brand-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-brand-700 flex items-center gap-1">
                                                <Save size={12} /> Save
                                            </button>
                                        </div>
                                    ) : (
                                        <button onClick={() => handleEdit(c.code, c.rate)} className="text-brand-600 hover:text-brand-800 text-xs font-medium border border-brand-200 hover:bg-brand-50 px-3 py-1.5 rounded transition flex items-center gap-1 ml-auto">
                                            <TrendingUp size={12} /> Update Rate
                                        </button>
                                    )}
                                </>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 text-amber-800 text-sm">
          <AlertTriangle size={20} className="shrink-0 mt-0.5" />
          <div>
              <p className="font-bold">Important Note on Pricing:</p>
              <p>Updating exchange rates will affect <strong>all future quotes</strong> and any quotes currently in 'Draft' status. Confirmed bookings will retain the exchange rate locked at the time of confirmation.</p>
          </div>
      </div>
    </div>
  );
};
