
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { agentService } from '../../services/agentService';
import { useAuth } from '../../context/AuthContext';
import { FixedPackage, Quote, ItineraryItem } from '../../types';
import { Package, Calendar, MapPin, CheckCircle, ArrowRight, Loader2, Info, X, User } from 'lucide-react';

export const AgentPackages: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [packages, setPackages] = useState<FixedPackage[]>([]);
  const [destinations, setDestinations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Booking Modal State
  const [selectedPkg, setSelectedPkg] = useState<FixedPackage | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState({
      date: '',
      guestName: '',
      adults: 2,
      children: 0
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const [pkgs, dests] = await Promise.all([
        adminService.getFixedPackages(),
        adminService.getDestinations()
      ]);
      // Filter only active packages
      setPackages(pkgs.filter(p => p.isActive));
      setDestinations(dests);
      setIsLoading(false);
    };
    load();
  }, []);

  const openBookingModal = (pkg: FixedPackage) => {
      setSelectedPkg(pkg);
      
      let defaultDate = '';
      
      if (pkg.dateType === 'DAILY') {
          // Default to tomorrow for daily
          const tmrw = new Date();
          tmrw.setDate(tmrw.getDate() + 1);
          defaultDate = tmrw.toISOString().split('T')[0];
      } else {
          // Pre-select first valid future date for specific
          const nextDate = pkg.validDates
            .map(d => new Date(d))
            .sort((a,b) => a.getTime() - b.getTime())
            .find(d => d.getTime() >= new Date().setHours(0,0,0,0));
          
          if (nextDate) {
              defaultDate = nextDate.toISOString().split('T')[0];
          }
      }
      
      setBookingForm({
          date: defaultDate,
          guestName: '',
          adults: pkg.basePax || 2,
          children: 0
      });
      setIsModalOpen(true);
  };

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedPkg || !bookingForm.date || !bookingForm.guestName) return;
    
    setIsCreating(true);

    try {
        const pkg = selectedPkg;
        const dest = destinations.find(d => d.id === pkg.destinationId);
        const destName = dest ? `${dest.city}, ${dest.country}` : 'Fixed Package Trip';

        // 1. Create Base Quote
        const newQuote = await agentService.createQuote(
            user,
            destName,
            bookingForm.date,
            Number(bookingForm.adults) + Number(bookingForm.children),
            bookingForm.guestName
        );

        // 2. Construct Itinerary
        // Use the defined itinerary from the package if available, else fallback to shell
        let itinerary: ItineraryItem[] = [];
        
        if (pkg.itinerary && pkg.itinerary.length > 0) {
            itinerary = pkg.itinerary;
        } else {
            // Fallback Generator
            for(let i=1; i<=pkg.nights; i++) {
                itinerary.push({
                    day: i,
                    title: i===1 ? `Arrival in ${dest?.city || 'Destination'}` : `Day ${i} - ${pkg.packageName}`,
                    description: i===1 ? 'Welcome to your fixed departure tour. Transfer to hotel.' : 'Enjoy the planned activities for this package.',
                    inclusions: pkg.inclusions.slice(0, 2),
                    services: [] 
                });
            }
            // Add Departure Day
            itinerary.push({
                day: pkg.nights + 1,
                title: 'Departure',
                description: 'Transfer to airport.',
                inclusions: ['Breakfast']
            });
        }

        // 3. Update Quote with Package Specifics
        const totalPax = Number(bookingForm.adults) + Number(bookingForm.children);
        // Fixed Price logic
        const totalPrice = pkg.fixedPrice * totalPax;

        const updatedQuote: Quote = {
            ...newQuote,
            serviceDetails: `Fixed Package: ${pkg.packageName} (${pkg.nights} Nights). Hotel: ${pkg.hotelDetails || 'Standard'}`,
            itinerary: itinerary,
            price: totalPrice, // Net Price for Agent
            sellingPrice: totalPrice, // Suggest same selling initially
            currency: 'INR',
            status: 'DRAFT',
            isLocked: false,
            // Store pax breakdown
            childCount: Number(bookingForm.children)
        };

        await agentService.updateQuote(updatedQuote);
        
        // 4. Navigate
        navigate(`/quote/${newQuote.id}`);

    } catch (error) {
        console.error("Error creating quote from package", error);
        alert("Could not create quote. Please try again.");
    } finally {
        setIsCreating(false);
        setIsModalOpen(false);
    }
  };

  const getDestinationName = (id: string) => {
      const d = destinations.find(x => x.id === id);
      return d ? d.city : 'Unknown';
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="text-brand-600" /> Fixed Departure Packages
        </h1>
        <p className="text-slate-500">Ready-to-book group tours with fixed dates and best rates.</p>
      </div>

      {isLoading ? (
          <div className="flex justify-center py-20 text-slate-400">
              <Loader2 className="animate-spin mr-2" /> Loading packages...
          </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map(pkg => {
                 // Calculate Next Date for Display
                 const nextDate = pkg.validDates
                    .map(d => new Date(d))
                    .sort((a,b) => a.getTime() - b.getTime())
                    .find(d => d.getTime() >= new Date().setHours(0,0,0,0));

                 return (
                    <div key={pkg.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition group">
                        {/* Image Header */}
                        <div className="h-40 bg-slate-200 relative overflow-hidden">
                            {pkg.imageUrl ? (
                                <img src={pkg.imageUrl} alt={pkg.packageName} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                    <Package size={40} opacity={0.5} />
                                </div>
                            )}
                            <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-bold text-slate-800 shadow-sm">
                                {pkg.nights} Nights
                            </div>
                        </div>

                        <div className="p-5 flex-1 flex flex-col">
                            <div className="flex items-center gap-2 text-xs text-brand-600 font-bold mb-1 uppercase tracking-wide">
                                <MapPin size={12} /> {getDestinationName(pkg.destinationId)}
                            </div>
                            <h3 className="font-bold text-lg text-slate-900 mb-1">{pkg.packageName}</h3>
                            {pkg.hotelDetails && <p className="text-xs text-slate-500 mb-2 font-medium"><span className="text-slate-400">Hotel:</span> {pkg.hotelDetails}</p>}
                            <p className="text-xs text-slate-500 line-clamp-2 mb-4 flex-1">{pkg.description || 'No description available.'}</p>
                            
                            <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-2 mb-4">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Next Departure:</span>
                                    <span className="font-bold text-slate-800">
                                        {pkg.dateType === 'DAILY' 
                                            ? <span className="text-green-600">Daily Available</span> 
                                            : (nextDate ? nextDate.toLocaleDateString() : 'Sold Out')
                                        }
                                    </span>
                                </div>
                                {pkg.dateType !== 'DAILY' && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Available Dates:</span>
                                        <span className="font-bold text-slate-800">{pkg.validDates.length}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-center border-t border-slate-100 pt-4">
                                <div>
                                    <p className="text-xs text-slate-400 font-bold uppercase">Starting From</p>
                                    <p className="text-xl font-bold text-slate-900">₹ {pkg.fixedPrice.toLocaleString()}</p>
                                </div>
                                <button 
                                    onClick={() => openBookingModal(pkg)}
                                    className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-700 transition flex items-center gap-2"
                                >
                                    <ArrowRight size={16} /> Create Quote
                                </button>
                            </div>
                        </div>
                    </div>
                 );
            })}
            {packages.length === 0 && (
                <div className="col-span-3 text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-400">
                    <Info size={40} className="mx-auto mb-3 opacity-50" />
                    <p>No fixed packages available at the moment. Please check back later.</p>
                </div>
            )}
        </div>
      )}

      {/* CONFIG MODAL */}
      {isModalOpen && selectedPkg && (
          <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-lg text-slate-900">Configure Trip</h3>
                      <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>

                  <form onSubmit={handleCreateQuote} className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Departure Date</label>
                          
                          {selectedPkg.dateType === 'DAILY' ? (
                              <div className="relative">
                                  <Calendar className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                  <input 
                                    required
                                    type="date"
                                    min={todayStr}
                                    className="w-full pl-10 border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                    value={bookingForm.date}
                                    onChange={e => setBookingForm({...bookingForm, date: e.target.value})}
                                  />
                                  <p className="text-[10px] text-green-600 mt-1">Daily departures available.</p>
                              </div>
                          ) : (
                              <select 
                                required
                                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                                value={bookingForm.date}
                                onChange={e => setBookingForm({...bookingForm, date: e.target.value})}
                              >
                                  <option value="">-- Choose Date --</option>
                                  {selectedPkg.validDates.map(d => (
                                      <option key={d} value={d}>{new Date(d).toLocaleDateString()}</option>
                                  ))}
                              </select>
                          )}
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Lead Traveler Name</label>
                          <div className="relative">
                              <User size={16} className="absolute left-3 top-3 text-slate-400" />
                              <input 
                                required
                                type="text"
                                className="w-full pl-9 border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                placeholder="Mr. John Doe"
                                value={bookingForm.guestName}
                                onChange={e => setBookingForm({...bookingForm, guestName: e.target.value})}
                              />
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Adults</label>
                              <input 
                                type="number" 
                                min="1" 
                                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" 
                                value={bookingForm.adults}
                                onChange={e => setBookingForm({...bookingForm, adults: Number(e.target.value)})}
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Children</label>
                              <input 
                                type="number" 
                                min="0" 
                                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" 
                                value={bookingForm.children}
                                onChange={e => setBookingForm({...bookingForm, children: Number(e.target.value)})}
                              />
                          </div>
                      </div>

                      <div className="pt-4 flex justify-end gap-3">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
                          <button 
                            type="submit" 
                            disabled={isCreating}
                            className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-brand-700 transition flex items-center gap-2 disabled:opacity-70"
                          >
                              {isCreating ? <Loader2 size={16} className="animate-spin"/> : <ArrowRight size={16} />}
                              Generate Quote
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
