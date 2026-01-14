
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { bookingService } from '../../services/bookingService';
import { bookingOperatorService } from '../../services/bookingOperatorService';
import { Booking, Message, UserRole } from '../../types';
import { ChatPanel } from '../../components/ChatPanel';
import { ItineraryView } from '../../components/ItineraryView';
import { ArrowLeft, MapPin, Calendar, Users, Briefcase, CheckCircle, Flag, XCircle, AlertTriangle, EyeOff, DollarSign, Play } from 'lucide-react';

export const OperatorBookingView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState<Booking | null>(null);
  
  // Decline Logic
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  useEffect(() => {
    if (id) {
      const found = bookingService.getBooking(id);
      // Security check: Operator must be assigned
      if (found && found.operatorId === user?.id) {
          setBooking(found);
      }
    }
  }, [id, user]);

  if (!booking || !user) return <div className="p-8 text-center">Loading Booking...</div>;

  const refresh = () => setBooking(bookingService.getBooking(booking!.id) || null);

  const handleSendMessage = (text: string) => {
    const msg: Message = {
      id: `msg_${Date.now()}`,
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role,
      content: text,
      timestamp: new Date().toISOString(),
      isSystem: false
    };
    bookingService.addComment(booking.id, msg);
    refresh();
  };

  // --- WORKFLOW ACTIONS ---

  const handleStartService = () => {
      if(window.confirm("Confirm Start of Service? This status will be visible to the Admin and Agent.")) {
          bookingService.updateStatus(booking.id, 'IN_PROGRESS', user);
          refresh();
      }
  };

  const handleCompleteService = () => {
      if(window.confirm("Mark this booking as Completed? Ensure all services are delivered.")) {
          bookingService.updateStatus(booking.id, 'COMPLETED', user);
          refresh();
      }
  };

  const handleAccept = () => {
      if(window.confirm("Accept this booking assignment? You confirm availability and pricing.")) {
          bookingOperatorService.acceptAssignment(booking.id, user);
          refresh();
      }
  };

  const handleDecline = () => {
      if(!declineReason.trim()) return;
      bookingOperatorService.declineAssignment(booking.id, declineReason, user);
      setShowDeclineModal(false);
      refresh();
  };

  // Pricing Privacy Logic: Shows what the Operator earns, NOT what the Client pays.
  const displayPrice = booking.operatorPrice !== undefined 
      ? booking.operatorPrice 
      : (booking.netCostVisibleToOperator ? booking.netCost : null);
  
  const isCancelled = booking.status.includes('CANCEL');
  const assignmentStatus = booking.operatorStatus || 'ASSIGNED';

  return (
    <div className="container mx-auto px-4 py-8">
      <button onClick={() => navigate('/operator/assigned-bookings')} className="flex items-center text-slate-500 hover:text-slate-800 mb-6">
        <ArrowLeft size={18} className="mr-1" /> Back to List
      </button>

      {/* NEW ASSIGNMENT BANNER */}
      {assignmentStatus === 'ASSIGNED' && !isCancelled && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
              <div className="flex items-start gap-3">
                  <AlertTriangle size={24} className="text-amber-600 shrink-0 mt-1" />
                  <div>
                      <h3 className="font-bold text-amber-900 text-lg">New Booking Assignment</h3>
                      <p className="text-amber-800 text-sm">Please review the itinerary and pricing below. Accept to start execution.</p>
                      {booking.operatorInstruction && (
                          <div className="mt-2 text-sm bg-white/50 p-2 rounded text-amber-900 border border-amber-100">
                              <strong>Note from Admin:</strong> {booking.operatorInstruction}
                          </div>
                      )}
                  </div>
              </div>
              <div className="flex gap-3 shrink-0">
                  <button onClick={() => setShowDeclineModal(true)} className="px-5 py-2.5 bg-white border border-red-200 text-red-700 font-bold rounded-lg hover:bg-red-50 transition">
                      Decline
                  </button>
                  <button onClick={handleAccept} className="px-6 py-2.5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-md transition flex items-center gap-2">
                      <CheckCircle size={18} /> Accept Booking
                  </button>
              </div>
          </div>
      )}

      {/* DECLINED BANNER */}
      {assignmentStatus === 'DECLINED' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-800 flex items-center gap-3">
              <XCircle size={20} />
              <p>You have declined this assignment. Reason: <strong>{booking.operatorDeclineReason}</strong></p>
          </div>
      )}

      {/* MAIN HEADER */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden mb-8">
        <div className={`text-white p-6 flex flex-col md:flex-row justify-between items-start md:items-center ${isCancelled ? 'bg-red-900' : 'bg-slate-900'}`}>
            <div>
                <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold">Execution Order #{booking.uniqueRefNo}</h1>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        booking.status === 'COMPLETED' ? 'bg-green-500' : 
                        booking.status === 'IN_PROGRESS' ? 'bg-blue-500' : 
                        isCancelled ? 'bg-red-500' :
                        'bg-slate-600'
                    }`}>
                        {isCancelled ? 'CANCELLED' : booking.status.replace('_', ' ')}
                    </span>
                </div>
                <div className="flex gap-4 mt-2 text-sm text-slate-300">
                    <span className="flex items-center gap-1"><MapPin size={14}/> {booking.destination}</span>
                    <span className="flex items-center gap-1"><Calendar size={14}/> {booking.travelDate}</span>
                    <span className="flex items-center gap-1"><Users size={14}/> {booking.paxCount} Pax</span>
                </div>
            </div>
            
            {/* EXECUTION CONTROLS */}
            <div className="flex gap-3 mt-4 md:mt-0">
                {assignmentStatus === 'ACCEPTED' && !isCancelled && (
                    <>
                        {booking.status === 'CONFIRMED' && (
                            <button onClick={handleStartService} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm font-bold shadow-lg transition">
                                <Play size={16} /> Start Service
                            </button>
                        )}
                        
                        {booking.status === 'IN_PROGRESS' && (
                            <button onClick={handleCompleteService} className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm font-bold shadow-lg transition">
                                <Flag size={16} /> Mark Completed
                            </button>
                        )}

                        {booking.status === 'COMPLETED' && (
                            <div className="flex items-center gap-2 bg-green-800 text-green-100 px-4 py-2 rounded-lg text-sm">
                                <CheckCircle size={16} /> Service Delivered
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3">
            <div className="lg:col-span-2 p-6 border-r border-slate-200">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Service Itinerary</h2>
                <ItineraryView itinerary={booking.itinerary} />
            </div>

            <div className="lg:col-span-1 p-6 flex flex-col h-full">
                {/* Operator Pricing Box - EXPLICITLY LABELED AS OPERATIONAL REVENUE */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 shadow-sm">
                    <h3 className="text-slate-800 font-bold mb-1 flex items-center gap-2"><DollarSign size={18}/> Operational Revenue</h3>
                    <p className="text-xs text-slate-500 mb-4">Amount payable to YOU for these services.</p>
                    
                    {displayPrice !== null ? (
                        <div className="text-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <span className="text-2xl font-mono font-bold text-slate-900">{booking.currency} {displayPrice.toLocaleString()}</span>
                            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wide font-semibold">Net Receivable</p>
                        </div>
                    ) : (
                        <div className="text-center py-4 bg-slate-50 rounded-lg border border-slate-200 border-dashed">
                            <EyeOff size={24} className="mx-auto text-slate-300 mb-2" />
                            <p className="text-sm text-slate-500 italic">Price details pending</p>
                        </div>
                    )}
                    
                    <div className="mt-3 p-2 bg-blue-50 border border-blue-100 rounded text-[10px] text-blue-700 leading-tight">
                        <strong>Privacy Notice:</strong> Client payment status (Advance/Balance) is handled by the platform and hidden from ground operations.
                    </div>
                </div>

                <div className="flex-1 flex flex-col">
                    <ChatPanel 
                        user={user} 
                        messages={booking.comments} 
                        onSendMessage={handleSendMessage}
                        className="flex-1" 
                    />
                </div>
            </div>
        </div>
      </div>

      {/* Decline Modal */}
      {showDeclineModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Decline Booking Assignment</h3>
                  <p className="text-sm text-slate-500 mb-4">Please provide a reason. This will be sent to admin.</p>
                  <textarea 
                      className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none h-32 resize-none mb-4"
                      placeholder="e.g. Fully booked for these dates..."
                      value={declineReason}
                      onChange={e => setDeclineReason(e.target.value)}
                  />
                  <div className="flex justify-end gap-3">
                      <button onClick={() => setShowDeclineModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">Cancel</button>
                      <button onClick={handleDecline} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-bold">Confirm Decline</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
