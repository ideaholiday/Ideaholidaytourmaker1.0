
import React from 'react';
import { GSTRecord } from '../../types';
import { FileText, ArrowRight, Download, CheckCircle, XCircle } from 'lucide-react';

interface Props {
  records: GSTRecord[];
}

export const GstReportTable: React.FC<Props> = ({ records }) => {
  
  const handleExportCSV = () => {
    // Basic CSV Generation
    const headers = ["Invoice No", "Date", "Booking Ref", "Customer", "Taxable Value", "GST Rate", "CGST", "SGST", "IGST", "Total Tax", "Invoice Total", "Status", "Credit Note ID"];
    const rows = records.map(r => [
        r.invoiceNumber,
        new Date(r.invoiceDate).toISOString().split('T')[0],
        r.bookingRef,
        r.customerName,
        r.taxableAmount,
        r.gstRate + '%',
        r.cgstAmount,
        r.sgstAmount,
        r.igstAmount,
        r.totalGst,
        r.totalInvoiceAmount,
        r.status,
        r.creditNoteId || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n" 
        + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `GST_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (records.length === 0) {
      return <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">No GST records found for the selected period.</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <h3 className="font-bold text-slate-800">Transaction Register</h3>
        <button 
            onClick={handleExportCSV}
            className="text-sm flex items-center gap-2 bg-white border border-slate-300 px-3 py-1.5 rounded-lg text-slate-700 hover:bg-slate-50 transition"
        >
            <Download size={16} /> Export CSV
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-white text-slate-500 border-b border-slate-100 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-6 py-4 font-semibold">Invoice No</th>
              <th className="px-6 py-4 font-semibold">Date</th>
              <th className="px-6 py-4 font-semibold">Ref No</th>
              <th className="px-6 py-4 font-semibold text-right">Taxable</th>
              <th className="px-6 py-4 font-semibold text-right">Total GST</th>
              <th className="px-6 py-4 font-semibold text-right">Inv. Total</th>
              <th className="px-6 py-4 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {records.map((rec) => (
              <tr key={rec.id} className="hover:bg-slate-50 transition group">
                <td className="px-6 py-3 font-medium text-brand-600 font-mono">
                  {rec.invoiceNumber}
                  {rec.creditNoteId && <span className="block text-[10px] text-red-500">Has Credit Note</span>}
                </td>
                <td className="px-6 py-3 text-slate-600">
                    {new Date(rec.invoiceDate).toLocaleDateString()}
                </td>
                <td className="px-6 py-3 text-slate-600">
                    {rec.bookingRef}
                    <div className="text-[10px] text-slate-400">{rec.customerName}</div>
                </td>
                <td className="px-6 py-3 text-right font-mono text-slate-700">
                    {rec.taxableAmount.toLocaleString()}
                </td>
                <td className="px-6 py-3 text-right font-mono text-slate-600">
                    {rec.totalGst.toLocaleString()}
                    <div className="text-[9px] text-slate-400">@{rec.gstRate}%</div>
                </td>
                <td className="px-6 py-3 text-right font-bold font-mono text-slate-900">
                    {rec.totalInvoiceAmount.toLocaleString()}
                </td>
                <td className="px-6 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        rec.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 
                        rec.status === 'REFUNDED' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                    }`}>
                        {rec.status === 'ACTIVE' ? <CheckCircle size={10} /> : <XCircle size={10} />}
                        {rec.status}
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
