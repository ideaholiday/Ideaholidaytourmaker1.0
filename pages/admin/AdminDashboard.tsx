
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { profileService } from '../../services/profileService';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { Users, BookCheck, Briefcase, DollarSign, Store, Shield, UserPlus, ArrowRight, Globe } from 'lucide-react';
import { SupplierDashboard } from '../supplier/SupplierDashboard';
import { StaffDashboard } from '../staff/StaffDashboard';
import { seedInternationalInventory } from '../../utils/seedData';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>({ activeBookings: 0, totalRevenue: 0, totalAgents: 0, totalOperators: 0, pendingPayments: 0 });
  const [counts, setCounts] = useState({ destinations: 0, hotels: 0 });
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (user && user.role === UserRole.ADMIN) {
        loadStats();
    }
  }, [user]);

  const loadStats = async () => {
      const dashboardStats = await profileService.getAdminDashboardStats();
      const dests = await adminService.getDestinations();
      const hotels = await adminService.getHotels();
      
      setStats(dashboardStats);
      setCounts({
          destinations: dests.length,
          hotels: hotels.length
      });
  };

  const handleSeed = async () => {
      if (confirm("This will load a large set of Global Inventory (Europe, Asia, USA, etc). Continue?")) {
          setSeeding(true);
          await seedInternationalInventory();
          setSeeding(false);
          loadStats();
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
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">Master Control Center</h1>
            <p className="text-slate-500">System-wide overview and management.</p>
        </div>
        <button 
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-900 disabled:opacity-50"
        >
            <Globe size={16} /> {seeding ? 'Loading...' : 'Load Global Inventory'}
        </button>
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
          title="Operators" 
          value={stats.totalOperators} 
          subtext="Ground Partners" 
          icon={<Briefcase size={24} />} 
          color="bg-purple-600" 
        />
      </div>

      {/* QUICK ACTIONS ROW */}
      <div>
          <h3 className="font-bold text-slate-900 mb-4">Create New Users</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Link to="/admin/users?createRole=AGENT" className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition flex items-center gap-3 group">
                  <div className="bg-emerald-100 text-emerald-600 p-2.5 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition">
                      <UserPlus size={20} />
                  </div>
                  <div>
                      <h4 className="font-bold text-slate-700">Add Agent</h4>
                      <p className="text-xs text-slate-500">New B2B Partner</p>
                  </div>
              </Link>
              
              <Link to="/admin/users?createRole=OPERATOR" className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition flex items-center gap-3 group">
                  <div className="bg-amber-100 text-amber-600 p-2.5 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition">
                      <Briefcase size={20} />
                  </div>
                  <div>
                      <h4 className="font-bold text-slate-700">Add Operator</h4>
                      <p className="text-xs text-slate-500">Ground DMC</p>
                  </div>
              </Link>

              <Link to="/admin/users?createRole=HOTEL_PARTNER" className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition flex items-center gap-3 group">
                  <div className="bg-purple-100 text-purple-600 p-2.5 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition">
                      <Store size={20} />
                  </div>
                  <div>
                      <h4 className="font-bold text-slate-700">Add Hotel Partner</h4>
                      <p className="text-xs text-slate-500">Inventory Owner</p>
                  </div>
              </Link>

              <Link to="/admin/users?createRole=STAFF" className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition flex items-center gap-3 group">
                  <div className="bg-blue-100 text-blue-600 p-2.5 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition">
                      <Shield size={20} />
                  </div>
                  <div>
                      <h4 className="font-bold text-slate-700">Add Staff</h4>
                      <p className="text-xs text-slate-500">Internal Employee</p>
                  </div>
              </Link>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Links */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 lg:col-span-2">
          <h3 className="font-bold text-slate-900 mb-4">Operational Shortcuts</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
             <Link to="/admin/agents" className="p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition text-center group">
                <Users size={24} className="mx-auto text-slate-400 group-hover:text-blue-600 mb-2" />
                <span className="text-sm font-medium text-slate-700">Manage Agents</span>
             </Link>
             <Link to="/admin/operators" className="p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition text-center group">
                <Briefcase size={24} className="mx-auto text-slate-400 group-hover:text-purple-600 mb-2" />
                <span className="text-sm font-medium text-slate-700">Manage Operators</span>
             </Link>
             <Link to="/admin/bookings" className="p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition text-center group">
                <BookCheck size={24} className="mx-auto text-slate-400 group-hover:text-green-600 mb-2" />
                <span className="text-sm font-medium text-slate-700">All Bookings</span>
             </Link>
             <Link to="/admin/destinations" className="p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition text-center group">
                <Store size={24} className="mx-auto text-slate-400 group-hover:text-amber-600 mb-2" />
                <span className="text-sm font-medium text-slate-700">Destinations ({counts.destinations})</span>
             </Link>
             <Link to="/admin/hotels" className="p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition text-center group">
                <Store size={24} className="mx-auto text-slate-400 group-hover:text-pink-600 mb-2" />
                <span className="text-sm font-medium text-slate-700">Hotels ({counts.hotels})</span>
             </Link>
             <Link to="/admin/staff" className="p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition text-center group">
                <Users size={24} className="mx-auto text-slate-400 group-hover:text-slate-800 mb-2" />
                <span className="text-sm font-medium text-slate-700">Staff Permissions</span>
             </Link>
          </div>
        </div>

        {/* Financial Snapshot */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 mb-4">Financial Health</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Pending Payments</span>
                <span className="font-mono font-bold text-red-600">${stats.pendingPayments.toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-red-500 h-full" style={{width: '45%'}}></div>
              </div>
              <p className="text-xs text-slate-400">45% of total outstanding</p>
            </div>
          </div>
          
           {/* Quick Shortcuts Box */}
           <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-lg p-5 text-white mt-6">
              <h3 className="font-bold text-md mb-3">Quick Shortcuts</h3>
              <div className="space-y-2">
                  <Link to="/admin/hotels" className="block p-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition flex items-center justify-between">
                      <span>Manage Hotel Inventory</span>
                      <ArrowRight size={12} className="opacity-50" />
                  </Link>
                  <Link to="/admin/partners" className="block p-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition flex items-center justify-between">
                      <span>Supplier Directory</span>
                      <ArrowRight size={12} className="opacity-50" />
                  </Link>
                   <Link to="/admin/contracts" className="block p-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition flex items-center justify-between">
                      <span>Manage Contracts</span>
                      <ArrowRight size={12} className="opacity-50" />
                  </Link>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};
