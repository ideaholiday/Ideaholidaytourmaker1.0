
import React, { useState } from 'react';
import { X, Mail, CheckCircle, FileText, AlertTriangle, Send, Loader2 } from 'lucide-react';
import { BookingStatus } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSend: (type: string) => void;
  isSending: boolean;
  bookingStatus: BookingStatus;
}

export const EmailActionModal: React.FC<Props> = ({ isOpen, onClose, onSend, isSending, bookingStatus }) => {
  const [selectedType, setSelectedType] = useState('BOOKING_CONFIRMATION');

  if (!isOpen) return null;

  const options = [
    {
      id: 'BOOKING_CONFIRMATION',
      label: 'Booking Confirmation',
      icon: <CheckCircle size={18} className="text-green-600" />,
      desc: 'Official confirmation with itinerary link.'
    },
    {
      id: 'PAYMENT_RECEIPT',
      label: 'Payment Receipt',
      icon: <FileText size={18} className="text-blue-600" />,
      desc: 'Acknowledgment of received funds.'
    },
    {
      id: 'QUOTE',
      label: 'Quote Proposal',
      icon: <Mail size={18} className="text-amber-600" />,
      desc: 'Detailed itinerary proposal.'
    },
    {
      id: 'CANCELLATION',
      label: 'Cancellation Notice',
      icon: <AlertTriangle size={18} className="text-red-600" />,
      desc: 'Formal cancellation update.'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
             <Mail size={20} className="text-brand-600" /> Send Email Notification
          </h3>
          <button onClick={onClose} disabled={isSending} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-3">
            <p className="text-sm text-slate-500 mb-2">Select the type of email to generate and send to the agent:</p>
            
            {options.map((opt) => (
                <div 
                    key={opt.id}
                    onClick={() => setSelectedType(opt.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedType === opt.id 
                        ? 'bg-brand-50 border-brand-500 ring-1 ring-brand-500' 
                        : 'bg-white border-slate-200 hover:border-brand-300'
                    }`}
                >
                    <div className={`p-2 rounded-full bg-white border border-slate-100 shadow-sm`}>
                        {opt.icon}
                    </div>
                    <div>
                        <p className={`text-sm font-bold ${selectedType === opt.id ? 'text-brand-900' : 'text-slate-700'}`}>
                            {opt.label}
                        </p>
                        <p className="text-xs text-slate-500">{opt.desc}</p>
                    </div>
                    {selectedType === opt.id && <div className="ml-auto w-2 h-2 bg-brand-600 rounded-full"></div>}
                </div>
            ))}
        </div>

        <div className="p-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
             <button 
                onClick={onClose}
                disabled={isSending}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium"
             >
                 Cancel
             </button>
             <button 
                onClick={() => onSend(selectedType)}
                disabled={isSending}
                className="px-6 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition flex items-center gap-2 shadow-lg disabled:opacity-70"
             >
                 {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                 {isSending ? 'Generating & Sending...' : 'Send Now'}
             </button>
        </div>
      </div>
    </div>
  );
};
