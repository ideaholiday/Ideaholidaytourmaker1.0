
import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

export const CancellationRequestModal: React.FC<Props> = ({ isOpen, onClose, onSubmit }) => {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    if (window.confirm("Are you sure you want to cancel this booking? This action cannot be undone.")) {
      onSubmit(reason);
      setReason('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle size={20} className="text-red-600" /> Request Cancellation
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        
        <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-800 mb-4">
          <p><strong>Warning:</strong> Cancellation charges may apply based on the booking policy. Once requested, you cannot edit this booking.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reason for Cancellation</label>
            <textarea 
              required
              autoFocus
              rows={4}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none"
              placeholder="e.g. Client medical emergency, Flight cancelled..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">Submit Request</button>
          </div>
        </form>
      </div>
    </div>
  );
};
