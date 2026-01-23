
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../services/adminService';
import { agentService } from '../../services/agentService';
import { quickQuoteTemplateService } from '../../services/quickQuoteTemplateService';
import { calculateQuickEstimate } from '../../services/quickQuotePricing';
import { calculateRequiredRooms, getDestinationDefaults } from '../../utils/quickQuoteDefaults';
import { QuickQuoteInputs, Quote, QuickQuoteTemplate, ItineraryItem } from '../../types';
import { MapPin, Calendar, Users, Hotel, Coffee, Car, Star, DollarSign, ArrowRight, Sparkles, AlertCircle, Save, X, LayoutTemplate, User, IndianRupee } from 'lucide-react';
import { TemplateSelector } from '../../components/quickQuote/TemplateSelector';

export const QuickQuote: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const destinations = adminService.getDestinations().filter(d => d.isActive);

  // --- FORM STATE ---
  const [destination, setDestination] = useState('');
  const [travelDate, setTravelDate] = useState(new Date().toISOString().split('T')[0]); // Default today
  const [nights, setNights] = useState(4);
  const [guestName, setGuestName] = useState('');
  const [guestSalutation, setGuestSalutation] = useState('Mr');
  const [pax, setPax] = useState({ adults: 2, children: 0 });
  
  // Quick Inputs
  const [inputs, setInputs] = useState<QuickQuoteInputs>({
      hotelCategory: '4 Star',
      mealPlan: 'BB',
      transfersIncluded: true,
      sightseeingIntensity: 'Standard',
      rooms: 1
  });

  // --- UI STATE ---
  const [estimates, setEstimates] = useState({ total: 0, perPerson: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // Auto-Update Defaults when Destination Changes (Only if manual change, not template load)
  const handleDestinationChange = (val: string) => {
      setDestination(val);
      if (val) {
          const defaults = getDestinationDefaults(val);
          setInputs(prev => ({
              ...prev,
              transfersIncluded: defaults.transfers,
              sightseeingIntensity: defaults.sightseeing as any,
              // Keep user choice if they already changed hotel, else use default
              hotelCategory: prev.hotelCategory === '4 Star' ? defaults.hotelCategory as any : prev.hotelCategory,
              mealPlan: prev.mealPlan === 'BB' ? defaults.mealPlan as any : prev.mealPlan
          }));
      }
  };

  // Auto-Calculate Rooms
  useEffect(() => {
      const needed = calculateRequiredRooms(pax.adults, pax.children);
      setInputs(prev => ({ ...prev, rooms: needed }));
  }, [pax.adults, pax.children]);

  // Real-time Pricing
  useEffect(() => {
      if (destination && nights > 0) {
          const result = calculateQuickEstimate(destination, nights, pax, inputs);
          setEstimates({ total: result.total, perPerson: result.perPerson });
      }
  }, [destination, nights, pax, inputs]);

  const handleApplyTemplate = (tpl: QuickQuoteTemplate) => {
      setDestination(tpl.destination);
      setNights(tpl.nights);
      setInputs(tpl.inputs);
      if (tpl.defaultPax) {
          setPax(tpl.defaultPax);
      }
      setShowTemplates(false);
  };

  const handleSaveTemplate = () => {
      if (!user || !templateName) return;
      
      const newTemplate: QuickQuoteTemplate = {
          id: `tpl_ag_${Date.now()}`,
          name: templateName,
          description: `Custom template for ${destination}`,
          destination,
          nights,
          inputs,
          defaultPax: pax,
          tags: ['Custom'],
          isSystem: false,
          createdBy: user.id,
          createdAt: new Date().toISOString()
      };

      quickQuoteTemplateService.saveTemplate(newTemplate);
      setShowSaveTemplateModal(false);
      setTemplateName('');
      alert("Template Saved Successfully!");
  };

  // Helper to build a skeleton itinerary for PDF generation
  const generateSkeletonItinerary = (): ItineraryItem[] => {
      const items: ItineraryItem[] = [];
      const city = destination.split(',')[0].trim();

      for (let i = 1; i <= nights + 1; i++) {
          const isArrival = i === 1;
          const isDeparture = i === nights + 1;
          const dayServices = [];
          
          let title = `Day ${i} - Leisure`;
          let desc = 'Day at leisure to explore on your own.';

          // Day 1: Arrival
          if (isArrival) {
              title = `Arrival in ${city}`;
              desc = `Welcome to ${city}! Transfer to your hotel.`;
              if (inputs.transfersIncluded) {
                  dayServices.push({
                      id: `t_arr_${Date.now()}`,
                      type: 'TRANSFER' as const,
                      name: 'Airport Pickup',
                      cost: 0, price: 0,
                      meta: { vehicle: 'Private Sedan' }
                  });
              }
          }
          // Day N: Departure
          else if (isDeparture) {
              title = `Departure from ${city}`;
              desc = `Check out and transfer to airport. Safe travels!`;
              if (inputs.transfersIncluded) {
                  dayServices.push({
                      id: `t_dep_${Date.now()}`,
                      type: 'TRANSFER' as const,
                      name: 'Airport Drop-off',
                      cost: 0, price: 0,
                      meta: { vehicle: 'Private Sedan' }
                  });
              }
          }
          // Middle Days: Sightseeing
          else {
              if (inputs.sightseeingIntensity !== 'None') {
                  title = `City Exploration`;
                  desc = `Enjoy local sightseeing tours.`;
                  dayServices.push({
                      id: `act_${i}_${Date.now()}`,
                      type: 'ACTIVITY' as const,
                      name: `${city} City Tour`,
                      cost: 0, price: 0,
                      meta: { type: 'City Tour' }
                  });
              }
          }

          items.push({
              day: i,
              title,
              description: desc,
              inclusions: isArrival ? [] : ['Breakfast'],
              services: dayServices
          });
      }
      return items;
  };

  const handleCreate = async () => {
      if (!user || !destination) return;
      setIsSubmitting(true);

      try {
          const fullGuestName = `${guestSalutation}. ${guestName}`;

          // 1. Create Quote Object
          const newQuote = agentService.createQuote(user, destination, travelDate, pax.adults + pax.children, fullGuestName);
          
          // 2. Generate Skeleton Itinerary for PDF Support
          const skeletonItinerary = generateSkeletonItinerary();

          // 3. Enhance with Quick Quote Data
          const quickDetails = {
              ...newQuote,
              type: 'QUICK' as const,
              status: 'ESTIMATE' as const,
              quickQuoteInputs: inputs,
              itinerary: skeletonItinerary, // Attach generated items
              price: estimates.total, // System Net Estimate (Hidden internal ref)
              sellingPrice: estimates.total, // Suggested Selling
              currency: 'INR', // Explicitly set INR
              serviceDetails: `${nights}N Trip to ${destination}. ${inputs.hotelCategory} Hotel (${inputs.mealPlan}). ${inputs.sightseeingIntensity} Sightseeing.`
          };

          agentService.updateQuote(quickDetails);
          navigate(`/quote/${newQuote.id}`);

      } catch (error) {
          console.error(error);
          setIsSubmitting(false);
      }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl relative">
        
        {/* Template Modal Overlay */}
        {showTemplates && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                <TemplateSelector onSelect={handleApplyTemplate} onClose={() => setShowTemplates(false)} />
            </div>
        )}

        {/* Save Template Modal */}
        {showSaveTemplateModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold">Save as Template</h3>
                        <button onClick={() => setShowSaveTemplateModal(false)}><X size={20} className="text-slate-400"/></button>
                    </div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Template Name</label>
                    <input 
                        type="text" 
                        autoFocus
                        className="w-full border border-slate-300 rounded-lg p-2.5 mb-4 focus:ring-2 focus:ring-brand-500 outline-none"
                        placeholder="e.g. My Dubai Family Special"
                        value={templateName}
                        onChange={e => setTemplateName(e.target.value)}
                    />
                    <button 
                        onClick={handleSaveTemplate}
                        disabled={!templateName}
                        className="w-full bg-brand-600 text-white py-2 rounded-lg font-bold hover:bg-brand-700 disabled:opacity-50"
                    >
                        Save Template
                    </button>
                </div>
            </div>
        )}

        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="text-brand-600" /> Quick Quote
                </h1>
                <p className="text-slate-500">Generate an instant client-ready estimate in seconds.</p>
            </div>
            <button 
                onClick={() => setShowTemplates(true)}
                className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-slate-800 transition flex items-center gap-2 shadow-lg shadow-slate-200"
            >
                <LayoutTemplate size={18} /> Load Template
            </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* LEFT: INPUT FORM */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* 1. Trip Basics */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <MapPin size={18} className="text-slate-400"/> Trip Details
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Destination</label>
                            <select 
                                className="w-full border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition font-medium"
                                value={destination}
                                onChange={e => handleDestinationChange(e.target.value)}
                            >
                                <option value="">Select Destination...</option>
                                {destinations.map(d => <option key={d.id} value={`${d.city}, ${d.country}`}>{d.city}, {d.country}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Travel Date</label>
                            <input 
                                type="date" 
                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 outline-none"
                                value={travelDate}
                                onChange={e => setTravelDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nights</label>
                            <div className="flex items-center gap-3">
                                <input 
                                    type="range" min="2" max="14" 
                                    className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                    value={nights}
                                    onChange={e => setNights(Number(e.target.value))}
                                />
                                <span className="font-bold text-slate-800 w-8 text-center">{nights}</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Lead Guest Name</label>
                            <div className="flex">
                                <select
                                    value={guestSalutation}
                                    onChange={(e) => setGuestSalutation(e.target.value)}
                                    className="rounded-l-lg border border-r-0 border-slate-300 px-3 py-2.5 bg-slate-50 focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                                >
                                    <option value="Mr">Mr.</option>
                                    <option value="Ms">Ms.</option>
                                    <option value="Mrs">Mrs.</option>
                                </select>
                                <input 
                                    type="text" 
                                    className="flex-1 w-full border border-slate-300 rounded-r-lg p-2.5 focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="John Doe"
                                    value={guestName}
                                    onChange={e => setGuestName(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Pax & Preferences */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Users size={18} className="text-slate-400"/> Configuration
                    </h3>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Adults</label>
                            <input type="number" min="1" className="w-full border p-2 rounded-lg" value={pax.adults} onChange={e => setPax({...pax, adults: Number(e.target.value)})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Children</label>
                            <input type="number" min="0" className="w-full border p-2 rounded-lg" value={pax.children} onChange={e => setPax({...pax, children: Number(e.target.value)})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rooms</label>
                            <input type="number" min="1" className="w-full border p-2 rounded-lg font-bold text-brand-700 bg-brand-50" value={inputs.rooms} onChange={e => setInputs({...inputs, rooms: Number(e.target.value)})} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Hotel Grade */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Hotel Category</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['3 Star', '4 Star', '5 Star', 'Luxury'].map((cat) => (
                                    <button 
                                        key={cat}
                                        type="button"
                                        onClick={() => setInputs({...inputs, hotelCategory: cat as any})}
                                        className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${inputs.hotelCategory === cat ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Meal Plan */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Meal Plan</label>
                            <div className="flex gap-2">
                                {['RO', 'BB', 'HB', 'AI'].map((mp) => (
                                    <button 
                                        key={mp}
                                        type="button"
                                        onClick={() => setInputs({...inputs, mealPlan: mp as any})}
                                        className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold border transition ${inputs.mealPlan === mp ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300'}`}
                                    >
                                        {mp}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Sightseeing */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Sightseeing</label>
                            <div className="flex gap-2">
                                {['None', 'Standard', 'Premium'].map((opt) => (
                                    <button 
                                        key={opt}
                                        type="button"
                                        onClick={() => setInputs({...inputs, sightseeingIntensity: opt as any})}
                                        className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold border transition ${inputs.sightseeingIntensity === opt ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'}`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Transfers */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Transfers</label>
                            <button 
                                type="button"
                                onClick={() => setInputs({...inputs, transfersIncluded: !inputs.transfersIncluded})}
                                className={`w-full py-2 px-4 rounded-lg text-xs font-bold border flex items-center justify-center gap-2 transition ${inputs.transfersIncluded ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}
                            >
                                <Car size={16} /> {inputs.transfersIncluded ? 'Included (Airport + Intercity)' : 'No Transfers'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT: LIVE PREVIEW */}
            <div className="lg:col-span-1">
                <div className="bg-slate-900 text-white rounded-2xl shadow-xl p-6 sticky top-24">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <p className="text-slate-400 text-xs uppercase font-bold tracking-wider">Estimated Cost</p>
                            <h2 className="text-4xl font-bold mt-1">₹ {estimates.total.toLocaleString()}</h2>
                            <p className="text-sm text-slate-300 mt-1">
                                ~ ₹ {estimates.perPerson.toLocaleString()} per person
                            </p>
                        </div>
                        <div className="bg-white/10 p-2 rounded-lg">
                            <IndianRupee size={24} className="text-green-400" />
                        </div>
                    </div>

                    <div className="space-y-3 mb-8">
                        <div className="flex items-center gap-3 text-sm text-slate-300">
                            <User size={16} /> 
                            <span>{guestSalutation}. {guestName || 'Client Name'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-300">
                            <Hotel size={16} /> 
                            <span>{inputs.hotelCategory} Hotels ({inputs.mealPlan})</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-300">
                            <Car size={16} /> 
                            <span>{inputs.transfersIncluded ? 'Private Transfers' : 'Transfers Excluded'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-300">
                            <Star size={16} /> 
                            <span>{inputs.sightseeingIntensity} Sightseeing</span>
                        </div>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-6 text-xs text-amber-200 flex gap-2 items-start">
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <p>This is an AI-generated estimate. Convert to detailed itinerary for exact pricing.</p>
                    </div>

                    <div className="space-y-3">
                        <button 
                            onClick={handleCreate}
                            disabled={!destination || isSubmitting}
                            className="w-full bg-white text-slate-900 font-bold py-4 rounded-xl hover:bg-slate-100 transition flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Generating...' : 'Create Quote'} <ArrowRight size={20} />
                        </button>
                        
                        <button 
                            onClick={() => setShowSaveTemplateModal(true)}
                            disabled={!destination}
                            className="w-full bg-slate-800 text-slate-300 font-medium py-3 rounded-xl hover:bg-slate-700 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                        >
                            <Save size={16} /> Save as Template
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
