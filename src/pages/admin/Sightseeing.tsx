
import React, { useState, useMemo, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { UserRole, Activity, Destination, ActivityTransferOptions } from '../../types';
import { permissionService } from '../../services/permissionService';
import { Edit2, Trash2, Plus, X, Camera, Clock, Image as ImageIcon, Search, DollarSign, Check, MapPin, Calendar, Loader2, Bus, Car, Ticket } from 'lucide-react';
import { InventoryImportExport } from '../../components/admin/InventoryImportExport';
import { RichTextEditor } from '../../components/ui/RichTextEditor';

const DEFAULT_OPTIONS: ActivityTransferOptions = {
    sic: { enabled: false, costPerPerson: 0 },
    pvt: { enabled: false, costPerVehicle: 0, vehicleCapacity: 4 }
};

export const Sightseeing: React.FC = () => {
  const { user } = useAuth();
  
  // Data State
  const [allDestinations, setAllDestinations] = useState<Destination[]>([]);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const canEdit = 
    user?.role === UserRole.ADMIN || 
    (user?.role === UserRole.STAFF && permissionService.hasPermission(user, 'MANAGE_INVENTORY')) || 
    user?.role === UserRole.OPERATOR;

  const showCost = user?.role !== UserRole.AGENT;

  // Refresh on load
  useEffect(() => {
      refreshData();
  }, []);

  const refreshData = async () => {
      setIsLoading(true);
      try {
        const [activitiesData, destinationsData] = await Promise.all([
            adminService.getActivities(),
            adminService.getDestinations()
        ]);
        setAllActivities(activitiesData || []);
        setAllDestinations(destinationsData || []);
      } catch (error) {
        console.error("Failed to load sightseeing data", error);
      } finally {
        setIsLoading(false);
      }
  };

  const displayedActivities = useMemo(() => {
      if (user?.role === UserRole.OPERATOR) {
          return allActivities.filter(a => a.createdBy === user.id);
      }
      return allActivities;
  }, [allActivities, user]);

  // Local state for table (can be filtered)
  const [activities, setActivities] = useState<Activity[]>(displayedActivities);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  
  // Update local state when source changes
  useEffect(() => {
      setActivities(displayedActivities);
  }, [displayedActivities]);
  
  // Filters
  const [search, setSearch] = useState('');
  const [filterDest, setFilterDest] = useState('ALL');
  const [filterSeason, setFilterSeason] = useState('ALL');
  
  const [formData, setFormData] = useState<Partial<Activity>>({});
  
  // Separate state for deep nested pricing
  const [transferOpts, setTransferOpts] = useState<ActivityTransferOptions>(DEFAULT_OPTIONS);

  const handleOpenModal = (activity?: Activity) => {
    if (activity) {
      setEditingActivity(activity);
      setFormData({ ...activity }); 
      setTransferOpts(activity.transferOptions || DEFAULT_OPTIONS);
    } else {
      setEditingActivity(null);
      // Initialize with safe defaults
      setFormData({ 
        isActive: true,
        destinationId: allDestinations.length > 0 ? allDestinations[0].id : '',
        activityName: '',
        activityType: 'City Tour',
        currency: 'INR', // Enforced INR
        description: '',
        notes: '',
        duration: '4 Hours',
        startTime: 'Flexible',
        imageUrl: '',
        season: 'All Year',
        costAdult: 0,
        costChild: 0,
        ticketIncluded: true,
        validFrom: new Date().toISOString().split('T')[0],
        validTo: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
      });
      setTransferOpts(DEFAULT_OPTIONS);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.activityName?.trim()) {
        alert("Activity Name is required.");
        return;
    }
    if (!formData.destinationId) {
        alert("Please select a Destination. If none exist, add one in the Destinations tab first.");
        return;
    }

    setIsSaving(true);

    try {
        const payload: Activity = {
            id: editingActivity?.id || '', // Service generates ID if empty
            activityName: formData.activityName,
            destinationId: formData.destinationId,
            activityType: (formData.activityType || 'City Tour') as any,
            
            // Base Ticket Cost (Required)
            costAdult: Number(formData.costAdult) || 0,
            costChild: Number(formData.costChild) || 0,
            
            // Transfer Pricing Structure
            transferOptions: transferOpts,
            
            currency: 'INR',
            ticketIncluded: formData.ticketIncluded !== undefined ? formData.ticketIncluded : true,
            transferIncluded: false, // Legacy flag logic - now handled by transferOptions
            isActive: formData.isActive !== undefined ? formData.isActive : true,
            
            createdBy: editingActivity?.createdBy || user?.id,
            
            description: formData.description || '',
            notes: formData.notes || '',
            duration: formData.duration || '4 Hours',
            startTime: formData.startTime || 'Flexible',
            imageUrl: formData.imageUrl || '',
            season: (formData.season || 'All Year') as any,
            
            // Date Fallbacks
            validFrom: formData.validFrom || new Date().toISOString().split('T')[0],
            validTo: formData.validTo || new Date().toISOString().split('T')[0]
        };

        await adminService.saveActivity(payload);
        await refreshData();
        setIsModalOpen(false);
    } catch (error: any) {
        console.error("Save failed", error);
        alert(`Failed to save activity: ${error.message}`);
    } finally {
        setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this activity?')) {
      try {
          await adminService.deleteActivity(id);
          await refreshData();
      } catch (error) {
          alert("Failed to delete activity.");
      }
    }
  };

  const updateSic = (field: string, value: any) => {
      setTransferOpts(prev => ({
          ...prev,
          sic: { ...prev.sic, [field]: value }
      }));
  };

  const updatePvt = (field: string, value: any) => {
      setTransferOpts(prev => ({
          ...prev,
          pvt: { ...prev.pvt, [field]: value }
      }));
  };

  const filteredData = useMemo(() => {
    return activities.filter(a => {
      const matchesSearch = a.activityName.toLowerCase().includes(search.toLowerCase());
      const matchesDest = filterDest === 'ALL' || a.destinationId === filterDest;
      const matchesSeason = filterSeason === 'ALL' || a.season === filterSeason;
      return matchesSearch && matchesDest && matchesSeason;
    });
  }, [activities, search, filterDest, filterSeason]);

  // Strip HTML tags for list view preview
  const stripHtml = (html: string) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html || '';
    return tmp.textContent || tmp.innerText || '';
  };

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
                    onImport={() => refreshData()}
                />
                <button 
                    onClick={() => handleOpenModal()} 
                    disabled={isLoading}
                    className="bg-brand-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-brand-700 transition shadow-lg shadow-brand-200 font-medium disabled:opacity-50"
                >
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
                {allDestinations.map(d => <option key={d.id} value={d.id}>{d.city}, {d.country}</option>)}
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
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
        {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <Loader2 size={32} className="animate-spin mb-2 text-brand-600" />
                <p>Loading inventory...</p>
            </div>
        ) : (
            <>
                <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                    <th className="px-6 py-4 w-16">Image</th>
                    <th className="px-6 py-4">Activity Name</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4">Validity</th>
                    {showCost && <th className="px-6 py-4">Base Ticket</th>}
                    <th className="px-6 py-4">Transfer Opts</th>
                    <th className="px-6 py-4">Status</th>
                    {canEdit && <th className="px-6 py-4 text-right">Actions</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredData.map((activity) => {
                    const dest = allDestinations.find(d => d.id === activity.destinationId);
                    const opts = activity.transferOptions || DEFAULT_OPTIONS;
                    
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
                            <span className="flex items-center gap-1"><MapPin size={10}/> {dest?.city || 'Unknown'}</span>
                            <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-medium">{activity.activityType}</span>
                            <span className="flex items-center gap-1"><Clock size={10}/> {activity.duration || '-'}</span>
                            </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs max-w-xs truncate">
                            {stripHtml(activity.description || '-')}
                        </td>
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
                                {activity.currency || 'INR'} {activity.costAdult.toLocaleString()}
                            </td>
                        )}
                        <td className="px-6 py-4 text-xs">
                             <div className="flex gap-1">
                                 {/* Base Ticket Always Included */}
                                 <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200" title="Ticket Only">TKT</span>
                                 {opts.sic.enabled && <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100" title="Shared Transfer">SIC</span>}
                                 {opts.pvt.enabled && <span className="bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded border border-purple-100" title="Private Transfer">PVT</span>}
                             </div>
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
            </>
        )}
      </div>

      {isModalOpen && canEdit && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-0 overflow-hidden transform scale-100 transition-all max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10 backdrop-blur-md">
              <h2 className="text-xl font-bold text-slate-900">{editingActivity ? 'Edit Activity' : 'New Activity'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-8">
              {/* SECTION 1: BASICS */}
              <div className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Activity Name *</label>
                    <input required type="text" value={formData.activityName || ''} onChange={e => setFormData({...formData, activityName: e.target.value})} className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white font-medium shadow-sm transition" placeholder="e.g. Desert Safari" />
                </div>
                
                <div className="grid grid-cols-2 gap-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Destination *</label>
                        <div className="relative">
                            <MapPin size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                            <select 
                                required
                                value={formData.destinationId} 
                                onChange={e => setFormData({...formData, destinationId: e.target.value})} 
                                className="w-full border border-slate-300 rounded-xl pl-10 pr-4 py-3 text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none shadow-sm transition appearance-none"
                            >
                                <option value="">Select Destination...</option>
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

              {/* SECTION 2: PRICING & OPTIONS (Rayna Style) */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <DollarSign size={14} /> Pricing Configuration
                  </h3>
                  
                  {/* Option 1: Base Ticket (Without Transfer) */}
                  <div className={`p-4 rounded-lg border mb-4 transition-all ${formData.ticketIncluded !== false ? 'bg-white border-brand-300 shadow-sm' : 'bg-slate-100 border-slate-200 opacity-75'}`}>
                      <div className="flex items-center justify-between mb-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                  type="checkbox" 
                                  checked={formData.ticketIncluded !== false} 
                                  onChange={e => setFormData({...formData, ticketIncluded: e.target.checked})} 
                                  className="rounded text-brand-600 focus:ring-brand-500" 
                              />
                              <div className="flex items-center gap-2">
                                 <div className={`p-1.5 rounded ${formData.ticketIncluded !== false ? 'bg-brand-100 text-brand-600' : 'bg-slate-200 text-slate-500'}`}>
                                      <Ticket size={18}/>
                                  </div>
                                  <span className="font-bold text-slate-800">Base Ticket (Without Transfer)</span>
                              </div>
                          </label>
                      </div>
                      
                      {formData.ticketIncluded !== false && (
                          <div className="grid grid-cols-2 gap-4 pl-6 animate-in fade-in">
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Adult Price (INR)</label>
                                  <input type="number" min="0" value={formData.costAdult} onChange={e => setFormData({...formData, costAdult: Number(e.target.value)})} className="w-full border border-slate-300 rounded-lg p-2 font-mono" />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Child Price (INR)</label>
                                  <input type="number" min="0" value={formData.costChild} onChange={e => setFormData({...formData, costChild: Number(e.target.value)})} className="w-full border border-slate-300 rounded-lg p-2 font-mono" />
                              </div>
                          </div>
                      )}
                  </div>

                  {/* Option 2: Shared Transfers (SIC) */}
                  <div className={`p-4 rounded-lg border mb-4 transition-all ${transferOpts.sic.enabled ? 'bg-white border-blue-300 shadow-sm' : 'bg-slate-100 border-slate-200 opacity-75'}`}>
                      <div className="flex items-center justify-between mb-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                  type="checkbox" 
                                  checked={transferOpts.sic.enabled} 
                                  onChange={e => updateSic('enabled', e.target.checked)} 
                                  className="rounded text-blue-600 focus:ring-blue-500" 
                              />
                              <div className="flex items-center gap-2">
                                  <Bus size={18} className="text-blue-500"/>
                                  <span className="font-bold text-slate-800">Shared Transfer (SIC) Add-on</span>
                              </div>
                          </label>
                      </div>
                      
                      {transferOpts.sic.enabled && (
                          <div className="grid grid-cols-1 gap-4 pl-6 animate-in fade-in">
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cost Per Person (INR)</label>
                                  <input type="number" min="0" value={transferOpts.sic.costPerPerson} onChange={e => updateSic('costPerPerson', Number(e.target.value))} className="w-full border border-slate-300 rounded-lg p-2 font-mono" />
                                  <p className="text-[10px] text-slate-400 mt-1">This cost is added to the Base Ticket for each Pax.</p>
                              </div>
                          </div>
                      )}
                  </div>

                  {/* Option 3: Private Transfers (PVT) */}
                  <div className={`p-4 rounded-lg border transition-all ${transferOpts.pvt.enabled ? 'bg-white border-purple-300 shadow-sm' : 'bg-slate-100 border-slate-200 opacity-75'}`}>
                      <div className="flex items-center justify-between mb-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                  type="checkbox" 
                                  checked={transferOpts.pvt.enabled} 
                                  onChange={e => updatePvt('enabled', e.target.checked)} 
                                  className="rounded text-purple-600 focus:ring-purple-500" 
                              />
                              <div className="flex items-center gap-2">
                                  <Car size={18} className="text-purple-500"/>
                                  <span className="font-bold text-slate-800">Private Transfer (PVT) Add-on</span>
                              </div>
                          </label>
                      </div>
                      
                      {transferOpts.pvt.enabled && (
                          <div className="grid grid-cols-2 gap-4 pl-6 animate-in fade-in">
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cost Per Vehicle (INR)</label>
                                  <input type="number" min="0" value={transferOpts.pvt.costPerVehicle} onChange={e => updatePvt('costPerVehicle', Number(e.target.value))} className="w-full border border-slate-300 rounded-lg p-2 font-mono" />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vehicle Capacity</label>
                                  <input type="number" min="1" value={transferOpts.pvt.vehicleCapacity} onChange={e => updatePvt('vehicleCapacity', Number(e.target.value))} className="w-full border border-slate-300 rounded-lg p-2 font-mono" />
                              </div>
                              <div className="col-span-2">
                                  <p className="text-[10px] text-slate-400 mt-1">System calculates vehicles needed: Ceil(Total Pax / Capacity). Total = (Ticket * Pax) + (Vehicles * Vehicle Cost).</p>
                              </div>
                          </div>
                      )}
                  </div>
              </div>

              {/* SECTION 3: SEASONALITY */}
              <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Season</label>
                    <select 
                        value={formData.season} 
                        onChange={e => setFormData({...formData,season: e.target.value as any})} 
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
                <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Description (Supports Rich Text)</label>
                <RichTextEditor
                    value={formData.description || ''}
                    onChange={(val) => setFormData({...formData, description: val})}
                    placeholder="Details about the tour..."
                />
              </div>

              <div className="flex gap-6 pt-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                 <label className="flex items-center gap-3 cursor-pointer group ml-auto">
                    <div className="relative flex items-center">
                        <input type="checkbox" checked={formData.isActive !== undefined ? formData.isActive : true} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="peer h-5 w-5 cursor-pointer appearance-none rounded border-2 border-slate-300 checked:bg-green-600 checked:border-green-600 transition-all" />
                        <Check size={14} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100" strokeWidth={4} />
                    </div>
                    <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">Active</span>
                 </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 bg-white pb-2">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-slate-700 hover:bg-slate-100 rounded-xl font-bold border border-slate-200 transition">Cancel</button>
                 <button 
                    type="submit" 
                    disabled={isSaving}
                    className="px-8 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 font-bold shadow-lg shadow-brand-200 transition transform hover:-translate-y-0.5 flex items-center gap-2 disabled:opacity-50"
                 >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : null}
                    {isSaving ? 'Saving...' : 'Save Activity'}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
