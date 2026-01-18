
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
  Plus
} from 'lucide-react';

export const StaffDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Load all bookings for operational view
    setBookings(bookingService.getAllBookings());
  }, []);

  if (!user) return null;

  // --- KPI CALCULATIONS ---
  const pendingRequests = bookings.filter(b => b.status === 'REQUESTED');
  const cancellationRequests = bookings.filter(b => b.status === 'CANCELLATION_REQUESTED');
  
  const today = new Date().toISOString().split('T')[0];
  const upcomingDepartures = bookings.filter(b => {
      if (b.status === 'CANCELLED_NO_REFUND' || b.status === 'CANCELLED_WITH_REFUND') return false;
      const travelDate = b.travelDate;
      // Check if travel date is today or in next 3 days
      const diff = new Date(travelDate).getTime() - new Date(today).getTime();
      const days = Math.ceil(diff / (1000 * 3600 * 24));
      return days >= 0 && days <= 3;
  }).sort((a, b) => new Date(a.travelDate).getTime() - new Date(b.travelDate).getTime());

  const activeOperations = bookings.filter(b => b.status === 'IN_PROGRESS');

  const StatCard = ({ title, count, color, icon, onClick }: any) => (
    <div 
      onClick={onClick}
      className={`p-5 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
        color === 'amber' ? 'bg-amber-50 border-amber-200 text-amber-800' :
        color === 'red' ? 'bg-red-50 border-red-200 text-red-800' :
        color === 'blue' ? 'bg-blue-50 border-blue-200 text-blue-800' :
        'bg-white border-slate-200 text-slate-800'
      }`}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider opacity-70">{title}</p>
          <h3 className="text-3xl font-bold mt-1">{count}</h3>
        </div>
        <div className={`p-2 rounded-lg bg-white/50 shadow-sm`}>
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="text-brand-600" /> Staff Operations Console
          </h1>
          <p className="text-slate-500">Overview of pending tasks and daily operations.</p>
        </div>
        
        <div className="flex gap-3">
            <Link 
              to="/admin/bookings" 
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition shadow-sm"
            >
                <Search size={18} /> Find Booking
            </Link>
            <Link 
              to="/agent/create" // Staff can use agent tools to create quotes on behalf
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg font-bold hover:bg-brand-700 transition shadow-md"
            >
                <Plus size={18} /> Create Quote
            </Link>
        </div>
      </div>

      {/* KPI ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="New Requests" 
          count={pendingRequests.length} 
          color={pendingRequests.length > 0 ? "amber" : "slate"} 
          icon={<Clock size={24} className="text-amber-600" />}
          onClick={() => navigate('/admin/bookings?status=REQUESTED')}
        />
        <StatCard 
          title="Cancel Requests" 
          count={cancellationRequests.length} 
          color={cancellationRequests.length > 0 ? "red" : "slate"} 
          icon={<AlertTriangle size={24} className="text-red-600" />}
          onClick={() => navigate('/admin/bookings?status=CANCELLATION_REQUESTED')}
        />
        <StatCard 
          title="Departing Soon" 
          count={upcomingDepartures.length} 
          color="blue" 
          icon={<Plane size={24} className="text-blue-600" />}
          onClick={() => {}} 
        />
        <StatCard 
          title="Active Trips" 
          count={activeOperations.length} 
          color="green" 
          icon={<CheckCircle size={24} className="text-green-600" />}
          onClick={() => navigate('/admin/bookings')}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* MAIN COLUMN: PRIORITY TASKS */}
          <div className="xl:col-span-2 space-y-6">
              
              {/* Pending Bookings List */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                          <Clock size={18} className="text-amber-500" /> Pending Approvals
                      </h3>
                      <span className="text-xs font-medium text-slate-500">{pendingRequests.length} pending</span>
                  </div>
                  
                  {pendingRequests.length > 0 ? (
                      <div className="divide-y divide-slate-100">
                          {pendingRequests.map(b => (
                              <div key={b.id} className="p-4 hover:bg-slate-50 transition flex items-center justify-between group cursor-pointer" onClick={() => navigate(`/admin/bookings`)}>
                                  <div className="flex items-start gap-4">
                                      <div className="bg-amber-100 text-amber-700 p-2 rounded-lg font-bold text-xs text-center w-14">
                                          {new Date(b.createdAt).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                                      </div>
                                      <div>
                                          <h4 className="font-bold text-slate-900 text-sm">New Booking #{b.uniqueRefNo}</h4>
                                          <p className="text-xs text-slate-500 mt-0.5">{b.destination} • {b.agentName}</p>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                      <div className="text-right">
                                          <p className="font-mono text-sm font-bold text-slate-700">{b.currency} {b.sellingPrice.toLocaleString()}</p>
                                          <p className="text-[10px] text-slate-400 uppercase">Value</p>
                                      </div>
                                      <ArrowRight size={16} className="text-slate-300 group-hover:text-brand-500 transition" />
                                  </div>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <div className="p-8 text-center text-slate-400 text-sm italic">
                          No pending booking requests. Good job!
                      </div>
                  )}
              </div>

              {/* Cancellation Queue */}
              {cancellationRequests.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden">
                      <div className="px-6 py-4 border-b border-red-50 bg-red-50 flex justify-between items-center">
                          <h3 className="font-bold text-red-800 flex items-center gap-2">
                              <AlertTriangle size={18} /> Cancellation Review Queue
                          </h3>
                      </div>
                      <div className="divide-y divide-slate-100">
                          {cancellationRequests.map(b => (
                              <div key={b.id} className="p-4 hover:bg-red-50/50 transition flex items-center justify-between cursor-pointer" onClick={() => navigate(`/admin/bookings`)}>
                                  <div>
                                      <h4 className="font-bold text-slate-900 text-sm">Cancel #{b.uniqueRefNo}</h4>
                                      <p className="text-xs text-red-600 mt-0.5">Reason: {b.cancellation?.reason}</p>
                                  </div>
                                  <button className="px-3 py-1.5 bg-white border border-red-200 text-red-700 text-xs font-bold rounded-lg hover:bg-red-50">
                                      Review
                                  </button>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

          </div>

          {/* SIDEBAR: DEPARTURES & ACTIVITY */}
          <div className="xl:col-span-1 space-y-6">
              
              {/* Upcoming Departures */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                          <Calendar size={18} className="text-blue-600" /> Upcoming Departures
                      </h3>
                  </div>
                  <div className="p-2">
                      {upcomingDepartures.length > 0 ? (
                          upcomingDepartures.slice(0, 5).map(b => (
                              <div key={b.id} className="p-3 border-b border-slate-50 last:border-0 flex items-center gap-3">
                                  <div className="bg-blue-50 text-blue-700 w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0">
                                      <span className="text-[10px] font-bold uppercase">{new Date(b.travelDate).toLocaleDateString(undefined, {month:'short'})}</span>
                                      <span className="text-sm font-bold leading-none">{new Date(b.travelDate).getDate()}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <p className="text-sm font-bold text-slate-900 truncate">{b.destination}</p>
                                      <p className="text-xs text-slate-500 truncate">{b.paxCount} Pax • {b.agentName}</p>
                                  </div>
                                  <Link to={`/admin/bookings`} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-100 rounded">
                                      <ArrowRight size={16} />
                                  </Link>
                              </div>
                          ))
                      ) : (
                          <div className="p-6 text-center text-slate-400 text-xs">
                              No immediate departures scheduled.
                          </div>
                      )}
                  </div>
              </div>

              {/* Quick Links */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-lg p-6 text-white">
                  <h3 className="font-bold text-lg mb-4">Quick Shortcuts</h3>
                  <div className="space-y-2">
                      <Link to="/admin/pricing" className="block p-3 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition flex items-center justify-between">
                          <span>Update Pricing Rules</span>
                          <ArrowRight size={14} className="opacity-50" />
                      </Link>
                      <Link to="/admin/hotels" className="block p-3 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition flex items-center justify-between">
                          <span>Manage Hotel Inventory</span>
                          <ArrowRight size={14} className="opacity-50" />
                      </Link>
                      <Link to="/admin/suppliers" className="block p-3 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition flex items-center justify-between">
                          <span>Supplier Directory</span>
                          <ArrowRight size={14} className="opacity-50" />
                      </Link>
                  </div>
              </div>

          </div>
      </div>
    </div>
  );
};
