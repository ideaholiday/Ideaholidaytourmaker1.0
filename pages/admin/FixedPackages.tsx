
import React, { useState, useEffect, useMemo } from 'react';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { UserRole, FixedPackage, ItineraryItem, ItineraryService } from '../../types';
import { Edit2, Trash2, Plus, X, Package, Calendar, Image as ImageIcon, Tag, Check, MapPin, Layers, FileText, DollarSign, Hotel } from 'lucide-react';

type ModalTab = 'OVERVIEW' | 'ITINERARY' | 'PRICING';

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
  
  const canEdit = user?.role === UserRole.ADMIN || user?.role === UserRole.STAFF || user?.role === UserRole.OPERATOR;

  const displayedPackages = useMemo(() => {
      return user?.role === UserRole.OPERATOR 
        ? allPackages.filter(p => p.createdBy === user.id)
        : allPackages;
  }, [allPackages, user]);

  const [packages, setPackages] = useState<FixedPackage[]>(displayedPackages);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<FixedPackage | null>(null);
  
  // Modal State
  const [activeTab, setActiveTab] = useState<ModalTab>('OVERVIEW');
  
  useEffect(() => {
      setPackages(displayedPackages);
  }, [displayedPackages]);

  // Form State
  const [formData, setFormData] = useState<Partial<FixedPackage> & { 
      inclusionsText: string; 
      exclusionsText: string;
      datesText: string;
  }>({ inclusionsText: '', exclusionsText: '', datesText: '' });

  const handleOpenModal = (pkg?: FixedPackage) => {
    setActiveTab('OVERVIEW');
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
        basePax: 2,
        fixedPrice: 0,
        description: '',
        imageUrl: '',
        hotelDetails: '',
        notes: '',
        itinerary: [],
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

    const inclusions = formData.inclusionsText.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    const exclusions = formData.exclusionsText.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    const validDates = formData.datesText.split(',').map(s => s.trim()).filter(s => s.length > 0);

    // Ensure itinerary has correct number of days based on nights
    // Typically Itinerary Days = Nights + 1 (Departure)
    // If user didn't build itinerary, we might leave it empty or auto-gen blank
    let finalItinerary = formData.itinerary || [];
    
    // Save
    await adminService.saveFixedPackage({
      id: editingPkg?.id || '',
      packageName: formData.packageName!,
      destinationId: formData.destinationId!,
      nights: Number(formData.nights),
      basePax: Number(formData.basePax) || 2,
      fixedPrice: Number(formData.fixedPrice),
      inclusions,
      exclusions,
      validDates,
      description: formData.description,
      imageUrl: formData.imageUrl,
      category: formData.category,
      hotelDetails: formData.hotelDetails,
      notes: formData.notes,
      itinerary: finalItinerary,
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

  // --- ITINERARY BUILDER HELPERS ---
  const handleAddDay = () => {
      const current = formData.itinerary || [];
      const dayNum = current.length + 1;
      const newDay: ItineraryItem = {
          day: dayNum,
          title: `Day ${dayNum}`,
          description: '',
          services: []
      };
      setFormData({...formData, itinerary: [...current, newDay]});
  };

  const handleUpdateDay = (idx: number, field: keyof ItineraryItem, val: any) => {
      const current = [...(formData.itinerary || [])];
      current[idx] = { ...current[idx], [field]: val };
      setFormData({...formData, itinerary: current});
  };
  
  const handleAddService = (dayIdx: number) => {
      const current = [...(formData.itinerary || [])];
      const services = current[dayIdx].services || [];
      services.push({
          id: `svc_${Date.now()}`,
          type: 'ACTIVITY',
          name: '',
          cost: 0,
          price: 0,
          currency: 'INR'
      });
      current[dayIdx].services = services;
      setFormData({...formData, itinerary: current});
  };

  const handleUpdateService = (dayIdx: number, svcIdx: number, field: keyof ItineraryService, val: any) => {
      const current = [...(formData.itinerary || [])];
      const services = current[dayIdx].services || [];
      services[svcIdx] = { ...services[svcIdx], [field]: val };
      current[dayIdx].services = services;
      setFormData({...formData, itinerary: current});
  };

  const handleRemoveService = (dayIdx: number, svcIdx: number) => {
      const current = [...(formData.itinerary || [])];
      current[dayIdx].services = current[dayIdx].services?.filter((_, i) => i !== svcIdx);
      setFormData({...formData, itinerary: current});
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fixed Departure Packages</h1>
          <p className="text-slate-500">Manage ready-to-book group departures and fixed itineraries.</p>
        </div>
        {canEdit && (
            <button onClick={() => handleOpenModal()} className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 transition shadow-sm">
            <Plus size={18} /> Add Package
            </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Package Name</th>
              <th className="px-6 py-4">Details</th>
              <th className="px-6 py-4">Price</th>
              <th className="px-6 py-4">Next Departure</th>
              <th className="px-6 py-4">Status</th>
              {canEdit && <th className="px-6 py-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {packages.map((pkg) => {
              const dest = allDestinations.find(d => d.id === pkg.destinationId);
              // Find next date
              const nextDate = pkg.validDates
                  .map(d => new Date(d))
                  .sort((a,b) => a.getTime() - b.getTime())
                  .find(d => d.getTime() >= new Date().setHours(0,0,0,0));

              return (
                <tr key={pkg.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Package size={20} />
                        </div>
                        <div>
                            <p className="font-bold text-slate-900 text-base">{pkg.packageName}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                <MapPin size={10} /> {dest?.city}, {dest?.country}
                            </p>
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                      <div className="flex gap-2 mb-1">
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold border border-slate-200">{pkg.nights} Nights</span>
                          {pkg.category && <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs font-bold border border-purple-100">{pkg.category}</span>}
                      </div>
                      <p className="text-xs text-slate-400">{pkg.inclusions.length} Inclusions</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono font-bold text-slate-900 text-lg">₹ {pkg.fixedPrice.toLocaleString()}</span>
                    <span className="block text-[10px] text-slate-400">per person (base {pkg.basePax || 2} pax)</span>
                  </td>
                  <td className="px-6 py-4">
                     {nextDate ? (
                         <div className="flex flex-col">
                             <span className="text-green-700 font-bold text-sm flex items-center gap-1">
                                 <Calendar size={12}/> {nextDate.toLocaleDateString()}
                             </span>
                             {pkg.validDates.length > 1 && <span className="text-xs text-slate-400">+{pkg.validDates.length - 1} more dates</span>}
                         </div>
                     ) : (
                         <span className="text-red-400 text-xs italic">No future dates</span>
                     )}
                  </td>
                  <td className="px-6 py-4">
                     <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${pkg.isActive ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                      {pkg.isActive ? <Check size={10} strokeWidth={3}/> : <X size={10} strokeWidth={3}/>}
                      {pkg.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                            <button onClick={() => handleOpenModal(pkg)} className="p-2 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition">
                                <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDelete(pkg.id)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </td>
                  )}
                </tr>
              );
            })}
            {packages.length === 0 && (
                <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        No packages found. Click "Add Package" to create one.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && canEdit && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-4xl w-full flex flex-col max-h-[90vh] shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-slate-50 rounded-t-xl">
              <h2 className="text-xl font-bold text-slate-900">{editingPkg ? 'Edit Package' : 'Create Fixed Package'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
            </div>
            
            {/* TABS */}
            <div className="flex border-b border-slate-200 px-6 bg-white sticky top-0 z-10">
                <button 
                    onClick={() => setActiveTab('OVERVIEW')}
                    className={`px-4 py-3 text-sm font-bold border-b-2 transition ${activeTab === 'OVERVIEW' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Overview
                </button>
                <button 
                    onClick={() => setActiveTab('ITINERARY')}
                    className={`px-4 py-3 text-sm font-bold border-b-2 transition ${activeTab === 'ITINERARY' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Detailed Itinerary
                </button>
                <button 
                    onClick={() => setActiveTab('PRICING')}
                    className={`px-4 py-3 text-sm font-bold border-b-2 transition ${activeTab === 'PRICING' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Pricing & Dates
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                <form id="pkgForm" onSubmit={handleSave} className="space-y-6">
                    
                    {/* TAB 1: OVERVIEW */}
                    {activeTab === 'OVERVIEW' && (
                        <div className="space-y-6 animate-in fade-in">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Package Name</label>
                                    <input required type="text" value={formData.packageName || ''} onChange={e => setFormData({...formData, packageName: e.target.value})} className="w-full border border-slate-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none font-medium" placeholder="e.g. Dubai Super Saver" />
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Destination</label>
                                    <select value={formData.destinationId} onChange={e => setFormData({...formData, destinationId: e.target.value})} className="w-full border border-slate-300 p-2.5 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none">
                                        {allDestinations.map(d => <option key={d.id} value={d.id}>{d.city}, {d.country}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                                    <div className="relative">
                                        <Tag size={16} className="absolute left-3 top-3 text-slate-400" />
                                        <input type="text" value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full pl-9 border border-slate-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" placeholder="e.g. Honeymoon, Budget" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Duration (Nights)</label>
                                    <input required type="number" min="1" value={formData.nights || ''} onChange={e => setFormData({...formData, nights: Number(e.target.value)})} className="w-full border border-slate-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Base Pax (Adults)</label>
                                    <input required type="number" min="1" value={formData.basePax || ''} onChange={e => setFormData({...formData, basePax: Number(e.target.value)})} className="w-full border border-slate-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hotel Details</label>
                                <div className="relative">
                                    <Hotel size={16} className="absolute left-3 top-3 text-slate-400" />
                                    <input 
                                        type="text" 
                                        value={formData.hotelDetails || ''} 
                                        onChange={e => setFormData({...formData, hotelDetails: e.target.value})} 
                                        className="w-full pl-9 border border-slate-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" 
                                        placeholder="e.g. 3 Star - Citymax Hotel or similar"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                                <textarea 
                                    rows={3}
                                    className="w-full border border-slate-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                                    placeholder="Brief summary of the package..."
                                    value={formData.description || ''}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Image URL</label>
                                <div className="relative">
                                    <ImageIcon size={16} className="absolute left-3 top-3 text-slate-400" />
                                    <input 
                                        type="text" 
                                        value={formData.imageUrl || ''} 
                                        onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                                        className="w-full pl-9 border border-slate-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: ITINERARY */}
                    {activeTab === 'ITINERARY' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Layers size={18} className="text-brand-600"/> Day-wise Itinerary
                                </h3>
                                <button type="button" onClick={handleAddDay} className="text-xs bg-brand-50 text-brand-700 px-3 py-1.5 rounded-lg border border-brand-200 font-bold hover:bg-brand-100">+ Add Day</button>
                            </div>

                            {formData.itinerary?.length === 0 && (
                                <div className="text-center p-8 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 italic">
                                    No itinerary days defined. Click "Add Day" to start building.
                                </div>
                            )}

                            <div className="space-y-4">
                                {formData.itinerary?.map((day, dIdx) => (
                                    <div key={dIdx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">Day {day.day}</span>
                                            <input 
                                                type="text" 
                                                value={day.title} 
                                                onChange={e => handleUpdateDay(dIdx, 'title', e.target.value)}
                                                className="border-b border-slate-300 focus:border-brand-500 outline-none px-2 py-1 text-sm font-bold flex-1 mx-3"
                                                placeholder="Day Title"
                                            />
                                        </div>
                                        <textarea 
                                            rows={2}
                                            value={day.description} 
                                            onChange={e => handleUpdateDay(dIdx, 'description', e.target.value)}
                                            className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-brand-500 outline-none resize-none mb-3"
                                            placeholder="Day description..."
                                        />

                                        {/* Services */}
                                        <div className="space-y-2 pl-4 border-l-2 border-slate-100">
                                            {day.services?.map((svc, sIdx) => (
                                                <div key={svc.id} className="flex gap-2 items-center">
                                                    <select 
                                                        value={svc.type} 
                                                        onChange={e => handleUpdateService(dIdx, sIdx, 'type', e.target.value)}
                                                        className="border border-slate-300 rounded px-2 py-1 text-xs"
                                                    >
                                                        <option value="ACTIVITY">Activity</option>
                                                        <option value="TRANSFER">Transfer</option>
                                                        <option value="HOTEL">Hotel</option>
                                                        <option value="OTHER">Other</option>
                                                    </select>
                                                    <input 
                                                        type="text" 
                                                        value={svc.name}
                                                        onChange={e => handleUpdateService(dIdx, sIdx, 'name', e.target.value)}
                                                        className="flex-1 border border-slate-300 rounded px-2 py-1 text-xs"
                                                        placeholder="Service Name"
                                                    />
                                                    <button type="button" onClick={() => handleRemoveService(dIdx, sIdx)} className="text-slate-400 hover:text-red-500"><X size={14}/></button>
                                                </div>
                                            ))}
                                            <button type="button" onClick={() => handleAddService(dIdx)} className="text-xs text-brand-600 hover:underline flex items-center gap-1 mt-1">+ Add Service</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TAB 3: PRICING & DATES */}
                    {activeTab === 'PRICING' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fixed Price (INR)</label>
                                <div className="relative">
                                    <DollarSign size={16} className="absolute left-3 top-3 text-slate-400" />
                                    <input required type="number" min="0" value={formData.fixedPrice || ''} onChange={e => setFormData({...formData, fixedPrice: Number(e.target.value)})} className="w-full pl-9 border border-slate-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none font-bold text-slate-900" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Departure Dates (Comma Separated YYYY-MM-DD)</label>
                                <input 
                                    type="text" 
                                    placeholder="2023-10-15, 2023-11-20"
                                    value={formData.datesText}
                                    onChange={e => setFormData({...formData, datesText: e.target.value})}
                                    className="w-full border border-slate-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none font-mono"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">Example: 2023-11-15, 2023-12-01</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Inclusions (One per line)</label>
                                    <textarea 
                                    rows={4}
                                    value={formData.inclusionsText} 
                                    onChange={e => setFormData({...formData, inclusionsText: e.target.value})} 
                                    className="w-full border border-slate-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                                    placeholder="Accommodation&#10;Breakfast&#10;Transfers"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Exclusions (One per line)</label>
                                    <textarea 
                                    rows={4}
                                    value={formData.exclusionsText} 
                                    onChange={e => setFormData({...formData, exclusionsText: e.target.value})} 
                                    className="w-full border border-slate-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                                    placeholder="Flight Tickets&#10;Visa Cost"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Internal Notes / Policy</label>
                                <textarea 
                                    rows={2}
                                    className="w-full border border-slate-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                                    placeholder="Cancellation policy, internal remarks..."
                                    value={formData.notes || ''}
                                    onChange={e => setFormData({...formData, notes: e.target.value})}
                                />
                            </div>

                            <div>
                                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer w-fit" onClick={() => setFormData({...formData, isActive: !formData.isActive})}>
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${formData.isActive ? 'bg-brand-600 border-brand-600' : 'bg-white border-slate-300'}`}>
                                        {formData.isActive && <Check size={14} className="text-white" strokeWidth={3} />}
                                    </div>
                                    <span className="text-sm font-bold text-slate-700">Package Active</span>
                                </div>
                            </div>
                        </div>
                    )}

                </form>
            </div>
            
            <div className="p-6 border-t border-slate-200 bg-white rounded-b-xl flex justify-end gap-3">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium border border-slate-200">Cancel</button>
                 <button type="submit" form="pkgForm" className="px-6 py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-bold shadow-sm">Save Package</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
