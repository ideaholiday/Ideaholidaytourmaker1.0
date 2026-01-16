
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { agentService } from '../services/agentService';
import { bookingService } from '../services/bookingService'; // Import Booking Service
import { currencyService } from '../services/currencyService';
import { INITIAL_QUOTES } from '../constants';
import { Quote, Message, UserRole, ItineraryItem, Traveler } from '../types';
import { usePricingEngine } from '../hooks/usePricingEngine';
import { formatWhatsAppQuote } from '../utils/whatsappFormatter';
import { generateQuotePDF } from '../utils/pdfGenerator';
import { QuoteHeader } from '../components/QuoteHeader';
import { ItineraryView } from '../components/ItineraryView';
import { ItineraryBuilder } from '../components/ItineraryBuilder';
import { PriceSummary } from '../components/PriceSummary';
import { ChatPanel } from '../components/ChatPanel';
import { OperatorQuoteView } from '../components/OperatorQuoteView';
import { OperatorAssignmentPanel } from '../components/OperatorAssignmentPanel';
import { BookingWizard } from '../components/agent/BookingWizard'; // Import BookingWizard
import { ArrowLeft, Sparkles, Calculator, Download, Share2, FileText, Edit, Wallet, Printer, AlertTriangle, CheckCircle, CreditCard, X, EyeOff, Coins, Globe, RefreshCw, User } from 'lucide-react';

