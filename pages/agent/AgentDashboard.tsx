

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { agentService } from '../../services/agentService';
import { adminService } from '../../services/adminService';
import { Plus, FileText, CheckCircle, Clock, DollarSign, ChevronRight, Map, Palette, TrendingUp, Book, Loader2, Package, Layout, FileCheck, Wallet } from 'lucide-react';
import { Quote, FixedPackage } from '../../types';

export const AgentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
      totalQuotes: 0,
      activeQuotes: 0,
      confirmedQuotes: 0,
      totalRevenue: 0,
      conversionRate: 0
  });
  const [recentQuotes, setRecentQuotes] = useState<Quote[]>([]);
  const [featuredPackages, setFeaturedPackages] = useState<FixedPackage[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
      if (user) {
          const loadData = async () => {
              try {
                  const s = await agentService.getStats(user.id);
                  setStats(s);
                  const q = await agentService.fetchQuotes(user.id);
                  setRecentQuotes(q.slice(0, 5));
                  
                  // Load featured packages
                  const pkgs = await adminService.getFixedPackages();
                  setFeaturedPackages(pkgs.filter(p => p.isActive).slice(0, 3));
              } finally {
                  setLoading(false);
              }
          };
          loadData();
      }
  }, [user]);

  if (!user) return null;

  if (loading) {
      return (
          <div className="flex h-screen items-center justify-center">
              <Loader2 className="animate-spin text-brand-600" size={32} />
          </div>
      );
  }

  const StatCard = ({ label, value, subtext, icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
        {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
      </div>
      <div className={`p-3 rounded-lg ${color} text-white shadow-sm`}>
        {icon}
      </div>
    </div>
  );

  const walletBalance = user.walletBalance || 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col xl:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agent Dashboard</h1>
          <p className="text-slate-500">Welcome back, {user.name} ({user.companyName})</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/agent/quotes" className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition flex items-center gap-2 shadow-sm">
             <FileText size={18} /> My Quotes
          </Link>
          <Link to="/agent/branding" className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition flex items-center gap-2 shadow-sm">
             <Palette size={18} /> Branding Settings
          </Link>
          <Link to="/agent/builder" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition flex items-center gap-2 shadow-sm shadow-purple-200">
             <Map size={18} /> Itinerary Builder
          </Link>
          <Link to="/agent/create" className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium transition flex items-center gap-2 shadow-sm shadow-brand-200">
            <Plus size={18} /> Create Quote
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard 
          label="Total Quotes" 
          value={stats.totalQuotes} 
          subtext="Lifetime generated" 
          icon={<FileText size={24} />} 
          color="bg-blue-500" 
        />
        <StatCard 
          label="Active Inquiries" 
          value={stats.activeQuotes} 
          subtext="Pending confirmation" 
          icon={<Clock size={24} />} 
          color="bg-amber-500" 
        />
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-start justify-between relative overflow-hidden group">
            <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Wallet Balance</p>
                <h3 className="text-2xl font-bold text-slate-900">₹ {walletBalance.toLocaleString()}</h3>
                <Link to="/agent/wallet" className="text-xs text-brand-600 font-bold mt-1 flex items-center gap-1 hover:underline">
                    Add Funds <ChevronRight size={10} />
                </Link>
            </div>
            <div className="p-3 rounded-lg bg-emerald-500 text-white shadow-sm">
                <Wallet size={24} />
            </div>
        </div>
        <StatCard 
          label="Total Sales Value" 
          value={`$${stats.totalRevenue.toLocaleString()}`} 
          subtext="Gross Selling Price" 
          icon={<DollarSign size={24} />} 
          color="bg-purple-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Column: Activity */}
          <div className="lg:col-span-2 space-y-8">
              
              {/* Recent Activity Table */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h2 className="font-bold text-slate-800">Recent Quotations</h2>
                  <Link to="/agent/quotes" className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
                    View Full History <ChevronRight size={16} />
                  </Link>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-3 font-semibold">Ref No</th>
                        <th className="px-6 py-3 font-semibold">Destination</th>
                        <th className="px-6 py-3 font-semibold">Status</th>
                        <th className="px-6 py-3 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {recentQuotes.map((quote) => (
                        <tr key={quote.id} className="hover:bg-slate-50 transition">
                          <td className="px-6 py-4 font-mono text-slate-600">{quote.uniqueRefNo}</td>
                          <td className="px-6 py-4 font-medium text-slate-900">{quote.destination}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              quote.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                              quote.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {quote.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Link to={`/quote/${quote.id}`} className="text-brand-600 hover:text-brand-800 font-medium">
                              Open
                            </Link>
                          </td>
                        </tr>
                      ))}
                      {recentQuotes.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                            No quotes generated yet. <Link to="/agent/create" className="text-brand-600 hover:underline">Create your first one.</Link>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Featured Packages (New) */}
              {featuredPackages.length > 0 && (
                  <div>
                      <div className="flex justify-between items-center mb-4">
                          <h2 className="font-bold text-slate-800">Available Group Departures</h2>
                          <Link to="/agent/packages" className="text-sm text-brand-600 hover:text-brand-700 font-medium">View All</Link>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {featuredPackages.map(pkg => (
                              <Link key={pkg.id} to="/agent/packages" className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition group">
                                  <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-500">
                                      <Package size={14} className="text-brand-600" /> FIXED DEPARTURE
                                  </div>
                                  <h3 className="font-bold text-slate-900 mb-1 group-hover:text-brand-600 transition">{pkg.packageName}</h3>
                                  <p className="text-sm text-slate-500 mb-3">{pkg.nights} Nights</p>
                                  <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                                      <span className="font-mono font-bold text-slate-800">₹ {pkg.fixedPrice.toLocaleString()}</span>
                                      <span className="text-xs text-brand-600 font-bold flex items-center gap-1">Details <ChevronRight size={12}/></span>
                                  </div>
                              </Link>
                          ))}
                      </div>
                  </div>
              )}
          </div>

          {/* Right Column: Quick Actions */}
          <div className="space-y-6">
              <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg">
                  <h3 className="font-bold text-lg mb-4">Quick Tools</h3>
                  <div className="space-y-3">
                      <Link to="/agent/templates" className="flex items-center justify-between p-3 bg-white/10 rounded-lg hover:bg-white/20 transition">
                          <span className="flex items-center gap-3">
                              <Layout size={18} /> Browse Templates
                          </span>
                          <ChevronRight size={16} className="opacity-50" />
                      </Link>
                      <Link to="/agent/packages" className="flex items-center justify-between p-3 bg-white/10 rounded-lg hover:bg-white/20 transition">
                          <span className="flex items-center gap-3">
                              <Package size={18} /> Fixed Packages
                          </span>
                          <ChevronRight size={16} className="opacity-50" />
                      </Link>
                      <Link to="/agent/visa" className="flex items-center justify-between p-3 bg-white/10 rounded-lg hover:bg-white/20 transition">
                          <span className="flex items-center gap-3">
                              <FileCheck size={18} /> Check Visa Req.
                          </span>
                          <ChevronRight size={16} className="opacity-50" />
                      </Link>
                      <Link to="/agent/reports" className="flex items-center justify-between p-3 bg-white/10 rounded-lg hover:bg-white/20 transition">
                          <span className="flex items-center gap-3">
                              <TrendingUp size={18} /> P&L Reports
                          </span>
                          <ChevronRight size={16} className="opacity-50" />
                      </Link>
                  </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-4">Support & Help</h3>
                  <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-3 text-slate-600">
                          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                              <Book size={16} />
                          </div>
                          <Link to="/agent/guidebook" className="hover:text-brand-600 hover:underline">Platform Guide Book</Link>
                      </div>
                      <div className="text-xs text-slate-400 mt-4 pt-4 border-t border-slate-100">
                          Need urgent help? Call +91 9696 777 391
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};
