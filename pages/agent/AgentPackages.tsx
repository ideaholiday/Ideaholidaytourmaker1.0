
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { adminService } from '../../services/adminService';
import { agentService } from '../../services/agentService';
import { useAuth } from '../../context/AuthContext';
import { useClientBranding } from '../../hooks/useClientBranding';
import { FixedPackage, Quote, ItineraryItem } from '../../types';
import { Package, Calendar, MapPin, ArrowRight, Loader2, Info, X, User, Image as ImageIcon, Hotel, ChevronDown, CheckCircle, FileText, Eye, Check, Clock, Mail, Globe, AlertTriangle, XCircle, Phone, LayoutTemplate, Star, Zap, Plane, Utensils, Car, Camera, QrCode } from 'lucide-react';
import { generateFixedPackagePDF } from '../../utils/pdfGenerator';

type FlyerDesign = 'MINIMAL' | 'LUXURY' | 'BOLD';

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
  const [showDesignModal, setShowDesignModal] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState<FlyerDesign>('MINIMAL');
  const [targetFlyerPkg, setTargetFlyerPkg] = useState<FixedPackage | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const [pkgs, dests] = await Promise.all([
        adminService.getFixedPackages(),
        adminService.getDestinations()
      ]);
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
          if (nextDate) defaultDate = nextDate.toISOString().split('T')[0];
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

        const newQuote = await agentService.createQuote(
            user,
            destName,
            bookingForm.date,
            Number(bookingForm.adults) + Number(bookingForm.children),
            bookingForm.guestName
        );

        let itinerary: ItineraryItem[] = [];
        if (pkg.itinerary && pkg.itinerary.length > 0) {
            itinerary = pkg.itinerary;
        } else {
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

        const compiledNotes = `
INCLUSIONS:
• ${pkg.inclusions.join('\n• ')}

EXCLUSIONS:
• ${pkg.exclusions.join('\n• ')}

POLICY / IMPORTANT NOTES:
${pkg.notes || 'As per standard booking terms.'}
`.trim();

        const updatedQuote: Quote = {
            ...newQuote,
            serviceDetails: `Fixed Package: ${pkg.packageName} (${pkg.nights} Nights). Hotel: ${pkg.hotelDetails || 'Standard'}`,
            itinerary: itinerary,
            price: totalPrice,
            sellingPrice: totalPrice,
            currency: 'INR',
            status: 'DRAFT',
            isLocked: false,
            childCount: Number(bookingForm.children),
            publicNote: compiledNotes
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

  const openDesignModal = (e: React.MouseEvent, pkg: FixedPackage) => {
      e.stopPropagation();
      setTargetFlyerPkg(pkg);
      setShowDesignModal(true);
  };

  const handleGenerateFlyer = async () => {
      if (!targetFlyerPkg) return;
      setIsGenerating(true);
      
      setTimeout(async () => {
          const node = document.getElementById('flyer-generator-target');
          if (node) {
              try {
                  await document.fonts.ready;
                  
                  const bgColor = selectedDesign === 'LUXURY' ? '#0f172a' 
                                : selectedDesign === 'BOLD' ? '#ffffff'
                                : '#ffffff';

                  const canvas = await html2canvas(node, {
                      useCORS: true,
                      allowTaint: true,
                      backgroundColor: bgColor,
                      width: 1080,
                      height: 1080,
                      scale: 1, // Exact scale
                      logging: false,
                  });
                  
                  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
                  
                  const link = document.createElement('a');
                  link.download = `${targetFlyerPkg.packageName.replace(/\s+/g, '_')}_Post.jpg`;
                  link.href = dataUrl;
                  link.click();

                  setShowDesignModal(false);
                  setTargetFlyerPkg(null);

              } catch (error) {
                  console.error("Flyer generation failed", error);
                  alert("Failed to generate flyer image.");
              } finally {
                  setIsGenerating(false);
              }
          } else {
              setIsGenerating(false);
          }
      }, 2000); 
  };

  const handleDownloadPDF = (e: React.MouseEvent, pkg: FixedPackage) => {
      e.stopPropagation();
      if (!user) return;
      generateFixedPackagePDF(pkg, user.role, user);
  };

  const getDestinationName = (id: string) => {
      const d = destinations.find(x => x.id === id);
      return d ? d.city : 'Unknown';
  };

  const displayPhone = agentPhone || user?.phone;
  const displayEmail = agentEmail || user?.email;
  const displayAgencyName = agencyName || user?.companyName || user?.name;

  return (
    <div className="container mx-auto px-4 py-8 relative">
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
            {packages.map(pkg => (
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
                        <div className="absolute bottom-3 left-3 text-white">
                            <h3 className="font-bold text-lg leading-tight shadow-sm">{pkg.packageName}</h3>
                        </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-xs text-slate-500">Duration</p>
                                <p className="font-bold text-slate-800">{pkg.nights} Nights</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-500">Starting From</p>
                                <p className="font-mono font-bold text-brand-600 text-lg">₹ {pkg.fixedPrice.toLocaleString()}</p>
                            </div>
                            </div>

                        <div className="flex gap-2 mt-auto pt-4 border-t border-slate-100">
                            <button 
                                onClick={(e) => openDesignModal(e, pkg)}
                                className="p-2.5 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
                                title="Generate Promotional Image"
                            >
                                <ImageIcon size={18} />
                            </button>
                             <button 
                                onClick={(e) => handleDownloadPDF(e, pkg)}
                                className="p-2.5 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
                                title="Download PDF"
                            >
                                <FileText size={18} />
                            </button>
                            <button 
                                onClick={() => openBookingModal(pkg)}
                                className="flex-1 bg-brand-600 text-white px-3 py-2.5 rounded-lg text-sm font-bold hover:bg-brand-700 transition"
                            >
                                Book Now
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* BOOKING MODAL */}
      {isModalOpen && selectedPkg && (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                   <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-lg">Book {selectedPkg.packageName}</h3>
                      <button onClick={() => setIsModalOpen(false)}><X size={20}/></button>
                   </div>
                   <form onSubmit={handleCreateQuote} className="space-y-4">
                       <input type="date" required className="w-full border p-2 rounded" value={bookingForm.date} onChange={e => setBookingForm({...bookingForm, date: e.target.value})} />
                       <input type="text" required placeholder="Guest Name" className="w-full border p-2 rounded" value={bookingForm.guestName} onChange={e => setBookingForm({...bookingForm, guestName: e.target.value})} />
                       <button type="submit" disabled={isCreating} className="w-full bg-brand-600 text-white py-3 rounded font-bold">
                           {isCreating ? 'Processing...' : 'Create Quote'}
                       </button>
                   </form>
              </div>
          </div>
      )}

      {/* DESIGN SELECTION MODAL */}
      {showDesignModal && targetFlyerPkg && (
           <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="font-bold text-xl text-slate-900">Select Flyer Style</h3>
                            <p className="text-sm text-slate-500">Creates a high-quality social media post.</p>
                        </div>
                        <button onClick={() => { setShowDesignModal(false); setTargetFlyerPkg(null); }}><X size={24}/></button>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <button 
                            onClick={() => setSelectedDesign('MINIMAL')}
                            className={`p-3 rounded-xl border-2 transition flex flex-col items-center gap-2 ${selectedDesign === 'MINIMAL' ? 'border-brand-600 bg-brand-50' : 'border-slate-200 hover:border-brand-300'}`}
                        >
                            <LayoutTemplate size={24} className="text-slate-700"/>
                            <span className="text-xs font-bold">Modern</span>
                        </button>
                        <button 
                            onClick={() => setSelectedDesign('LUXURY')}
                            className={`p-3 rounded-xl border-2 transition flex flex-col items-center gap-2 ${selectedDesign === 'LUXURY' ? 'border-brand-600 bg-slate-900 text-white' : 'border-slate-200 hover:border-brand-300'}`}
                        >
                            <Star size={24} className="text-amber-400"/>
                            <span className="text-xs font-bold">Luxury</span>
                        </button>
                        <button 
                            onClick={() => setSelectedDesign('BOLD')}
                            className={`p-3 rounded-xl border-2 transition flex flex-col items-center gap-2 ${selectedDesign === 'BOLD' ? 'border-brand-600 bg-gradient-to-r from-pink-50 to-orange-50' : 'border-slate-200 hover:border-brand-300'}`}
                        >
                            <Zap size={24} className="text-orange-500"/>
                            <span className="text-xs font-bold">Bold</span>
                        </button>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 flex gap-3 items-start">
                        <Info className="text-blue-500 mt-0.5 shrink-0" size={16} />
                        <p className="text-sm text-slate-600">
                            Generates a <strong>1080x1080</strong> (Square) image perfect for Instagram, Facebook, and WhatsApp.
                        </p>
                    </div>

                    <button 
                        onClick={handleGenerateFlyer}
                        disabled={isGenerating}
                        className="w-full bg-brand-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-brand-700 transition flex items-center justify-center gap-2"
                    >
                        {isGenerating ? <><Loader2 size={20} className="animate-spin"/> Designing...</> : <><ImageIcon size={20}/> Download Image</>}
                    </button>
                </div>
           </div>
      )}

      {/* --- HIDDEN FLYER TEMPLATES (1080x1080) --- */}
      {/* 
          SQUARE DIMENSIONS for Social Media compatibility.
          Using explicit pixel values for html2canvas consistency.
      */}
      {(isGenerating || targetFlyerPkg) && selectedDesign && (
          <div style={{ position: 'fixed', left: '-9999px', top: '0', zIndex: -50 }}>
              <div 
                  id="flyer-generator-target"
                  className="w-[1080px] h-[1080px] relative flex flex-col font-sans overflow-hidden bg-white"
              >
                  {/* === DESIGN 1: MINIMALIST CARD (Square) === */}
                  {selectedDesign === 'MINIMAL' && targetFlyerPkg && (
                    <div className="w-full h-full relative flex flex-col bg-slate-50">
                        
                        {/* Background with Blur for atmosphere */}
                        <div className="absolute inset-0 z-0">
                             {targetFlyerPkg.imageUrl ? (
                                <img src={`${targetFlyerPkg.imageUrl}?t=${Date.now()}`} className="w-full h-full object-cover blur-sm opacity-50 scale-105" crossOrigin="anonymous" alt="BG" />
                            ) : (
                                <div className="w-full h-full bg-slate-200"></div>
                            )}
                        </div>

                        {/* Central Card */}
                        <div className="relative z-10 m-auto w-[920px] h-[920px] bg-white rounded-[60px] shadow-2xl overflow-hidden flex flex-col">
                            
                            {/* Image (Top 55%) */}
                            <div className="h-[55%] w-full relative">
                                {targetFlyerPkg.imageUrl ? (
                                    <img src={`${targetFlyerPkg.imageUrl}?t=${Date.now()}`} className="w-full h-full object-cover" crossOrigin="anonymous" alt="Hero" />
                                ) : null}
                                <div className="absolute top-10 left-10 bg-white/90 backdrop-blur px-8 py-3 rounded-full">
                                    <h3 className="text-3xl font-bold text-slate-900 uppercase tracking-wide flex items-center gap-3">
                                        <MapPin size={28} className="text-brand-600"/> 
                                        {getDestinationName(targetFlyerPkg.destinationId)}
                                    </h3>
                                </div>
                            </div>

                            {/* Content (Bottom 45%) */}
                            <div className="flex-1 p-12 flex flex-col relative">
                                {/* Agency Badge */}
                                <div className="absolute top-[-40px] right-12 bg-white p-2 rounded-2xl shadow-lg">
                                    {logoUrl ? (
                                        <img src={logoUrl} className="h-24 w-24 object-contain rounded-xl" crossOrigin="anonymous" />
                                    ) : (
                                        <div className="h-24 w-24 bg-brand-600 rounded-xl flex items-center justify-center font-bold text-4xl text-white">{displayAgencyName?.charAt(0)}</div>
                                    )}
                                </div>

                                <h1 className="text-6xl font-black text-slate-900 leading-tight mb-4 pr-32">
                                    {targetFlyerPkg.packageName}
                                </h1>

                                <div className="flex gap-4 mb-8">
                                    <span className="bg-slate-100 text-slate-600 px-5 py-2 rounded-lg text-2xl font-bold flex items-center gap-2">
                                        <Clock size={24}/> {targetFlyerPkg.nights} Nights
                                    </span>
                                    <span className="bg-slate-100 text-slate-600 px-5 py-2 rounded-lg text-2xl font-bold flex items-center gap-2">
                                        <Hotel size={24}/> Premium Stay
                                    </span>
                                </div>

                                <div className="flex justify-between items-end mt-auto">
                                    <div>
                                        <h3 className="text-2xl font-bold text-slate-400 uppercase mb-2">Includes</h3>
                                        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                                            {targetFlyerPkg.inclusions.slice(0, 4).map((inc, i) => (
                                                <div key={i} className="flex items-center gap-2 text-2xl font-medium text-slate-800">
                                                    <CheckCircle size={24} className="text-green-500" /> {inc}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-2xl text-slate-500 font-medium mb-1">Offer Price</p>
                                        <h2 className="text-7xl font-black text-brand-600 leading-none">
                                            ₹ {targetFlyerPkg.fixedPrice.toLocaleString()}
                                        </h2>
                                        <p className="text-xl text-slate-400 font-medium mt-2">Call: {displayPhone}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                  )}

                  {/* === DESIGN 2: MIDNIGHT GOLD (Luxury Square) === */}
                  {selectedDesign === 'LUXURY' && targetFlyerPkg && (
                      <div className="w-full h-full bg-[#0f172a] relative flex flex-col p-12 text-[#f8fafc] font-serif justify-center">
                          
                          {/* Image Background */}
                          <div className="absolute inset-0 z-0">
                               {targetFlyerPkg.imageUrl ? (
                                   <img src={`${targetFlyerPkg.imageUrl}?t=${Date.now()}`} className="w-full h-full object-cover opacity-40" crossOrigin="anonymous" alt="Hero" />
                               ) : null}
                               <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/80 to-transparent"></div>
                          </div>

                          {/* Border Frame */}
                          <div className="absolute inset-8 border-2 border-[#d4af37]/50 z-10 pointer-events-none"></div>

                          {/* Content Centered */}
                          <div className="relative z-20 text-center flex flex-col h-full justify-between py-12 px-12">
                               
                               <div className="flex flex-col items-center">
                                    {logoUrl && <img src={logoUrl} className="h-20 mb-6 object-contain filter brightness-0 invert opacity-90" crossOrigin="anonymous" />}
                                    <h2 className="text-2xl tracking-[0.4em] uppercase text-[#d4af37] mb-2">{displayAgencyName}</h2>
                                    <div className="w-24 h-1 bg-[#d4af37] mb-12"></div>
                               </div>

                               <div>
                                   <p className="text-3xl text-slate-300 italic mb-4 font-light">Exclusive Experience</p>
                                   <h1 className="text-8xl font-bold text-white tracking-tight mb-8 leading-none">
                                       {targetFlyerPkg.packageName}
                                   </h1>
                                   
                                   <div className="inline-flex items-center gap-8 text-3xl text-[#d4af37] border-y border-[#d4af37]/30 py-4 px-12">
                                       <span>{getDestinationName(targetFlyerPkg.destinationId)}</span>
                                       <span>•</span>
                                       <span>{targetFlyerPkg.nights} Nights</span>
                                   </div>
                               </div>

                               <div className="grid grid-cols-2 gap-8 text-left max-w-3xl mx-auto">
                                    {targetFlyerPkg.inclusions.slice(0, 4).map((inc, i) => (
                                        <div key={i} className="flex items-center gap-4 text-2xl text-slate-200">
                                            <Star size={24} className="text-[#d4af37] shrink-0" fill="#d4af37" />
                                            <span>{inc}</span>
                                        </div>
                                    ))}
                               </div>

                               <div className="flex justify-between items-end border-t border-[#d4af37]/30 pt-8 mt-8">
                                    <div className="text-left">
                                        <p className="text-2xl text-slate-400 mb-1">Starting from</p>
                                        <p className="text-7xl font-bold text-white">₹ {(targetFlyerPkg.fixedPrice / 1000).toFixed(0)}k</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl text-slate-400 mb-1">Concierge</p>
                                        <p className="text-4xl font-bold text-[#d4af37]">{displayPhone}</p>
                                    </div>
                               </div>
                          </div>
                      </div>
                  )}

                  {/* === DESIGN 3: BOLD BRAND (Split Square) === */}
                  {selectedDesign === 'BOLD' && targetFlyerPkg && (
                      <div className="w-full h-full flex bg-white font-sans">
                          
                          {/* Left: Info (50%) */}
                          <div className="w-[50%] h-full p-12 flex flex-col relative overflow-hidden z-10" style={{ backgroundColor: primaryColor || '#f59e0b' }}>
                              
                              {/* Background Pattern */}
                              <div className="absolute right-[-100px] top-[-50px] opacity-10 text-white pointer-events-none">
                                  <Plane size={500} />
                              </div>

                              <div className="relative z-10 text-white h-full flex flex-col justify-between">
                                  <div>
                                      {logoUrl && <img src={logoUrl} className="h-20 bg-white p-2 rounded mb-8 inline-block" crossOrigin="anonymous" />}
                                      <h3 className="text-3xl font-black uppercase tracking-wide opacity-80 mb-2">{displayAgencyName}</h3>
                                      <h1 className="text-7xl font-black leading-[0.95] mb-8 uppercase tracking-tighter">
                                          {targetFlyerPkg.packageName}
                                      </h1>
                                      
                                      <div className="flex gap-3 mb-10">
                                          <span className="bg-slate-900 text-white px-4 py-2 rounded-lg text-2xl font-bold">{targetFlyerPkg.nights} Nights</span>
                                          <span className="bg-white text-slate-900 px-4 py-2 rounded-lg text-2xl font-bold uppercase">{getDestinationName(targetFlyerPkg.destinationId)}</span>
                                      </div>

                                      <div className="space-y-4">
                                          {targetFlyerPkg.inclusions.slice(0, 4).map((inc, i) => (
                                              <div key={i} className="flex items-center gap-3">
                                                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-900 shrink-0">
                                                      <Check size={18} strokeWidth={4} />
                                                  </div>
                                                  <span className="text-3xl font-bold leading-none">{inc}</span>
                                              </div>
                                          ))}
                                      </div>
                                  </div>

                                  <div className="bg-slate-900 rounded-2xl p-8 mt-8">
                                      <p className="text-2xl text-slate-400 font-bold uppercase mb-1">Book Now</p>
                                      <h2 className="text-5xl font-black text-white">{displayPhone}</h2>
                                      <p className="text-xl text-slate-400 mt-2">{website}</p>
                                  </div>
                              </div>
                          </div>

                          {/* Right: Image & Price (50%) */}
                          <div className="w-[50%] h-full relative">
                               {targetFlyerPkg.imageUrl ? (
                                   <img src={`${targetFlyerPkg.imageUrl}?t=${Date.now()}`} className="w-full h-full object-cover" crossOrigin="anonymous" alt="Hero" />
                               ) : null}
                               
                               <div className="absolute top-0 right-0 bottom-0 left-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>

                               <div className="absolute bottom-12 right-12 text-right">
                                   <div className="bg-white text-slate-900 p-8 rounded-3xl shadow-2xl transform rotate-3 origin-bottom-right inline-block">
                                        <p className="text-2xl font-bold text-slate-500 uppercase tracking-wide">Special Deal</p>
                                        <p className="text-8xl font-black leading-none tracking-tighter" style={{ color: primaryColor }}>
                                            {targetFlyerPkg.fixedPrice.toLocaleString()}
                                        </p>
                                        <p className="text-2xl font-bold text-slate-400 mt-1">INR / Person</p>
                                   </div>
                               </div>
                          </div>

                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};
