
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { adminService } from '../../services/adminService';
import { agentService } from '../../services/agentService';
import { inventoryService } from '../../services/inventoryService'; // Import Inventory Service
import { useAuth } from '../../context/AuthContext';
import { useClientBranding } from '../../hooks/useClientBranding';
import { FixedPackage, Quote, ItineraryItem, OperatorInventoryItem } from '../../types';
import { Package, Calendar, MapPin, ArrowRight, Loader2, Info, X, User, Image as ImageIcon, Hotel, ChevronDown, CheckCircle, FileText, Eye, Check, Clock, Mail, Globe, AlertTriangle, XCircle, Phone, LayoutTemplate, Star, Zap, Plane, Utensils, Car, Camera, QrCode, BadgeCheck, Sparkles, TrendingUp } from 'lucide-react';
import { generateFixedPackagePDF } from '../../utils/pdfGenerator';

type FlyerDesign = 'MINIMAL' | 'LUXURY' | 'BOLD';

// Extended type to track origin
interface DisplayPackage extends FixedPackage {
    isOperator?: boolean;
    operatorId?: string;
    operatorName?: string;
}

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
  const [packages, setPackages] = useState<DisplayPackage[]>([]);
  const [destinations, setDestinations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Booking Modal State
  const [selectedPkg, setSelectedPkg] = useState<DisplayPackage | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [bookingForm, setBookingForm] = useState({
      date: '',
      guestName: '',
      adults: 2,
      children: 0
  });
  const [markup, setMarkup] = useState<number>(10); // Default Markup State
  const [isCreating, setIsCreating] = useState(false);
  
  // Flyer Generation State
  const [showDesignModal, setShowDesignModal] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState<FlyerDesign>('MINIMAL');
  const [targetFlyerPkg, setTargetFlyerPkg] = useState<DisplayPackage | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
          const [adminPkgs, dests, approvedItems] = await Promise.all([
            adminService.getFixedPackages(),
            adminService.getDestinations(),
            inventoryService.getApprovedItems()
          ]);

          // 1. Process Admin Packages
          const systemPackages: DisplayPackage[] = adminPkgs
            .filter(p => p.isActive)
            .map(p => ({ ...p, isOperator: false }));

          // 2. Process Operator Packages (Map to FixedPackage structure)
          const operatorPackages: DisplayPackage[] = approvedItems
            .filter(i => i.type === 'PACKAGE')
            .map(i => ({
                id: i.id,
                packageName: i.name,
                destinationId: i.destinationId,
                nights: i.nights || 3,
                basePax: 2, // Default base
                fixedPrice: i.costPrice, // Net B2B Rate
                inclusions: i.inclusions || [],
                exclusions: i.exclusions || [],
                validDates: i.validDates || [],
                dateType: i.dateType || 'SPECIFIC',
                validFrom: i.validFrom,
                validTo: i.validTo,
                description: i.description,
                imageUrl: i.imageUrl,
                category: i.category || 'DMC Special',
                hotelDetails: i.hotelName ? `${i.hotelName} (${i.category || 'Standard'})` : 'Standard Hotel',
                notes: i.description,
                itinerary: i.itinerary || [],
                isActive: true,
                createdBy: i.operatorId,
                isOperator: true,
                operatorId: i.operatorId,
                operatorName: i.operatorName
            }));

          setPackages([...systemPackages, ...operatorPackages]);
          setDestinations(dests);
      } catch (e) {
          console.error("Failed to load packages", e);
      } finally {
          setIsLoading(false);
      }
    };
    load();
  }, []);

  const openBookingModal = (pkg: DisplayPackage) => {
      setSelectedPkg(pkg);
      
      // Initialize Markup from Agent Branding Defaults
      const rules = adminService.getPricingRuleSync();
      // Use Agent's default markup if set, else fallback to Admin rules, else 10
      const defaultMarkup = user?.agentBranding?.defaultMarkup ?? rules.agentMarkup ?? 10;
      setMarkup(defaultMarkup);

      let defaultDate = '';
      
      // Smart Default Date Logic
      if (pkg.dateType === 'DAILY' || pkg.dateType === 'RANGE') {
          // Default to tomorrow
          const tmrw = new Date();
          tmrw.setDate(tmrw.getDate() + 1);
          
          let targetDate = tmrw;
          if (pkg.dateType === 'RANGE' && pkg.validFrom) {
             const start = new Date(pkg.validFrom);
             if (targetDate < start) targetDate = start;
             if (pkg.validTo) {
                 const end = new Date(pkg.validTo);
                 if (targetDate > end) targetDate = end;
             }
          }
          defaultDate = targetDate.toISOString().split('T')[0];
      } else {
          // Default to first valid future date
          const sortedDates = pkg.validDates
            .map(d => new Date(d))
            .sort((a,b) => a.getTime() - b.getTime())
            .filter(d => d.getTime() >= new Date().setHours(0,0,0,0));
            
          if (sortedDates.length > 0) {
              defaultDate = sortedDates[0].toISOString().split('T')[0];
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
        
        // --- PRICING LOGIC ---
        // 1. Get Pricing Rules from Admin Settings
        const rules = adminService.getPricingRuleSync();
        
        // 2. Calculate Operator Net (Supplier Cost)
        const operatorTotalNet = pkg.fixedPrice * totalPax;

        // 3. Add Admin/Company Markup (e.g. 10%)
        // Formula: OperatorNet + (OperatorNet * CompanyMarkup%)
        const companyMarkupAmount = operatorTotalNet * (rules.companyMarkup / 100);
        const agentNetCost = operatorTotalNet + companyMarkupAmount;

        // 4. Initial Selling Price using CUSTOM Markup from Modal (which came from defaults)
        const agentMarkupAmount = agentNetCost * (markup / 100);
        const initialSellingPrice = agentNetCost + agentMarkupAmount;

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
            serviceDetails: `Package: ${pkg.packageName} (${pkg.nights} Nights). Hotel: ${pkg.hotelDetails || 'Standard'}`,
            itinerary: itinerary,
            cost: operatorTotalNet, // True Supplier Cost (Hidden from Agent)
            price: agentNetCost, // B2B Net Cost (Visible to Agent as "Cost")
            sellingPrice: initialSellingPrice, // Client Price
            currency: 'INR',
            status: 'DRAFT',
            isLocked: false,
            childCount: Number(bookingForm.children),
            publicNote: compiledNotes,
            // If Operator Package, assign automatically!
            operatorId: pkg.isOperator ? pkg.operatorId : undefined,
            operatorName: pkg.isOperator ? pkg.operatorName : undefined,
            operatorStatus: pkg.isOperator ? 'PENDING' : undefined, // Agent needs to submit/confirm
            netCostVisibleToOperator: false, // Default to hidden, use fixed price logic if needed
            operatorPrice: operatorTotalNet // Pass the agreed operator price
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

  const openDesignModal = (e: React.MouseEvent, pkg: DisplayPackage) => {
      e.stopPropagation();
      setTargetFlyerPkg(pkg);
      
      // Initialize Markup for Flyer preview from branding defaults
      const rules = adminService.getPricingRuleSync();
      const defaultMarkup = user?.agentBranding?.defaultMarkup ?? rules.agentMarkup ?? 10;
      setMarkup(defaultMarkup);
      
      setShowDesignModal(true);
  };

  const handleGenerateFlyer = async () => {
      if (!targetFlyerPkg) return;
      setIsGenerating(true);
      
      // Delay to ensure DOM is rendered
      setTimeout(async () => {
          const node = document.getElementById('flyer-generator-target');
          if (node) {
              try {
                  await document.fonts.ready;
                  
                  // Use specific background color to avoid transparency issues
                  const bgColor = '#ffffff'; 

                  const canvas = await html2canvas(node, { 
                      useCORS: true, 
                      allowTaint: true, 
                      backgroundColor: bgColor, 
                      width: 1080, 
                      height: 1080, 
                      scale: 1, // Exact scale
                      logging: false 
                  });
                  
                  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
                  const link = document.createElement('a');
                  link.download = `${targetFlyerPkg.packageName.replace(/\s+/g, '_')}_Flyer.jpg`;
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
      }, 1000); 
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
            {packages.map(pkg => {
                // Calculation for Display in Grid - Using DEFAULT markup to estimate "Starting From"
                const rules = adminService.getPricingRuleSync();
                const defaultAgentMarkup = user?.agentBranding?.defaultMarkup ?? rules.agentMarkup ?? 10;
                
                // 1. Operator Net + Admin Margin
                const adminMargin = pkg.fixedPrice * (rules.companyMarkup / 100);
                const agentNetCost = pkg.fixedPrice + adminMargin;
                
                // 2. Agent Markup (Default)
                const agentProfit = agentNetCost * (defaultAgentMarkup / 100);
                const displaySellingPrice = agentNetCost + agentProfit;

                return (
                <div key={pkg.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col hover:shadow-lg transition group ${pkg.isOperator ? 'border-purple-200' : 'border-slate-200'}`}>
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
                        {pkg.isOperator && (
                            <div className="absolute top-3 right-3 bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-md">
                                <BadgeCheck size={12} /> DMC Verified
                            </div>
                        )}
                    </div>

                    <div className="p-5 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-xs text-slate-500">Duration</p>
                                <p className="font-bold text-slate-800">{pkg.nights} Nights</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-500">Net Rate (B2B)</p>
                                <p className="font-mono font-bold text-brand-600 text-lg">₹ {agentNetCost.toLocaleString()}</p>
                            </div>
                        </div>

                        {pkg.hotelDetails && (
                            <div className="mb-4 text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 flex items-center gap-2">
                                <Hotel size={12} className="text-slate-400" />
                                <span className="line-clamp-1">{pkg.hotelDetails}</span>
                            </div>
                        )}

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
            )})}
        </div>
      )}

      {/* BOOKING MODAL */}
      {isModalOpen && selectedPkg && (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                   <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                      <div>
                          <h3 className="font-bold text-lg text-slate-900">Book Package</h3>
                          <p className="text-xs text-slate-500">{selectedPkg.packageName}</p>
                      </div>
                      <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                   </div>
                   
                   <form onSubmit={handleCreateQuote} className="p-6 space-y-5">
                       {/* Date Selection */}
                       <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Travel Date</label>
                           {selectedPkg.dateType === 'SPECIFIC' ? (
                               <div className="relative">
                                   <Calendar className="absolute left-3 top-3 text-slate-400" size={18} />
                                   <select 
                                       required
                                       className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none appearance-none bg-white font-medium"
                                       value={bookingForm.date}
                                       onChange={e => setBookingForm({...bookingForm, date: e.target.value})}
                                   >
                                       <option value="">Select Departure Date...</option>
                                       {selectedPkg.validDates.map(date => (
                                           <option key={date} value={date}>
                                               {new Date(date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                                           </option>
                                       ))}
                                   </select>
                               </div>
                           ) : (
                               <div className="relative">
                                   <Calendar className="absolute left-3 top-3 text-slate-400" size={18} />
                                   <input 
                                       type="date" 
                                       required 
                                       className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none font-medium"
                                       value={bookingForm.date} 
                                       onChange={e => setBookingForm({...bookingForm, date: e.target.value})} 
                                   />
                               </div>
                           )}
                       </div>

                       {/* Pax Selection */}
                       <div className="grid grid-cols-2 gap-4">
                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Adults</label>
                               <div className="relative">
                                   <User className="absolute left-3 top-3 text-slate-400" size={18} />
                                   <input 
                                       type="number" 
                                       min="1"
                                       required 
                                       className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none font-medium"
                                       value={bookingForm.adults} 
                                       onChange={e => setBookingForm({...bookingForm, adults: Number(e.target.value)})} 
                                   />
                               </div>
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Children</label>
                               <div className="relative">
                                   <User className="absolute left-3 top-3 text-slate-400" size={18} />
                                   <input 
                                       type="number" 
                                       min="0"
                                       required 
                                       className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none font-medium"
                                       value={bookingForm.children} 
                                       onChange={e => setBookingForm({...bookingForm, children: Number(e.target.value)})} 
                                   />
                               </div>
                           </div>
                       </div>

                       {/* Guest Name */}
                       <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Lead Guest Name</label>
                           <input 
                               type="text" 
                               required 
                               placeholder="e.g. John Doe" 
                               className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none font-medium"
                               value={bookingForm.guestName} 
                               onChange={e => setBookingForm({...bookingForm, guestName: e.target.value})} 
                           />
                       </div>

                       {/* MARKUP CONTROL & BREAKDOWN */}
                       <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                           <div className="mb-4">
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1 flex items-center justify-between">
                                   <span>Your Markup</span>
                                   <span className="text-brand-600">{markup}%</span>
                               </label>
                               <div className="flex items-center gap-3">
                                   <input 
                                       type="range" 
                                       min="0" 
                                       max="50" 
                                       value={markup} 
                                       onChange={(e) => setMarkup(Number(e.target.value))}
                                       className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                   />
                                   <div className="relative w-20">
                                       <input 
                                           type="number" 
                                           min="0"
                                           value={markup}
                                           onChange={(e) => setMarkup(Number(e.target.value))}
                                           className="w-full pl-2 pr-6 py-1.5 text-sm border border-slate-300 rounded-lg text-center font-bold outline-none focus:border-brand-500"
                                       />
                                       <span className="absolute right-2 top-1.5 text-slate-400 font-bold text-sm">%</span>
                                   </div>
                               </div>
                           </div>

                           <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-200">
                               {(() => {
                                   const totalPax = bookingForm.adults + bookingForm.children;
                                   const rules = adminService.getPricingRuleSync();
                                   
                                   // 1. Operator Net (Raw Supplier Cost)
                                   const opNet = selectedPkg.fixedPrice * totalPax;
                                   
                                   // 2. Admin Markup (Company Margin)
                                   const adminMargin = opNet * (rules.companyMarkup / 100);
                                   
                                   // 3. Agent Net (B2B Price)
                                   const agentNet = opNet + adminMargin;
                                   
                                   // 4. Agent Markup (Custom from State)
                                   const agentProfit = agentNet * (markup / 100);
                                   
                                   // 5. Final Client Price
                                   const clientPrice = agentNet + agentProfit;

                                   return (
                                       <>
                                           <div>
                                               <p className="text-[10px] text-slate-500 font-bold uppercase">Net Cost</p>
                                               <p className="text-sm font-medium text-slate-700">₹ {Math.round(agentNet).toLocaleString()}</p>
                                           </div>
                                           <div>
                                                <p className="text-[10px] text-green-600 font-bold uppercase flex items-center justify-center gap-1">
                                                    <TrendingUp size={10} /> Profit
                                                </p>
                                                <p className="text-sm font-bold text-green-600">+ ₹ {Math.round(agentProfit).toLocaleString()}</p>
                                           </div>
                                           <div>
                                               <p className="text-[10px] text-brand-600 font-bold uppercase">Sell Price</p>
                                               <p className="text-lg font-bold text-brand-700">₹ {Math.round(clientPrice).toLocaleString()}</p>
                                           </div>
                                       </>
                                   );
                               })()}
                           </div>
                       </div>

                       <button type="submit" disabled={isCreating} className="w-full bg-brand-600 text-white py-4 rounded-xl font-bold hover:bg-brand-700 transition shadow-lg shadow-brand-200">
                           {isCreating ? (
                               <span className="flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={20}/> Creating Quote...</span>
                           ) : (
                               'Create Booking Quote'
                           )}
                       </button>
                   </form>
              </div>
          </div>
      )}

      {/* DESIGN SELECTION MODAL */}
      {/* ... (Keep existing Design Modal code same) ... */}
      {showDesignModal && targetFlyerPkg && (
           <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="font-bold text-xl text-slate-900">Select Flyer Style</h3>
                            <p className="text-sm text-slate-500">Creates a high-quality square post.</p>
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

      {/* ... (Keep existing Hidden Flyer Templates code same) ... */}
      {(isGenerating || targetFlyerPkg) && selectedDesign && (
          <div style={{ position: 'fixed', left: '-9999px', top: '0', zIndex: -50 }}>
              <div 
                  id="flyer-generator-target"
                  className="w-[1080px] h-[1080px] relative flex flex-col font-sans overflow-hidden bg-white"
              >
                  {/* ... Existing flyer templates ... */}
                  {/* Note: Ensure the Price display in the flyer ALSO calculates the markup if you want the Agent to advertise the selling price, not net. 
                      Ideally, for Flyers, we should show "Starting From [AgentNet + Markup]" 
                   */}
                   {/* DESIGN 1: MODERN / MINIMAL */}
                  {selectedDesign === 'MINIMAL' && targetFlyerPkg && (
                      <div className="w-full h-full flex flex-col bg-white">
                          <div className="h-24 flex items-center justify-center pt-6 pb-2">
                              {logoUrl ? (
                                  <img src={logoUrl} className="h-20 object-contain" crossOrigin="anonymous" />
                              ) : (
                                  <h2 className="text-3xl font-bold text-slate-800 uppercase tracking-widest">{displayAgencyName}</h2>
                              )}
                          </div>
                          <div className="relative h-[450px] w-full m-4 mx-auto w-[95%] rounded-3xl overflow-hidden shadow-xl">
                              {targetFlyerPkg.imageUrl ? (
                                  <img src={targetFlyerPkg.imageUrl} className="w-full h-full object-cover" crossOrigin="anonymous" />
                              ) : (
                                  <div className="w-full h-full bg-slate-200" />
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                              <div className="absolute bottom-8 left-8 text-white">
                                  <span className="bg-brand-600 text-white px-3 py-1 rounded text-lg font-bold uppercase tracking-wider mb-2 inline-block">
                                      {targetFlyerPkg.nights} Nights Package
                                  </span>
                                  <h1 className="text-5xl font-black leading-tight mb-2">{targetFlyerPkg.packageName}</h1>
                                  <p className="text-2xl font-medium opacity-90 flex items-center gap-2">
                                      <Calendar size={28} /> {targetFlyerPkg.dateType === 'SPECIFIC' ? targetFlyerPkg.validDates[0] : 'Daily Departures'}
                                  </p>
                              </div>
                          </div>
                          <div className="flex-1 px-12 py-6 grid grid-cols-2 gap-12">
                              <div className="border-r border-slate-200 pr-8">
                                  <h3 className="text-2xl font-bold text-brand-700 uppercase mb-4 border-b-2 border-brand-200 pb-2 inline-block">Inclusions</h3>
                                  <ul className="space-y-3">
                                      {targetFlyerPkg.inclusions.slice(0, 6).map((item, idx) => (
                                          <li key={idx} className="flex gap-3 text-xl text-slate-700">
                                              <span className="font-bold text-brand-500">{idx + 1}.</span>
                                              <span className="font-medium">{item}</span>
                                          </li>
                                      ))}
                                  </ul>
                              </div>
                              <div>
                                  <h3 className="text-2xl font-bold text-slate-500 uppercase mb-4 border-b-2 border-slate-200 pb-2 inline-block">Exclusions</h3>
                                  <ul className="space-y-3">
                                      {targetFlyerPkg.exclusions.slice(0, 6).map((item, idx) => (
                                          <li key={idx} className="flex gap-3 text-xl text-slate-500">
                                              <span className="font-bold text-slate-400">{idx + 1}.</span>
                                              <span>{item}</span>
                                          </li>
                                      ))}
                                  </ul>
                              </div>
                          </div>
                          <div className="mt-auto h-40 relative">
                              <div className="absolute -top-6 right-0 bg-red-600 text-white py-4 px-12 rounded-l-full shadow-lg z-10">
                                  <p className="text-xl uppercase font-bold opacity-80">Deal Price</p>
                                  <p className="text-5xl font-black">
                                      {/* Flyer Price: Use calculated Selling Price based on state markup */}
                                      ₹ {Math.round((targetFlyerPkg.fixedPrice * (1 + (adminService.getPricingRuleSync().companyMarkup/100))) * (1 + (markup/100))).toLocaleString()}
                                  </p>
                              </div>

                              <div className="h-full bg-slate-900 text-white flex items-center justify-between px-12">
                                  <div>
                                      <p className="text-slate-400 text-lg uppercase tracking-widest font-bold mb-1">Book Your Trip</p>
                                      <p className="text-4xl font-bold">{displayPhone}</p>
                                      <p className="text-xl text-brand-400">{website}</p>
                                  </div>
                                  <div className="text-right opacity-50">
                                      <p className="text-lg">{displayAgencyName}</p>
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}
                  {/* Keep other designs (Luxury, Bold) logic identical to Minimal for price calculation */}
                  {selectedDesign === 'LUXURY' && targetFlyerPkg && (
                     <div className="w-full h-full bg-slate-100 p-8 flex flex-col gap-6 font-serif">
                        <div className="absolute inset-0 z-0">
                            <img src={targetFlyerPkg.imageUrl} className="w-full h-full object-cover opacity-20 filter blur-sm" crossOrigin="anonymous" />
                        </div>
                        <div className="relative z-10 bg-white rounded-3xl shadow-xl overflow-hidden h-[45%] flex">
                            <div className="w-1/2 p-12 flex flex-col justify-center">
                                <p className="text-amber-600 text-xl uppercase tracking-[0.3em] font-bold mb-4">Premium Escape</p>
                                <h1 className="text-6xl font-bold text-slate-900 leading-tight mb-6">{targetFlyerPkg.packageName}</h1>
                                <div className="flex items-center gap-4 text-slate-500 text-2xl">
                                     <MapPin size={32} className="text-amber-500" />
                                     <span>{getDestinationName(targetFlyerPkg.destinationId)}</span>
                                </div>
                            </div>
                            <div className="w-1/2 h-full relative">
                                <img src={targetFlyerPkg.imageUrl} className="w-full h-full object-cover" crossOrigin="anonymous" />
                                <div className="absolute inset-0 bg-gradient-to-r from-white via-transparent to-transparent"></div>
                            </div>
                        </div>
                        <div className="relative z-10 grid grid-cols-3 gap-6 h-[30%]">
                            <div className="col-span-2 bg-white/90 backdrop-blur-md rounded-3xl shadow-lg p-10 border border-white/50">
                                 <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                                     <Star className="text-amber-500 fill-amber-500" /> Package Highlights
                                 </h3>
                                 <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                                     {targetFlyerPkg.inclusions.slice(0, 6).map((inc, i) => (
                                         <div key={i} className="flex items-center gap-3 text-xl text-slate-700">
                                             <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                             {inc}
                                         </div>
                                     ))}
                                 </div>
                            </div>
                            <div className="bg-slate-900 text-white rounded-3xl shadow-lg p-10 flex flex-col justify-center text-center relative overflow-hidden">
                                <div className="absolute inset-0 bg-amber-500/10 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
                                <p className="text-slate-400 text-xl uppercase tracking-widest mb-2 relative z-10">Starting At</p>
                                <p className="text-6xl font-bold text-amber-400 relative z-10">₹ {Math.round((targetFlyerPkg.fixedPrice * (1 + (adminService.getPricingRuleSync().companyMarkup/100))) * (1 + (markup/100))).toLocaleString()}</p>
                                <p className="text-sm text-slate-400 mt-2 relative z-10">Per Person</p>
                            </div>
                        </div>
                        <div className="relative z-10 flex-1 bg-white rounded-3xl shadow-xl p-8 flex justify-between items-center">
                            <div className="flex items-center gap-6">
                                {logoUrl && <img src={logoUrl} className="h-24 w-auto object-contain" crossOrigin="anonymous" />}
                                <div>
                                     <p className="text-3xl font-bold text-slate-900">{displayAgencyName}</p>
                                     <p className="text-xl text-slate-500">{website}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-bold text-slate-400 uppercase">Reservations</p>
                                <p className="text-5xl font-bold text-slate-900">{displayPhone}</p>
                            </div>
                        </div>
                     </div>
                  )}

                  {selectedDesign === 'BOLD' && targetFlyerPkg && (
                      <div className="w-full h-full flex bg-white">
                          <div className="w-[40%] bg-brand-600 text-white p-12 flex flex-col relative overflow-hidden">
                              <div className="absolute top-0 left-0 w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(#fff 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>
                              <div className="relative z-10">
                                  <div className="mb-12">
                                      {logoUrl ? (
                                          <img src={logoUrl} className="h-20 object-contain brightness-0 invert" crossOrigin="anonymous" />
                                      ) : (
                                          <h2 className="text-4xl font-black uppercase">{displayAgencyName}</h2>
                                      )}
                                  </div>
                                  <p className="text-2xl font-bold opacity-80 uppercase tracking-widest mb-2">Special Offer</p>
                                  <h1 className="text-7xl font-black leading-none mb-6">{targetFlyerPkg.packageName}</h1>
                                  <div className="bg-white/10 p-6 rounded-xl border border-white/20 mb-8 backdrop-blur-sm">
                                      <p className="text-xl font-bold mb-4 uppercase tracking-wider border-b border-white/20 pb-2">Includes</p>
                                      <ul className="space-y-3">
                                          {targetFlyerPkg.inclusions.slice(0, 5).map((inc, i) => (
                                              <li key={i} className="flex items-start gap-3 text-xl font-medium">
                                                  <Check size={28} className="shrink-0" /> {inc}
                                              </li>
                                          ))}
                                      </ul>
                                  </div>
                                  <div className="mt-auto">
                                      <p className="text-xl font-bold opacity-70 mb-1">Book Now</p>
                                      <p className="text-5xl font-black">{displayPhone}</p>
                                      <p className="text-xl mt-2 underline opacity-80">{website}</p>
                                  </div>
                              </div>
                          </div>
                          <div className="w-[60%] relative">
                              <img src={targetFlyerPkg.imageUrl} className="w-full h-full object-cover" crossOrigin="anonymous" />
                              <div className="absolute top-12 right-0 bg-white text-slate-900 py-8 px-12 shadow-2xl">
                                  <p className="text-2xl font-bold text-slate-400 uppercase">Only</p>
                                  <p className="text-7xl font-black text-brand-600">₹ {Math.round((targetFlyerPkg.fixedPrice * (1 + (adminService.getPricingRuleSync().companyMarkup/100))) * (1 + (markup/100))).toLocaleString()}</p>
                                  <p className="text-right text-lg font-bold text-slate-500">/ Person</p>
                              </div>
                              <div className="absolute bottom-12 left-12">
                                  <h2 className="text-[120px] font-black text-white leading-none opacity-90 drop-shadow-lg uppercase writing-mode-vertical" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
                                      {getDestinationName(targetFlyerPkg.destinationId)}
                                  </h2>
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
