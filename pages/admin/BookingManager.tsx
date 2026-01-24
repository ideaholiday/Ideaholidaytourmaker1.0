
import React, { useState, useEffect } from 'react';
import { bookingService } from '../../services/bookingService';
import { bookingOperatorService } from '../../services/bookingOperatorService';
import { Booking, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { AssignOperatorModal } from '../../components/booking/AssignOperatorModal';
import { Search, Eye, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const BookingManager: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [search, setSearch] = useState('');
  
  // Assign Operator Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    setBookings(await bookingService.getAllBookings());
  };

  const handleAssignOperator = (operatorId: string, operatorName: string, options: any) => {
      if (!selectedBooking || !user) return;
      
      bookingOperatorService.assignOperator(
          selectedBooking.id,
          operatorId,
          operatorName,
          options,
          user
      );
      
      loadBookings();
      setIsAssignModalOpen(false);
  };

  const openAssignModal = (booking: Booking) => {
      setSelectedBooking(booking);
      setIsAssignModalOpen(true);
  };

  const filteredBookings = bookings.filter(b => 
      (b.uniqueRefNo || '').toLowerCase().includes(search.toLowerCase()) || 
      (b.agentName || '').toLowerCase().includes(search.toLowerCase()) ||
      (b.destination || '').toLowerCase().includes(search.toLowerCase())
  );

  if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.STAFF)) return <div>Unauthorized</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Booking Manager</h1>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input 
                  type="text" 
                  placeholder="Search bookings..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              />
          </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                      <th className="px-6 py-4 font-semibold">Ref No</th>
                      <th className="px-6 py-4 font-semibold">Destination</th>
                      <th className="px-6 py-4 font-semibold">Agent</th>
                      <th className="px-6 py-4 font-semibold">Operator</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                      <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                  {filteredBookings.map(b => (
                      <tr key={b.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-mono font-medium text-brand-600">{b.uniqueRefNo || 'N/A'}</td>
                          <td className="px-6 py-4">{b.destination || '-'}</td>
                          <td className="px-6 py-4">{b.agentName || '-'}</td>
                          <td className="px-6 py-4">
                              {b.operatorName ? (
                                  <span className="text-slate-900 font-medium">{b.operatorName}</span>
                              ) : (
                                  <span className="text-slate-400 italic">Unassigned</span>
                              )}
                          </td>
                          <td className="px-6 py-4">
                              <span className="px-2 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                                  {b.status}
                              </span>
                          </td>
                          <td className="px-6 py-4 text-right flex justify-end gap-2">
                              <button 
                                  onClick={() => openAssignModal(b)}
                                  className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                  title="Assign Operator"
                              >
                                  <UserPlus size={16} />
                              </button>
                              <button 
                                  onClick={() => navigate(`/booking/${b.id}`)}
                                  className="p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded transition"
                                  title="View Details"
                              >
                                  <Eye size={16} />
                              </button>
                          </td>
                      </tr>
                  ))}
                  {filteredBookings.length === 0 && (
                      <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                              No bookings found matching search.
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
