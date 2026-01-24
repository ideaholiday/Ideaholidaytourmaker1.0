
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { bookingService } from '../services/bookingService';
import { LogOut, LayoutDashboard, FileText, PlusCircle, Store, UserPlus, Globe, Bell, Package, Layout, FileCheck } from 'lucide-react';
import { UserRole } from '../types';
import { useClientBranding } from '../hooks/useClientBranding';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { agencyName, logoUrl, styles, isPlatformDefault } = useClientBranding();
  
  const [pendingCount, setPendingCount] = useState(0);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const canAccessCMS = user?.role === UserRole.ADMIN || user?.role === UserRole.STAFF || user?.role === UserRole.OPERATOR;
  const isAgent = user?.role === UserRole.AGENT;
  const isPartner = user?.role === UserRole.HOTEL_PARTNER;
  const isAdminOrStaff = user?.role === UserRole.ADMIN || user?.role === UserRole.STAFF;

  // Poll for notifications
  useEffect(() => {
    if (isAdminOrStaff) {
        const checkNotifications = async () => {
            const bookings = await bookingService.getAllBookings();
            const count = bookings.filter(b => b.status === 'REQUESTED').length;
            setPendingCount(count);
        };
        
        checkNotifications();
        // Simple polling every 30s
        const interval = setInterval(checkNotifications, 30000);
        return () => clearInterval(interval);
    }
  }, [user]);

  // Use the backend-provided route if available, otherwise default to home
  const homeLink = user?.dashboardRoute || '/';

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 backdrop-blur-md bg-white/90 support-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Logo Section */}
        <Link to={homeLink} className="flex items-center gap-3 group">
          <div className="relative">
             {/* Logo Container */}
             {logoUrl ? (
                 <img src={logoUrl} alt={agencyName} className="h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105" />
             ) : (
                <div 
                    className="p-2 rounded-xl shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-[15deg] rotate-6 text-white"
                    style={isPlatformDefault ? { background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' } : styles.primaryBg}
                >
                    <Globe size={22} strokeWidth={2} className="animate-spin-slow" />
                </div>
             )}
          </div>
          <div className="flex flex-col justify-center">
            <span 
                className="font-extrabold text-xl tracking-tight leading-none hidden sm:block transition-colors"
                style={isPlatformDefault ? { color: '#0f172a' } : { color: '#0f172a' }} // Default text color dark
            >
              {agencyName}
            </span>
            <span className="font-extrabold text-xl text-slate-900 tracking-tight leading-none sm:hidden group-hover:text-brand-700 transition-colors">
              {agencyName.substring(0, 3).toUpperCase()}
            </span>
          </div>
        </Link>

        {/* Navigation Actions */}
        <div className="flex items-center gap-4">
          {user ? (
            <>
              {/* ADMIN NOTIFICATION BELL */}
              {isAdminOrStaff && (
                  <Link 
                    to="/admin/bookings?status=REQUESTED" 
                    className="relative p-2 text-slate-500 hover:text-brand-600 hover:bg-slate-50 rounded-full transition-all mr-1"
                    title="Pending Approvals"
                  >
                      <Bell size={20} />
                      {pendingCount > 0 && (
                          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full animate-pulse shadow-sm border border-white">
                              {pendingCount}
                          </span>
                      )}
                  </Link>
              )}

              {canAccessCMS && (
                <Link 
                  to="/admin/dashboard" 
                  className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-brand-600 mr-2 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-transparent hover:border-slate-200 transition-all"
                >
                  <LayoutDashboard size={16} />
                  {user.role === UserRole.OPERATOR ? 'Inventory' : 'Admin CMS'}
                </Link>
              )}

              {isAgent && (
                <div className="hidden md:flex items-center gap-2 mr-2">
                   <Link 
                    to="/agent/quotes" 
                    className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-brand-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                   >
                     <FileText size={16} /> My Quotes
                   </Link>
                   <Link 
                    to="/agent/packages" 
                    className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-brand-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                    title="Fixed Departure Packages"
                   >
                     <Package size={16} /> Packages
                   </Link>
                   <Link 
                    to="/agent/templates" 
                    className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-brand-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                    title="Itinerary Templates"
                   >
                     <Layout size={16} /> Templates
                   </Link>
                   <Link 
                    to="/agent/visa" 
                    className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-brand-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                    title="Visa Requirements"
                   >
                     <FileCheck size={16} /> Visa
                   </Link>
                   <Link 
                    to="/agent/create" 
                    className="flex items-center gap-1 text-sm font-bold text-white px-3 py-1.5 rounded-lg transition-colors shadow-sm hover:opacity-90"
                    style={styles.primaryBg}
                   >
                     <PlusCircle size={16} /> New Quote
                   </Link>
                </div>
              )}

              {isPartner && (
                <Link 
                  to="/partner/dashboard" 
                  className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-brand-600 mr-2 bg-slate-50 px-3 py-1.5 rounded-lg"
                >
                  <Store size={16} /> Partner Extranet
                </Link>
              )}
              
              <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-sm font-bold text-slate-800">{user.name}</span>
                <span 
                    className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-slate-100"
                    style={!isPlatformDefault ? { color: styles.primaryText.color } : { color: '#0284c7' }}
                >
                  {user.role.replace('_', ' ')}
                </span>
              </div>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-lg"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </>
          ) : (
            <div className="flex gap-3">
              <Link 
                to="/signup"
                className="hidden md:flex items-center gap-1 text-slate-600 hover:text-brand-600 px-3 py-2 text-sm font-medium transition-colors"
              >
                <UserPlus size={16} /> Partner Signup
              </Link>
              <Link 
                to="/login"
                className="text-white px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                style={isPlatformDefault ? { backgroundColor: '#0f172a' } : styles.primaryBg}
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
