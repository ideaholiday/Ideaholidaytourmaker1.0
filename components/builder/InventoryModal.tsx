
import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService'; 
import { inventoryService } from '../../services/inventoryService';
import { X, Search, Hotel, Camera, Car, Plus, ShieldCheck, User, MapPin, Globe, PenTool, CheckCircle, Image as ImageIcon, Loader2 } from 'lucide-react';
import { BuilderService } from './ItineraryBuilderContext';
import { ItineraryService } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: BuilderService) => void;
  dayId: string;
  type: 'HOTEL' | 'ACTIVITY' | 'TRANSFER';
  destinationId: string;
  currentServices?: (BuilderService | ItineraryService)[]; 
}

export const InventoryModal: React.FC<Props> = ({ isOpen, onClose, onSelect, type, destinationId, currentServices = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [allDestinations, setAllDestinations] = useState<any[]>([]);
  const [showAllLocations, setShowAllLocations] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Custom Form State
  const [customItem, setCustomItem] = useState({ name: '', cost: '', desc: '', imageUrl: '' });

  useEffect(() => {
    if (isOpen) {
        loadItems();
    }
  }, [isOpen, type, destinationId, showAllLocations]);

  const loadItems = async () => {
    setLoading(true);
    try {
        // Ensure destinations are loaded for mapping
        const dests = await adminService.getDestinations();
        setAllDestinations(dests);

        let mergedItems: any[] = [];

        // 1. Fetch System Inventory (Async to ensure data)
        let systemItems: any[] = [];
        if (type === 'HOTEL') systemItems = await adminService.getHotels();
        else if (type === 'ACTIVITY') systemItems = await adminService.getActivities();
        else systemItems = await adminService.getTransfers();
        
        mergedItems = [...systemItems];

        // 2. Fetch Approved Partner Inventory
        // Ensure inventory is synced before filtering
        const allItems = await inventoryService.getAllItems();
        if (allItems.length === 0) {
            await inventoryService.syncFromCloud();
        }

        const partnerItems = (await inventoryService.getApprovedItems()).filter(i => i.type === type);
        mergedItems = [...mergedItems, ...partnerItems];

        // 3. Filter by Destination ID (Strictly enforce city suggestions)
        if (destinationId && !showAllLocations) {
            mergedItems = mergedItems.filter(i => {
                const itemDestId = i.destinationId || i.location_id; 
                return itemDestId === destinationId;
            });
        }

        setItems(mergedItems);
    } catch (e) {
        console.error("Failed to load inventory", e);
    } finally {
        setLoading(false);
    }
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
          meta: type === 'HOTEL' ? { roomType: item.roomType, mealPlan: item.mealPlan, imageUrl: item.imageUrl } : { imageUrl: item.imageUrl }
      };
      onSelect(service);
      // We don't close immediately to allow adding multiple items
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
          meta: { originalType: type, imageUrl: customItem.imageUrl } 
      };
      onSelect(service);
      setCustomItem({ name: '', cost: '', desc: '', imageUrl: '' }); // Reset form
      setShowCustomForm(false);
  };

  const getCityName = (destId: string) => {
      const d = allDestinations.find(x => x.id === destId);
      return d ? d.city : 'General';
  };

  const filteredItems = items.filter(i => 
    (i.name || i.activityName || i.transferName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                    {destinationId ? `Showing items for ${getCityName(destinationId)}` : 'Select items from inventory'}
                </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition"><X size={20} className="text-slate-500"/></button>
        </div>
        
        {/* Filters & Search */}
        <div className="p-4 bg-white border-b border-slate-100 space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                    <input 
                        type="text" 
                        placeholder={`Search by name, tags or description...`}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm shadow-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        autoFocus
                    />
                </div>
                <div className="flex gap-2">
                    <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium cursor-pointer transition select-none ${showAllLocations ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                        <Globe size={16} />
                        <input 
                            type="checkbox" 
                            className="hidden"
                            checked={showAllLocations} 
                            onChange={e => setShowAllLocations(e.target.checked)} 
                        />
                        All Cities
                    </label>
                    <button 
                        onClick={() => setShowCustomForm(!showCustomForm)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition border ${showCustomForm ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                    >
                        {showCustomForm ? <X size={16}/> : <PenTool size={16}/>} Custom
                    </button>
                </div>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
            
            {/* Custom Item Form */}
            {showCustomForm && (
                <div className="bg-white border border-brand-100 shadow-md rounded-2xl p-5 mb-6 animate-in fade-in slide-in-from-top-2">
                    <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <PenTool size={14} className="text-brand-600"/> Create Custom Item
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Item Name</label>
                            <input 
                                type="text" 
                                placeholder="e.g. Special Gala Dinner" 
                                className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                value={customItem.name}
                                onChange={e => setCustomItem({...customItem, name: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Net Cost (INR)</label>
                             <input 
                                type="number" 
                                placeholder="0.00" 
                                className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                value={customItem.cost}
                                onChange={e => setCustomItem({...customItem, cost: e.target.value})}
                            />
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Image URL</label>
                             <input 
                                type="text" 
                                placeholder="https://..." 
                                className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                value={customItem.imageUrl}
                                onChange={e => setCustomItem({...customItem, imageUrl: e.target.value})}
                            />
                        </div>
                        <div className="md:col-span-4">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                            <input 
                                type="text" 
                                placeholder="Short details..." 
                                className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                value={customItem.desc}
                                onChange={e => setCustomItem({...customItem, desc: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button 
                            onClick={handleAddCustom}
                            className="bg-slate-900 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 transition shadow-sm"
                        >
                            Add Custom Item
                        </button>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Loader2 size={32} className="animate-spin mb-4 text-brand-600" />
                    <p className="text-sm font-medium">Loading inventory...</p>
                </div>
            ) : (
                <>
                    {/* Inventory List Grid */}
                    <div className="grid grid-cols-1 gap-3">
                        {filteredItems.map(item => {
                            const name = item.name || item.activityName || item.transferName;
                            const isPartner = !!item.operatorId;
                            const cost = item.cost || item.costAdult || item.costPrice || 0;
                            const locationName = getCityName(item.destinationId || item.location_id);
                            const image = item.imageUrl;
                            
                            // Check if already added
                            const isAdded = currentServices.some((s: any) => s.inventory_id === item.id);

                            return (
                                <div key={item.id} className={`group flex flex-col md:flex-row bg-white border rounded-xl overflow-hidden transition-all duration-200 ${isAdded ? 'border-emerald-300 ring-1 ring-emerald-100' : 'border-slate-200 hover:border-brand-300 hover:shadow-md'}`}>
                                    {/* Image Section */}
                                    <div className="w-full md:w-32 h-32 md:h-auto bg-slate-100 shrink-0 relative overflow-hidden">
                                        {image ? (
                                            <img src={image} alt={name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                <ImageIcon size={24} />
                                            </div>
                                        )}
                                        {isAdded && (
                                            <div className="absolute inset-0 bg-emerald-900/60 flex items-center justify-center backdrop-blur-[2px]">
                                                <span className="text-white font-bold text-xs flex items-center gap-1"><CheckCircle size={14} /> Added</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Details Section */}
                                    <div className="flex-1 p-4 flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className="font-bold text-slate-800 text-base">{name}</h4>
                                                <div className="flex gap-1 shrink-0 ml-2">
                                                    {isPartner ? (
                                                        <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-100 font-bold flex items-center gap-1">
                                                            <User size={10} /> Partner
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 font-bold flex items-center gap-1">
                                                            <ShieldCheck size={10} /> System
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
                                                        <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{item.roomType || 'Standard'}</span>
                                                        <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{item.mealPlan || 'RO'}</span>
                                                    </>
                                                )}
                                            </div>
                                            
                                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                                {item.description || 'No detailed description available for this item.'}
                                            </p>
                                        </div>

                                        <div className="flex justify-between items-end mt-4 pt-3 border-t border-slate-50">
                                            <div className="text-left">
                                                <p className="text-[10px] text-slate-400 uppercase font-bold">Net Cost</p>
                                                <p className="font-mono text-base font-bold text-slate-700">{item.currency || 'INR'} {cost.toLocaleString()}</p>
                                            </div>
                                            
                                            <button 
                                                onClick={() => handleAddItem(item)}
                                                className={`${isAdded ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' : 'bg-slate-900 text-white hover:bg-brand-600 shadow-md'} px-5 py-2 rounded-lg transition text-xs font-bold flex items-center gap-1.5`}
                                            >
                                                {isAdded ? <><CheckCircle size={14} /> Added</> : <><Plus size={14} /> Add to Day</>}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    {filteredItems.length === 0 && !showCustomForm && (
                        <div className="text-center py-16">
                            <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search size={32} className="text-slate-400" />
                            </div>
                            <h3 className="text-slate-900 font-bold mb-1">No items found for this city</h3>
                            <p className="text-slate-500 text-sm mb-6">Try browsing all locations or add a custom item.</p>
                            <div className="flex justify-center gap-3">
                                <button 
                                    onClick={() => setShowAllLocations(true)}
                                    className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                                >
                                    Browse All Locations
                                </button>
                                <button 
                                    onClick={() => setShowCustomForm(true)}
                                    className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition"
                                >
                                    Create Custom Item
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
      </div>
    </div>
  );
};
