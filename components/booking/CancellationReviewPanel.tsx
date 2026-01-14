
import React, { useState, useEffect } from 'react';
import { Booking, CancellationType } from '../../types';
import { Calculator, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface Props {
  booking: Booking;
  onProcess: (type: CancellationType, penalty: number, refund: number, note: string) => void;
}

export const CancellationReviewPanel: React.FC<Props> = ({ booking, onProcess }) => {
  const [type, setType] = useState<CancellationType>('PARTIAL');
  const [penalty, setPenalty] = useState<number>(0);
  const [adminNote, setAdminNote] = useState('');
  
  const totalPaid = booking.paidAmount || 0;
  const refundAmount = Math.max(0, totalPaid - penalty);

  useEffect(() => {
    // Reset defaults when booking changes
    setPenalty(0);
    setType('PARTIAL');
  }, [booking.id]);

  const handlePenaltyChange = (val: number) => {
      setPenalty(val);
      if (val === 0) setType('FREE');
      else if (val >= totalPaid) setType('NON_REFUNDABLE');
      else setType('PARTIAL');
  };

  const handleTypeChange = (t: CancellationType) => {
      setType(t);
      if (t === 'FREE') setPenalty(0);
      if (t === 'NON_REFUNDABLE') setPenalty(totalPaid);
      // Partial keeps existing penalty or defaults to 0
  };

  const handleSubmit = () => {
      if (window.confirm(`Confirm Cancellation?\n\nPenalty: ${penalty}\nRefund: ${refundAmount}`)) {
          onProcess(type, penalty, refundAmount, adminNote);
      }
  };

  // If already cancelled, show summary
  if (booking.status.includes('CANCELLED') && booking.status !== 'CANCELLATION_REQUESTED') {
      const details = booking.cancellation;
      return (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                  <XCircle size={24} className="text-red-600" />
                  <h3 className="text-lg font-bold text-red-900">Booking Cancelled</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                      <span className="text-red-700 block text-xs uppercase">Type</span>
                      <span className="font-bold text-slate-800">{details?.type?.replace('_', ' ')}</span>
                  </div>
                  <div>
                      <span className="text-red-700 block text-xs uppercase">Penalty Charged</span>
                      <span className="font-bold text-slate-800">{booking.currency} {details?.penaltyAmount?.toLocaleString()}</span>
                  </div>
                  <div>
                      <span className="text-red-700 block text-xs uppercase">Refund Amount</span>
                      <span className="font-bold text-green-700">{booking.currency} {details?.refundAmount?.toLocaleString()}</span>
                  </div>
                  <div>
                      <span className="text-red-700 block text-xs uppercase">Status</span>
                      <span className="font-bold text-slate-800">{details?.refundStatus}</span>
                  </div>
              </div>
              {details?.adminNote && (
                  <div className="mt-4 pt-4 border-t border-red-200 text-sm text-red-800 italic">
                      " {details.adminNote} "
                  </div>
              )}
          </div>
      );
  }

  return (
    <div className="bg-white border-l-4 border-red-500 rounded-r-xl shadow-sm p-6 mb-6">
      <div className="flex justify-between items-start mb-6">
          <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Calculator size={20} className="text-red-500"/> Process Cancellation
              </h3>
              <p className="text-sm text-slate-500">Calculate refund and finalize status.</p>
          </div>
          <div className="bg-slate-100 px-3 py-1 rounded text-xs font-medium text-slate-600">
              Total Paid: {booking.currency} {totalPaid.toLocaleString()}
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Cancellation Type</label>
                  <div className="flex gap-2">
                      {['FREE', 'PARTIAL', 'NON_REFUNDABLE'].map((t) => (
                          <button
                            key={t}
                            onClick={() => handleTypeChange(t as CancellationType)}
                            className={`px-3 py-1.5 text-xs font-bold rounded border ${type === t ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300'}`}
                          >
                              {t.replace('_', ' ')}
                          </button>
                      ))}
                  </div>
              </div>

              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cancellation Penalty / Charges</label>
                  <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-bold">{booking.currency}</span>
                      <input 
                          type="number"
                          min="0"
                          max={totalPaid}
                          value={penalty}
                          onChange={(e) => handlePenaltyChange(Number(e.target.value))}
                          className="w-full pl-10 border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-red-500 outline-none font-medium"
                      />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Deducted from Total Paid</p>
              </div>

              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Internal Note / Reason</label>
                  <input 
                      type="text"
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="e.g. As per policy, 50% retained."
                      className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                  />
              </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 flex flex-col justify-between">
              <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">Refund Calculation</p>
                  <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                          <span className="text-slate-600">Total Paid by Agent</span>
                          <span className="font-mono font-medium">{booking.currency} {totalPaid.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                          <span>Less: Cancellation Penalty</span>
                          <span className="font-mono font-medium">- {booking.currency} {penalty.toLocaleString()}</span>
                      </div>
                      <div className="border-t border-slate-200 my-2"></div>
                      <div className="flex justify-between text-lg font-bold text-slate-900">
                          <span>Refund Amount</span>
                          <span className="font-mono text-green-600">{booking.currency} {refundAmount.toLocaleString()}</span>
                      </div>
                  </div>
              </div>

              <button 
                  onClick={handleSubmit}
                  className="w-full mt-6 bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition shadow-sm flex items-center justify-center gap-2"
              >
                  <CheckCircle size={18} /> Confirm Cancellation
              </button>
          </div>
      </div>
    </div>
  );
};
