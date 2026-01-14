
import React from 'react';
import { Booking } from '../../types';
import { useClientBranding } from '../../hooks/useClientBranding';
import { Wallet, CheckCircle, PieChart, AlertCircle } from 'lucide-react';

interface Props {
  booking: Booking;
}

export const PaymentSummaryCard: React.FC<Props> = ({ booking }) => {
  const { styles } = useClientBranding();
  const currency = booking.currency || 'INR';

  const percentage = Math.min(100, Math.round((booking.paidAmount / booking.totalAmount) * 100));
  
  let statusColor = 'text-slate-600 bg-slate-100';
  let statusText = 'Pending';
  let Icon = AlertCircle;

  if (booking.paymentStatus === 'PAID_IN_FULL') {
      statusColor = 'text-green-700 bg-green-100';
      statusText = 'Fully Paid';
      Icon = CheckCircle;
  } else if (booking.paymentStatus === 'ADVANCE_PAID' || booking.paymentStatus === 'PARTIALLY_PAID') {
      statusColor = 'text-blue-700 bg-blue-100';
      statusText = 'Partially Paid';
      Icon = PieChart;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Wallet size={20} className="text-slate-500" /> Payment Summary
        </h3>
        <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${statusColor}`}>
            <Icon size={14} /> {statusText}
        </span>
      </div>

      <div className="p-6 space-y-6">
          {/* Progress Bar */}
          <div>
              <div className="flex justify-between text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
                  <span>Paid: {percentage}%</span>
                  <span>Total: {currency} {booking.totalAmount.toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${percentage}%`, ...styles.primaryBg }}
                  ></div>
              </div>
          </div>

          {/* Grid Stats */}
          <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">Total Amount</p>
                  <p className="text-lg font-bold text-slate-900">{currency} {booking.totalAmount.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                  <p className="text-xs text-green-700 uppercase font-bold mb-1">Paid So Far</p>
                  <p className="text-lg font-bold text-green-800">{currency} {booking.paidAmount.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-xl border border-red-100 col-span-2">
                  <div className="flex justify-between items-center">
                      <div>
                          <p className="text-xs text-red-700 uppercase font-bold mb-1">Balance Due</p>
                          <p className="text-2xl font-bold text-red-700">{currency} {booking.balanceAmount.toLocaleString()}</p>
                      </div>
                      {booking.balanceAmount > 0 && (
                          <span className="text-[10px] bg-white px-2 py-1 rounded border border-red-200 text-red-600 font-medium">
                              Payment Required
                          </span>
                      )}
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};
