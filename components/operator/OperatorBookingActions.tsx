
import React, { useState } from 'react';
import { Booking } from '../../types';
import { bookingOperatorService } from '../../services/bookingOperatorService';
import { useAuth } from '../../context/AuthContext';
import { Check, X, AlertTriangle } from 'lucide-react';

interface Props {
  booking: Booking;
  onRefresh: () => void;
}

export const OperatorBookingActions: React.FC<Props> = ({ booking, onRefresh }) => {
  const { user } = useAuth();
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  if (!user) return null;

  const status = booking.operatorStatus || 'ASSIGNED';

  const handleAccept = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Accept this booking assignment? You confirm availability and pricing.")) {
      bookingOperatorService.acceptAssignment(booking.id, user);
      onRefresh();
    }
  };

  const handleDeclineClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeclineModal(true);
  };

  const submitDecline = () => {
    if (!declineReason.trim()) {
      alert("Please provide a reason.");
      return;
    }
    bookingOperatorService.declineAssignment(booking.id, declineReason, user);
    setShowDeclineModal(false);
    onRefresh();
  };

  // If already processed
  if (status === 'ACCEPTED') {
      return <span className="text-xs font-bold text-green-600 flex items-center gap-1"><Check size={14}/> Accepted</span>;
  }

  if (status === 'DECLINED') {
      return <span className="text-xs font-bold text-red-600 flex items-center gap-1"><X size={14}/> Declined</span>;
  }

  // Pending Actions
  return (
    <>
      <div className="flex items-center gap-2">
        <button 
          onClick={handleAccept}
          className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded text-xs font-bold transition"
          title="Accept Assignment"
        >
          <Check size={14} /> Accept
        </button>
        <button 
          onClick={handleDeclineClick}
          className="flex items-center gap-1 px-3 py-1.5 bg-white text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded text-xs font-medium transition"
          title="Decline Assignment"
        >
          <X size={14} /> Decline
        </button>
      </div>

      {showDeclineModal && (
        <div 
            className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500"/> Decline Booking
            </h3>
            <p className="text-xs text-slate-500 mb-4">Why are you declining this booking?</p>
            
            <textarea
              className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none mb-4"
              rows={3}
              placeholder="e.g. Fully booked, Service unavailable..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              autoFocus
            />
            
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setShowDeclineModal(false)}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button 
                onClick={submitDecline}
                className="px-3 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
