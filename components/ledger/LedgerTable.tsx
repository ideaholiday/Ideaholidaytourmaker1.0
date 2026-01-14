
import React from 'react';
import { LedgerEntry } from '../../types';

interface Props {
  entries: LedgerEntry[];
}

export const LedgerTable: React.FC<Props> = ({ entries }) => {
  if (entries.length === 0) {
    return <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">No ledger entries found for the selected period.</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-6 py-4 font-semibold">Date</th>
              <th className="px-6 py-4 font-semibold">Voucher</th>
              <th className="px-6 py-4 font-semibold">Type</th>
              <th className="px-6 py-4 font-semibold">Debit Ledger</th>
              <th className="px-6 py-4 font-semibold">Credit Ledger</th>
              <th className="px-6 py-4 font-semibold text-right">Amount</th>
              <th className="px-6 py-4 font-semibold">Narration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.map((e) => (
              <tr key={e.entryId} className="hover:bg-slate-50">
                <td className="px-6 py-3 text-slate-600 whitespace-nowrap">{new Date(e.date).toLocaleDateString()}</td>
                <td className="px-6 py-3 font-mono text-brand-600 text-xs">{e.voucherNumber}</td>
                <td className="px-6 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded border ${
                        e.voucherType === 'SALES' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                        e.voucherType === 'RECEIPT' ? 'bg-green-50 text-green-700 border-green-100' :
                        'bg-amber-50 text-amber-700 border-amber-100'
                    }`}>
                        {e.voucherType}
                    </span>
                </td>
                <td className="px-6 py-3 font-medium text-slate-700">{e.ledgerDebit}</td>
                <td className="px-6 py-3 font-medium text-slate-700">{e.ledgerCredit}</td>
                <td className="px-6 py-3 text-right font-mono font-bold text-slate-900">{e.amount.toLocaleString()}</td>
                <td className="px-6 py-3 text-xs text-slate-500 truncate max-w-xs">{e.narration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
