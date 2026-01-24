import React, { useState, useEffect } from 'react';
import { ledgerExportService } from '../../services/ledgerExportService';
import { companyService } from '../../services/companyService';
import { auditLogService } from '../../services/auditLogService';
import { useAuth } from '../../context/AuthContext';
import { LedgerTable } from '../../components/ledger/LedgerTable';
import { Download, FileText, Calendar, Building, FileSpreadsheet } from 'lucide-react';
import { LedgerEntry, CompanyProfile } from '../../types';

export const FinancialLedgerExport: React.FC = () => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  
  const [entries, setEntries] = useState<LedgerEntry[]>([]);

  useEffect(() => {
      companyService.getAllCompanies().then(setCompanies);
  }, []);

  useEffect(() => {
      ledgerExportService.generateLedger(dateFrom, dateTo, selectedCompany || undefined)
        .then(setEntries);
  }, [dateFrom, dateTo, selectedCompany]);

  const handleExport = (format: 'ZOHO' | 'TALLY' | 'CSV') => {
    if (!user) return;
    if (entries.length === 0) {
        alert("No data to export.");
        return;
    }

    let csvContent = '';
    let fileName = '';

    if (format === 'ZOHO') {
        csvContent = ledgerExportService.exportToZohoCSV(entries);
        fileName = `Zoho_Ledger_${dateFrom}_${dateTo}.csv`;
    } else if (format === 'TALLY') {
        csvContent = ledgerExportService.exportToTallyCSV(entries);
        fileName = `Tally_Ledger_${dateFrom}_${dateTo}.csv`;
    } else {
        // Generic dump
        const header = ["Date", "Voucher Type", "Voucher No", "Debit Ledger", "Credit Ledger", "Amount", "Narration"];
        const rows = entries.map(e => [e.date, e.voucherType, e.voucherNumber, e.ledgerDebit, e.ledgerCredit, e.amount, e.narration].join(','));
        csvContent = [header.join(','), ...rows].join('\n');
        fileName = `General_Ledger_${dateFrom}_${dateTo}.csv`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    const compName = companies.find(c => c.id === selectedCompany)?.brandName || 'All Companies';
    auditLogService.logAction({
        entityType: 'ACCOUNTING_EXPORT',
        entityId: 'exp_' + Date.now(),
        action: 'FINANCIAL_EXPORT',
        description: `Financial Ledger exported (${format}) for ${compName}. Records: ${entries.length}`,
        user: user
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Financial Ledger Export</h1>
          <p className="text-slate-500">Double-entry accounting records for external finance systems.</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => handleExport('TALLY')} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition">
                <FileText size={16} /> Tally Export
            </button>
            <button onClick={() => handleExport('ZOHO')} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                <FileSpreadsheet size={16} /> Zoho Export
            </button>
            <button onClick={() => handleExport('CSV')} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-900 transition">
                <Download size={16} /> Generic CSV
            </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row gap-6 items-end">
            <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <Calendar size={16} /> Period
                </label>
                <div className="flex gap-2">
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="flex-1 border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="flex-1 border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                </div>
            </div>
            <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <Building size={16} /> Entity
                </label>
                <select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)} className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white">
                    <option value="">All Companies (Consolidated)</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.brandName}</option>)}
                </select>
            </div>
        </div>
      </div>

      <LedgerTable entries={entries} />
      
      <div className="text-xs text-slate-400 text-center">
          * This report includes Booking Sales, Payments, and Credit Note reversals.
          Ensure that the selected period is financially closed before exporting to avoid duplication in accounting software.
      </div>
    </div>
  );
};