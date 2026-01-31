
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
  const isAdminOrStaff = role === UserRole.ADMIN || role === UserRole.STAFF;
  
  if (isOperator) return null;

  return (
    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
      <h3 className="font-bold text-slate-900 mb-4 text-lg">Quotation Summary</h3>
      
      <div className="space-y-3">
        {/* Admin / Staff View: Full Breakdown including Agent Markup */}
        {isAdminOrStaff && (
          <div className="text-xs text-slate-500 border-b border-slate-200 pb-3 mb-3">
            <div className="flex justify-between mb-1">
              <span>Supplier Net</span>
              <span className="font-mono">{breakdown.supplierCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-blue-600">
              <span>+ Platform Margin</span>
              <span className="font-mono">{breakdown.companyMarkupValue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-700 font-bold border-t border-slate-200 pt-1 mt-1">
                <span>Platform Net (B2B Price)</span>
                <span className="font-mono">{breakdown.platformNetCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-green-600 mt-1">
              <span>+ Agent Markup</span>
              <span className="font-mono">{breakdown.agentMarkupValue.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Agent View starts here (They see Platform Net as their Cost) */}
        {isAgent && (
            <div className="flex justify-between text-sm text-slate-600">
                <span>Net Cost (B2B)</span>
                <span className="font-mono font-medium">{breakdown.platformNetCost.toLocaleString()}</span>
            </div>
        )}

        {/* Only show "Your Markup" to the Agent. Admin already sees it above. */}
        {isAgent && (
            <div className="flex justify-between text-sm text-green-600 font-medium">
                <span>+ Your Markup</span>
                <span className="font-mono">{breakdown.agentMarkupValue.toLocaleString()}</span>
            </div>
        )}

        <div className="flex justify-between text-sm text-slate-600">
            <span>+ Tax / GST</span>
            <span className="font-mono">{breakdown.gstAmount.toLocaleString()}</span>
        </div>

        <div className="border-t border-slate-200 my-2"></div>

        {/* Final Price */}
        <div className="flex justify-between items-end">
          <div>
            <span className="text-base font-bold text-slate-900 block">Final Selling Price</span>
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
