import React from 'react';
import { Outlet } from 'react-router-dom';
import { AdminSidebar } from '../../components/AdminSidebar';

export const AdminLayout: React.FC = () => {
  return (
    <div className="flex bg-slate-100 min-h-screen">
      <AdminSidebar />
      <main className="ml-64 flex-1 p-8 overflow-y-auto h-screen">
        <Outlet />
      </main>
    </div>
  );
};