
import React, { useState } from 'react';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { UserRole, Destination } from '../../types';
import { Edit2, Trash2, Plus, X } from 'lucide-react';
import { InventoryImportExport } from '../../components/admin/InventoryImportExport';

export const Destinations: React.FC = () => {
  const { user } = useAuth();
  const [destinations, setDestinations] = useState<Destination[]>(adminService.getDestinations());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDest, setEditingDest] = useState<Destination | null>(null);
  const [formData, setFormData] = useState<Partial<Destination>>({});

  // Operators now have full access to manage destinations
  const canEdit = user?.role === UserRole.ADMIN || user?.role === UserRole.STAFF || user?.role === UserRole.OPERATOR;
  
  // Filter for Operators: Only see what they created. Admins/Staff see all.
  const displayedDestinations = user?.role === UserRole.OPERATOR 
    ? destinations.filter(d => d.createdBy === user.id)
    : destinations;

  const handleOpenModal = (dest?: Destination) => {
    if (dest) {
      setEditingDest(dest);
      setFormData(dest);
    } else {
      setEditingDest(null);
      setFormData({ isActive: true });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.city || !formData.country) return;

    adminService.saveDestination({
      id: editingDest?.id || '', 
      country: formData.country!,
      city: formData.city!,
      currency: formData.currency || 'USD',
      timezone: formData.timezone || 'GMT',
      isActive: formData.isActive || false,
      createdBy: editingDest?.createdBy || user?.id // Maintain owner on edit, assign current user on create
    });

    setDestinations(adminService.getDestinations());
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this destination?')) {
      adminService.deleteDestination(id);
      setDestinations(adminService.getDestinations());
    }
  };

  // Bulk Import Handler
  const handleBulkImport = (data: any[]) => {
      let count = 0;
      data.forEach(item => {
          if (item.city && item.country) {
              adminService.saveDestination({
                  id: item.id || '', // Update if ID exists, else create
                  city: item.city,
                  country: item.country,
                  currency: item.currency || 'USD',
                  timezone: item.timezone || 'GMT',
                  isActive: item.isActive === true || item.isActive === 'TRUE',
                  createdBy: user?.id
              });
              count++;
          }
      });
      alert(`Successfully processed ${count} destinations.`);
      setDestinations(adminService.getDestinations());
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Destination Management</h1>
          <p className="text-slate-500">Configure countries and cities available for itineraries.</p>
        </div>
        {canEdit && (
            <div className="flex gap-3">
                <InventoryImportExport 
                    data={displayedDestinations}
                    headers={['id', 'city', 'country', 'currency', 'timezone', 'isActive']}
                    filename="destinations"
                    onImport={handleBulkImport}
                />
                <button 
                    onClick={() => handleOpenModal()}
                    className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 transition shadow-sm"
                >
                    <Plus size={18} /> Add New
                </button>
            </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 font-semibold">City</th>
              <th className="px-6 py-4 font-semibold">Country</th>
              <th className="px-6 py-4 font-semibold">Currency</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              {canEdit && <th className="px-6 py-4 font-semibold text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {displayedDestinations.map((dest) => (
              <tr key={dest.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-900">{dest.city}</td>
                <td className="px-6 py-4 text-slate-600">{dest.country}</td>
                <td className="px-6 py-4 font-mono text-slate-500">{dest.currency}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${dest.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    {dest.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                {canEdit && (
                    <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenModal(dest)} className="p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition">
                        <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(dest.id)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                        <Trash2 size={16} />
                        </button>
                    </div>
                    </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {displayedDestinations.length === 0 && (
            <div className="p-8 text-center text-slate-500">
                {user?.role === UserRole.OPERATOR 
                    ? "You haven't added any destinations yet." 
                    : "No destinations found."}
            </div>
        )}
      </div>

      {isModalOpen && canEdit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-900">{editingDest ? 'Edit' : 'Add'} Destination</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">City Name</label>
                <input 
                  required
                  type="text" 
                  value={formData.city || ''}
                  onChange={e => setFormData({...formData, city: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                <input 
                  required
                  type="text" 
                  value={formData.country || ''}
                  onChange={e => setFormData({...formData, country: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                  <input 
                    type="text" 
                    value={formData.currency || ''}
                    onChange={e => setFormData({...formData, currency: e.target.value})}
                    placeholder="USD"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
                 <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
                  <input 
                    type="text" 
                    value={formData.timezone || ''}
                    onChange={e => setFormData({...formData, timezone: e.target.value})}
                    placeholder="GMT+4"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={formData.isActive || false}
                  onChange={e => setFormData({...formData, isActive: e.target.checked})}
                  id="isActive"
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <label htmlFor="isActive" className="text-sm text-slate-700">Destination Active</label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700">Save Destination</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};