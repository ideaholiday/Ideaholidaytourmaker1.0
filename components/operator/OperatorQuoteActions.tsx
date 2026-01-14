
import React, { useState } from 'react';
import { Quote } from '../../types';
import { operatorAssignmentService } from '../../services/operatorAssignmentService';
import { Check, X, AlertTriangle, Loader2 } from 'lucide-react';

interface Props {
  quote: Quote;
  onRefresh: () => void;
}

export const OperatorQuoteActions: React.FC<Props> = ({ quote, onRefresh }) => {
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const status = quote.operatorStatus || 'ASSIGNED';

  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Accept this assignment? This confirms your availability and readiness.")) {
      setIsProcessing(true);
      await operatorAssignmentService.acceptAssignment(quote);
      setIsProcessing(false);
      onRefresh();
    }
  };

  const handleDeclineClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeclineReason('');
    setShowDeclineModal(true);
  };

  const submitDecline = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!declineReason.trim()) {
      alert("A reason is required to decline an assignment.");
      return;
    }

    setIsProcessing(true);
    await operatorAssignmentService.declineAssignment(quote, declineReason);
    setIsProcessing(false);
    setShowDeclineModal(false);
    onRefresh();
  };

  if (isProcessing) {
      return <span className="text-xs text-slate-400 flex items-center gap-1"><Loader2 size={12} className="animate-spin"/> Processing...</span>;
  }

  // If already processed, don't show buttons (Status column handles display)
  if (status === 'ACCEPTED' || status === 'DECLINED') {
      return null;
  }

  // Pending Actions
  return (
    <>
      <div className="flex items-center gap-2">
        <button 
          onClick={handleAccept}
          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-md text-xs font-bold transition shadow-sm"
          title="Accept Assignment"
        >
          <Check size={14} strokeWidth={3} /> Accept
        </button>
        <button 
          onClick={handleDeclineClick}
          className="flex items-center gap-1 px-3 py-1.5 bg-white text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-md text-xs font-medium transition"
          title="Decline Assignment"
        >
          <X size={14} /> Decline
        </button>
      </div>

      {showDeclineModal && (
        <div 
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm cursor-default"
            onClick={(e) => { e.stopPropagation(); setShowDeclineModal(false); }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm border border-slate-200"
            onClick={(e) => e.stopPropagation()} // Prevent click bubbling
          >
            <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500"/> Decline Assignment
            </h3>
            <p className="text-xs text-slate-500 mb-4">
                Please provide a reason for declining. This note will be sent to the admin team.
            </p>
            
            <form onSubmit={submitDecline}>
                <textarea
                className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none mb-4 min-h-[80px]"
                placeholder="e.g. No availability, Vehicle issue..."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                autoFocus
                required
                />
                
                <div className="flex justify-end gap-2">
                <button 
                    type="button"
                    onClick={() => setShowDeclineModal(false)}
                    className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                    Cancel
                </button>
                <button 
                    type="submit"
                    className="px-3 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm"
                >
                    Confirm Decline
                </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
