
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { agentService } from '../../services/agentService';
import { adminService } from '../../services/adminService';
import { bookingService } from '../../services/bookingService';
import { currencyService } from '../../services/currencyService';
import { Quote, ItineraryItem, UserRole } from '../../types';
import { ItineraryView } from '../components/ItineraryView';
import { PriceSummary } from '../components/PriceSummary';
import { ArrowLeft, Edit2, Download, Share2, GitBranch, AlertTriangle, Link as LinkIcon, CheckCircle, Trash2, UserPlus, Truck, Phone, MessageCircle, CreditCard, Save } from 'lucide-react';
import { calculatePriceFromNet } from '../utils/pricingEngine';
import { usePricingEngine } from '../hooks/usePricingEngine';
import { ItineraryBuilder } from '../components/ItineraryBuilder';
import { generateQuotePDF } from '../utils/pdfGenerator';
import { formatWhatsAppQuote } from '../utils/whatsappFormatter';
import { AssignOperatorModal } from '../components/booking/AssignOperatorModal';

export const QuoteDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isEditingItinerary, setIsEditingItinerary] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  
  // Admin Payment Control State
  const [adminPaymentStatus, setAdminPaymentStatus] = useState<'PENDING' | 'PARTIAL' | 'CLEARED'>('PENDING');
  const [adminPaymentNote, setAdminPaymentNote] = useState('');

  const { updateHotel, setInput } = usePricingEngine();

  useEffect(() => {
    loadQuote();
  }, [id, user]);

  const loadQuote = async () => {
    if (!id || !user) return;
    setIsLoading(true);

    try {
        const allQuotes = await agentService.fetchQuotes(user.id);
        const found = allQuotes.find(q => q.id === id);

        if (found) {
            setQuote(found);
            initPricingEngine(found);
            if (found.operationalDetails) {
                setAdminPaymentStatus(found.operationalDetails.paymentStatus || 'PENDING');
                setAdminPaymentNote(found.operationalDetails.paymentNotes || '');
            }
        } else {
            // Admin logic: fetch directly if not found in cache (Admin sees all)
            if (user.role === UserRole.ADMIN || user.role === UserRole.STAFF) {
                 // Mocking fetch all or specific fetch if service supported it
                 // For now relying on the loop above, but ideally:
                 // const q = await agentService.getQuoteById(id);
            }
            
            const storedQuotes = localStorage.getItem('iht_agent_quotes');
            const parsedQuotes: Quote[] = storedQuotes ? JSON.parse(storedQuotes) : [];
            const localFound = parsedQuotes.find(q => q.id === id);
            
            if (localFound) {
                setQuote(localFound);
                initPricingEngine(localFound);
                if (localFound.operationalDetails) {
                    setAdminPaymentStatus(localFound.operationalDetails.paymentStatus || 'PENDING');
                    setAdminPaymentNote(localFound.operationalDetails.paymentNotes || '');
                }
            } else {
                console.error("Quote not found");
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
  
  const pricingRules = adminService.getPricingRuleSync();
  const hasValidPrice = (quote.sellingPrice !== undefined && quote.sellingPrice > 0);
  const isBooked = quote.status === 'BOOKED' || quote.status === 'CONFIRMED';
  const opDetails = quote.operationalDetails || {};

  // --- ACTIONS ---

  const handleBook = async () => {
      if (!quote || !user) return;
      if (window.confirm(`Are you sure you want to book Quote #${quote.uniqueRefNo}?\n\nThis will lock the itinerary and generate a booking request for the Operations team.`)) {
          try {
              const newBooking = await bookingService.createBookingFromQuote(quote, user);
              await agentService.bookQuote(quote.id, user);
              alert("Booking Created Successfully! Redirecting to booking details...");
              navigate(`/booking/${newBooking.id}`);
          } catch (e: any) {
              console.error(e);
              alert("Booking failed: " + e.message);
          }
      }
  };

  const handleDelete = async () => {
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

  const handleCreateRevision = async () => {
      if (!user) return;
      if (confirm("Create a new version to edit? The current version will remain locked as history.")) {
          const newQuote = await agentService.createRevision(quote.id, user);
          if (newQuote) {
              navigate(`/quote/${newQuote.id}`);
          }
      }
  };

  return (
    <div className="container mx-auto px-4 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center text-slate-500 mb-4 hover:text-slate-800">
            <ArrowLeft size={18} className="mr-1" /> Back
        </button>

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
                        {quote.operatorName && (
                            <span className="text-purple-600 font-medium ml-2 border-l border-slate-300 pl-3">
                                Op: {quote.operatorName} ({quote.operatorStatus || 'Assigned'})
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    
                    {/* ADMIN: ASSIGN OPERATOR */}
                    {isAdminOrStaff && !isBooked && (
                        <button 
                            onClick={() => setIsAssignModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 border border-purple-100 rounded-lg hover:bg-purple-100 text-sm font-bold transition"
                        >
                            <UserPlus size={16} /> Assign Op
                        </button>
                    )}

                    {/* BOOK BUTTON */}
                    {!isBooked && hasValidPrice && isAgent && (
                        <button 
                            onClick={handleBook} 
                            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white hover:bg-green-700 rounded-lg shadow-sm font-bold transition transform hover:-translate-y-0.5"
                        >
                            <CheckCircle size={18} /> Book Now
                        </button>
                    )}

                    {/* Edit Action */}
                    {!quote.isLocked && (isAgent || isAdminOrStaff) && !isEditingItinerary && (
                         <button onClick={() => setIsEditingItinerary(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium">
                            <Edit2 size={16} /> Edit Itinerary
                        </button>
                    )}

                    {/* Versioning if Locked */}
                    {quote.isLocked && isAgent && !isBooked && (
                        <button onClick={handleCreateRevision} className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 text-sm font-bold transition">
                            <GitBranch size={16} /> New Version
                        </button>
                    )}

                    {/* Share / PDF */}
                    {hasValidPrice && (
                        <>
                            <button onClick={handleCopyLink} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 text-sm font-bold transition">
                                <LinkIcon size={16} /> Copy Link
                            </button>
                            <button onClick={handleShareWhatsApp} className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 text-sm font-bold transition">
                                <Share2 size={16} /> WhatsApp
                            </button>
                            {user && (
                                <button onClick={() => generateQuotePDF(quote, null, user.role, user)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 text-sm font-bold transition shadow-sm">
                                    <Download size={16} /> Download PDF
                                </button>
                            )}
                        </>
                    )}

                    {/* Delete Action */}
                    {!isBooked && (isAgent || isAdminOrStaff) && (
                        <button onClick={handleDelete} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 text-sm font-bold transition" title="Delete Quote">
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>

        {/* PRICE WARNING BANNER */}
        {!hasValidPrice && !isEditingItinerary && (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-r-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex gap-3">
                    <div className="bg-amber-100 p-2 rounded-full h-fit text-amber-600">
                        <AlertTriangle size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-amber-900 text-sm">Price Calculation Required</h3>
                        <p className="text-sm text-amber-800 mt-1 max-w-2xl">
                            Price not calculated. Please edit the itinerary and save to generate a price.
                        </p>
                    </div>
                </div>
                {(isAgent || isAdminOrStaff) && !quote.isLocked && (
                    <button 
                        onClick={() => setIsEditingItinerary(true)}
                        className="bg-white border border-amber-200 text-amber-800 px-5 py-2 rounded-lg text-sm font-bold hover:bg-amber-100 transition whitespace-nowrap shadow-sm flex items-center gap-2"
                    >
                        <Edit2 size={14} /> Edit & Calculate
                    </button>
                )}
            </div>
        )}

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
                    {isAdminOrStaff && quote.operatorId && (
                         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-indigo-500">
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

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h2 className="text-lg font-bold mb-4">Itinerary</h2>
                        <ItineraryView itinerary={quote.itinerary} />
                    </div>
                </div>
                {user && (
                    <div className="lg:col-span-1 space-y-6">
                        <PriceSummary 
                            breakdown={{
                                supplierCost: quote.cost || 0,
                                platformNetCost: quote.price || 0,
                                finalPrice: quote.sellingPrice || 0,
                                agentMarkupValue: (quote.sellingPrice || 0) - (quote.price || 0),
                                gstAmount: 0, 
                                companyMarkupValue: (quote.price || 0) - (quote.cost || 0),
                                subtotal: quote.sellingPrice || 0,
                                perPersonPrice: quote.paxCount > 0 ? (quote.sellingPrice || 0) / quote.paxCount : 0
                            }}
                            role={user.role}
                            currency={quote.currency || 'INR'}
                        />
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
                currentNetCost={quote.cost || 0} // Passing System Net Cost
                currency={quote.currency}
            />
        )}
    </div>
  );
};
