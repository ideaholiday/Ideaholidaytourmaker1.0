
import React from 'react';
import { PLSummary } from '../../types';
import { TrendingUp, TrendingDown, DollarSign, PieChart } from 'lucide-react';

interface Props {
  data: PLSummary;
}

export const PLSummaryCards: React.FC<Props> = ({ data }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      {/* Revenue */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Net Revenue</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-2">
                {data.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-slate-400 mt-1">Excl. GST & Refunds</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
            <DollarSign size={24} />
          </div>
        </div>
      </div>

      {/* COGS */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Cost of Services</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-2">
                {data.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-slate-400 mt-1">Operator Payables</p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg text-red-600">
            <TrendingDown size={24} />
          </div>
        </div>
      </div>

      {/* Gross Profit */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Gross Profit</p>
            <h3 className={`text-2xl font-bold mt-2 ${data.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-slate-400 mt-1">Revenue - Cost</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg text-green-600">
            <TrendingUp size={24} />
          </div>
        </div>
      </div>

      {/* Margin */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Net Margin</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-2">
                {data.netMarginPercent.toFixed(2)}%
            </h3>
            <p className="text-xs text-slate-400 mt-1">Profitability Ratio</p>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
            <PieChart size={24} />
          </div>
        </div>
      </div>
    </div>
  );
};
