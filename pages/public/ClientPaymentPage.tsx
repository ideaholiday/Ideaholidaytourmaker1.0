
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bookingService } from '../../services/bookingService';
import { profileService } from '../../services/profileService';
import { paymentService } from '../../services/paymentService';
import { Booking, User } from '../../types';
import { ClientPortalLayout } from '../../components/client/ClientPortalLayout';
import { PaymentSummaryCard } from '../../components/payment/PaymentSummaryCard';
import { PaymentMethodSelector } from '../../components/payment/PaymentMethodSelector';
import { useClientBranding } from '../../hooks/useClientBranding';
import { ShieldCheck, ArrowRight, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';

export const ClientPaymentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [booking, setBooking] = useState<Booking | null>(null);
  const [agent, setAgent] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Payment State
  const [paymentOption, setPaymentOption] = useState<'ADVANCE' | 'FULL'>('FULL');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!id) return;
    const found = bookingService.getBooking(id);
    if (found) {
        setBooking(found);
        
        // Load Agent for Branding
        const ag = profileService.getUser(found.agentId);
        setAgent(ag || null);
        
        // Default Option Logic
        if (found.paidAmount === 0 && found.advanceAmount < found.totalAmount) {
            setPaymentOption('ADVANCE');
        } else {
            setPaymentOption('FULL');
        }
    }
    setLoading(false);
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading Payment Gateway...</div>;

  if (!booking) return (
      <div className="min-h-screen flex flex-col items-center justify-center text-slate-500">
          <ShieldCheck size={48} className="mb-4 text-slate-300" />
          <h2 className="text-xl font-bold text-slate-900">Booking Not Found</h2>
          <p>This payment link is invalid or expired.</p>
      </div>
  );

  return (
    <ClientPortalLayout agent={agent}>
       <PaymentContent 
          booking={booking} 
          agent={agent}
          paymentOption={paymentOption}
          setPaymentOption={setPaymentOption}
          isProcessing={isProcessing}
          setIsProcessing={setIsProcessing}
          paymentSuccess={paymentSuccess}
          setPaymentSuccess={setPaymentSuccess}
          errorMsg={errorMsg}
          setErrorMsg={setErrorMsg}
       />
    </ClientPortalLayout>
  );
};

// Inner content component to use Branding Hooks
const PaymentContent: React.FC<{
    booking: Booking;
    agent: User | null;
    paymentOption: 'ADVANCE' | 'FULL';
    setPaymentOption: (o: 'ADVANCE' | 'FULL') => void;
    isProcessing: boolean;
    setIsProcessing: (b: boolean) => void;
    paymentSuccess: boolean;
    setPaymentSuccess: (b: boolean) => void;
    errorMsg: string;
    setErrorMsg: (s: string) => void;
}> = ({ booking, agent, paymentOption, setPaymentOption, isProcessing, setIsProcessing, paymentSuccess, setPaymentSuccess, errorMsg, setErrorMsg }) => {
    
    const { styles, primaryColor } = useClientBranding();
    const navigate = useNavigate();

    const handlePay = () => {
        setIsProcessing(true);
        setErrorMsg('');

        paymentService.initiatePayment(
            booking,
            paymentOption,
            primaryColor,
            (paymentId) => {
                // Success Callback
                setIsProcessing(false);
                setPaymentSuccess(true);
            },
            (error) => {
                // Failure Callback
                setIsProcessing(false);
                setErrorMsg(error);
            }
        );
    };

    if (paymentSuccess) {
        return (
            <div className="container mx-auto px-4 py-12 max-w-2xl text-center">
                <div className="bg-white rounded-2xl shadow-xl p-10 border border-green-100 animate-in zoom-in-95">
                    <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600">
                        <CheckCircle size={40} strokeWidth={3} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Payment Successful!</h2>
                    <p className="text-slate-600 mb-8">
                        Your payment has been recorded securely. The booking status has been updated.
                    </p>
                    <button 
                        onClick={() => window.location.reload()} // Reload to show updated booking state
                        className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg"
                    >
                        View Updated Booking
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            <button onClick={() => navigate(`/view/${booking.id}`)} className="flex items-center text-slate-500 hover:text-slate-800 mb-6 font-medium">
                <ArrowLeft size={18} className="mr-1" /> Back to Trip Details
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Summary */}
                <div className="space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-1">Secure Checkout</h1>
                        <p className="text-slate-500">Complete your payment for {booking.destination}</p>
                    </div>
                    
                    <PaymentSummaryCard booking={booking} />
                    
                    {errorMsg && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg text-red-700 text-sm font-medium animate-in fade-in">
                            {errorMsg}
                        </div>
                    )}
                </div>

                {/* Right: Payment Options */}
                <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 h-fit">
                    {booking.balanceAmount <= 0 ? (
                        <div className="text-center py-10">
                            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                                <CheckCircle size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">Payment Complete</h3>
                            <p className="text-slate-500 mt-2">There is no pending balance for this trip.</p>
                        </div>
                    ) : (
                        <>
                            <PaymentMethodSelector 
                                booking={booking} 
                                selectedOption={paymentOption} 
                                onSelect={setPaymentOption} 
                            />

                            <div className="mt-8 pt-6 border-t border-slate-100">
                                <div className="flex justify-between items-center mb-6">
                                    <span className="text-slate-600 font-medium">Total Payable Now</span>
                                    <span className="text-2xl font-bold text-slate-900" style={styles.primaryText}>
                                        {booking.currency} {(paymentOption === 'FULL' ? booking.balanceAmount : booking.advanceAmount).toLocaleString()}
                                    </span>
                                </div>

                                <button 
                                    onClick={handlePay}
                                    disabled={isProcessing}
                                    className="w-full py-4 rounded-xl font-bold text-lg text-white shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                    style={styles.button}
                                >
                                    {isProcessing ? (
                                        <> <Loader2 size={24} className="animate-spin" /> Processing... </>
                                    ) : (
                                        <> Proceed to Pay <ArrowRight size={24} /> </>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