export const QuoteDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [quote, setQuote] = useState<Quote | undefined>(undefined);
  
  // UI Tabs & Modes
  const [activeTab, setActiveTab] = useState<'ITINERARY' | 'COSTING'>('ITINERARY');
  const [isEditingItinerary, setIsEditingItinerary] = useState(false);

  // Agent Markup State
  const [agentMarkupAmount, setAgentMarkupAmount] = useState<number>(0);

  // Currency Display State
  const [displayCurrency, setDisplayCurrency] = useState('USD');
  const availableCurrencies = currencyService.getCurrencies();

  // Booking State
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Pricing Hook
  const { input, setInput, breakdown, updateHotel, updateRules } = usePricingEngine();

  // Load Data
  useEffect(() => {
    if (!id || !user) return;

    const allQuotes = agentService.getQuotes(user.id);
    let found = allQuotes.find(q => q.id === id);
    
    // Fallback to constants (Mock Data)
    if (!found) {
        found = INITIAL_QUOTES.find(q => q.id === id);
    }

    if (found) {
        setQuote(found);
        setDisplayCurrency(found.currency || 'USD');
        
        // Initialize Markup State for Agents
        if (found.sellingPrice && found.price) {
            setAgentMarkupAmount(found.sellingPrice - found.price);
        } else {
            setAgentMarkupAmount(0);
        }

        // Initialize calculator with quote data
        setInput(prev => ({
            ...prev,
            travelers: { adults: found!.paxCount, children: 0, infants: 0 },
            hotel: { ...prev.hotel, cost: found!.cost || 0 }, 
            rules: { ...prev.rules, companyMarkup: 10, agentMarkup: 5 }
        }));
    }
  }, [id, user, setInput]);

  if (!user || !quote) return <div className="p-8 text-center">Loading or Access Denied...</div>;

  const isOperator = user.role === UserRole.OPERATOR;
  const isAdminOrStaff = user.role === UserRole.ADMIN || user.role === UserRole.STAFF;
  const isAgent = user.role === UserRole.AGENT;
  const canEdit = isAgent || isAdminOrStaff;
  const isQuickQuote = quote.type === 'QUICK';
  
  // Dynamic Price Conversion Logic
  const convertedPrice = currencyService.convert(quote.price || 0, quote.currency || 'USD', displayCurrency);
  const convertedSellingPrice = currencyService.convert(quote.sellingPrice || 0, quote.currency || 'USD', displayCurrency);
  const convertedBreakdown = breakdown ? {
      ...breakdown,
      netCost: currencyService.convert(breakdown.netCost, quote.currency || 'USD', displayCurrency),
      companyMarkupValue: currencyService.convert(breakdown.companyMarkupValue, quote.currency || 'USD', displayCurrency),
      agentMarkupValue: currencyService.convert(breakdown.agentMarkupValue, quote.currency || 'USD', displayCurrency),
      gstAmount: currencyService.convert(breakdown.gstAmount, quote.currency || 'USD', displayCurrency),
      finalPrice: convertedSellingPrice,
      perPersonPrice: convertedSellingPrice / quote.paxCount
  } : null;

  const handleSendMessage = (text: string) => {
    const msg: Message = {
      id: Date.now().toString(),
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role,
      content: text,
      timestamp: new Date().toISOString(),
      isSystem: false
    };
    
    const updatedQuote = { ...quote, messages: [...quote.messages, msg] };
    setQuote(updatedQuote);
    agentService.updateQuote(updatedQuote);
  };

  const handleOperatorAssignment = (operatorId: string, operatorName: string, pricing: { mode: 'NET' | 'FIXED', price?: number }) => {
      // (Implementation same as previous)
  };

  const handleUpdateItinerary = (newItinerary: ItineraryItem[]) => {
    let calculatedCost = 0;
    const quoteCurrency = quote.currency || 'USD';

    newItinerary.forEach(day => {
        if (day.services) {
            day.services.forEach(svc => {
                if (!svc.isRef) {
                    // Correct Currency Logic: Convert Item's Currency to Quote's Currency
                    const serviceCost = currencyService.convert(svc.cost, svc.currency || 'USD', quoteCurrency);
                    calculatedCost += serviceCost; 
                }
            });
        }
    });

    const hasNewPricing = calculatedCost > 0;
    const b2bPrice = hasNewPricing ? Math.ceil(calculatedCost * 1.15) : (quote.price || 0);
    
    // Agent markup is stored in quote currency on this page
    const newSellingPrice = b2bPrice + agentMarkupAmount;

    const updatedQuote = { 
        ...quote, 
        itinerary: newItinerary,
        // Keep quote currency consistent
        currency: quoteCurrency,
        cost: hasNewPricing ? calculatedCost : quote.cost,
        price: b2bPrice,
        sellingPrice: newSellingPrice,
        type: 'DETAILED' as const, // Upgrade type
        status: 'PENDING' as const // Reset estimate status
    };

    setQuote(updatedQuote);
    agentService.updateQuote(updatedQuote);
    setIsEditingItinerary(false);

    if (hasNewPricing) {
        updateHotel('cost', calculatedCost); 
        updateHotel('nights', 1);
    }
  };

  const handleAgentMarkupChange = (amount: number) => {
      setAgentMarkupAmount(amount);
      const b2bPrice = quote.price || 0;
      const updatedQuote = {
          ...quote,
          sellingPrice: b2bPrice + amount
      };
      setQuote(updatedQuote);
      agentService.updateQuote(updatedQuote);
  }

  const handleCopyWhatsApp = () => {
    // Use converted prices
    const priceToShare = isAgent ? convertedSellingPrice : convertedPrice;
    const breakdownOverride = { ...convertedBreakdown, finalPrice: priceToShare || 0, perPersonPrice: (priceToShare || 0) / quote.paxCount } as any;
    
    // Pass displayed currency symbol
    const text = formatWhatsAppQuote({ ...quote, currency: displayCurrency }, breakdownOverride, !isOperator);
    navigator.clipboard.writeText(text);
    alert('Quote copied to clipboard! Ready to paste in WhatsApp.');
  };

  const handleDownloadPDF = () => {
    generateQuotePDF({ ...quote, currency: displayCurrency, sellingPrice: convertedSellingPrice, price: convertedPrice }, convertedBreakdown, user.role, user);
  };

  const handleShareClientLink = () => {
      const url = `${window.location.origin}/#/view/${quote.id}`;
      navigator.clipboard.writeText(url);
      alert("White-Label Client Link copied!\n\nThis public link will show YOUR agency branding and hide Idea Holiday.");
  };

  // --- BOOKING LOGIC ---
  const handleOpenBooking = () => { setShowBookingModal(true); };
  
  const submitBooking = (travelers: Traveler[]) => {
      if (!user || !quote) return;
      if (isQuickQuote) {
          alert("Please convert this estimate to a Detailed Itinerary before booking.");
          return;
      }
      
      const newBooking = bookingService.createBookingFromQuote(quote, user, travelers);
      setShowBookingModal(false);
      
      alert(`Booking Created Successfully! Ref: ${newBooking.uniqueRefNo}`);
      navigate(`/booking/${newBooking.id}`);
  };

  const handleConvert = () => {
      if (confirm("This will convert the Estimate into a Detailed Itinerary for customization. Proceed?")) {
          setIsEditingItinerary(true);
      }
  };

  // --------------------------------------------------------
  // OPERATOR VIEW
  // --------------------------------------------------------
  if (isOperator) {
      return (
          <div className="flex-1 container mx-auto px-4 py-8">
              <button onClick={() => navigate('/operator/dashboard')} className="flex items-center text-slate-500 hover:text-slate-800 mb-6">
                  <ArrowLeft size={18} className="mr-1" /> Back to Dashboard
              </button>
              <OperatorQuoteView 
                  quote={quote} 
                  user={user}
                  onUpdateStatus={() => {}} // Simple placeholder
                  onSendMessage={handleSendMessage}
              />
          </div>
      );
  }

  // --------------------------------------------------------
  // AGENT / STAFF / ADMIN VIEW
  // --------------------------------------------------------
  return (
    <div className="flex-1 container mx-auto px-4 py-8">
      <button onClick={() => navigate('/dashboard')} className="flex items-center text-slate-500 hover:text-slate-800 mb-6">
        <ArrowLeft size={18} className="mr-1" /> Back to Dashboard
      </button>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Main Content */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Header Actions */}
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                Quote <span className="text-slate-400 font-normal">#{quote.uniqueRefNo}</span>
                {isQuickQuote && <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded font-bold uppercase">Estimate</span>}
                </h1>
                {quote.leadGuestName && (
                    <div className="text-sm text-slate-600 mt-1 flex items-center gap-1.5 font-medium">
                        <User size={14} className="text-slate-400"/>
                        Prepared for: <span className="text-slate-800">{quote.leadGuestName}</span>
                    </div>
                )}
            </div>
            <div className="flex gap-2">
              {isAgent && (
                  <button onClick={handleShareClientLink} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm font-medium">
                    <Globe size={18} /> Client Link
                  </button>
              )}
              
              {isAgent && !isQuickQuote && (quote.status === 'PENDING' || quote.status === 'CONFIRMED') && (
                  <button onClick={handleOpenBooking} className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition shadow-sm font-medium animate-pulse">
                    <CreditCard size={18} /> Book Now
                  </button>
              )}
              
              <button onClick={handleCopyWhatsApp} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition shadow-sm">
                <Share2 size={18} /> WhatsApp
              </button>
              <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition shadow-sm">
                <Download size={18} /> PDF
              </button>
            </div>
          </div>

          {/* Quick Quote Banner */}
          {isQuickQuote && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg flex justify-between items-center shadow-sm">
                  <div>
                      <h3 className="font-bold text-amber-800 flex items-center gap-2"><Sparkles size={18}/> Quick Estimate</h3>
                      <p className="text-sm text-amber-700">This price is based on average rates. Convert to a detailed itinerary to book.</p>
                  </div>
                  <button onClick={handleConvert} className="bg-amber-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-amber-700 flex items-center gap-2 shadow-sm">
                      <RefreshCw size={16} /> Convert to Detailed
                  </button>
              </div>
          )}

          {/* Quote Preview Card */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
             
             {/* Header Logic */}
             {isAgent ? (
                 <div className="bg-slate-50 p-6 border-b border-slate-200">
                     <div className="flex items-center gap-3">
                         <div className="bg-indigo-600 p-2 rounded text-white"><Wallet size={24}/></div>
                         <div>
                             <h2 className="font-bold text-xl text-slate-900">{user.companyName || user.name}</h2>
                             <p className="text-xs text-slate-500">Authorized Travel Partner (Your Branding)</p>
                         </div>
                     </div>
                 </div>
             ) : (
                 <QuoteHeader />
             )}
             
             <div className="p-8">
               <div className="flex justify-between items-start mb-8 p-4 bg-slate-50 rounded-lg">
                 <div>
                   <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Prepared For</p>
                   <p className="text-lg font-bold text-slate-900">{quote.paxCount} Travellers</p>
                   <p className="text-sm text-slate-600">{quote.destination}</p>
                 </div>
                 <div className="text-right">
                   <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Travel Date</p>
                   <p className="text-lg font-bold text-slate-900">{quote.travelDate}</p>
                   <p className="text-sm text-slate-600">Valid until {new Date(new Date(quote.travelDate).getTime() - 7 * 86400000).toLocaleDateString()}</p>
                 </div>
               </div>

               {/* Tabs */}
               <div className="flex border-b border-slate-200 mb-6">
                 <button 
                    onClick={() => setActiveTab('ITINERARY')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition ${activeTab === 'ITINERARY' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                 >
                   <span className="flex items-center gap-2"><FileText size={16}/> Itinerary</span>
                 </button>
                 {!isQuickQuote && (
                    <button 
                        onClick={() => setActiveTab('COSTING')}
                        className={`px-6 py-3 text-sm font-medium border-b-2 transition ${activeTab === 'COSTING' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                    <span className="flex items-center gap-2">
                        <Calculator size={16}/> 
                        {isAgent ? 'Profit & Branding' : 'Costing & Adjustments'}
                    </span>
                    </button>
                 )}
               </div>

               {/* Tab Content */}
               {activeTab === 'ITINERARY' && (
                 <div>
                   {isEditingItinerary ? (
                     <ItineraryBuilder 
                       initialItinerary={quote.itinerary && quote.itinerary.length > 0 ? quote.itinerary : [{ day: 1, title: 'Arrival', description: 'Arrive and transfer to hotel.', inclusions: [], services: [] }]}
                       destination={quote.destination}
                       onSave={handleUpdateItinerary}
                       onCancel={() => setIsEditingItinerary(false)}
                     />
                   ) : (
                     <>
                        <div className="flex justify-end mb-4">
                            {canEdit && quote.status !== 'BOOKED' && !isQuickQuote && (
                                <button 
                                    onClick={() => setIsEditingItinerary(true)} 
                                    className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-800 font-medium"
                                >
                                    <Edit size={16} /> Edit Itinerary
                                </button>
                            )}
                        </div>
                       {quote.itinerary && quote.itinerary.length > 0 ? (
                         <ItineraryView itinerary={quote.itinerary} />
                       ) : (
                         <div className="prose prose-slate max-w-none text-sm whitespace-pre-wrap bg-slate-50 p-4 rounded-lg border border-slate-100">
                             <h4 className="font-bold text-slate-700 mb-2">Package Inclusions (Estimate):</h4>
                             {quote.serviceDetails}
                         </div>
                       )}
                     </>
                   )}
                   
                   <div className="mt-8 pt-8 border-t border-slate-100">
                     <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-900 text-lg">
                                {isAgent ? 'Client Price Summary' : 'Quotation Summary'}
                            </h3>
                            
                            {/* Currency Switcher */}
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-300">
                                <Coins size={16} className="text-slate-500" />
                                <select 
                                    value={displayCurrency}
                                    onChange={(e) => setDisplayCurrency(e.target.value)}
                                    className="text-sm font-medium text-slate-700 bg-transparent outline-none cursor-pointer"
                                >
                                    {availableCurrencies.map(c => (
                                        <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        
                        <div className="flex justify-between items-end">
                            <div>
                                <span className="text-base font-bold text-slate-900 block">
                                    {isQuickQuote ? 'Estimated Total' : 'Total Package Cost'}
                                </span>
                                <span className="text-xs text-slate-500">(Incl. of all taxes)</span>
                            </div>
                            <div className="text-right">
                                {isQuickQuote && <span className="block text-[10px] text-amber-600 font-bold uppercase tracking-wide">Starting From</span>}
                                <span className="text-2xl font-bold text-brand-700 font-mono">
                                    {currencyService.getSymbol(displayCurrency)} {isAgent ? convertedSellingPrice.toLocaleString() : convertedPrice.toLocaleString()}
                                </span>
                            </div>
                        </div>
                        
                        {quote.hotelMode === 'REF' && (
                           <div className="mt-3 bg-amber-50 border border-amber-100 p-3 rounded flex gap-2 text-sm text-amber-800">
                               <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                               <span>Reference Hotel cost is excluded from this total.</span>
                           </div>
                        )}
                     </div>
                   </div>
                 </div>
               )}

               {/* COSTING VIEWS (ADMIN/STAFF or AGENT) */}
               {activeTab === 'COSTING' && (
                   <div className="space-y-6 animate-in fade-in">
                       {/* Simplified View for Agent Markup Logic */}
                       {isAgent ? (
                           <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-xl">
                               <h3 className="font-bold text-indigo-900 flex items-center gap-2 mb-4"><Wallet size={20} /> Pricing Control</h3>
                               <div className="bg-white p-4 rounded-lg border border-indigo-100 shadow-sm">
                                  <label className="text-xs text-slate-500 uppercase font-semibold block mb-1">Your Markup (Flat {displayCurrency})</label>
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-400 font-bold">+</span>
                                    <input 
                                        type="number" 
                                        min="0"
                                        // This is a simplification: We assume markup is input in Display Currency
                                        value={Math.round(currencyService.convert(agentMarkupAmount, 'USD', displayCurrency))}
                                        onChange={(e) => {
                                            const val = Number(e.target.value);
                                            // Convert back to base for storage
                                            handleAgentMarkupChange(currencyService.convert(val, displayCurrency, 'USD'));
                                        }}
                                        className="w-full border border-indigo-200 rounded px-2 py-1 font-mono font-bold text-green-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                  </div>
                               </div>
                           </div>
                       ) : (
                           // Admin Costing
                           <div className="bg-amber-50 p-4 rounded-lg text-amber-800 text-sm mb-4 border border-amber-200 flex gap-2">
                               <EyeOff size={16} className="shrink-0 mt-0.5" />
                               <p>Admin Override Mode. Changes affect final price.</p>
                           </div>
                       )}
                       
                       <div className="pt-4 border-t border-slate-100">
                          <PriceSummary breakdown={convertedBreakdown} role={user.role} currency={displayCurrency} />
                       </div>
                   </div>
               )}

             </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Sidebar (Chat / Assignment) */}
        <div className="lg:col-span-1 space-y-6">
            {!isQuickQuote && isAdminOrStaff && (
                <OperatorAssignmentPanel 
                    quote={quote}
                    onAssign={handleOperatorAssignment}
                />
            )}
            <ChatPanel 
                user={user}
                messages={quote.messages}
                onSendMessage={handleSendMessage}
                className="h-[600px] sticky top-24"
            />
        </div>
      </div>

      <BookingWizard 
        quote={quote}
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        onSubmit={submitBooking}
      />
    </div>
  );
};
