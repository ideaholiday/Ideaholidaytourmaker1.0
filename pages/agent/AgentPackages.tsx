
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { agentService } from '../../services/agentService';
import { useAuth } from '../../context/AuthContext';
import { FixedPackage, Quote, ItineraryItem } from '../../types';
import { Package, Calendar, MapPin, CheckCircle, ArrowRight, Loader2, Info, X, User, Download, FileText, Hotel, ChevronDown, Image as ImageIcon, File } from 'lucide-react';
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

  const handleDownloadPDF = (pkg: FixedPackage) => {
    try {
        if(user) {
            generateFixedPackagePDF(pkg, user.role, user);
        }
    } catch(e) {
        console.error("PDF Generation Error", e);
        alert("Failed to generate PDF.");
    }
    setOpenDropdownId(null);
  };

  const handleDownloadImage = async (pkg: FixedPackage) => {
      setFlyerData(pkg);
      setIsGeneratingImg(true);
      
      // Allow DOM to render hidden flyer and images to load
      setTimeout(async () => {
          if (flyerRef.current) {
              try {
                  const canvas = await html2canvas(flyerRef.current, { 
                      scale: 3, // Higher quality
                      useCORS: true, // Cross-origin images
                      backgroundColor: '#ffffff',
                      allowTaint: true,
                      width: 800, // Fixed width capture
                      windowWidth: 1200
                  });
                  
                  // Use JPEG for smaller file size, good for WhatsApp
                  const image = canvas.toDataURL("image/jpeg", 0.9);
                  
                  const link = document.createElement("a");
                  link.href = image;
                  link.download = `${pkg.packageName.replace(/\s+/g, '_')}_Flyer.jpg`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  
              } catch (error) {
                  console.error("Image generation failed", error);
                  alert("Failed to generate image. Please try again.");
              } finally {
                  setFlyerData(null);
                  setOpenDropdownId(null);
                  setIsGeneratingImg(false);
              }
          } else {
              setIsGeneratingImg(false);
          }
      }, 1500); // 1.5s delay to ensure images load
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

  return (
    <div className="container mx-auto px-4 py-8 relative">
      {/* HIDDEN FLYER TEMPLATE FOR IMAGE GENERATION */}
      {/* Positioned fixed off-screen so it renders fully but is invisible */}
      {flyerData && (
          <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -100 }}>
              <div ref={flyerRef} className="w-[800px] bg-white pb-8 font-sans text-slate-900 relative border border-slate-200">
                  {/* Header Image */}
                  <div className="h-[450px] w-full relative">
                      {flyerData.imageUrl ? (
                          <img 
                              src={flyerData.imageUrl} 
                              className="w-full h-full object-cover" 
                              alt="" 
                              crossOrigin="anonymous" 
                          />
                      ) : (
                          <div className="w-full h-full bg-brand-600 flex items-center justify-center">
                              <Package size={80} className="text-white opacity-50" />
                          </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-8 pt-24 text-white">
                          <h1 className="text-4xl font-extrabold mb-2 text-white drop-shadow-md">{flyerData.packageName}</h1>
                          <div className="flex gap-4 text-lg font-medium opacity-95">
                              <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-lg">{flyerData.nights} Nights / {flyerData.nights + 1} Days</span>
                              <span className="flex items-center gap-1"><MapPin size={20}/> {getDestinationName(flyerData.destinationId)}</span>
                          </div>
                      </div>
                      
                      {/* Agency Logo Placeholder */}
                      <div className="absolute top-6 right-6 bg-white p-3 rounded-xl shadow-lg max-w-[200px]">
                           {user?.agentBranding?.logoUrl ? (
                               <img src={user.agentBranding.logoUrl} className="h-16 w-auto object-contain" alt="Logo" crossOrigin="anonymous" />
                           ) : (
                               <span className="font-bold text-brand-600 text-lg px-2">{user?.companyName || user?.name}</span>
                           )}
                      </div>
                  </div>

                  {/* Body */}
                  <div className="px-10 py-8">
                      {/* Highlights */}
                      <div className="flex justify-between items-center mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm">
                           <div>
                               <p className="text-sm text-slate-500 uppercase font-bold tracking-wider mb-1">Accommodation</p>
                               <p className="font-bold text-slate-800 text-xl">{flyerData.hotelDetails || 'Standard Hotel'}</p>
                           </div>
                           <div className="text-right">
                               <p className="text-sm text-slate-500 uppercase font-bold tracking-wider mb-1">Starting From</p>
                               <p className="font-bold text-brand-600 text-4xl">₹ {flyerData.fixedPrice.toLocaleString()}</p>
                               <p className="text-xs text-slate-400 font-medium">per person</p>
                           </div>
                      </div>

                      <div className="grid grid-cols-2 gap-10">
                          <div>
                              <h3 className="text-green-700 font-bold mb-4 flex items-center gap-2 uppercase text-base tracking-wider border-b border-green-100 pb-2">
                                  <CheckCircle size={20} /> Inclusions
                              </h3>
                              <ul className="space-y-3">
                                  {flyerData.inclusions.slice(0, 8).map((inc, i) => (
                                      <li key={i} className="text-base text-slate-700 flex items-start gap-3">
                                          <span className="mt-2 w-1.5 h-1.5 bg-green-500 rounded-full shrink-0"></span>
                                          {inc}
                                      </li>
                                  ))}
                              </ul>
                          </div>
                          <div>
                              <h3 className="text-red-700 font-bold mb-4 flex items-center gap-2 uppercase text-base tracking-wider border-b border-red-100 pb-2">
                                  <X size={20} /> Exclusions
                              </h3>
                              <ul className="space-y-3">
                                  {flyerData.exclusions.slice(0, 8).map((exc, i) => (
                                      <li key={i} className="text-base text-slate-700 flex items-start gap-3">
                                          <span className="mt-2 w-1.5 h-1.5 bg-red-400 rounded-full shrink-0"></span>
                                          {exc}
                                      </li>
                                  ))}
                              </ul>
                          </div>
                      </div>
                  </div>

                  {/* Footer */}
                  <div className="mx-10 bg-slate-900 text-white p-6 rounded-2xl flex justify-between items-center shadow-xl">
                      <div>
                          <p className="font-bold text-xl mb-1">Book Your Spot!</p>
                          <p className="text-sm opacity-80">Limited seats available for upcoming dates.</p>
                      </div>
                      <div className="text-right">
                          <p className="font-bold text-lg">{user?.agentBranding?.contactPhone || user?.phone}</p>
                          <p className="text-sm opacity-80">{user?.agentBranding?.email || user?.email}</p>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {isGeneratingImg && (
          <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center backdrop-blur-sm">
              <div className="bg-white p-6 rounded-xl shadow-2xl flex flex-col items-center">
                  <Loader2 className="animate-spin text-brand-600 mb-3" size={40} />
                  <p className="font-bold text-slate-800">Generating Flyer Image...</p>
                  <p className="text-xs text-slate-500">Please wait while we render high-quality graphics.</p>
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
                        <div className="h-44 bg-slate-200 relative overflow-hidden">
                            {pkg.imageUrl ? (
                                <img src={pkg.imageUrl} alt={pkg.packageName} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                    <Package size={40} opacity={0.5} />
                                </div>
                            )}
                            <div className="absolute top-3 left-3 bg-black/50 backdrop-blur text-white px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1">
                                <MapPin size={10} /> {getDestinationName(pkg.destinationId)}
                            </div>
                            <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-bold text-slate-900 shadow-sm flex items-center gap-1">
                                <Calendar size={12} className="text-brand-600"/> {pkg.nights} Nights
                            </div>
                        </div>

                        <div className="p-5 flex-1 flex flex-col">
                            <h3 className="font-bold text-lg text-slate-900 mb-1 group-hover:text-brand-600 transition">{pkg.packageName}</h3>
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-3">
                                <Hotel size={14} className="text-slate-400"/> 
                                <span className="font-medium truncate">{pkg.hotelDetails || 'Hotel: NA'}</span>
                            </div>
                            
                            {/* Tags */}
                            <div className="flex flex-wrap gap-1 mb-4">
                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200">{pkg.category || 'Group Tour'}</span>
                                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-100">{pkg.dateType === 'DAILY' ? 'Daily' : 'Fixed Dates'}</span>
                            </div>

                            <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-2 mb-4 border border-slate-100">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500">Departure:</span>
                                    <span className="font-bold text-slate-800">
                                        {pkg.dateType === 'DAILY' 
                                            ? <span className="text-green-600 flex items-center gap-1"><CheckCircle size={10}/> Daily</span> 
                                            : (nextDate ? nextDate.toLocaleDateString() : <span className="text-red-500">Sold Out</span>)
                                        }
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500">Starting Price:</span>
                                    <span className="font-mono font-bold text-slate-900 text-sm">₹ {pkg.fixedPrice.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="mt-auto flex gap-2">
                                {/* Flyer Dropdown Button */}
                                <div className="relative flex-1" ref={dropdownRef}>
                                    <button 
                                        onClick={(e) => toggleDropdown(e, pkg.id)}
                                        className="w-full bg-white border border-slate-200 text-slate-600 px-3 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50 hover:text-slate-900 transition flex items-center justify-center gap-2"
                                    >
                                        <Download size={16} /> Flyer <ChevronDown size={14} className={`transition ${openDropdownId === pkg.id ? 'rotate-180' : ''}`} />
                                    </button>
                                    
                                    {openDropdownId === pkg.id && (
                                        <div className="absolute bottom-full left-0 w-full mb-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95">
                                            <button 
                                                onClick={() => handleDownloadImage(pkg)}
                                                className="w-full px-4 py-3 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-b border-slate-50"
                                            >
                                                <ImageIcon size={14} className="text-blue-500" />
                                                Download Image
                                                <span className="text-[9px] text-slate-400 font-normal ml-auto">Summary</span>
                                            </button>
                                            <button 
                                                onClick={() => handleDownloadPDF(pkg)}
                                                className="w-full px-4 py-3 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                            >
                                                <FileText size={14} className="text-red-500" />
                                                Download PDF
                                                <span className="text-[9px] text-slate-400 font-normal ml-auto">Full Details</span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <button 
                                    onClick={() => openBookingModal(pkg)}
                                    className="flex-[2] bg-brand-600 text-white px-3 py-2.5 rounded-lg text-sm font-bold hover:bg-brand-700 transition flex items-center justify-center gap-2 shadow-sm"
                                >
                                    <ArrowRight size={16} /> Book Quote
                                </button>
                            </div>
                        </div>
                    </div>
                 );
            })}
            {packages.length === 0 && (
                <div className="col-span-3 text-center py-16 bg-white rounded-xl border border-slate-200 text-slate-400">
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
