
import React, { useState, useEffect } from 'react';
import { PaymentReminder, Booking } from '../../types';
import { paymentReminderService } from '../../services/paymentReminderService';
import { useAuth } from '../../context/AuthContext';
import { Clock, Mail, Send, AlertCircle, CheckCircle } from 'lucide-react';

interface Props {
  booking: Booking;
}

export const ReminderHistory: React.FC<Props> = ({ booking }) => {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<PaymentReminder[]>([]);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    loadReminders();
  }, [booking.id]);

  const loadReminders = () => {
    setReminders(paymentReminderService.getRemindersForBooking(booking.id));
  };

  const handleManualSend = async () => {
    if (!user) return;
    if (!confirm("Send an immediate payment reminder to the agent?")) return;

    setIsSending(true);
    // Determine logical next step for manual
    let type: 'ADVANCE' | 'BALANCE' = 'BALANCE';
    if (booking.paidAmount < booking.advanceAmount) type = 'ADVANCE';
    
    // Manual is treated as a 'final' urgency usually or just generic 'manual'
    // We'll reuse 'SECOND' as a generic manual stage for template tone if not final
    await paymentReminderService.sendReminder(booking, type, 'SECOND', user);
    
    setIsSending(false);
    loadReminders();
  };

  if (booking.paymentStatus === 'PAID_IN_FULL') return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-6">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Clock size={18} className="text-slate-500" /> Payment Reminders
        </h3>
        {booking.balanceAmount > 0 && (
            <button 
                onClick={handleManualSend} 
                disabled={isSending}
                className="text-xs bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-50 flex items-center gap-1 transition"
            >
                {isSending ? 'Sending...' : <><Send size={12}/> Send Now</>}
            </button>
        )}
      </div>

      <div className="p-0">
        {reminders.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-sm italic">
                No reminders sent yet.
            </div>
        ) : (
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                    <tr>
                        <th className="px-6 py-3 font-semibold">Date</th>
                        <th className="px-6 py-3 font-semibold">Stage</th>
                        <th className="px-6 py-3 font-semibold">Type</th>
                        <th className="px-6 py-3 font-semibold text-right">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {reminders.map(rem => (
                        <tr key={rem.id} className="hover:bg-slate-50">
                            <td className="px-6 py-3 text-slate-600">
                                {new Date(rem.sentAt).toLocaleString()}
                            </td>
                            <td className="px-6 py-3">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                    rem.stage === 'FINAL' ? 'bg-red-50 border-red-100 text-red-700' :
                                    rem.stage === 'FIRST' ? 'bg-blue-50 border-blue-100 text-blue-700' :
                                    'bg-amber-50 border-amber-100 text-amber-700'
                                }`}>
                                    {rem.stage}
                                </span>
                            </td>
                            <td className="px-6 py-3 text-slate-600 font-medium">
                                {rem.type}
                            </td>
                            <td className="px-6 py-3 text-right">
                                <div className="flex items-center justify-end gap-1 text-green-600 font-medium text-xs">
                                    <CheckCircle size={12} /> {rem.status}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        )}
      </div>
    </div>
  );
};
