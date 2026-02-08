
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { profileService } from '../../services/profileService';
import { adminService } from '../../services/adminService';
import { bookingService } from '../../services/bookingService'; // Added bookingService
import { useAuth } from '../../context/AuthContext';
import { UserRole, SystemNotification, Booking } from '../../types'; // Added Booking type
import { Users, BookCheck, Briefcase, DollarSign, Store, Shield, UserPlus, ArrowRight, Hotel, Car, Camera, Plus, Megaphone, Trash2, Link as LinkIcon, AlertCircle, Calendar, Clock } from 'lucide-react';
import { SupplierDashboard } from '../supplier/SupplierDashboard';
import { StaffDashboard } from '../staff/StaffDashboard';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>({ activeBookings: 0, totalRevenue: 0, totalAgents: 0, totalOperators: 0, pendingPayments: 0 });
  const [counts, setCounts] = useState({ destinations: 0, hotels: 0, activities: 0, transfers: 0 });
  
  // Notification State
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [newNote, setNewNote] = useState({ content: '', link: '', type: 'INFO' as 'INFO' | 'URGENT' | 'PROMO' | 'MEETING' });
  const [isNoteSubmitting, setIsNoteSubmitting] = useState(false);

  // Today's Bookings State
  const [todaysBookings, setTodaysBookings] = useState<Booking[]>([]);

  useEffect(() => {
    if (user && user.role === UserRole.ADMIN) {
        loadStats();
        loadNotifications();
        loadRecentBookings();
    }
  }, [user]);

  const loadStats = async () => {
      const dashboardStats = await profileService.getAdminDashboardStats();
      const dests = await adminService.getDestinations();
      const hotels = await adminService.getHotels();
      const acts = await adminService.getActivities();
      const trans = await adminService.getTransfers();
      
      setStats(dashboardStats);
      setCounts({
          destinations: dests.length,
          hotels: hotels.length,
          activities: acts.length,
          transfers: trans.length
      });
  };

  const loadRecentBookings = async () => {
      const allBookings = await bookingService.getAllBookings();
      const todayStr = new Date().toISOString().split('T')[0];
      
      // Filter for bookings created today
      const today = allBookings.filter(b => b.createdAt.startsWith(todayStr));
      
      // Sort by newest first
      today.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setTodaysBookings(today);
  };

  const loadNotifications = async () => {
      const notes = adminService.getNotificationsSync() || [];
      if (notes.length === 0) {
           // Fallback fetch if sync hasn't happened or empty
           const fetched = await adminService.getActiveNotifications(); 
           setNotifications(fetched);
      } else {
           setNotifications(notes);
      }
  };

  const handleAddNotification = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!newNote.content) return;
      
      setIsNoteSubmitting(true);
      try {
          await adminService.saveNotification({
              ...newNote,
              isActive: true
          });
          setNewNote({ content: '', link: '', type: 'INFO' });
          // Refresh list
          const all = await adminService.getActiveNotifications();
          setNotifications(all);
      } catch (error) {
          console.error("Failed to post notification", error);
          alert("Failed to post notification. Check console.");
      } finally {
          setIsNoteSubmitting(false);
      }
  };

  const handleDeleteNotification = async (id: string) => {
      if(confirm("Stop broadcasting this message?")) {
          await adminService.deleteNotification(id);
          const all = await adminService.getActiveNotifications();
          setNotifications(all);
      }
  };

  if (!user) return null;

  // --- PARTNER VIEW ---
  if (user.role === UserRole.HOTEL_PARTNER) {
      return <SupplierDashboard />;
  }

  // --- STAFF VIEW ---
  if (user.role === UserRole.STAFF) {
      return <StaffDashboard />;
  }

  const StatCard = ({ title, value, subtext, icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-2">{value}</h3>
          <p className="text-xs text-slate-400 mt-1">{subtext}</p>
        </div>
        <div className={`p-3 rounded-lg ${color} text-white`}>
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-10">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">Master Control Center</h1>
            <p className="text-slate-500">System-wide overview and management.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Active Bookings" 
          value={stats.activeBookings} 
          subtext="In Progress / Confirmed" 
          icon={<BookCheck size={24} />} 
          color="bg-blue-600" 
        />
        <StatCard 
          title="Total Revenue" 
          value={`$${stats.totalRevenue.toLocaleString()}`} 
          subtext="Gross Booking Value" 
          icon={<DollarSign size={24} />} 
          color="bg-emerald-600" 
        />
        <StatCard 
          title="Agents" 
          value={stats.totalAgents} 
          subtext="Registered Partners" 
          icon={<Users size={24} />} 
          color="bg-indigo-600" 
        />
        <StatCard 
          title="DMCs" 
          value={stats.totalOperators} 
          subtext="Ground Partners" 
          icon={<Briefcase size={24} />} 
          color="bg-purple-600" 
        />
      </div>

      {/* TODAY'S BOOKING WIDGET (NEW) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      <Calendar size={18} className="text-brand-600"/> Today's Bookings
                  </h3>
                  <span className="text-xs font-bold bg-brand-100 text-brand-800 px-2 py-1 rounded-full">{todaysBookings.length} New</span>
              </div>
              
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                  {todaysBookings.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-sm">
                          No new bookings created today.
                      </div>
                  ) : (
                      todaysBookings.map(booking => (
                          <div key={booking.id} className="p-4 hover:bg-slate-50 transition flex items-center justify-between group">
                              <div className="flex items-center gap-4">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold ${booking.paymentStatus === 'PAID_IN_FULL' ? 'bg-green-500' : 'bg-amber-500'}`}>
                                      {booking.paymentStatus === 'PAID_IN_FULL' ? '$' : '%'}
                                  </div>
                                  <div>
                                      <p className="text-sm font-bold text-slate-800">
                                          {booking.destination} 
                                          <span className="text-slate-400 font-normal ml-2">({booking.uniqueRefNo})</span>
                                      </p>
                                      <p className="text-xs text-slate-500">
                                          Agent: {booking.agentName} • {booking.paxCount} Pax • {new Date(booking.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                      </p>
                                  </div>
                              </div>
                              <div className="text-right flex items-center gap-4">
                                  <div>
                                      <p className="text-sm font-bold text-slate-900">{booking.currency} {booking.sellingPrice.toLocaleString()}</p>
                                      <span className={`text-[10px] font-bold uppercase ${booking.status === 'CONFIRMED' ? 'text-green-600' : 'text-slate-400'}`}>
                                          {booking.status}
                                      </span>
                                  </div>
                                  <Link to={`/booking/${booking.id}`} className="p-2 text-slate-400 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition">
                                      <ArrowRight size={18} />
                                  </Link>
                              </div>
                          </div>
                      ))
                  )}
              </div>
              {todaysBookings.length > 0 && (
                  <div className="p-3 border-t border-slate-100 bg-slate-50 text-center">
                      <Link to="/admin/bookings" className="text-xs font-bold text-brand-600 hover:text-brand-800">View All Transactions</Link>
                  </div>
              )}
          </div>

          {/* Broadcast Center (Shifted to Sidebar) */}
          <div className="bg-slate-900 rounded-xl p-6 text-white shadow-lg flex flex-col justify-between">
              <div>
                  <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                      <Megaphone className="text-brand-400" /> Broadcast Center
                  </h3>
                  <p className="text-slate-400 text-sm mb-4">
                      Alert agents about offers or downtime.
                  </p>
                  
                  <form onSubmit={handleAddNotification} className="space-y-3">
                      <input 
                        type="text" 
                        placeholder="Message Content..." 
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-brand-500 outline-none"
                        value={newNote.content}
                        onChange={e => setNewNote({...newNote, content: e.target.value})}
                        required
                      />
                      <div className="flex gap-2">
                          <select 
                            className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-xs text-slate-300 outline-none"
                            value={newNote.type}
                            onChange={e => setNewNote({...newNote, type: e.target.value as any})}
                          >
                              <option value="INFO">Info</option>
                              <option value="URGENT">Urgent</option>
                              <option value="PROMO">Promo</option>
                          </select>
                          <button 
                            type="submit" 
                            disabled={isNoteSubmitting}
                            className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-bold py-2 rounded-lg text-xs transition disabled:opacity-50"
                          >
                              {isNoteSubmitting ? '...' : 'Post'}
                          </button>
                      </div>
                  </form>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-700">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Active</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                      {notifications.map(n => (
                          <div key={n.id} className="flex justify-between items-start gap-2 text-xs text-slate-300 bg-slate-800 p-2 rounded">
                              <span>{n.content}</span>
                              <button onClick={() => handleDeleteNotification(n.id)} className="text-slate-500 hover:text-red-400"><Trash2 size={12}/></button>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      </div>

      {/* INVENTORY & USER ACTIONS (Kept Existing) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => navigate('/admin/hotels')} 
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition flex items-center gap-4 group text-left"
          >
              <div className="bg-indigo-100 text-indigo-600 p-3 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition">
                  <Hotel size={24} />
              </div>
              <div>
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">Hotels <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-500">{counts.hotels}</span></h4>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><Plus size={12}/> Add Property/Rate</p>
              </div>
          </button>
          {/* ... other buttons ... */}
           <button 
            onClick={() => navigate('/admin/sightseeing')} 
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition flex items-center gap-4 group text-left"
          >
              <div className="bg-pink-100 text-pink-600 p-3 rounded-lg group-hover:bg-pink-600 group-hover:text-white transition">
                  <Camera size={24} />
              </div>
              <div>
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">Activities <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-500">{counts.activities}</span></h4>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><Plus size={12}/> Add Tour/Ticket</p>
              </div>
          </button>

          <button 
            onClick={() => navigate('/admin/transfers')} 
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition flex items-center gap-4 group text-left"
          >
              <div className="bg-blue-100 text-blue-600 p-3 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition">
                  <Car size={24} />
              </div>
              <div>
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">Transfers <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-500">{counts.transfers}</span></h4>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><Plus size={12}/> Add Vehicle</p>
              </div>
          </button>
      </div>

    </div>
  );
};
