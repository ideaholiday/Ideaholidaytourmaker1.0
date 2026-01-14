
import React from 'react';
import { IndianRupee, FileText, RefreshCw, BarChart } from 'lucide-react';

interface Props {
  stats: {
    grossTaxable: number;
    grossGst: number;
    netTaxable: number;
    netGst: number;
    cnCount: number;
    invCount: number;
  };
}

export const GstSummaryCards: React.FC<Props> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* 1. Net Payable GST */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-slate-500">Net GST Payable</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">₹ {stats.netGst.toLocaleString()}</h3>
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
               <span className="font-bold">After Reversals</span>
            </p>
          </div>
          <div className="p-3 bg-brand-50 rounded-lg text-brand-600">
            <IndianRupee size={24} />
          </div>
        </div>
      </div>

      {/* 2. Total Taxable Turnover */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-slate-500">Taxable Turnover</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">₹ {stats.netTaxable.toLocaleString()}</h3>
            <p className="text-xs text-slate-400 mt-1">Net of Credit Notes</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
            <BarChart size={24} />
          </div>
        </div>
      </div>

      {/* 3. Invoices Generated */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-slate-500">Invoices Issued</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.invCount}</h3>
            <p className="text-xs text-slate-400 mt-1">Gross Invoices</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
            <FileText size={24} />
          </div>
        </div>
      </div>

      {/* 4. Credit Notes */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-slate-500">Credit Notes</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.cnCount}</h3>
            <p className="text-xs text-slate-400 mt-1">Refunds Processed</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
            <RefreshCw size={24} />
          </div>
        </div>
      </div>
    </div>
  );
};
