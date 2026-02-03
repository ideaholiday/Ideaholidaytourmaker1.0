
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { agentService } from '../../services/agentService';
import { useAuth } from '../../context/AuthContext';
import { FixedPackage, Quote, ItineraryItem } from '../../types';
import { Package, Calendar, MapPin, CheckCircle, ArrowRight, Loader2, Info, X, User, Download, FileText, Hotel, ChevronDown, Image as ImageIcon, Phone, Mail, Globe, Star } from 'lucide-react';
import { generateFixedPackagePDF } from '../../utils/pdfGenerator';
import html2canvas from 'html2canvas';

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

  // Dropdown & Flyer State
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [flyerData, setFlyerData] = useState<FixedPackage | null>(null);
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);
  const flyerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setOpenDropdownId(null);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  const handleDownloadPDF = (e: React.MouseEvent, pkg: FixedPackage) => {
    e.stopPropagation(); 
    setOpenDropdownId(null);
    try {
        if(user) {
            // Generates detailed PDF with itinerary
            generateFixedPackagePDF(pkg, user.role, user);
        }
    } catch(e) {
        console.error("PDF Generation Error", e);
        alert("Failed to generate PDF. Please try again.");
    }
  };

  const handleDownloadImage = async (e: React.MouseEvent, pkg: FixedPackage) => {
      e.stopPropagation();
      setFlyerData(pkg);
      setIsGeneratingImg(true);
      setOpenDropdownId(null);
      
      // Allow time for DOM render and image fetch
      await new Promise(resolve => setTimeout(resolve, 800));

      if (!flyerRef.current) {
          setIsGeneratingImg(false);
          return;
      }
      
      try {
          // Preload Images
          const imagesToLoad = [];
          if (pkg.imageUrl) imagesToLoad.push(pkg.imageUrl);
          if (user?.agentBranding?.logoUrl) imagesToLoad.push(user.agentBranding.logoUrl);

          await Promise.all(imagesToLoad.map(src => {
              return new Promise((resolve) => {
                  const img = new Image();
                  img.crossOrigin = 'anonymous';
                  img.src = src;
                  img.onload = resolve;
                  img.onerror = resolve; 
              });
          }));
          
          await new Promise(resolve => setTimeout(resolve, 500)); // Extra buffer

          // Generate Canvas at 1080x1920 scale
          const canvas = await html2canvas(flyerRef.current, { 
              scale: 1, 
              useCORS: true, 
              backgroundColor: '#ffffff',
              width: 1080,
              height: 1920,
              windowWidth: 1080,
              windowHeight: 1920,
              logging: false
          });
          
          const image = canvas.toDataURL("image/jpeg", 0.95); // High quality JPEG
          
          const link = document.createElement("a");
          link.href = image;
          link.download = `${pkg.packageName.replace(/[^a-z0-9]/gi, '_')}_Story.jpg`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
      } catch (error) {
          console.error("Image generation failed", error);
          alert("Failed to generate image.");
      } finally {
          setFlyerData(null);
          setIsGeneratingImg(false);
      }
  };

  const toggleDropdown = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setOpenDropdownId(openDropdownId === id ? null : id);
  };

  const getDestinationName = (id: string) => {
      const d = destinations.find(x => x.id === id);
      return d ? d.city : 'Unknown';
  };

  const todayStr = new Date().toISOString().split('T')[0];
  
  // Resolve Branding Colors
  const brandColor = user?.agentBranding?.primaryColor || '#0ea5e9';
  const secondaryColor = user?.agentBranding?.secondaryColor || '#0f172a';

  return (
    <div className="container mx-auto px-4 py-8 relative">
      
      {/* 
        ------------------------------------------------------------
        HIDDEN FLYER TEMPLATE (1080x1920px - Social Media Story) 
        ------------------------------------------------------------
      */}
      {flyerData && (
          <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -100 }}>
              <div 
                  ref={flyerRef} 
                  className="w-[1080px] h-[1920px] bg-white font-sans relative flex flex-col overflow-hidden"
              >
                  {/* 1. Header Section (Agent Branding) */}
                  <div className="bg-white px-10 py-12 flex flex-col items-center justify-center border-b border-slate-100 relative">
                       {/* Color Accent Top */}
                       <div className="absolute top-0 left-0 w-full h-4" style={{ backgroundColor: brandColor }}></div>
                       
                       {user?.agentBranding?.logoUrl ? (
                           <img src={user.agentBranding.logoUrl} className="h-32 object-contain mb-4" alt="Agency Logo" crossOrigin="anonymous" />
                       ) : (
                           <div className="text-5xl font-extrabold text-slate-800 mb-2 uppercase tracking-wide">
                               {user?.companyName || user?.name || 'Travel Partner'}
                           </div>
                       )}
                       {user?.agentBranding?.website && (
                           <div className="text-xl text-slate-500 font-medium tracking-wide flex items-center gap-2">
                               <Globe size={24} className="text-slate-400" /> {user.agentBranding.website}
                           </div>
                       )}
                  </div>

                  {/* 2. Hero Image Section (Large Impact) */}
                  <div className="relative h-[700px] w-full overflow-hidden">
                      {flyerData.imageUrl ? (
                          <img 
                            src={flyerData.imageUrl} 
                            className="w-full h-full object-cover" 
                            alt="" 
                            crossOrigin="anonymous"
                          />
                      ) : (
                          <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                              <ImageIcon size={120} className="text-slate-400" />
                          </div>
                      )}
                      
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

                      {/* Package Title Overlay */}
                      <div className="absolute bottom-0 left-0 w-full p-12 text-white">
                           <span className="inline-block px-4 py-2 bg-white/20 backdrop-blur-md rounded-lg text-lg font-bold mb-4 border border-white/30 uppercase tracking-widest">
                               {flyerData.category || 'Special Offer'}
                           </span>
                           <h1 className="text-7xl font-extrabold leading-tight mb-4 drop-shadow-md">
                               {flyerData.packageName}
                           </h1>
                           <div className="flex items-center gap-6 text-2xl font-medium">
                               <span className="flex items-center gap-2"><MapPin size={28} /> {getDestinationName(flyerData.destinationId)}</span>
                               <span className="flex items-center gap-2"><Calendar size={28} /> {flyerData.nights} Nights / {flyerData.nights + 1} Days</span>
                           </div>
                      </div>
                  </div>

                  {/* 3. Main Content & Pricing */}
                  <div className="flex-1 px-12 py-10 bg-slate-50 flex flex-col justify-start relative">
                       {/* Price Badge - Floating */}
                       <div className="absolute top-[-50px] right-12 bg-white px-10 py-6 rounded-2xl shadow-2xl text-center border-b-8" style={{ borderColor: brandColor }}>
                           <p className="text-slate-400 text-lg uppercase font-bold tracking-widest mb-1">Starting From</p>
                           <p className="text-6xl font-extrabold text-slate-900">₹ {flyerData.fixedPrice.toLocaleString()}</p>
                           <p className="text-slate-400 text-sm mt-1">Per Person</p>
                       </div>

                       <div className="mt-16 space-y-8">
                            {/* Inclusions Grid */}
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                                <h3 className="text-3xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                                    <Star size={32} fill={brandColor} stroke={brandColor} /> Highlights
                                </h3>
                                <div className="space-y-4">
                                     <div className="flex items-start gap-4">
                                          <div className="p-3 bg-blue-50 rounded-xl text-blue-600"><Hotel size={32}/></div>
                                          <div>
                                              <p className="text-lg font-bold text-slate-700">Accommodation</p>
                                              <p className="text-xl text-slate-900">{flyerData.hotelDetails || 'Standard Hotel'}</p>
                                          </div>
                                     </div>
                                     {flyerData.inclusions.slice(0, 4).map((inc, i) => (
                                         <div key={i} className="flex items-center gap-4 text-xl text-slate-700">
                                              <CheckCircle size={28} className="text-green-500 shrink-0" />
                                              <span>{inc}</span>
                                         </div>
                                     ))}
                                </div>
                            </div>

                            {/* Description Snippet */}
                            <div className="px-2">
                                <p className="text-2xl text-slate-600 leading-relaxed italic">
                                    "{flyerData.description ? flyerData.description.replace(/<[^>]*>?/gm, '').substring(0, 180) + '...' : 'Experience an unforgettable journey with us.'}"
                                </p>
                            </div>
                       </div>
                  </div>

                  {/* 4. Footer CTA (High Visibility) */}
                  <div className="px-12 py-10" style={{ backgroundColor: secondaryColor }}>
                       <div className="flex items-center justify-between">
                            <div className="text-white">
                                <p className="text-lg opacity-80 uppercase tracking-widest mb-2 font-bold">Book Your Trip Now</p>
                                <div className="flex items-center gap-4 text-4xl font-bold">
                                    <Phone size={36} /> {user?.agentBranding?.contactPhone || user?.phone}
                                </div>
                                <div className="flex items-center gap-4 text-2xl font-medium mt-3 opacity-90">
                                    <Mail size={24} /> {user?.agentBranding?.email || user?.email}
                                </div>
                            </div>
                            
                            {/* QR Placeholder or Logo mark */}
                            <div className="h-32 w-32 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
                                <Globe size={64} className="text-white/50" />
                            </div>
                       </div>
                  </div>
              </div>
          </div>
      )}

      {isGeneratingImg && (
          <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center backdrop-blur-sm">
              <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center animate-in zoom-in-95">
                  <div className="relative mb-4">
                      <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-brand-600 animate-spin"></div>
                      <ImageIcon className="absolute inset-0 m-auto text-brand-600" size={20} />
                  </div>
                  <p className="font-bold text-lg text-slate-800">Creating Flyer...</p>
                  <p className="text-sm text-slate-500 mt-1">Generating HD Story Image (1080x1920)...</p>
              </div>
          </div>
      )}

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
                        {/* Image Header */}
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
                            {/* Hotel Info */}
                            <div className="flex items-start gap-2 mb-4 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                <Hotel size={16} className="text-slate-400 mt-0.5 shrink-0"/> 
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase">Accommodation</p>
                                    <p className="text-sm font-medium text-slate-800 line-clamp-1">{pkg.hotelDetails || 'Standard Hotel'}</p>
                                </div>
                            </div>
                            
                            {/* Tags */}
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
                                {/* Flyer Dropdown */}
                                <div className="relative flex-1" ref={dropdownRef}>
                                    <button 
                                        onClick={(e) => toggleDropdown(e, pkg.id)}
                                        className={`w-full border px-3 py-2.5 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 ${
                                            openDropdownId === pkg.id 
                                            ? 'bg-slate-100 border-slate-300 text-slate-900' 
                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                        }`}
                                    >
                                        <Download size={16} /> Flyer <ChevronDown size={14} className={`transition-transform duration-200 ${openDropdownId === pkg.id ? 'rotate-180' : ''}`} />
                                    </button>
                                    
                                    {openDropdownId === pkg.id && (
                                        <div className="absolute bottom-full left-0 w-full mb-2 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 origin-bottom">
                                            <div className="p-2 space-y-1">
                                                <button 
                                                    onClick={(e) => handleDownloadImage(e, pkg)}
                                                    className="w-full px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-3 transition"
                                                >
                                                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md"><ImageIcon size={14} /></div>
                                                    <div>
                                                        <span className="block">Download Image</span>
                                                        <span className="text-[9px] text-slate-400 font-normal">Story Format (1080x1920)</span>
                                                    </div>
                                                </button>
                                                <button 
                                                    onClick={(e) => handleDownloadPDF(e, pkg)}
                                                    className="w-full px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-3 transition"
                                                >
                                                     <div className="p-1.5 bg-red-50 text-red-600 rounded-md"><FileText size={14} /></div>
                                                     <div>
                                                        <span className="block">Download PDF</span>
                                                        <span className="text-[9px] text-slate-400 font-normal">Full Details Itinerary</span>
                                                    </div>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

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

      {/* CONFIG MODAL */}
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
                          {/* Form inputs remain same */}
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Select Departure Date</label>
                              
                              {selectedPkg.dateType === 'DAILY' ? (
                                  <div className="relative">
                                      <Calendar className="absolute left-3 top-3 text-slate-400" size={18} />
                                      <input 
                                        required
                                        type="date"
                                        min={todayStr}
                                        className="w-full pl-10 border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none font-medium"
                                        value={bookingForm.date}
                                        onChange={e => setBookingForm({...bookingForm, date: e.target.value})}
                                      />
                                      <p className="text-[10px] text-green-600 mt-1.5 flex items-center gap-1 font-bold">
                                          <CheckCircle size={10} /> Daily departures available.
                                      </p>
                                  </div>
                              ) : (
                                  <div className="relative">
                                      <select 
                                        required
                                        className="w-full border border-slate-300 rounded-xl p-3 pl-4 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white font-medium appearance-none"
                                        value={bookingForm.date}
                                        onChange={e => setBookingForm({...bookingForm, date: e.target.value})}
                                      >
                                          <option value="">-- Choose Date --</option>
                                          {selectedPkg.validDates.map(d => (
                                              <option key={d} value={d}>{new Date(d).toLocaleDateString(undefined, {weekday:'short', year:'numeric', month:'short', day:'numeric'})}</option>
                                          ))}
                                      </select>
                                      <ChevronDown size={16} className="absolute right-4 top-4 text-slate-400 pointer-events-none" />
                                  </div>
                              )}
                          </div>

                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Lead Traveler Name</label>
                              <div className="relative">
                                  <User size={18} className="absolute left-3 top-3 text-slate-400" />
                                  <input 
                                    required
                                    type="text"
                                    className="w-full pl-10 border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none font-medium"
                                    placeholder="Mr. John Doe"
                                    value={bookingForm.guestName}
                                    onChange={e => setBookingForm({...bookingForm, guestName: e.target.value})}
                                  />
                              </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Adults</label>
                                  <input 
                                    type="number" 
                                    min="1" 
                                    className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none font-medium" 
                                    value={bookingForm.adults}
                                    onChange={e => setBookingForm({...bookingForm, adults: Number(e.target.value)})}
                                  />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Children</label>
                                  <input 
                                    type="number" 
                                    min="0" 
                                    className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none font-medium" 
                                    value={bookingForm.children}
                                    onChange={e => setBookingForm({...bookingForm, children: Number(e.target.value)})}
                                  />
                              </div>
                          </div>

                          <div className="pt-2 flex gap-3">
                              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-bold transition">Cancel</button>
                              <button 
                                type="submit" 
                                disabled={isCreating}
                                className="flex-[2] bg-brand-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-brand-700 transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-70"
                              >
                                  {isCreating ? <Loader2 size={18} className="animate-spin"/> : <ArrowRight size={18} />}
                                  Generate Quote
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
