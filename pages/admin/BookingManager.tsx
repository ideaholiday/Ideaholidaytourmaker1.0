
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { bookingService } from '../../services/bookingService';
import { bookingOperatorService } from '../../services/bookingOperatorService';
import { Booking, BookingStatus, Message, UserRole, PaymentMode, CancellationType } from '../../types';
import { ChatPanel } from '../../components/ChatPanel';
import { BookingStatusTimeline } from '../../components/booking/BookingStatusTimeline';
import { PaymentPanel } from '../../components/booking/PaymentPanel';
import { CancellationReviewPanel } from '../../components/booking/CancellationReviewPanel';
import { AssignOperatorModal } from '../../components/booking/AssignOperatorModal';
import { ReminderHistory } from '../../components/payment/ReminderHistory'; // Import Added
import { CheckCircle, XCircle, PauseCircle, ChevronRight, Filter, Briefcase, UserPlus, AlertCircle, RefreshCw, Eye, EyeOff } from 'lucide-react';

export const BookingManager: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>(bookingService.getAllBookings());
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  
  // Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // Filter State
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'ALL'>('ALL');

  useEffect(() => {
      // Refresh on load
      setBookings(bookingService.getAllBookings());
  }, []);

  const handleUpdateStatus = (status: BookingStatus) => {
      if (!selectedBooking || !user) return;
      const reason = window.prompt("Enter reason/note for this update (Optional):");
      bookingService.updateStatus(selectedBooking.id, status, user, reason || undefined);
      refreshData();
  };

  const handleSendMessage = (text: string) => {
      if (!selectedBooking || !user) return;
      const msg: Message = {
          id: `msg_${Date.now()}`,
          senderId: user.id,
          senderName: user.name,
          senderRole: user.role,
          content: text,
          timestamp: new Date().toISOString(),
          isSystem: false
      };
      bookingService.addComment(selectedBooking.id, msg);
      refreshData();
  };

  const handleRecordPayment = (amount: number, mode: PaymentMode, reference: string) => {
      if (!selectedBooking || !user) return;
      bookingService.recordPayment(selectedBooking.id, amount, mode, reference, user);
      refreshData();
  };

  const handleProcessCancellation = (type: CancellationType, penalty: number, refund: number, note: string) => {
      if (!selectedBooking || !user) return;
      bookingService.processCancellation(selectedBooking.id, type, penalty, refund, note, user);
      refreshData();
  };

  const handleAssignOperator = (operatorId: string, operatorName: string, options: { priceMode: 'NET_COST' | 'FIXED_PRICE', price?: number, instructions?: string }) => {
      if (!selectedBooking || !user) return;
      bookingOperatorService.assignOperator(selectedBooking.id, operatorId, operatorName, options, user);
      refreshData();
  };

  const refreshData = () => {
      setBookings(bookingService.getAllBookings());
      if (selectedBooking) {
          setSelectedBooking(bookingService.getBooking(selectedBooking.id) || null);
      }
  };

  const filteredBookings = bookings.filter(b => statusFilter === 'ALL' || b.status === statusFilter);

  // Helper to determine if we can assign an operator
  const canAssignOperator = selectedBooking && selectedBooking.status === 'CONFIRMED';

  return (
    <div className="flex h-[calc(100vh-64px)]"> {/* Subtract navbar height */}
        
        {/* Sidebar List */}
        <div className="w-1/3 bg-white border-r border-slate-200 flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h2 className="font-bold text-slate-800">Bookings</h2>
                <button onClick={refreshData} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-500">
                    <RefreshCw size={14} />
                </button>
            </div>
            <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 overflow-x-auto">
                <div className="flex gap-2">
                    {['ALL', 'REQUESTED', 'CONFIRMED', 'CANCELLATION_REQUESTED', 'CANCELLED_WITH_REFUND'].map((s) => (
                        <button 
                            key={s} 
                            onClick={() => setStatusFilter(s as any)}
                            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusFilter === s ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
                        >
                            {s.replace(/_/g, ' ')}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
                {filteredBookings.map(b => (
                    <div 
                        key={b.id}
                        onClick={() => setSelectedBooking(b)}
                        className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition ${selectedBooking?.id === b.id ? 'bg-brand-50 border-l-4 border-l-brand-600' : ''}`}
                    >
                        <div className="flex justify-between items-start mb-1">
                            <span className="font-mono text-xs font-bold text-slate-500">{b.uniqueRefNo}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                b.status.includes('CANCEL') ? 'bg-red-100 text-red-700' :
                                b.status === 'REQUESTED' ? 'bg-amber-100 text-amber-700' :
                                b.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                                'bg-slate-100 text-slate-600'
                            }`}>{b.status.replace(/_/g, ' ')}</span>
                        </div>
                        <h3 className="font-medium text-slate-900 text-sm mb-1">{b.destination}</h3>
                        <p className="text-xs text-slate-500">{b.agentName} • {b.travelDate}</p>
                        
                        {/* Operator Status Dot */}
                        <div className="flex items-center gap-2 mt-2">
                            <div className="flex items-center gap-1">
                                <div className={`w-2 h-2 rounded-full ${
                                    b.paymentStatus === 'PAID_IN_FULL' ? 'bg-green-500' : 
                                    b.paymentStatus === 'ADVANCE_PAID' ? 'bg-blue-500' : 'bg-red-400'
                                }`}></div>
                                <span className="text-[10px] text-slate-400">{b.paymentStatus.replace('_', ' ')}</span>
                            </div>
                            {b.operatorStatus && (
                                <div className="flex items-center gap-1">
                                    <div className={`w-2 h-2 rounded-full ${
                                        b.operatorStatus === 'ACCEPTED' ? 'bg-green-500' : 
                                        b.operatorStatus === 'DECLINED' ? 'bg-red-500' : 'bg-amber-500'
                                    }`}></div>
                                    <span className="text-[10px] text-slate-400">OP: {b.operatorStatus}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Main Detail Area */}
        <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
            {selectedBooking ? (
                <>
                    <div className="p-6 bg-white border-b border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">Booking #{selectedBooking.uniqueRefNo}</h1>
                                <p className="text-slate-500 text-sm">Created {new Date(selectedBooking.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleUpdateStatus('ON_HOLD')} className="px-3 py-2 border border-amber-200 text-amber-700 rounded hover:bg-amber-50 text-sm font-medium flex items-center gap-1">
                                    <PauseCircle size={16} /> Hold
                                </button>
                                <button onClick={() => handleUpdateStatus('REJECTED')} className="px-3 py-2 border border-red-200 text-red-700 rounded hover:bg-red-50 text-sm font-medium flex items-center gap-1">
                                    <XCircle size={16} /> Reject
                                </button>
                                <button onClick={() => handleUpdateStatus('CONFIRMED')} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium flex items-center gap-2">
                                    <CheckCircle size={16} /> Confirm Booking
                                </button>
                            </div>
                        </div>
                        
                        <BookingStatusTimeline status={selectedBooking.status} />
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            
                            {/* Left Column */}
                            <div className="space-y-6">
                                
                                {/* OPERATOR ASSIGNMENT SECTION */}
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                            <Briefcase size={18} className="text-purple-600"/> Operator Assignment
                                        </h3>
                                    </div>
                                    <div className="p-5">
                                        {selectedBooking.operatorId ? (
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg">
                                                    <div>
                                                        <p className="text-xs text-slate-500 uppercase font-semibold">Assigned To</p>
                                                        <p className="font-bold text-slate-900">{selectedBooking.operatorName}</p>
                                                    </div>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                                        selectedBooking.operatorStatus === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
                                                        selectedBooking.operatorStatus === 'DECLINED' ? 'bg-red-100 text-red-700' :
                                                        'bg-amber-100 text-amber-700'
                                                    }`}>
                                                        {selectedBooking.operatorStatus || 'ASSIGNED'}
                                                    </span>
                                                </div>
                                                
                                                {/* Visibility Status */}
                                                <div className="flex justify-between items-center px-2">
                                                    <span className="text-xs text-slate-500 flex items-center gap-1">
                                                        {selectedBooking.operatorPrice ? <EyeOff size={12}/> : <Eye size={12}/>}
                                                        Pricing Mode:
                                                    </span>
                                                    <span className="text-xs font-mono font-medium text-slate-700">
                                                        {selectedBooking.operatorPrice ? `FIXED: ${selectedBooking.currency} ${selectedBooking.operatorPrice}` : 'NET COST SHARED'}
                                                    </span>
                                                </div>

                                                {/* Re-assign if declined */}
                                                {selectedBooking.operatorStatus === 'DECLINED' && (
                                                    <div className="bg-red-50 p-3 rounded text-sm text-red-700 mt-2 border border-red-100">
                                                        <p className="font-bold flex items-center gap-2"><AlertCircle size={14}/> Declined by Operator</p>
                                                        <p className="text-xs mt-1 italic">"{selectedBooking.operatorDeclineReason}"</p>
                                                        <button 
                                                            onClick={() => setIsAssignModalOpen(true)}
                                                            className="mt-3 text-xs bg-white border border-red-200 px-3 py-1.5 rounded hover:bg-red-50 transition font-medium"
                                                        >
                                                            Reassign Operator
                                                        </button>
                                                    </div>
                                                )}
                                                
                                                {selectedBooking.operatorStatus !== 'DECLINED' && (
                                                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-2 border-t border-slate-100 pt-2">
                                                        <CheckCircle size={12} className="text-green-500"/>
                                                        <span>Assignment active. {selectedBooking.operatorStatus === 'ACCEPTED' ? 'Operator has accepted.' : 'Waiting for acceptance.'}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-center py-6">
                                                <div className="bg-purple-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-purple-600">
                                                    <UserPlus size={24} />
                                                </div>
                                                <p className="text-sm text-slate-600 mb-1 font-medium">No Ground Operator Assigned</p>
                                                <p className="text-xs text-slate-400 mb-4">Assign a partner to handle execution.</p>
                                                
                                                {canAssignOperator ? (
                                                    <button 
                                                        onClick={() => setIsAssignModalOpen(true)}
                                                        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium text-sm transition flex items-center gap-2 mx-auto shadow-sm"
                                                    >
                                                        Assign Operator Now
                                                    </button>
                                                ) : (
                                                    <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded inline-block">
                                                        Confirm booking to enable assignment.
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Cancellation Panel */}
                                {(selectedBooking.status === 'CANCELLATION_REQUESTED' || selectedBooking.status.includes('CANCELLED')) && (
                                    <CancellationReviewPanel 
                                        booking={selectedBooking}
                                        onProcess={handleProcessCancellation}
                                    />
                                )}

                                {/* Payment Module */}
                                <PaymentPanel 
                                    booking={selectedBooking} 
                                    user={user!}
                                    onRecordPayment={handleRecordPayment}
                                />

                                {/* NEW: REMINDER HISTORY */}
                                <ReminderHistory booking={selectedBooking} />

                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                    <h3 className="font-bold text-slate-900 mb-3">Trip Details</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-slate-500 text-xs">Destination</p>
                                            <p className="font-medium">{selectedBooking.destination}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 text-xs">Travel Date</p>
                                            <p className="font-medium">{selectedBooking.travelDate}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 text-xs">Pax</p>
                                            <p className="font-medium">{selectedBooking.paxCount}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                    <h3 className="font-bold text-slate-900 mb-3">Financials (Locked)</h3>
                                    <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2 mb-2">
                                        <span className="text-slate-600">Net Cost</span>
                                        <span className="font-mono font-bold">{selectedBooking.netCost.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-600">Selling Price</span>
                                        <span className="font-mono font-bold">{selectedBooking.sellingPrice.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Chat */}
                            <div className="h-[500px]">
                                <ChatPanel 
                                    user={user!} 
                                    messages={selectedBooking.comments} 
                                    onSendMessage={handleSendMessage}
                                    className="h-full"
                                />
                            </div>
                        </div>
                    </div>
                    
                    {/* Modal Injection */}
                    <AssignOperatorModal 
                        isOpen={isAssignModalOpen}
                        onClose={() => setIsAssignModalOpen(false)}
                        onAssign={handleAssignOperator}
                        currentNetCost={selectedBooking.netCost}
                        currency={selectedBooking.currency}
                    />
                </>
            ) : (
                <div className="flex-1 flex items-center justify-center text-slate-400 bg-slate-50">
                    <div className="text-center">
                        <Briefcase size={48} className="mx-auto mb-4 opacity-20" />
                        <p>Select a booking to view details & manage assignments</p>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
