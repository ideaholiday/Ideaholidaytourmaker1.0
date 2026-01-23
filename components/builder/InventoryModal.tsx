
import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService'; 
import { inventoryService } from '../../services/inventoryService';
import { X, Search, Hotel, Camera, Car, Plus, ShieldCheck, User, MapPin } from 'lucide-react';
import { BuilderService } from './ItineraryBuilderContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: BuilderService) => void;
  dayId: string;
  type: 'HOTEL' | 'ACTIVITY' | 'TRANSFER';
  destinationId: string;
}

export const InventoryModal: React.FC<Props> = ({ isOpen, onClose, onSelect, type, destinationId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [allDestinations, setAllDestinations] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
        setAllDestinations(adminService.getDestinations());

        let mergedItems: any[] = [];

        // 1. Fetch System Inventory (Admin Created - Implicitly Approved)
        // These are always visible as per "only admin inventory... like destination, hotel, sightseeing, transfer"
        if (type === 'HOTEL') mergedItems = [...adminService.getHotels()];
        else if (type === 'ACTIVITY') mergedItems = [...adminService.getActivities()];
        else mergedItems = [...adminService.getTransfers()];

        // 2. Fetch Approved Partner Inventory
        // Rule: Only include Partner items if type is HOTEL (Hotel Partners). 
        // Operators (Activities/Transfers) are excluded from general builder search.
        if (type === 'HOTEL') {
            const partnerItems = inventoryService.getApprovedItems(destinationId).filter(i => i.type === type);
            mergedItems = [...mergedItems, ...partnerItems];
        }

        // 3. Filter by Destination ID matches
        if (destinationId) {
            mergedItems = mergedItems.filter(i => i.destinationId === destinationId);
        }

        setItems(mergedItems);
    }
  }, [isOpen, type, destinationId]);

  if (!isOpen) return null;

  const handleAddItem = (item: any) => {
      const isPartner = !!item.operatorId;

      const service: BuilderService = {
          id: `svc_${Date.now()}`,
          inventory_id: item.id,
          type: type,
          name: item.name || item.activityName || item.transferName,
          description: item.description, // Immutable description
          estimated_cost: item.cost || item.costAdult || item.costPrice || 0, // Visual only
          currency: item.currency || 'USD',
          quantity: 1, 
          nights: type === 'HOTEL' ? 1 : undefined,
          meta: type === 'HOTEL' ? { roomType: item.roomType, mealPlan: item.mealPlan } : {}
      };
      onSelect(service);
      onClose();
  };

  const getCityName = (destId: string) => {
      const d = allDestinations.find(x => x.id === destId);
      return d ? d.city : 'General';
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
            <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800">
                {type === 'HOTEL' && <Hotel size={20} className="text-indigo-600"/>}
                {type === 'ACTIVITY' && <Camera size={20} className="text-pink-600"/>}
                {type === 'TRANSFER' && <Car size={20} className="text-blue-600"/>}
                Select {type}
            </h3>
            <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
        </div>
        
        <div className="p-4 bg-white border-b border-slate-100">
            <div className="relative">
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
            {/* Context Badge */}
            {destinationId && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="font-medium">Filter:</span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1 text-slate-700 font-bold border border-slate-200">
                        <MapPin size={10} /> {getCityName(destinationId)}
                    </span>
                    <span className="ml-auto text-[10px] text-slate-400">
                        {type === 'HOTEL' ? 'Showing Admin & Partner Hotels' : 'Showing Admin Inventory Only'}
                    </span>
                </div>
            )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            {items.filter(i => (i.name || i.activityName || i.transferName).toLowerCase().includes(searchTerm.toLowerCase())).map(item => {
                const name = item.name || item.activityName || item.transferName;
                const isPartner = !!item.operatorId;
                const cost = item.cost || item.costAdult || item.costPrice || 0;
                const locationName = getCityName(item.destinationId);

                return (
                    <div key={item.id} className="bg-white border border-slate-200 rounded-lg p-3 hover:border-brand-300 hover:shadow-md transition flex justify-between items-center group cursor-default">
                        <div className="flex-1 pr-4">
                            <div className="flex items-start justify-between mb-1">
                                <h4 className="font-bold text-slate-800 text-sm">{name}</h4>
                            </div>
                            
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-0.5">
                                    <MapPin size={8} /> {locationName}
                                </span>
                                {isPartner ? (
                                    <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-100 font-bold flex items-center gap-0.5" title="Partner Inventory">
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
                            <span className="font-mono text-sm font-bold text-slate-700 block">{item.currency || 'USD'} {cost.toLocaleString()}</span>
                            <button 
                                onClick={() => handleAddItem(item)}
                                className="bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-brand-600 transition text-xs font-bold flex items-center gap-1 shadow-sm whitespace-nowrap"
                            >
                                <Plus size={12} /> Add
                            </button>
                        </div>
                    </div>
                );
            })}
            
            {items.length === 0 && (
                <div className="text-center py-12 text-slate-400 text-sm">
                    <p>No inventory found for this destination.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
