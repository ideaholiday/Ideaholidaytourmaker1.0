
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { plReportService, PLReportData } from '../../services/plReportService';
import { useAuth } from '../../context/AuthContext';
import { PLSummaryCards } from '../../components/pl/PLSummaryCards';
import { PLCharts } from '../../components/pl/PLCharts';
import { PLTable } from '../../components/pl/PLTable';
import { UserRole } from '../../types';
import { ArrowLeft, Download, Filter, Calendar, Loader2 } from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

export const AgentPLReport: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<PLReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      const fetchData = async () => {
          if (user) {
              setLoading(true);
              try {
                // Agent only sees their own data
                const result = await plReportService.generateReport(UserRole.AGENT, user.id, dateFrom, dateTo);
                setData(result);
              } catch (err) {
                  console.error("Failed to load PL Report", err);
              } finally {
                  setLoading(false);
              }
          }
      };
      fetchData();
  }, [dateFrom, dateTo, user]);

  const handleExportPDF = () => {
      if (!data) return;
      const doc = new jsPDF();
      doc.text("My Business Performance Report", 14, 15);
      doc.setFontSize(10);
      doc.text(`Period: ${dateFrom} to ${dateTo}`, 14, 22);

      autoTable(doc, {
          startY: 35,
          head: [['Date', 'Ref', 'Client', 'Revenue', 'Cost', 'Profit']],
          body: data.transactions.map(t => [
              new Date(t.date).toLocaleDateString(),
              t.referenceRef,
              t.agentName, // In agent view, this might be redundant or client name if available
              t.income.toLocaleString(),
              t.cogs.toLocaleString(),
              t.grossProfit.toLocaleString()
          ]),
          foot: [['Total', '', '', data.summary.totalRevenue.toLocaleString(), data.summary.totalCost.toLocaleString(), data.summary.grossProfit.toLocaleString()]]
      });
      doc.save(`Agent_PL_${dateFrom}.pdf`);
  };

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8">
        <button onClick={() => navigate('/agent/dashboard')} className="flex items-center text-slate-500 hover:text-slate-800 mb-6">
            <ArrowLeft size={18} className="mr-1" /> Back to Dashboard
        </button>

        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Financial Reports</h1>
                <p className="text-slate-500">Track your earnings, margins, and business growth.</p>
            </div>
            <button 
                onClick={handleExportPDF} 
                disabled={!data || loading}
                className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 transition disabled:opacity-50"
            >
                <Download size={16} /> Download Report
            </button>
        </div>

        {/* Date Filter */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
            <div className="flex flex-col md:flex-row gap-6 items-end">
                <div className="flex-1 w-full">
                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                        <Calendar size={16} /> Reporting Period
                    </label>
                    <div className="flex gap-2">
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="flex-1 border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="flex-1 border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                    </div>
                </div>
                <div>
                    <button className="h-[42px] px-6 bg-brand-600 text-white rounded-lg font-bold hover:bg-brand-700 flex items-center gap-2 text-sm transition shadow-sm">
                        <Filter size={16} /> Refresh Data
                    </button>
                </div>
            </div>
        </div>

        {loading ? (
            <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center">
                <Loader2 size={32} className="animate-spin mb-2 text-brand-600"/>
                <p>Calculating Financials...</p>
            </div>
        ) : !data ? (
            <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
                No data available for this period.
            </div>
        ) : (
            <div className="space-y-8 animate-in fade-in">
                <PLSummaryCards data={data.summary} />
                <PLCharts trends={data.trends} />
                <PLTable transactions={data.transactions} />
            </div>
        )}
    </div>
  );
};
