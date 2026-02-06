
import React, { useState, useEffect } from 'react';
import { bookingService } from '../../services/bookingService';
import { bookingOperatorService } from '../../services/bookingOperatorService';
import { Booking, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { AssignOperatorModal } from '../../components/booking/AssignOperatorModal';
import { PaymentStatusBadge } from '../../components/booking/PaymentStatusBadge';
import { Search, Eye, UserPlus, Filter, CheckCircle, AlertTriangle, Clock, Briefcase, RefreshCw, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type Tab = 'ALL' | 'READY_FOR_OPS' | 'ASSIGNED' | 'COMPLETED';

export const BookingManager: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('READY_FOR_OPS');
  const [isLoading, setIsLoading] = useState(true);
  
  // Assign Operator Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    setIsLoading(true);
    const data = await bookingService.getAllBookings();
    // Sort: Newest first
    data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setBookings(data);
    setIsLoading(false);
  };

  const handleAssignOperator = async (operatorId: string, operatorName: string, options: any) => {
      if (!selectedBooking || !user) return;
      
      await bookingOperatorService.assignOperator(
          selectedBooking.id,
          operatorId,
          operatorName,
          options,
          user
      );
      
      await loadBookings();
      setIsAssignModalOpen(false);
  };

  const openAssignModal = (booking: Booking) => {
      setSelectedBooking(booking);
      setIsAssignModalOpen(true);
  };

  // --- FILTERING LOGIC ---
  const filteredBookings = bookings.filter(b => {
      // 1. Text Search
      const matchSearch = 
        (b.uniqueRefNo || '').toLowerCase().includes(search.toLowerCase()) || 
        (b.agentName || '').toLowerCase().includes(search.toLowerCase()) ||
        (b.destination || '').toLowerCase().includes(search.toLowerCase());
        
      if (!matchSearch) return false;

      const safeStatus = b.status || '';

      // 2. Tab Filter
      if (activeTab === 'ALL') return true;
      
      if (activeTab === 'READY_FOR_OPS') {
          // Paid (at least advance) AND (Unassigned OR Declined)
          const isPaid = b.paymentStatus === 'ADVANCE_PAID' || b.paymentStatus === 'PAID_IN_FULL' || b.paymentStatus === 'PARTIALLY_PAID';
          const isUnassigned = !b.operatorId || b.operatorStatus === 'DECLINED';
          const notCancelled = !safeStatus.includes('CANCEL') && safeStatus !== 'REJECTED';
          return isPaid && isUnassigned && notCancelled;
      }

      if (activeTab === 'ASSIGNED') {
          return !!b.operatorId && safeStatus !== 'COMPLETED';
      }

      if (activeTab === 'COMPLETED') {
          return safeStatus === 'COMPLETED';
      }

      return true;
  });

  // Calculate Counts for Tabs
  const countReady = bookings.filter(b => 
      (b.paymentStatus === 'ADVANCE_PAID' || b.paymentStatus === 'PAID_IN_FULL' || b.paymentStatus === 'PARTIALLY_PAID') && 
      (!b.operatorId || b.operatorStatus === 'DECLINED') && 
      !(b.status || '').includes('CANCEL')
  ).length;

  if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.STAFF)) return <div>Unauthorized</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
             <Briefcase className="text-brand-600"/> Booking Operations
          </h1>
          <p className="text-slate-500">Dispatch confirmed bookings to ground operators.</p>
        </div>
        <button 
            onClick={loadBookings} 
            className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-brand-600 rounded-lg shadow-sm transition"
            title="Refresh Data"
        >
            <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* TABS & FILTERS */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto w-full lg:w-auto">
              <button 
                  onClick={() => setActiveTab('READY_FOR_OPS')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${activeTab === 'READY_FOR_OPS' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                  <AlertTriangle size={16} className={activeTab === 'READY_FOR_OPS' ? 'text-amber-500' : 'text-slate-400'} />
                  Ready for Ops
                  {countReady > 0 && <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full text-xs">{countReady}</span>}
              </button>
              <button 
                  onClick={() => setActiveTab('ASSIGNED')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${activeTab === 'ASSIGNED' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                  <Clock size={16} className={activeTab === 'ASSIGNED' ? 'text-blue-500' : 'text-slate-400'} />
                  Assigned
              </button>
              <button 
                  onClick={() => setActiveTab('COMPLETED')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${activeTab === 'COMPLETED' ? 'bg-white text-green-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                  <CheckCircle size={16} className={activeTab === 'COMPLETED' ? 'text-green-500' : 'text-slate-400'} />
                  History
              </button>
              <button 
                  onClick={() => setActiveTab('ALL')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${activeTab === 'ALL' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                  All Bookings
              </button>
          </div>

          <div className="relative w-full lg:w-64">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input 
                  type="text" 
                  placeholder="Search ref, agent, city..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm"
              />
          </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-xs">
                  <tr>
                      <th className="px-6 py-4 font-semibold">Ref No</th>
                      <th className="px-6 py-4 font-semibold">Travel Info</th>
                      <th className="px-6 py-4 font-semibold">Agent</th>
                      <th className="px-6 py-4 font-semibold">Payment</th>
                      <th className="px-6 py-4 font-semibold">Operator Status</th>
                      <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                  {filteredBookings.map(b => {
                      const isReadyToAssign = (b.paymentStatus === 'PAID_IN_FULL' || b.paymentStatus === 'ADVANCE_PAID') && !b.operatorId;
                      const isDeclined = b.operatorStatus === 'DECLINED';
                      const isAccepted = b.operatorStatus === 'ACCEPTED';

                      return (
                        <tr key={b.id} className="hover:bg-slate-50 transition group">
                            <td className="px-6 py-4">
                                <span className="font-mono font-medium text-brand-600 block">{b.uniqueRefNo}</span>
                                <span className="text-[10px] text-slate-400">{new Date(b.createdAt).toLocaleDateString()}</span>
                            </td>
                            <td className="px-6 py-4">
                                <div className="font-medium text-slate-900">{b.destination}</div>
                                <div className="text-xs text-slate-500">{new Date(b.travelDate).toLocaleDateString()} • {b.paxCount} Pax</div>
                            </td>
                            <td className="px-6 py-4 text-slate-600">{b.agentName || 'Direct'}</td>
                            <td className="px-6 py-4">
                                <PaymentStatusBadge status={b.paymentStatus} />
                            </td>
                            <td className="px-6 py-4">
                                {b.operatorName ? (
                                    <div>
                                        <span className="text-slate-900 font-medium block">{b.operatorName}</span>
                                        <span className={`text-[10px] uppercase font-bold flex items-center gap-1 ${
                                            isAccepted ? 'text-green-600' :
                                            isDeclined ? 'text-red-600' : 'text-amber-600'
                                        }`}>
                                            {isDeclined && <XCircle size={10} />}
                                            {isAccepted && <CheckCircle size={10} />}
                                            {b.operatorStatus || 'ASSIGNED'}
                                        </span>
                                    </div>
                                ) : (
                                    <span className="text-slate-400 italic text-xs">Unassigned</span>
                                )}
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                    <button 
                                        onClick={() => openAssignModal(b)}
                                        className={`p-2 rounded-lg transition border ${
                                            isReadyToAssign || isDeclined
                                                ? 'bg-brand-600 text-white border-brand-600 hover:bg-brand-700 shadow-sm' 
                                                : 'bg-white text-slate-500 border-slate-200 hover:border-brand-300 hover:text-brand-600'
                                        }`}
                                        title={b.operatorName ? "Reassign Operator" : "Assign Operator"}
                                    >
                                        <UserPlus size={16} />
                                    </button>
                                    <button 
                                        onClick={() => navigate(`/booking/${b.id}`)}
                                        className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                                        title="View Details"
                                    >
                                        <Eye size={16} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                      );
                  })}
                  {filteredBookings.length === 0 && (
                      <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                              <Filter size={32} className="mx-auto mb-3 opacity-20" />
                              No bookings found in this category.
                          </td>
                      </tr>
                  )}
              </tbody>
          </table>
      </div>

      {isAssignModalOpen && selectedBooking && (
          <AssignOperatorModal 
              isOpen={isAssignModalOpen}
              onClose={() => setIsAssignModalOpen(false)}
              onAssign={handleAssignOperator}
              currentNetCost={selectedBooking.netCost} 
              currency={selectedBooking.currency}
          />
      )}
    </div>
  );
};
