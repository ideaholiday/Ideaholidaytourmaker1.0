
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { agentService } from '../../services/agentService';
import { Plus, FileText, CheckCircle, Clock, DollarSign, ChevronRight, Map, Palette, TrendingUp, Book } from 'lucide-react';

export const AgentDashboard: React.FC = () => {
  const { user } = useAuth();
  
  if (!user) return null;

  const stats = agentService.getStats(user.id);
  const recentQuotes = agentService.getQuotes(user.id).slice(0, 5); // Last 5

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
          <Link to="/agent/reports" className="hidden md:flex px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition items-center gap-2 shadow-sm">
             <TrendingUp size={18} /> Reports
          </Link>
          <Link to="/agent/guidebook" className="hidden md:flex px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition items-center gap-2 shadow-sm">
             <Book size={18} /> Guide
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
        <StatCard 
          label="Confirmed Trips" 
          value={stats.confirmedQuotes} 
          subtext={`Conversion Rate: ${stats.conversionRate}%`} 
          icon={<CheckCircle size={24} />} 
          color="bg-green-500" 
        />
        <StatCard 
          label="Total Sales Value" 
          value={`$${stats.totalRevenue.toLocaleString()}`} 
          subtext="Gross Selling Price" 
          icon={<DollarSign size={24} />} 
          color="bg-purple-500" 
        />
      </div>

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
                <th className="px-6 py-3 font-semibold">Travel Date</th>
                <th className="px-6 py-3 font-semibold">Pax</th>
                <th className="px-6 py-3 font-semibold">Total Price</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recentQuotes.map((quote) => (
                <tr key={quote.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 font-mono text-slate-600">{quote.uniqueRefNo}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">{quote.destination}</td>
                  <td className="px-6 py-4 text-slate-600">{quote.travelDate || 'TBD'}</td>
                  <td className="px-6 py-4 text-slate-600">{quote.paxCount}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">
                    {quote.price ? `${quote.currency} ${quote.price.toLocaleString()}` : <span className="text-slate-400 italic">Calculating...</span>}
                  </td>
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
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    No quotes generated yet. <Link to="/agent/create" className="text-brand-600 hover:underline">Create your first one.</Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
