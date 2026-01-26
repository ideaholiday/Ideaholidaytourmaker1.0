
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { agentService } from '../../services/agentService';
import { adminService } from '../../services/adminService';
import { ItineraryBuilder } from '../../components/ItineraryBuilder';
import { CityNightSelector } from '../../components/CityNightSelector';
import { CitySequencePreview } from '../../components/CitySequencePreview';
import { ItineraryItem, CityVisit, Quote } from '../../types';
import { Map, Save, ArrowRight, Play, Calendar, User, Layout } from 'lucide-react';
import { calculatePriceFromNet } from '../../utils/pricingEngine';
import { currencyService } from '../../services/currencyService';

export const SmartBuilder: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Basics State
  const [step, setStep] = useState<1 | 2>(1);
  const [basics, setBasics] = useState({
      travelDate: new Date().toISOString().split('T')[0],
      adults: 2,
      children: 0,
      childAges: [] as number[],
      guestName: '',
      guestSalutation: 'Mr'
  });
  
  // Route State
  const [selectedCities, setSelectedCities] = useState<CityVisit[]>([]);
  const destinations = adminService.getDestinationsSync().filter(d => d.isActive);

  // Result Itinerary
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  
  const showToast = (msg: string, type: 'success' | 'error') => alert(msg);

  // --- LOGIC: GENERATE ITINERARY FROM CITIES ---
  const handleGenerateItinerary = () => {
    if (selectedCities.length === 0) {
        showToast("Please add at least one city.", 'error');
        return;
    }

    const generated: ItineraryItem[] = [];
    let dayCount = 1;

    selectedCities.forEach((visit, cityIdx) => {
        const isLastCity = cityIdx === selectedCities.length - 1;
        
        for (let i = 0; i < visit.nights; i++) {
            const isArrivalDay = i === 0;
            const isDepartureDay = i === visit.nights - 1 && isLastCity; // Only last day of last city is true departure
            
            // Day Metadata
            let title = `${visit.cityName} - Leisure`;
            let description = 'Day at leisure to explore.';
            const services = [];

            if (isArrivalDay && cityIdx === 0) {
                title = `Arrival in ${visit.cityName}`;
                description = `Welcome to ${visit.cityName}! Private transfer to your hotel.`;
                services.push({
                    id: `tr_arr_${dayCount}`, type: 'TRANSFER', name: 'Airport Arrival Transfer', 
                    cost: 0, price: 0, currency: 'INR', meta: { vehicle: 'Sedan' }
                });
            } else if (isArrivalDay && cityIdx > 0) {
                 title = `Transfer to ${visit.cityName}`;
                 description = `Travel to ${visit.cityName} and check-in to your hotel.`;
                 services.push({
                    id: `tr_inter_${dayCount}`, type: 'TRANSFER', name: 'Inter-city Transfer',
                    cost: 0, price: 0, currency: 'INR', meta: { vehicle: 'Van' }
                 });
            } else if (isDepartureDay) {
                // If it's the last day of a visit, but there are more cities, it's handled by the NEXT city's arrival logic usually.
                // But wait, the loop runs for 'nights'.
                // If 2 nights: Day 1 (Arr), Day 2 (Full). Day 3 is departure?
                // Standard logic: Nights = Hotel Nights.
                // Itinerary Days = Nights + 1 (usually).
                // Let's stick to Day = Night for simplicity, with +1 day at end for departure.
            }
            
            generated.push({
                day: dayCount,
                title: title,
                description: description,
                cityId: visit.cityId,
                inclusions: [], // Defaults to empty. Added only if Meal Plan selected later.
                services: services as any
            });
            dayCount++;
        }
    });

    // Add Final Departure Day
    generated.push({
        day: dayCount,
        title: 'Departure',
        description: 'Check-out and transfer to airport for your onward journey.',
        cityId: selectedCities[selectedCities.length - 1].cityId,
        inclusions: [], // Defaults to empty
        services: [{
             id: `tr_dep_${dayCount}`, type: 'TRANSFER', name: 'Airport Departure Transfer',
             cost: 0, price: 0, currency: 'INR', meta: { vehicle: 'Sedan' }
        }] as any
    });

    setItinerary(generated);
    setStep(2);
  };

  const calculateFinancials = () => {
      let totalRawCost = 0;
      const currency = 'INR'; 
      const pricingRules = adminService.getPricingRuleSync();

      itinerary.forEach(day => {
          day.services?.forEach(svc => {
              if (!svc.isRef) {
                  totalRawCost += currencyService.convert(svc.cost, svc.currency || 'USD', currency);
              }
          });
      });

      return calculatePriceFromNet(
          totalRawCost,
          pricingRules,
          basics.adults + basics.children,
          undefined,
          currency
      );
  };

  const handleSaveQuote = async (finalItinerary: ItineraryItem[]) => {
      setItinerary(finalItinerary); // Update state with final edits
      
      const financials = calculateFinancials();
      const currency = 'INR'; 
      const fullGuestName = `${basics.guestSalutation}. ${basics.guestName}`;
      const destinationName = selectedCities.map(c => c.cityName).join(', ');
      const totalNights = selectedCities.reduce((sum, c) => sum + c.nights, 0);

      const newQuote = await agentService.createQuote(
          user!, 
          destinationName, 
          basics.travelDate, 
          basics.adults + basics.children, 
          fullGuestName
      );
      
      const updatedQuote: Quote = {
          ...newQuote,
          childCount: basics.children,
          childAges: basics.childAges,
          itinerary: finalItinerary,
          
          cost: financials.supplierCost, 
          price: financials.platformNetCost,
          sellingPrice: financials.finalPrice,
          
          currency: currency,
          serviceDetails: `${totalNights} Nights Trip: ${destinationName}`,
          cityVisits: selectedCities
      };

      await agentService.updateQuote(updatedQuote);
      showToast("Quote Saved!", 'success');
      setTimeout(() => navigate(`/quote/${newQuote.id}`), 500);
  };

  return (
    <div className="container mx-auto px-4 py-8">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Map className="text-brand-600" /> Smart Itinerary Builder
            </h1>
            <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className={`px-3 py-1 rounded-full ${step === 1 ? 'bg-brand-600 text-white' : 'bg-slate-200'}`}>1. Route</span>
                <ArrowRight size={14} />
                <span className={`px-3 py-1 rounded-full ${step === 2 ? 'bg-brand-600 text-white' : 'bg-slate-200'}`}>2. Services</span>
            </div>
        </div>

        {/* STEP 1: ROUTE BUILDER */}
        {step === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* BASICS CARD */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><User size={18}/> Guest Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Guest Name</label>
                                <input type="text" className="w-full border p-2.5 rounded-lg" value={basics.guestName} onChange={e => setBasics({...basics, guestName: e.target.value})} placeholder="Lead Guest" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Date</label>
                                <input type="date" className="w-full border p-2.5 rounded-lg" value={basics.travelDate} onChange={e => setBasics({...basics, travelDate: e.target.value})} />
                            </div>
                             <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Adults</label>
                                    <input type="number" min="1" className="w-full border p-2.5 rounded-lg" value={basics.adults} onChange={e => setBasics({...basics, adults: Number(e.target.value)})} />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Children</label>
                                    <input type="number" min="0" className="w-full border p-2.5 rounded-lg" value={basics.children} onChange={e => setBasics({...basics, children: Number(e.target.value)})} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ROUTE BUILDER CARD */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 min-h-[400px]">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Layout size={18}/> Build Route</h3>
                        
                        <CityNightSelector 
                            destinations={destinations}
                            selectedCities={selectedCities}
                            onChange={setSelectedCities}
                        />

                        {/* AI OPTIMIZATION PREVIEW */}
                        <CitySequencePreview 
                            currentVisits={selectedCities}
                            onApply={setSelectedCities}
                        />

                    </div>
                </div>

                <div className="lg:col-span-1">
                    <div className="bg-slate-900 text-white rounded-xl p-6 sticky top-24">
                        <h3 className="font-bold text-lg mb-2">Trip Summary</h3>
                        <div className="text-sm text-slate-300 space-y-2 mb-6">
                            <p><strong>Guest:</strong> {basics.guestName || 'Pending'}</p>
                            <p><strong>Travelers:</strong> {basics.adults} Adults, {basics.children} Children</p>
                            <p><strong>Duration:</strong> {selectedCities.reduce((sum, c) => sum + c.nights, 0)} Nights</p>
                            <div className="border-t border-slate-700 pt-2 mt-2">
                                <p className="font-bold mb-1">Route:</p>
                                <ul className="list-disc pl-4 space-y-1">
                                    {selectedCities.map((c, i) => (
                                        <li key={i}>{c.cityName} ({c.nights}N)</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        
                        <button 
                            onClick={handleGenerateItinerary}
                            disabled={selectedCities.length === 0}
                            className="w-full bg-white text-slate-900 py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-slate-100 disabled:opacity-50 transition"
                        >
                            <Play size={18} /> Generate Itinerary
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* STEP 2: DETAILED BUILDER */}
        {step === 2 && (
            <ItineraryBuilder 
                initialItinerary={itinerary}
                destination={selectedCities.map(c => c.cityName).join(', ')}
                pax={basics.adults + basics.children} // Added pax
                onSave={handleSaveQuote}
                onCancel={() => setStep(1)}
            />
        )}
    </div>
  );
};
