
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import domtoimage from 'dom-to-image-more';
import { adminService } from '../../services/adminService';
import { agentService } from '../../services/agentService';
import { useAuth } from '../../context/AuthContext';
import { useClientBranding } from '../../hooks/useClientBranding';
import { FixedPackage, Quote, ItineraryItem } from '../../types';
import { Package, Calendar, MapPin, ArrowRight, Loader2, Info, X, User, Image as ImageIcon, Hotel, ChevronDown, CheckCircle, Download, Coffee, Car, Phone, Mail, Globe, Clock, Star, TrendingUp, AlertTriangle, XCircle, FileText, Eye, Check } from 'lucide-react';
import { generateFixedPackagePDF } from '../../utils/pdfGenerator';

export const AgentPackages: React.FC = () => {
  const { user } = useAuth();
  const { 
      agencyName, 
      logoUrl, 
      primaryColor, 
      secondaryColor,
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
  
  // Detail Modal State
  const [viewingPkg, setViewingPkg] = useState<FixedPackage | null>(null);

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

  const handleDownloadFlyer = async (e: React.MouseEvent, pkg: FixedPackage) => {
      e.stopPropagation();
      setGeneratingPdfId(pkg.id);
      setFlyerPackage(pkg);

      // DOM rendering delay
      setTimeout(async () => {
          const node = document.getElementById('flyer');
          if (node) {
              try {
                  // 1. Wait for fonts to load
                  await document.fonts.ready;

                  // 2. Wait for images to load
                  const images = Array.from(node.getElementsByTagName('img'));
                  await Promise.all(images.map(img => {
                      if (img.complete) return Promise.resolve();
                      return new Promise((resolve) => {
                          img.onload = resolve;
                          img.onerror = resolve; // Continue even if image fails
                      });
                  }));

                  // 3. Generate High-Quality JPEG
                  // Remove scaling to avoid white lines. The DOM element is already at target resolution (1080x1920)
                  const dataUrl = await domtoimage.toJpeg(node, {
                      quality: 0.95, 
                      width: 1080,
                      height: 1920,
                      style: {
                          transform: 'scale(1)', // Explicitly set to 1 to avoid library defaults
                          transformOrigin: 'top left',
                          width: '1080px',
                          height: '1920px',
                          left: '0',
                          top: '0',
                          margin: '0',
                          padding: '0',
                          border: 'none',
                          backgroundColor: '#0f172a' // Dark background bleed to hide any white edge gaps
                      },
                      filter: (n) => {
                          if (n.tagName === 'LINK' && (n as HTMLLinkElement).href.includes('fonts.googleapis')) {
                              return false;
                          }
                          return true;
                      }
                  });
                  
                  // 4. Download
                  const link = document.createElement('a');
                  link.download = `${pkg.packageName.replace(/\s+/g, '_')}_Flyer.jpg`;
                  link.href = dataUrl;
                  link.click();

              } catch (error) {
                  console.error("Flyer generation failed", error);
                  alert("Failed to generate flyer. Please check your internet connection.");
              } finally {
                  setGeneratingPdfId(null);
                  setFlyerPackage(null);
              }
          } else {
              setGeneratingPdfId(null);
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

  const todayStr = new Date().toISOString().split('T')[0];

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
                                    onClick={() => setViewingPkg(pkg)}
                                    className="p-2.5 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
                                    title="View Full Details"
                                >
                                    <Eye size={18} />
                                </button>

                                <button 
                                    onClick={(e) => handleDownloadFlyer(e, pkg)}
                                    disabled={generatingPdfId === pkg.id}
                                    className="p-2.5 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition disabled:opacity-70"
                                    title="Generate Post Image"
                                >
                                    {generatingPdfId === pkg.id ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />} 
                                </button>
                                
                                <button 
                                    onClick={(e) => handleDownloadPDF(e, pkg)}
                                    className="p-2.5 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
                                    title="Download Detailed PDF"
                                >
                                    <FileText size={18} />
                                </button>

                                <button 
                                    onClick={() => openBookingModal(pkg)}
                                    className="flex-1 bg-brand-600 text-white px-3 py-2.5 rounded-lg text-sm font-bold hover:bg-brand-700 transition flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform active:scale-95 duration-200"
                                >
                                    Book <ArrowRight size={16} />
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

      {/* DETAIL MODAL */}
      {viewingPkg && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                  {/* Header Image */}
                  <div className="h-48 bg-slate-200 relative shrink-0">
                      {viewingPkg.imageUrl ? (
                          <img src={viewingPkg.imageUrl} alt={viewingPkg.packageName} className="w-full h-full object-cover" />
                      ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                              <ImageIcon size={48} />
                          </div>
                      )}
                      <button onClick={() => setViewingPkg(null)} className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition backdrop-blur-md">
                          <X size={20} />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                          <h2 className="text-xl font-bold text-white">{viewingPkg.packageName}</h2>
                          <p className="text-sm text-white/90">{viewingPkg.nights} Nights / {viewingPkg.nights+1} Days</p>
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      <div className="prose prose-sm max-w-none text-slate-600">
                          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-2 flex items-center gap-2">
                              <Info size={16} className="text-brand-600"/> Overview
                          </h4>
                          <div dangerouslySetInnerHTML={{ __html: viewingPkg.description || 'No description available.' }} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                              <h4 className="text-sm font-bold text-green-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                                  <CheckCircle size={16}/> Inclusions
                              </h4>
                              <ul className="space-y-2">
                                  {viewingPkg.inclusions.map((inc, i) => (
                                      <li key={i} className="flex items-start gap-2 text-sm text-green-900">
                                          <CheckCircle size={14} className="mt-0.5 shrink-0 opacity-50" />
                                          {inc}
                                      </li>
                                  ))}
                              </ul>
                          </div>
                          <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                              <h4 className="text-sm font-bold text-red-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                                  <XCircle size={16}/> Exclusions
                              </h4>
                              <ul className="space-y-2">
                                  {viewingPkg.exclusions.map((exc, i) => (
                                      <li key={i} className="flex items-start gap-2 text-sm text-red-900">
                                          <XCircle size={14} className="mt-0.5 shrink-0 opacity-50" />
                                          {exc}
                                      </li>
                                  ))}
                              </ul>
                          </div>
                      </div>
                      {viewingPkg.notes && (
                          <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                              <h4 className="text-sm font-bold text-amber-800 uppercase tracking-wide mb-2 flex items-center gap-2">
                                  <AlertTriangle size={16}/> Policy & Notes
                              </h4>
                              <div className="text-sm text-amber-900 whitespace-pre-line leading-relaxed" dangerouslySetInnerHTML={{ __html: viewingPkg.notes }} />
                          </div>
                      )}
                  </div>
                  <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                      <button onClick={() => { setViewingPkg(null); openBookingModal(viewingPkg); }} className="bg-brand-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-brand-700 transition flex items-center gap-2 shadow-sm">
                          Book Now <ArrowRight size={16} />
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* BOOKING MODAL */}
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

      {/* --- HIDDEN FLYER TEMPLATE (1080x1920) --- */}
      {/* This invisible section is rendered for the dom-to-image library */}
      {flyerPackage && (
          <div style={{ position: 'fixed', left: '-9999px', top: '0', zIndex: -50 }}>
              <div 
                  id="flyer"
                  className="w-[1080px] h-[1920px] bg-slate-900 relative flex flex-col font-sans text-slate-900 overflow-hidden"
                  style={{ fontFamily: "'Inter', sans-serif" }}
              >
                  {/* 1. HERO SECTION (50%) */}
                  <div className="h-[960px] relative shrink-0 overflow-hidden bg-slate-800">
                      {flyerPackage.imageUrl ? (
                           // Cache buster included
                           <img 
                                src={`${flyerPackage.imageUrl}?t=${Date.now()}`} 
                                className="w-full h-full object-cover" 
                                crossOrigin="anonymous" 
                                alt="Hero" 
                            />
                      ) : (
                           <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                               <ImageIcon size={200} className="text-slate-600" />
                           </div>
                      )}
                      
                      {/* Gradient Overlay for Text Readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-90"></div>

                      {/* Header Badge */}
                      <div className="absolute top-16 left-0 w-full flex justify-center z-20">
                          <div className="bg-white/95 backdrop-blur-md px-10 py-5 rounded-full shadow-2xl flex items-center gap-5 border border-white/50">
                               {logoUrl ? (
                                   <img src={logoUrl} className="h-20 w-auto object-contain" alt="Logo" crossOrigin="anonymous" />
                               ) : (
                                   <div className="h-16 w-16 rounded-xl flex items-center justify-center text-white font-black text-3xl" style={{backgroundColor: primaryColor}}>
                                       {displayAgencyName?.charAt(0)}
                                   </div>
                               )}
                               <div>
                                   <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">{displayAgencyName}</h2>
                                   <div className="flex items-center gap-2 mt-1">
                                      <CheckCircle size={20} style={{color: primaryColor}} strokeWidth={3} />
                                      <p className="text-lg font-bold text-slate-500 uppercase tracking-wider">Premium Partner</p>
                                   </div>
                               </div>
                          </div>
                      </div>

                      {/* Hero Title - Bottom aligned to image area */}
                      <div className="absolute bottom-20 left-16 right-16 z-20">
                          <div className="flex flex-wrap gap-4 mb-6">
                              <span className="bg-white text-slate-900 px-6 py-2 rounded-lg text-xl font-bold uppercase tracking-wider shadow-lg">
                                  {flyerPackage.category || 'Group Tour'}
                              </span>
                              <span className="bg-black/50 backdrop-blur-md text-white px-6 py-2 rounded-lg text-xl font-bold border border-white/30 flex items-center gap-2">
                                  <Clock size={24} /> {flyerPackage.nights} Nights
                              </span>
                          </div>
                          <h1 className="text-[100px] leading-[0.9] font-black text-white drop-shadow-2xl tracking-tighter mb-4 break-words">
                              {flyerPackage.packageName}
                          </h1>
                          <div className="flex items-center gap-3 text-white/90 text-4xl font-bold">
                              <MapPin size={40} className="text-white" fill={primaryColor} /> 
                              {getDestinationName(flyerPackage.destinationId)}
                          </div>
                      </div>
                  </div>

                  {/* 2. BODY CONTENT (Overlapping Card) */}
                  <div className="flex-1 bg-white relative z-30 -mt-[80px] rounded-t-[50px] px-20 pt-28 pb-16 flex flex-col shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.5)]">
                      
                      {/* Floating Price Badge */}
                      <div className="absolute -top-32 right-16 w-72 h-72 bg-white rounded-full flex flex-col items-center justify-center shadow-2xl border-[16px] border-slate-100 z-40 transform rotate-6">
                          <div className="bg-red-600 text-white text-lg font-bold px-6 py-1 rounded-full uppercase tracking-widest mb-2 shadow-sm">Deal</div>
                          <p className="text-slate-400 uppercase text-2xl font-bold tracking-widest">Only</p>
                          <h2 className="text-8xl font-black text-slate-900 tracking-tighter -ml-2" style={{color: primaryColor}}>
                             <span className="text-4xl align-top text-slate-400 mr-1">₹</span>
                             {(flyerPackage.fixedPrice / 1000).toFixed(0)}k
                          </h2>
                          <p className="text-slate-500 font-bold text-xl mt-1">per person</p>
                      </div>

                      {/* Hotel Section */}
                      <div className="mb-14">
                          <div className="flex items-center gap-4 mb-6">
                              <div className="p-3 rounded-2xl" style={{backgroundColor: `${primaryColor}20`}}>
                                <Hotel size={40} style={{color: primaryColor}} />
                              </div>
                              <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tight">Accommodation</h3>
                          </div>
                          <div className="bg-slate-50 border-2 border-slate-100 p-8 rounded-3xl">
                              <h4 className="text-5xl font-black text-slate-800 leading-tight">
                                  {(flyerPackage.hotelDetails && flyerPackage.hotelDetails !== 'NA') ? flyerPackage.hotelDetails : '4 Star Premium Hotel'}
                              </h4>
                          </div>
                      </div>

                      {/* Inclusions Grid */}
                      <div className="flex-1">
                          <div className="flex items-center gap-4 mb-8">
                              <div className="p-3 rounded-2xl" style={{backgroundColor: `${primaryColor}20`}}>
                                <CheckCircle size={40} style={{color: primaryColor}} />
                              </div>
                              <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tight">Package Includes</h3>
                          </div>
                          <div className="grid grid-cols-2 gap-6">
                               {flyerPackage.inclusions.slice(0, 6).map((inc, i) => (
                                   <div key={i} className="flex items-center gap-5 p-5 rounded-2xl border-2 border-slate-100 bg-white shadow-sm">
                                       <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                           <Check size={28} className="text-green-700" strokeWidth={4} />
                                       </div>
                                       <span className="text-2xl font-bold text-slate-700 leading-tight">{inc}</span>
                                   </div>
                               ))}
                          </div>
                      </div>
                  </div>

                  {/* 3. FOOTER */}
                  <div className="bg-[#0f172a] text-white pt-16 pb-20 px-20 mt-auto relative z-40">
                      <div className="flex justify-between items-center">
                          <div className="flex flex-col gap-4">
                              <p className="text-slate-400 text-2xl font-bold uppercase tracking-widest">For Bookings & Queries</p>
                              <h2 className="text-[90px] font-black leading-none tracking-tighter text-white">{displayPhone}</h2>
                          </div>
                          
                          <div className="text-right space-y-4">
                              {displayEmail && (
                                  <div className="flex items-center justify-end gap-4">
                                      <span className="text-3xl font-medium text-slate-300">{displayEmail}</span>
                                      <Mail size={36} style={{color: primaryColor}} />
                                  </div>
                              )}
                              {website && (
                                  <div className="flex items-center justify-end gap-4">
                                      <span className="text-3xl font-bold text-white border-b-4 border-slate-600 pb-1">{website}</span>
                                      <Globe size={36} style={{color: primaryColor}} />
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};
