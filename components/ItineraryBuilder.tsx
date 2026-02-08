
import React, { useState, useEffect } from 'react';
import { ItineraryItem, ItineraryService } from '../types';
import { adminService } from '../services/adminService';
import { currencyService } from '../services/currencyService';
import { calculatePriceFromNet } from '../utils/pricingEngine';
import { InventoryModal } from './builder/InventoryModal';
import { Save, Plus, Trash2, MapPin, Hotel, Camera, Car, X, Info, Settings, ToggleLeft, ToggleRight, User, Copy, ArrowUp, ArrowDown, GripVertical, Calendar, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Props {
  initialItinerary: ItineraryItem[];
  destination: string;
  pax: number;
  onSave: (itinerary: ItineraryItem[], financials?: { net: number, selling: number, currency: string }) => void;
  onCancel: () => void;
}

export const ItineraryBuilder: React.FC<Props> = ({ initialItinerary, destination, pax, onSave, onCancel }) => {
  const { user } = useAuth();
  const [itinerary, setItinerary] = useState<ItineraryItem[]>(JSON.parse(JSON.stringify(initialItinerary)));
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'HOTEL' | 'ACTIVITY' | 'TRANSFER'>('HOTEL');
  const [financials, setFinancials] = useState({ net: 0, selling: 0, currency: 'INR' });
  
  // Drag and Drop State
  const [draggedDayIndex, setDraggedDayIndex] = useState<number | null>(null);
  
  // Pricing Controls - Initialize with user default if available, else 10
  const [markupPercent, setMarkupPercent] = useState<number>(user?.agentBranding?.defaultMarkup ?? 10);
  const [enableMarkup, setEnableMarkup] = useState<boolean>(true);

  // Recalculate price whenever itinerary changes or markup settings change
  useEffect(() => {
    let totalNet = 0;
    const rules = adminService.getPricingRuleSync();
    
    itinerary.forEach(day => {
        day.services?.forEach(svc => {
            const cost = Number(svc.cost) || 0;
            const currency = svc.currency || 'INR';
            const qty = Number(svc.quantity) || 1;
            const nights = Number(svc.duration_nights) || 1;
            
            // Standardize to INR for calculation
            totalNet += currencyService.convert(cost * qty * nights, currency, 'INR');
        });
    });

    const effectiveMarkup = enableMarkup ? markupPercent : 0;

    const calc = calculatePriceFromNet(totalNet, rules, pax, effectiveMarkup);
    setFinancials({
        net: calc.platformNetCost,
        selling: calc.finalPrice,
        currency: 'INR'
    });
  }, [itinerary, pax, markupPercent, enableMarkup]);

  // --- SERVICE ACTIONS ---

  const handleAddService = (item: any) => {
      // Logic for cost:
      // InventoryModal now returns a calculated 'estimated_cost' in the item object.
      // We rely on that primarily.
      const rawCost = item.estimated_cost || item.cost || item.costPrice || item.price || 0;
      
      const newService: ItineraryService = {
          id: item.id || `svc_${Date.now()}`,
          inventory_id: item.inventory_id || item.id, 
          type: item.type,
          name: item.name,
          cost: Number(rawCost),
          price: Number(rawCost), // Will be recalculated by builder logic
          currency: item.currency || 'INR',
          quantity: Number(item.quantity) || 1,
          duration_nights: Number(item.nights) || 1,
          meta: item.meta || {}
      };

      const updated = [...itinerary];
      if (!updated[activeDayIndex].services) {
          updated[activeDayIndex].services = [];
      }
      
      updated[activeDayIndex].services!.push(newService);
      setItinerary(updated);
  };

  const handleRemoveService = (dayIndex: number, serviceId: string) => {
      const updated = [...itinerary];
      updated[dayIndex].services = updated[dayIndex].services?.filter(s => s.id !== serviceId);
      setItinerary(updated);
  };

  const handleMoveService = (dayIndex: number, serviceId: string, direction: 'UP' | 'DOWN') => {
      const updated = [...itinerary];
      const services = updated[dayIndex].services || [];
      const idx = services.findIndex(s => s.id === serviceId);
      
      if (idx === -1) return;
      if (direction === 'UP' && idx === 0) return;
      if (direction === 'DOWN' && idx === services.length - 1) return;
      
      const swapIdx = direction === 'UP' ? idx - 1 : idx + 1;
      [services[idx], services[swapIdx]] = [services[swapIdx], services[idx]];
      
      updated[dayIndex].services = services;
      setItinerary(updated);
  };

  // --- DAY ACTIONS ---

  const handleAddDay = () => {
      const newDayNumber = itinerary.length + 1;
      const newDay: ItineraryItem = {
          day: newDayNumber,
          title: `Day ${newDayNumber}`,
          description: 'Day at leisure.',
          services: []
      };
      setItinerary([...itinerary, newDay]);
      setActiveDayIndex(itinerary.length); 
  };

  const handleCloneDay = (dayIndex: number, e: React.MouseEvent) => {
      e.stopPropagation(); 
      if (!confirm(`Duplicate Day ${itinerary[dayIndex].day}?`)) return;

      const dayToClone = itinerary[dayIndex];
      const clonedServices = dayToClone.services?.map(s => ({
          ...s,
          id: `svc_clone_${Date.now()}_${Math.random()}` 
      })) || [];

      const newDay: ItineraryItem = {
          ...dayToClone,
          day: itinerary.length + 1,
          title: dayToClone.title + ' (Copy)',
          services: clonedServices
      };

      setItinerary([...itinerary, newDay]);
      setActiveDayIndex(itinerary.length);
  };

  const handleDeleteDay = (index: number, e: React.MouseEvent) => {
      e.stopPropagation();
      if (itinerary.length <= 1) {
          alert("Itinerary must have at least one day.");
          return;
      }
      if (!confirm("Delete this day and all its services?")) return;

      const updated = itinerary.filter((_, i) => i !== index);
      // Reindex days
      updated.forEach((day, i) => { day.day = i + 1; });
      
      setItinerary(updated);
      setActiveDayIndex(Math.max(0, index - 1));
  };

  // --- DRAG AND DROP LOGIC (HTML5) ---
  const handleDragStart = (e: React.DragEvent, index: number) => {
      setDraggedDayIndex(index);
      // Effect for drag image (optional, standard browser one is usually fine)
      e.dataTransfer.effectAllowed = 'move';
      // Use setTimeOut to prevent the element from disappearing immediately in some browsers
      setTimeout(() => {
         const el = e.target as HTMLElement;
         el.classList.add('opacity-50'); 
      }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
      setDraggedDayIndex(null);
      const el = e.target as HTMLElement;
      el.classList.remove('opacity-50');
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
      e.preventDefault(); // Necessary to allow dropping
      if (draggedDayIndex === null || draggedDayIndex === index) return;
      
      // Perform the swap in real-time for visual feedback
      const updated = [...itinerary];
      const draggedItem = updated[draggedDayIndex];
      updated.splice(draggedDayIndex, 1);
      updated.splice(index, 0, draggedItem);

      // Fix day numbers immediately for UI consistency
      updated.forEach((day, i) => { day.day = i + 1; });

      setItinerary(updated);
      setDraggedDayIndex(index); 
      // Keep active index following the dragged item if it was active
      if (activeDayIndex === draggedDayIndex) setActiveDayIndex(index);
      else if (activeDayIndex === index) setActiveDayIndex(draggedDayIndex);
  };

  const handleOpenAdd = (type: 'HOTEL' | 'ACTIVITY' | 'TRANSFER') => {
      setModalType(type);
      setIsModalOpen(true);
  };

  const activeDay = itinerary[activeDayIndex];
  const activeCityId = activeDay?.cityId || '';
  const perPersonPrice = pax > 0 ? Math.round(financials.selling / pax) : 0;

  // Logic: Calculate consecutive days in current city.
  // If sequence ends because itinerary ends -> likely a checkout/departure, subtract 1.
  // If sequence ends because city changes -> likely just a move, use full count.
  const calculateSuggestedNights = () => {
    if (!activeDay || !activeDay.cityId) return 1;
    
    let count = 1;
    let reachedEnd = true;

    for (let i = activeDayIndex + 1; i < itinerary.length; i++) {
        if (itinerary[i].cityId === activeDay.cityId) {
            count++;
        } else {
            reachedEnd = false; // Stopped because of city change, not end of trip
            break;
        }
    }
    
    // If we reached the absolute end of the itinerary, subtract 1 (Departure day)
    // e.g. 4 Days Dubai -> 3 Nights Hotel.
    if (reachedEnd && count > 1) {
        return count - 1;
    }
    
    return count;
  };

  const suggestedNights = calculateSuggestedNights();

  return (
    <div className="flex flex-col h-[calc(100vh-40px)] bg-slate-50 rounded-xl overflow-hidden border border-slate-200 shadow-2xl fixed inset-0 z-50 m-4 md:m-5">
        
        {/* TOP BAR */}
        <div className="bg-white border-b border-slate-200 p-4 flex justify-between items-center shadow-sm z-10">
            <div className="flex items-center gap-3">
                <div className="bg-brand-600 text-white p-2 rounded-lg">
                    <Calendar size={20} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Itinerary Builder</h2>
                    <p className="text-sm text-slate-500 font-medium">{destination} • {pax} Pax</p>
                </div>
            </div>
            
            <div className="flex items-center gap-6">
                
                {/* Pricing Controls */}
                <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 hidden md:flex">
                    <div className="flex items-center gap-2 border-r border-slate-200 pr-3">
                        <span className="text-xs font-bold text-slate-500 uppercase">Markup</span>
                        <button onClick={() => setEnableMarkup(!enableMarkup)} className="text-brand-600 focus:outline-none">
                            {enableMarkup ? <ToggleRight size={24} /> : <ToggleLeft size={24} className="text-slate-400" />}
                        </button>
                    </div>
                    <div className="flex items-center gap-1">
                        <input 
                            type="number" 
                            min="0" 
                            max="100" 
                            value={markupPercent}
                            onChange={(e) => setMarkupPercent(Number(e.target.value))}
                            disabled={!enableMarkup}
                            className="w-12 text-center text-sm font-bold bg-white border border-slate-300 rounded focus:ring-1 focus:ring-brand-500 disabled:opacity-50 disabled:bg-slate-100 outline-none"
                        />
                        <span className="text-xs font-bold text-slate-500">%</span>
                    </div>
                </div>

                <div className="text-right hidden sm:block">
                    <div className="flex items-center justify-end gap-2 text-xs font-bold text-slate-400 uppercase">
                        <span>Total Selling</span>
                    </div>
                    <p className="text-xl font-bold text-slate-900">{financials.currency} {financials.selling.toLocaleString()}</p>
                </div>
                
                {/* Per Person Display */}
                <div className="text-right hidden lg:block border-l border-slate-200 pl-4">
                    <p className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1 justify-end">
                       <User size={10} /> Per Person
                    </p>
                    <p className="text-lg font-bold text-brand-700">{financials.currency} {perPersonPrice.toLocaleString()}</p>
                </div>
                
                <div className="flex gap-2 ml-2">
                    <button onClick={onCancel} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition">Cancel</button>
                    <button 
                        onClick={() => onSave(itinerary, financials)} 
                        className="px-6 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg font-bold flex items-center gap-2 shadow-lg transition transform hover:-translate-y-0.5"
                    >
                        <Save size={18} /> Save Quote
                    </button>
                </div>
            </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
            {/* SIDEBAR: DAYS LIST (DRAGGABLE) */}
            <div className="w-72 bg-white border-r border-slate-200 flex flex-col">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Itinerary Days</span>
                    <button 
                        onClick={handleAddDay} 
                        className="text-xs bg-white border border-slate-300 px-2 py-1 rounded text-slate-600 hover:text-brand-600 hover:border-brand-300 font-bold flex items-center gap-1"
                    >
                        <Plus size={12}/> Add Day
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {itinerary.map((day, idx) => (
                        <div 
                            key={idx} // Using index as key is acceptable for reorderable lists if items are transient
                            draggable
                            onDragStart={(e) => handleDragStart(e, idx)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => handleDragOver(e, idx)}
                            onClick={() => setActiveDayIndex(idx)}
                            className={`p-4 border-b border-slate-100 cursor-pointer transition-colors relative group ${
                                activeDayIndex === idx ? 'bg-blue-50 border-l-4 border-l-brand-600' : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                            } ${draggedDayIndex === idx ? 'opacity-50 bg-slate-100' : ''}`}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <div className="flex items-center gap-2">
                                    <GripVertical size={14} className="text-slate-300 cursor-grab active:cursor-grabbing" />
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${activeDayIndex === idx ? 'bg-brand-200 text-brand-800' : 'bg-slate-100 text-slate-500'}`}>
                                        Day {day.day}
                                    </span>
                                </div>
                                
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => handleCloneDay(idx, e)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-white rounded" title="Duplicate"><Copy size={12}/></button>
                                    <button onClick={(e) => handleDeleteDay(idx, e)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-white rounded" title="Delete"><Trash2 size={12}/></button>
                                </div>
                            </div>
                            
                            <h4 className={`font-bold text-sm truncate pl-5 ${activeDayIndex === idx ? 'text-brand-900' : 'text-slate-700'}`}>{day.title}</h4>
                            <div className="flex justify-between items-end mt-2 pl-5">
                                <p className="text-[10px] text-slate-400">{day.services?.length || 0} Services</p>
                                {day.cityId && <MapPin size={12} className="text-slate-300"/>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* MAIN CONTENT: DAY EDITOR */}
            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
                {activeDay ? (
                    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-right-2 duration-300">
                        
                        {/* Day Header Config */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Day Title</label>
                                    <input 
                                        type="text" 
                                        className="w-full text-lg font-bold border-b-2 border-slate-200 focus:border-brand-500 outline-none bg-transparent py-2 transition-colors"
                                        value={activeDay.title}
                                        onChange={(e) => {
                                            const updated = [...itinerary];
                                            updated[activeDayIndex].title = e.target.value;
                                            setItinerary(updated);
                                        }}
                                        placeholder="e.g. Arrival in Dubai"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">City Context</label>
                                    {activeDay.cityId ? (
                                       <div className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                           <MapPin size={16} className="text-brand-500" />
                                           <strong>{adminService.getDestinationsSync().find(d => d.id === activeDay.cityId)?.city || 'Unknown City'}</strong>
                                           <span className="text-xs text-slate-400 ml-auto">Inventory Filter</span>
                                       </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-sm text-slate-400 italic bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                            No specific city filter applied.
                                        </div>
                                    )}
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description / Notes</label>
                                    <textarea 
                                        className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none transition-shadow focus:shadow-sm"
                                        rows={2}
                                        value={activeDay.description}
                                        onChange={(e) => {
                                            const updated = [...itinerary];
                                            updated[activeDayIndex].description = e.target.value;
                                            setItinerary(updated);
                                        }}
                                        placeholder="Enter day description for the client..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Services List */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-2 px-1">
                                <h4 className="font-bold text-slate-700 text-lg">Included Services</h4>
                                <div className="flex gap-2">
                                    <button onClick={() => handleOpenAdd('HOTEL')} className="text-xs bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 flex gap-1.5 items-center font-bold shadow-sm shadow-indigo-200 transition"><Plus size={14}/> Hotel</button>
                                    <button onClick={() => handleOpenAdd('ACTIVITY')} className="text-xs bg-pink-600 text-white px-3 py-2 rounded-lg hover:bg-pink-700 flex gap-1.5 items-center font-bold shadow-sm shadow-pink-200 transition"><Plus size={14}/> Activity</button>
                                    <button onClick={() => handleOpenAdd('TRANSFER')} className="text-xs bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 flex gap-1.5 items-center font-bold shadow-sm shadow-blue-200 transition"><Plus size={14}/> Transfer</button>
                                </div>
                            </div>

                            {activeDay.services && activeDay.services.length > 0 ? (
                                <div className="space-y-3">
                                    {activeDay.services.map((svc, idx) => (
                                        <div key={svc.id} className="bg-white border border-slate-200 rounded-xl p-4 flex gap-4 items-start shadow-sm hover:shadow-md hover:border-brand-200 transition group relative">
                                            {/* Icon Box */}
                                            <div className={`p-3 rounded-xl shrink-0 ${
                                                svc.type === 'HOTEL' ? 'bg-indigo-50 text-indigo-600' :
                                                svc.type === 'ACTIVITY' ? 'bg-pink-50 text-pink-600' :
                                                'bg-blue-50 text-blue-600'
                                            }`}>
                                                {svc.type === 'HOTEL' && <Hotel size={20}/>}
                                                {svc.type === 'ACTIVITY' && <Camera size={20}/>}
                                                {svc.type === 'TRANSFER' && <Car size={20}/>}
                                            </div>

                                            {/* Details */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                                        svc.type === 'HOTEL' ? 'bg-indigo-100 text-indigo-700' :
                                                        svc.type === 'ACTIVITY' ? 'bg-pink-100 text-pink-700' :
                                                        'bg-blue-100 text-blue-700'
                                                    }`}>{svc.type}</span>
                                                    {svc.type === 'HOTEL' && svc.meta?.roomType && (
                                                        <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{svc.meta.roomType}</span>
                                                    )}
                                                </div>
                                                <div className="flex gap-3">
                                                    {svc.meta?.imageUrl && (
                                                        <img src={svc.meta.imageUrl} alt={svc.name} className="w-12 h-12 object-cover rounded-lg bg-slate-100" />
                                                    )}
                                                    <div>
                                                        <p className="font-bold text-slate-800 text-sm truncate">{svc.name}</p>
                                                        
                                                        {/* Hotel Details */}
                                                        {svc.type === 'HOTEL' && (
                                                            <p className="text-xs text-slate-500 mt-0.5">
                                                                {svc.duration_nights} Nights • {svc.quantity} Rooms
                                                            </p>
                                                        )}

                                                        {/* Activity Details (Enhanced) */}
                                                        {svc.type === 'ACTIVITY' && (
                                                            <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-1 items-center">
                                                                {svc.meta?.paxDetails && (
                                                                    <span title="Passengers">
                                                                        Adults: {svc.meta.paxDetails.adult}
                                                                        {svc.meta.paxDetails.child > 0 && `, Kids: ${svc.meta.paxDetails.child}`}
                                                                    </span>
                                                                )}
                                                                {svc.meta?.transferMode && (
                                                                    <span className={`px-1.5 py-0.5 rounded border ${
                                                                        svc.meta.transferMode === 'PVT' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                                        svc.meta.transferMode === 'SIC' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                                        'bg-slate-100 text-slate-600 border-slate-200'
                                                                    }`}>
                                                                        {svc.meta.transferMode === 'PVT' ? 'Private Transfer' : 
                                                                         svc.meta.transferMode === 'SIC' ? 'Shared Transfer' : 'Ticket Only'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                        
                                                        {/* Transfer Details */}
                                                        {svc.type === 'TRANSFER' && svc.meta?.vehicle && (
                                                            <p className="text-xs text-slate-500 mt-0.5">
                                                                Vehicle: {svc.meta.vehicle}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Pricing & Actions */}
                                            <div className="flex items-center gap-6 pt-2">
                                                <div className="text-right">
                                                    <p className="font-mono font-bold text-slate-700 text-sm">
                                                        {svc.currency || 'INR'} {svc.cost.toLocaleString()}
                                                    </p>
                                                </div>
                                                
                                                <div className="flex flex-col gap-1 border-l border-slate-100 pl-3">
                                                    <div className="flex gap-1">
                                                        <button 
                                                            onClick={() => handleMoveService(activeDayIndex, svc.id, 'UP')}
                                                            disabled={idx === 0}
                                                            className="p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded disabled:opacity-20 transition"
                                                            title="Move Up"
                                                        >
                                                            <ArrowUp size={14} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleMoveService(activeDayIndex, svc.id, 'DOWN')}
                                                            disabled={idx === (activeDay.services?.length || 0) - 1}
                                                            className="p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded disabled:opacity-20 transition"
                                                            title="Move Down"
                                                        >
                                                            <ArrowDown size={14} />
                                                        </button>
                                                    </div>
                                                    <button onClick={() => handleRemoveService(activeDayIndex, svc.id)} className="text-slate-400 hover:text-red-500 p-1 hover:bg-red-50 rounded transition flex items-center justify-center" title="Remove">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/50">
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-200">
                                        <Plus size={24} className="text-slate-300" />
                                    </div>
                                    <p className="text-slate-500 font-medium">No services added for this day.</p>
                                    <p className="text-xs text-slate-400 mt-1">Click the buttons above to build the itinerary.</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <Calendar size={48} className="mb-4 opacity-20" />
                        <p>Select a day from the sidebar to edit.</p>
                    </div>
                )}
            </div>
        </div>

        {isModalOpen && (
            <InventoryModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)}
                type={modalType}
                dayId={activeDayIndex.toString()}
                destinationId={activeCityId} 
                onSelect={handleAddService}
                currentServices={activeDay?.services || []} 
                defaultNights={modalType === 'HOTEL' ? suggestedNights : 1}
                paxCount={pax}
            />
        )}
    </div>
  );
};
