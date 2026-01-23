
import React, { useState, useEffect, useRef } from 'react';
import { ItineraryItem, Hotel, Activity, Transfer, ItineraryService, Destination } from '../types';
import { adminService } from '../services/adminService';
import { currencyService } from '../services/currencyService';
import { apiClient } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, Trash2, Save, Hotel as HotelIcon, Camera, Car, X, 
  Search, GripVertical, MapPin, 
  Loader2, Calendar, FileText, Moon, Percent,
  ChevronDown, ChevronUp, Image as ImageIcon, Star, Clock, Users, Briefcase, Check
} from 'lucide-react';

interface Props {
  initialItinerary: ItineraryItem[];
  destination: string;
  pax: number;
  onSave: (items: ItineraryItem[], financials?: { net: number, selling: number, currency: string }) => void;
  onCancel: () => void;
}

export const ItineraryBuilder: React.FC<Props> = ({ initialItinerary, destination, pax, onSave, onCancel }) => {
  const { user } = useAuth();
  
  // -- STATE --
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [groupedDestinations, setGroupedDestinations] = useState<Record<string, Destination[]>>({});
  
  // Pricing
  const [totalNetPayable, setTotalNetPayable] = useState<number>(0); 
  const [totalSellingPrice, setTotalSellingPrice] = useState<number>(0);
  const [agentMarkupPercent, setAgentMarkupPercent] = useState<number>(15); // Default 15%

  const [isCalculating, setIsCalculating] = useState(false);
  const calculationTimeout = useRef<any>(null);
  const [displayCurrency, setDisplayCurrency] = useState('INR'); 
  
  // Inventory Data
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  
  // UI Controls
  const [activeServiceDay, setActiveServiceDay] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'HOTEL' | 'ACTIVITY' | 'TRANSFER' | 'MANUAL'>('HOTEL');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDays, setExpandedDays] = useState<number[]>([]); // Track open/closed days
  const [justAdded, setJustAdded] = useState<string | null>(null); // Feedback state
  
  // Custom/Manual Service Form
  const [customService, setCustomService] = useState({ 
    name: '', 
    cost: 0, 
    type: 'HOTEL', 
    notes: '',
    roomType: '',
    mealPlan: 'BB'
  });
  
  // Drag & Drop State
  const [draggedDayIdx, setDraggedDayIdx] = useState<number | null>(null);
  const [draggedService, setDraggedService] = useState<{ dayIdx: number, svcIdx: number } | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{ type: 'DAY' | 'SERVICE', dayIdx: number, svcIdx?: number } | null>(null);

  // -- INITIALIZATION --
  useEffect(() => {
    const dests = adminService.getDestinations().filter(d => d.isActive);
    
    // Group By Country for Better UI
    const grouped: Record<string, Destination[]> = {};
    dests.forEach(d => {
        if (!grouped[d.country]) grouped[d.country] = [];
        grouped[d.country].push(d);
    });
    setGroupedDestinations(grouped);

    if (!initialItinerary || initialItinerary.length === 0) {
      setItems([{ day: 1, title: 'Arrival', description: '', inclusions: [], services: [], cityId: '' }]);
      setExpandedDays([1]);
    } else {
      setItems(initialItinerary.map(i => ({...i, services: i.services || []})));
      setExpandedDays(initialItinerary.map(i => i.day)); // Expand all by default
    }

    loadAdminInventory();
  }, [initialItinerary, destination]);

  const loadAdminInventory = () => {
    setHotels(adminService.getHotels().filter(h => h.isActive));
    setActivities(adminService.getActivities().filter(a => a.isActive));
    setTransfers(adminService.getTransfers().filter(t => t.isActive));
  };

  // -- PRICING ENGINE --
  useEffect(() => {
    if (calculationTimeout.current) clearTimeout(calculationTimeout.current);
    
    if (items.length === 0) {
        setTotalSellingPrice(0);
        return;
    }

    const calculatePrice = async () => {
        setIsCalculating(true);
        try {
            const payload = {
                pax: pax || 1,
                currency: displayCurrency, 
                markup: agentMarkupPercent, // Pass dynamic markup
                days: items.map(day => ({
                    day_number: day.day,
                    services: day.services?.map(s => ({
                        inventory_id: s.inventory_id || s.id, 
                        type: s.type === 'OTHER' ? 'CUSTOM' : s.type, 
                        quantity: s.quantity || 1,
                        nights: s.duration_nights || 1,
                        name: s.name,
                        cost: Number(s.cost || 0), 
                        currency: s.currency
                    }))
                }))
            };

            const response: any = await apiClient.request('/builder/calculate', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (response && typeof response.selling_price !== 'undefined') {
                setTotalNetPayable(Number(response.net_cost) || 0); 
                setTotalSellingPrice(Number(response.selling_price) || 0); 
                
                if (response.currency) setDisplayCurrency(response.currency);
            }
        } catch (error) {
            console.error("Calc Failed", error);
        } finally {
            setIsCalculating(false);
        }
    };

    calculationTimeout.current = setTimeout(calculatePrice, 600);
    return () => clearTimeout(calculationTimeout.current);
  }, [items, pax, agentMarkupPercent]); 

  // -- HELPER: ROUTE --
  const calculateCityDuration = (startIndex: number, cityId: string): number => {
      let duration = 0;
      for (let i = startIndex; i < items.length; i++) {
          if (items[i].cityId === cityId) {
              duration++;
          } else {
              break;
          }
      }
      return duration > 0 ? duration : 1;
  };

  // -- DRAG AND DROP HANDLERS (DAYS) --
  const onDragStartDay = (e: React.DragEvent, index: number) => {
      e.stopPropagation();
      setDraggedDayIdx(index);
      const img = new Image();
      img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      e.dataTransfer.setDragImage(img, 0, 0);
      e.dataTransfer.effectAllowed = "move";
  };

  const onDragOverDay = (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.stopPropagation();
      if (draggedDayIdx !== null && draggedDayIdx !== index) {
          setDragOverTarget({ type: 'DAY', dayIdx: index });
      }
  };

  const onDropDay = (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOverTarget(null);

      if (draggedDayIdx === null || draggedDayIdx === dropIndex) return;

      const newItems = [...items];
      const [draggedItem] = newItems.splice(draggedDayIdx, 1);
      newItems.splice(dropIndex, 0, draggedItem);
      
      const reindexed = newItems.map((item, i) => ({ ...item, day: i + 1 }));
      setItems(reindexed);
      setDraggedDayIdx(null);
  };

  // -- DRAG AND DROP HANDLERS (SERVICES) --
  const onDragStartService = (e: React.DragEvent, dayIdx: number, svcIdx: number) => {
      e.stopPropagation();
      setDraggedService({ dayIdx, svcIdx });
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", JSON.stringify({ dayIdx, svcIdx }));
  };

  const onDragOverService = (e: React.DragEvent, dayIdx: number, svcIdx: number) => {
      e.preventDefault();
      e.stopPropagation();
      if (draggedService) {
        setDragOverTarget({ type: 'SERVICE', dayIdx, svcIdx });
      }
  };

  const onDropService = (e: React.DragEvent, targetDayIdx: number, targetSvcIdx: number) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOverTarget(null);

      if (!draggedService) return;

      const { dayIdx: srcDayIdx, svcIdx: srcSvcIdx } = draggedService;
      
      const newItems = [...items];
      const srcServices = [...(newItems[srcDayIdx].services || [])];
      const [movedService] = srcServices.splice(srcSvcIdx, 1);
      newItems[srcDayIdx].services = srcServices;

      let targetServices = srcDayIdx === targetDayIdx ? srcServices : [...(newItems[targetDayIdx].services || [])];
      
      if (targetSvcIdx === -1) {
          targetServices.push(movedService);
      } else {
          targetServices.splice(targetSvcIdx, 0, movedService);
      }
      
      newItems[targetDayIdx].services = targetServices;
      setItems(newItems);
      setDraggedService(null);
  };

  // -- SERVICE MANAGEMENT --
  const addServiceToDay = (dayIndex: number, service: ItineraryService) => {
      const newItems = [...items];
      const currentServices = newItems[dayIndex].services || [];
      newItems[dayIndex].services = [...currentServices, service];
      setItems(newItems);
      
      // Visual Feedback
      setJustAdded(service.inventory_id || service.id);
      setTimeout(() => setJustAdded(null), 1500);
  };

  const removeService = (dayIndex: number, serviceIndex: number) => {
      const newItems = [...items];
      newItems[dayIndex].services?.splice(serviceIndex, 1);
      setItems(newItems);
  };

  const addSystemItem = (index: number, item: any, type: 'HOTEL' | 'ACTIVITY' | 'TRANSFER') => {
      let meta: any = {
          description: item.description || item.notes || '',
          imageUrl: item.imageUrl || ''
      };
      let name = '';
      let cost = 0;
      let duration = 1;
      let quantity = 1;

      const currentCityId = items[index].cityId;

      if (type === 'HOTEL') {
          name = item.name;
          cost = item.cost;
          meta = { ...meta, roomType: item.roomType, mealPlan: item.mealPlan, category: item.category };
          if (item.costType === 'Per Room') quantity = Math.ceil(pax / 2);
          else quantity = pax;
          
          if (currentCityId) duration = calculateCityDuration(index, currentCityId);
      } else if (type === 'ACTIVITY') {
          name = item.activityName;
          cost = item.costAdult;
          quantity = pax; 
          meta = { ...meta, type: item.activityType, duration: item.duration, startTime: item.startTime };
      } else {
          name = item.transferName;
          cost = item.cost;
          quantity = 1;
          if (item.costBasis === 'Per Person') quantity = pax;
          if (item.costBasis === 'Per Vehicle' && item.maxPassengers) quantity = Math.ceil(pax / item.maxPassengers);
          meta = { ...meta, vehicle: item.vehicleType, transferType: item.transferType };
      }

      addServiceToDay(index, {
          id: item.id, 
          inventory_id: item.id,
          type: type, 
          name: name, 
          cost: cost, 
          price: cost,
          currency: item.currency || 'INR',
          meta: meta,
          duration_nights: duration, 
          quantity: quantity,
          isOperatorInventory: false 
      });
      
      // UX Logic: Close panel for hotels (usually 1 per day), keep open for activities/transfers
      if (type === 'HOTEL') {
          setActiveServiceDay(null);
      }
  };

  const addManualItem = (index: number) => {
      if(!customService.name) return;
      const type = customService.type as any;
      let duration = 1;
      let quantity = 1;
      
      let meta: any = { notes: customService.notes };
      if (type === 'HOTEL') {
          meta.roomType = customService.roomType || 'Standard';
          meta.mealPlan = customService.mealPlan || 'BB';
          const currentCityId = items[index].cityId;
          if (currentCityId) duration = calculateCityDuration(index, currentCityId);
      } else if (type === 'ACTIVITY') {
          quantity = pax;
      }

      addServiceToDay(index, {
          id: `manual_${Date.now()}`, 
          type: type, 
          name: customService.name, 
          cost: Number(customService.cost), 
          price: Number(customService.cost),
          currency: displayCurrency,
          meta: meta,
          duration_nights: duration,
          quantity: quantity
      });
      setCustomService({ name: '', cost: 0, type: 'HOTEL', notes: '', roomType: '', mealPlan: 'BB' });
      // Keep open for manual entry to allow rapid addition
      // setActiveServiceDay(null); 
  };

  const getFilteredInventory = (dayIndex: number) => {
      const cityId = items[dayIndex]?.cityId;
      if (!cityId) return { hotels: [], activities: [], transfers: [] };
      return {
          hotels: hotels.filter(h => h.destinationId === cityId && h.name.toLowerCase().includes(searchTerm.toLowerCase())),
          activities: activities.filter(a => a.destinationId === cityId && a.activityName.toLowerCase().includes(searchTerm.toLowerCase())),
          transfers: transfers.filter(t => t.destinationId === cityId && t.transferName.toLowerCase().includes(searchTerm.toLowerCase()))
      };
  };

  const handleSaveClick = () => {
     onSave(items, { net: totalNetPayable, selling: totalSellingPrice, currency: displayCurrency });
  };

  const toggleDay = (day: number) => {
      if (expandedDays.includes(day)) {
          setExpandedDays(expandedDays.filter(d => d !== day));
      } else {
          setExpandedDays([...expandedDays, day]);
      }
  };

  return (
    <div className="flex flex-col gap-6 select-none pb-20">
      
      {/* 1. STICKY HEADER */}
      <div className="sticky top-16 z-30 bg-white border border-slate-200 rounded-xl shadow-lg p-3 md:p-4 flex flex-col md:flex-row justify-between items-center gap-4 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="p-2 bg-brand-50 rounded-lg text-brand-600">
                <Calendar size={20} />
              </div>
              <div>
                  <h2 className="text-sm md:text-lg font-bold text-slate-900">Itinerary Builder</h2>
                  <div className="text-xs text-slate-500">{items.length} Days &bull; {pax} Pax</div>
              </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
              <div className="flex items-center justify-between w-full md:w-auto bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase mr-2">Markup</span>
                  <div className="flex items-center gap-2">
                      <input 
                          type="range" min="0" max="50" value={agentMarkupPercent} 
                          onChange={(e) => setAgentMarkupPercent(Number(e.target.value))}
                          className="w-20 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="font-bold text-brand-600 text-sm w-8 text-right">{agentMarkupPercent}%</span>
                  </div>
              </div>

              <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                  <div className="text-right hidden md:block">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Net Cost</p>
                      <p className="text-sm font-mono text-slate-600">{currencyService.getSymbol(displayCurrency)} {totalNetPayable.toLocaleString()}</p>
                  </div>
                  <div className="text-right bg-brand-50 px-3 py-1.5 rounded-lg border border-brand-100">
                      <p className="text-[10px] text-brand-600 font-bold uppercase">Client Price</p>
                      <div className="flex items-center gap-2 justify-end">
                          {isCalculating && <Loader2 size={12} className="animate-spin text-brand-600" />}
                          <span className="text-xl font-mono font-bold text-slate-900">
                              {currencyService.getSymbol(displayCurrency)} {totalSellingPrice.toLocaleString()}
                          </span>
                      </div>
                  </div>
              </div>
              
              <div className="flex gap-2 w-full md:w-auto">
                  <button onClick={onCancel} className="px-3 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition text-sm">
                      Cancel
                  </button>
                  <button onClick={handleSaveClick} className="flex-1 md:flex-none px-5 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 shadow-md flex items-center justify-center gap-2 transition transform hover:-translate-y-0.5 text-sm">
                      <Save size={16} /> Save
                  </button>
              </div>
          </div>
      </div>

      {/* 2. ITINERARY DAYS */}
      <div className="space-y-4">
          {items.map((item, index) => {
              const { hotels: dayHotels, activities: dayActivities, transfers: dayTransfers } = getFilteredInventory(index);
              const hasCity = !!item.cityId;
              const isExpanded = expandedDays.includes(item.day);

              return (
              <div 
                key={item.day}
                className={`bg-white border rounded-xl shadow-sm transition-all duration-200 group/day ${
                    draggedDayIdx === index ? 'opacity-40 border-dashed border-slate-400 scale-[0.98]' : 'border-slate-200'
                } ${dragOverTarget?.type === 'DAY' && dragOverTarget.dayIdx === index ? 'ring-2 ring-brand-500 shadow-lg scale-[1.01]' : ''}`}
                draggable
                onDragStart={(e) => onDragStartDay(e, index)}
                onDragOver={(e) => onDragOverDay(e, index)}
                onDrop={(e) => onDropDay(e, index)}
              >
                  {/* Day Header */}
                  <div 
                    className="p-4 flex items-center gap-3 cursor-pointer hover:bg-slate-50 border-b border-slate-100 rounded-t-xl select-none"
                    onClick={() => toggleDay(item.day)}
                  >
                      <div 
                        className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-brand-600 p-1"
                        onMouseDown={(e) => e.stopPropagation()} 
                      >
                          <GripVertical size={20} />
                      </div>
                      
                      <div className="flex-1 flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                          <div className="flex items-center gap-3">
                              <span className="bg-slate-800 text-white font-bold px-3 py-1 rounded-lg text-sm border border-slate-700 whitespace-nowrap shadow-sm">
                                  Day {item.day}
                              </span>
                              <input 
                                  type="text" 
                                  value={item.title}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => {
                                      const newItems = [...items];
                                      newItems[index].title = e.target.value;
                                      setItems(newItems);
                                  }}
                                  className="font-bold text-slate-800 bg-transparent border-b border-transparent focus:border-brand-500 outline-none w-full md:w-64 focus:bg-white px-2 py-0.5 transition text-sm md:text-base"
                                  placeholder="Day Title"
                              />
                          </div>
                          
                          <div className="relative w-full md:w-48" onClick={(e) => e.stopPropagation()}>
                              <MapPin size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                              <select 
                                  value={item.cityId || ''}
                                  onChange={(e) => {
                                      const newItems = [...items];
                                      newItems[index].cityId = e.target.value;
                                      setSearchTerm('');
                                      setItems(newItems);
                                  }}
                                  className={`w-full pl-8 pr-2 py-1.5 text-xs border rounded-lg outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer ${!item.cityId ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-300 bg-white'}`}
                              >
                                  <option value="">Select Location</option>
                                  {Object.keys(groupedDestinations).map(country => (
                                      <optgroup key={country} label={country}>
                                          {groupedDestinations[country].map(d => (
                                              <option key={d.id} value={d.id}>{d.city}</option>
                                          ))}
                                      </optgroup>
                                  ))}
                              </select>
                          </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                            onClick={(e) => { e.stopPropagation(); const newItems = items.filter((_, i) => i !== index).map((it, i) => ({...it, day: i + 1})); setItems(newItems); }}
                            className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded transition"
                        >
                            <Trash2 size={16} />
                        </button>
                        {isExpanded ? <ChevronUp size={18} className="text-slate-400"/> : <ChevronDown size={18} className="text-slate-400"/>}
                      </div>
                  </div>

                  {/* Day Content */}
                  {isExpanded && (
                      <div className="p-4 bg-slate-50/30">
                          
                          {/* Drop Zone: Top */}
                          <div className="space-y-2 mb-4 relative min-h-[60px]"
                             onDragOver={(e) => onDragOverService(e, index, -1)}
                             onDrop={(e) => onDropService(e, index, -1)}
                          >
                              {item.services?.length === 0 && (
                                  <div 
                                    className={`flex items-center justify-center border-2 border-dashed rounded-lg text-slate-400 text-xs p-6 transition-colors ${
                                        dragOverTarget?.type === 'SERVICE' && dragOverTarget.dayIdx === index ? 'border-brand-500 bg-brand-50' : 'border-slate-200'
                                    }`}
                                  >
                                      Drag services here or add new below
                                  </div>
                              )}

                              {item.services?.map((svc, sIdx) => {
                                  const isDragging = draggedService?.dayIdx === index && draggedService?.svcIdx === sIdx;
                                  const isDragOver = dragOverTarget?.type === 'SERVICE' && dragOverTarget.dayIdx === index && dragOverTarget.svcIdx === sIdx;

                                  return (
                                  <div 
                                    key={sIdx} 
                                    draggable
                                    onDragStart={(e) => onDragStartService(e, index, sIdx)}
                                    onDragOver={(e) => onDragOverService(e, index, sIdx)}
                                    onDrop={(e) => onDropService(e, index, sIdx)}
                                    className={`relative flex items-center justify-between p-3 border rounded-xl bg-white shadow-sm transition-all group/svc ${
                                        isDragging ? 'opacity-40 scale-95 border-dashed border-slate-400' : 'hover:border-brand-300 hover:shadow-md'
                                    } ${isDragOver ? 'border-brand-500 ring-2 ring-brand-500 ring-opacity-50' : 'border-slate-100'}`}
                                  >
                                      {/* Visual Drop Line */}
                                      {isDragOver && (
                                          <div className="absolute -top-1 left-0 right-0 h-1 bg-brand-500 rounded-full z-20 pointer-events-none shadow-sm"></div>
                                      )}

                                      {/* Connector Line Logic */}
                                      {sIdx < (item.services?.length || 0) - 1 && !isDragging && (
                                          <div className="absolute left-6 top-10 bottom-[-18px] w-0.5 bg-slate-200 z-0"></div>
                                      )}

                                      <div className="flex items-center gap-3 z-10 w-full">
                                          <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-brand-600 p-1">
                                              <GripVertical size={16} />
                                          </div>
                                          
                                          {/* Rich Service Thumbnail */}
                                          <div className="h-12 w-12 rounded-lg bg-slate-100 shrink-0 border border-slate-200 overflow-hidden flex items-center justify-center">
                                              {svc.meta?.imageUrl ? (
                                                  <img src={svc.meta.imageUrl} alt={svc.name} className="w-full h-full object-cover" />
                                              ) : (
                                                <div className={`p-2 ${
                                                    svc.type === 'HOTEL' ? 'text-indigo-500' : 
                                                    svc.type === 'ACTIVITY' ? 'text-pink-500' : 
                                                    svc.type === 'TRANSFER' ? 'text-blue-500' : 'text-slate-500'
                                                }`}>
                                                    {svc.type === 'HOTEL' && <HotelIcon size={20} />}
                                                    {svc.type === 'ACTIVITY' && <Camera size={20} />}
                                                    {svc.type === 'TRANSFER' && <Car size={20} />}
                                                    {svc.type === 'OTHER' && <FileText size={20} />}
                                                </div>
                                              )}
                                          </div>
                                          
                                          <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2">
                                                  <p className="text-sm font-bold text-slate-800 truncate">{svc.name}</p>
                                                  {svc.type === 'HOTEL' && svc.duration_nights && (
                                                      <span className="flex items-center gap-1 text-indigo-600 text-[10px] font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                                          <Moon size={8} /> {svc.duration_nights}N
                                                      </span>
                                                  )}
                                                  {svc.quantity && svc.quantity > 1 && (
                                                      <span className="text-[10px] font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200">
                                                          x{svc.quantity}
                                                      </span>
                                                  )}
                                              </div>
                                              
                                              {/* Description Snippet */}
                                              {svc.meta?.description && (
                                                  <p className="text-xs text-slate-500 truncate mt-0.5 max-w-md">{svc.meta.description}</p>
                                              )}

                                              {/* Meta Pills */}
                                              <div className="flex flex-wrap gap-1 mt-1.5">
                                                  {svc.meta?.roomType && <span className="text-[9px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 text-slate-500">{svc.meta.roomType}</span>}
                                                  {svc.meta?.mealPlan && <span className="text-[9px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 text-slate-500">{svc.meta.mealPlan}</span>}
                                                  {svc.meta?.category && <span className="text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100 flex items-center gap-0.5"><Star size={8} fill="currentColor"/> {svc.meta.category}</span>}
                                                  {svc.meta?.vehicle && <span className="text-[9px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 text-slate-500">{svc.meta.vehicle}</span>}
                                                  {svc.meta?.type && svc.type === 'ACTIVITY' && <span className="text-[9px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 text-slate-500">{svc.meta.type}</span>}
                                              </div>
                                          </div>

                                          <div className="text-right shrink-0">
                                              <p className="font-mono text-xs font-bold text-slate-700">
                                                {currencyService.getSymbol(displayCurrency)} {svc.cost.toLocaleString()}
                                              </p>
                                              <button onClick={() => removeService(index, sIdx)} className="text-slate-300 hover:text-red-500 p-1 transition opacity-0 group-hover/svc:opacity-100">
                                                  <X size={14} />
                                              </button>
                                          </div>
                                      </div>
                                  </div>
                                  );
                              })}
                              
                              {/* Bottom Drop Zone for appending */}
                              {item.services?.length > 0 && draggedService && (
                                  <div 
                                      className={`h-4 transition-all rounded-lg flex items-center justify-center border-2 border-dashed ${
                                          dragOverTarget?.type === 'SERVICE' && dragOverTarget.dayIdx === index && dragOverTarget.svcIdx === -1 
                                          ? 'border-brand-500 bg-brand-50 opacity-100' 
                                          : 'border-transparent opacity-0'
                                      }`}
                                      onDragOver={(e) => onDragOverService(e, index, -1)}
                                      onDrop={(e) => onDropService(e, index, -1)}
                                  >
                                      {dragOverTarget?.type === 'SERVICE' && dragOverTarget.dayIdx === index && dragOverTarget.svcIdx === -1 && 
                                        <span className="text-[10px] text-brand-600 font-bold">Drop at end of Day {item.day}</span>
                                      }
                                  </div>
                              )}
                          </div>
                          
                          {/* Quick Add Bar */}
                          <div className="relative mt-4">
                                {activeServiceDay === index && hasCity ? (
                                    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4 animate-in zoom-in-95 origin-top z-20">
                                        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                                            <button onClick={() => setActiveTab('HOTEL')} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-2 border ${activeTab === 'HOTEL' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}><HotelIcon size={14}/> Hotel</button>
                                            <button onClick={() => setActiveTab('ACTIVITY')} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-2 border ${activeTab === 'ACTIVITY' ? 'bg-pink-600 text-white border-pink-600' : 'bg-white text-slate-600 border-slate-200'}`}><Camera size={14}/> Activity</button>
                                            <button onClick={() => setActiveTab('TRANSFER')} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-2 border ${activeTab === 'TRANSFER' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}><Car size={14}/> Transfer</button>
                                            <button onClick={() => setActiveTab('MANUAL')} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-2 border ${activeTab === 'MANUAL' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}><Plus size={14}/> Custom</button>
                                        </div>

                                        {activeTab !== 'MANUAL' ? (
                                            <>
                                                <div className="relative mb-3">
                                                    <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                                                    <input 
                                                        type="text" 
                                                        placeholder={`Search ${activeTab.toLowerCase()}...`}
                                                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                                        value={searchTerm}
                                                        onChange={e => setSearchTerm(e.target.value)}
                                                        autoFocus
                                                    />
                                                </div>
                                                <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                                    {activeTab === 'HOTEL' && dayHotels.map(h => (
                                                        <button 
                                                            key={h.id} 
                                                            onClick={() => addSystemItem(index, h, 'HOTEL')} 
                                                            className={`w-full text-left p-3 hover:bg-indigo-50 rounded-xl flex items-start gap-3 group transition-all border border-transparent hover:border-indigo-100 mb-1 ${justAdded === h.id ? 'bg-green-50 border-green-200' : ''}`}
                                                        >
                                                            <div className="h-12 w-12 bg-slate-100 rounded-lg shrink-0 overflow-hidden border border-slate-100">
                                                                {h.imageUrl ? <img src={h.imageUrl} className="w-full h-full object-cover" alt="" /> : <HotelIcon className="m-3 text-slate-300" size={24} />}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex justify-between items-start">
                                                                    <h4 className="font-bold text-slate-800 text-sm truncate pr-2">{h.name}</h4>
                                                                    <span className="font-mono font-bold text-xs text-indigo-700 whitespace-nowrap">₹{h.cost.toLocaleString()}</span>
                                                                </div>
                                                                
                                                                <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed mt-0.5 mb-1.5">{h.description || 'No description available.'}</p>
                                                                
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex gap-1.5 flex-wrap">
                                                                        <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-100"><Star size={8} fill="currentColor"/> {h.category}</span>
                                                                        <span className="text-[9px] font-medium px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{h.mealPlan}</span>
                                                                    </div>
                                                                    <div className={`transition-opacity text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm ${justAdded === h.id ? 'opacity-100 bg-green-500 text-white border-green-500' : 'opacity-0 group-hover:opacity-100 text-indigo-600 bg-white border-indigo-200'}`}>
                                                                        {justAdded === h.id ? <span className="flex items-center gap-1"><Check size={8}/> Added</span> : '+ Add'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    ))}

                                                    {activeTab === 'ACTIVITY' && dayActivities.map(a => (
                                                        <button 
                                                            key={a.id} 
                                                            onClick={() => addSystemItem(index, a, 'ACTIVITY')} 
                                                            className={`w-full text-left p-3 hover:bg-pink-50 rounded-xl flex items-start gap-3 group transition-all border border-transparent hover:border-pink-100 mb-1 ${justAdded === a.id ? 'bg-green-50 border-green-200' : ''}`}
                                                        >
                                                            <div className="h-12 w-12 bg-slate-100 rounded-lg shrink-0 overflow-hidden border border-slate-100">
                                                                {a.imageUrl ? <img src={a.imageUrl} className="w-full h-full object-cover" alt="" /> : <Camera className="m-3 text-slate-300" size={24} />}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex justify-between items-start">
                                                                    <h4 className="font-bold text-slate-800 text-sm truncate pr-2">{a.activityName}</h4>
                                                                    <span className="font-mono font-bold text-xs text-pink-700 whitespace-nowrap">₹{a.costAdult.toLocaleString()}</span>
                                                                </div>
                                                                
                                                                <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed mt-0.5 mb-1.5">{a.description || 'No description available.'}</p>

                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex gap-1.5 flex-wrap">
                                                                        <span className="text-[9px] font-medium px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{a.activityType}</span>
                                                                        <span className="flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded"><Clock size={8}/> {a.duration}</span>
                                                                    </div>
                                                                    <div className={`transition-opacity text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm ${justAdded === a.id ? 'opacity-100 bg-green-500 text-white border-green-500' : 'opacity-0 group-hover:opacity-100 text-pink-600 bg-white border-pink-200'}`}>
                                                                        {justAdded === a.id ? <span className="flex items-center gap-1"><Check size={8}/> Added</span> : '+ Add'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    ))}

                                                    {activeTab === 'TRANSFER' && dayTransfers.map(t => (
                                                        <button 
                                                            key={t.id} 
                                                            onClick={() => addSystemItem(index, t, 'TRANSFER')} 
                                                            className={`w-full text-left p-3 hover:bg-blue-50 rounded-xl flex items-start gap-3 group transition-all border border-transparent hover:border-blue-100 mb-1 ${justAdded === t.id ? 'bg-green-50 border-green-200' : ''}`}
                                                        >
                                                            <div className="h-12 w-12 bg-slate-100 rounded-lg shrink-0 overflow-hidden border border-slate-100 flex items-center justify-center">
                                                                {t.imageUrl ? <img src={t.imageUrl} className="w-full h-full object-cover" alt="" /> : <Car className="text-slate-300" size={24} />}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex justify-between items-start">
                                                                    <h4 className="font-bold text-slate-800 text-sm truncate pr-2">{t.transferName}</h4>
                                                                    <span className="font-mono font-bold text-xs text-blue-700 whitespace-nowrap">₹{t.cost.toLocaleString()}</span>
                                                                </div>
                                                                
                                                                <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed mt-0.5 mb-1.5">{t.description || 'No description available.'}</p>
                                                                
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex gap-1.5 flex-wrap">
                                                                        <span className="text-[9px] font-medium px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{t.vehicleType}</span>
                                                                        <span className="flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded"><Users size={8}/> {t.maxPassengers}</span>
                                                                        <span className="flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded"><Briefcase size={8}/> {t.luggageCapacity || 2}</span>
                                                                    </div>
                                                                    <div className={`transition-opacity text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm ${justAdded === t.id ? 'opacity-100 bg-green-500 text-white border-green-500' : 'opacity-0 group-hover:opacity-100 text-blue-600 bg-white border-blue-200'}`}>
                                                                        {justAdded === t.id ? <span className="flex items-center gap-1"><Check size={8}/> Added</span> : '+ Add'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    ))}

                                                    {((activeTab === 'HOTEL' && dayHotels.length === 0) || 
                                                      (activeTab === 'ACTIVITY' && dayActivities.length === 0) ||
                                                      (activeTab === 'TRANSFER' && dayTransfers.length === 0)) && (
                                                        <div className="text-center text-slate-400 text-xs py-4">No inventory found for this location.</div>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                <input type="text" placeholder="Service Name" className="w-full border p-2 rounded text-xs" value={customService.name} onChange={e => setCustomService({...customService, name: e.target.value})} />
                                                <div className="flex gap-2">
                                                    <input type="number" placeholder="Cost" className="flex-1 border p-2 rounded text-xs" value={customService.cost || ''} onChange={e => setCustomService({...customService, cost: Number(e.target.value)})} />
                                                    <select className="flex-1 border p-2 rounded text-xs" value={customService.type} onChange={e => setCustomService({...customService, type: e.target.value})}>
                                                        <option value="HOTEL">Hotel</option>
                                                        <option value="ACTIVITY">Activity</option>
                                                        <option value="TRANSFER">Transfer</option>
                                                        <option value="OTHER">Other</option>
                                                    </select>
                                                </div>
                                                <button onClick={() => addManualItem(index)} className="w-full bg-slate-800 text-white py-2 rounded text-xs font-bold">Add Custom Item</button>
                                            </div>
                                        )}
                                        <div className="mt-3 pt-3 border-t border-slate-100 text-center">
                                            <button onClick={() => setActiveServiceDay(null)} className="text-xs text-slate-400 hover:text-slate-600">Close Panel</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex justify-between items-center">
                                         <button 
                                            onClick={() => { setActiveServiceDay(activeServiceDay === index ? null : index); setSearchTerm(''); }}
                                            disabled={!hasCity}
                                            className={`flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-lg border border-dashed w-full justify-center transition-all ${
                                                !hasCity 
                                                ? 'bg-slate-50 text-slate-400 border-slate-300 cursor-not-allowed' 
                                                : 'bg-white text-brand-600 border-brand-200 hover:bg-brand-50 hover:border-brand-300 shadow-sm'
                                            }`}
                                        >
                                            <Plus size={14} /> {!hasCity ? 'Select Location First' : 'Add Service'}
                                        </button>
                                    </div>
                                )}
                          </div>

                          <div className="mt-4">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Notes / Inclusions</label>
                              <textarea 
                                  rows={2}
                                  value={item.description}
                                  onChange={(e) => {
                                      const newItems = [...items];
                                      newItems[index].description = e.target.value;
                                      setItems(newItems);
                                  }}
                                  className="w-full border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-brand-500 outline-none resize-none bg-white text-slate-600"
                                  placeholder="Add day summary or special notes..."
                              />
                          </div>
                      </div>
                  )}
              </div>
              );
          })}
      </div>

      <div className="flex justify-center py-6">
          <button 
              onClick={() => {
                  const newItem = { day: items.length + 1, title: `Day ${items.length + 1}`, description: '', inclusions: [], services: [], cityId: items[items.length - 1]?.cityId || '' };
                  setItems([...items, newItem]);
                  setExpandedDays([...expandedDays, newItem.day]);
              }}
              className="flex items-center gap-2 bg-white text-slate-700 border border-slate-300 px-6 py-3 rounded-full font-bold hover:bg-slate-50 transition shadow-sm hover:shadow-md text-sm"
          >
              <Plus size={18} /> Add Day {items.length + 1}
          </button>
      </div>

    </div>
  );
};
