import React, { useState, useEffect } from 'react';
import { ItineraryItem, ItineraryService } from '../types';
import { adminService } from '../services/adminService';
import { currencyService } from '../services/currencyService';
import { calculatePriceFromNet } from '../utils/pricingEngine';
import { InventoryModal } from './builder/InventoryModal';
import { Save, Plus, Trash2, MapPin, Hotel, Camera, Car, X } from 'lucide-react';

interface Props {
  initialItinerary: ItineraryItem[];
  destination: string;
  pax: number;
  onSave: (itinerary: ItineraryItem[], financials?: { net: number, selling: number, currency: string }) => void;
  onCancel: () => void;
}

export const ItineraryBuilder: React.FC<Props> = ({ initialItinerary, destination, pax, onSave, onCancel }) => {
  const [itinerary, setItinerary] = useState<ItineraryItem[]>(JSON.parse(JSON.stringify(initialItinerary)));
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'HOTEL' | 'ACTIVITY' | 'TRANSFER'>('HOTEL');
  const [financials, setFinancials] = useState({ net: 0, selling: 0, currency: 'INR' });

  useEffect(() => {
    let totalNet = 0;
    const rules = adminService.getPricingRule();
    
    itinerary.forEach(day => {
        day.services?.forEach(svc => {
            const cost = svc.cost || 0;
            const currency = svc.currency || 'INR';
            const qty = svc.quantity || 1;
            const nights = svc.duration_nights || 1;
            totalNet += currencyService.convert(cost * qty * nights, currency, 'INR');
        });
    });

    const calc = calculatePriceFromNet(totalNet, rules, pax);
    setFinancials({
        net: calc.platformNetCost,
        selling: calc.finalPrice,
        currency: 'INR'
    });
  }, [itinerary, pax]);

  const handleAddService = (item: any) => {
      const newService: ItineraryService = {
          id: item.id || `svc_${Date.now()}`,
          inventory_id: item.inventory_id,
          type: item.type,
          name: item.name,
          cost: item.estimated_cost,
          price: item.estimated_cost,
          currency: item.currency,
          quantity: item.quantity || 1,
          duration_nights: item.nights || 1,
          meta: item.meta
      };

      const updated = [...itinerary];
      if(!updated[activeDayIndex].services) updated[activeDayIndex].services = [];
      updated[activeDayIndex].services!.push(newService);
      setItinerary(updated);
  };

  const handleRemoveService = (dayIndex: number, serviceId: string) => {
      const updated = [...itinerary];
      updated[dayIndex].services = updated[dayIndex].services?.filter(s => s.id !== serviceId);
      setItinerary(updated);
  };

  const handleOpenAdd = (type: 'HOTEL' | 'ACTIVITY' | 'TRANSFER') => {
      setModalType(type);
      setIsModalOpen(true);
  };

  const activeDay = itinerary[activeDayIndex];

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] bg-slate-50 rounded-xl overflow-hidden border border-slate-200 shadow-xl fixed inset-0 z-50 m-4 md:m-8">
        <div className="bg-white border-b border-slate-200 p-4 flex justify-between items-center">
            <div>
                <h2 className="text-xl font-bold text-slate-900">Itinerary Builder</h2>
                <p className="text-sm text-slate-500">{destination} • {pax} Pax</p>
            </div>
            <div className="flex items-center gap-4">
                <div className="text-right hidden md:block">
                    <p className="text-xs font-bold text-slate-400 uppercase">Estimated Total</p>
                    <p className="text-xl font-bold text-slate-900">{financials.currency} {financials.selling.toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={onCancel} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                    <button 
                        onClick={() => onSave(itinerary, financials)} 
                        className="px-6 py-2 bg-brand-600 text-white hover:bg-brand-700 rounded-lg font-bold flex items-center gap-2"
                    >
                        <Save size={18} /> Save Changes
                    </button>
                </div>
            </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
            <div className="w-64 bg-white border-r border-slate-200 overflow-y-auto">
                {itinerary.map((day, idx) => (
                    <div 
                        key={idx}
                        onClick={() => setActiveDayIndex(idx)}
                        className={`p-4 border-b border-slate-100 cursor-pointer transition ${activeDayIndex === idx ? 'bg-blue-50 border-l-4 border-l-brand-600' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}
                    >
                        <div className="flex justify-between items-start">
                            <span className="text-xs font-bold text-slate-500">Day {day.day}</span>
                            {day.cityId && <MapPin size={12} className="text-slate-400"/>}
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm mt-1 truncate">{day.title}</h4>
                        <p className="text-xs text-slate-500 mt-1">{day.services?.length || 0} Services</p>
                    </div>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                {activeDay ? (
                    <div className="max-w-3xl mx-auto">
                        <div className="mb-6">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Day Title</label>
                            <input 
                                type="text" 
                                className="w-full text-lg font-bold border-b border-slate-300 focus:border-brand-500 outline-none bg-transparent py-1"
                                value={activeDay.title}
                                onChange={(e) => {
                                    const updated = [...itinerary];
                                    updated[activeDayIndex].title = e.target.value;
                                    setItinerary(updated);
                                }}
                            />
                        </div>
                        <div className="mb-6">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                            <textarea 
                                className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                                rows={3}
                                value={activeDay.description}
                                onChange={(e) => {
                                    const updated = [...itinerary];
                                    updated[activeDayIndex].description = e.target.value;
                                    setItinerary(updated);
                                }}
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-bold text-slate-700">Services</h4>
                                <div className="flex gap-2">
                                    <button onClick={() => handleOpenAdd('HOTEL')} className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded hover:bg-indigo-100 flex gap-1 items-center"><Plus size={12}/> Hotel</button>
                                    <button onClick={() => handleOpenAdd('ACTIVITY')} className="text-xs bg-pink-50 text-pink-700 px-3 py-1.5 rounded hover:bg-pink-100 flex gap-1 items-center"><Plus size={12}/> Activity</button>
                                    <button onClick={() => handleOpenAdd('TRANSFER')} className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded hover:bg-blue-100 flex gap-1 items-center"><Plus size={12}/> Transfer</button>
                                </div>
                            </div>

                            {activeDay.services && activeDay.services.length > 0 ? (
                                activeDay.services.map((svc) => (
                                    <div key={svc.id} className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${
                                                svc.type === 'HOTEL' ? 'bg-indigo-100 text-indigo-600' :
                                                svc.type === 'ACTIVITY' ? 'bg-pink-100 text-pink-600' :
                                                'bg-blue-100 text-blue-600'
                                            }`}>
                                                {svc.type === 'HOTEL' && <Hotel size={18}/>}
                                                {svc.type === 'ACTIVITY' && <Camera size={18}/>}
                                                {svc.type === 'TRANSFER' && <Car size={18}/>}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{svc.name}</p>
                                                <div className="text-xs text-slate-500 flex gap-2">
                                                    <span>{svc.type}</span>
                                                    {svc.type === 'HOTEL' && <span>• {svc.meta?.roomType}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="font-mono font-bold text-slate-700">{svc.currency || 'INR'} {(svc.cost * (svc.quantity||1) * (svc.duration_nights||1)).toLocaleString()}</p>
                                            </div>
                                            <button onClick={() => handleRemoveService(activeDayIndex, svc.id)} className="text-slate-400 hover:text-red-500">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
                                    No services added for this day.
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-400">Select a day to edit</div>
                )}
            </div>
        </div>

        {isModalOpen && (
            <InventoryModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)}
                type={modalType}
                dayId={activeDayIndex.toString()}
                destinationId="" 
                onSelect={handleAddService}
            />
        )}
    </div>
  );
};