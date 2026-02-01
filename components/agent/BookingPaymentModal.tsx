
import React, { useState } from 'react';
import { Quote, User } from '../../types';
import { Wallet, CreditCard, ArrowRight, AlertCircle, CheckCircle, Loader2, Info } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote;
  agent: User;
  onConfirm: (method: 'WALLET' | 'ONLINE') => void;
  isProcessing: boolean;
}

export const BookingPaymentModal: React.FC<Props> = ({ 
    isOpen, 
    onClose, 
    quote, 
    agent, 
    onConfirm, 
    isProcessing 
}) => {
  const [method, setMethod] = useState<'WALLET' | 'ONLINE'>('ONLINE');
  
  if (!isOpen) return null;

  // B2B Logic: Agent pays Net Cost (price), retains Markup (sellingPrice - price)
  const netCost = quote.price || 0;
  const sellingPrice = quote.sellingPrice || 0;
  const markup = sellingPrice - netCost;
  
  const amountToPay = netCost; // The amount to capture
  const currency = quote.currency || 'INR';
  
  const walletBalance = agent.walletBalance || 0;
  const creditLimit = agent.creditLimit || 0;
  
  // Total available buying power
  const availableFunds = walletBalance + creditLimit;
  const hasSufficientFunds = availableFunds >= amountToPay;

  // If wallet selected but insufficient funds, force online or show error
  const isWalletDisabled = !hasSufficientFunds;

  const handleConfirm = () => {
      onConfirm(method);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        
        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-900">Confirm & Pay</h3>
            <p className="text-sm text-slate-500">Booking Reference: <strong>{quote.uniqueRefNo}</strong></p>
        </div>

        <div className="p-6 space-y-6">
            
            {/* Amount Display */}
            <div className="text-center bg-blue-50 p-4 rounded-xl border border-blue-100">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wide">Net Payable (B2B Cost)</p>
                <h2 className="text-4xl font-bold text-slate-900 mt-1">{currency} {amountToPay.toLocaleString()}</h2>
                {markup > 0 && (
                    <div className="mt-2 pt-2 border-t border-blue-200 text-xs text-slate-600 flex justify-center gap-2">
                        <span>Client Price: {currency} {sellingPrice.toLocaleString()}</span>
                        <span className="text-green-600 font-bold">• Profit Retained: {currency} {markup.toLocaleString()}</span>
                    </div>
                )}
            </div>

            <div className="space-y-3">
                
                {/* Option 1: Wallet */}
                <label 
                    className={`relative flex items-start gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        method === 'WALLET' 
                            ? 'border-brand-600 bg-brand-50' 
                            : isWalletDisabled ? 'border-slate-100 bg-slate-50 opacity-70' : 'border-slate-200 hover:border-brand-200'
                    }`}
                >
                    <input 
                        type="radio" 
                        name="paymentMethod" 
                        value="WALLET" 
                        checked={method === 'WALLET'}
                        onChange={() => !isWalletDisabled && setMethod('WALLET')}
                        disabled={isWalletDisabled}
                        className="sr-only"
                    />
                    <div className={`p-3 rounded-full ${method === 'WALLET' ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        <Wallet size={20} />
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-center">
                            <span className={`font-bold ${method === 'WALLET' ? 'text-brand-900' : 'text-slate-700'}`}>Agency Wallet</span>
                            {method === 'WALLET' && <CheckCircle size={18} className="text-brand-600" />}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Use pre-paid balance or credit limit.</p>
                        
                        <div className="mt-2 text-xs flex items-center gap-2">
                            <span className="font-mono font-medium text-slate-700">Available: {currency} {availableFunds.toLocaleString()}</span>
                            {!hasSufficientFunds && (
                                <span className="text-red-600 font-bold flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-red-100">
                                    <AlertCircle size={10} /> Insufficient
                                </span>
                            )}
                        </div>
                    </div>
                </label>

                {/* Option 2: Online */}
                <label 
                    className={`relative flex items-start gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        method === 'ONLINE' 
                            ? 'border-blue-600 bg-blue-50' 
                            : 'border-slate-200 hover:border-blue-200'
                    }`}
                >
                     <input 
                        type="radio" 
                        name="paymentMethod" 
                        value="ONLINE" 
                        checked={method === 'ONLINE'}
                        onChange={() => setMethod('ONLINE')}
                        className="sr-only"
                    />
                    <div className={`p-3 rounded-full ${method === 'ONLINE' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        <CreditCard size={20} />
                    </div>
                    <div className="flex-1">
                         <div className="flex justify-between items-center">
                            <span className={`font-bold ${method === 'ONLINE' ? 'text-blue-900' : 'text-slate-700'}`}>Instant Payment</span>
                            {method === 'ONLINE' && <CheckCircle size={18} className="text-blue-600" />}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Credit/Debit Card, UPI, Netbanking via Razorpay.</p>
                    </div>
                </label>
            </div>

            {/* Disclaimer */}
            <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-500 leading-relaxed border border-slate-100 flex gap-2">
                <Info size={14} className="shrink-0 mt-0.5 text-blue-500" />
                <p>
                    <strong>Note:</strong> You are paying the <strong>Net Cost</strong>. 
                    {method === 'WALLET' 
                        ? " Booking will be confirmed immediately."
                        : " Payment Gateway will charge this net amount."
                    }
                </p>
            </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
            <button 
                onClick={onClose}
                disabled={isProcessing}
                className="flex-1 py-3 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-100 transition disabled:opacity-50"
            >
                Cancel
            </button>
            <button 
                onClick={handleConfirm}
                disabled={isProcessing || (method === 'WALLET' && !hasSufficientFunds)}
                className="flex-[2] py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
                {isProcessing ? (
                    <> <Loader2 size={18} className="animate-spin" /> Processing... </>
                ) : (
                    <> Pay {currency} {amountToPay.toLocaleString()} & Book <ArrowRight size={18} /> </>
                )}
            </button>
        </div>

      </div>
    </div>
  );
};
