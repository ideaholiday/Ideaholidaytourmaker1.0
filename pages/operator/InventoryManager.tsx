
import React, { useState, useEffect } from 'react';
import { inventoryService } from '../../services/inventoryService';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { OperatorInventoryItem, ActivityTransferOptions, Destination } from '../../types';
import { InventoryStatusBadge } from '../../components/inventory/InventoryStatusBadge';
import { Plus, Save, X, Box, GitBranch, DollarSign, Bus, Car, Ticket, Edit2, Trash2, Search, Filter } from 'lucide-react';

const DEFAULT_TRANSFER_OPTS: ActivityTransferOptions = {
    sic: { enabled: false, costPerPerson: 0 },
    pvt: { enabled: false, costPerVehicle: 0, vehicleCapacity: 4 }
};

export const InventoryManager: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<OperatorInventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OperatorInventoryItem | null>(null);
  const [formData, setFormData] = useState<Partial<OperatorInventoryItem>>({});
  const [transferOpts, setTransferOpts] = useState<ActivityTransferOptions>(DEFAULT_TRANSFER_OPTS);
  const [isSaving, setIsSaving] = useState(false);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'HOTEL' | 'ACTIVITY' | 'TRANSFER'>('ALL');

  useEffect(() => {
    const init = async () => {
        if (user) {
            setIsLoading(true);
            const [myItems, dests] = await Promise.all([
                inventoryService.getItemsByOperator(user.id),
                adminService.getDestinations()
            ]);
            setItems(myItems);
            setDestinations(dests.filter(d => d.isActive));
            setIsLoading(false);
        }
    };
    init();
  }, [user]);

  const refreshList = async () => {
      if(user) {
          const data = await inventoryService.getItemsByOperator(user.id);
          setItems(data);
      }
  };

  const handleOpenModal = (item?: OperatorInventoryItem) => {
      if (item) {
          // EDIT MODE
          setEditingItem(item);
          setFormData({ ...item });
          // Load complex nested state safely
          setTransferOpts(item.transferOptions || DEFAULT_TRANSFER_OPTS);
      } else {
          // CREATE MODE
          setEditingItem(null);
          setFormData({
              type: 'HOTEL',
              currency: 'INR',
              status: 'PENDING_APPROVAL',
              destinationId: destinations[0]?.id || ''
          });
          setTransferOpts(DEFAULT_TRANSFER_OPTS);
      }
      setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      
      setIsSaving(true);
      try {
          const payload = { ...formData };
          
          // Attach complex objects for Activity
          if (payload.type === 'ACTIVITY') {
              payload.transferOptions = transferOpts;
          }
          
          // Ensure Currency is INR (Project Standard)
          payload.currency = 'INR';

          if (editingItem) {
              await inventoryService.updateItem(editingItem.id, payload, user);
          } else {
              await inventoryService.createItem(payload, user);
          }
          
          setIsModalOpen(false);
          await refreshList();
      } catch (err: any) {
          alert("Error saving inventory: " + err.message);
      } finally {
          setIsSaving(false);
      }
  };

  const handleDelete = async (id: string) => {
      if(confirm("Are you sure? This will remove the item permanently.")) {
          // Assuming service has delete, if not we mark inactive
          // inventoryService.deleteItem(id); 
          alert("Deletion logic to be implemented in service.");
      }
  };

  const updateSic = (field: string, value: any) => {
      setTransferOpts(prev => ({ ...prev, sic: { ...prev.sic, [field]: value } }));
  };

  const updatePvt = (field: string, value: any) => {
      setTransferOpts(prev => ({ ...prev, pvt: { ...prev.pvt, [field]: value } }));
  };

  const filteredItems = items.filter(i => {
      const matchSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = typeFilter === 'ALL' || i.type === typeFilter;
      return matchSearch && matchType;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Box className="text-brand-600" /> Inventory Management
          </h1>
          <p className="text-slate-500">Manage your services, rates, and approval status.</p>
        </div>
        <button 
            onClick={() => handleOpenModal()}
            className="bg-brand-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-brand-700 transition shadow-lg shadow-brand-200 font-bold"
        >
            <Plus size={18} /> Add New Item
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input 
                  type="text" 
                  placeholder="Search your inventory..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              />
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg">
              {(['ALL', 'HOTEL', 'ACTIVITY', 'TRANSFER'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(type)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${typeFilter === type ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                      {type}
                  </button>
              ))}
          </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase text-xs">
            <tr>
              <th className="px-6 py-4 font-semibold">Service Name</th>
              <th className="px-6 py-4 font-semibold">Type</th>
              <th className="px-6 py-4 font-semibold">Pricing</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.map(item => (
              <tr key={item.id} className="hover:bg-slate-50 transition">
                <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 text-base">{item.name}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                        <GitBranch size={10} /> v{item.version}
                        <span className="text-slate-300">|</span>
                        {item.description ? item.description.substring(0, 40) + '...' : 'No description'}
                    </div>
                </td>
                <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold border ${
                        item.type === 'HOTEL' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                        item.type === 'ACTIVITY' ? 'bg-pink-50 text-pink-700 border-pink-100' :
                        'bg-blue-50 text-blue-700 border-blue-100'
                    }`}>
                        {item.type}
                    </span>
                </td>
                <td className="px-6 py-4 font-mono text-slate-700">
                    {item.currency} {item.type === 'ACTIVITY' ? item.costAdult : item.costPrice}
                    {item.type === 'ACTIVITY' && <span className="text-[10px] text-slate-400 block">Base Adult</span>}
                </td>
                <td className="px-6 py-4">
                    <InventoryStatusBadge status={item.status} reason={item.rejectionReason} />
                    {item.isCurrent && <span className="text-[9px] text-green-600 font-bold ml-1 uppercase tracking-wide">Live</span>}
                </td>
                <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                        <button 
                            onClick={() => handleOpenModal(item)}
                            className="p-2 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition"
                            title="Edit Item"
                        >
                            <Edit2 size={16} />
                        </button>
                        {item.status === 'DRAFT' || item.status === 'REJECTED' ? (
                            <button 
                                onClick={() => handleDelete(item.id)}
                                className="p-2 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition"
                                title="Delete"
                            >
                                <Trash2 size={16} />
                            </button>
                        ) : null}
                    </div>
                </td>
              </tr>
            ))}
            {filteredItems.length === 0 && (
                <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                        No inventory items found. Click "Add New Item" to start.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- ADD/EDIT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl max-w-2xl w-full p-0 shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-900">
                  {editingItem ? 'Edit Inventory Item' : 'Submit New Inventory'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1 overflow-y-auto">
                
                {/* 1. Common Fields */}
                <div className="grid grid-cols-2 gap-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Service Type</label>
                        <select 
                            className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-medium focus:ring-2 focus:ring-brand-500 outline-none"
                            value={formData.type}
                            onChange={e => setFormData({...formData, type: e.target.value as any})}
                            disabled={!!editingItem} // Cannot change type on edit
                        >
                            <option value="HOTEL">Hotel</option>
                            <option value="ACTIVITY">Activity / Tour</option>
                            <option value="TRANSFER">Transfer</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Destination</label>
                        <select 
                            className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                            value={formData.destinationId}
                            onChange={e => setFormData({...formData, destinationId: e.target.value})}
                            required
                        >
                            <option value="">Select City...</option>
                            {destinations.map(d => <option key={d.id} value={d.id}>{d.city}, {d.country}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Service Name</label>
                    <input 
                        required
                        type="text" 
                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none font-medium"
                        placeholder={formData.type === 'HOTEL' ? 'e.g. Marina Byblos Hotel' : 'e.g. Desert Safari'}
                        value={formData.name || ''}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                </div>

                {/* 2. Dynamic Type-Specific Fields */}
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                    
                    {/* A. ACTIVITY FORM */}
                    {formData.type === 'ACTIVITY' && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2 text-brand-700 font-bold text-sm">
                                <Ticket size={16} /> Activity Pricing (INR)
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Adult Price</label>
                                    <input required type="number" min="0" value={formData.costAdult} onChange={e => setFormData({...formData, costAdult: Number(e.target.value), costPrice: Number(e.target.value)})} className="w-full border border-slate-300 rounded-lg p-2 font-mono" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Child Price</label>
                                    <input required type="number" min="0" value={formData.costChild} onChange={e => setFormData({...formData, costChild: Number(e.target.value)})} className="w-full border border-slate-300 rounded-lg p-2 font-mono" />
                                </div>
                            </div>

                            <hr className="border-slate-200" />
                            
                            {/* Transfer Toggles */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                   <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                                       <input type="checkbox" checked={transferOpts.sic.enabled} onChange={e => updateSic('enabled', e.target.checked)} className="rounded text-brand-600 focus:ring-brand-500" />
                                       <Bus size={16} className="text-blue-500"/> Enable Shared Transfer (SIC)
                                   </label>
                                   {transferOpts.sic.enabled && (
                                       <div className="flex items-center gap-2">
                                           <span className="text-xs text-slate-500">Cost/Pax:</span>
                                           <input type="number" min="0" value={transferOpts.sic.costPerPerson} onChange={e => updateSic('costPerPerson', Number(e.target.value))} className="w-24 border border-slate-300 rounded p-1.5 font-mono text-sm" />
                                       </div>
                                   )}
                                </div>

                                <div className="flex items-center justify-between">
                                   <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                                       <input type="checkbox" checked={transferOpts.pvt.enabled} onChange={e => updatePvt('enabled', e.target.checked)} className="rounded text-brand-600 focus:ring-brand-500" />
                                       <Car size={16} className="text-purple-500"/> Enable Private Transfer (PVT)
                                   </label>
                                </div>
                                {transferOpts.pvt.enabled && (
                                    <div className="pl-6 grid grid-cols-2 gap-4 bg-white p-3 rounded-lg border border-slate-200">
                                        <div>
                                           <label className="block text-xs text-slate-500 mb-1">Cost Per Vehicle</label>
                                           <input type="number" min="0" value={transferOpts.pvt.costPerVehicle} onChange={e => updatePvt('costPerVehicle', Number(e.target.value))} className="w-full border border-slate-300 rounded p-1.5 font-mono text-sm" />
                                        </div>
                                        <div>
                                           <label className="block text-xs text-slate-500 mb-1">Vehicle Capacity</label>
                                           <input type="number" min="1" value={transferOpts.pvt.vehicleCapacity} onChange={e => updatePvt('vehicleCapacity', Number(e.target.value))} className="w-full border border-slate-300 rounded p-1.5 font-mono text-sm" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* B. TRANSFER FORM */}
                    {formData.type === 'TRANSFER' && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2 text-blue-700 font-bold text-sm">
                                <Car size={16} /> Fleet Details
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vehicle Type</label>
                                     <input required type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" placeholder="e.g. Toyota Innova" value={formData.vehicleType || ''} onChange={e => setFormData({...formData, vehicleType: e.target.value})} />
                                </div>
                                <div>
                                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Max Pax</label>
                                     <input required type="number" min="1" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" value={formData.maxPassengers || ''} onChange={e => setFormData({...formData, maxPassengers: Number(e.target.value)})} />
                                </div>
                                <div>
                                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Luggage Bags</label>
                                     <input required type="number" min="0" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" value={formData.luggageCapacity || ''} onChange={e => setFormData({...formData, luggageCapacity: Number(e.target.value)})} />
                                </div>
                                 <div className="col-span-2">
                                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cost Per Vehicle (INR)</label>
                                     <input required type="number" min="0" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-bold font-mono" value={formData.costPrice || ''} onChange={e => setFormData({...formData, costPrice: Number(e.target.value)})} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* C. HOTEL FORM */}
                    {formData.type === 'HOTEL' && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2 text-indigo-700 font-bold text-sm">
                                <DollarSign size={16} /> Hotel Rate
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Star Category</label>
                                    <select className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})}>
                                        <option>3 Star</option><option>4 Star</option><option>5 Star</option><option>Luxury</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Meal Plan</label>
                                    <select className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white" value={formData.mealPlan} onChange={e => setFormData({...formData, mealPlan: e.target.value as any})}>
                                        <option>RO</option><option>BB</option><option>HB</option><option>FB</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Net Cost Per Room (INR)</label>
                                    <input 
                                        required
                                        type="number" 
                                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-mono font-bold"
                                        placeholder="0.00"
                                        value={formData.costPrice || ''}
                                        onChange={e => setFormData({...formData, costPrice: Number(e.target.value)})}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. Description */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                    <textarea 
                        className="w-full border border-slate-300 p-2.5 rounded-lg h-24 resize-none text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                        placeholder="Key highlights, timings, or meeting points..."
                        value={formData.description || ''}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                    />
                </div>

            </form>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="px-5 py-2.5 text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg text-sm font-medium transition"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleSubmit} 
                    disabled={isSaving}
                    className="bg-brand-600 text-white px-8 py-2.5 rounded-lg hover:bg-brand-700 font-bold shadow-md transition flex items-center gap-2 disabled:opacity-70"
                >
                    <Save size={18} /> {isSaving ? 'Submitting...' : 'Submit for Approval'}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
