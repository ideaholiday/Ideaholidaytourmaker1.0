
import React, { useState, useEffect, useMemo } from 'react';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { UserRole, Visa } from '../../types';
import { Edit2, Trash2, Plus, X, FileText, CheckCircle, Clock, BookOpen, AlertCircle } from 'lucide-react';

export const VisaPage: React.FC = () => {
  const { user } = useAuth();
  const [allVisas, setAllVisas] = useState<Visa[]>([]);
  
  useEffect(() => {
      refreshData();
  }, []);

  const refreshData = async () => {
      const data = await adminService.getVisas();
      setAllVisas(data);
  };
  
  // Operators now have full access
  const canEdit = user?.role === UserRole.ADMIN || user?.role === UserRole.STAFF || user?.role === UserRole.OPERATOR;
  
  // Agents should NOT see the Cost Price (Net Rate)
  const showCost = user?.role !== UserRole.AGENT;

  // Filter for Operators: Only see what they created. Admins/Staff see all.
  const displayedVisas = useMemo(() => {
      return user?.role === UserRole.OPERATOR 
        ? allVisas.filter(v => v.createdBy === user.id)
        : allVisas;
  }, [allVisas, user]);

  const [visas, setVisas] = useState<Visa[]>(displayedVisas);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVisa, setEditingVisa] = useState<Visa | null>(null);
  
  // Update local state when source changes
  useEffect(() => {
      setVisas(displayedVisas);
  }, [displayedVisas]);
  
  // For the form, we will handle documents as a newline separated string
  const [formData, setFormData] = useState<Partial<Visa> & { documentsText: string }>({ documentsText: '' });

  const handleOpenModal = (visa?: Visa) => {
    if (visa) {
      setEditingVisa(visa);
      setFormData({
        ...visa,
        documentsText: visa.documentsRequired.join('\n')
      });
    } else {
      setEditingVisa(null);
      setFormData({ 
        isActive: true,
        country: '',
        visaType: '',
        processingTime: '',
        cost: 0,
        validity: '30 Days',
        entryType: 'Single',
        description: '',
        documentsText: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.country || !formData.visaType) return;

    // Split text area by new lines and filter empty strings
    const docs = formData.documentsText.split('\n').map(s => s.trim()).filter(s => s.length > 0);

    await adminService.saveVisa({
      id: editingVisa?.id || '',
      country: formData.country!,
      visaType: formData.visaType!,
      processingTime: formData.processingTime || 'TBD',
      cost: Number(formData.cost),
      validity: formData.validity,
      entryType: formData.entryType,
      description: formData.description,
      documentsRequired: docs,
      isActive: formData.isActive || false,
      createdBy: editingVisa?.createdBy || user?.id
    });

    await refreshData();
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this visa configuration?')) {
      await adminService.deleteVisa(id);
      await refreshData();
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Visa Requirements</h1>
          <p className="text-slate-500">Manage visa costs, processing times, and document lists.</p>
        </div>
        {canEdit && (
            <button onClick={() => handleOpenModal()} className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 transition">
            <Plus size={18} /> Add Visa Info
            </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 font-semibold">Country</th>
              <th className="px-6 py-4 font-semibold">Visa Type</th>
              <th className="px-6 py-4 font-semibold">Details</th>
              <th className="px-6 py-4 font-semibold">Processing</th>
              {showCost && <th className="px-6 py-4 font-semibold">Cost</th>}
              <th className="px-6 py-4 font-semibold">Status</th>
              {canEdit && <th className="px-6 py-4 font-semibold text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visas.map((visa) => (
              <tr key={visa.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-900">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-slate-400" />
                    {visa.country}
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600">
                    <span className="font-medium text-slate-800">{visa.visaType}</span>
                    <div className="text-xs text-slate-400">{visa.entryType || 'Single'} Entry</div>
                </td>
                <td className="px-6 py-4 text-slate-600">
                    <div className="flex flex-col gap-1 text-xs">
                        {visa.validity && <span className="flex items-center gap-1"><Clock size={10}/> {visa.validity}</span>}
                        <span className="flex items-center gap-1"><BookOpen size={10}/> {visa.documentsRequired.length} Docs</span>
                    </div>
                </td>
                <td className="px-6 py-4 text-slate-600">{visa.processingTime}</td>
                {showCost && <td className="px-6 py-4 font-mono text-slate-900">{visa.cost}</td>}
                <td className="px-6 py-4">
                   <span className={`px-2 py-1 rounded-full text-xs font-semibold ${visa.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    {visa.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                {canEdit && (
                    <td className="px-6 py-4 text-right">
                    <button onClick={() => handleOpenModal(visa)} className="p-2 text-slate-500 hover:text-brand-600 transition">
                        <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(visa.id)} className="p-2 text-slate-500 hover:text-red-600 transition ml-2">
                        <Trash2 size={16} />
                    </button>
                    </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {visas.length === 0 && (
          <div className="p-8 text-center text-slate-500">
              {user?.role === UserRole.OPERATOR 
                    ? "You haven't added any visa info yet." 
                    : "No visa information configured."}
          </div>
        )}
      </div>

      {isModalOpen && canEdit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-900">{editingVisa ? 'Edit' : 'Add'} Visa Requirement</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                <input required type="text" value={formData.country || ''} onChange={e => setFormData({...formData, country: e.target.value})} className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" placeholder="e.g. UAE" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Visa Type</label>
                <input required type="text" value={formData.visaType || ''} onChange={e => setFormData({...formData, visaType: e.target.value})} className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" placeholder="e.g. Tourist 30 Days" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Validity (Stay Period)</label>
                <input type="text" value={formData.validity || ''} onChange={e => setFormData({...formData, validity: e.target.value})} className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" placeholder="e.g. 30 Days" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Entry Type</label>
                <select value={formData.entryType} onChange={e => setFormData({...formData, entryType: e.target.value as any})} className="w-full border p-2 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none">
                    <option value="Single">Single Entry</option>
                    <option value="Double">Double Entry</option>
                    <option value="Multiple">Multiple Entry</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Processing Time</label>
                <input required type="text" value={formData.processingTime || ''} onChange={e => setFormData({...formData, processingTime: e.target.value})} className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" placeholder="e.g. 3-4 Working Days" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cost</label>
                <input required type="number" min="0" value={formData.cost || ''} onChange={e => setFormData({...formData, cost: Number(e.target.value)})} className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Description / Notes</label>
                <textarea 
                  rows={2}
                  value={formData.description || ''} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                  placeholder="Additional details..."
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Documents Required (One per line)</label>
                <textarea 
                  rows={4}
                  value={formData.documentsText} 
                  onChange={e => setFormData({...formData, documentsText: e.target.value})} 
                  className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  placeholder="Passport Copy&#10;Passport Size Photo&#10;Confirmed Ticket"
                />
              </div>

              <div className="col-span-2 flex gap-6 pt-2">
                 <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.isActive || false} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="rounded text-brand-600 focus:ring-brand-500" />
                    <span className="text-sm text-slate-700">Active</span>
                 </label>
              </div>

              <div className="col-span-2 pt-4 border-t flex justify-end gap-3">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                 <button type="submit" className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700">Save Visa</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
