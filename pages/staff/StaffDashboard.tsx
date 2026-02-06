
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { bookingService } from '../../services/bookingService';
import { Booking } from '../../types';
import { 
  ClipboardList, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Plane, 
  ArrowRight,
  Search,
  Plus,
  Filter,
  DollarSign,
  User,
  MapPin,
  Loader2
} from 'lucide-react';

export const StaffDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'REQUESTS' | 'OPERATIONS' | 'ISSUES'>('REQUESTS');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
        try {
            setLoading(true);
            const data = await bookingService.getAllBookings();
            if (data) {
                // Sort by creation date descending
                data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setBookings(data);
            }
        } catch (err: any) {
            console.error("Staff Dashboard Data Load Error:", err);
            setError("Failed to load dashboard data. Please try refreshing.");
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, []);

  if (!user) return null;

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <Loader2 className="w-10 h-10 text-brand-600 animate-spin mb-4" />
              <p className="text-slate-500 font-medium">Loading Operations Console...</p>
          </div>
      );
  }

  if (error) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
              <h3 className="text-lg font-bold text-slate-900">System Error</h3>
              <p className="text-slate-500 mb-4">{error}</p>
              <button 
                  onClick={() => window.location.reload()} 
                  className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
              >
                  Refresh Page
              </button>
          </div>
      );
  }

  // --- KPI CALCULATIONS ---
  const safeBookings = bookings || [];
  
  const pendingRequests = safeBookings.filter(b => b.status === 'REQUESTED');
  const cancellationRequests = safeBookings.filter(b => b.status === 'CANCELLATION_REQUESTED');
  
  const today = new Date();
  
  const upcomingDepartures = safeBookings.filter(b => {
      if (b.status === 'CANCELLED_NO_REFUND' || b.status === 'CANCELLED_WITH_REFUND' || b.status === 'REJECTED') return false;
      const travelDate = new Date(b.travelDate);
      const diff = travelDate.getTime() - today.getTime();
      const days = Math.ceil(diff / (1000 * 3600 * 24));
      return days >= 0 && days <= 7; // Next 7 days
  }).sort((a, b) => new Date(a.travelDate).getTime() - new Date(b.travelDate).getTime());

  const activeOperations = safeBookings.filter(b => b.status === 'IN_PROGRESS');

  // Identify Payment Risks (Balance due and travel within 15 days)
  const paymentRisks = safeBookings.filter(b => {
      if (b.balanceAmount <= 0) return false;
      if ((b.status || '').includes('CANCEL')) return false;
      const travelDate = new Date(b.travelDate);
      const diff = travelDate.getTime() - today.getTime();
      const days = Math.ceil(diff / (1000 * 3600 * 24));
      return days >= 0 && days <= 15; 
  });

  // --- FILTERED LIST FOR TABS ---
  const getTabList = () => {
      let list: Booking[] = [];
      
      if (activeTab === 'REQUESTS') {
          list = pendingRequests;
      } else if (activeTab === 'ISSUES') {
          list = [...cancellationRequests, ...paymentRisks]; 
          // Dedup
          const ids = new Set();
          list = list.filter(b => {
              if (ids.has(b.id)) return false;
              ids.add(b.id);
              return true;
          });
      } else if (activeTab === 'OPERATIONS') {
           list = [...activeOperations, ...upcomingDepartures];
           const ids = new Set();
           list = list.filter(b => {
               if (ids.has(b.id)) return false;
               ids.add(b.id);
               return true;
           });
           list.sort((a, b) => new Date(a.travelDate).getTime() - new Date(b.travelDate).getTime());
      }

      // Apply Search
      if (searchTerm) {
          const lower = searchTerm.toLowerCase();
          list = list.filter(b => 
            (b.uniqueRefNo?.toLowerCase() || '').includes(lower) ||
            (b.destination?.toLowerCase() || '').includes(lower) ||
            (b.agentName?.toLowerCase() || '').includes(lower) ||
            (b.travelers?.[0]?.firstName?.toLowerCase() || '').includes(lower) ||
            (b.travelers?.[0]?.lastName?.toLowerCase() || '').includes(lower)
          );
      }
      
      return list;
  };

  const displayedBookings = getTabList();

  const StatCard = ({ title, count, color, icon, onClick, subtext }: any) => (
    <div 
      onClick={onClick}
      className={`p-6 rounded-2xl border cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 relative overflow-hidden group ${
        color === 'amber' ? 'bg-amber-50 border-amber-200 text-amber-900' :
        color === 'red' ? 'bg-red-50 border-red-200 text-red-900' :
        color === 'blue' ? 'bg-blue-50 border-blue-200 text-blue-900' :
        'bg-green-50 border-green-200 text-green-900'
      }`}
    >
      <div className="relative z-10 flex justify-between items-start">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">{title}</p>
          <h3 className="text-4xl font-extrabold">{count}</h3>
          {subtext && <p className="text-xs mt-2 font-medium opacity-80">{subtext}</p>}
        </div>
        <div className={`p-3 rounded-xl bg-white/60 shadow-sm group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-12">
      
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="bg-brand-100 p-3 rounded-xl text-brand-600 hidden sm:block">
                <ClipboardList size={32} />
            </div>
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Operations Console</h1>
                <p className="text-slate-500 text-sm">Manage tasks, approvals, and logistics.</p>
            </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative flex-1 sm:w-64">
                <Search size={18} className="absolute left-3 top-3 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Search bookings, agents..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-sm transition shadow-sm"
                />
            </div>
            <Link 
              to="/agent/create" 
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition shadow-lg transform hover:-translate-y-0.5"
            >
                <Plus size={18} /> New Quote
            </Link>
        </div>
      </div>

      {/* KPI ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Pending Requests" 
          count={pendingRequests.length} 
          color="amber"
          subtext="Requires Approval"
          icon={<Clock size={28} className="text-amber-600" />}
          onClick={() => setActiveTab('REQUESTS')}
        />
        <StatCard 
          title="Urgent Issues" 
          count={cancellationRequests.length + paymentRisks.length} 
          color="red" 
          subtext="Cancel / Payment Risk"
          icon={<AlertTriangle size={28} className="text-red-600" />}
          onClick={() => setActiveTab('ISSUES')}
        />
        <StatCard 
          title="Departing (7 Days)" 
          count={upcomingDepartures.length} 
          color="blue" 
          subtext="Operations Check"
          icon={<Plane size={28} className="text-blue-600" />}
          onClick={() => setActiveTab('OPERATIONS')}
        />
        <StatCard 
          title="Active On-Trip" 
          count={activeOperations.length} 
          color="green" 
          subtext="Monitor Status"
          icon={<CheckCircle size={28} className="text-green-600" />}
          onClick={() => setActiveTab('OPERATIONS')}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* MAIN COLUMN: TASK LIST */}
          <div className="xl:col-span-2 space-y-6">
              
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px] flex flex-col">
                  {/* Tabs */}
                  <div className="flex border-b border-slate-200 overflow-x-auto">
                      <button 
                        onClick={() => setActiveTab('REQUESTS')}
                        className={`flex-1 py-4 px-4 text-sm font-bold flex items-center justify-center gap-2 transition border-b-2 whitespace-nowrap ${activeTab === 'REQUESTS' ? 'border-amber-500 text-amber-700 bg-amber-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                      >
                          <Clock size={16} /> New Requests ({pendingRequests.length})
                      </button>
                      <button 
                        onClick={() => setActiveTab('OPERATIONS')}
                        className={`flex-1 py-4 px-4 text-sm font-bold flex items-center justify-center gap-2 transition border-b-2 whitespace-nowrap ${activeTab === 'OPERATIONS' ? 'border-blue-500 text-blue-700 bg-blue-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                      >
                          <Plane size={16} /> Operations ({upcomingDepartures.length + activeOperations.length})
                      </button>
                      <button 
                        onClick={() => setActiveTab('ISSUES')}
                        className={`flex-1 py-4 px-4 text-sm font-bold flex items-center justify-center gap-2 transition border-b-2 whitespace-nowrap ${activeTab === 'ISSUES' ? 'border-red-500 text-red-700 bg-red-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                      >
                          <AlertTriangle size={16} /> Issues ({cancellationRequests.length + paymentRisks.length})
                      </button>
                  </div>

                  {/* List Content */}
                  <div className="flex-1 overflow-y-auto max-h-[600px] p-2">
                      {displayedBookings.length > 0 ? (
                          <div className="space-y-3 p-2">
                              {displayedBookings.map(b => {
                                  const isCancel = b.status === 'CANCELLATION_REQUESTED';
                                  const isPayRisk = b.paymentStatus !== 'PAID_IN_FULL' && new Date(b.travelDate).getTime() - Date.now() < 15 * 86400000 && !isCancel;
                                  
                                  return (
                                      <div 
                                        key={b.id} 
                                        onClick={() => navigate(`/booking/${b.id}`)}
                                        className={`bg-white border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition hover:shadow-md group ${
                                            isCancel ? 'border-red-200 bg-red-50/30' : 
                                            isPayRisk ? 'border-orange-200 bg-orange-50/30' : 
                                            'border-slate-200 hover:border-brand-200'
                                        }`}
                                      >
                                          <div className="flex items-start gap-4">
                                              <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center shrink-0 border ${
                                                  isCancel ? 'bg-red-100 text-red-700 border-red-200' : 
                                                  'bg-slate-100 text-slate-600 border-slate-200'
                                              }`}>
                                                  <span className="text-[10px] font-bold uppercase">{new Date(b.travelDate).toLocaleDateString(undefined, {month:'short'})}</span>
                                                  <span className="text-lg font-bold leading-none">{new Date(b.travelDate).getDate()}</span>
                                              </div>
                                              <div>
                                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                      <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{b.uniqueRefNo}</span>
                                                      {isCancel && <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Cancellation Req</span>}
                                                      {isPayRisk && <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Payment Due</span>}
                                                      {b.status === 'REQUESTED' && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">New Request</span>}
                                                      {b.status === 'IN_PROGRESS' && <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">On Trip</span>}
                                                  </div>
                                                  <h4 className="font-bold text-slate-900 text-sm">{b.destination}</h4>
                                                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                                      <span className="flex items-center gap-1"><User size={10}/> {b.paxCount} Pax</span>
                                                      <span className="flex items-center gap-1"><DollarSign size={10}/> {b.currency} {b.sellingPrice.toLocaleString()}</span>
                                                      <span>Agent: <strong>{b.agentName}</strong></span>
                                                  </div>
                                              </div>
                                          </div>

                                          <div className="flex items-center gap-3">
                                              <span className="text-xs font-bold text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">View Details</span>
                                              <button className="p-2 rounded-lg bg-slate-100 text-slate-500 group-hover:bg-brand-600 group-hover:text-white transition">
                                                  <ArrowRight size={18} />
                                              </button>
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      ) : (
                          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
                              <ClipboardList size={48} className="mb-4 opacity-20" />
                              <p>No items found for this category.</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>

          {/* SIDEBAR: INFO & ALERTS */}
          <div className="xl:col-span-1 space-y-6">
              
              {/* Payment Risk Summary */}
              {paymentRisks.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 shadow-sm">
                      <h3 className="font-bold text-orange-900 mb-3 flex items-center gap-2">
                          <DollarSign size={18} /> Financial Alerts
                      </h3>
                      <div className="space-y-3">
                          {paymentRisks.slice(0, 3).map(b => (
                              <div key={b.id} className="bg-white p-3 rounded-lg border border-orange-100 shadow-sm flex justify-between items-center cursor-pointer hover:shadow-md transition" onClick={() => navigate(`/booking/${b.id}`)}>
                                  <div>
                                      <div className="text-xs font-bold text-orange-800">{b.uniqueRefNo}</div>
                                      <div className="text-[10px] text-slate-500">Bal: {b.currency} {b.balanceAmount.toLocaleString()}</div>
                                  </div>
                                  <div className="text-right">
                                      <div className="text-[10px] text-slate-400 uppercase font-bold">Travel In</div>
                                      <div className="text-xs font-bold text-orange-700">
                                          {Math.ceil((new Date(b.travelDate).getTime() - Date.now()) / (1000 * 3600 * 24))} Days
                                      </div>
                                  </div>
                              </div>
                          ))}
                          {paymentRisks.length > 3 && (
                              <button onClick={() => setActiveTab('ISSUES')} className="w-full text-center text-xs font-bold text-orange-700 hover:underline">
                                  View all {paymentRisks.length} alerts
                              </button>
                          )}
                      </div>
                  </div>
              )}

              {/* Upcoming Departures Mini List */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                          <Calendar size={18} className="text-blue-600" /> Upcoming Departures
                      </h3>
                  </div>
                  <div className="p-0">
                      {upcomingDepartures.length > 0 ? (
                          <div className="divide-y divide-slate-50">
                              {upcomingDepartures.slice(0, 5).map(b => (
                                  <div key={b.id} className="p-4 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition" onClick={() => navigate(`/booking/${b.id}`)}>
                                      <div className="flex-1 min-w-0">
                                          <div className="flex justify-between mb-0.5">
                                              <span className="font-bold text-slate-800 text-sm truncate">{b.destination}</span>
                                              <span className="text-xs font-medium text-slate-500">{new Date(b.travelDate).toLocaleDateString()}</span>
                                          </div>
                                          <p className="text-xs text-slate-400 truncate">
                                              {b.agentName} • {b.paxCount} Pax
                                          </p>
                                      </div>
                                      <ArrowRight size={14} className="text-slate-300" />
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <div className="p-6 text-center text-slate-400 text-xs">
                              No immediate departures.
                          </div>
                      )}
                  </div>
              </div>

              {/* Quick Links */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-lg p-6 text-white">
                  <h3 className="font-bold text-lg mb-4">Quick Access</h3>
                  <div className="space-y-2">
                      <Link to="/admin/hotels" className="block p-3 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition flex items-center justify-between">
                          <span className="flex items-center gap-2"><MapPin size={16}/> Hotel Inventory</span>
                          <ArrowRight size={14} className="opacity-50" />
                      </Link>
                      <Link to="/admin/suppliers" className="block p-3 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition flex items-center justify-between">
                          <span className="flex items-center gap-2"><User size={16}/> Supplier Directory</span>
                          <ArrowRight size={14} className="opacity-50" />
                      </Link>
                      <Link to="/admin/approvals" className="block p-3 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition flex items-center justify-between">
                          <span className="flex items-center gap-2"><CheckCircle size={16}/> Pending Inventory</span>
                          <ArrowRight size={14} className="opacity-50" />
                      </Link>
                  </div>
              </div>

          </div>
      </div>
    </div>
  );
};
