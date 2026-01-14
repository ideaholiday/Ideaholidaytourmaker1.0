
import React, { useState, useEffect } from 'react';
import { plReportService } from '../../services/plReportService';
import { useAuth } from '../../context/AuthContext';
import { PLSummaryCards } from '../../components/pl/PLSummaryCards';
import { PLCharts } from '../../components/pl/PLCharts';
import { PLTable } from '../../components/pl/PLTable';
import { UserRole } from '../../types';
import { Calendar, Download, TrendingUp, DollarSign, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AgentPLReport: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]); // Current Year Start
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  
  const [data, setData] = useState<any>(null);

  useEffect(() => {
      if (user) {
          const report = plReportService.generateReport(UserRole.AGENT, user.id, dateFrom, dateTo);
          setData(report);
      }
  }, [dateFrom, dateTo, user]);

  if (!data) return <div className="p-8">Loading Financials...</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <button onClick={() => navigate('/agent/dashboard')} className="flex items-center text-slate-500 hover:text-slate-800 mb-6">
        <ArrowLeft size={18} className="mr-1" /> Back to Dashboard
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="text-emerald-600" /> Profit & Sales Report
          </h1>
          <p className="text-slate-500">Analyze your bookings, revenue, and net earnings.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
            <Calendar size={16} className="text-slate-400 ml-2" />
            <input 
                type="date" 
                value={dateFrom} 
                onChange={e => setDateFrom(e.target.value)} 
                className="text-sm border-none outline-none text-slate-600"
            />
            <span className="text-slate-300">-</span>
            <input 
                type="date" 
                value={dateTo} 
                onChange={e => setDateTo(e.target.value)} 
                className="text-sm border-none outline-none text-slate-600"
            />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase">Total Sales Value</p>
              <h3 className="text-2xl font-bold text-blue-600 mt-2">
                  {(user?.agentBranding?.primaryColor || '#000000').substring(0,0)} 
                  {/* Just using currency symbol from data if available or default */}
                  $ {data.summary.totalRevenue.toLocaleString()}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Gross Client Billing</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase">Net Payable to Platform</p>
              <h3 className="text-2xl font-bold text-slate-700 mt-2">
                  $ {data.summary.totalCost.toLocaleString()}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Cost of Services</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-emerald-100 shadow-sm bg-emerald-50/50">
              <p className="text-xs font-bold text-emerald-700 uppercase">Net Earnings (Markup)</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-2 flex items-center gap-2">
                  <TrendingUp size={20} />
                  $ {data.summary.grossProfit.toLocaleString()}
              </h3>
              <p className="text-xs text-emerald-600/80 mt-1">Your Retained Profit</p>
          </div>
      </div>

      <PLCharts trends={data.trends} />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800">Booking Financials</h3>
          </div>
          <PLTable transactions={data.transactions} />
      </div>
    </div>
  );
};
