
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { bookingService } from '../../services/bookingService';
import { Booking } from '../../types';
import { AssignedBookingsTable } from '../../components/operator/AssignedBookingsTable';
import { Briefcase, RefreshCw, Filter } from 'lucide-react';

export const AssignedBookings: React.FC = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'ACTION_REQUIRED' | 'ACTIVE'>('ALL');

  const loadData = () => {
    if (user) {
      setIsLoading(true);
      setTimeout(() => {
          const all = bookingService.getBookingsForOperator(user.id);
          // Sort by date created desc
          all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setBookings(all);
          setIsLoading(false);
      }, 400);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const filteredBookings = bookings.filter(b => {
      if (filter === 'ALL') return true;
      if (filter === 'ACTION_REQUIRED') return b.operatorStatus === 'ASSIGNED';
      if (filter === 'ACTIVE') return b.operatorStatus === 'ACCEPTED' && b.status !== 'COMPLETED' && !b.status.includes('CANCEL');
      return true;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="text-brand-600" /> My Bookings
          </h1>
          <p className="text-slate-500">Manage confirmed trips assigned to you for execution.</p>
        </div>
        
        <div className="flex items-center gap-3">
            <div className="flex bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                <button 
                    onClick={() => setFilter('ALL')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${filter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                    All
                </button>
                <button 
                    onClick={() => setFilter('ACTION_REQUIRED')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${filter === 'ACTION_REQUIRED' ? 'bg-amber-500 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                    New Requests
                </button>
                <button 
                    onClick={() => setFilter('ACTIVE')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${filter === 'ACTIVE' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                    In Progress
                </button>
            </div>
            
            <button 
                onClick={loadData} 
                className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-brand-600 rounded-lg shadow-sm transition"
                title="Refresh List"
            >
                <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
            </button>
        </div>
      </div>

      <AssignedBookingsTable bookings={filteredBookings} onRefresh={loadData} />
    </div>
  );
};
