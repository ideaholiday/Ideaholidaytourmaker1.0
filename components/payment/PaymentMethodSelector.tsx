
import React from 'react';
import { Booking } from '../../types';
import { useClientBranding } from '../../hooks/useClientBranding';
import { Circle, CheckCircle2, Lock } from 'lucide-react';

interface Props {
  booking: Booking;
  selectedOption: 'ADVANCE' | 'FULL';
  onSelect: (option: 'ADVANCE' | 'FULL') => void;
}

export const PaymentMethodSelector: React.FC<Props> = ({ booking, selectedOption, onSelect }) => {
  const { styles } = useClientBranding();
  const currency = booking.currency || 'INR';

  // Logic: 
  // If paidAmount is 0, show Advance Option AND Full Option.
  // If paidAmount > 0 but < total, Show "Pay Remaining Balance" (Full).
  
  const showAdvanceOption = booking.paidAmount === 0 && booking.advanceAmount < booking.totalAmount;
  const balanceLabel = booking.paidAmount > 0 ? "Pay Remaining Balance" : "Pay Full Amount";

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-slate-900 text-lg mb-4">Choose Payment Amount</h3>
      
      {showAdvanceOption && (
          <div 
            onClick={() => onSelect('ADVANCE')}
            className={`cursor-pointer p-5 rounded-xl border-2 transition-all flex items-center justify-between ${
                selectedOption === 'ADVANCE' 
                ? 'bg-white border-brand-500 shadow-md ring-1 ring-brand-500' 
                : 'bg-white border-slate-200 hover:border-brand-300 hover:shadow-sm'
            }`}
            style={selectedOption === 'ADVANCE' ? { borderColor: styles.primaryBg.backgroundColor } : {}}
          >
              <div className="flex items-center gap-4">
                  <div className={`text-2xl ${selectedOption === 'ADVANCE' ? 'text-brand-600' : 'text-slate-300'}`}>
                      {selectedOption === 'ADVANCE' ? <CheckCircle2 size={24} style={styles.primaryText} /> : <Circle size={24} />}
                  </div>
                  <div>
                      <p className="font-bold text-slate-900">Pay Booking Advance</p>
                      <p className="text-sm text-slate-500">Minimum required to confirm your trip.</p>
                  </div>
              </div>
              <div className="text-right">
                  <p className="text-xl font-bold text-slate-900">{currency} {booking.advanceAmount.toLocaleString()}</p>
                  <p className="text-xs text-slate-400 font-medium">30% of Total</p>
              </div>
          </div>
      )}

      <div 
        onClick={() => onSelect('FULL')}
        className={`cursor-pointer p-5 rounded-xl border-2 transition-all flex items-center justify-between ${
            selectedOption === 'FULL' 
            ? 'bg-white border-brand-500 shadow-md ring-1 ring-brand-500' 
            : 'bg-white border-slate-200 hover:border-brand-300 hover:shadow-sm'
        }`}
        style={selectedOption === 'FULL' ? { borderColor: styles.primaryBg.backgroundColor } : {}}
      >
          <div className="flex items-center gap-4">
              <div className={`text-2xl ${selectedOption === 'FULL' ? 'text-brand-600' : 'text-slate-300'}`}>
                  {selectedOption === 'FULL' ? <CheckCircle2 size={24} style={styles.primaryText} /> : <Circle size={24} />}
              </div>
              <div>
                  <p className="font-bold text-slate-900">{balanceLabel}</p>
                  <p className="text-sm text-slate-500">Clear all dues for this trip.</p>
              </div>
          </div>
          <div className="text-right">
              <p className="text-xl font-bold text-slate-900">{currency} {booking.balanceAmount.toLocaleString()}</p>
              {booking.paidAmount > 0 && <p className="text-xs text-green-600 font-medium">Balance Amount</p>}
          </div>
      </div>

      <div className="bg-slate-50 p-3 rounded-lg flex items-center justify-center gap-2 text-xs text-slate-500 border border-slate-200 mt-4">
          <Lock size={12} />
          Payments are secured by 256-bit SSL encryption via Razorpay.
      </div>
    </div>
  );
};
