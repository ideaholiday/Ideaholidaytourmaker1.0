
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BRANDING } from '../constants';
import { LogOut, LayoutDashboard, FileText, PlusCircle, Store, UserPlus, Globe } from 'lucide-react';
import { UserRole } from '../types';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const canAccessCMS = user?.role === UserRole.ADMIN || user?.role === UserRole.STAFF || user?.role === UserRole.OPERATOR;
  const isAgent = user?.role === UserRole.AGENT;
  const isSupplier = user?.role === UserRole.SUPPLIER;

  // Determine Home Link based on Role
  const getHomeLink = () => {
    if (!user) return '/';
    switch (user.role) {
      case UserRole.ADMIN:
      case UserRole.STAFF:
        return '/admin/dashboard';
      case UserRole.AGENT:
        return '/agent/dashboard';
      case UserRole.OPERATOR:
        return '/operator/dashboard';
      case UserRole.SUPPLIER:
        return '/supplier/dashboard';
      default:
        return '/dashboard';
    }
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 backdrop-blur-md bg-white/90 support-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Logo Section */}
        <Link to={getHomeLink()} className="flex items-center gap-3 group">
          <div className="relative">
             {/* Tilted Axis Container for Earth-like effect */}
             <div className="bg-gradient-to-br from-brand-500 to-brand-700 text-white p-2 rounded-xl shadow-lg shadow-brand-500/30 transition-all duration-300 group-hover:scale-110 group-hover:rotate-[15deg] rotate-6">
                <Globe size={22} strokeWidth={2} className="animate-spin-slow" />
             </div>
          </div>
          <div className="flex flex-col justify-center">
            <span className="font-extrabold text-xl text-slate-900 tracking-tight leading-none hidden sm:block group-hover:text-brand-700 transition-colors">
              {BRANDING.name}
            </span>
            <span className="font-extrabold text-xl text-slate-900 tracking-tight leading-none sm:hidden group-hover:text-brand-700 transition-colors">
              ITM
            </span>
          </div>
        </Link>

        {/* Navigation Actions */}
        <div className="flex items-center gap-4">
          {user ? (
            <>
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
                    to="/agent/create" 
                    className="flex items-center gap-1 text-sm font-bold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors"
                   >
                     <PlusCircle size={16} /> New Quote
                   </Link>
                </div>
              )}

              {isSupplier && (
                <Link 
                  to="/supplier/dashboard" 
                  className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-brand-600 mr-2 bg-slate-50 px-3 py-1.5 rounded-lg"
                >
                  <Store size={16} /> Supplier Extranet
                </Link>
              )}
              
              <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-sm font-bold text-slate-800">{user.name}</span>
                <span className="text-[10px] uppercase tracking-wider text-brand-600 font-bold px-2 py-0.5 bg-brand-50 rounded-full">
                  {user.role}
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
                className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
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
