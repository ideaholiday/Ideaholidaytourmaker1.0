import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { bookingService } from '../../services/bookingService';
import { gstService } from '../../services/gstService';
import { Booking, Message, UserRole } from '../../types';
import { ItineraryView } from '../../components/ItineraryView';
import { BookingStatusTimeline } from '../../components/booking/BookingStatusTimeline';
import { PaymentPanel } from '../../components/booking/PaymentPanel';
import { CancellationRequestModal } from '../../components/booking/CancellationRequestModal';
import { ArrowLeft, MapPin, Calendar, Users, DollarSign, Download, Printer, XCircle, AlertTriangle, ShieldCheck, Globe, FileText } from 'lucide-react';
import { generateQuotePDF, generateInvoicePDF } from '../../utils/pdfGenerator';

export const BookingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [hasInvoice, setHasInvoice] = useState(false);

  useEffect(() => {
    const load = async () => {
        if (id) {
            const found = await bookingService.getBooking(id);
            setBooking(found || null);
            if(found) {
                gstService.getInvoiceByBooking(found.id).then(inv => setHasInvoice(!!inv));
            }
        }
    };
    load();
  }, [id]);

  if (!booking || !user) return <div className="p-8 text-center">Loading Booking...</div>;

  const handleDownloadPDF = () => {
      const mockQuote: any = {
          ...booking,
          uniqueRefNo: booking.uniqueRefNo,
          itinerary: booking.itinerary
      };
      
      const breakdown: any = {
          finalPrice: booking.sellingPrice,
          perPersonPrice: booking.sellingPrice / booking.paxCount
      };
      
      generateQuotePDF(mockQuote, breakdown, user.role, user);
  };

  const handleDownloadInvoice = async () => {
      const invoice = await gstService.getInvoiceByBooking(booking.id);
      if (invoice) {
          generateInvoicePDF(invoice, booking);
      } else {
          alert("Tax Invoice not yet generated. Please wait for booking confirmation or contact admin.");
      }
  };

  const handleShareClientLink = () => {
      const domain = user.customDomain || window.location.host;
      const protocol = window.location.protocol;
      const url = `${protocol}//${domain}/#/view/${booking.id}`;
      
      navigator.clipboard.writeText(url);
      
      let msg = `Public Client Link copied!\n\n${url}`;
      if (user.customDomain) {
          msg += `\n\n✅ Using your custom domain: ${user.customDomain}`;
      } else {
          msg += `\n\n💡 Tip: Configure a custom domain in your profile to hide the platform URL.`;
      }
      alert(msg);
  };

  const handleCancellationRequest = async (reason: string) => {
      await bookingService.requestCancellation(booking.id, reason, user);
      setIsCancelModalOpen(false);
      const updated = await bookingService.getBooking(booking.id);
      setBooking(updated || null);
  };

  const isCancellable = ['CONFIRMED', 'BOOKED', 'IN_PROGRESS'].includes(booking.status);
  const isCancelled = booking.status.includes('CANCEL') || booking.status === 'CANCELLATION_REQUESTED';

  return (
    <div className="container mx-auto px-4 py-8">
      <button onClick={() => navigate('/agent/dashboard')} className="flex items-center text-slate-500 hover:text-slate-800 mb-6">
        <ArrowLeft size={18} className="mr-1" /> Back to Dashboard
      </button>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden mb-8">
        <div className="bg-slate-900 text-white p-6 flex flex-col md:flex-row justify-between items-center">
            <div>
                <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold">Booking #{booking.uniqueRefNo}</h1>
                    {isCancelled && <span className="bg-red-500 text-white px-2 py-0.5 rounded text-xs font-bold uppercase">{booking.status.replace('_', ' ')}</span>}
                </div>
                <div className="flex gap-4 mt-2 text-sm text-slate-300">
                    <span className="flex items-center gap-1"><MapPin size={14}/> {booking.destination}</span>
                    <span className="flex items-center gap-1"><Calendar size={14}/> {booking.travelDate}</span>
                    <span className="flex items-center gap-1"><Users size={14}/> {booking.paxCount} Pax</span>
                </div>
            </div>
            <div className="mt-4 md:mt-0 flex gap-2">
                {hasInvoice && (
                    <button onClick={handleDownloadInvoice} className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition font-medium">
                        <FileText size={16} /> Tax Invoice
                    </button>
                )}
                <button onClick={handleShareClientLink} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition font-medium shadow-sm">
                    <Globe size={16} /> Client Live Link
                </button>
                {isCancellable && (
                    <button 
                        onClick={() => setIsCancelModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600/90 hover:bg-red-600 text-white rounded-lg text-sm transition font-medium"
                    >
                        <XCircle size={16} /> Cancel Booking
                    </button>
                )}
                <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition">
                    <Printer size={16} /> Download Voucher
                </button>
            </div>
        </div>

        {/* Cancellation Banner */}
        {booking.status === 'CANCELLATION_REQUESTED' && (
            <div className="bg-amber-50 border border-amber-200 p-4 flex items-center gap-3 text-amber-800 text-sm">
                <AlertTriangle size={20} />
                <p><strong>Cancellation Requested:</strong> Your request is under review by the admin team. Final refund amount (if any) will be updated shortly.</p>
            </div>
        )}

        {/* Refund Details */}
        {booking.status.includes('CANCELLED') && booking.cancellation?.refundAmount !== undefined && (
            <div className="bg-slate-50 border-b border-slate-200 p-6 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-slate-900">Cancellation Summary</h3>
                    <p className="text-sm text-slate-500">Processed on {new Date(booking.cancellation.processedAt!).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase">Refund Amount</p>
                    <p className={`text-xl font-bold ${booking.cancellation.refundAmount > 0 ? 'text-green-600' : 'text-slate-600'}`}>
                        {booking.currency} {booking.cancellation.refundAmount.toLocaleString()}
                    </p>
                    <p className="text-xs font-medium text-slate-400">{booking.cancellation.refundStatus}</p>
                </div>
            </div>
        )}

        {!isCancelled && (
            <div className="bg-slate-50 border-b border-slate-200">
                <BookingStatusTimeline status={booking.status} />
            </div>
        )}

        {/* Privacy Note for Agent */}
        <div className="bg-blue-50 px-6 py-2 border-b border-blue-100 flex items-center gap-2 text-xs text-blue-700">
            <ShieldCheck size={14} />
            <span><strong>Privacy Active:</strong> The generated Client Link hides Idea Holiday branding and uses your agency details.</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3">
            <div className="lg:col-span-2 p-6 border-r border-slate-200">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Itinerary & Services</h2>
                <ItineraryView itinerary={booking.itinerary} />
            </div>

            <div className="lg:col-span-1 p-6">
                <PaymentPanel 
                    booking={booking}
                    user={user}
                    onRecordPayment={() => {}} 
                />
            </div>
        </div>
      </div>

      <CancellationRequestModal 
        isOpen={isCancelModalOpen} 
        onClose={() => setIsCancelModalOpen(false)}
        onSubmit={handleCancellationRequest}
      />
    </div>
  );
};