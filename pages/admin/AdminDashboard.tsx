import React from 'react';
import { Link } from 'react-router-dom';
import { profileService } from '../../services/profileService';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { Users, BookCheck, Briefcase, DollarSign, Activity, Map, Hotel, UserPlus, Store, Shield } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const stats = profileService.getAdminDashboardStats();
  const destinations = adminService.getDestinations().length;
  const hotels = adminService.getHotels().length;

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
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Master Control Center</h1>
        <p className="text-slate-500">System-wide overview and management.</p>
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

              <Link to="/admin/users?createRole=SUPPLIER" className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition flex items-center gap-3 group">
                  <div className="bg-purple-100 text-purple-600 p-2.5 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition">
                      <Store size={20} />
                  </div>
                  <div>
                      <h4 className="font-bold text-slate-700">Add Supplier</h4>
                      <p className="text-xs text-slate-500">Hotel/Transport</p>
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
                <Map size={24} className="mx-auto text-slate-400 group-hover:text-amber-600 mb-2" />
                <span className="text-sm font-medium text-slate-700">Destinations ({destinations})</span>
             </Link>
             <Link to="/admin/hotels" className="p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition text-center group">
                <Hotel size={24} className="mx-auto text-slate-400 group-hover:text-pink-600 mb-2" />
                <span className="text-sm font-medium text-slate-700">Hotels ({hotels})</span>
             </Link>
             <Link to="/admin/staff" className="p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition text-center group">
                <Users size={24} className="mx-auto text-slate-400 group-hover:text-slate-800 mb-2" />
                <span className="text-sm font-medium text-slate-700">Staff Permissions</span>
             </Link>
          </div>
        </div>

        {/* Financial Snapshot */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
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
      </div>
    </div>
  );
};