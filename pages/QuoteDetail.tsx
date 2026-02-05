
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { agentService } from '../../services/agentService';
import { adminService } from '../../services/adminService';
import { bookingService } from '../../services/bookingService';
import { paymentService } from '../../services/paymentService'; // Import payment service
import { Quote, ItineraryItem, UserRole, PricingBreakdown, Message } from '../../types';
import { ItineraryView } from '../components/ItineraryView';
import { PriceSummary } from '../components/PriceSummary';
import { ChatPanel } from '../components/ChatPanel'; // Restored Import
import { ArrowLeft, Edit2, Download, Share2, GitBranch, Link as LinkIcon, CheckCircle, Trash2, UserPlus, Truck, Phone, MessageCircle, CreditCard, Save, Eye, EyeOff, FileText, AlertTriangle } from 'lucide-react';
import { usePricingEngine } from '../hooks/usePricingEngine';
import { ItineraryBuilder } from '../components/ItineraryBuilder';
import { generateQuotePDF } from '../utils/pdfGenerator';
import { formatWhatsAppQuote } from '../utils/whatsappFormatter';
import { AssignOperatorModal } from '../components/booking/AssignOperatorModal';
import { BookingPaymentModal } from '../components/agent/BookingPaymentModal'; // Import new modal

export const QuoteDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, reloadUser } = useAuth(); // Needed to refresh wallet balance after payment
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isEditingItinerary, setIsEditingItinerary] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  
  // View Mode: Allows Admin/Agent to see "Client View" (hides internal data)
  const [viewMode, setViewMode] = useState<'INTERNAL' | 'CLIENT'>('INTERNAL');
  const [publicNote, setPublicNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  
  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  // Admin Payment Control State
  const [adminPaymentStatus, setAdminPaymentStatus] = useState<'PENDING' | 'PARTIAL' | 'CLEARED'>('PENDING');
  const [adminPaymentNote, setAdminPaymentNote] = useState('');

  const { setInput } = usePricingEngine();

  useEffect(() => {
    loadQuote();
  }, [id, user]);

  const loadQuote = async () => {
    if (!id || !user) return;
    setIsLoading(true);

    try {
        // Fetch by ID directly to support Admin access
        const found = await agentService.getQuoteById(id);

        if (found) {
            // Permission Logic: Who can see this?
            let hasAccess = false;
            
            if (user.role === UserRole.ADMIN || user.role === UserRole.STAFF) {
                // Admin/Staff see ALL
                hasAccess = true;
            } else if (user.role === UserRole.AGENT && found.agentId === user.id) {
                // Agents see only their own
                hasAccess = true;
            } else if (user.role === UserRole.OPERATOR && found.operatorId === user.id) {
                // Operators see assigned
                hasAccess = true;
            }

            if (hasAccess) {
                setQuote(found);
                initPricingEngine(found);
                setPublicNote(found.publicNote || '');
                if (found.operationalDetails) {
                    setAdminPaymentStatus(found.operationalDetails.paymentStatus || 'PENDING');
                    setAdminPaymentNote(found.operationalDetails.paymentNotes || '');
                }
            } else {
                console.error("Access denied: User does not have permission to view this quote.");
                setQuote(null);
            }
        }
    } catch (e) {
        console.error("Error loading quote:", e);
    } finally {
        setIsLoading(false);
    }
  };

  const initPricingEngine = (found: Quote) => {
      setInput(prev => ({
        ...prev,
        targetCurrency: found.currency || 'INR', 
        travelers: { adults: found.paxCount, children: found.childCount || 0, infants: 0 },
        hotel: { 
            nights: 1, 
            cost: found.cost || 0, 
            costType: 'Per Person', 
            rooms: 1, 
            currency: found.currency || 'INR'
        }
    }));
  };

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading Quote Details...</div>;
  if (!quote) return <div className="p-8 text-center text-red-500">Quote not found or access denied.</div>;

  const isAgent = user?.role === UserRole.AGENT;
  const isAdminOrStaff = user?.role === UserRole.ADMIN || user?.role === UserRole.STAFF;
  const canToggleView = isAgent || isAdminOrStaff;
  const showInternal = canToggleView && viewMode === 'INTERNAL';
  
  const hasValidPrice = (quote.sellingPrice !== undefined && quote.sellingPrice > 0);
  const isBooked = quote.status === 'BOOKED' || quote.status === 'CONFIRMED';
  const opDetails = quote.operationalDetails || {};

  // --- ACTIONS ---

  const handleBookClick = () => {
      if (!quote || !user) return;
      setIsPaymentModalOpen(true);
  };

  const handleConfirmBooking = async (method: 'WALLET' | 'ONLINE') => {
      if (!quote || !user) return;
      setIsProcessingPayment(true);
      
      try {
          // 1. Create Booking Record First (Status: REQUESTED)
          // This ensures we have a booking ID to attach the payment to
          const newBooking = await bookingService.createBookingFromQuote(quote, user);
          
          // CRITICAL: We only capture the NET COST from the agent (B2B Price)
          const netPayable = quote.price || 0;

          if (method === 'WALLET') {
              // 2a. Wallet Payment Flow
              await paymentService.processWalletDeduction(user, newBooking, netPayable);
              
              // 3. Mark Booking as Paid
              // Wallet payments are instant, so we confirm immediately
              
              await reloadUser(); // Update UI wallet balance
              alert("Booking Confirmed! Net amount deducted from wallet.");
              navigate(`/booking/${newBooking.id}`);
          
          } else {
              // 2b. Online Payment Flow
              // Trigger Razorpay for Net Cost
              paymentService.initiatePayment(
                  newBooking,
                  'FULL', 
                  '#0ea5e9',
                  (paymentId) => {
                      // Success
                      setIsProcessingPayment(false);
                      setIsPaymentModalOpen(false);
                      alert("Payment Successful! Booking Confirmed.");
                      navigate(`/booking/${newBooking.id}`);
                  },
                  (error) => {
                      // Failure
                      setIsProcessingPayment(false);
                      alert(`Payment Failed: ${error}. Booking created as pending.`);
                      navigate(`/booking/${newBooking.id}`); // Still go to booking so they can retry
                  },
                  netPayable // Pass Override Amount
              );
              // Return early to prevent closing modal/processing flag reset before Razorpay finishes
              return; 
          }

      } catch (e: any) {
          console.error("Booking Error", e);
          alert("Booking failed: " + e.message);
      } finally {
          if (method === 'WALLET') {
             setIsProcessingPayment(false);
             setIsPaymentModalOpen(false);
          }
      }
  };

  const handleDelete = async () => {
      // ... existing code ...
      if (!quote) return;
      if (window.confirm(`⚠️ DANGER ZONE ⚠️\n\nAre you sure you want to DELETE Quote #${quote.uniqueRefNo}?`)) {
          try {
              await agentService.deleteQuote(quote.id);
              navigate('/agent/quotes');
          } catch (e: any) {
              alert("Delete failed: " + e.message);
          }
      }
  };

  const handleUpdateItinerary = (newItinerary: ItineraryItem[], financials?: { net: number, selling: number, currency: string }) => {
    // ... existing code ...
     if (financials) {
         const updatedQuote: Quote = { 
            ...quote, 
            itinerary: newItinerary,
            currency: financials.currency,
            cost: 0, 
            price: financials.net, 
            sellingPrice: financials.selling, 
            type: 'DETAILED' as const,
            status: quote.status
        };
        agentService.updateQuote(updatedQuote);
        setQuote(updatedQuote);
        setIsEditingItinerary(false);
        return;
    }
    setIsEditingItinerary(false);
  };
  
  // ... existing handlers (Assign Operator, Share, etc.) ...
  const handleAssignOperator = async (operatorId: string, operatorName: string, options: any) => {
      if (!quote || !user) return;
      await agentService.assignOperator(quote.id, operatorId, operatorName, options, user);
      loadQuote(); 
      setIsAssignModalOpen(false);
      alert("Operator assigned to quote successfully.");
  };

  const handleUpdateOperatorPayment = async () => {
      if (!quote || !user) return;
      const updatedDetails = {
          paymentStatus: adminPaymentStatus,
          paymentNotes: adminPaymentNote
      };
      await agentService.updateOperationalDetails(quote.id, updatedDetails);
      alert("Operator Payment Status updated.");
      loadQuote();
  };

  const handleSavePublicNote = async () => {
      if (!quote) return;
      setIsSavingNote(true);
      await agentService.updateQuote({ ...quote, publicNote });
      setIsSavingNote(false);
      alert("Client note saved.");
  };

  const handleShareWhatsApp = () => {
     const mockBreakdown: any = {
         finalPrice: quote.sellingPrice || 0,
         perPersonPrice: ((quote.sellingPrice || 0) / quote.paxCount)
     };
     const text = formatWhatsAppQuote(quote, mockBreakdown, true);
     const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
     window.open(url, '_blank');
  };

  const handleCopyLink = () => {
      const domain = window.location.host;
      const protocol = window.location.protocol;
      const url = `${protocol}//${domain}/#/view/${quote.id}`;
      navigator.clipboard.writeText(url);
      alert("Public Link copied to clipboard!\n\n" + url);
  };
  
  const handleDownloadPDF = () => {
       if (!user || !quote) return;
       
       const breakdown: PricingBreakdown = {
          finalPrice: quote.sellingPrice || 0,
          perPersonPrice: quote.paxCount > 0 ? (quote.sellingPrice || 0) / quote.paxCount : 0,
          supplierCost: 0,
          companyMarkupValue: 0,
          platformNetCost: 0,
          agentMarkupValue: 0,
          subtotal: 0,
          gstAmount: 0
       };
       
       generateQuotePDF(quote, breakdown, user.role, user);
  };

  const handleCreateRevision = async () => {
      if (!user) return;
      if (confirm("Create a new version to edit? The current version will remain locked as history.")) {
          const newQuote = await agentService.createRevision(quote.id, user);
          if (newQuote) {
              navigate(`/quote/${newQuote.id}`);
          }
      }
  };

  // --- MESSAGING ---
  const handleSendMessage = async (text: string) => {
    if (!user || !quote) return;
    
    const newMessage: Message = {
        id: `msg_${Date.now()}`,
        senderId: user.id,
        senderName: user.name,
        senderRole: user.role,
        content: text,
        timestamp: new Date().toISOString(),
        isSystem: false
    };
    
    // Optimistic update
    const updatedMessages = [...(quote.messages || []), newMessage];
    const updatedQuote = { ...quote, messages: updatedMessages };
    
    await agentService.updateQuote(updatedQuote);
    setQuote(updatedQuote);
  };

  return (
    <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-4">
            <button onClick={() => navigate(-1)} className="flex items-center text-slate-500 hover:text-slate-800">
                <ArrowLeft size={18} className="mr-1" /> Back
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
                <strong>Client Preview Mode:</strong> Viewing as your customer sees it. Internal costs and chats are hidden.
            </div>
        )}
        
        {/* WARNING FOR ZERO PRICE */}
        {showInternal && !hasValidPrice && !isBooked && (
             <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-4 rounded-xl mb-6 flex items-start gap-3 shadow-sm">
                <AlertTriangle size={24} className="shrink-0 mt-0.5 text-amber-600" />
                <div>
                    <h4 className="font-bold text-sm">Pricing Incomplete / Pending</h4>
                    <p className="text-xs mt-1">
                        The itinerary currently has no cost associated or is just a route skeleton. 
                        Please click <strong>Edit Itinerary</strong> below to add services and calculate the final price before sending to your client.
                    </p>
                </div>
            </div>
        )}

        {/* HEADER */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-2xl font-bold text-slate-900">Quote: {quote.uniqueRefNo}</h1>
                        <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-xs font-mono border border-slate-200 flex items-center gap-1">
                            <GitBranch size={10} /> v{quote.version}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${quote.status === 'BOOKED' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                            {quote.status}
                        </span>
                    </div>
                    <div className="text-sm text-slate-500 flex items-center gap-3">
                        <span>{quote.destination}</span>
                        <span>•</span>
                        <span>{quote.paxCount} Pax</span>
                        <span>•</span>
                        <span>{new Date(quote.travelDate).toLocaleDateString()}</span>
                        {showInternal && quote.operatorName && (
                            <span className="text-purple-600 font-medium ml-2 border-l border-slate-300 pl-3">
                                Op: {quote.operatorName} ({quote.operatorStatus || 'Assigned'})
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {/* Actions */}
                    {showInternal && isAdminOrStaff && !isBooked && (
                        <button 
                            onClick={() => setIsAssignModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 border border-purple-100 rounded-lg hover:bg-purple-100 text-sm font-bold transition"
                        >
                            <UserPlus size={16} /> Assign Op
                        </button>
                    )}

                    {!isBooked && hasValidPrice && isAgent && showInternal && (
                        <button 
                            onClick={handleBookClick} 
                            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white hover:bg-green-700 rounded-lg shadow-sm font-bold transition transform hover:-translate-y-0.5"
                        >
                            <CheckCircle size={18} /> Book Now
                        </button>
                    )}

                    {!quote.isLocked && showInternal && (isAgent || isAdminOrStaff) && !isEditingItinerary && (
                         <button onClick={() => setIsEditingItinerary(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium">
                            <Edit2 size={16} /> Edit Itinerary
                        </button>
                    )}
                    
                    {/* ENHANCED: Allow Admin to create revisions too */}
                    {quote.isLocked && showInternal && (isAgent || isAdminOrStaff) && !isBooked && (
                        <button onClick={handleCreateRevision} className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 text-sm font-bold transition">
                            <GitBranch size={16} /> New Version
                        </button>
                    )}

                    {hasValidPrice && (
                        <>
                            <button onClick={handleCopyLink} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 text-sm font-bold transition">
                                <LinkIcon size={16} /> Copy Link
                            </button>
                            {showInternal && (
                                <button onClick={handleShareWhatsApp} className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 text-sm font-bold transition">
                                    <Share2 size={16} /> WhatsApp
                                </button>
                            )}
                            {user && (
                                <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 text-sm font-bold transition shadow-sm">
                                    <Download size={16} /> Download PDF
                                </button>
                            )}
                        </>
                    )}

                    {!isBooked && showInternal && (isAgent || isAdminOrStaff) && (
                        <button onClick={handleDelete} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 text-sm font-bold transition" title="Delete Quote">
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>

        {isEditingItinerary ? (
            <ItineraryBuilder 
                initialItinerary={quote.itinerary} 
                destination={quote.destination}
                pax={quote.paxCount}
                onSave={handleUpdateItinerary}
                onCancel={() => setIsEditingItinerary(false)}
            />
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* GROUND OPERATIONS INFO (ADMIN ONLY) */}
                    {showInternal && isAdminOrStaff && quote.operatorId && (
                         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-indigo-500">
                             {/* ... existing ops content ... */}
                             <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                 <Truck size={20} className="text-indigo-600" /> Ground Operations Info (Shared by Operator)
                             </h3>
                             
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                                 <div className="bg-slate-50 p-4 rounded-lg">
                                     <p className="text-xs font-bold text-slate-400 uppercase mb-2">Trip Manager</p>
                                     <div className="space-y-1 text-sm">
                                         <p className="font-medium text-slate-800">{opDetails.tripManagerName || 'Not Assigned'}</p>
                                         <p className="text-slate-500 flex items-center gap-1"><Phone size={12}/> {opDetails.tripManagerPhone || '-'}</p>
                                     </div>
                                 </div>
                                 <div className="bg-slate-50 p-4 rounded-lg">
                                     <p className="text-xs font-bold text-slate-400 uppercase mb-2">Driver Details</p>
                                     <div className="space-y-1 text-sm">
                                         <p className="font-medium text-slate-800">{opDetails.driverName || 'Not Assigned'}</p>
                                         <p className="text-slate-500 flex items-center gap-1"><Phone size={12}/> {opDetails.driverPhone || '-'}</p>
                                         <p className="text-slate-500 text-xs mt-1 bg-white inline-block px-1 rounded border border-slate-200">
                                            {opDetails.vehicleModel || 'Vehicle'} • {opDetails.vehicleNumber || 'No Plate'}
                                         </p>
                                     </div>
                                 </div>
                             </div>

                             {opDetails.whatsappGroupLink && (
                                 <div className="bg-green-50 p-3 rounded-lg border border-green-200 flex justify-between items-center text-sm text-green-800">
                                     <div className="flex items-center gap-2">
                                         <MessageCircle size={18} />
                                         <strong>Ops WhatsApp Group</strong>
                                     </div>
                                     <a href={opDetails.whatsappGroupLink} target="_blank" rel="noreferrer" className="text-green-700 underline font-medium">Join Group</a>
                                 </div>
                             )}

                             {/* Admin Payment Controls */}
                             <div className="mt-6 pt-4 border-t border-slate-100">
                                 <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><CreditCard size={16}/> Operator Payment Status</h4>
                                 <div className="flex gap-4 items-end">
                                     <div className="flex-1">
                                         <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                                         <select 
                                            value={adminPaymentStatus} 
                                            onChange={(e) => setAdminPaymentStatus(e.target.value as any)}
                                            className="w-full border border-slate-300 rounded p-2 text-sm"
                                         >
                                             <option value="PENDING">Pending</option>
                                             <option value="PARTIAL">Partial Paid</option>
                                             <option value="CLEARED">Cleared</option>
                                         </select>
                                     </div>
                                     <div className="flex-[2]">
                                         <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
                                         <input 
                                            type="text" 
                                            value={adminPaymentNote} 
                                            onChange={(e) => setAdminPaymentNote(e.target.value)}
                                            className="w-full border border-slate-300 rounded p-2 text-sm"
                                            placeholder="UTR / Transaction Ref..."
                                         />
                                     </div>
                                     <button 
                                        onClick={handleUpdateOperatorPayment}
                                        className="bg-indigo-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-indigo-700 flex items-center gap-1"
                                     >
                                         <Save size={14}/> Update
                                     </button>
                                 </div>
                             </div>
                         </div>
                    )}
                    
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
                                    placeholder="Enter notes visible to the client (e.g. Flight rates subject to change...)"
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
                        <h2 className="text-lg font-bold mb-4">Itinerary</h2>
                        <ItineraryView itinerary={quote.itinerary} />
                    </div>
                </div>
                
                {user && (
                    <div className="lg:col-span-1 space-y-6">
                        <PriceSummary 
                            breakdown={{
                                supplierCost: showInternal ? (quote.cost || 0) : 0, // HIDE Supplier Cost in Client View
                                platformNetCost: showInternal ? (quote.price || 0) : 0, // HIDE Platform Cost in Client View
                                finalPrice: quote.sellingPrice || 0,
                                agentMarkupValue: showInternal ? ((quote.sellingPrice || 0) - (quote.price || 0)) : 0, // HIDE Markup in Client View
                                gstAmount: 0, 
                                companyMarkupValue: showInternal ? ((quote.price || 0) - (quote.cost || 0)) : 0, // HIDE Company Margin
                                subtotal: quote.sellingPrice || 0,
                                perPersonPrice: quote.paxCount > 0 ? (quote.sellingPrice || 0) / quote.paxCount : 0
                            }}
                            role={showInternal ? user.role : UserRole.AGENT} // Force Agent role logic in Client view to show basic summary
                            currency={quote.currency || 'INR'}
                        />
                        
                        {/* CHAT PANEL: Visible to Admins and Agents even if quote is Booked */}
                        {showInternal && (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px]">
                                <ChatPanel 
                                    user={user} 
                                    messages={quote.messages || []} 
                                    onSendMessage={handleSendMessage} 
                                    className="h-full border-none shadow-none rounded-none"
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        )}

        {/* Assign Operator Modal for Admins */}
        {isAssignModalOpen && (
            <AssignOperatorModal 
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                onAssign={handleAssignOperator}
                currentNetCost={quote.cost || 0} 
                currency={quote.currency}
            />
        )}

        {/* NEW: Payment & Booking Modal for Agents */}
        {isPaymentModalOpen && user && (
            <BookingPaymentModal 
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                quote={quote}
                agent={user}
                onConfirm={handleConfirmBooking}
                isProcessing={isProcessingPayment}
            />
        )}
    </div>
  );
};
