
import React, { useState } from 'react';
import { Quote, User, UserRole, Message } from '../types';
import { ItineraryView } from './ItineraryView';
import { ChatPanel } from './ChatPanel';
import { CheckCircle, XCircle, AlertTriangle, Briefcase, MapPin, Calendar, Users, DollarSign, Send, EyeOff } from 'lucide-react';

interface Props {
  quote: Quote;
  user: User;
  onUpdateStatus: (status: 'ACCEPTED' | 'DECLINED', reason?: string) => void;
  onSendMessage: (text: string) => void;
}

export const OperatorQuoteView: React.FC<Props> = ({ quote, user, onUpdateStatus, onSendMessage }) => {
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  const handleDeclineSubmit = () => {
    if (!declineReason.trim()) return;
    onUpdateStatus('DECLINED', declineReason);
    setShowDeclineModal(false);
  };

  const operatorStatus = quote.operatorStatus || 'PENDING';

  // --- STRICT PRICING LOGIC ---
  // 1. If operatorPrice is set, show that.
  // 2. If netCostVisibleToOperator is true, show net cost.
  // 3. Otherwise, show nothing/pending.
  const displayPrice = quote.operatorPrice 
      ? quote.operatorPrice 
      : (quote.netCostVisibleToOperator ? quote.cost : null);

  const hasPrice = displayPrice !== null && displayPrice !== undefined;

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Status Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 text-white p-6 flex justify-between items-start">
           <div className="flex gap-4">
              <div className="bg-slate-700 p-3 rounded-lg h-fit">
                  <Briefcase size={24} />
              </div>
              <div>
                  <h1 className="text-xl font-bold">Service Order #{quote.uniqueRefNo}</h1>
                  <p className="text-slate-400 text-sm mt-1">Operational Assignment</p>
                  
                  <div className="flex gap-4 mt-4 text-sm text-slate-300">
                      <div className="flex items-center gap-1.5"><MapPin size={14}/> {quote.destination}</div>
                      <div className="flex items-center gap-1.5"><Calendar size={14}/> {quote.travelDate}</div>
                      <div className="flex items-center gap-1.5"><Users size={14}/> {quote.paxCount} Pax</div>
                  </div>
              </div>
           </div>

           <div className="text-right">
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
          
          {/* 2. Main Content: Itinerary */}
          <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h2 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Operational Itinerary</h2>
                  <ItineraryView itinerary={quote.itinerary || []} />
              </div>
          </div>

          {/* 3. Sidebar: Pricing & Chat */}
          <div className="lg:col-span-1 space-y-6">
              
              {/* Privacy-Safe Pricing Box */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                      <DollarSign size={18} className="text-brand-600"/> Operational Revenue
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">Total amount payable to you for these services.</p>
                  
                  <div className={`p-4 rounded-lg border text-center ${hasPrice ? 'bg-slate-50 border-slate-200' : 'bg-slate-100 border-slate-200 border-dashed'}`}>
                      {hasPrice ? (
                          <>
                            <p className="text-3xl font-mono font-bold text-slate-800">
                                {quote.currency} {(displayPrice || 0).toLocaleString()}
                            </p>
                            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Net Payable</p>
                          </>
                      ) : (
                          <div className="py-2 text-slate-400 flex flex-col items-center">
                              <EyeOff size={24} className="mb-2 opacity-50" />
                              <span className="font-medium text-sm">Price Details Pending</span>
                              <span className="text-xs">Contact admin for confirmation</span>
                          </div>
                      )}
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-xs rounded border border-blue-100">
                      <p><strong>Note:</strong> This amount excludes any agent markups or platform fees. It is strictly the cost of services provided.</p>
                  </div>
              </div>

              {/* Communication Channel */}
              <ChatPanel 
                  user={user} 
                  messages={quote.messages} 
                  onSendMessage={onSendMessage} 
                  className="h-[500px]"
              />
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
