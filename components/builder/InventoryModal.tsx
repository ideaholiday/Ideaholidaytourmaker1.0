
import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService'; 
import { inventoryService } from '../../services/inventoryService';
import { X, Search, Hotel, Camera, Car, Plus, ShieldCheck, User, MapPin, Globe, PenTool, CheckCircle } from 'lucide-react';
import { BuilderService } from './ItineraryBuilderContext';
import { ItineraryService } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: BuilderService) => void;
  dayId: string;
  type: 'HOTEL' | 'ACTIVITY' | 'TRANSFER';
  destinationId: string;
  currentServices?: (BuilderService | ItineraryService)[]; // Accept both types for flexibility
}

export const InventoryModal: React.FC<Props> = ({ isOpen, onClose, onSelect, type, destinationId, currentServices = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [allDestinations, setAllDestinations] = useState<any[]>([]);
  const [showAllLocations, setShowAllLocations] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  
  // Custom Form State
  const [customItem, setCustomItem] = useState({ name: '', cost: '', desc: '' });

  useEffect(() => {
    if (isOpen) {
        loadItems();
    }
  }, [isOpen, type, destinationId, showAllLocations]);

  const loadItems = () => {
    setAllDestinations(adminService.getDestinationsSync());

    let mergedItems: any[] = [];

    // 1. Fetch System Inventory
    if (type === 'HOTEL') mergedItems = [...adminService.getHotels()];
    else if (type === 'ACTIVITY') mergedItems = [...adminService.getActivities()];
    else mergedItems = [...adminService.getTransfers()];

    // 2. Fetch Approved Partner Inventory
    const partnerItems = inventoryService.getApprovedItems(showAllLocations ? undefined : destinationId).filter(i => i.type === type);
    mergedItems = [...mergedItems, ...partnerItems];

    // 3. Filter by Destination ID (If NOT showing all)
    if (destinationId && !showAllLocations) {
        mergedItems = mergedItems.filter(i => {
            const itemDestId = i.destinationId || i.location_id; 
            return !itemDestId || itemDestId === destinationId;
        });
    }

    setItems(mergedItems);
  };

  if (!isOpen) return null;

  const handleAddItem = (item: any) => {
      const service: BuilderService = {
          id: `svc_${Date.now()}`,
          inventory_id: item.id,
          type: type,
          name: item.name || item.activityName || item.transferName,
          description: item.description,
          estimated_cost: item.cost || item.costAdult || item.costPrice || 0,
          currency: item.currency || 'INR',
          quantity: 1, 
          nights: type === 'HOTEL' ? 1 : undefined,
          meta: type === 'HOTEL' ? { roomType: item.roomType, mealPlan: item.mealPlan } : {}
      };
      onSelect(service);
      onClose();
  };

  const handleAddCustom = () => {
      if (!customItem.name) return;
      const service: BuilderService = {
          id: `cust_${Date.now()}`,
          type: 'CUSTOM', // Treated as custom type but categorized in UI by column
          name: customItem.name,
          description: customItem.desc || 'Custom Service',
          estimated_cost: Number(customItem.cost) || 0,
          currency: 'INR',
          quantity: 1,
          nights: type === 'HOTEL' ? 1 : undefined,
          meta: { originalType: type } // Track what it was intended as
      };
      onSelect(service);
      onClose();
  };

  const getCityName = (destId: string) => {
      const d = allDestinations.find(x => x.id === destId);
      return d ? d.city : 'General';
  };

  // Filter items based on search
  const filteredItems = items.filter(i => 
    (i.name || i.activityName || i.transferName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-xl w-full max-w-3xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800">
                {type === 'HOTEL' && <Hotel size={20} className="text-indigo-600"/>}
                {type === 'ACTIVITY' && <Camera size={20} className="text-pink-600"/>}
                {type === 'TRANSFER' && <Car size={20} className="text-blue-600"/>}
                Select {type}
            </h3>
            <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
        </div>
        
        <div className="p-4 bg-white border-b border-slate-100 space-y-3">
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                    <input 
                        type="text" 
                        placeholder={`Search ${type.toLowerCase()} inventory...`}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        autoFocus
                    />
                </div>
                <button 
                    onClick={() => setShowCustomForm(!showCustomForm)}
                    className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1 transition border ${showCustomForm ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                >
                    {showCustomForm ? <X size={14}/> : <Plus size={14}/>} Custom
                </button>
            </div>

            {/* Context & Filters */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-medium">Filter:</span>
                    <span className={`px-2 py-0.5 rounded flex items-center gap-1 border ${showAllLocations ? 'bg-white border-slate-300 text-slate-500' : 'bg-brand-50 border-brand-200 text-brand-700 font-bold'}`}>
                        <MapPin size={10} /> {destinationId && !showAllLocations ? getCityName(destinationId) : 'Current City'}
                    </span>
                    
                    <label className="flex items-center gap-1 cursor-pointer ml-2 hover:text-brand-600">
                        <input 
                            type="checkbox" 
                            checked={showAllLocations} 
                            onChange={e => setShowAllLocations(e.target.checked)} 
                            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                        <span>Show All Locations</span>
                    </label>
                </div>
                <span className="text-[10px] text-slate-400">
                    {filteredItems.length} items found
                </span>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            
            {/* Custom Item Form */}
            {showCustomForm && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 animate-in fade-in slide-in-from-top-2">
                    <h4 className="text-sm font-bold text-amber-900 mb-3 flex items-center gap-2">
                        <PenTool size={14} /> Create Custom {type} Item
                    </h4>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                        <div className="col-span-2">
                            <input 
                                type="text" 
                                placeholder="Item Name (e.g. Special Lunch)" 
                                className="w-full border border-amber-200 rounded p-2 text-sm focus:outline-none focus:border-amber-400"
                                value={customItem.name}
                                onChange={e => setCustomItem({...customItem, name: e.target.value})}
                            />
                        </div>
                        <div>
                             <input 
                                type="number" 
                                placeholder="Net Cost" 
                                className="w-full border border-amber-200 rounded p-2 text-sm focus:outline-none focus:border-amber-400"
                                value={customItem.cost}
                                onChange={e => setCustomItem({...customItem, cost: e.target.value})}
                            />
                        </div>
                        <div className="col-span-3">
                            <input 
                                type="text" 
                                placeholder="Short Description (Optional)" 
                                className="w-full border border-amber-200 rounded p-2 text-sm focus:outline-none focus:border-amber-400"
                                value={customItem.desc}
                                onChange={e => setCustomItem({...customItem, desc: e.target.value})}
                            />
                        </div>
                    </div>
                    <button 
                        onClick={handleAddCustom}
                        className="w-full bg-amber-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-amber-700 transition"
                    >
                        Add Custom Item
                    </button>
                </div>
            )}

            {filteredItems.map(item => {
                const name = item.name || item.activityName || item.transferName;
                const isPartner = !!item.operatorId;
                const cost = item.cost || item.costAdult || item.costPrice || 0;
                const locationName = getCityName(item.destinationId || item.location_id);
                
                // Check if already added to current day
                const isAdded = currentServices.some((s: any) => s.inventory_id === item.id);

                return (
                    <div key={item.id} className={`bg-white border rounded-xl p-3 flex justify-between items-center group cursor-default transition-all ${isAdded ? 'border-emerald-200 shadow-none bg-emerald-50/20' : 'border-slate-200 hover:border-brand-300 hover:shadow-md'}`}>
                        <div className="flex-1 pr-4">
                            <div className="flex items-center gap-2 mb-1">
                                {isAdded && (
                                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                                        <CheckCircle size={10} /> Added
                                    </span>
                                )}
                                <h4 className="font-bold text-slate-800 text-sm">{name}</h4>
                            </div>
                            
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-0.5">
                                    <MapPin size={8} /> {locationName}
                                </span>
                                {isPartner ? (
                                    <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-100 font-bold flex items-center gap-0.5" title="Partner/Operator Inventory">
                                        <User size={8} /> Partner
                                    </span>
                                ) : (
                                    <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 font-bold flex items-center gap-0.5" title="System Inventory">
                                        <ShieldCheck size={8} /> System
                                    </span>
                                )}
                            </div>
                            
                            <p className="text-xs text-slate-500 line-clamp-1 mb-2">{item.description || 'No description available'}</p>
                            
                            <div className="flex gap-2">
                                {type === 'HOTEL' && (
                                    <>
                                        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 font-medium">{item.roomType || 'Standard'}</span>
                                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">{item.mealPlan || 'RO'}</span>
                                    </>
                                )}
                                {type === 'TRANSFER' && (
                                    <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 font-medium">{item.vehicleType}</span>
                                )}
                            </div>
                        </div>
                        
                        <div className="text-right flex flex-col items-end gap-2 pl-4 border-l border-slate-100">
                            <span className="font-mono text-sm font-bold text-slate-700 block">{item.currency || 'INR'} {cost.toLocaleString()}</span>
                            <button 
                                onClick={() => handleAddItem(item)}
                                className={`${isAdded ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-900 hover:bg-brand-600'} text-white px-4 py-1.5 rounded-lg transition text-xs font-bold flex items-center gap-1 shadow-sm whitespace-nowrap`}
                            >
                                {isAdded ? 'Add Again' : <><Plus size={12} /> Add</>}
                            </button>
                        </div>
                    </div>
                );
            })}
            
            {filteredItems.length === 0 && !showCustomForm && (
                <div className="text-center py-12 text-slate-400 text-sm">
                    <p className="mb-4">No inventory found for this destination/search.</p>
                    <button 
                        onClick={() => setShowAllLocations(true)}
                        className="text-brand-600 hover:underline font-bold"
                    >
                        Browse All Locations
                    </button>
                    <span className="mx-2">or</span>
                    <button 
                        onClick={() => setShowCustomForm(true)}
                        className="text-brand-600 hover:underline font-bold"
                    >
                        Add Custom Item
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
