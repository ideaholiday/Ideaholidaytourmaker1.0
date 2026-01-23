
import React from 'react';
import { ExpiringRate } from '../../types';
import { AlertCircle, Calendar } from 'lucide-react';

interface Props {
  rates: ExpiringRate[];
}

export const ExpiringRatesWidget: React.FC<Props> = ({ rates }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <AlertCircle size={18} className="text-red-500" /> Expiring Rates
        </h3>
        <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-bold">{rates.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[300px]">
        {rates.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No rates expiring soon. Safe sailing!</div>
        ) : (
            <div className="divide-y divide-slate-100">
                {rates.map(rate => {
                    let riskColor = 'bg-yellow-50 text-yellow-700 border-yellow-200'; // Monitor
                    if (rate.daysRemaining <= 7) riskColor = 'bg-red-50 text-red-700 border-red-200'; // Critical
                    else if (rate.daysRemaining <= 15) riskColor = 'bg-orange-50 text-orange-700 border-orange-200'; // Warning

                    return (
                        <div key={rate.id} className="p-4 hover:bg-slate-50 transition flex justify-between items-start">
                            <div className="flex-1">
                                <div className="font-medium text-slate-900 text-sm truncate pr-2">{rate.name}</div>
                                <div className="text-xs text-slate-500 mt-0.5">{rate.details}</div>
                                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                    <Calendar size={10} /> Valid until: {rate.validTo}
                                </div>
                            </div>
                            <div className={`px-2 py-1 rounded text-xs font-bold border ${riskColor} shrink-0 text-center min-w-[60px]`}>
                                {rate.daysRemaining} days
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
      </div>
    </div>
  );
};
