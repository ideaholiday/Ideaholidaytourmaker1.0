
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BRANDING } from '../constants';
import { LogOut, Shield, LayoutDashboard, FileText, PlusCircle, Store, UserPlus } from 'lucide-react';
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
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to={getHomeLink()} className="flex items-center gap-2">
          {BRANDING.logoUrl ? (
             <img src={BRANDING.logoUrl} alt="Logo" className="h-10 w-auto object-contain" />
          ) : (
             <div className="bg-brand-600 text-white p-1.5 rounded-lg">
                <Shield size={20} />
             </div>
          )}
          <span className="font-bold text-xl text-slate-900 tracking-tight hidden sm:block">
            {BRANDING.name}
          </span>
          <span className="font-bold text-xl text-slate-900 tracking-tight sm:hidden">
            ITM
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              {canAccessCMS && (
                <Link 
                  to="/admin/dashboard" 
                  className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-brand-600 mr-2 bg-slate-50 px-3 py-1.5 rounded-lg"
                >
                  <LayoutDashboard size={16} />
                  {user.role === UserRole.OPERATOR ? 'Inventory' : 'Admin CMS'}
                </Link>
              )}

              {isAgent && (
                <div className="hidden md:flex items-center gap-2 mr-2">
                   <Link 
                    to="/agent/quotes" 
                    className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-brand-600 px-3 py-1.5 rounded-lg hover:bg-slate-50"
                   >
                     <FileText size={16} /> My Quotes
                   </Link>
                   <Link 
                    to="/agent/create" 
                    className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg"
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
                <span className="text-sm font-semibold text-slate-900">{user.name}</span>
                <span className="text-xs text-brand-600 font-medium px-2 py-0.5 bg-brand-50 rounded-full">
                  {user.role}
                </span>
              </div>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-red-600 transition-colors"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">Logout</span>
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
                className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
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
