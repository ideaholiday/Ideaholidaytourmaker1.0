import React from 'react';
import { PricingBreakdown, UserRole } from '../types';

interface Props {
  breakdown: PricingBreakdown | null;
  role: UserRole;
  currency: string;
}

export const PriceSummary: React.FC<Props> = ({ breakdown, role, currency }) => {
  if (!breakdown) return null;

  const isOperator = role === UserRole.OPERATOR;
  const isAgent = role === UserRole.AGENT;
  
  if (isOperator) return null;

  return (
    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
      <h3 className="font-bold text-slate-900 mb-4 text-lg">Quotation Summary</h3>
      
      <div className="space-y-3">
        {/* Admin / Staff View: Full Breakdown */}
        {!isAgent && (
          <>
            <div className="flex justify-between text-sm text-slate-600">
              <span>Total Net Cost</span>
              <span className="font-mono">{breakdown.netCost.toLocaleString()}</span>
            </div>
             <div className="flex justify-between text-sm text-slate-600">
              <span>Tax / GST</span>
              <span className="font-mono">{breakdown.gstAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-green-600 font-medium">
              <span>Total Markup (Profit)</span>
              <span className="font-mono">+ {(breakdown.companyMarkupValue + breakdown.agentMarkupValue).toLocaleString()}</span>
            </div>
            <div className="border-t border-slate-200 my-2"></div>
          </>
        )}

        {/* Agent View: Only Final Selling Price */}
        <div className="flex justify-between items-end">
          <div>
            <span className="text-base font-bold text-slate-900 block">Total Package Cost</span>
            <span className="text-xs text-slate-500">(Incl. of all taxes)</span>
          </div>
          <span className="text-2xl font-bold text-brand-700 font-mono">
            {currency} {breakdown.finalPrice.toLocaleString()}
          </span>
        </div>

        <div className="flex justify-between items-center bg-white p-3 rounded border border-slate-100 mt-2">
           <span className="text-sm font-medium text-slate-700">Per Person Price</span>
           <span className="text-sm font-mono text-slate-900 font-bold">{currency} {breakdown.perPersonPrice.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};
