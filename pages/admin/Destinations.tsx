
import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { UserRole, Destination } from '../../types';
import { Edit2, Trash2, Plus, X, Map, Globe, Clock, Coins, Check, Search } from 'lucide-react';
import { InventoryImportExport } from '../../components/admin/InventoryImportExport';

export const Destinations: React.FC = () => {
  const { user } = useAuth();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDest, setEditingDest] = useState<Destination | null>(null);
  const [formData, setFormData] = useState<Partial<Destination>>({});
  const [search, setSearch] = useState('');

  const canEdit = user?.role === UserRole.ADMIN || user?.role === UserRole.STAFF || user?.role === UserRole.OPERATOR;
  
  useEffect(() => {
      loadDestinations();
  }, []);

  const loadDestinations = async () => {
      const data = await adminService.getDestinations();
      setDestinations(data);
  };

  const displayedDestinations = user?.role === UserRole.OPERATOR 
    ? destinations.filter(d => d.createdBy === user.id)
    : destinations;

  const filteredDestinations = displayedDestinations.filter(d => 
    d.city.toLowerCase().includes(search.toLowerCase()) || 
    d.country.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenModal = (dest?: Destination) => {
    if (dest) {
      setEditingDest(dest);
      setFormData(dest);
    } else {
      setEditingDest(null);
      setFormData({ isActive: true, currency: 'INR', timezone: 'GMT+5:30' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.city || !formData.country) return;

    await adminService.saveDestination({
      id: editingDest?.id || '', 
      country: formData.country!,
      city: formData.city!,
      currency: 'INR', 
      timezone: formData.timezone || 'GMT',
      isActive: formData.isActive || false,
      createdBy: editingDest?.createdBy || user?.id
    });

    loadDestinations();
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this destination?')) {
      await adminService.deleteDestination(id);
      loadDestinations();
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Destinations</h1>
          <p className="text-slate-500 mt-1">Configure countries and cities available for itineraries.</p>
        </div>
        {canEdit && (
            <div className="flex gap-3">
                <InventoryImportExport 
                    data={displayedDestinations}
                    headers={['id', 'city', 'country', 'currency', 'timezone', 'isActive']}
                    filename="destinations"
                    onImport={(data) => {
                         alert("Import processed");
                         loadDestinations();
                    }}
                />
                <button 
                    onClick={() => handleOpenModal()}
                    className="bg-brand-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-brand-700 transition shadow-lg shadow-brand-200 font-medium"
                >
                    <Plus size={20} /> Add Destination
                </button>
            </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Search city or country..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white shadow-sm transition-all"
                />
            </div>
        </div>

        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Location</th>
              <th className="px-6 py-4">Currency</th>
              <th className="px-6 py-4">Timezone</th>
              <th className="px-6 py-4">Status</th>
              {canEdit && <th className="px-6 py-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filteredDestinations.map((dest) => (
              <tr key={dest.id} className="hover:bg-brand-50/30 transition-colors">
                <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-brand-600 flex items-center justify-center border border-blue-100">
                            <Map size={18} />
                        </div>
                        <div>
                            <p className="font-bold text-slate-900 text-base">{dest.city}</p>
                            <p className="text-slate-500 text-xs flex items-center gap-1"><Globe size={10}/> {dest.country}</p>
                        </div>
                    </div>
                </td>
                <td className="px-6 py-4">
                    <span className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-700 font-bold border border-slate-200">{dest.currency}</span>
                </td>
                <td className="px-6 py-4 text-slate-600 flex items-center gap-2">
                    <Clock size={14} className="text-slate-400" /> {dest.timezone}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${dest.isActive ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                    {dest.isActive ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
                    {dest.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                {canEdit && (
                    <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleOpenModal(dest)} className="p-2 text-slate-500 hover:text-brand-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition shadow-sm">
                                <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDelete(dest.id)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition shadow-sm">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {filteredDestinations.length === 0 && (
            <div className="p-12 text-center text-slate-500 bg-slate-50/50">
                <Map size={48} className="mx-auto mb-3 text-slate-300 opacity-50" />
                <p className="font-medium">No destinations found matching your search.</p>
            </div>
        )}
      </div>

      {isModalOpen && canEdit && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-0 shadow-2xl overflow-hidden transform scale-100 transition-all">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900">{editingDest ? 'Edit Destination' : 'Add New Destination'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-5">
              
              <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">City Name</label>
                    <div className="relative">
                        <Map size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                        <input 
                        required
                        type="text" 
                        value={formData.city || ''}
                        onChange={e => setFormData({...formData, city: e.target.value})}
                        className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white text-slate-900 font-medium transition-all shadow-sm"
                        placeholder="e.g. Dubai"
                        />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Country</label>
                    <div className="relative">
                        <Globe size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                        <input 
                        required
                        type="text" 
                        value={formData.country || ''}
                        onChange={e => setFormData({...formData, country: e.target.value})}
                        className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white text-slate-900 font-medium transition-all shadow-sm"
                        placeholder="e.g. UAE"
                        />
                    </div>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Currency</label>
                  <div className="relative">
                    <Coins size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                    <div className="w-full pl-11 pr-4 py-3 border border-slate-200 bg-slate-50 rounded-xl font-bold text-slate-600">
                        INR
                    </div>
                  </div>
                </div>
                 <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Timezone</label>
                  <div className="relative">
                    <Clock size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                    <input 
                        type="text" 
                        value={formData.timezone || ''}
                        onChange={e => setFormData({...formData, timezone: e.target.value})}
                        placeholder="GMT+4"
                        className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none bg-white font-medium shadow-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition">
                    <div className="relative flex items-center">
                        <input 
                        type="checkbox" 
                        checked={formData.isActive || false}
                        onChange={e => setFormData({...formData, isActive: e.target.checked})}
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-slate-300 checked:bg-brand-600 checked:border-brand-600 transition-all"
                        />
                        <Check size={14} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" strokeWidth={4} />
                    </div>
                    <span className="font-bold text-slate-700">Destination Active</span>
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 text-slate-700 hover:bg-slate-100 rounded-xl font-bold border border-slate-200 transition">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 font-bold shadow-lg shadow-brand-200 transition transform hover:-translate-y-0.5">Save Destination</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
