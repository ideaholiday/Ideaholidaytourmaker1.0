
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
import { ArrowLeft, Edit2, Download, Share2, GitBranch, AlertTriangle, Link as LinkIcon, CheckCircle, Trash2, UserPlus, Truck, Phone, MessageCircle, CreditCard, Save, Loader2 } from 'lucide-react';
import { calculatePriceFromNet } from '../utils/pricingEngine';
import { usePricingEngine } from '../hooks/usePricingEngine';
import { ItineraryBuilder } from '../components/ItineraryBuilder';
import { generateQuotePDF } from '../utils/pdfGenerator';
import { formatWhatsAppQuote } from '../utils/whatsappFormatter';
import { AssignOperatorModal } from '../components/booking/AssignOperatorModal';
import { dbHelper } from '../../services/firestoreHelper';

export const QuoteDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isEditingItinerary, setIsEditingItinerary] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  
  // PDF State
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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
        // Direct DB fetch to bypass Agent-only filters if Admin
        const found = await dbHelper.getById<Quote>('quotes', id);

        if (found) {
            // Security: If Agent, check ownership
            if (user.role === UserRole.AGENT && found.agentId !== user.id) {
                setQuote(null); // Deny access
            } 
            // Security: If Operator, check assignment
            else if (user.role === UserRole.OPERATOR && found.operatorId !== user.id) {
                 setQuote(null);
            }
            else {
                setQuote(found);
                initPricingEngine(found);
                if (found.operationalDetails) {
                    setAdminPaymentStatus(found.operationalDetails.paymentStatus || 'PENDING');
                    setAdminPaymentNote(found.operationalDetails.paymentNotes || '');
                }
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
              if (isAdminOrStaff) {
                  // Admin goes back to agent profile or dashboard
                  navigate(-1);
              } else {
                  navigate('/agent/quotes');
              }
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

  const handlePdfGeneration = async () => {
      if (!user || !quote) return;
      setIsGeneratingPdf(true);
      try {
          await generateQuotePDF(quote, null, user.role, user);
      } catch (e) {
          console.error("PDF Gen Error", e);
          alert("Failed to generate PDF. Check console.");
      } finally {
          setIsGeneratingPdf(false);
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
                        {isAdminOrStaff && quote.agentName && <span className="bg-blue-50 text-blue-700 px-2 rounded-full text-xs">Agent: {quote.agentName}</span>}
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
                    {!isBooked && hasValidPrice && (isAgent || isAdminOrStaff) && (
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
                    {quote.isLocked && (isAgent || isAdminOrStaff) && !isBooked && (
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
                                <button 
                                    onClick={handlePdfGeneration} 
                                    disabled={isGeneratingPdf}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 text-sm font-bold transition shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isGeneratingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} 
                                    {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
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
                    {/* ... (Existing Ops and Itinerary View) ... */}
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

        {isAssignModalOpen && (
            <AssignOperatorModal 
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                onAssign={handleAssignOperator}
                currentNetCost={quote.cost || 0}
                currency={quote.currency}
            />
        )}
    </div>
  );
};
