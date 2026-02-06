
import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Map, Hotel, Car, Camera, FileText, LogOut, Package, Users, Layers, BookCheck, Briefcase, UserCog, ShieldCheck, FileBarChart, Building, FileSpreadsheet, PieChart, ListChecks, Coins, Shield, Bell, Sparkles, Box, ScrollText, PenTool, Store, User, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export const AdminSidebar: React.FC = () => {
  const { logout, user } = useAuth();
  
  const isFullAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.STAFF;
  const isOperator = user?.role === UserRole.OPERATOR;
  const isPartner = user?.role === UserRole.HOTEL_PARTNER;
  
  const navItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/admin/dashboard', roles: [UserRole.ADMIN, UserRole.STAFF, UserRole.AGENT, UserRole.OPERATOR, UserRole.HOTEL_PARTNER] },
    
    // NEW: OPS DASHBOARD
    { icon: <Activity size={20} />, label: 'Ops Center', path: '/admin/ops-dashboard', roles: [UserRole.ADMIN, UserRole.STAFF, UserRole.OPERATOR] },

    // Admin Management Links
    { icon: <Shield size={20} />, label: 'Users & Roles', path: '/admin/users', roles: [UserRole.ADMIN] }, 
    { icon: <Users size={20} />, label: 'Agents', path: '/admin/agents', roles: [UserRole.ADMIN] },
    { icon: <Briefcase size={20} />, label: 'DMCs', path: '/admin/operators', roles: [UserRole.ADMIN] },
    { icon: <Store size={20} />, label: 'Hotel Partners', path: '/admin/partners', roles: [UserRole.ADMIN, UserRole.STAFF] }, 
    { icon: <UserCog size={20} />, label: 'Staff Permissions', path: '/admin/staff', roles: [UserRole.ADMIN] },
    { icon: <Building size={20} />, label: 'Companies', path: '/admin/companies', roles: [UserRole.ADMIN] },
    { icon: <ShieldCheck size={20} />, label: 'Audit Logs', path: '/admin/audit', roles: [UserRole.ADMIN] },
    
    // Contracts
    { icon: <ScrollText size={20} />, label: 'Contracts', path: '/admin/contracts', roles: [UserRole.ADMIN, UserRole.STAFF, UserRole.HOTEL_PARTNER] }, 
    { icon: <PenTool size={20} />, label: 'Contract Approvals', path: '/admin/contract-approvals', roles: [UserRole.ADMIN, UserRole.STAFF] },

    // Finance & Reports
    { icon: <PieChart size={20} />, label: 'P&L Reports', path: '/admin/pl-reports', roles: [UserRole.ADMIN] },
    { icon: <FileBarChart size={20} />, label: 'GST Reports', path: '/admin/gst-reports', roles: [UserRole.ADMIN, UserRole.STAFF] },
    { icon: <FileSpreadsheet size={20} />, label: 'Financial Ledger', path: '/admin/financial-ledger-export', roles: [UserRole.ADMIN] },
    { icon: <Bell size={20} />, label: 'Payment Reminders', path: '/admin/reminders', roles: [UserRole.ADMIN] },

    // Operations
    { icon: <BookCheck size={20} />, label: 'Bookings', path: '/admin/bookings', roles: [UserRole.ADMIN, UserRole.STAFF] },
    { icon: <ListChecks size={20} />, label: 'Approvals', path: '/admin/approvals', roles: [UserRole.ADMIN, UserRole.STAFF] },
    
    // Operator Specific
    { icon: <ListChecks size={20} />, label: 'Work Queue', path: '/operator/work-queue', roles: [UserRole.OPERATOR] },
    { icon: <Box size={20} />, label: 'My Inventory', path: '/operator/inventory', roles: [UserRole.OPERATOR] },
    { icon: <User size={20} />, label: 'My Profile', path: '/operator/profile', roles: [UserRole.OPERATOR] },

    // Inventory
    { icon: <Map size={20} />, label: 'Destinations', path: '/admin/destinations', roles: [UserRole.ADMIN, UserRole.STAFF, UserRole.AGENT, UserRole.OPERATOR] },
    { icon: <Hotel size={20} />, label: 'Hotels & Rates', path: '/admin/hotels', roles: [UserRole.ADMIN, UserRole.STAFF, UserRole.AGENT, UserRole.OPERATOR, UserRole.HOTEL_PARTNER] },
    { icon: <Car size={20} />, label: 'Transfers', path: '/admin/transfers', roles: [UserRole.ADMIN, UserRole.STAFF, UserRole.AGENT, UserRole.OPERATOR, UserRole.HOTEL_PARTNER] },
    { icon: <Camera size={20} />, label: 'Sightseeing', path: '/admin/sightseeing', roles: [UserRole.ADMIN, UserRole.STAFF, UserRole.AGENT, UserRole.OPERATOR, UserRole.HOTEL_PARTNER] },
    { icon: <Package size={20} />, label: 'Fixed Packages', path: '/admin/packages', roles: [UserRole.ADMIN, UserRole.STAFF, UserRole.AGENT, UserRole.OPERATOR] },
    { icon: <Layers size={20} />, label: 'Itinerary Templates', path: '/admin/templates', roles: [UserRole.ADMIN, UserRole.STAFF] },
    { icon: <Sparkles size={20} />, label: 'Quick Quote Templates', path: '/admin/quick-templates', roles: [UserRole.ADMIN, UserRole.STAFF] },
    { icon: <FileText size={20} />, label: 'Visa Info', path: '/admin/visa', roles: [UserRole.ADMIN, UserRole.STAFF, UserRole.AGENT, UserRole.OPERATOR] },
    { icon: <Coins size={20} />, label: 'Currency Rates', path: '/admin/currency', roles: [UserRole.ADMIN, UserRole.STAFF] },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen fixed left-0 top-0 border-r border-slate-800">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white tracking-tight">Idea Holiday <span className="text-brand-500">CMS</span></h1>
        <p className="text-xs text-slate-500 mt-1">
            {isFullAdmin ? 'Admin Control Center' : (isOperator ? 'Operations Console' : isPartner ? 'Partner Extranet' : 'Portal')}
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1">
          {navItems.filter(item => user && item.roles.includes(user.role)).map((item) => (
            <li key={item.path}>
              <NavLink 
                to={item.path}
                className={({ isActive }) => 
                  `flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-brand-600 text-white border-r-4 border-brand-300' 
                      : 'hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="px-4 py-2 mb-2 text-xs text-slate-500">
            <div>Role: <span className="text-slate-300 font-semibold">{user?.role.replace('_', ' ')}</span></div>
            {user?.uniqueId && <div className="font-mono text-[10px] text-brand-400 mt-0.5">{user.uniqueId}</div>}
        </div>
        <button 
          onClick={() => logout()}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-red-400 transition-colors w-full px-4 py-2"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
};
