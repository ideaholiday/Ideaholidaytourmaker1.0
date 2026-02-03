
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { agentService } from '../../services/agentService';
import { useAuth } from '../../context/AuthContext';
import { FixedPackage, Quote, ItineraryItem, UserRole } from '../../types';
import { createFixedPackagePDF } from '../../utils/pdfGenerator';
import { Package, Calendar, MapPin, ArrowRight, Loader2, Info, X, User, Download, Hotel, ChevronDown, CheckCircle, FileText } from 'lucide-react';

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
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);

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
          const tmrw = new Date();
          tmrw.setDate(tmrw.getDate() + 1);
          defaultDate = tmrw.toISOString().split('T')[0];
      } else {
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
            itinerary.push({
                day: pkg.nights + 1,
                title: 'Departure',
                description: 'Transfer to airport.',
                inclusions: ['Breakfast']
            });
        }

        const totalPax = Number(bookingForm.adults) + Number(bookingForm.children);
        const totalPrice = pkg.fixedPrice * totalPax;

        const updatedQuote: Quote = {
            ...newQuote,
            serviceDetails: `Fixed Package: ${pkg.packageName} (${pkg.nights} Nights). Hotel: ${pkg.hotelDetails || 'Standard'}`,
            itinerary: itinerary,
            price: totalPrice,
            sellingPrice: totalPrice,
            currency: 'INR',
            status: 'DRAFT',
            isLocked: false,
            childCount: Number(bookingForm.children)
        };

        await agentService.updateQuote(updatedQuote);
        navigate(`/quote/${newQuote.id}`);

    } catch (error) {
        console.error("Error creating quote from package", error);
        alert("Could not create quote. Please try again.");
    } finally {
        setIsCreating(false);
        setIsModalOpen(false);
    }
  };

  const handleOpenPDF = (e: React.MouseEvent, pkg: FixedPackage) => {
      e.stopPropagation();
      setGeneratingPdfId(pkg.id);

      // Use timeout to allow UI to render spinner before main thread blocks for PDF gen
      setTimeout(() => {
          try {
              const doc = createFixedPackagePDF(pkg, user?.role || UserRole.AGENT, user);
              const blob = doc.output('blob');
              const url = URL.createObjectURL(blob);
              window.open(url, '_blank');
          } catch (error) {
              console.error("PDF Generation failed", error);
              alert("Failed to generate PDF flyer.");
          } finally {
              setGeneratingPdfId(null);
          }
      }, 100);
  };

  const getDestinationName = (id: string) => {
      const d = destinations.find(x => x.id === id);
      return d ? d.city : 'Unknown';
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="container mx-auto px-4 py-8 relative">
      
      {/* Main UI */}
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
                 const nextDate = pkg.validDates
                    .map(d => new Date(d))
                    .sort((a,b) => a.getTime() - b.getTime())
                    .find(d => d.getTime() >= new Date().setHours(0,0,0,0));

                 return (
                    <div key={pkg.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-lg transition group">
                        <div className="h-48 bg-slate-200 relative overflow-hidden group">
                            {pkg.imageUrl ? (
                                <img src={pkg.imageUrl} alt={pkg.packageName} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-100">
                                    <Package size={48} opacity={0.3} />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
                            
                            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur text-slate-800 px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1">
                                <MapPin size={12} className="text-brand-600" /> {getDestinationName(pkg.destinationId)}
                            </div>
                            
                            <div className="absolute bottom-3 left-3 text-white">
                                <p className="text-xs font-medium opacity-90">{pkg.nights} Nights / {pkg.nights + 1} Days</p>
                                <h3 className="font-bold text-lg leading-tight shadow-sm">{pkg.packageName}</h3>
                            </div>
                        </div>

                        <div className="p-5 flex-1 flex flex-col">
                            <div className="flex items-start gap-2 mb-4 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                <Hotel size={16} className="text-slate-400 mt-0.5 shrink-0"/> 
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase">Accommodation</p>
                                    <p className="text-sm font-medium text-slate-800 line-clamp-1">{pkg.hotelDetails || 'Standard Hotel'}</p>
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-1.5 mb-4">
                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200">{pkg.category || 'Group Tour'}</span>
                                {pkg.dateType === 'DAILY' ? (
                                    <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold border border-green-100 flex items-center gap-1"><CheckCircle size={10}/> Daily</span>
                                ) : (
                                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-100">Fixed Dates</span>
                                )}
                            </div>

                            <div className="mt-auto pt-4 border-t border-slate-100 flex items-end justify-between mb-4">
                                <div>
                                    <p className="text-xs text-slate-400">Starting From</p>
                                    <p className="font-mono font-bold text-slate-900 text-lg">₹ {pkg.fixedPrice.toLocaleString()}</p>
                                </div>
                                {nextDate && pkg.dateType !== 'DAILY' && (
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-400">Next Departure</p>
                                        <p className="text-xs font-bold text-brand-600">{nextDate.toLocaleDateString(undefined, {month:'short', day:'numeric'})}</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <button 
                                    onClick={(e) => handleOpenPDF(e, pkg)}
                                    disabled={generatingPdfId === pkg.id}
                                    className="flex-1 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 px-3 py-2.5 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 disabled:opacity-70"
                                >
                                    {generatingPdfId === pkg.id ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} className="text-brand-600" />} 
                                    Flyer
                                </button>

                                <button 
                                    onClick={() => openBookingModal(pkg)}
                                    className="flex-[2] bg-brand-600 text-white px-3 py-2.5 rounded-lg text-sm font-bold hover:bg-brand-700 transition flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform active:scale-95 duration-200"
                                >
                                    Book Now <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                 );
            })}
            {packages.length === 0 && (
                <div className="col-span-3 text-center py-20 bg-white rounded-xl border border-slate-200 text-slate-400">
                    <Info size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium text-slate-600">No fixed packages found</p>
                    <p className="text-sm">Check back later for new group departures.</p>
                </div>
            )}
        </div>
      )}

      {/* MODAL */}
      {isModalOpen && selectedPkg && (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-0 overflow-hidden transform scale-100 transition-all">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 backdrop-blur">
                      <div>
                          <h3 className="font-bold text-lg text-slate-900">Configure Trip</h3>
                          <p className="text-xs text-slate-500">{selectedPkg.packageName}</p>
                      </div>
                      <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full transition"><X size={20}/></button>
                  </div>
                  <div className="p-6">
                      <form onSubmit={handleCreateQuote} className="space-y-5">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Select Departure Date</label>
                              {selectedPkg.dateType === 'DAILY' ? (
                                  <div className="relative">
                                      <Calendar className="absolute left-3 top-3 text-slate-400" size={18} />
                                      <input required type="date" min={todayStr} className="w-full pl-10 border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none font-medium" value={bookingForm.date} onChange={e => setBookingForm({...bookingForm, date: e.target.value})} />
                                      <p className="text-[10px] text-green-600 mt-1.5 flex items-center gap-1 font-bold"><CheckCircle size={10} /> Daily departures available.</p>
                                  </div>
                              ) : (
                                  <div className="relative">
                                      <select required className="w-full border border-slate-300 rounded-xl p-3 pl-4 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white font-medium appearance-none" value={bookingForm.date} onChange={e => setBookingForm({...bookingForm, date: e.target.value})}>
                                          <option value="">-- Choose Date --</option>
                                          {selectedPkg.validDates.map(d => <option key={d} value={d}>{new Date(d).toLocaleDateString(undefined, {weekday:'short', year:'numeric', month:'short', day:'numeric'})}</option>)}
                                      </select>
                                      <ChevronDown size={16} className="absolute right-4 top-4 text-slate-400 pointer-events-none" />
                                  </div>
                              )}
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Lead Traveler Name</label>
                              <div className="relative">
                                  <User size={18} className="absolute left-3 top-3 text-slate-400" />
                                  <input required type="text" className="w-full pl-10 border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none font-medium" placeholder="Mr. John Doe" value={bookingForm.guestName} onChange={e => setBookingForm({...bookingForm, guestName: e.target.value})} />
                              </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Adults</label>
                                  <input type="number" min="1" className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none font-medium" value={bookingForm.adults} onChange={e => setBookingForm({...bookingForm, adults: Number(e.target.value)})} />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Children</label>
                                  <input type="number" min="0" className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none font-medium" value={bookingForm.children} onChange={e => setBookingForm({...bookingForm, children: Number(e.target.value)})} />
                              </div>
                          </div>
                          <div className="pt-2 flex gap-3">
                              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-bold transition">Cancel</button>
                              <button type="submit" disabled={isCreating} className="flex-[2] bg-brand-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-brand-700 transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-70">
                                  {isCreating ? <Loader2 size={18} className="animate-spin"/> : <ArrowRight size={18} />} Generate Quote
                              </button>
                          </div>
                      </form>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
