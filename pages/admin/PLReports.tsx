
import React, { useState, useEffect } from 'react';
import { plReportService } from '../../services/plReportService';
import { adminService } from '../../services/adminService'; // For agent list
import { useAuth } from '../../context/AuthContext';
import { PLSummaryCards } from '../../components/pl/PLSummaryCards';
import { PLCharts } from '../../components/pl/PLCharts';
import { PLTable } from '../../components/pl/PLTable';
import { UserRole } from '../../types';
import { Calendar, Filter, Users, Download } from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

export const PLReports: React.FC = () => {
  const { user } = useAuth();
  
  // Date State
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  
  // Filters
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [agents, setAgents] = useState(adminService.getUsers().filter(u => u.role === UserRole.AGENT));

  // Data State
  const [data, setData] = useState(plReportService.generateReport(UserRole.ADMIN, user?.id || '', dateFrom, dateTo));

  useEffect(() => {
      if (user) {
          const report = plReportService.generateReport(UserRole.ADMIN, user.id, dateFrom, dateTo, { agentId: selectedAgent || undefined });
          setData(report);
      }
  }, [dateFrom, dateTo, selectedAgent, user]);

  const handleExportPDF = () => {
      const doc = new jsPDF();
      doc.text("Profit & Loss Report", 14, 15);
      doc.setFontSize(10);
      doc.text(`Period: ${dateFrom} to ${dateTo}`, 14, 22);
      if (selectedAgent) {
          const agentName = agents.find(a => a.id === selectedAgent)?.name;
          doc.text(`Agent: ${agentName}`, 14, 28);
      }

      autoTable(doc, {
          startY: 35,
          head: [['Date', 'Ref', 'Agent', 'Revenue', 'Cost', 'Profit']],
          body: data.transactions.map(t => [
              new Date(t.date).toLocaleDateString(),
              t.referenceRef,
              t.agentName,
              t.income.toLocaleString(),
              t.cogs.toLocaleString(),
              t.grossProfit.toLocaleString()
          ]),
          foot: [['Total', '', '', data.summary.totalRevenue.toLocaleString(), data.summary.totalCost.toLocaleString(), data.summary.grossProfit.toLocaleString()]]
      });

      doc.save(`PL_Report_${dateFrom}_${dateTo}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            P&L Intelligence
          </h1>
          <p className="text-slate-500">Platform financial performance & profitability analysis.</p>
        </div>
        <button onClick={handleExportPDF} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-900 transition">
            <Download size={16} /> Export Report
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
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
            <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <Users size={16} /> Filter by Agent
                </label>
                <select value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)} className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white">
                    <option value="">All Agents</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.name} ({a.companyName})</option>)}
                </select>
            </div>
            <div>
                <button className="h-[42px] px-4 bg-brand-600 text-white rounded-lg hover:bg-brand-700 flex items-center gap-2 text-sm font-medium transition shadow-sm">
                    <Filter size={16} /> Update View
                </button>
            </div>
        </div>
      </div>

      <PLSummaryCards data={data.summary} />
      
      <PLCharts trends={data.trends} byDestination={data.byDestination} />
      
      <PLTable transactions={data.transactions} />
    </div>
  );
};
