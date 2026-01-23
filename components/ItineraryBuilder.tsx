
import React, { useState, useEffect } from 'react';
import { ItineraryItem, ItineraryService } from '../types';
import { InventoryModal } from './builder/InventoryModal';
import { BuilderService } from './builder/ItineraryBuilderContext';
import { Plus, Trash2, Save, X, Calendar, MapPin, Hotel, Camera, Car, Flag, ChevronDown, ChevronUp, AlertCircle, DollarSign } from 'lucide-react';
import { adminService } from '../services/adminService';

interface Props {
  initialItinerary: ItineraryItem[];
  destination: string;
  pax: number;
  onSave: (itinerary: ItineraryItem[], financials?: { net: number, selling: number, currency: string }) => void;
  onCancel: () => void;
}

export const ItineraryBuilder: React.FC<Props> = ({ initialItinerary, destination, pax, onSave, onCancel }) => {
  // Initialize itinerary state
  const [items, setItems] = useState<ItineraryItem[]>(() => {
      if (!initialItinerary || initialItinerary.length === 0) {
          // Default 3 days if empty
          return Array.from({ length: 3 }).map((_, i) => ({
              day: i + 1,
              title: `Day ${i + 1}`,
              description: '',
              services: []
          }));
      }
      return JSON.parse(JSON.stringify(initialItinerary));
  });

  const [activeServiceDay, setActiveServiceDay] = useState<number | null>(null);
  const [modalType, setModalType] = useState<'HOTEL' | 'ACTIVITY' | 'TRANSFER' | null>(null);
  const [customService, setCustomService] = useState({
      name: '', cost: 0, type: 'HOTEL', notes: '', roomType: '', mealPlan: 'BB'
  });

  const displayCurrency = 'INR';

  // Helper to calculate consecutive nights for a city
  const calculateCityDuration = (startIndex: number, cityId: string): number => {
      let count = 0;
      for (let i = startIndex; i < items.length; i++) {
          if (items[i].cityId === cityId) count++;
          else break;
      }
      return count || 1;
  };

  const addServiceToDay = (dayIndex: number, service: Partial<ItineraryService>) => {
      const newItems = [...items];
      if (!newItems[dayIndex].services) newItems[dayIndex].services = [];
      
      const newService: ItineraryService = {
          id: service.id || `svc_${Date.now()}`,
          type: service.type as any,
          name: service.name || 'Service',
          cost: service.cost || 0,
          price: service.price || service.cost || 0,
          currency: service.currency || displayCurrency,
          isRef: false,
          meta: service.meta || {},
          quantity: service.quantity || 1,
          duration_nights: service.duration_nights || 1,
          ...service
      } as ItineraryService;

      newItems[dayIndex].services?.push(newService);
      setItems(newItems);
  };

  const removeService = (dayIndex: number, serviceIndex: number) => {
      const newItems = [...items];
      newItems[dayIndex].services?.splice(serviceIndex, 1);
      setItems(newItems);
  };

  const handleSystemItemSelect = (item: BuilderService) => {
      if (activeServiceDay === null) return;
      
      const type = item.type === 'CUSTOM' ? 'OTHER' : item.type;
      
      let finalCost = item.estimated_cost;
      let quantity = 1;
      let duration = 1;

      // Simple estimation logic for initial add
      if (type === 'HOTEL') {
          const rooms = Math.ceil(pax / 2);
          quantity = rooms;
          finalCost = item.estimated_cost * rooms; 
      } else if (type === 'ACTIVITY') {
          quantity = pax;
          finalCost = item.estimated_cost * pax;
      } else if (type === 'TRANSFER') {
          const vehicles = Math.ceil(pax / 4);
          quantity = vehicles;
          finalCost = item.estimated_cost * vehicles;
      }

      addServiceToDay(activeServiceDay, {
          inventory_id: item.inventory_id,
          type: type as any,
          name: item.name,
          cost: finalCost,
          price: finalCost,
          currency: item.currency,
          meta: item.meta,
          quantity: quantity,
          duration_nights: 1 
      });
      
      setModalType(null);
      setActiveServiceDay(null);
  };

  const handleAddManualItem = (index: number) => {
      if (!customService.name) return;
      
      let meta: any = { notes: customService.notes };
      let quantity = 1;
      let duration = 1;

      if (customService.type === 'HOTEL') {
          meta.roomType = customService.roomType || 'Standard';
          meta.mealPlan = customService.mealPlan || 'BB';
          quantity = Math.ceil(pax / 2);
      } else if (customService.type === 'ACTIVITY') {
          quantity = pax;
      }

      addServiceToDay(index, {
          type: customService.type as any,
          name: customService.name,
          cost: Number(customService.cost),
          price: Number(customService.cost),
          currency: displayCurrency,
          meta: meta,
          quantity: quantity,
          duration_nights: duration
      });

      setCustomService({ name: '', cost: 0, type: 'HOTEL', notes: '', roomType: '', mealPlan: 'BB' });
      setActiveServiceDay(null);
  };

  const handleSave = () => {
      // Calculate rudimentary totals for immediate display
      let totalNet = 0;
      items.forEach(day => {
          day.services?.forEach(s => {
              totalNet += s.cost;
          });
      });
      
      // Simple markup logic for saving (15%)
      const selling = Math.ceil(totalNet * 1.15);
      
      onSave(items, { net: totalNet, selling, currency: displayCurrency });
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
       <div className="container mx-auto px-4 py-6">
           {/* Header */}
           <div className="flex justify-between items-center mb-6">
               <div>
                   <h2 className="text-2xl font-bold text-slate-800">Itinerary Editor</h2>
                   <p className="text-sm text-slate-500">Destination: {destination} | Pax: {pax}</p>
               </div>
               <div className="flex gap-2">
                   <button onClick={onCancel} className="px-4 py-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
                   <button onClick={handleSave} className="px-4 py-2 text-white bg-brand-600 rounded-lg hover:bg-brand-700 flex items-center gap-2 shadow-sm">
                       <Save size={18} /> Save Changes
                   </button>
               </div>
           </div>

           {/* Days List */}
           <div className="space-y-6">
               {items.map((day, dayIndex) => (
                   <div key={dayIndex} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                       <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
                           <div className="flex items-center gap-3">
                               <span className="bg-slate-200 text-slate-700 px-3 py-1 rounded-lg text-sm font-bold">Day {day.day}</span>
                               <input 
                                   type="text" 
                                   value={day.title} 
                                   onChange={(e) => {
                                       const newItems = [...items];
                                       newItems[dayIndex].title = e.target.value;
                                       setItems(newItems);
                                   }}
                                   className="border border-slate-300 rounded px-3 py-1.5 text-sm font-medium w-full md:w-64 focus:ring-2 focus:ring-brand-500 outline-none"
                                   placeholder="Title (e.g. Arrival in Dubai)"
                               />
                           </div>
                           <div className="flex gap-2">
                               <button onClick={() => { setActiveServiceDay(dayIndex); setModalType('HOTEL'); }} className="text-xs flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg font-bold hover:bg-indigo-100 border border-indigo-100 transition"><Hotel size={14}/> + Hotel</button>
                               <button onClick={() => { setActiveServiceDay(dayIndex); setModalType('ACTIVITY'); }} className="text-xs flex items-center gap-1 px-3 py-1.5 bg-pink-50 text-pink-700 rounded-lg font-bold hover:bg-pink-100 border border-pink-100 transition"><Camera size={14}/> + Activity</button>
                               <button onClick={() => { setActiveServiceDay(dayIndex); setModalType('TRANSFER'); }} className="text-xs flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg font-bold hover:bg-blue-100 border border-blue-100 transition"><Car size={14}/> + Transfer</button>
                               <button onClick={() => { setActiveServiceDay(dayIndex); setModalType(null); /* Custom Open */ }} className="text-xs flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 border border-slate-200 transition"><Plus size={14}/> Custom</button>
                           </div>
                       </div>
                       
                       <div className="p-4">
                           <textarea 
                               className="w-full border border-slate-200 rounded-lg p-3 text-sm mb-4 resize-none focus:ring-2 focus:ring-brand-500 outline-none"
                               rows={2}
                               placeholder="Detailed description for the day..."
                               value={day.description}
                               onChange={(e) => {
                                   const newItems = [...items];
                                   newItems[dayIndex].description = e.target.value;
                                   setItems(newItems);
                               }}
                           />
                           
                           {/* Services */}
                           {day.services && day.services.length > 0 ? (
                               <div className="space-y-2">
                                   {day.services.map((svc, sIdx) => (
                                       <div key={svc.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-300 transition">
                                           <div className="flex items-center gap-3">
                                               <div className={`p-2 rounded-lg ${svc.type === 'HOTEL' ? 'bg-indigo-100 text-indigo-600' : svc.type === 'ACTIVITY' ? 'bg-pink-100 text-pink-600' : svc.type === 'TRANSFER' ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-600'}`}>
                                                   {svc.type === 'HOTEL' && <Hotel size={16}/>}
                                                   {svc.type === 'ACTIVITY' && <Camera size={16}/>}
                                                   {svc.type === 'TRANSFER' && <Car size={16}/>}
                                                   {svc.type === 'OTHER' && <Flag size={16}/>}
                                               </div>
                                               <div>
                                                   <p className="font-bold text-sm text-slate-800">{svc.name}</p>
                                                   <p className="text-xs text-slate-500">
                                                      {svc.meta?.roomType || svc.meta?.vehicle || svc.type} 
                                                      {svc.quantity > 1 ? ` • x${svc.quantity}` : ''}
                                                   </p>
                                               </div>
                                           </div>
                                           <div className="flex items-center gap-4">
                                               <span className="font-mono text-sm font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200">
                                                   {svc.currency} {svc.cost.toLocaleString()}
                                               </span>
                                               <button onClick={() => removeService(dayIndex, sIdx)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition"><Trash2 size={16}/></button>
                                           </div>
                                       </div>
                                   ))}
                               </div>
                           ) : (
                               <div className="text-center py-4 border-2 border-dashed border-slate-100 rounded-lg text-slate-400 text-xs italic">
                                   No services added. Use the buttons above to add items.
                               </div>
                           )}

                           {/* Custom Service Adder (Inline) */}
                           {activeServiceDay === dayIndex && modalType === null && (
                               <div className="mt-4 p-4 bg-white border border-brand-200 rounded-xl shadow-sm animate-in fade-in">
                                   <h4 className="text-sm font-bold text-brand-700 mb-3">Add Custom Item</h4>
                                   <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                                       <select 
                                           className="border p-2 rounded text-sm"
                                           value={customService.type}
                                           onChange={e => setCustomService({...customService, type: e.target.value})}
                                       >
                                           <option value="HOTEL">Hotel</option>
                                           <option value="ACTIVITY">Activity</option>
                                           <option value="TRANSFER">Transfer</option>
                                           <option value="OTHER">Other</option>
                                       </select>
                                       <input 
                                           type="text" 
                                           className="border p-2 rounded text-sm md:col-span-2" 
                                           placeholder="Item Name"
                                           value={customService.name}
                                           onChange={e => setCustomService({...customService, name: e.target.value})}
                                       />
                                       <div className="relative">
                                           <span className="absolute left-2 top-2 text-xs text-slate-400">{displayCurrency}</span>
                                           <input 
                                               type="number" 
                                               className="border p-2 pl-8 rounded text-sm w-full" 
                                               placeholder="Cost"
                                               value={customService.cost || ''}
                                               onChange={e => setCustomService({...customService, cost: Number(e.target.value)})}
                                           />
                                       </div>
                                   </div>
                                   {customService.type === 'HOTEL' && (
                                       <div className="grid grid-cols-2 gap-3 mb-3">
                                           <input type="text" placeholder="Room Type" className="border p-2 rounded text-sm" value={customService.roomType} onChange={e => setCustomService({...customService, roomType: e.target.value})} />
                                           <select className="border p-2 rounded text-sm" value={customService.mealPlan} onChange={e => setCustomService({...customService, mealPlan: e.target.value})}>
                                               <option value="RO">Room Only</option>
                                               <option value="BB">Breakfast</option>
                                               <option value="HB">Half Board</option>
                                           </select>
                                       </div>
                                   )}
                                   <div className="flex justify-end gap-2">
                                       <button onClick={() => setActiveServiceDay(null)} className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
                                       <button onClick={() => handleAddManualItem(dayIndex)} className="px-3 py-1.5 text-xs bg-brand-600 text-white rounded hover:bg-brand-700">Add Item</button>
                                   </div>
                               </div>
                           )}
                       </div>
                   </div>
               ))}
           </div>

           {/* Inventory Modals */}
           {modalType && activeServiceDay !== null && (
               <InventoryModal 
                   isOpen={true}
                   onClose={() => setModalType(null)}
                   onSelect={handleSystemItemSelect}
                   dayId={items[activeServiceDay].day.toString()} 
                   type={modalType}
                   destinationId="" 
               />
           )}
       </div>
    </div>
  );
};
