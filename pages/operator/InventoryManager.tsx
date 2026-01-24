import React, { useState, useEffect } from 'react';
import { inventoryService } from '../../services/inventoryService';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { OperatorInventoryItem } from '../../types';
import { InventoryStatusBadge } from '../../components/inventory/InventoryStatusBadge';
import { Plus, Save, X, Box, GitBranch } from 'lucide-react';

export const InventoryManager: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<OperatorInventoryItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<OperatorInventoryItem>>({});
  
  // Destination options for dropdown
  const destinations = adminService.getDestinationsSync().filter(d => d.isActive);

  useEffect(() => {
    loadItems();
  }, [user]);

  const loadItems = async () => {
    if (user) {
        setItems(await inventoryService.getItemsByOperator(user.id));
    }
  };

  const handleOpenModal = () => {
      setFormData({
          type: 'HOTEL',
          currency: 'USD',
          status: 'PENDING_APPROVAL'
      });
      setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      
      try {
          inventoryService.createItem(formData, user);
          setIsModalOpen(false);
          loadItems();
          alert("Inventory submitted for approval!");
      } catch (err: any) {
          alert(err.message);
      }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Box className="text-brand-600" /> My Inventory
          </h1>
          <p className="text-slate-500">Submit your services for platform-wide distribution.</p>
        </div>
        <button 
            onClick={handleOpenModal}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 transition shadow-sm"
        >
            <Plus size={18} /> Add New Item
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 font-semibold">Service Name</th>
              <th className="px-6 py-4 font-semibold">Version</th>
              <th className="px-6 py-4 font-semibold">Type</th>
              <th className="px-6 py-4 font-semibold">Net Rate</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold">Submitted On</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-900">
                    {item.name}
                    <div className="text-xs text-slate-400 font-normal">{item.description}</div>
                </td>
                <td className="px-6 py-4">
                    <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-200 w-fit">
                        <GitBranch size={10} /> v{item.version}
                    </span>
                </td>
                <td className="px-6 py-4">
                    <span className="bg-slate-100 px-2 py-1 rounded text-xs font-mono">{item.type}</span>
                </td>
                <td className="px-6 py-4 font-mono">
                    {item.currency} {item.costPrice}
                </td>
                <td className="px-6 py-4">
                    <InventoryStatusBadge status={item.status} reason={item.rejectionReason} />
                    {item.isCurrent && <span className="text-[9px] text-green-600 font-bold ml-1">LIVE</span>}
                </td>
                <td className="px-6 py-4 text-slate-500">
                    {new Date(item.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
                <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        You haven't submitted any inventory yet.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-900">Submit New Inventory</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                        <select 
                            className="w-full border p-2 rounded-lg"
                            value={formData.type}
                            onChange={e => setFormData({...formData, type: e.target.value as any})}
                        >
                            <option value="HOTEL">Hotel</option>
                            <option value="ACTIVITY">Activity / Tour</option>
                            <option value="TRANSFER">Transfer</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Destination</label>
                        <select 
                            className="w-full border p-2 rounded-lg"
                            value={formData.destinationId}
                            onChange={e => setFormData({...formData, destinationId: e.target.value})}
                            required
                        >
                            <option value="">Select City</option>
                            {destinations.map(d => <option key={d.id} value={d.id}>{d.city}, {d.country}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Service Name</label>
                    <input 
                        required
                        type="text" 
                        className="w-full border p-2 rounded-lg"
                        placeholder="e.g. Grand City Tour"
                        value={formData.name || ''}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Net Cost</label>
                        <input 
                            required
                            type="number" 
                            className="w-full border p-2 rounded-lg"
                            placeholder="0.00"
                            value={formData.costPrice || ''}
                            onChange={e => setFormData({...formData, costPrice: Number(e.target.value)})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                        <input 
                            type="text" 
                            className="w-full border p-2 rounded-lg"
                            value={formData.currency}
                            readOnly
                        />
                    </div>
                </div>

                {formData.type === 'HOTEL' && (
                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                            <select className="w-full border p-2 rounded text-sm" onChange={e => setFormData({...formData, category: e.target.value as any})}>
                                <option>3 Star</option><option>4 Star</option><option>5 Star</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Meal Plan</label>
                            <select className="w-full border p-2 rounded text-sm" onChange={e => setFormData({...formData, mealPlan: e.target.value as any})}>
                                <option>RO</option><option>BB</option><option>HB</option>
                            </select>
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <textarea 
                        className="w-full border p-2 rounded-lg h-24 resize-none text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                        placeholder="Details about the service..."
                        value={formData.description || ''}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
                    <button type="submit" className="bg-brand-600 text-white px-6 py-2 rounded-lg hover:bg-brand-700 font-bold shadow-sm flex items-center gap-2">
                        <Save size={18} /> Submit
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};