
import React, { useState, useEffect } from 'react';
import { ItineraryItem, Hotel, Activity, Transfer, ItineraryService } from '../types';
import { adminService } from '../services/adminService';
import { Plus, Trash2, GripVertical, Save, Hotel as HotelIcon, Camera, Car, Check, DollarSign, X, Search, Briefcase, MapPin } from 'lucide-react';

interface Props {
  initialItinerary: ItineraryItem[];
  destination: string; // Passed from quote to filter inventory
  onSave: (items: ItineraryItem[]) => void;
  onCancel: () => void;
}

export const ItineraryBuilder: React.FC<Props> = ({ initialItinerary, destination, onSave, onCancel }) => {
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  
  // Inventory State
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  
  // Controls which day is currently adding a service
  const [activeServiceDay, setActiveServiceDay] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'HOTEL' | 'ACTIVITY' | 'TRANSFER' | 'CUSTOM'>('ACTIVITY');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Custom Service State
  const [customService, setCustomService] = useState({ name: '', cost: 0, type: 'OTHER' });

  useEffect(() => {
    // If quote has no itinerary, start with Day 1
    if (!initialItinerary || initialItinerary.length === 0) {
      setItems([{ day: 1, title: 'Arrival', description: '', inclusions: [], services: [] }]);
    } else {
      setItems(initialItinerary.map(i => ({...i, services: i.services || []})));
    }

    // Load and filter inventory based on destination string
    const allDestinations = adminService.getDestinations();
    const matchedDest = allDestinations.find(d => 
        destination.toLowerCase().includes(d.city.toLowerCase()) || 
        destination.toLowerCase().includes(d.country.toLowerCase())
    );

    if (matchedDest) {
        setHotels(adminService.getHotels().filter(h => h.destinationId === matchedDest.id && h.isActive));
        setActivities(adminService.getActivities().filter(a => a.destinationId === matchedDest.id && a.isActive));
        setTransfers(adminService.getTransfers().filter(t => t.destinationId === matchedDest.id && t.isActive));
    }
  }, [initialItinerary, destination]);

  // Recalculate cost whenever items change
  useEffect(() => {
    const cost = items.reduce((sum, day) => {
        return sum + (day.services?.reduce((dSum, svc) => dSum + svc.cost, 0) || 0);
    }, 0);
    setTotalCost(cost);
  }, [items]);

  const handleAddItem = () => {
    const nextDay = items.length + 1;
    setItems([
      ...items,
      { day: nextDay, title: `Day ${nextDay}`, description: '', inclusions: [], services: [] }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    const reindexed = newItems.map((item, i) => ({ ...item, day: i + 1 }));
    setItems(reindexed);
  };

  const handleChange = (index: number, field: keyof ItineraryItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleInclusionsChange = (index: number, value: string) => {
    const arr = value.split(',').map(s => s.trim()).filter(s => s !== '');
    handleChange(index, 'inclusions', arr);
  };

  // --- Smart Inventory Insertion ---

  const addServiceToDay = (index: number, service: ItineraryService) => {
      const currentServices = items[index].services || [];
      const newServices = [...currentServices, service];
      handleChange(index, 'services', newServices);
      
      // Auto-update description if empty or simple append
      const currentDesc = items[index].description || '';
      let appendText = '';
      if (service.type === 'HOTEL') appendText = `Check-in at ${service.name}.`;
      else if (service.type === 'TRANSFER') appendText = `Transfer: ${service.name}.`;
      else appendText = `${service.name}.`;

      if (!currentDesc.includes(service.name)) {
          handleChange(index, 'description', currentDesc ? `${currentDesc}\n${appendText}` : appendText);
      }
  };

  const removeServiceFromDay = (dayIndex: number, serviceIndex: number) => {
      const currentServices = items[dayIndex].services || [];
      const newServices = currentServices.filter((_, i) => i !== serviceIndex);
      handleChange(dayIndex, 'services', newServices);
  };

  const addHotel = (index: number, hotel: Hotel) => {
      addServiceToDay(index, {
          id: hotel.id,
          type: 'HOTEL',
          name: hotel.name,
          cost: hotel.cost, 
          price: hotel.cost,
          meta: { roomType: hotel.roomType, mealPlan: hotel.mealPlan }
      });
      setActiveServiceDay(null);
  };

  const addActivity = (index: number, act: Activity) => {
      addServiceToDay(index, {
          id: act.id,
          type: 'ACTIVITY',
          name: act.activityName,
          cost: act.costAdult, // Base cost (needs Pax mult logic in real quote)
          price: act.costAdult,
          meta: { type: act.activityType }
      });
      setActiveServiceDay(null);
  };

  const addTransfer = (index: number, trans: Transfer) => {
      addServiceToDay(index, {
          id: trans.id,
          type: 'TRANSFER',
          name: trans.transferName,
          cost: trans.cost,
          price: trans.cost,
          meta: { vehicle: trans.vehicleType }
      });
      setActiveServiceDay(null);
  };

  const addCustomService = (index: number) => {
      if(!customService.name) return;
      addServiceToDay(index, {
          id: `custom_${Date.now()}`,
          type: 'OTHER',
          name: customService.name,
          cost: Number(customService.cost),
          price: Number(customService.cost),
          isRef: false
      });
      setCustomService({ name: '', cost: 0, type: 'OTHER' });
      setActiveServiceDay(null);
  };

  // --- FILTERED LISTS ---
  const filteredHotels = hotels.filter(h => h.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredActivities = activities.filter(a => a.activityName.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredTransfers = transfers.filter(t => t.transferName.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h3 className="text-lg font-bold text-slate-900">Itinerary Builder</h3>
            <p className="text-xs text-slate-500">Auto-suggesting services for: {destination}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right mr-4 hidden md:block">
              <p className="text-xs text-slate-500">Estimated Net Cost</p>
              <p className="font-mono font-bold text-slate-900">{totalCost > 0 ? totalCost.toLocaleString() : '-'}</p>
          </div>
          <div className="flex gap-2">
            <button 
                onClick={onCancel}
                className="px-4 py-2 text-slate-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition text-sm font-medium"
            >
                Cancel
            </button>
            <button 
                onClick={() => onSave(items)}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition text-sm font-medium flex items-center gap-2"
            >
                <Save size={16} /> Save & Update Cost
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {items.map((item, index) => (
          <div key={index} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative group">
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Header: Day & Title */}
              <div className="md:col-span-3 space-y-3">
                <div className="flex items-center gap-2">
                   <div className="bg-brand-100 text-brand-700 w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm">
                     {item.day}
                   </div>
                   <input
                    type="text"
                    value={item.title}
                    onChange={(e) => handleChange(index, 'title', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none font-bold text-slate-800"
                    placeholder="Day Title"
                   />
                </div>
                
                <textarea
                   rows={3}
                   value={item.inclusions?.join(', ') || ''}
                   onChange={(e) => handleInclusionsChange(index, e.target.value)}
                   className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-brand-500 outline-none resize-none bg-slate-50"
                   placeholder="Inclusions (Breakfast, Ticket, etc)"
                />
              </div>

              {/* Description & Services */}
              <div className="md:col-span-9 relative">
                <textarea
                  rows={2}
                  value={item.description}
                  onChange={(e) => handleChange(index, 'description', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none mb-3"
                  placeholder="Describe the day's agenda..."
                />
                
                {/* Added Services Chips */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {item.services?.map((svc, sIdx) => (
                        <div key={sIdx} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm ${
                            svc.type === 'HOTEL' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' :
                            svc.type === 'ACTIVITY' ? 'bg-pink-50 border-pink-200 text-pink-700' :
                            svc.type === 'TRANSFER' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                            'bg-slate-100 border-slate-200 text-slate-700'
                        }`}>
                            {svc.type === 'HOTEL' && <HotelIcon size={14} />}
                            {svc.type === 'ACTIVITY' && <Camera size={14} />}
                            {svc.type === 'TRANSFER' && <Car size={14} />}
                            <span className="font-medium">{svc.name}</span>
                            <span className="text-xs opacity-70 border-l border-current pl-2 ml-1">{svc.cost}</span>
                            <button onClick={() => removeServiceFromDay(index, sIdx)} className="hover:text-red-500 ml-1"><X size={14}/></button>
                        </div>
                    ))}
                    <button 
                        onClick={() => {
                            setActiveServiceDay(activeServiceDay === index ? null : index);
                            setSearchTerm('');
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg border border-brand-200 border-dashed text-sm font-medium transition"
                    >
                        <Plus size={14} /> Add Service
                    </button>
                </div>

                {/* --- SERVICE SELECTOR PANEL --- */}
                {activeServiceDay === index && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 z-20 overflow-hidden animate-in fade-in zoom-in-95">
                        {/* Tabs */}
                        <div className="flex border-b border-slate-100 bg-slate-50">
                            <button onClick={() => setActiveTab('ACTIVITY')} className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 border-b-2 ${activeTab === 'ACTIVITY' ? 'border-pink-500 text-pink-600 bg-white' : 'border-transparent text-slate-500'}`}>
                                <Camera size={14}/> Sightseeing
                            </button>
                            <button onClick={() => setActiveTab('TRANSFER')} className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 border-b-2 ${activeTab === 'TRANSFER' ? 'border-blue-500 text-blue-600 bg-white' : 'border-transparent text-slate-500'}`}>
                                <Car size={14}/> Transfer
                            </button>
                            <button onClick={() => setActiveTab('HOTEL')} className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 border-b-2 ${activeTab === 'HOTEL' ? 'border-indigo-500 text-indigo-600 bg-white' : 'border-transparent text-slate-500'}`}>
                                <HotelIcon size={14}/> Hotel
                            </button>
                            <button onClick={() => setActiveTab('CUSTOM')} className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 border-b-2 ${activeTab === 'CUSTOM' ? 'border-slate-500 text-slate-600 bg-white' : 'border-transparent text-slate-500'}`}>
                                <Plus size={14}/> Custom
                            </button>
                        </div>

                        {/* Search & List */}
                        <div className="p-4 bg-slate-50 border-b border-slate-100">
                             {activeTab !== 'CUSTOM' ? (
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                    <input 
                                        type="text" 
                                        placeholder={`Search ${activeTab.toLowerCase()}...`}
                                        className="w-full pl-9 border border-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                             ) : (
                                <p className="text-xs text-slate-500 font-medium">Add a service manually if not in inventory.</p>
                             )}
                        </div>

                        <div className="max-h-60 overflow-y-auto p-2">
                            {activeTab === 'ACTIVITY' && (
                                <div className="space-y-1">
                                    {filteredActivities.map(a => (
                                        <button key={a.id} onClick={() => addActivity(index, a)} className="w-full text-left p-2 hover:bg-pink-50 rounded-lg flex justify-between items-center group">
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{a.activityName}</p>
                                                <p className="text-xs text-slate-500">{a.activityType} {a.ticketIncluded ? '• Ticket Inc' : ''}</p>
                                            </div>
                                            <span className="text-sm font-mono font-medium text-pink-600">{a.costAdult}</span>
                                        </button>
                                    ))}
                                    {filteredActivities.length === 0 && <p className="text-center text-xs text-slate-400 p-4">No activities found.</p>}
                                </div>
                            )}

                            {activeTab === 'TRANSFER' && (
                                <div className="space-y-1">
                                    {filteredTransfers.map(t => (
                                        <button key={t.id} onClick={() => addTransfer(index, t)} className="w-full text-left p-2 hover:bg-blue-50 rounded-lg flex justify-between items-center group">
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{t.transferName}</p>
                                                <p className="text-xs text-slate-500">{t.vehicleType} • {t.transferType}</p>
                                            </div>
                                            <span className="text-sm font-mono font-medium text-blue-600">{t.cost}</span>
                                        </button>
                                    ))}
                                    {filteredTransfers.length === 0 && <p className="text-center text-xs text-slate-400 p-4">No transfers found.</p>}
                                </div>
                            )}

                            {activeTab === 'HOTEL' && (
                                <div className="space-y-1">
                                    {filteredHotels.map(h => (
                                        <button key={h.id} onClick={() => addHotel(index, h)} className="w-full text-left p-2 hover:bg-indigo-50 rounded-lg flex justify-between items-center group">
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{h.name}</p>
                                                <p className="text-xs text-slate-500">{h.roomType} • {h.mealPlan}</p>
                                            </div>
                                            <span className="text-sm font-mono font-medium text-indigo-600">{h.cost}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'CUSTOM' && (
                                <div className="p-2 space-y-3">
                                    <input 
                                        type="text" 
                                        placeholder="Service Name" 
                                        className="w-full border p-2 rounded text-sm"
                                        value={customService.name}
                                        onChange={e => setCustomService({...customService, name: e.target.value})}
                                    />
                                    <input 
                                        type="number" 
                                        placeholder="Cost" 
                                        className="w-full border p-2 rounded text-sm"
                                        value={customService.cost || ''}
                                        onChange={e => setCustomService({...customService, cost: Number(e.target.value)})}
                                    />
                                    <button 
                                        onClick={() => addCustomService(index)}
                                        disabled={!customService.name}
                                        className="w-full bg-slate-800 text-white py-2 rounded text-sm font-bold disabled:opacity-50"
                                    >
                                        Add Custom Service
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
              </div>

              {/* Remove Day Button */}
              <button 
                  onClick={() => handleRemoveItem(index)}
                  className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                  title="Remove Day"
              >
                  <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-center">
        <button 
          onClick={handleAddItem}
          className="flex items-center gap-2 text-brand-600 hover:text-brand-700 font-medium px-4 py-2 hover:bg-brand-50 rounded-lg transition border border-dashed border-brand-200"
        >
          <Plus size={18} /> Add Day {items.length + 1}
        </button>
      </div>
    </div>
  );
};
