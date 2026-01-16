
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../services/adminService';
import { agentService } from '../../services/agentService';
import { favoriteTemplateService } from '../../services/favoriteTemplateService';
import { currencyService } from '../../services/currencyService';
import { calculatePriceFromNet } from '../../utils/pricingEngine';
import { ItineraryItem, ItineraryService, Hotel, Activity, Transfer, AgentFavoriteTemplate, ItineraryTemplate, CityVisit, PricingRule } from '../../types';
import { MapPin, Calendar, Users, Hotel as HotelIcon, ArrowRight, Plus, Trash2, Check, ArrowLeft, DollarSign, Camera, Car, AlertCircle, Info, Plane, Coffee, Star, BedDouble, X, Search, Globe, Route, HelpCircle, Coins, User } from 'lucide-react';
import { TemplateSelector } from '../../components/TemplateSelector';
import { FavoriteTemplateModal } from '../../components/FavoriteTemplateModal';
import { CityNightSelector } from '../../components/CityNightSelector';
import { CitySequencePreview } from '../../components/CitySequencePreview';
import { generateItineraryFromTemplate } from '../../utils/templateEngine';
import { Toast, ToastType } from '../../components/ui/Toast';

export const SmartBuilder: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // --- TOAST STATE ---
  const [toast, setToast] = useState<{ msg: string; type: ToastType; show: boolean }>({ msg: '', type: 'success', show: false });
  const showToast = (msg: string, type: ToastType = 'success') => {
      setToast({ msg, type, show: true });
  };

  // --- PRICING RULES & CURRENCY ---
  const [pricingRules, setPricingRules] = useState<PricingRule>(adminService.getPricingRule());
  const [currency, setCurrency] = useState('USD');
  const currencies = currencyService.getCurrencies();

  // Helper to format prices dynamically
  const formatPrice = (amountInUsd: number) => {
      return `${currencyService.getSymbol(currency)} ${amountInUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  // --- STEP 1: TRIP BASICS ---
  const [basics, setBasics] = useState({
    destinationName: '',
    travelDate: '',
    nights: 3,
    adults: 2,
    children: 0,
    childAges: [] as number[],
    rooms: 1,
    guestName: '',
    guestSalutation: 'Mr'
  });

  // Multi-City State
  const [isMultiCity, setIsMultiCity] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [cityVisits, setCityVisits] = useState<CityVisit[]>([]);

  // Inventory Data
  const allDestinations = adminService.getDestinations().filter(d => d.isActive);
  const uniqueCountries = Array.from(new Set(allDestinations.map(d => d.country))).sort();

  // Smart Room Calculation & Validation
  const [roomError, setRoomError] = useState('');
  
  useEffect(() => {
    if (step === 1 && !roomError) { 
       const suggested = Math.ceil(basics.adults / 2);
       if (basics.rooms < suggested) setBasics(prev => ({...prev, rooms: suggested}));
    }
  }, [basics.adults]);

  useEffect(() => {
      if (step === 1) {
          const adultsPerRoom = basics.adults / basics.rooms;
          const totalPaxPerRoom = (basics.adults + basics.children) / basics.rooms;
          
          if (adultsPerRoom > 3) {
              setRoomError("Max 3 Adults per room allowed.");
          } else if (totalPaxPerRoom > 4) {
              setRoomError("Max 4 Occupants (Adults+Child) per room.");
          } else {
              setRoomError("");
          }
      }
  }, [basics.adults, basics.children, basics.rooms, step]);

  useEffect(() => {
      if (isMultiCity) {
          const totalNights = cityVisits.reduce((acc, visit) => acc + visit.nights, 0);
          setBasics(prev => ({ ...prev, nights: totalNights }));
          
          if (cityVisits.length > 0) {
              const routeSummary = cityVisits.map(c => `${c.cityName} (${c.nights}N)`).join(' + ');
              setBasics(prev => ({ ...prev, destinationName: `${selectedCountry} | ${routeSummary}` }));
          } else {
              setBasics(prev => ({ ...prev, destinationName: '' }));
          }
      }
  }, [cityVisits, isMultiCity, selectedCountry]);

  // --- STEP 2: HOTEL SELECTION ---
  const [hotelMode, setHotelMode] = useState<'CMS' | 'REF'>('CMS');
  const [manualHotel, setManualHotel] = useState({ name: '', cost: 0, roomType: 'Standard' });
  const [availableHotels, setAvailableHotels] = useState<Hotel[]>([]);
  const [activeCityTabId, setActiveCityTabId] = useState<string>('');

  useEffect(() => {
      if (step === 2 && cityVisits.length > 0 && !activeCityTabId) {
          setActiveCityTabId(cityVisits[0].id);
      }
  }, [step, cityVisits]);

  useEffect(() => {
      if (step === 2 && activeCityTabId) {
          const activeVisit = cityVisits.find(v => v.id === activeCityTabId);
          if (activeVisit) {
              const hotels = adminService.getHotels().filter(h => h.destinationId === activeVisit.cityId);
              setAvailableHotels(hotels);
          }
      }
  }, [activeCityTabId, step]);

  // Improved Selection: Allow toggle
  const handleSelectHotelForCity = (visitId: string, hotel: Hotel) => {
      setCityVisits(prev => prev.map(v => {
          if (v.id === visitId) {
              // Toggle off if same hotel clicked
              if (v.hotelId === hotel.id) {
                  return { ...v, hotelId: undefined, hotelName: undefined };
              }
              // Select new hotel
              return { ...v, hotelId: hotel.id, hotelName: hotel.name };
          }
          return v;
      }));
  };

  // --- STEP 3: ITINERARY GENERATION ---
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [availableActivities, setAvailableActivities] = useState<Activity[]>([]);
  const [availableTransfers, setAvailableTransfers] = useState<Transfer[]>([]);
  
  const [serviceModal, setServiceModal] = useState<{ isOpen: boolean; dayIndex: number; type: 'ACTIVITY' | 'TRANSFER' }>({ isOpen: false, dayIndex: 0, type: 'ACTIVITY' });
  const [serviceSearch, setServiceSearch] = useState('');
  const [isFavModalOpen, setIsFavModalOpen] = useState(false);

  // --- STEP 4: COSTING ---
  const [agentMarkup, setAgentMarkup] = useState(0);

  // --- HANDLERS ---
  const handleNext = () => {
      if (step === 1 && roomError) {
          showToast(roomError, 'error');
          return;
      }
      if (step === 2 && hotelMode === 'CMS' && cityVisits.length === 0) {
          // ensure initial itinerary logic runs if jumping
      }
      
      // Auto-generate itinerary structure on entering step 3
      if (step === 2) {
          const days: ItineraryItem[] = [];
          let dayCounter = 1;

          cityVisits.forEach((visit, idx) => {
              const isFirstCity = idx === 0;
              
              for (let n = 1; n <= visit.nights; n++) {
                  let title = `Day ${dayCounter}: ${visit.cityName} Exploration`;
                  let desc = '';
                  const services: ItineraryService[] = [];

                  if (n === 1) {
                      if (isFirstCity) {
                          title = `Day ${dayCounter}: Arrival in ${visit.cityName}`;
                          desc = `Welcome to ${selectedCountry}! Arrive at ${visit.cityName} airport and transfer to hotel.`;
                          services.push({ id: `trf_arr_${idx}`, type: 'TRANSFER', name: `Airport Transfer to ${visit.cityName} Hotel`, cost: 0, price: 0, currency: 'USD', isRef: true }); 
                      } else {
                          title = `Day ${dayCounter}: Transfer to ${visit.cityName}`;
                          desc = `Check out and transfer to ${visit.cityName}. Check in to your hotel.`;
                          services.push({ 
                              id: `trf_inter_${idx}`, 
                              type: 'TRANSFER', 
                              name: `Intercity Transfer to ${visit.cityName}`, 
                              cost: 0, 
                              price: 0, 
                              currency: 'USD',
                              isRef: true,
                              meta: { note: 'Auto-suggested transfer' }
                          });
                      }
                      if (visit.hotelName) {
                          desc += `\nCheck-in at ${visit.hotelName}.`;
                      }
                  }

                  days.push({
                      day: dayCounter,
                      title: title,
                      description: desc,
                      inclusions: n === 1 && isFirstCity ? ['Airport Transfer'] : ['Breakfast'],
                      services: services,
                      cityId: visit.cityId
                  });
                  dayCounter++;
              }
          });

          // Departure Day
          days.push({
              day: dayCounter,
              title: `Day ${dayCounter}: Departure`,
              description: 'Check out and transfer to the airport for your return flight.',
              services: [{ id: 'trf_dep', type: 'TRANSFER', name: 'Departure Airport Transfer', cost: 0, price: 0, currency: 'USD', isRef: true }],
              inclusions: ['Breakfast', 'Airport Transfer'],
              cityId: cityVisits[cityVisits.length - 1]?.cityId
          });

          if (itinerary.length === 0) setItinerary(days);
          
          const targetIds = cityVisits.map(v => v.cityId);
          setAvailableActivities(adminService.getActivities().filter(a => targetIds.includes(a.destinationId)));
          setAvailableTransfers(adminService.getTransfers().filter(t => targetIds.includes(t.destinationId)));
      }

      setStep(prev => prev + 1);
  };

  const handleBack = () => setStep(prev => prev - 1);

  // --- HELPER FUNCTIONS ---
  const getCityName = (cityId: string) => {
      const dest = allDestinations.find(d => d.id === cityId);
      return dest ? dest.city : 'Unknown';
  };

  const openServiceModal = (dayIndex: number, type: 'ACTIVITY' | 'TRANSFER') => {
      setServiceModal({ isOpen: true, dayIndex, type });
      setServiceSearch('');
  };

  // --- SERVICE ADD/REMOVE ---
  const getFilteredInventory = () => {
      const currentDayItem = itinerary[serviceModal.dayIndex];
      const contextCityId = currentDayItem?.cityId;
      
      if (!contextCityId) return { acts: availableActivities, trfs: availableTransfers };

      return {
          acts: availableActivities.filter(a => a.destinationId === contextCityId),
          trfs: availableTransfers.filter(t => t.destinationId === contextCityId)
      };
  };

  const handleAddService = (item: Activity | Transfer) => {
    const { dayIndex, type } = serviceModal;
    const newItinerary = [...itinerary];
    
    let cost = 0;
    let name = '';
    let meta = {};
    const itemCurrency = item.currency || 'USD'; // Capture source currency
    
    if (type === 'ACTIVITY') {
        const act = item as Activity;
        name = act.activityName;
        cost = (act.costAdult * basics.adults) + (act.costChild * basics.children);
        meta = { type: act.activityType, tag: 'Sightseeing' };
    } else {
        const trf = item as Transfer;
        name = trf.transferName;
        if (trf.costBasis === 'Per Vehicle') {
            const totalPax = basics.adults + basics.children;
            const vehicles = Math.ceil(totalPax / trf.maxPassengers);
            cost = trf.cost * vehicles;
        } else {
            cost = trf.cost * (basics.adults + basics.children);
        }
        meta = { type: trf.transferType, vehicle: trf.vehicleType, tag: 'Transfer' };
    }

    const service: ItineraryService = {
        id: item.id,
        type,
        name,
        cost: cost,
        price: cost,
        currency: itemCurrency, // Store original currency
        isRef: false,
        meta
    };

    if (!newItinerary[dayIndex].services) newItinerary[dayIndex].services = [];
    newItinerary[dayIndex].services!.push(service);
    
    setItinerary(newItinerary);
    setServiceModal({ ...serviceModal, isOpen: false });
    showToast(`${type === 'ACTIVITY' ? 'Sightseeing' : 'Transfer'} added!`, 'success');
  };

  const handleRemoveService = (dayIndex: number, serviceIndex: number) => {
      const newItinerary = [...itinerary];
      newItinerary[dayIndex].services = newItinerary[dayIndex].services?.filter((_, i) => i !== serviceIndex);
      setItinerary(newItinerary);
  };

  const calculateFinancials = () => {
    let rawSupplierCost = 0;

    // 1. Sum Itinerary Services (Convert each item from its Source Currency to Quote Currency)
    itinerary.forEach(day => {
        day.services?.forEach(svc => {
            if (!svc.isRef) {
                // IMPORTANT: Correct conversion using Item Currency
                const convertedCost = currencyService.convert(svc.cost, svc.currency || 'USD', currency);
                rawSupplierCost += convertedCost;
            }
        });
    });

    // 2. Sum Hotels
    if (hotelMode === 'CMS') {
        const fullHotelList = adminService.getHotels();
        cityVisits.forEach(visit => {
            if (visit.hotelId) {
                const hotel = fullHotelList.find(h => h.id === visit.hotelId);
                if (hotel) {
                    let cityHotelCost = 0;
                    if (hotel.costType === 'Per Room') {
                        cityHotelCost = hotel.cost * basics.rooms * visit.nights;
                    } else {
                        cityHotelCost = hotel.cost * (basics.adults + basics.children) * visit.nights;
                    }
                    // IMPORTANT: Correct conversion using Hotel Currency
                    const hotelCostConverted = currencyService.convert(cityHotelCost, hotel.currency || 'USD', currency);
                    rawSupplierCost += hotelCostConverted;
                }
            }
        });
    } else {
        // In REF mode, user manually enters cost. 
        // We assume they entered it in the selected Quote Currency.
        const manualCost = Number(manualHotel.cost);
        rawSupplierCost += manualCost;
    }

    // 3. Use Pricing Engine
    const result = calculatePriceFromNet(
        rawSupplierCost, 
        pricingRules, 
        basics.adults + basics.children,
        agentMarkup // Agent markup is flat and assumed to be in Quote Currency
    );

    return result;
  };

  const financials = calculateFinancials();

  const handleSaveQuote = () => {
      const finalItinerary = JSON.parse(JSON.stringify(itinerary));
      const fullGuestName = `${basics.guestSalutation}. ${basics.guestName}`;
      const newQuote = agentService.createQuote(user!, basics.destinationName, basics.travelDate, basics.adults + basics.children, fullGuestName);
      
      const updatedQuote = {
          ...newQuote,
          childCount: basics.children,
          childAges: basics.childAges,
          itinerary: finalItinerary,
          
          // Cost Logic: Store converted values in Quote Currency
          cost: financials.platformNetCost, 
          price: financials.platformNetCost,
          sellingPrice: financials.finalPrice,
          
          currency: currency,
          
          hotelMode: hotelMode,
          cityVisits: cityVisits,
          serviceDetails: `${basics.nights} Nights Trip: ${basics.destinationName}`
      };

      agentService.updateQuote(updatedQuote);
      showToast("Quote Saved!", 'success');
      setTimeout(() => navigate(`/quote/${newQuote.id}`), 500);
  };

  const { acts: filteredActs, trfs: filteredTrfs } = getFilteredInventory();

  // --- TEMPLATE HANDLERS ---
  const handleApplySystemTemplate = (template: ItineraryTemplate) => {
      const inventory = {
          activities: adminService.getActivities(),
          transfers: adminService.getTransfers()
      };
      
      const generated = generateItineraryFromTemplate(
          template, 
          inventory, 
          { adults: basics.adults, children: basics.children }
      );
      
      // Preserve city IDs if they exist in current slots to match destination logic
      const mappedItinerary = generated.map((item, idx) => ({
          ...item,
          cityId: cityVisits[0]?.cityId // Defaulting to first city as system templates are usually single dest
      }));

      setItinerary(mappedItinerary);
      showToast("System template applied!", 'success');
  };

  const handleApplyFavoriteTemplate = (template: AgentFavoriteTemplate) => {
      const { itinerary: hydrated, warnings } = favoriteTemplateService.hydrateTemplate(
          template,
          { adults: basics.adults, children: basics.children, infants: 0 }
      );
      
      setItinerary(hydrated);
      if (warnings.length > 0) {
          showToast(`Applied with ${warnings.length} warnings (items removed)`, 'info');
      } else {
          showToast("Favorite template loaded!", 'success');
      }
  };

  const handleSaveFavorite = (name: string, note: string) => {
      if (!user) return;
      
      const favTemplate: AgentFavoriteTemplate = {
          id: `fav_${Date.now()}`,
          agentId: user.id,
          templateName: name,
          note: note,
          destinationId: cityVisits[0]?.cityId || 'mix',
          destinationName: basics.destinationName,
          nights: basics.nights,
          itinerary: itinerary,
          createdAt: new Date().toISOString()
      };

      favoriteTemplateService.saveTemplate(favTemplate);
      setIsFavModalOpen(false);
      showToast("Itinerary saved as favorite!", 'success');
  };

  // --- UI RENDER ---
  const Stepper = () => {
      const steps = [
          { id: 1, label: 'Basics', icon: Globe },
          { id: 2, label: 'Hotels', icon: HotelIcon },
          { id: 3, label: 'Itinerary', icon: Calendar },
          { id: 4, label: 'Quote', icon: DollarSign },
      ];

      return (
          <div className="w-full max-w-3xl mx-auto mb-8 px-4">
              <div className="flex items-center justify-between relative">
                  <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 -z-10 rounded-full"></div>
                  <div 
                    className="absolute top-1/2 left-0 h-1 bg-brand-500 -z-10 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${((step - 1) / 3) * 100}%` }}
                  ></div>

                  {steps.map((s) => {
                      const isActive = s.id <= step;
                      const isCurrent = s.id === step;
                      const Icon = s.icon;
                      
                      return (
                          <div key={s.id} className="flex flex-col items-center gap-2 bg-slate-50 px-2">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                                  isActive ? 'bg-brand-600 text-white shadow-lg shadow-brand-200 scale-110' : 'bg-white border-2 border-slate-300 text-slate-400'
                              }`}>
                                  <Icon size={18} />
                              </div>
                              <span className={`text-xs font-bold transition-colors ${isCurrent ? 'text-brand-700' : isActive ? 'text-slate-700' : 'text-slate-400'}`}>
                                  {s.label}
                              </span>
                          </div>
                      );
                  })}
              </div>
          </div>
      );
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
        <div className="bg-white border-b border-slate-200 sticky top-16 z-30 shadow-sm">
            <div className="container mx-auto px-4 py-4">
                <Stepper />
            </div>
        </div>

        <div className="container mx-auto px-4 py-8">
            {/* STEP 1: BASICS */}
            {step === 1 && (
                <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-8 animate-in fade-in slide-in-from-bottom-4">
                    
                    <div className="bg-slate-50 p-1.5 rounded-xl flex">
                        <button 
                            onClick={() => { setIsMultiCity(false); setCityVisits([]); setBasics(prev => ({...prev, destinationName: ''})); }}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${!isMultiCity ? 'bg-white shadow text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Single City
                        </button>
                        <button 
                            onClick={() => { setIsMultiCity(true); setBasics(prev => ({...prev, destinationName: ''})); setCityVisits([]); setSelectedCountry(''); }}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${isMultiCity ? 'bg-white shadow text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Multi-City (Same Country)
                        </button>
                    </div>

                    {!isMultiCity ? (
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Select Destination</label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-3.5 text-slate-400" size={20} />
                                <select 
                                    className="w-full pl-12 border border-slate-300 p-3.5 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none bg-slate-50 hover:bg-white transition"
                                    onChange={(e) => {
                                        const d = allDestinations.find(dest => dest.id === e.target.value);
                                        if (d) {
                                            const visit: CityVisit = { id: 'single_visit', cityId: d.id, cityName: d.city, nights: basics.nights };
                                            setCityVisits([visit]);
                                            setBasics(prev => ({ ...prev, destinationName: `${d.city}, ${d.country}` }));
                                        }
                                    }}
                                >
                                    <option value="">Where are they going?</option>
                                    {allDestinations.map(d => <option key={d.id} value={d.id}>{d.city}, {d.country}</option>)}
                                </select>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Select Country</label>
                                <div className="relative">
                                    <Globe className="absolute left-4 top-3.5 text-slate-400" size={20} />
                                    <select 
                                        className="w-full pl-12 border border-slate-300 p-3.5 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none bg-slate-50 hover:bg-white transition"
                                        value={selectedCountry}
                                        onChange={(e) => {
                                            setSelectedCountry(e.target.value);
                                            setCityVisits([]); 
                                        }}
                                    >
                                        <option value="">Choose Country...</option>
                                        {uniqueCountries.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            {selectedCountry && (
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-slate-700">Build Route & Allocate Nights</label>
                                    <CityNightSelector 
                                        destinations={allDestinations.filter(d => d.country === selectedCountry)}
                                        selectedCities={cityVisits}
                                        onChange={setCityVisits}
                                    />
                                    
                                    <CitySequencePreview 
                                        currentVisits={cityVisits}
                                        onApply={(optimized) => {
                                            setCityVisits(optimized);
                                            showToast('Optimized route applied!', 'success');
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Travel Date</label>
                            <input type="date" className="w-full border border-slate-300 p-3.5 rounded-xl bg-slate-50 focus:ring-2 focus:ring-brand-500 outline-none" value={basics.travelDate} onChange={e => setBasics({...basics, travelDate: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Total Nights</label>
                            <input 
                                type="number" 
                                disabled={isMultiCity} 
                                className={`w-full border border-slate-300 p-3.5 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none ${isMultiCity ? 'bg-slate-100 text-slate-500' : 'bg-slate-50'}`}
                                value={basics.nights} 
                                onChange={e => !isMultiCity && setBasics({...basics, nights: Number(e.target.value)})} 
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Lead Guest Name</label>
                        <div className="flex">
                            <select
                                value={basics.guestSalutation}
                                onChange={(e) => setBasics({...basics, guestSalutation: e.target.value})}
                                className="rounded-l-xl border border-r-0 border-slate-300 px-3 py-3.5 bg-slate-50 focus:ring-2 focus:ring-brand-500 outline-none font-medium text-sm"
                            >
                                <option value="Mr">Mr.</option>
                                <option value="Ms">Ms.</option>
                                <option value="Mrs">Mrs.</option>
                            </select>
                            <div className="relative flex-1">
                                <User className="absolute left-3 top-3.5 text-slate-400" size={20} />
                                <input
                                    type="text"
                                    className="w-full pl-10 border border-slate-300 p-3.5 rounded-r-xl focus:ring-2 focus:ring-brand-500 outline-none"
                                    value={basics.guestName}
                                    onChange={(e) => setBasics({...basics, guestName: e.target.value})}
                                    placeholder="e.g. Smith Family"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 relative group">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Users size={18}/> Pax Configuration</h3>
                        </div>

                        <div className="grid grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Adults (12+)</label>
                                <input type="number" min="1" className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" value={basics.adults} onChange={e => setBasics({...basics, adults: Number(e.target.value)})} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Children (2-11)</label>
                                <input type="number" min="0" className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" value={basics.children} onChange={e => setBasics({...basics, children: Number(e.target.value)})} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Rooms</label>
                                <input 
                                    type="number" 
                                    min="1" 
                                    className={`w-full border p-2.5 rounded-lg focus:ring-2 outline-none font-bold ${roomError ? 'border-red-300 ring-2 ring-red-100 text-red-600' : 'border-slate-300 text-brand-600 focus:ring-brand-500'}`}
                                    value={basics.rooms} 
                                    onChange={e => setBasics({...basics, rooms: Number(e.target.value)})} 
                                />
                            </div>
                        </div>
                        {roomError && (
                            <div className="mt-3 text-xs text-red-600 flex items-center gap-1 font-medium animate-in fade-in">
                                <AlertCircle size={12} /> {roomError}
                            </div>
                        )}
                    </div>

                    {/* CURRENCY CONVERTER */}
                    <div className="flex justify-end items-center gap-3">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                            <Coins size={14} /> Quote Currency:
                        </label>
                        <select 
                            value={currency} 
                            onChange={(e) => setCurrency(e.target.value)}
                            className="bg-white border border-slate-300 rounded-lg py-2 pl-3 pr-8 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer hover:border-brand-300 transition"
                        >
                            {currencies.map(c => (
                                <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-100">
                        <button 
                            disabled={!basics.travelDate || cityVisits.length === 0 || !!roomError}
                            onClick={handleNext} 
                            className="bg-brand-600 text-white px-8 py-3.5 rounded-xl flex items-center gap-2 hover:bg-brand-700 disabled:opacity-50 font-bold shadow-lg shadow-brand-200 transition-all transform hover:-translate-y-1"
                        >
                            Next: Select Hotels <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 2: HOTEL */}
            {step === 2 && (
                <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-slate-900">Select Hotels</h2>
                        <div className="flex bg-slate-200 p-1 rounded-lg">
                            <button 
                                onClick={() => setHotelMode('CMS')}
                                className={`px-4 py-2 rounded-md text-xs font-bold transition ${hotelMode === 'CMS' ? 'bg-white shadow text-brand-600' : 'text-slate-500'}`}
                            >
                                Partner Inventory
                            </button>
                            <button 
                                onClick={() => setHotelMode('REF')}
                                className={`px-4 py-2 rounded-md text-xs font-bold transition ${hotelMode === 'REF' ? 'bg-white shadow text-brand-600' : 'text-slate-500'}`}
                            >
                                Reference Mode
                            </button>
                        </div>
                    </div>

                    {hotelMode === 'CMS' ? (
                        <div className="flex flex-col md:flex-row gap-6">
                            {/* City Tabs */}
                            <div className="w-full md:w-1/4 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible">
                                {cityVisits.map((visit, idx) => (
                                    <button
                                        key={visit.id}
                                        onClick={() => setActiveCityTabId(visit.id)}
                                        className={`p-3 rounded-xl border text-left transition relative ${
                                            activeCityTabId === visit.id 
                                            ? 'bg-brand-50 border-brand-500 text-brand-800' 
                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="text-xs font-bold uppercase tracking-wider mb-1 text-slate-400">Stop {idx + 1}</div>
                                        <div className="font-bold">{visit.cityName}</div>
                                        <div className="text-xs mt-1">{visit.nights} Nights</div>
                                        
                                        {visit.hotelId && (
                                            <div className="mt-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1">
                                                <Check size={10} /> Selected
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Hotel List */}
                            <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 min-h-[400px]">
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <HotelIcon size={18} /> 
                                    Available Hotels in {cityVisits.find(v => v.id === activeCityTabId)?.cityName}
                                </h3>
                                
                                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                    {availableHotels.map(h => {
                                        const currentVisit = cityVisits.find(v => v.id === activeCityTabId);
                                        const isSelected = currentVisit?.hotelId === h.id;
                                        
                                        // Calculate cost based on occupancy
                                        const rawCostSource = h.costType === 'Per Room' 
                                            ? (h.cost * basics.rooms * (currentVisit?.nights || 1))
                                            : (h.cost * (basics.adults + basics.children) * (currentVisit?.nights || 1));

                                        // Convert from Hotel Currency to Quote Currency for display
                                        const rawCostConverted = currencyService.convert(rawCostSource, h.currency || 'USD', currency);

                                        // Apply Pricing Rules (Estimated)
                                        const calculated = calculatePriceFromNet(rawCostConverted, pricingRules, basics.adults + basics.children);

                                        return (
                                            <div 
                                                key={h.id} 
                                                onClick={() => handleSelectHotelForCity(activeCityTabId, h)}
                                                className={`group p-4 border rounded-xl cursor-pointer flex justify-between items-center transition-all ${isSelected ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'bg-white border-slate-200 hover:border-brand-300 hover:shadow-md'}`}
                                            >
                                                <div>
                                                    <p className="font-bold text-slate-900 flex items-center gap-2">
                                                        {h.name}
                                                        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-600 border border-slate-200">{h.category}</span>
                                                    </p>
                                                    <div className="flex gap-2 mt-1">
                                                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">{h.mealPlan}</span>
                                                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">{h.roomType}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-mono font-bold text-brand-700 text-lg">
                                                        {currencyService.getSymbol(currency)} {calculated.platformNetCost.toLocaleString()}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Net Payable (B2B)</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {availableHotels.length === 0 && <p className="text-slate-400 italic text-center py-12">No hotels found in this city.</p>}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-xl mx-auto">
                            <h3 className="font-bold text-slate-800 mb-4">Manual Hotel Reference</h3>
                            <p className="text-sm text-slate-500 mb-4">Enter a single reference hotel cost. Note: Multi-city manual entry is simplified to total cost.</p>
                            <input type="text" className="w-full border p-3.5 rounded-xl bg-slate-50 mb-3" value={manualHotel.name} onChange={e => setManualHotel({...manualHotel, name: e.target.value})} placeholder="Hotel Name" />
                            <div className="relative">
                                {/* DYNAMIC SYMBOL FIX */}
                                <div className="absolute left-4 top-3.5 text-slate-500 font-bold">{currencyService.getSymbol(currency)}</div>
                                <input type="number" className="w-full pl-12 border p-3.5 rounded-xl bg-slate-50" value={manualHotel.cost} onChange={e => setManualHotel({...manualHotel, cost: Number(e.target.value)})} placeholder="Total Estimated Cost" />
                            </div>
                            <p className="text-xs text-slate-400 mt-2 text-right">
                                Entered cost is assumed to be in <strong>{currency}</strong>.
                            </p>
                        </div>
                    )}

                    <div className="pt-8 flex justify-between border-t border-slate-100 mt-6">
                        <button onClick={handleBack} className="text-slate-500 hover:text-slate-800 flex items-center gap-2 font-medium">
                            <ArrowLeft size={18} /> Back
                        </button>
                        <button 
                            disabled={hotelMode === 'CMS' && cityVisits.some(v => !v.hotelId)}
                            onClick={handleNext} 
                            className="bg-brand-600 text-white px-8 py-3.5 rounded-xl flex items-center gap-2 hover:bg-brand-700 disabled:opacity-50 font-bold shadow-lg shadow-brand-200 transition-all"
                        >
                            Next: Itinerary <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 3 & 4: ITINERARY PLANNER & COSTING */}
            {(step === 3 || step === 4) && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Itinerary Planner</h1>
                            <p className="text-sm text-slate-500 flex items-center gap-2">
                                <Route size={14} /> {basics.destinationName}
                            </p>
                        </div>
                        
                        {/* Cost Widget */}
                        <div className="flex gap-6 items-center bg-white px-6 py-3 rounded-xl border border-slate-200 shadow-sm">
                            <div className="text-right">
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Net Payable</p>
                                <p className="font-bold text-slate-900 text-xl font-mono">{formatPrice(financials.platformNetCost)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left: Day List */}
                        <div className="lg:col-span-2 space-y-6">
                            
                            {/* --- TEMPLATE SELECTOR (Only Step 3) --- */}
                            {step === 3 && (
                                <TemplateSelector 
                                    destination={basics.destinationName} 
                                    nights={basics.nights} 
                                    onSelectSystem={handleApplySystemTemplate} 
                                    onSelectFavorite={handleApplyFavoriteTemplate}
                                />
                            )}

                            {itinerary.map((day, dIdx) => (
                                <div key={dIdx} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden group/day transition-all hover:shadow-md">
                                    {/* Sticky Day Header */}
                                    <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center sticky top-0 z-10">
                                        <div className="flex items-center gap-3">
                                            <span className="bg-brand-600 text-white text-xs font-bold px-2.5 py-1 rounded-md shadow-sm">Day {day.day}</span>
                                            <h3 className="font-bold text-slate-800 text-sm">{day.title}</h3>
                                        </div>
                                        {day.cityId && (
                                            <span className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-500 font-medium flex items-center gap-1">
                                                <MapPin size={10} /> {getCityName(day.cityId)}
                                            </span>
                                        )}
                                    </div>
                                    
                                    {/* Content Body */}
                                    <div className="p-5 space-y-3">
                                        <p className="text-sm text-slate-600 italic mb-2 whitespace-pre-wrap">{day.description}</p>
                                        
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => openServiceModal(dIdx, 'ACTIVITY')}
                                                className="flex-1 py-2 rounded-lg border border-dashed border-pink-300 bg-pink-50 text-pink-700 text-xs font-bold hover:bg-pink-100 flex items-center justify-center gap-2 transition"
                                            >
                                                <Camera size={14} /> Add Sightseeing
                                            </button>
                                            <button 
                                                onClick={() => openServiceModal(dIdx, 'TRANSFER')}
                                                className="flex-1 py-2 rounded-lg border border-dashed border-blue-300 bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 flex items-center justify-center gap-2 transition"
                                            >
                                                <Car size={14} /> Add Transfer
                                            </button>
                                        </div>

                                        {day.services && day.services.length > 0 ? (
                                            day.services.map((svc, sIdx) => {
                                                // Display in Quote Currency, but calculation is based on stored 'svc.currency'
                                                const costInTarget = currencyService.convert(svc.cost, svc.currency || 'USD', currency);
                                                const itemPrice = calculatePriceFromNet(costInTarget, pricingRules, 1).platformNetCost;
                                                
                                                return (
                                                    <div key={sIdx} className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 hover:shadow-md transition-all hover:border-brand-300 group/card relative">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`p-2.5 rounded-lg text-white shadow-sm ${svc.type === 'ACTIVITY' ? 'bg-pink-500' : svc.type === 'TRANSFER' ? 'bg-blue-500' : 'bg-indigo-500'}`}>
                                                                {svc.type === 'ACTIVITY' ? <Camera size={18}/> : svc.type === 'TRANSFER' ? <Car size={18}/> : <HotelIcon size={18}/>}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-900">{svc.name}</p>
                                                                {svc.meta?.type && <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wide">{svc.meta.type}</p>}
                                                                {svc.isRef && <p className="text-[10px] text-amber-600 font-medium">Reference Item (Cost Excluded)</p>}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-4">
                                                            <span className="font-mono text-sm font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                                                                {currencyService.getSymbol(currency)} {Math.round(itemPrice).toLocaleString()}
                                                            </span>
                                                            <button 
                                                                onClick={() => handleRemoveService(dIdx, sIdx)} 
                                                                className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded transition absolute top-2 right-2 md:static"
                                                                title="Remove"
                                                            >
                                                                <Trash2 size={16}/>
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="py-4 text-center">
                                                <p className="text-xs text-slate-400 font-medium italic">No services added yet.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            
                            <div className="flex justify-between mt-8 pt-4">
                                <button onClick={() => setStep(2)} className="text-slate-500 hover:text-slate-800 flex items-center gap-2 font-medium text-sm">
                                    <ArrowLeft size={16} /> Back to Hotel
                                </button>
                            </div>
                        </div>

                        {/* Right: Costing Summary */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 sticky top-24 transition-all duration-300">
                                <div className="mb-6 flex items-center justify-between text-brand-700">
                                    <div className="flex items-center gap-2">
                                        <DollarSign size={20} />
                                        <h3 className="font-bold text-lg">Price Calculation</h3>
                                    </div>
                                    <button 
                                        onClick={() => setIsFavModalOpen(true)}
                                        className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded hover:bg-amber-100 flex items-center gap-1 transition"
                                        title="Save this itinerary structure for later use"
                                    >
                                        <Star size={12} fill="currentColor" /> Save Template
                                    </button>
                                </div>
                                
                                <div className="space-y-4 text-sm">
                                    <div className="flex justify-between text-slate-600 pb-2 border-b border-slate-100">
                                        <span>Platform Net Cost</span>
                                        <span className="font-mono font-bold">{formatPrice(financials.platformNetCost)}</span>
                                    </div>
                                    
                                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                        <label className="block font-bold text-slate-700 mb-2 text-xs uppercase">Your Markup (Flat)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-slate-400 font-bold">+</span>
                                            <input 
                                                type="number" 
                                                min="0"
                                                value={agentMarkup}
                                                onChange={(e) => setAgentMarkup(Number(e.target.value))}
                                                className="w-full pl-8 border p-2.5 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none font-bold text-brand-600 bg-white shadow-sm" 
                                                placeholder="0"
                                            />
                                            <div className="absolute right-3 top-3 text-xs text-slate-400 font-bold">{currency}</div>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-slate-900 text-white p-5 rounded-xl shadow-xl mt-4 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-5 rounded-full -mr-10 -mt-10"></div>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold mb-1 tracking-wider">Final Package Price</p>
                                        <p className="text-3xl font-bold font-mono text-emerald-400">{formatPrice(financials.finalPrice)}</p>
                                        <div className="border-t border-slate-700 mt-3 pt-2 flex justify-between text-xs text-slate-400">
                                            <span>Per Person</span>
                                            <span>{formatPrice(Math.round(financials.finalPrice / (basics.adults + basics.children)))}</span>
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleSaveQuote}
                                    className="w-full bg-brand-600 text-white font-bold py-4 rounded-xl mt-6 hover:bg-brand-700 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex justify-center gap-2"
                                >
                                    Generate Final Quote <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    {/* SERVICE SELECTION MODAL */}
                    {serviceModal.isOpen && (
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                            <div className="bg-white rounded-xl max-w-lg w-full p-0 shadow-2xl max-h-[80vh] flex flex-col overflow-hidden">
                                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                        {serviceModal.type === 'ACTIVITY' ? <Camera size={18} className="text-pink-600"/> : <Car size={18} className="text-blue-600"/>}
                                        Add {serviceModal.type === 'ACTIVITY' ? 'Sightseeing' : 'Transfer'} 
                                    </h3>
                                    <button onClick={() => setServiceModal({ ...serviceModal, isOpen: false })} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                                </div>
                                
                                <div className="p-4 border-b border-slate-100">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                        <input 
                                            type="text" 
                                            placeholder="Search inventory..."
                                            className="w-full pl-9 border border-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                            value={serviceSearch}
                                            onChange={(e) => setServiceSearch(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <div className="overflow-y-auto p-2">
                                    {serviceModal.type === 'ACTIVITY' && (
                                        filteredActs
                                            .filter(a => a.activityName.toLowerCase().includes(serviceSearch.toLowerCase()))
                                            .map(a => {
                                                // Display in converted quote currency
                                                const unitCost = currencyService.convert(a.costAdult, a.currency || 'USD', currency);
                                                const unitNet = calculatePriceFromNet(unitCost, pricingRules, 1).platformNetCost;
                                                
                                                return (
                                                    <button key={a.id} onClick={() => handleAddService(a)} className="w-full text-left p-3 hover:bg-pink-50 rounded-lg flex justify-between items-center group border-b border-slate-50 last:border-0 transition">
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-800 group-hover:text-pink-700">{a.activityName}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 border border-slate-200">{a.activityType}</span>
                                                                {a.ticketIncluded && <span className="text-[10px] text-green-600 font-medium flex items-center gap-0.5"><Check size={10}/> Ticket</span>}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-sm font-mono font-bold text-slate-700 group-hover:text-pink-700">{formatPrice(unitNet)}</span>
                                                            <p className="text-[9px] text-slate-400 uppercase">Net B2B</p>
                                                        </div>
                                                    </button>
                                                );
                                            })
                                    )}

                                    {serviceModal.type === 'TRANSFER' && (
                                        filteredTrfs
                                            .filter(t => t.transferName.toLowerCase().includes(serviceSearch.toLowerCase()))
                                            .map(t => {
                                                const unitCost = currencyService.convert(t.cost, t.currency || 'USD', currency);
                                                const unitNet = calculatePriceFromNet(unitCost, pricingRules, 1).platformNetCost;
                                                
                                                return (
                                                    <button key={t.id} onClick={() => handleAddService(t)} className="w-full text-left p-3 hover:bg-blue-50 rounded-lg flex justify-between items-center group border-b border-slate-50 last:border-0 transition">
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-800 group-hover:text-blue-700">{t.transferName}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <p className="text-xs text-slate-500">{t.vehicleType} • {t.transferType}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-sm font-mono font-bold text-slate-700 group-hover:text-blue-700">{formatPrice(unitNet)}</span>
                                                            <p className="text-[9px] text-slate-400 uppercase">Net B2B</p>
                                                        </div>
                                                    </button>
                                                );
                                            })
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <FavoriteTemplateModal 
                        isOpen={isFavModalOpen}
                        onClose={() => setIsFavModalOpen(false)}
                        onSave={handleSaveFavorite}
                    />
                </div>
            )}

            <Toast 
                message={toast.msg} 
                type={toast.type} 
                isVisible={toast.show} 
                onClose={() => setToast(prev => ({ ...prev, show: false }))} 
            />
        </div>
    </div>
  );
};
