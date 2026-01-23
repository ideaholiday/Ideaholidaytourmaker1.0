
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { opsDashboardService } from '../../services/opsDashboardService';
import { SystemAlertsWidget } from '../../components/ops/SystemAlertsWidget';
import { PendingApprovalsWidget } from '../../components/ops/PendingApprovalsWidget';
import { ExpiringRatesWidget } from '../../components/ops/ExpiringRatesWidget';
import { Activity, Bell, CheckCircle, AlertTriangle, RefreshCw, Clock, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const OpsDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(opsDashboardService.getOverviewStats());
  const [pendingItems, setPendingItems] = useState(opsDashboardService.getPendingInventory());
  const [expiringRates, setExpiringRates] = useState(opsDashboardService.getExpiringRates());
  const [alerts, setAlerts] = useState(opsDashboardService.getSystemAlerts());
  const [isLoading, setIsLoading] = useState(false);

  const refreshData = () => {
      setIsLoading(true);
      setTimeout(() => {
        setStats(opsDashboardService.getOverviewStats());
        setPendingItems(opsDashboardService.getPendingInventory());
        setExpiringRates(opsDashboardService.getExpiringRates());
        setAlerts(opsDashboardService.getSystemAlerts());
        setIsLoading(false);
      }, 500);
  };

  useEffect(() => {
    refreshData();
  }, []);

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="text-brand-600" /> Operations Center
          </h1>
          <p className="text-slate-500">Monitor health, approvals, and inventory risks.</p>
        </div>
        <button 
            onClick={refreshData} 
            className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-brand-600 rounded-lg shadow-sm transition"
            title="Refresh Dashboard"
        >
            <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
              <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Pending Approval</p>
                  <h3 className="text-2xl font-bold text-amber-600 mt-1">{stats.pendingInventory}</h3>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-lg"><Clock size={24}/></div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
              <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Expiring Rates</p>
                  <h3 className="text-2xl font-bold text-red-600 mt-1">{stats.expiringRates}</h3>
              </div>
              <div className="p-3 bg-red-50 text-red-600 rounded-lg"><AlertTriangle size={24}/></div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
              <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Rejected Items</p>
                  <h3 className="text-2xl font-bold text-slate-600 mt-1">{stats.rejectedItems}</h3>
              </div>
              <div className="p-3 bg-slate-100 text-slate-500 rounded-lg"><XCircle size={24}/></div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
              <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">System Alerts</p>
                  <h3 className="text-2xl font-bold text-blue-600 mt-1">{alerts.length}</h3>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Bell size={24}/></div>
          </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Alerts & Quick Actions */}
          <div className="space-y-6">
              <SystemAlertsWidget alerts={alerts} />
              
              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                  <h3 className="font-bold text-slate-800 mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                      <Link to="/admin/approvals" className="block w-full text-left px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-lg text-sm font-medium text-slate-700 transition">
                          Review All Pending
                      </Link>
                      <Link to="/admin/hotels" className="block w-full text-left px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-lg text-sm font-medium text-slate-700 transition">
                          Update Hotel Rates
                      </Link>
                      <button className="block w-full text-left px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-lg text-sm font-medium text-slate-700 transition">
                          Download Audit Report
                      </button>
                  </div>
              </div>
          </div>

          {/* Middle: Pending Approvals */}
          <div className="lg:col-span-1 h-[500px]">
              <PendingApprovalsWidget items={pendingItems} />
          </div>

          {/* Right: Expiring Rates */}
          <div className="lg:col-span-1 h-[500px]">
              <ExpiringRatesWidget rates={expiringRates} />
          </div>
      </div>
    </div>
  );
};