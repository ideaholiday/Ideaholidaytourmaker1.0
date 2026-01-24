import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { bookingService } from '../../services/bookingService';
import { bookingOperatorService } from '../../services/bookingOperatorService';
import { Booking, Message, UserRole, DriverDetails } from '../../types';
import { ItineraryView } from '../../components/ItineraryView';
import { ArrowLeft, MapPin, Calendar, Users, Briefcase, CheckCircle, Flag, XCircle, AlertTriangle, EyeOff, DollarSign, Play, Car, Phone, Edit2, Save, User as UserIcon } from 'lucide-react';

export const OperatorBookingView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState<Booking | null>(null);
  
  // Decline Logic
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  // Driver Logic
  const [isEditingDriver, setIsEditingDriver] = useState(false);
  const [driverForm, setDriverForm] = useState<DriverDetails>({
      name: '', phone: '', vehicleModel: '', vehicleNumber: ''
  });

  useEffect(() => {
    const load = async () => {
        if (id) {
            const found = await bookingService.getBooking(id);
            if (found && found.operatorId === user?.id) {
                setBooking(found);
                if (found.driverDetails) {
                    setDriverForm(found.driverDetails);
                }
            }
        }
    };
    load();
  }, [id, user]);

  if (!booking || !user) return <div className="p-8 text-center">Loading Booking...</div>;

  const refresh = async () => {
      const found = await bookingService.getBooking(booking.id);
      setBooking(found || null);
      if (found?.driverDetails) setDriverForm(found.driverDetails);
  };

  // --- WORKFLOW ACTIONS ---

  const handleStartService = async () => {
      if(window.confirm("Confirm Start of Service? This status will be visible to the Admin and Agent.")) {
          await bookingService.updateStatus(booking.id, 'IN_PROGRESS', user);
          refresh();
      }
  };

  const handleCompleteService = async () => {
      if(window.confirm("Mark this booking as Completed? Ensure all services are delivered.")) {
          await bookingService.updateStatus(booking.id, 'COMPLETED', user);
          refresh();
      }
  };

  const handleAccept = async () => {
      if(window.confirm("Accept this booking assignment? You confirm availability and pricing.")) {
          await bookingOperatorService.acceptAssignment(booking.id, user);
          refresh();
      }
  };

  const handleDecline = async () => {
      if(!declineReason.trim()) return;
      await bookingOperatorService.declineAssignment(booking.id, declineReason, user);
      setShowDeclineModal(false);
      refresh();
  };

  const handleSaveDriver = async (e: React.FormEvent) => {
      e.preventDefault();
      await bookingOperatorService.updateDriverDetails(booking.id, driverForm, user);
      setIsEditingDriver(false);
      refresh();
  };

  const displayPrice = booking.operatorPrice !== undefined 
      ? booking.operatorPrice 
      : (booking.netCostVisibleToOperator ? booking.netCost : null);
  
  const isCancelled = booking.status.includes('CANCEL');
  const assignmentStatus = booking.operatorStatus || 'ASSIGNED';

  const leadGuest = booking.travelers?.[0] 
    ? `${booking.travelers[0].title} ${booking.travelers[0].firstName} ${booking.travelers[0].lastName}`
    : 'Guest';

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
                <div className="flex flex-wrap gap-4 mt-4 text-sm text-slate-300">
                    <div className="flex items-center gap-1.5 bg-slate-800/50 px-2 py-1 rounded"><UserIcon size={14}/> <strong>Guest: {leadGuest}</strong></div>
                    <span className="flex items-center gap-1.5"><MapPin size={14}/> {booking.destination}</span>
                    <span className="flex items-center gap-1.5"><Calendar size={14}/> {booking.travelDate}</span>
                    <span className="flex items-center gap-1.5"><Users size={14}/> {booking.paxCount} Pax</span>
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

            <div className="lg:col-span-1 p-6 flex flex-col h-full space-y-6">
                {/* Operator Pricing Box */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
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
                </div>

                {/* Driver Details Card - Only show if Accepted */}
                {assignmentStatus === 'ACCEPTED' && (
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-slate-800 font-bold flex items-center gap-2"><Car size={18}/> Driver & Vehicle</h3>
                            {!isEditingDriver && (
                                <button 
                                    onClick={() => setIsEditingDriver(true)} 
                                    className="text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 px-2 py-1 rounded transition flex items-center gap-1"
                                >
                                    <Edit2 size={12}/> Edit
                                </button>
                            )}
                        </div>

                        {isEditingDriver ? (
                            <form onSubmit={handleSaveDriver} className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Driver Name</label>
                                    <input required type="text" value={driverForm.name} onChange={e => setDriverForm({...driverForm, name: e.target.value})} className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Phone Number</label>
                                    <input required type="text" value={driverForm.phone} onChange={e => setDriverForm({...driverForm, phone: e.target.value})} className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Vehicle Model</label>
                                        <input required type="text" placeholder="e.g. Innova" value={driverForm.vehicleModel} onChange={e => setDriverForm({...driverForm, vehicleModel: e.target.value})} className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Vehicle No</label>
                                        <input required type="text" placeholder="KA-01-AB-1234" value={driverForm.vehicleNumber} onChange={e => setDriverForm({...driverForm, vehicleNumber: e.target.value})} className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button type="button" onClick={() => setIsEditingDriver(false)} className="flex-1 py-1.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">Cancel</button>
                                    <button type="submit" className="flex-1 py-1.5 bg-brand-600 text-white rounded text-xs font-bold flex items-center justify-center gap-1"><Save size={12}/> Save</button>
                                </div>
                            </form>
                        ) : (
                            booking.driverDetails ? (
                                <div className="space-y-3 text-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-slate-100 p-2 rounded-full text-slate-500"><Users size={16}/></div>
                                        <div>
                                            <p className="font-bold text-slate-900">{booking.driverDetails.name}</p>
                                            <p className="text-xs text-slate-500">Driver</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="bg-slate-100 p-2 rounded-full text-slate-500"><Phone size={16}/></div>
                                        <div>
                                            <p className="font-bold text-slate-900">{booking.driverDetails.phone}</p>
                                            <p className="text-xs text-slate-500">Contact</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="bg-slate-100 p-2 rounded-full text-slate-500"><Car size={16}/></div>
                                        <div>
                                            <p className="font-bold text-slate-900">{booking.driverDetails.vehicleModel}</p>
                                            <p className="text-xs text-slate-500">{booking.driverDetails.vehicleNumber}</p>
                                        </div>
                                    </div>
                                    <div className="bg-green-50 text-green-700 text-xs px-3 py-2 rounded-lg border border-green-100 mt-2 flex items-center gap-2">
                                        <CheckCircle size={14} /> Assigned & Shared with Agent
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                                    <Car size={24} className="mx-auto text-slate-300 mb-2" />
                                    <p className="text-xs text-slate-500 mb-3">No driver details assigned yet.</p>
                                    <button 
                                        onClick={() => setIsEditingDriver(true)}
                                        className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded font-medium text-slate-700 hover:text-brand-600 transition shadow-sm"
                                    >
                                        + Assign Driver
                                    </button>
                                </div>
                            )
                        )}
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Decline Modal */}
      {showDeclineModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Decline Booking Assignment</h3>
                  <p className="text-sm text-slate-600 mb-4">Please provide a reason. This will be sent to admin.</p>
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