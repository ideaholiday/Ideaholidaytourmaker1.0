
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface Props {
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<Props> = ({ allowedRoles }) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600 mb-4"></div>
        <p className="text-slate-500 font-medium">Authenticating Securely...</p>
      </div>
    );
  }

  // 1. Not Logged In -> Redirect to Login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Email Not Verified -> Redirect to Verify
  if (!user.isVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  // 3. Role Mismatch -> Redirect to Unauthorized
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // 4. Authorized -> Render Content
  return <Outlet />;
};
