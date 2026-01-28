
import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService'; 
import { inventoryService } from '../../services/inventoryService';
import { X, Search, Hotel, Camera, Car, Plus, ShieldCheck, User, MapPin, Globe, PenTool, CheckCircle, Image as ImageIcon, Loader2, Moon, Calendar, Bus, Ticket, Info, Briefcase, Users, Trash2 } from 'lucide-react';
import { BuilderService } from './ItineraryBuilderContext';
import { ItineraryService, ActivityTransferOptions } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: BuilderService) => void;
  onRemove?: (serviceId: string) => void; // New prop for toggling
  dayId: string;
  type: 'HOTEL' | 'ACTIVITY' | 'TRANSFER';
  destinationId: string;
  currentServices?: (BuilderService | ItineraryService)[]; 
  defaultNights?: number;
  paxCount?: number; 
}

const DEFAULT_ACTIVITY_OPTS: ActivityTransferOptions = {
    sic: { enabled: false, costPerPerson: 0 },
    pvt: { enabled: false, costPerVehicle: 0, vehicleCapacity: 4 }
};

// Inner Component for Item Row to manage local state
const InventoryItemRow: React.FC<{
    item: any;
    type: string;
    onAdd: (item: any, nights: number, quantity: number, customMeta?: any, customCost?: number) => void;
    onRemove?: (id: string) => void;
    existingServiceId?: string; // If present, item is already added
    defaultNights: number;
    defaultPax: number;
    getCityName: (id: string) => string;
}> = ({ item, type, onAdd, onRemove, existingServiceId, defaultNights, defaultPax, getCityName }) => {
    
    // Config State
    const [nights, setNights] = useState(defaultNights);
    const [pax, setPax] = useState({ adult: defaultPax, child: 0 }); 
    const [transferMode, setTransferMode] = useState<'TICKET_ONLY' | 'SIC' | 'PVT'>('TICKET_ONLY');
    const [baseTicketEnabled, setBaseTicketEnabled] = useState(false);

    const isAdded = !!existingServiceId;

    useEffect(() => {
        setNights(defaultNights);
    }, [defaultNights]);

    // Force TICKET_ONLY if base ticket is disabled (per requirements)
    useEffect(() => {
        if (!baseTicketEnabled && type === 'ACTIVITY') {
            setTransferMode('TICKET_ONLY');
        }
    }, [baseTicketEnabled, type]);

    const name = item.name || item.activityName || item.transferName;
    const isPartner = !!item.operatorId;
    const locationName = getCityName(item.destinationId || item.location_id);
    const image = item.imageUrl;

    // Pricing Logic
    let displayCost = 0;
    const transferOpts: ActivityTransferOptions = item.transferOptions || DEFAULT_ACTIVITY_OPTS;

    const calculateTotal = () => {
        if (type === 'TRANSFER') {
            const totalPax = pax.adult + pax.child;
            const capacity = item.maxPassengers || 4;
            const vehiclesNeeded = Math.max(1, Math.ceil(totalPax / capacity));
            const unitCost = item.cost || item.costPrice || 0;
            return unitCost * vehiclesNeeded;
        }

        if (type === 'ACTIVITY') {
            // Base ticket cost depends on checkbox state
            const baseTicketCost = baseTicketEnabled
                ? (item.costAdult * pax.adult) + (item.costChild * pax.child)
                : 0;

            if (transferMode === 'TICKET_ONLY') return baseTicketCost;
            
            if (transferMode === 'SIC' && transferOpts.sic.enabled) {
                const totalPax = pax.adult + pax.child;
                return baseTicketCost + (totalPax * transferOpts.sic.costPerPerson);
            } 
            
            if (transferMode === 'PVT' && transferOpts.pvt.enabled) {
                const totalPax = pax.adult + pax.child;
                const capacity = transferOpts.pvt.vehicleCapacity || 4; 
                const vehiclesNeeded = Math.ceil(totalPax / capacity);
                return baseTicketCost + (vehiclesNeeded * transferOpts.pvt.costPerVehicle);
            }
            return baseTicketCost;
        }

        return item.cost || item.costPrice || 0;
    };

    displayCost = calculateTotal();

    const handleActionClick = () => {
        if (isAdded && onRemove && existingServiceId) {
            onRemove(existingServiceId);
            return;
        }

        const customMeta: any = { paxDetails: pax };
        let quantity = 1;
        let finalUnitCost = displayCost; 

        if (type === 'ACTIVITY') {
             customMeta.transferMode = transferMode;
             finalUnitCost = displayCost;
             quantity = 1;
        }

        if (type === 'TRANSFER') {
            const totalPax = pax.adult + pax.child;
            const capacity = item.maxPassengers || 4;
            const vehicles = Math.max(1, Math.ceil(totalPax / capacity));
            
            quantity = vehicles;
            finalUnitCost = item.cost || item.costPrice || 0;
            customMeta.vehicleCapacity = capacity;
            customMeta.paxCount = totalPax;
        }
        
        onAdd(item, nights, quantity, customMeta, finalUnitCost);
    };

    return (
        <div className={`group flex flex-col md:flex-row bg-white border rounded-xl overflow-hidden transition-all duration-200 ${isAdded ? 'border-emerald-500 ring-2 ring-emerald-50 bg-emerald-50/10' : 'border-slate-200 hover:border-brand-300 hover:shadow-md'}`}>
            
            {/* Checkbox Section (Left) */}
            {type === 'ACTIVITY' && (
                <div className="p-4 flex items-center justify-center bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200">
                   <input 
                        type="checkbox" 
                        checked={baseTicketEnabled} 
                        onChange={(e) => setBaseTicketEnabled(e.target.checked)}
                        className="w-5 h-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                        title="Enable Base Ticket"
                   />
                </div>
            )}

            {/* Image Section */}
            <div className={`w-full md:w-40 h-auto bg-slate-100 shrink-0 relative overflow-hidden flex flex-col justify-center transition-opacity ${type === 'ACTIVITY' && !baseTicketEnabled ? 'opacity-50' : ''}`}>
                {image ? (
                    <img src={image} alt={name} className="w-full h-full object-cover min-h-[140px] transition-transform duration-500 group-hover:scale-105" />
                ) : (
                    <div className="w-full h-32 flex items-center justify-center text-slate-300">
                        <ImageIcon size={24} />
                    </div>
                )}
                {isAdded && (
                    <div className="absolute inset-0 bg-emerald-900/70 flex items-center justify-center backdrop-blur-[2px] animate-in fade-in">
                        <span className="text-white font-bold text-sm flex items-center gap-1.5"><CheckCircle size={16} /> Selected</span>
                    </div>
                )}
            </div>

            {/* Details Section */}
            <div className={`flex-1 p-4 flex flex-col justify-between transition-opacity ${type === 'ACTIVITY' && !baseTicketEnabled ? 'opacity-50' : ''}`}>
                <div>
                    <div className="flex justify-between items-start mb-1">
                        <h4 className={`font-bold text-base leading-tight ${isAdded ? 'text-emerald-800' : 'text-slate-800'}`}>{name}</h4>
                        <div className="flex gap-1 shrink-0 ml-2">
                            {isPartner && (
                                <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-100 font-bold flex items-center gap-1">
                                    <User size={10} /> Partner
                                </span>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2 text-xs">
                        <span className="text-slate-500 flex items-center gap-1">
                            <MapPin size={12} className="text-slate-400" /> {locationName}
                        </span>
                        {type === 'HOTEL' && (
                            <>
                                <span className="text-slate-300">•</span>
                                <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">{item.roomType || 'Standard'}</span>
                                <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">{item.mealPlan || 'RO'}</span>
                            </>
                        )}
                        {type === 'TRANSFER' && (
                            <>
                                <span className="text-slate-300">•</span>
                                <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">{item.vehicleType}</span>
                                <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded flex items-center gap-1" title="Max Capacity"><User size={10}/> {item.maxPassengers}</span>
                            </>
                        )}
                    </div>
                    
                    {/* Activity Config */}
                    {type === 'ACTIVITY' && (
                        <div className={`mt-2 bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mb-3 ${!baseTicketEnabled ? 'pointer-events-none' : ''}`}>
                             <div className="md:col-span-2">
                                 <label className="block text-slate-500 font-bold mb-1">Transfer Option</label>
                                 <div className="flex flex-wrap gap-2">
                                     <button onClick={() => setTransferMode('TICKET_ONLY')} className={`px-2 py-1.5 rounded border transition ${transferMode === 'TICKET_ONLY' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'}`}>Without Transfer</button>
                                     {transferOpts.sic.enabled && <button onClick={() => setTransferMode('SIC')} className={`px-2 py-1.5 rounded border transition flex items-center gap-1 ${transferMode === 'SIC' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'}`}><Bus size={10} /> SIC</button>}
                                     {transferOpts.pvt.enabled && <button onClick={() => setTransferMode('PVT')} className={`px-2 py-1.5 rounded border transition flex items-center gap-1 ${transferMode === 'PVT' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'}`}><Car size={10} /> PVT</button>}
                                 </div>
                             </div>
                             <div className="flex items-center gap-2"><label className="text-slate-500 font-bold whitespace-nowrap">Adults:</label><input type="number" min="1" value={pax.adult} onChange={e => setPax({...pax, adult: Math.max(1, Number(e.target.value))})} className="w-12 border border-slate-300 rounded p-1 text-center font-bold" /></div>
                             <div className="flex items-center gap-2"><label className="text-slate-500 font-bold whitespace-nowrap">Children:</label><input type="number" min="0" value={pax.child} onChange={e => setPax({...pax, child: Math.max(0, Number(e.target.value))})} className="w-12 border border-slate-300 rounded p-1 text-center font-bold" /></div>
                        </div>
                    )}

                    {/* Transfer Config */}
                    {type === 'TRANSFER' && (
                         <div className="mt-2 bg-blue-50 p-3 rounded-lg border border-blue-100 flex flex-wrap gap-4 text-xs mb-3">
                             <div className="flex items-center gap-2"><label className="text-blue-800 font-bold whitespace-nowrap">Adults:</label><input type="number" min="1" value={pax.adult} onChange={e => setPax({...pax, adult: Math.max(1, Number(e.target.value))})} className="w-12 border border-blue-200 rounded p-1 text-center font-bold text-blue-900" /></div>
                             <div className="flex items-center gap-2"><label className="text-blue-800 font-bold whitespace-nowrap">Children:</label><input type="number" min="0" value={pax.child} onChange={e => setPax({...pax, child: Math.max(0, Number(e.target.value))})} className="w-12 border border-blue-200 rounded p-1 text-center font-bold text-blue-900" /></div>
                             <div className="flex items-center gap-2 ml-auto"><Car size={14} className="text-blue-600"/><span className="text-blue-800 font-medium">Vehicles: <strong>{Math.ceil((pax.adult + pax.child) / (item.maxPassengers || 4))}</strong></span></div>
                         </div>
                    )}

                    {/* Description & Notes */}
                    <div className="space-y-2 mt-2">
                        {item.description && <p className="text-xs text-slate-600 leading-relaxed line-clamp-2" title={item.description}>{item.description}</p>}
                        {item.notes && (
                            <div className="flex gap-2 items-start text-xs text-amber-800 bg-amber-50 p-2 rounded border border-amber-100">
                                <Info size={14} className="shrink-0 mt-0.5" /> 
                                <span className="font-medium">{item.notes}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-between items-end mt-4 pt-3 border-t border-slate-50">
                    <div className="text-left">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Total Net</p>
                        <p className="font-mono text-base font-bold text-slate-700">
                            {item.currency || 'INR'} {displayCost.toLocaleString()}
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                         {type === 'HOTEL' && !isAdded && (
                             <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden" title="Nights">
                                 <div className="bg-slate-50 px-2 py-1.5 border-r border-slate-300"><Moon size={12} className="text-slate-500" /></div>
                                 <input type="number" min="1" max="30" value={nights} onChange={(e) => setNights(Number(e.target.value))} className="w-12 py-1 text-center text-sm font-bold text-slate-700 outline-none" />
                             </div>
                         )}
                         <button 
                            onClick={handleActionClick}
                            className={`px-5 py-2 rounded-lg transition text-xs font-bold flex items-center gap-1.5 shadow-sm transform active:scale-95 ${isAdded ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' : 'bg-slate-900 text-white hover:bg-brand-600'}`}
                         >
                            {isAdded ? <><Trash2 size={14} /> Remove</> : <><Plus size={14} /> Add</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const InventoryModal: React.FC<Props> = ({ isOpen, onClose, onSelect, onRemove, type, destinationId, currentServices = [], defaultNights = 1, paxCount = 1 }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [allDestinations, setAllDestinations] = useState<any[]>([]);
  const [filterCityId, setFilterCityId] = useState(destinationId || '');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customItem, setCustomItem] = useState({ name: '', cost: '', desc: '', imageUrl: '' });

  useEffect(() => {
    if (isOpen) {
        setFilterCityId(destinationId || ''); 
        loadItems();
    }
  }, [isOpen, type, destinationId]);

  const loadItems = async () => {
    setLoading(true);
    try {
        const dests = await adminService.getDestinations();
        setAllDestinations(dests);
        let mergedItems: any[] = [];
        let systemItems: any[] = [];
        if (type === 'HOTEL') systemItems = await adminService.getHotels();
        else if (type === 'ACTIVITY') systemItems = await adminService.getActivities();
        else systemItems = await adminService.getTransfers();
        
        mergedItems = [...systemItems];
        const allItems = await inventoryService.getAllItems();
        if (allItems.length === 0) await inventoryService.syncFromCloud();

        const partnerItems = (await inventoryService.getApprovedItems()).filter(i => i.type === type);
        mergedItems = [...mergedItems, ...partnerItems];
        setItems(mergedItems);
    } catch (e) {
        console.error("Failed to load inventory", e);
    } finally {
        setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleAddItem = (item: any, selectedNights: number, quantity: number, customMeta?: any, customCost?: number) => {
      const finalCost = customCost !== undefined ? customCost : (item.cost || item.costAdult || item.costPrice || 0);
      const service: BuilderService = {
          id: `svc_${Date.now()}`,
          inventory_id: item.id,
          type: type,
          name: item.name || item.activityName || item.transferName,
          description: item.description,
          estimated_cost: finalCost,
          currency: item.currency || 'INR',
          quantity: quantity || 1, 
          nights: type === 'HOTEL' ? selectedNights : undefined,
          meta: { 
              ...customMeta,
              description: item.description, 
              notes: item.notes,
              roomType: type === 'HOTEL' ? item.roomType : undefined,
              mealPlan: type === 'HOTEL' ? item.mealPlan : undefined,
              imageUrl: item.imageUrl,
              vehicle: type === 'TRANSFER' ? item.vehicleType : undefined,
              capacity: type === 'TRANSFER' ? item.maxPassengers : undefined
          }
      };
      onSelect(service);
  };

  const handleAddCustom = () => {
      if (!customItem.name) return;
      const service: BuilderService = {
          id: `cust_${Date.now()}`,
          type: 'CUSTOM',
          name: customItem.name,
          description: customItem.desc || 'Custom Service',
          estimated_cost: Number(customItem.cost) || 0,
          currency: 'INR',
          quantity: 1,
          nights: type === 'HOTEL' ? 1 : undefined,
          meta: { originalType: type, imageUrl: customItem.imageUrl, description: customItem.desc } 
      };
      onSelect(service);
      setCustomItem({ name: '', cost: '', desc: '', imageUrl: '' }); 
      setShowCustomForm(false);
  };

  const getCityName = (destId: string) => {
      const d = allDestinations.find(x => x.id === destId);
      return d ? d.city : 'General';
  };

  const filteredItems = items.filter(i => {
    const term = searchTerm.toLowerCase();
    const name = (i.name || i.activityName || i.transferName || '').toLowerCase();
    const desc = (i.description || '').toLowerCase();
    const notes = (i.notes || '').toLowerCase();
    
    // Enhanced Search: Checks Name, Description, and Notes
    const matchesSearch = name.includes(term) || desc.includes(term) || notes.includes(term);
    
    let matchesCity = true;
    if (filterCityId && filterCityId !== 'ALL') {
         const itemDestId = i.destinationId || i.location_id; 
         matchesCity = itemDestId === filterCityId;
    }

    return matchesSearch && matchesCity;
  });

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 backdrop-blur">
            <div>
                <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800">
                    {type === 'HOTEL' && <Hotel size={20} className="text-indigo-600"/>}
                    {type === 'ACTIVITY' && <Camera size={20} className="text-pink-600"/>}
                    {type === 'TRANSFER' && <Car size={20} className="text-blue-600"/>}
                    Add {type === 'HOTEL' ? 'Accommodation' : type === 'ACTIVITY' ? 'Activity' : 'Transfer'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                    {destinationId ? `Viewing items for ${getCityName(destinationId)}` : 'Select items from inventory'}
                </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition"><X size={20} className="text-slate-500"/></button>
        </div>
        
        {/* Filters */}
        <div className="p-4 bg-white border-b border-slate-100 space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                    <input 
                        type="text" 
                        placeholder={`Search by name, description or tags...`}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm shadow-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        autoFocus
                    />
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <select 
                            value={filterCityId} 
                            onChange={(e) => setFilterCityId(e.target.value)}
                            className="appearance-none pl-9 pr-8 py-2.5 border border-slate-300 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer hover:border-brand-300 transition shadow-sm w-40"
                        >
                            <option value="ALL">All Cities</option>
                            {allDestinations.map(d => <option key={d.id} value={d.id}>{d.city}</option>)}
                        </select>
                        <Globe size={16} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
                    </div>

                    <button onClick={() => setShowCustomForm(!showCustomForm)} className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition border ${showCustomForm ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}>
                        {showCustomForm ? <X size={16}/> : <PenTool size={16}/>} Custom
                    </button>
                </div>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
            {showCustomForm && (
                <div className="bg-white border border-brand-100 shadow-md rounded-2xl p-5 mb-6 animate-in fade-in slide-in-from-top-2">
                    <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><PenTool size={14} className="text-brand-600"/> Create Custom Item</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Item Name</label><input type="text" placeholder="e.g. Special Gala Dinner" className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none" value={customItem.name} onChange={e => setCustomItem({...customItem, name: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Net Cost (INR)</label><input type="number" placeholder="0.00" className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none" value={customItem.cost} onChange={e => setCustomItem({...customItem, cost: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Image URL</label><input type="text" placeholder="https://..." className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none" value={customItem.imageUrl} onChange={e => setCustomItem({...customItem, imageUrl: e.target.value})} /></div>
                        <div className="md:col-span-4"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label><input type="text" placeholder="Short details..." className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none" value={customItem.desc} onChange={e => setCustomItem({...customItem, desc: e.target.value})} /></div>
                    </div>
                    <div className="flex justify-end"><button onClick={handleAddCustom} className="bg-slate-900 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 transition shadow-sm">Add Custom Item</button></div>
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Loader2 size={32} className="animate-spin mb-4 text-brand-600" />
                    <p className="text-sm font-medium">Loading inventory...</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-3">
                        {filteredItems.map(item => (
                            <InventoryItemRow 
                                key={item.id}
                                item={item}
                                type={type}
                                onAdd={handleAddItem}
                                onRemove={onRemove}
                                existingServiceId={currentServices.find(s => s.inventory_id === item.id)?.id}
                                defaultNights={defaultNights}
                                defaultPax={paxCount}
                                getCityName={getCityName}
                            />
                        ))}
                    </div>
                    {filteredItems.length === 0 && !showCustomForm && (
                        <div className="text-center py-16">
                            <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><Search size={32} className="text-slate-400" /></div>
                            <h3 className="text-slate-900 font-bold mb-1">No items found</h3>
                            <p className="text-slate-500 text-sm mb-6">Try selecting a different city or add a custom item.</p>
                        </div>
                    )}
                </>
            )}
        </div>
      </div>
    </div>
  );
};
