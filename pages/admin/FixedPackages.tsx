import React, { useState, useEffect, useMemo } from 'react';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { UserRole, FixedPackage } from '../../types';
import { Edit2, Trash2, Plus, X, Package, Calendar, Image as ImageIcon, Tag } from 'lucide-react';

export const FixedPackages: React.FC = () => {
  const { user } = useAuth();
  const allDestinations = adminService.getDestinationsSync();
  const [allPackages, setAllPackages] = useState<FixedPackage[]>([]);

  useEffect(() => {
      refreshData();
  }, []);

  const refreshData = async () => {
      const data = await adminService.getFixedPackages();
      setAllPackages(data);
  };
  
  // Operators now have full access
  const canEdit = user?.role === UserRole.ADMIN || user?.role === UserRole.STAFF || user?.role === UserRole.OPERATOR;

  // Filter for Operators: Only see what they created. Admins/Staff see all.
  const displayedPackages = useMemo(() => {
      return user?.role === UserRole.OPERATOR 
        ? allPackages.filter(p => p.createdBy === user.id)
        : allPackages;
  }, [allPackages, user]);

  const [packages, setPackages] = useState<FixedPackage[]>(displayedPackages);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<FixedPackage | null>(null);
  
  // Update local state
  useEffect(() => {
      setPackages(displayedPackages);
  }, [displayedPackages]);

  // Temporary state for form handling (string arrays handled as text areas)
  const [formData, setFormData] = useState<Partial<FixedPackage> & { 
      inclusionsText: string; 
      exclusionsText: string;
      datesText: string;
  }>({ inclusionsText: '', exclusionsText: '', datesText: '' });

  const handleOpenModal = (pkg?: FixedPackage) => {
    if (pkg) {
      setEditingPkg(pkg);
      setFormData({
        ...pkg,
        inclusionsText: pkg.inclusions.join('\n'),
        exclusionsText: pkg.exclusions.join('\n'),
        datesText: pkg.validDates.join(', ')
      });
    } else {
      setEditingPkg(null);
      setFormData({ 
        isActive: true,
        destinationId: allDestinations[0]?.id || '',
        packageName: '',
        category: 'Leisure',
        nights: 3,
        fixedPrice: 0,
        description: '',
        imageUrl: '',
        inclusionsText: '',
        exclusionsText: '',
        datesText: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.packageName || !formData.destinationId) return;

    // Parse text areas
    const inclusions = formData.inclusionsText.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    const exclusions = formData.exclusionsText.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    const validDates = formData.datesText.split(',').map(s => s.trim()).filter(s => s.length > 0);

    await adminService.saveFixedPackage({
      id: editingPkg?.id || '',
      packageName: formData.packageName!,
      destinationId: formData.destinationId!,
      nights: Number(formData.nights),
      fixedPrice: Number(formData.fixedPrice),
      inclusions,
      exclusions,
      validDates,
      description: formData.description,
      imageUrl: formData.imageUrl,
      category: formData.category,
      isActive: formData.isActive || false,
      createdBy: editingPkg?.createdBy || user?.id
    });

    await refreshData();
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this package?')) {
      await adminService.deleteFixedPackage(id);
      await refreshData();
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fixed Departure Packages</h1>
          <p className="text-slate-500">Manage ready-to-book group departures and fixed itineraries.</p>
        </div>
        {canEdit && (
            <button onClick={() => handleOpenModal()} className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 transition">
            <Plus size={18} /> Add Package
            </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 font-semibold">Package Name</th>
              <th className="px-6 py-4 font-semibold">Destination</th>
              <th className="px-6 py-4 font-semibold">Category</th>
              <th className="px-6 py-4 font-semibold">Nights</th>
              <th className="px-6 py-4 font-semibold">Price</th>
              <th className="px-6 py-4 font-semibold">Next Date</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              {canEdit && <th className="px-6 py-4 font-semibold text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {packages.map((pkg) => {
              const dest = allDestinations.find(d => d.id === pkg.destinationId);
              // Simple sort for next date
              const nextDate = pkg.validDates
                  .map(d => new Date(d))
                  .sort((a,b) => a.getTime() - b.getTime())
                  .find(d => d.getTime() >= new Date().setHours(0,0,0,0)) 
                  || (pkg.validDates.length > 0 ? new Date(pkg.validDates[pkg.validDates.length - 1]) : null);

              return (
                <tr key={pkg.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      <Package size={16} className="text-slate-400" />
                      {pkg.packageName}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{dest?.city}</td>
                  <td className="px-6 py-4 text-slate-600">
                      {pkg.category ? <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">{pkg.category}</span> : '-'}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{pkg.nights}N</td>
                  <td className="px-6 py-4 font-mono text-slate-900">
                    {pkg.fixedPrice}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                     {nextDate ? nextDate.toISOString().split('T')[0] : <span className="text-slate-400 text-xs">Expired/None</span>}
                     {pkg.validDates.length > 1 && <span className="text-xs text-slate-400 ml-1">(+{pkg.validDates.length - 1})</span>}
                  </td>
                  <td className="px-6 py-4">
                     <span className={`px-2 py-1 rounded-full text-xs font-semibold ${pkg.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                      {pkg.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-6 py-4 text-right">
                        <button onClick={() => handleOpenModal(pkg)} className="p-2 text-slate-500 hover:text-brand-600 transition">
                        <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(pkg.id)} className="p-2 text-slate-500 hover:text-red-600 transition ml-2">
                        <Trash2 size={16} />
                        </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {packages.length === 0 && (
          <div className="p-8 text-center text-slate-500">
             {user?.role === UserRole.OPERATOR 
                    ? "You haven't added any packages yet." 
                    : "No fixed packages configured."}
          </div>
        )}
      </div>

      {isModalOpen && canEdit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-900">{editingPkg ? 'Edit' : 'Add'} Fixed Package</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Package Name</label>
                    <input required type="text" value={formData.packageName || ''} onChange={e => setFormData({...formData, packageName: e.target.value})} className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" placeholder="e.g. Dubai Super Saver" />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Destination</label>
                    <select value={formData.destinationId} onChange={e => setFormData({...formData, destinationId: e.target.value})} className="w-full border p-2 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none">
                    {allDestinations.map(d => <option key={d.id} value={d.id}>{d.city}, {d.country}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                    <div className="relative">
                        <Tag size={16} className="absolute left-3 top-2.5 text-slate-400" />
                        <input type="text" value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full pl-9 border p-2 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" placeholder="e.g. Honeymoon, Budget" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Duration (Nights)</label>
                    <input required type="number" min="1" value={formData.nights || ''} onChange={e => setFormData({...formData, nights: Number(e.target.value)})} className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Fixed Price</label>
                    <input required type="number" min="0" value={formData.fixedPrice || ''} onChange={e => setFormData({...formData, fixedPrice: Number(e.target.value)})} className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                </div>
              </div>

              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                 <textarea 
                    rows={2}
                    className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                    placeholder="Brief summary of the package..."
                    value={formData.description || ''}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                 />
              </div>

              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Image URL</label>
                 <div className="relative">
                    <ImageIcon size={16} className="absolute left-3 top-2.5 text-slate-400" />
                    <input 
                        type="text" 
                        value={formData.imageUrl || ''} 
                        onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                        className="w-full pl-9 border p-2 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                        placeholder="https://..."
                    />
                 </div>
              </div>

              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Departure Dates (Comma Separated YYYY-MM-DD)</label>
                 <input 
                    type="text" 
                    placeholder="2023-10-15, 2023-11-20"
                    value={formData.datesText}
                    onChange={e => setFormData({...formData, datesText: e.target.value})}
                    className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none font-mono"
                 />
                 <p className="text-xs text-slate-400 mt-1">Example: 2023-11-15, 2023-12-01</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Inclusions (One per line)</label>
                    <textarea 
                    rows={4}
                    value={formData.inclusionsText} 
                    onChange={e => setFormData({...formData, inclusionsText: e.target.value})} 
                    className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                    placeholder="Accommodation&#10;Breakfast&#10;Transfers"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Exclusions (One per line)</label>
                    <textarea 
                    rows={4}
                    value={formData.exclusionsText} 
                    onChange={e => setFormData({...formData, exclusionsText: e.target.value})} 
                    className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                    placeholder="Flight Tickets&#10;Visa Cost"
                    />
                </div>
              </div>

              <div>
                 <div className="flex items-center gap-2 mt-2">
                    <input type="checkbox" checked={formData.isActive || false} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="rounded text-brand-600 focus:ring-brand-500" />
                    <span className="text-sm text-slate-700">Package Active</span>
                 </div>
              </div>

              <div className="pt-4 border-t flex justify-end gap-3">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                 <button type="submit" className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700">Save Package</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};