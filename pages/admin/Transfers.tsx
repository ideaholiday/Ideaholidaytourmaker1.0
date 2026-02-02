
import React, { useState, useMemo, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { UserRole, Transfer, Destination } from '../../types';
import { Edit2, Trash2, Plus, X, Car, MapPin, Image as ImageIcon, Search, DollarSign, Calendar, Check, Loader2 } from 'lucide-react';
import { InventoryImportExport } from '../../components/admin/InventoryImportExport';
import { RichTextEditor } from '../../components/ui/RichTextEditor';

export const Transfers: React.FC = () => {
  const { user } = useAuth();
  
  // Data States
  const [allDestinations, setAllDestinations] = useState<Destination[]>([]);
  const [allTransfers, setAllTransfers] = useState<Transfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const canEdit = user?.role === UserRole.ADMIN || user?.role === UserRole.STAFF || user?.role === UserRole.OPERATOR || user?.role === UserRole.HOTEL_PARTNER;
  const showCost = user?.role !== UserRole.AGENT;

  // Refresh on load
  useEffect(() => {
      refreshData();
  }, []);

  const refreshData = async () => {
      setIsLoading(true);
      try {
        const [transfers, dests] = await Promise.all([
            adminService.getTransfers(),
            adminService.getDestinations()
        ]);
        setAllTransfers(transfers || []);
        setAllDestinations(dests || []);
      } catch (error) {
          console.error("Failed to load transfers", error);
      } finally {
          setIsLoading(false);
      }
  };

  const displayedTransfers = useMemo(() => {
      if (user?.role === UserRole.OPERATOR) {
          return allTransfers.filter(t => t.createdBy === user.id);
      }
      if (user?.role === UserRole.HOTEL_PARTNER) {
          return allTransfers.filter(t => user.linkedInventoryIds?.includes(t.id));
      }
      return allTransfers;
  }, [allTransfers, user]);

  const [transfers, setTransfers] = useState<Transfer[]>(displayedTransfers);
  
  useEffect(() => {
      setTransfers(displayedTransfers);
  }, [displayedTransfers]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [filterDest, setFilterDest] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  
  const [formData, setFormData] = useState<Partial<Transfer>>({});

  const handleOpenModal = (transfer?: Transfer) => {
    if (transfer) {
      setEditingTransfer(transfer);
      setFormData({ ...transfer });
    } else {
      if (user?.role === UserRole.HOTEL_PARTNER) {
          alert("Partners cannot create new inventory. Please contact Admin.");
          return;
      }
      setEditingTransfer(null);
      setFormData({ 
        isActive: true,
        destinationId: allDestinations.length > 0 ? allDestinations[0].id : '',
        transferName: '',
        transferType: 'PVT',
        vehicleType: 'Sedan',
        maxPassengers: 3,
        luggageCapacity: 2,
        costBasis: 'Per Vehicle',
        nightSurcharge: 0,
        cost: 0,
        currency: 'INR', // Enforced INR
        description: '',
        notes: '',
        meetingPoint: 'Arrival Hall',
        imageUrl: '',
        season: 'All Year',
        validFrom: new Date().toISOString().split('T')[0],
        validTo: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.transferName?.trim()) {
        alert("Transfer Name is required");
        return;
    }
    if (!formData.destinationId) {
        alert("Destination is required");
        return;
    }

    setIsSaving(true);
    try {
        await adminService.saveTransfer({
            id: editingTransfer?.id || '',
            transferName: formData.transferName,
            destinationId: formData.destinationId,
            transferType: (formData.transferType || 'PVT') as any,
            vehicleType: formData.vehicleType || 'Sedan',
            maxPassengers: Number(formData.maxPassengers) || 1,
            luggageCapacity: Number(formData.luggageCapacity) || 0,
            
            // Safe cost conversion
            cost: Number(formData.cost) || 0,
            currency: 'INR',
            
            costBasis: (formData.costBasis || 'Per Vehicle') as any,
            nightSurcharge: Number(formData.nightSurcharge) || 0,
            isActive: formData.isActive !== undefined ? formData.isActive : true,
            createdBy: editingTransfer?.createdBy || user?.id,
            description: formData.description || '',
            notes: formData.notes || '',
            meetingPoint: formData.meetingPoint || '',
            imageUrl: formData.imageUrl || '',
            season: (formData.season || 'All Year') as any,
            validFrom: formData.validFrom || new Date().toISOString().split('T')[0],
            validTo: formData.validTo || new Date().toISOString().split('T')[0]
        });

        await refreshData();
        setIsModalOpen(false);
    } catch (error: any) {
        console.error("Failed to save transfer", error);
        alert(`Error saving transfer: ${error.message}`);
    } finally {
        setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this transfer?')) {
      try {
          await adminService.deleteTransfer(id);
          await refreshData();
      } catch (error) {
          alert("Failed to delete transfer");
      }
    }
  };

  const filteredTransfers = useMemo(() => {
    return transfers.filter(t => {
        const matchesSearch = t.transferName.toLowerCase().includes(search.toLowerCase());
        const matchesDest = filterDest === 'ALL' || t.destinationId === filterDest;
        const matchesType = filterType === 'ALL' || t.transferType === filterType;
        return matchesSearch && matchesDest && matchesType;
    });
  }, [transfers, search, filterDest, filterType]);

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Transfers & Fleet</h1>
          <p className="text-slate-500 mt-1">Configure airport pick-ups, vehicle types, and route pricing.</p>
        </div>
        {canEdit && (
            <div className="flex gap-3">
                {user?.role !== UserRole.HOTEL_PARTNER && (
                    <InventoryImportExport 
                        data={displayedTransfers}
                        headers={['id', 'transferName', 'destinationId', 'transferType', 'vehicleType', 'maxPassengers', 'luggageCapacity', 'cost', 'currency', 'costBasis', 'nightSurcharge', 'meetingPoint', 'imageUrl', 'season', 'validFrom', 'validTo', 'isActive']}
                        filename="transfers"
                        onImport={() => {
                            alert("Import processed");
                            refreshData();
                        }}
                    />
                )}
                <button onClick={() => handleOpenModal()} className="bg-brand-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-brand-700 transition shadow-lg shadow-brand-200 font-medium">
                    <Plus size={20} /> {user?.role === UserRole.HOTEL_PARTNER ? 'Edit Selected' : 'Add Transfer'}
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
                  placeholder="Search transfers..." 
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
               value={filterType} 
               onChange={e => setFilterType(e.target.value)} 
               className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none shadow-sm cursor-pointer hover:border-brand-300 transition min-w-[140px]"
             >
                <option value="ALL">All Types</option>
                <option value="PVT">Private (PVT)</option>
                <option value="SIC">Shared (SIC)</option>
             </select>
          </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
        {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <Loader2 size={32} className="animate-spin mb-2 text-brand-600" />
                <p>Loading fleet data...</p>
            </div>
        ) : (
            <>
                <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                    <th className="px-6 py-4 w-16">Vehicle</th>
                    <th className="px-6 py-4">Transfer Details</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4">Capacity</th>
                    {showCost && <th className="px-6 py-4">Cost</th>}
                    <th className="px-6 py-4">Status</th>
                    {canEdit && <th className="px-6 py-4 text-right">Actions</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredTransfers.map((transfer) => {
                    const dest = allDestinations.find(d => d.id === transfer.destinationId);
                    return (
                        <tr key={transfer.id} className="hover:bg-brand-50/30 transition-colors group">
                        <td className="px-6 py-4">
                            <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200 shadow-sm">
                                {transfer.imageUrl ? (
                                    <img src={transfer.imageUrl} alt={transfer.vehicleType} className="w-full h-full object-cover" />
                                ) : (
                                    <Car size={16} className="text-slate-400" />
                                )}
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <div className="font-bold text-slate-900 text-base">
                                {transfer.transferName}
                            </div>
                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                <span className="flex items-center gap-1"><MapPin size={10}/> {dest?.city}</span>
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] border ${transfer.transferType === 'PVT' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                    {transfer.transferType}
                                </span>
                            </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs max-w-xs truncate">
                            <span dangerouslySetInnerHTML={{ __html: transfer.description || '-' }} />
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                            <p className="font-bold text-slate-800 text-sm">{transfer.vehicleType}</p>
                            <div className="text-xs text-slate-500 mt-1 space-x-2">
                                <span>{transfer.maxPassengers} Pax</span>
                                <span>{transfer.luggageCapacity || 2} Bags</span>
                            </div>
                        </td>
                        {showCost && (
                            <td className="px-6 py-4 font-mono text-slate-900 font-medium">
                                <div>{transfer.currency || 'INR'} {transfer.cost} <span className="text-xs text-slate-400">/{transfer.costBasis === 'Per Vehicle' ? 'Veh' : 'Pax'}</span></div>
                                {transfer.nightSurcharge > 0 && <span className="text-amber-600 text-xs font-bold">+ {transfer.currency || 'INR'} {transfer.nightSurcharge} Night</span>}
                            </td>
                        )}
                        <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${transfer.isActive ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${transfer.isActive ? 'bg-emerald-600' : 'bg-slate-400'}`}></div>
                            {transfer.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </td>
                        {canEdit && (
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2 opacity-100">
                                    <button onClick={() => handleOpenModal(transfer)} className="p-2 text-slate-500 hover:text-brand-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition shadow-sm">
                                        <Edit2 size={16} />
                                    </button>
                                    {user?.role !== UserRole.HOTEL_PARTNER && (
                                        <button onClick={() => handleDelete(transfer.id)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition shadow-sm">
                                        <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </td>
                        )}
                        </tr>
                    );
                    })}
                </tbody>
                </table>
                {filteredTransfers.length === 0 && (
                <div className="p-12 text-center text-slate-500 bg-slate-50/50">
                    <Car size={48} className="mx-auto mb-3 text-slate-300 opacity-50" />
                    <p className="font-medium">No transfers found.</p>
                </div>
                )}
            </>
        )}
      </div>

      {isModalOpen && canEdit && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-0 overflow-hidden transform scale-100 transition-all max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10 backdrop-blur-md">
              <h2 className="text-xl font-bold text-slate-900">{editingTransfer ? 'Edit Transfer' : 'Add Transfer'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-8">
              {/* SECTION 1: BASICS */}
              <div className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Transfer Name *</label>
                    <input required type="text" disabled={user?.role === UserRole.HOTEL_PARTNER} value={formData.transferName || ''} onChange={e => setFormData({...formData, transferName: e.target.value})} className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white font-medium shadow-sm transition disabled:bg-slate-50" placeholder="e.g. DXB Airport to City Hotel" />
                </div>
                
                <div className="grid grid-cols-2 gap-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Destination *</label>
                        <div className="relative">
                            <MapPin size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                            <select disabled={user?.role === UserRole.HOTEL_PARTNER} value={formData.destinationId} onChange={e => setFormData({...formData, destinationId: e.target.value})} className="w-full border border-slate-300 rounded-xl pl-10 pr-4 py-3 text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none shadow-sm transition appearance-none disabled:bg-slate-50">
                            <option value="">Select Destination...</option>
                            {allDestinations.map(d => <option key={d.id} value={d.id}>{d.city}, {d.country}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Type</label>
                        <select disabled={user?.role === UserRole.HOTEL_PARTNER} value={formData.transferType} onChange={e => setFormData({...formData, transferType: e.target.value as any})} className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none shadow-sm transition disabled:bg-slate-50">
                        <option value="PVT">Private (PVT)</option>
                        <option value="SIC">Shared (SIC)</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Vehicle Type</label>
                        <input required type="text" disabled={user?.role === UserRole.HOTEL_PARTNER} value={formData.vehicleType || ''} onChange={e => setFormData({...formData, vehicleType: e.target.value})} className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white shadow-sm transition disabled:bg-slate-50" placeholder="e.g. Sedan, Van" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Meeting Point</label>
                        <input type="text" value={formData.meetingPoint || ''} onChange={e => setFormData({...formData, meetingPoint: e.target.value})} className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white shadow-sm transition" placeholder="e.g. Arrival Hall" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Max Pax</label>
                        <input required type="number" min="1" disabled={user?.role === UserRole.HOTEL_PARTNER} value={formData.maxPassengers || ''} onChange={e => setFormData({...formData, maxPassengers: Number(e.target.value)})} className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white shadow-sm transition disabled:bg-slate-50" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Luggage (Bags)</label>
                        <input required type="number" min="0" value={formData.luggageCapacity || ''} onChange={e => setFormData({...formData, luggageCapacity: Number(e.target.value)})} className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white shadow-sm transition" />
                    </div>
                </div>

                <div className="space-y-4">
                    <RichTextEditor 
                      label="Description"
                      value={formData.description || ''}
                      onChange={(val) => setFormData({...formData, description: val})}
                      placeholder="Detailed description of vehicle and service..."
                    />
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* SECTION 2: PRICING */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                      <DollarSign size={14} /> Pricing & Currency
                  </label>
                  
                  <div className="grid grid-cols-3 gap-5">
                      <div className="col-span-1">
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Cost Rate</label>
                        <div className="flex gap-2">
                            {/* ENFORCED INR CURRENCY - NO DROPDOWN */}
                            <div className="w-24 border border-slate-200 bg-slate-50 rounded-xl px-2 py-2.5 text-sm font-bold text-slate-600 flex items-center justify-center">
                                INR
                            </div>
                            <input required type="number" min="0" value={formData.cost || ''} onChange={e => setFormData({...formData, cost: Number(e.target.value), currency: 'INR'})} className="flex-1 border border-slate-300 rounded-xl px-3 py-2.5 text-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white font-mono font-bold" />
                        </div>
                      </div>

                      <div className="col-span-1">
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Rate Basis</label>
                        <select disabled={user?.role === UserRole.HOTEL_PARTNER} value={formData.costBasis} onChange={e => setFormData({...formData, costBasis: e.target.value as any})} className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none shadow-sm transition disabled:bg-slate-100">
                            <option value="Per Vehicle">Per Vehicle</option>
                            <option value="Per Person">Per Person</option>
                        </select>
                      </div>

                      <div className="col-span-1">
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Night Surcharge</label>
                        <input required type="number" min="0" value={formData.nightSurcharge || ''} onChange={e => setFormData({...formData, nightSurcharge: Number(e.target.value)})} className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white font-mono" placeholder="Extra cost" />
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

              <div className="flex gap-6 pt-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                 <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center">
                        <input type="checkbox" checked={formData.isActive !== false} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="peer h-5 w-5 cursor-pointer appearance-none rounded border-2 border-slate-300 checked:bg-green-600 checked:border-green-600 transition-all" />
                        <Check size={14} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100" strokeWidth={4} />
                    </div>
                    <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">Active in System</span>
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
                    {isSaving ? 'Saving...' : 'Save Transfer'}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
