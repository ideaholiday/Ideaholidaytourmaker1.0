
import React, { useState, useMemo } from 'react';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { UserRole, Activity } from '../../types';
import { Edit2, Trash2, Plus, X, Camera, Clock, Image as ImageIcon, Search, ArrowUpDown, CheckSquare, Square, MapPin, Calendar, DollarSign, Check } from 'lucide-react';
import { InventoryImportExport } from '../../components/admin/InventoryImportExport';

export const Sightseeing: React.FC = () => {
  const { user } = useAuth();
  const allDestinations = adminService.getDestinations();
  const allActivities = adminService.getActivities();
  
  const canEdit = user?.role === UserRole.ADMIN || user?.role === UserRole.STAFF || user?.role === UserRole.OPERATOR;
  const showCost = user?.role !== UserRole.AGENT;

  const displayedActivities = user?.role === UserRole.OPERATOR 
    ? allActivities.filter(a => a.createdBy === user.id)
    : allActivities;

  const [activities, setActivities] = useState<Activity[]>(displayedActivities);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [filterDest, setFilterDest] = useState('ALL');
  const [filterSeason, setFilterSeason] = useState('ALL');
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<Partial<Activity>>({});

  const handleOpenModal = (activity?: Activity) => {
    if (activity) {
      setEditingActivity(activity);
      setFormData(activity);
    } else {
      setEditingActivity(null);
      setFormData({ 
        isActive: true,
        destinationId: allDestinations[0]?.id || '',
        activityType: 'City Tour',
        ticketIncluded: false,
        transferIncluded: false,
        costAdult: 0,
        costChild: 0,
        currency: 'USD',
        description: '',
        duration: '4 Hours',
        startTime: 'Flexible',
        season: 'All Year',
        validFrom: new Date().toISOString().split('T')[0],
        validTo: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.activityName || !formData.destinationId) return;

    adminService.saveActivity({
      id: editingActivity?.id || '',
      activityName: formData.activityName!,
      destinationId: formData.destinationId!,
      activityType: (formData.activityType || 'City Tour') as any,
      costAdult: Number(formData.costAdult),
      costChild: Number(formData.costChild),
      currency: formData.currency || 'USD',
      ticketIncluded: formData.ticketIncluded || false,
      transferIncluded: formData.transferIncluded || false,
      isActive: formData.isActive || false,
      createdBy: editingActivity?.createdBy || user?.id,
      description: formData.description,
      notes: formData.notes,
      duration: formData.duration,
      startTime: formData.startTime,
      imageUrl: formData.imageUrl,
      season: formData.season as any,
      validFrom: formData.validFrom,
      validTo: formData.validTo
    });

    setActivities(adminService.getActivities());
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this activity?')) {
      adminService.deleteActivity(id);
      setActivities(adminService.getActivities());
    }
  };

  const filteredData = useMemo(() => {
    return activities.filter(a => {
      const matchesSearch = a.activityName.toLowerCase().includes(search.toLowerCase());
      const matchesDest = filterDest === 'ALL' || a.destinationId === filterDest;
      const matchesSeason = filterSeason === 'ALL' || a.season === filterSeason;
      return matchesSearch && matchesDest && matchesSeason;
    });
  }, [activities, search, filterDest, filterSeason]);

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Sightseeing & Tours</h1>
          <p className="text-slate-500 mt-1">Manage activities, tickets, and excursion inventory.</p>
        </div>
        {canEdit && (
            <div className="flex gap-3">
                <InventoryImportExport 
                    data={displayedActivities}
                    headers={['id', 'activityName', 'destinationId', 'activityType', 'costAdult', 'costChild', 'currency', 'isActive']}
                    filename="activities"
                    onImport={() => setActivities(adminService.getActivities())}
                />
                <button onClick={() => handleOpenModal()} className="bg-brand-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-brand-700 transition shadow-lg shadow-brand-200 font-medium">
                    <Plus size={20} /> Add Activity
                </button>
            </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-center">
         <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input 
                type="text" 
                placeholder="Search activities..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none bg-white shadow-sm transition-all"
            />
         </div>
         <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
             <select 
               value={filterDest} 
               onChange={e => setFilterDest(e.target.value)} 
               className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none shadow-sm cursor-pointer hover:border-brand-300 transition min-w-[160px]"
             >
                <option value="ALL">All Destinations</option>
                {allDestinations.map(d => <option key={d.id} value={d.id}>{d.city}</option>)}
             </select>

             <select 
               value={filterSeason} 
               onChange={e => setFilterSeason(e.target.value)} 
               className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none shadow-sm cursor-pointer hover:border-brand-300 transition min-w-[140px]"
             >
                <option value="ALL">All Seasons</option>
                <option value="Peak">Peak</option>
                <option value="Off-Peak">Off-Peak</option>
                <option value="Shoulder">Shoulder</option>
                <option value="All Year">All Year</option>
             </select>
         </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 w-16">Image</th>
              <th className="px-6 py-4">Activity Name</th>
              <th className="px-6 py-4">Location</th>
              <th className="px-6 py-4">Validity</th>
              {showCost && <th className="px-6 py-4">Net Cost (Ad/Ch)</th>}
              <th className="px-6 py-4">Inclusions</th>
              <th className="px-6 py-4">Status</th>
              {canEdit && <th className="px-6 py-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredData.map((activity) => {
              const dest = allDestinations.find(d => d.id === activity.destinationId);
              return (
                <tr key={activity.id} className="hover:bg-brand-50/30 transition-colors group">
                  <td className="px-6 py-4">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200 shadow-sm">
                          {activity.imageUrl ? (
                              <img src={activity.imageUrl} alt={activity.activityName} className="w-full h-full object-cover" />
                          ) : (
                              <Camera size={16} className="text-slate-400" />
                          )}
                      </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 text-base">
                      {activity.activityName}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                       <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-medium">{activity.activityType}</span>
                       <span className="flex items-center gap-1"><Clock size={10}/> {activity.duration || '-'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-700 font-medium">{dest?.city}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase w-fit ${activity.season === 'Peak' ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-green-100 text-green-700 border border-green-200'}`}>
                        {activity.season || 'All Year'}
                        </span>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Calendar size={10}/> {activity.validFrom} <span className="mx-0.5">→</span> {activity.validTo}
                        </div>
                    </div>
                  </td>
                  {showCost && (
                    <td className="px-6 py-4 text-slate-900 font-mono font-medium">
                        {activity.currency || 'USD'} {activity.costAdult} <span className="text-slate-400 mx-1">/</span> {activity.costChild}
                    </td>
                  )}
                  <td className="px-6 py-4 text-xs space-y-1">
                    {activity.ticketIncluded && <span className="flex items-center gap-1 text-green-700 font-medium"><Check size={10} strokeWidth={3}/> Ticket</span>}
                    {activity.transferIncluded && <span className="flex items-center gap-1 text-blue-700 font-medium"><Check size={10} strokeWidth={3}/> Transfer</span>}
                    {!activity.ticketIncluded && !activity.transferIncluded && <span className="text-slate-400">-</span>}
                  </td>
                  <td className="px-6 py-4">
                     <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${activity.isActive ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${activity.isActive ? 'bg-emerald-600' : 'bg-slate-400'}`}></div>
                      {activity.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-100">
                            <button onClick={() => handleOpenModal(activity)} className="p-2 text-slate-500 hover:text-brand-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition shadow-sm">
                                <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDelete(activity.id)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition shadow-sm">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredData.length === 0 && (
          <div className="p-12 text-center text-slate-500 bg-slate-50/50">
              <Camera size={48} className="mx-auto mb-3 text-slate-300 opacity-50" />
              <p className="font-medium">No sightseeing activities found.</p>
          </div>
        )}
      </div>

      {isModalOpen && canEdit && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-0 overflow-hidden transform scale-100 transition-all max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10 backdrop-blur-md">
              <h2 className="text-xl font-bold text-slate-900">{editingActivity ? 'Edit Activity' : 'New Activity'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-8">
              
              {/* SECTION 1: BASICS */}
              <div className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Activity Name</label>
                    <input required type="text" value={formData.activityName || ''} onChange={e => setFormData({...formData, activityName: e.target.value})} className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white font-medium shadow-sm transition" placeholder="e.g. Desert Safari" />
                </div>
                
                <div className="grid grid-cols-2 gap-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Destination</label>
                        <div className="relative">
                            <MapPin size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                            <select value={formData.destinationId} onChange={e => setFormData({...formData, destinationId: e.target.value})} className="w-full border border-slate-300 rounded-xl pl-10 pr-4 py-3 text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none shadow-sm transition appearance-none">
                            {allDestinations.map(d => <option key={d.id} value={d.id}>{d.city}, {d.country}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Type</label>
                        <select value={formData.activityType} onChange={e => setFormData({...formData, activityType: e.target.value as any})} className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none shadow-sm transition">
                        <option>City Tour</option>
                        <option>Adventure</option>
                        <option>Cruise</option>
                        <option>Show</option>
                        <option>Theme Park</option>
                        <option>Other</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Duration</label>
                        <input type="text" value={formData.duration || ''} onChange={e => setFormData({...formData, duration: e.target.value})} className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white shadow-sm transition" placeholder="e.g. 4 Hours" />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Start Time</label>
                        <input type="text" value={formData.startTime || ''} onChange={e => setFormData({...formData, startTime: e.target.value})} className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white shadow-sm transition" placeholder="e.g. 09:00 AM" />
                    </div>
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* SECTION 2: PRICING */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <DollarSign size={14} /> Pricing & Currency
                  </h3>
                  <div className="grid grid-cols-3 gap-5">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Currency</label>
                        <select 
                          value={formData.currency} 
                          onChange={e => setFormData({...formData, currency: e.target.value})} 
                          className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none font-bold"
                        >
                          {['USD', 'AED', 'THB', 'INR', 'EUR', 'GBP'].map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Adult Cost</label>
                          <input required type="number" min="0" value={formData.costAdult || ''} onChange={e => setFormData({...formData, costAdult: Number(e.target.value)})} className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white font-mono font-bold" />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Child Cost</label>
                          <input required type="number" min="0" value={formData.costChild || ''} onChange={e => setFormData({...formData, costChild: Number(e.target.value)})} className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white font-mono font-bold" />
                      </div>
                  </div>
              </div>

              {/* SECTION 3: SEASONALITY */}
              <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Season</label>
                    <select 
                        value={formData.season} 
                        onChange={e => setFormData({...formData, season: e.target.value as any})} 
                        className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none shadow-sm transition"
                    >
                      <option>All Year</option><option>Peak</option><option>Off-Peak</option><option>Shoulder</option>
                    </select>
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Valid From</label>
                    <input 
                        type="date" 
                        value={formData.validFrom || ''} 
                        onChange={e => setFormData({...formData, validFrom: e.target.value})} 
                        className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white shadow-sm transition" 
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Valid To</label>
                    <input 
                        type="date" 
                        value={formData.validTo || ''} 
                        onChange={e => setFormData({...formData, validTo: e.target.value})} 
                        className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white shadow-sm transition" 
                    />
                  </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Image URL</label>
                <div className="relative">
                    <ImageIcon size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                    <input type="text" value={formData.imageUrl || ''} onChange={e => setFormData({...formData, imageUrl: e.target.value})} className="w-full border border-slate-300 rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white shadow-sm transition" placeholder="https://..." />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Description</label>
                <textarea 
                  rows={2}
                  value={formData.description || ''} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none bg-white shadow-sm transition"
                  placeholder="Details about the tour..."
                />
              </div>

              <div className="flex gap-6 pt-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                 <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center">
                        <input type="checkbox" checked={formData.ticketIncluded || false} onChange={e => setFormData({...formData, ticketIncluded: e.target.checked})} className="peer h-5 w-5 cursor-pointer appearance-none rounded border-2 border-slate-300 checked:bg-brand-600 checked:border-brand-600 transition-all" />
                        <Check size={14} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100" strokeWidth={4} />
                    </div>
                    <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">Ticket Included</span>
                 </label>
                 
                 <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center">
                        <input type="checkbox" checked={formData.transferIncluded || false} onChange={e => setFormData({...formData, transferIncluded: e.target.checked})} className="peer h-5 w-5 cursor-pointer appearance-none rounded border-2 border-slate-300 checked:bg-brand-600 checked:border-brand-600 transition-all" />
                        <Check size={14} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100" strokeWidth={4} />
                    </div>
                    <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">Transfer Included</span>
                 </label>

                 <label className="flex items-center gap-3 cursor-pointer group ml-auto">
                    <div className="relative flex items-center">
                        <input type="checkbox" checked={formData.isActive || false} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="peer h-5 w-5 cursor-pointer appearance-none rounded border-2 border-slate-300 checked:bg-green-600 checked:border-green-600 transition-all" />
                        <Check size={14} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100" strokeWidth={4} />
                    </div>
                    <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">Active</span>
                 </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 bg-white pb-2">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-slate-700 hover:bg-slate-100 rounded-xl font-bold border border-slate-200 transition">Cancel</button>
                 <button type="submit" className="px-8 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 font-bold shadow-lg shadow-brand-200 transition transform hover:-translate-y-0.5">Save Activity</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
