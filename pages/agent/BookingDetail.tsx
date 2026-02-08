
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { bookingService } from '../../services/bookingService';
import { gstService } from '../../services/gstService';
import { Booking, UserRole, BookingOpsDetails } from '../../types';
import { ItineraryView } from '../../components/ItineraryView';
import { BookingStatusTimeline } from '../../components/booking/BookingStatusTimeline';
import { PaymentPanel } from '../../components/booking/PaymentPanel';
import { CancellationRequestModal } from '../../components/booking/CancellationRequestModal';
import { ArrowLeft, MapPin, Calendar, Users, Download, Printer, XCircle, AlertTriangle, ShieldCheck, Globe, FileText, Eye, EyeOff, Truck, Phone, Briefcase, Info, Save, Loader2, Edit2, User, UserCheck, CheckCircle2, UserPlus, CheckCircle, Mail } from 'lucide-react';
import { generateQuotePDF, generateInvoicePDF } from '../../utils/pdfGenerator';
import { AssignOperatorModal } from '../../components/booking/AssignOperatorModal';
import { bookingOperatorService } from '../../services/bookingOperatorService';
import { functions } from '../../services/firebase';
import { httpsCallable } from 'firebase/functions';

export const BookingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [hasInvoice, setHasInvoice] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // View Mode
  const [viewMode, setViewMode] = useState<'INTERNAL' | 'CLIENT'>('INTERNAL');
  const [publicNote, setPublicNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  
  // Ops Edit State
  const [isOpsEditing, setIsOpsEditing] = useState(false);
  const [opsData, setOpsData] = useState<BookingOpsDetails>({});

  // Re-assign Modal (For Admin handling declines)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  useEffect(() => {
    loadBooking();
  }, [id]);

  const loadBooking = async () => {
        if (id) {
            const found = await bookingService.getBooking(id);
            setBooking(found || null);
            if(found) {
                setPublicNote(found.publicNote || '');
                setOpsData(found.opsDetails || {});
                gstService.getInvoiceByBooking(found.id).then(inv => setHasInvoice(!!inv));
            }
        }
  };

  if (!booking || !user) return <div className="p-8 text-center">Loading Booking...</div>;

  const isAdminOrStaff = user.role === UserRole.ADMIN || user.role === UserRole.STAFF;
  const isAgent = user.role === UserRole.AGENT;
  const backLink = isAdminOrStaff ? '/admin/bookings' : '/agent/dashboard';
  const backLabel = isAdminOrStaff ? 'Back to Booking Manager' : 'Back to Dashboard';

  const canToggleView = isAgent || isAdminOrStaff;
  const showInternal = canToggleView && viewMode === 'INTERNAL';
  
  const bookingStatus = booking.status || 'REQUESTED'; // Safety fallback

  const handleDownloadPDF = () => {
      const breakdown: any = {
          finalPrice: booking.sellingPrice,
          perPersonPrice: booking.sellingPrice / booking.paxCount,
          supplierCost: 0,
          platformNetCost: 0,
      };
      generateQuotePDF(booking as any, breakdown, user.role, user);
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
      alert("Public Link copied to clipboard!");
  };

  const handleSendEmail = async () => {
      if(!confirm("Send AI-Generated Booking Confirmation email to Agent via Gmail API?")) return;
      setIsSendingEmail(true);
      try {
          const sendMail = httpsCallable(functions, 'sendBookingEmail');
          await sendMail({ bookingId: booking.id, type: 'BOOKING_CONFIRMATION' });
          alert("Email Sent Successfully!");
      } catch(e: any) {
          console.error(e);
          alert("Error sending email: " + e.message);
      } finally {
          setIsSendingEmail(false);
      }
  };

  const handleCancellationRequest = async (reason: string) => {
      await bookingService.requestCancellation(booking.id, reason, user);
      setIsCancelModalOpen(false);
      loadBooking();
  };
  
  const handleSavePublicNote = async () => {
      if (!booking) return;
      setIsSavingNote(true);
      await bookingService.updateBooking({ ...booking, publicNote });
      setIsSavingNote(false);
      alert("Client note saved.");
  };

  const handleSaveOps = async () => {
      if(!booking) return;
      await bookingService.updateBooking({ ...booking, opsDetails: opsData });
      setIsOpsEditing(false);
      alert("Operational details updated.");
  };

  const handleReassign = async (operatorId: string, operatorName: string, options: any) => {
    if (!booking || !user) return;
    await bookingOperatorService.assignOperator(booking.id, operatorId, operatorName, options, user);
    setIsAssignModalOpen(false);
    loadBooking();
    alert("Operator Re-assigned successfully.");
  };

  const isCancellable = ['CONFIRMED', 'BOOKED', 'IN_PROGRESS'].includes(bookingStatus);
  const isCancelled = bookingStatus.includes('CANCEL') || bookingStatus === 'CANCELLATION_REQUESTED';
  const isGroundOpsReady = booking.operatorStatus === 'ACCEPTED';
  const isOpsDeclined = booking.operatorStatus === 'DECLINED';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => navigate(backLink)} className="flex items-center text-slate-500 hover:text-slate-800">
            <ArrowLeft size={18} className="mr-1" /> {backLabel}
        </button>

        {canToggleView && (
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button 
                    onClick={() => setViewMode('INTERNAL')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition ${viewMode === 'INTERNAL' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Eye size={14} /> Internal View
                </button>
                <button 
                    onClick={() => setViewMode('CLIENT')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition ${viewMode === 'CLIENT' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <EyeOff size={14} /> Client View
                </button>
            </div>
        )}
      </div>

      {!showInternal && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl mb-6 flex items-center gap-2 text-sm">
                <EyeOff size={18} />
                <strong>Client Preview Mode:</strong> Viewing as your customer sees it. Internal costs and operational details are hidden.
            </div>
      )}

      {/* ... (Status Alerts: Declined or Accepted - Keep Existing) ... */}
      
      {/* 1. DECLINED ALERT */}
      {showInternal && isOpsDeclined && (
          <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-xl mb-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                  <h3 className="font-bold text-red-900 text-lg flex items-center gap-2">
                      <XCircle size={24} /> Operational Request Declined
                  </h3>
                  <p className="text-red-800 mt-1">
                      The assigned Operator has declined this booking. 
                  </p>
                  <div className="mt-3 bg-white/60 p-3 rounded-lg border border-red-100 text-sm text-red-900">
                      <strong>Reason Provided:</strong> "{booking.operatorDeclineReason || 'No reason specified'}"
                  </div>
              </div>
              <div>
                  {isAdminOrStaff ? (
                      <button 
                          onClick={() => setIsAssignModalOpen(true)}
                          className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition flex items-center gap-2 shadow-lg"
                      >
                          <UserPlus size={18} /> Reassign Operator
                      </button>
                  ) : (
                      <div className="text-sm font-medium text-red-700 bg-red-100 px-4 py-2 rounded-lg">
                          Please contact support to reassign this booking.
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* 2. ACCEPTED (CONFIRMED) BANNER */}
      {showInternal && isGroundOpsReady && !isCancelled && (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 p-6 rounded-r-xl mb-8 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-start gap-3">
                 <div className="bg-emerald-100 p-2 rounded-full text-emerald-600 mt-1">
                    <CheckCircle size={24} />
                 </div>
                 <div>
                    <h3 className="font-bold text-emerald-900 text-lg">DMC Confirmed</h3>
                    <p className="text-emerald-800 text-sm mt-1">
                        {isAdminOrStaff 
                            ? `DMC '${booking.operatorName}' has accepted this assignment.` 
                            : "The DMC team has confirmed this booking. Driver details will be updated shortly."}
                    </p>
                 </div>
              </div>
              {isAdminOrStaff && (
                   <button 
                      onClick={() => setIsAssignModalOpen(true)}
                      className="text-xs text-emerald-700 hover:text-emerald-900 font-bold underline"
                   >
                       Change Operator
                   </button>
              )}
          </div>
      )}

      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden mb-8">
        <div className="bg-slate-900 text-white p-6 flex flex-col md:flex-row justify-between items-center">
            <div>
                <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold">Booking #{booking.uniqueRefNo}</h1>
                    {isCancelled && <span className="bg-red-500 text-white px-2 py-0.5 rounded text-xs font-bold uppercase">{bookingStatus.replace('_', ' ')}</span>}
                </div>
                <div className="flex gap-4 mt-2 text-sm text-slate-300">
                    <span className="flex items-center gap-1"><MapPin size={14}/> {booking.destination}</span>
                    <span className="flex items-center gap-1"><Calendar size={14}/> {booking.travelDate}</span>
                    <span className="flex items-center gap-1"><Users size={14}/> {booking.paxCount} Pax</span>
                    {showInternal && isAdminOrStaff && (
                        <span className="flex items-center gap-1 text-yellow-400 font-bold ml-2">
                             Operator: {booking.operatorName || 'Unassigned'}
                        </span>
                    )}
                </div>
            </div>
            <div className="mt-4 md:mt-0 flex gap-2">
                {isAdminOrStaff && showInternal && (
                    <button 
                        onClick={handleSendEmail}
                        disabled={isSendingEmail}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm transition font-medium disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSendingEmail ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                        Send Email
                    </button>
                )}
                {hasInvoice && showInternal && (
                    <button onClick={handleDownloadInvoice} className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition font-medium">
                        <FileText size={16} /> Tax Invoice
                    </button>
                )}
                {showInternal && (
                    <button onClick={handleShareClientLink} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition font-medium shadow-sm">
                        <Globe size={16} /> Client Live Link
                    </button>
                )}
                {isCancellable && showInternal && (
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

        {/* ... Rest of the file including Cancellation Banner, Timeline, Grid, Ops Panel, etc. ... */}
        {/* Keeping existing structure below to ensure file completeness */}

        {/* Cancellation Banner */}
        {bookingStatus === 'CANCELLATION_REQUESTED' && showInternal && (
            <div className="bg-amber-50 border border-amber-200 p-4 flex items-center gap-3 text-amber-800 text-sm">
                <AlertTriangle size={20} />
                <p><strong>Cancellation Requested:</strong> Your request is under review by the admin team. Final refund amount (if any) will be updated shortly.</p>
            </div>
        )}

        {!isCancelled && (
            <div className="bg-slate-50 border-b border-slate-200">
                <BookingStatusTimeline status={bookingStatus} />
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3">
            <div className="lg:col-span-2 p-6 border-r border-slate-200 space-y-6">
                
                {/* Public Note / Client Remarks */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                            <FileText size={18} className="text-slate-400" /> 
                            {showInternal ? "Remarks for Client" : "Important Notes"}
                    </h2>
                    {showInternal ? (
                        <div>
                            <textarea 
                                className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none mb-2"
                                rows={3}
                                placeholder="Enter notes visible to the client..."
                                value={publicNote}
                                onChange={(e) => setPublicNote(e.target.value)}
                            />
                            <div className="flex justify-end">
                                <button 
                                    onClick={handleSavePublicNote}
                                    disabled={isSavingNote}
                                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded font-bold transition disabled:opacity-50"
                                >
                                    {isSavingNote ? 'Saving...' : 'Save Note'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        publicNote ? (
                            <p className="text-sm text-slate-600 whitespace-pre-line bg-slate-50 p-4 rounded-lg border border-slate-100">
                                {publicNote}
                            </p>
                        ) : (
                            <p className="text-sm text-slate-400 italic">No additional notes.</p>
                        )
                    )}
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Itinerary & Services</h2>
                    <ItineraryView itinerary={booking.itinerary} />
                </div>
            </div>

            <div className="lg:col-span-1 p-6 space-y-6">
                
                {/* OPS MANAGEMENT PANEL - ADMIN ONLY */}
                {showInternal && isAdminOrStaff && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                         <div className="bg-purple-50 p-4 border-b border-purple-100 flex justify-between items-center">
                             <h3 className="font-bold text-purple-900 flex items-center gap-2">
                                 <Truck size={18} /> Operations Info
                             </h3>
                             {!isOpsEditing ? (
                                 <button onClick={() => setIsOpsEditing(true)} className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1">
                                     <Edit2 size={12}/> Edit
                                 </button>
                             ) : (
                                 <button onClick={handleSaveOps} className="text-xs font-bold text-green-600 hover:text-green-800 flex items-center gap-1">
                                     <Save size={12}/> Save
                                 </button>
                             )}
                         </div>
                         <div className="p-4 space-y-4 text-sm">
                             <div>
                                 <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Driver Details</label>
                                 {isOpsEditing ? (
                                     <div className="space-y-2">
                                         <input type="text" placeholder="Driver Name" className="w-full border p-2 rounded text-xs" value={opsData.driverName || ''} onChange={e => setOpsData({...opsData, driverName: e.target.value})} />
                                         <input type="text" placeholder="Phone" className="w-full border p-2 rounded text-xs" value={opsData.driverPhone || ''} onChange={e => setOpsData({...opsData, driverPhone: e.target.value})} />
                                     </div>
                                 ) : (
                                     <div className="text-slate-700">
                                         <p className="font-medium">{opsData.driverName || 'Not Assigned'}</p>
                                         <p className="text-xs text-slate-500">{opsData.driverPhone}</p>
                                     </div>
                                 )}
                             </div>
                             
                             <div>
                                 <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Vehicle</label>
                                 {isOpsEditing ? (
                                     <div className="space-y-2">
                                         <input type="text" placeholder="Model (e.g. Innova)" className="w-full border p-2 rounded text-xs" value={opsData.vehicleModel || ''} onChange={e => setOpsData({...opsData, vehicleModel: e.target.value})} />
                                         <input type="text" placeholder="Plate Number" className="w-full border p-2 rounded text-xs" value={opsData.vehicleNumber || ''} onChange={e => setOpsData({...opsData, vehicleNumber: e.target.value})} />
                                     </div>
                                 ) : (
                                     <div className="text-slate-700">
                                         <p>{opsData.vehicleModel || '-'}</p>
                                         <p className="text-xs text-slate-500">{opsData.vehicleNumber}</p>
                                     </div>
                                 )}
                             </div>

                             <div>
                                 <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Internal Remarks</label>
                                 {isOpsEditing ? (
                                     <textarea rows={3} className="w-full border p-2 rounded text-xs" placeholder="Operational notes..." value={opsData.otherNotes || ''} onChange={e => setOpsData({...opsData, otherNotes: e.target.value})} />
                                 ) : (
                                     <p className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded border border-slate-100">{opsData.otherNotes || 'No remarks.'}</p>
                                 )}
                             </div>
                         </div>
                    </div>
                )}

                {/* READ ONLY OPS VIEW FOR AGENTS */}
                {showInternal && isAgent && opsData.driverName && (
                     <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                         <div className="bg-green-50 p-4 border-b border-green-100">
                             <h3 className="font-bold text-green-900 flex items-center gap-2">
                                 <Truck size={18} /> Driver & Trip Details
                             </h3>
                         </div>
                         <div className="p-4 space-y-3 text-sm">
                             <div className="flex justify-between">
                                 <span className="text-slate-500">Driver:</span>
                                 <span className="font-medium text-slate-900">{opsData.driverName}</span>
                             </div>
                             <div className="flex justify-between">
                                 <span className="text-slate-500">Contact:</span>
                                 <span className="font-medium text-slate-900">{opsData.driverPhone}</span>
                             </div>
                             <div className="flex justify-between">
                                 <span className="text-slate-500">Vehicle:</span>
                                 <span className="font-medium text-slate-900">{opsData.vehicleModel} ({opsData.vehicleNumber})</span>
                             </div>
                         </div>
                     </div>
                )}

                {showInternal && (
                    <PaymentPanel 
                        booking={booking}
                        user={user}
                        onRecordPayment={() => {}} 
                    />
                )}
                
            </div>
        </div>
      </div>

      <CancellationRequestModal 
        isOpen={isCancelModalOpen} 
        onClose={() => setIsCancelModalOpen(false)}
        onSubmit={handleCancellationRequest}
      />
      
      {isAssignModalOpen && (
          <AssignOperatorModal 
             isOpen={isAssignModalOpen}
             onClose={() => setIsAssignModalOpen(false)}
             onAssign={handleReassign}
             currentNetCost={booking.netCost}
             currency={booking.currency}
          />
      )}
    </div>
  );
};
