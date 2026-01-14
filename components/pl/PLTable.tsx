
import React from 'react';
import { PLTransaction } from '../../types';
import { Download } from 'lucide-react';

interface Props {
  transactions: PLTransaction[];
}

export const PLTable: React.FC<Props> = ({ transactions }) => {
  
  const handleExport = () => {
    const header = ["Date", "Ref No", "Agent", "Revenue (Taxable)", "COGS", "Gross Profit", "Status"];
    const rows = transactions.map(t => [
        new Date(t.date).toLocaleDateString(),
        t.referenceRef,
        t.agentName,
        t.income,
        t.cogs,
        t.grossProfit,
        t.status
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," + [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.href = encodedUri;
    link.download = `PL_Detailed_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (transactions.length === 0) return <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">No financial data for selected period.</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <h3 className="font-bold text-slate-800">Transaction Breakdown</h3>
        <button onClick={handleExport} className="text-sm flex items-center gap-2 text-slate-600 hover:text-brand-600 transition">
            <Download size={16} /> Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-white text-slate-500 border-b border-slate-100 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-6 py-4 font-semibold">Date</th>
              <th className="px-6 py-4 font-semibold">Ref No</th>
              <th className="px-6 py-4 font-semibold">Agent</th>
              <th className="px-6 py-4 font-semibold text-right text-blue-600">Revenue</th>
              <th className="px-6 py-4 font-semibold text-right text-red-600">Cost (COGS)</th>
              <th className="px-6 py-4 font-semibold text-right text-green-600">Profit</th>
              <th className="px-6 py-4 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {transactions.map(t => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="px-6 py-3 text-slate-600">{new Date(t.date).toLocaleDateString()}</td>
                <td className="px-6 py-3 font-mono text-slate-800 font-medium">{t.referenceRef}</td>
                <td className="px-6 py-3 text-slate-600">{t.agentName}</td>
                <td className="px-6 py-3 text-right font-mono">{t.income.toLocaleString()}</td>
                <td className="px-6 py-3 text-right font-mono">{t.cogs.toLocaleString()}</td>
                <td className="px-6 py-3 text-right font-mono font-bold">{t.grossProfit.toLocaleString()}</td>
                <td className="px-6 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        t.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                        {t.status}
                    </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
