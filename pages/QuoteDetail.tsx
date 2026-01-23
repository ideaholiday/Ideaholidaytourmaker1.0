
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { agentService } from '../../services/agentService';
import { adminService } from '../../services/adminService';
import { currencyService } from '../../services/currencyService';
import { Quote, ItineraryItem, UserRole } from '../../types';
import { ItineraryView } from '../components/ItineraryView';
import { PriceSummary } from '../components/PriceSummary';
import { ArrowLeft, Edit2, Download, Share2, GitBranch, AlertTriangle } from 'lucide-react';
import { calculatePriceFromNet } from '../utils/pricingEngine';
import { usePricingEngine } from '../hooks/usePricingEngine';
import { ItineraryBuilder } from '../components/ItineraryBuilder';
import { generateQuotePDF } from '../utils/pdfGenerator';
import { formatWhatsAppQuote } from '../utils/whatsappFormatter';

export const QuoteDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isEditingItinerary, setIsEditingItinerary] = useState(false);
  
  const { updateHotel, setInput } = usePricingEngine();

  useEffect(() => {
    loadQuote();
  }, [id, user]);

  const loadQuote = () => {
    if (id && user) {
        const storedQuotes = localStorage.getItem('iht_agent_quotes');
        const parsedQuotes: Quote[] = storedQuotes ? JSON.parse(storedQuotes) : [];
        const found = parsedQuotes.find(q => q.id === id);

        if (found) {
            setQuote(found);
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
        }
    }
  };

  if (!quote || !user) return <div className="p-8">Loading Quote...</div>;

  const isAgent = user.role === UserRole.AGENT;
  const pricingRules = adminService.getPricingRule();
  const hasValidPrice = (quote.sellingPrice !== undefined && quote.sellingPrice > 0);

  // --- ACTIONS ---

  const handleUpdateItinerary = (newItinerary: ItineraryItem[], financials?: { net: number, selling: number, currency: string }) => {
    
    // IF Financials passed from Builder (Recommended Path)
    // We use the robust calculation from the builder's backend simulation directly
    if (financials) {
         const updatedQuote: Quote = { 
            ...quote, 
            itinerary: newItinerary,
            currency: financials.currency,
            cost: 0, // Not exposed in simple view
            price: financials.net, // B2B
            sellingPrice: financials.selling, // Client
            type: 'DETAILED' as const,
            status: quote.status
        };

        agentService.updateQuote(updatedQuote);
        setQuote(updatedQuote);
        setIsEditingItinerary(false);
        return;
    }

    // FALLBACK CALCULATION (If saving without builder calculation logic - e.g. legacy)
    // NOTE: This logic is prone to errors if multipliers are missed.
    let calculatedRawCost = 0;
    const quoteCurrency = quote.currency || 'INR';

    newItinerary.forEach(day => {
        if (day.services) {
            day.services.forEach(svc => {
                if (!svc.isRef) {
                    // Logic Update: Ensure Quantity and Nights are factored in
                    const qty = svc.quantity || 1;
                    const nights = svc.duration_nights || 1;
                    const unitCost = currencyService.convert(svc.cost, svc.currency || 'USD', quoteCurrency);
                    
                    calculatedRawCost += (unitCost * qty * nights); 
                }
            });
        }
    });

    const currentAgentMarkupValue = undefined; 

    // This computes Selling Price based on Supplier Net
    // Note: 'calculatedRawCost' here acts as the 'Net B2B Cost' (platform margin already in unit cost usually for agents)
    // Actually, in our mock, unit cost from admin IS supplier cost. 
    // So we use calculatePriceFromNet which adds Platform Margin.
    const financialsCalc = calculatePriceFromNet(
        calculatedRawCost,
        pricingRules,
        quote.paxCount,
        currentAgentMarkupValue, 
        quoteCurrency
    );

    const updatedQuote: Quote = { 
        ...quote, 
        itinerary: newItinerary,
        currency: quoteCurrency,
        cost: calculatedRawCost, 
        price: financialsCalc.platformNetCost, 
        sellingPrice: financialsCalc.finalPrice, 
        type: 'DETAILED' as const,
        status: quote.status
    };

    agentService.updateQuote(updatedQuote);
    setQuote(updatedQuote);
    setIsEditingItinerary(false);
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

  const handleCreateRevision = () => {
      if (confirm("Create a new version to edit? The current version will remain locked as history.")) {
          const newQuote = agentService.createRevision(quote.id, user);
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
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    
                    {/* Edit Action */}
                    {!quote.isLocked && isAgent && !isEditingItinerary && (
                         <button onClick={() => setIsEditingItinerary(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium">
                            <Edit2 size={16} /> Edit Itinerary
                        </button>
                    )}

                    {/* Versioning if Locked */}
                    {quote.isLocked && isAgent && (
                        <button onClick={handleCreateRevision} className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 text-sm font-bold transition">
                            <GitBranch size={16} /> New Version
                        </button>
                    )}

                    {/* Share / PDF */}
                    {hasValidPrice && (
                        <>
                            <button onClick={handleShareWhatsApp} className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 text-sm font-bold transition">
                                <Share2 size={16} /> WhatsApp
                            </button>
                            <button onClick={() => generateQuotePDF(quote, null, user.role, user)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 text-sm font-bold transition shadow-sm">
                                <Download size={16} /> Download PDF
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>

        {/* PRICE WARNING */}
        {!hasValidPrice && !isEditingItinerary && (
             <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-center gap-3 text-amber-800 animate-pulse">
                <AlertTriangle size={20} />
                <p className="font-bold text-sm">Price not calculated. Please edit the itinerary and save to generate a price before downloading PDF.</p>
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
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h2 className="text-lg font-bold mb-4">Itinerary</h2>
                        <ItineraryView itinerary={quote.itinerary} />
                    </div>
                </div>
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
            </div>
        )}
    </div>
  );
};
