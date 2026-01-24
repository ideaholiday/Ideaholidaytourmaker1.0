
import React, { useState, useEffect } from 'react';
import { gstService } from '../../services/gstService';
import { GstSummaryCards } from '../../components/gst/GstSummaryCards';
import { GstReportTable } from '../../components/gst/GstReportTable';
import { GSTRecord } from '../../types';
import { FileText, Calendar } from 'lucide-react';

export const GstDashboard: React.FC = () => {
  const [records, setRecords] = useState<GSTRecord[]>([]);
  // const [cnList, setCnList] = useState(gstService.getAllCreditNotes()); // Future use for detailed CN table
  const [stats, setStats] = useState({ grossTaxable: 0, grossGst: 0, netTaxable: 0, netGst: 0, cnCount: 0, invCount: 0 });

  const handleRefresh = async () => {
      const recs = await gstService.getAllRecords();
      setRecords(recs);
      const sts = await gstService.getSummaryStats();
      setStats(sts);
  };

  useEffect(() => {
      handleRefresh();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText size={24} className="text-brand-600" /> GST Reports & Compliance
          </h1>
          <p className="text-slate-500">Track invoices, tax liability, and credit reversals.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500 bg-white px-3 py-2 rounded-lg border border-slate-200">
            <Calendar size={16} />
            <span>Financial Year: 2023-2024</span>
        </div>
      </div>

      {/* KPI Cards */}
      <GstSummaryCards stats={stats} />

      {/* Main Report Table */}
      <GstReportTable records={records} />
      
      {/* Footer Disclaimer */}
      <div className="text-center text-xs text-slate-400 mt-8">
          System generated reports for internal audit and compliance tracking. 
          Please verify with your CA before filing returns.
      </div>
    </div>
  );
};
