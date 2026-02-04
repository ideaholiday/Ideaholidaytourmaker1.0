
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { adminService } from '../../services/adminService';
import { agentService } from '../../services/agentService';
import { useAuth } from '../../context/AuthContext';
import { useClientBranding } from '../../hooks/useClientBranding';
import { FixedPackage, Quote, ItineraryItem } from '../../types';
import { Package, Calendar, MapPin, ArrowRight, Loader2, Info, X, User, Image as ImageIcon, Hotel, ChevronDown, CheckCircle, Download, Coffee, Car, Phone, Mail, Globe, Clock, Star, TrendingUp, AlertTriangle } from 'lucide-react';

export const AgentPackages: React.FC = () => {
  const { user } = useAuth();
  const { 
      agencyName, 
      logoUrl, 
      primaryColor, 
      phone: agentPhone, 
      email: agentEmail, 
      website 
  } = useClientBranding();
  
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
  
  // Flyer Generation State
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
  const [flyerPackage, setFlyerPackage] = useState<FixedPackage | null>(null);
  const flyerRef = useRef<HTMLDivElement>(null);

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

  const handleDownloadFlyer = async (e: React.MouseEvent, pkg: FixedPackage) => {
      e.stopPropagation();
      setGeneratingPdfId(pkg.id);
      setFlyerPackage(pkg);

      // Delay to allow DOM render
      setTimeout(async () => {
          if (flyerRef.current) {
              try {
                  const canvas = await html2canvas(flyerRef.current, {
                      useCORS: true,
                      scale: 1, // 1080px width is sufficient for mobile sharing
                      backgroundColor: '#ffffff',
                      allowTaint: true,
                      logging: false
                  });
                  
                  const image = canvas.toDataURL('image/jpeg', 0.90);
                  const link = document.createElement('a');
                  link.href = image;
                  link.download = `${pkg.packageName.replace(/\s+/g, '_')}_Flyer.jpg`;
                  link.click();
              } catch (error) {
                  console.error("Flyer generation failed", error);
                  alert("Failed to generate flyer image.");
              } finally {
                  setGeneratingPdfId(null);
                  setFlyerPackage(null);
              }
          } else {
              setGeneratingPdfId(null);
          }
      }, 3000); // Increased delay for heavy assets
  };

  const getDestinationName = (id: string) => {
      const d = destinations.find(x => x.id === id);
      return d ? d.city : 'Unknown';
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Derive display values with fallback to user object if branding is empty but user exists
  const displayPhone = agentPhone || user?.phone;
  const displayEmail = agentEmail || user?.email;
  const displayAgencyName = agencyName || user?.companyName || user?.name;

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
                                    onClick={(e) => handleDownloadFlyer(e, pkg)}
                                    disabled={generatingPdfId === pkg.id}
                                    className="flex-1 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 px-3 py-2.5 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 disabled:opacity-70"
                                >
                                    {generatingPdfId === pkg.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} className="text-brand-600" />} 
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

      {/* --- HIDDEN FLYER TEMPLATE FOR HTML2CANVAS (1080x1920) --- */}
      {flyerPackage && (
          <div style={{ position: 'fixed', top: -9999, left: -9999 }}>
              <div 
                  ref={flyerRef} 
                  className="w-[1080px] h-[1920px] bg-white relative overflow-hidden flex flex-col font-sans"
                  style={{ fontFamily: "'Inter', sans-serif" }}
              >
                  {/* 1. HERO SECTION (Larger for Mobile Story format) */}
                  <div className="h-[900px] relative shrink-0">
                      {/* Background Image */}
                      {flyerPackage.imageUrl ? (
                           <img src={flyerPackage.imageUrl} className="w-full h-full object-cover" crossOrigin="anonymous" alt="Hero" />
                      ) : (
                           <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                               <ImageIcon size={160} className="text-slate-400" />
                           </div>
                      )}
                      
                      {/* Artistic Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent opacity-80"></div>

                      {/* Header Branding */}
                      <div className="absolute top-16 left-12 flex items-center gap-6 bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20 shadow-xl">
                           {logoUrl ? (
                               <div className="bg-white p-3 rounded-2xl h-20 w-20 flex items-center justify-center">
                                  <img src={logoUrl} className="max-h-full max-w-full object-contain" alt="Logo" />
                               </div>
                           ) : (
                               <div className="h-20 w-20 bg-brand-600 rounded-2xl flex items-center justify-center text-white font-bold text-4xl" style={{backgroundColor: primaryColor}}>
                                   {displayAgencyName?.charAt(0)}
                               </div>
                           )}
                           <div>
                               <h2 className="text-white font-bold text-2xl leading-tight tracking-wide">{displayAgencyName}</h2>
                               <p className="text-white/80 text-sm font-bold uppercase tracking-[0.2em] mt-1">Travel Collection</p>
                           </div>
                      </div>

                      {/* NEW: HOT DEAL RIBBON */}
                      <div className="absolute top-0 right-16 bg-red-600 text-white w-28 h-36 shadow-2xl flex flex-col items-center justify-center rounded-b-2xl z-30">
                           <Star className="w-8 h-8 text-yellow-300 mb-2 fill-current" />
                           <span className="text-xs font-bold uppercase tracking-widest">Hot</span>
                           <span className="text-2xl font-black tracking-tighter">DEAL</span>
                      </div>

                      {/* Huge Typographic Hero Title */}
                      <div className="absolute bottom-56 left-12 right-12 z-10">
                          <div className="flex gap-4 mb-6">
                              <span className="bg-white/20 backdrop-blur-md text-white px-6 py-2 rounded-full font-bold text-lg uppercase tracking-widest border border-white/20 shadow-lg">
                                  {flyerPackage.category || 'Exclusive'}
                              </span>
                              <span className="bg-white text-slate-900 px-6 py-2 rounded-full font-bold text-lg uppercase tracking-widest flex items-center gap-3 shadow-lg">
                                  <Clock size={20} /> {flyerPackage.nights} Nights / {flyerPackage.nights + 1} Days
                              </span>
                          </div>
                          
                          <h1 className="text-[110px] font-black text-white leading-[0.9] mb-6 drop-shadow-2xl tracking-tight">
                              {flyerPackage.packageName}
                          </h1>
                          
                          <div className="flex items-center gap-4 text-white/90 text-4xl font-medium tracking-tight">
                              <MapPin size={40} className="text-brand-400" style={{color: primaryColor}} /> 
                              {getDestinationName(flyerPackage.destinationId)}
                          </div>
                      </div>
                  </div>

                  {/* 2. BODY CONTENT (Overlapping Magazine Layout) */}
                  {/* Changed pt-20 to pt-36 to push content down and clear floating price card */}
                  <div className="flex-1 bg-white relative -mt-40 rounded-t-[60px] px-12 pt-36 pb-16 flex flex-col shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.4)]">
                      
                      {/* Floating Price Card (Right Side) */}
                      <div className="absolute -top-32 right-12 bg-white p-8 rounded-[40px] shadow-2xl text-center border-t-[12px] min-w-[320px] flex flex-col items-center justify-center z-20" style={{borderColor: primaryColor}}>
                          <p className="text-slate-400 uppercase text-sm font-bold tracking-[0.2em] mb-2">Deal Price</p>
                          {/* Use Brand Color for Price */}
                          <h2 className="text-7xl font-black tracking-tighter" style={{color: primaryColor}}>
                              ₹ {(flyerPackage.fixedPrice / 1000).toFixed(1)}k
                          </h2>
                          <p className="text-slate-400 text-lg mt-2 font-medium">per person</p>
                          
                          <div className="mt-6 w-full bg-gradient-to-r from-rose-50 to-orange-50 border border-rose-100 rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm">
                              <p className="text-rose-600 font-bold uppercase text-[10px] tracking-widest mb-1 flex items-center gap-2">
                                  <TrendingUp size={14} /> Limited Time
                              </p>
                              <p className="text-slate-900 font-black text-sm leading-tight text-center">
                                  Book Before Price Increase
                              </p>
                          </div>
                      </div>

                      {/* Icons Grid (Centered) */}
                      <div className="grid grid-cols-4 gap-10 mb-16 border-b border-slate-100 pb-12">
                           <div className="flex flex-col items-center text-center gap-4">
                               <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                                   <Hotel size={40} strokeWidth={2} style={{color: primaryColor}} />
                               </div>
                               <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Stay</span>
                           </div>
                           <div className="flex flex-col items-center text-center gap-4">
                               <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 shadow-sm border border-orange-100">
                                   <Coffee size={40} strokeWidth={2} style={{color: primaryColor}} />
                               </div>
                               <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Meals</span>
                           </div>
                           <div className="flex flex-col items-center text-center gap-4">
                               <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                                   <Car size={40} strokeWidth={2} style={{color: primaryColor}} />
                               </div>
                               <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Transfer</span>
                           </div>
                           <div className="flex flex-col items-center text-center gap-4">
                               <div className="w-20 h-20 rounded-full bg-pink-50 flex items-center justify-center text-pink-600 shadow-sm border border-pink-100">
                                   <Star size={40} strokeWidth={2} style={{color: primaryColor}} />
                               </div>
                               <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Tours</span>
                           </div>
                      </div>

                      {/* Content Columns */}
                      <div className="grid grid-cols-2 gap-16 flex-1">
                          
                          {/* Highlights (Left) */}
                          <div>
                              <h3 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3 uppercase tracking-wide">
                                  <Info size={28} className="text-slate-400"/> Experience
                              </h3>
                              <p className="text-slate-600 text-lg leading-relaxed text-justify font-medium">
                                  <span className="text-5xl float-left mr-3 mt-[-10px] font-black text-slate-900">“</span>
                                  {flyerPackage.description?.replace(/<[^>]+>/g, ' ').substring(0, 450) || 'Enjoy a wonderful trip with our curated package designed for the best experience.'}...
                              </p>
                              
                              <div className="mt-10 bg-slate-50 p-8 rounded-3xl border border-slate-200">
                                  <p className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Accommodation</p>
                                  <p className="font-bold text-slate-900 text-2xl">{flyerPackage.hotelDetails || 'Premium Hotel'}</p>
                              </div>
                          </div>

                          {/* Inclusions (Right) - Styled List */}
                          <div>
                              <h3 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3 uppercase tracking-wide">
                                  <CheckCircle size={28} className="text-green-600" style={{color: primaryColor}}/> Inclusions
                              </h3>
                              <div className="space-y-4">
                                  {flyerPackage.inclusions.slice(0, 6).map((inc, i) => (
                                      <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-white shadow-sm">
                                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                              <CheckCircle size={18} className="text-green-600" strokeWidth={3} style={{color: primaryColor}} />
                                          </div>
                                          <span className="text-lg font-bold text-slate-700">{inc}</span>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </div>

                      {/* 3. PREMIUM FOOTER CARD HERO */}
                      <div className="mt-auto bg-[#1a1a1a] text-white p-12 -mx-12 -mb-20 pt-16 pb-20 relative overflow-hidden rounded-t-[50px]">
                          {/* Background Texture */}
                          <div className="absolute top-0 right-0 p-8 opacity-5 transform scale-150 rotate-12 pointer-events-none">
                             <Globe size={400} />
                          </div>
                          
                          <div className="relative z-10 flex flex-col justify-between h-full">
                              
                              <div className="flex justify-between items-end mb-8">
                                  {/* Call to Action Section */}
                                  <div>
                                     <p className="text-2xl text-slate-400 mb-2 font-medium">For Booking & Queries</p>
                                     <div className="flex items-center gap-4 mb-2">
                                        <div className="bg-brand-600 p-3 rounded-full" style={{backgroundColor: primaryColor}}>
                                            <Phone size={32} className="text-white" />
                                        </div>
                                        <span className="text-6xl font-black tracking-tight">{displayPhone}</span>
                                     </div>
                                     {displayEmail && (
                                         <div className="flex items-center gap-3 mt-4 ml-2">
                                             <Mail size={24} className="text-slate-400" />
                                             <span className="text-2xl font-medium text-slate-300">{displayEmail}</span>
                                         </div>
                                     )}
                                  </div>

                                  {/* Website & Brand */}
                                  <div className="text-right">
                                      {website && (
                                          <div className="flex items-center justify-end gap-2 mb-6">
                                              <Globe size={24} className="text-brand-400" style={{color: primaryColor}} />
                                              <span className="text-2xl font-bold">{website}</span>
                                          </div>
                                      )}
                                      <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl inline-block border border-white/10">
                                         <span className="text-xl font-bold uppercase tracking-widest text-white/80">{displayAgencyName}</span>
                                      </div>
                                  </div>
                              </div>
                              
                              <div className="w-full h-1 bg-white/10 rounded-full mb-6"></div>
                              <p className="text-center text-slate-500 text-lg">Terms & Conditions Apply. Prices subject to availability.</p>
                          </div>
                      </div>

                  </div>
              </div>
          </div>
      )}

    </div>
  );
};
