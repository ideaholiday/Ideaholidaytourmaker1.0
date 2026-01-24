
import React, { useState, useEffect } from 'react';
import { Quote, User, UserRole, Message, OperationalDetails } from '../types';
import { ItineraryView } from './ItineraryView';
import { ChatPanel } from './ChatPanel';
import { agentService } from '../services/agentService';
import { bookingService } from '../services/bookingService';
import { CheckCircle, XCircle, AlertTriangle, Briefcase, MapPin, Calendar, Users, DollarSign, EyeOff, User as UserIcon, Truck, Link as LinkIcon, Phone, Save, CreditCard, MessageSquare, Loader2 } from 'lucide-react';

interface Props {
  quote: Quote;
  user: User;
  onUpdateStatus: (status: 'ACCEPTED' | 'DECLINED', reason?: string) => void;
  onSendMessage: (text: string) => void; 
}

export const OperatorQuoteView: React.FC<Props> = ({ quote, user, onUpdateStatus, onSendMessage }) => {
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  
  // Operational Details State
  const [opDetails, setOpDetails] = useState<OperationalDetails>(quote.operationalDetails || {});
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  useEffect(() => {
    // Sync local state if prop updates
    if (quote.operationalDetails) {
        setOpDetails(quote.operationalDetails);
    }
  }, [quote.operationalDetails]);

  const handleDeclineSubmit = () => {
    if (!declineReason.trim()) return;
    onUpdateStatus('DECLINED', declineReason);
    setShowDeclineModal(false);
  };

  const handleSaveOperationalDetails = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSavingDetails(true);
      try {
          await agentService.updateOperationalDetails(quote.id, opDetails);
          alert("Operational details updated successfully.");
      } catch (error) {
          console.error("Failed to save operational details", error);
          alert("Failed to save details.");
      } finally {
          setIsSavingDetails(false);
      }
  };

  const handleSendMessage = async (text: string) => {
      const newMessage: Message = {
          id: `msg_${Date.now()}`,
          senderId: user.id,
          senderName: user.name,
          senderRole: user.role,
          content: text,
          timestamp: new Date().toISOString(),
          isSystem: false
      };
      
      // Update local UI immediately for responsiveness (optional)
      // Note: Parent component or Context usually handles refresh, here we trigger service directly
      // Since `Quote` object in props might be stale until refresh, we assume service handles DB push
      await bookingService.addComment(quote.id, newMessage); // Using bookingService common message handler or agentService specific
      onSendMessage(text); // Notify parent to refresh
  };

  const operatorStatus = quote.operatorStatus || 'PENDING';
  const isAccepted = operatorStatus === 'ACCEPTED';

  const displayPrice = quote.operatorPrice 
      ? quote.operatorPrice 
      : (quote.netCostVisibleToOperator ? quote.cost : null);

  const hasPrice = displayPrice !== null && displayPrice !== undefined;

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Status Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 text-white p-6 flex flex-col md:flex-row justify-between items-start">
           <div className="flex gap-4">
              <div className="bg-slate-700 p-3 rounded-lg h-fit">
                  <Briefcase size={24} />
              </div>
              <div>
                  <h1 className="text-xl font-bold">Service Order #{quote.uniqueRefNo}</h1>
                  <p className="text-slate-400 text-sm mt-1">Operational Assignment</p>
                  
                  <div className="flex flex-wrap gap-4 mt-4 text-sm text-slate-300">
                      <div className="flex items-center gap-1.5"><MapPin size={14}/> {quote.destination}</div>
                      <div className="flex items-center gap-1.5"><Calendar size={14}/> {quote.travelDate}</div>
                      <div className="flex items-center gap-1.5"><Users size={14}/> {quote.paxCount} Pax</div>
                      <div className="flex items-center gap-1.5 font-medium text-white"><UserIcon size={14}/> {quote.leadGuestName || 'Guest'}</div>
                  </div>
              </div>
           </div>

           <div className="text-right mt-4 md:mt-0">
               <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                   operatorStatus === 'ACCEPTED' ? 'bg-green-500 text-white' :
                   operatorStatus === 'DECLINED' ? 'bg-red-500 text-white' :
                   'bg-amber-500 text-white'
               }`}>
                   {operatorStatus === 'ACCEPTED' && <CheckCircle size={14} />}
                   {operatorStatus === 'DECLINED' && <XCircle size={14} />}
                   {operatorStatus === 'PENDING' && <AlertTriangle size={14} />}
                   {operatorStatus === 'ASSIGNED' ? 'NEW REQUEST' : operatorStatus}
               </div>
               <p className="text-xs text-slate-400 mt-2">Assignment Status</p>
           </div>
        </div>

        {/* Action Bar (Only visible if Pending/Assigned) */}
        {(operatorStatus === 'PENDING' || operatorStatus === 'ASSIGNED') && (
            <div className="p-4 bg-amber-50 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-amber-900 text-sm flex items-center gap-2">
                    <AlertTriangle size={18} />
                    <span><strong>Action Required:</strong> Please accept or decline this assignment to proceed.</span>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowDeclineModal(true)}
                        className="px-4 py-2 bg-white border border-red-200 text-red-700 rounded-lg hover:bg-red-50 text-sm font-medium transition"
                    >
                        Decline
                    </button>
                    <button 
                        onClick={() => onUpdateStatus('ACCEPTED')}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-bold shadow-sm transition flex items-center gap-2"
                    >
                        <CheckCircle size={16} /> Accept Assignment
                    </button>
                </div>
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 2. Main Content */}
          <div className="lg:col-span-2 space-y-6">
              
              {/* OPERATIONAL EXECUTION FORM (Only if Accepted) */}
              {isAccepted && (
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 border-l-4 border-l-brand-600">
                      <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                          <Truck size={20} className="text-brand-600" /> Operational Execution Details
                      </h2>
                      <form onSubmit={handleSaveOperationalDetails}>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Trip Manager Name</label>
                                  <input 
                                      type="text" 
                                      className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                                      placeholder="e.g. Rahul Singh"
                                      value={opDetails.tripManagerName || ''}
                                      onChange={e => setOpDetails({...opDetails, tripManagerName: e.target.value})}
                                  />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Manager Contact</label>
                                  <input 
                                      type="text" 
                                      className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                                      placeholder="+91..."
                                      value={opDetails.tripManagerPhone || ''}
                                      onChange={e => setOpDetails({...opDetails, tripManagerPhone: e.target.value})}
                                  />
                              </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                               <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Driver Name</label>
                                  <input 
                                      type="text" 
                                      className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                                      placeholder="Driver Name"
                                      value={opDetails.driverName || ''}
                                      onChange={e => setOpDetails({...opDetails, driverName: e.target.value})}
                                  />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Driver Phone</label>
                                  <input 
                                      type="text" 
                                      className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                                      placeholder="+91..."
                                      value={opDetails.driverPhone || ''}
                                      onChange={e => setOpDetails({...opDetails, driverPhone: e.target.value})}
                                  />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vehicle Model</label>
                                  <input 
                                      type="text" 
                                      className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                                      placeholder="e.g. Innova Crysta"
                                      value={opDetails.vehicleModel || ''}
                                      onChange={e => setOpDetails({...opDetails, vehicleModel: e.target.value})}
                                  />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vehicle Number</label>
                                  <input 
                                      type="text" 
                                      className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                                      placeholder="XX-00-XX-0000"
                                      value={opDetails.vehicleNumber || ''}
                                      onChange={e => setOpDetails({...opDetails, vehicleNumber: e.target.value})}
                                  />
                              </div>
                          </div>

                          <div className="mb-6">
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">WhatsApp Group Link</label>
                              <div className="relative">
                                  <LinkIcon size={16} className="absolute left-3 top-2.5 text-slate-400" />
                                  <input 
                                      type="url" 
                                      className="w-full pl-10 border border-slate-300 rounded-lg p-2 text-sm text-blue-600"
                                      placeholder="https://chat.whatsapp.com/..."
                                      value={opDetails.whatsappGroupLink || ''}
                                      onChange={e => setOpDetails({...opDetails, whatsappGroupLink: e.target.value})}
                                  />
                              </div>
                              <p className="text-[10px] text-slate-400 mt-1">Paste the invite link for the trip coordination group.</p>
                          </div>

                          <div className="flex justify-end">
                              <button 
                                  type="submit" 
                                  disabled={isSavingDetails}
                                  className="bg-brand-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-brand-700 transition flex items-center gap-2 disabled:opacity-70"
                              >
                                  {isSavingDetails ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
                                  Save Operational Details
                              </button>
                          </div>
                      </form>
                  </div>
              )}

              {/* Itinerary */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h2 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Operational Itinerary</h2>
                  <ItineraryView itinerary={quote.itinerary || []} />
              </div>
          </div>

          {/* 3. Sidebar: Pricing & Chat */}
          <div className="lg:col-span-1 space-y-6">
              
              {/* Payment Status (Admin Controlled) */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <CreditCard size={18} className="text-green-600"/> Payment Status
                  </h3>
                  
                  <div className="mb-4">
                      <p className="text-xs text-slate-500 uppercase font-bold mb-1">Status from Admin</p>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold border ${
                          opDetails.paymentStatus === 'CLEARED' ? 'bg-green-50 text-green-700 border-green-200' :
                          opDetails.paymentStatus === 'PARTIAL' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                          {opDetails.paymentStatus === 'CLEARED' && <CheckCircle size={14} />}
                          {opDetails.paymentStatus || 'PENDING'}
                      </span>
                  </div>

                  {opDetails.paymentNotes && (
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-600">
                          <strong>Note:</strong> {opDetails.paymentNotes}
                      </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex justify-between items-center text-sm">
                           <span className="text-slate-600">Payable Amount</span>
                           {hasPrice ? (
                               <span className="font-mono font-bold text-slate-900">{quote.currency} {(displayPrice || 0).toLocaleString()}</span>
                           ) : (
                               <span className="text-slate-400 italic">Hidden</span>
                           )}
                      </div>
                  </div>
              </div>

              {/* Chat Panel */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[500px]">
                  <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                      <MessageSquare size={18} className="text-brand-600" />
                      <h3 className="font-bold text-slate-900 text-sm">Admin Communication</h3>
                  </div>
                  <div className="flex-1 overflow-hidden relative">
                      <ChatPanel 
                          user={user} 
                          messages={quote.messages || []} 
                          onSendMessage={handleSendMessage}
                          className="h-full border-none shadow-none rounded-none" 
                      />
                  </div>
              </div>
          </div>
      </div>

      {/* Decline Modal */}
      {showDeclineModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Decline Assignment</h3>
                  <p className="text-sm text-slate-600 mb-4">Please provide a reason for declining. This will be sent to the admin team.</p>
                  
                  <textarea 
                      className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none h-32 resize-none"
                      placeholder="e.g. No availability for these dates..."
                      value={declineReason}
                      onChange={(e) => setDeclineReason(e.target.value)}
                  />
                  
                  <div className="flex justify-end gap-3 mt-4">
                      <button onClick={() => setShowDeclineModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">Cancel</button>
                      <button onClick={handleDeclineSubmit} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">Confirm Decline</button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};
