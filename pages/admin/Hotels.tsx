
import React, { useState } from 'react';
import { adminService } from '../../services/adminService';
import { currencyService } from '../../services/currencyService';
import { useAuth } from '../../context/AuthContext';
import { UserRole, Hotel } from '../../types';
import { Edit2, Trash2, Plus, X, Search, Hotel as HotelIcon, Calendar, Check, DollarSign } from 'lucide-react';
import { InventoryImportExport } from '../../components/admin/InventoryImportExport';

export const Hotels: React.FC = () => {
  const { user } = useAuth();
  const allDestinations = adminService.getDestinations();
  const allHotels = adminService.getHotels();
  const currencies = currencyService.getCurrencies();
  
  const canEdit = user?.role === UserRole.ADMIN || user?.role === UserRole.STAFF || user?.role === UserRole.OPERATOR || user?.role === UserRole.SUPPLIER;
  const showCost = user?.role !== UserRole.AGENT;

  let displayedHotels = allHotels;
  if (user?.role === UserRole.OPERATOR) {
      displayedHotels = allHotels.filter(h => h.createdBy === user.id);
  } else if (user?.role === UserRole.SUPPLIER) {
      displayedHotels = allHotels.filter(h => user.linkedInventoryIds?.includes(h.id));
  }
  
  const [search, setSearch] = useState('');
  const [hotels, setHotels] = useState<Hotel[]>(displayedHotels);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
  const [formData, setFormData] = useState<Partial<Hotel>>({});

  const filteredHotels = hotels.filter(h => 
    h.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenModal = (hotel?: Hotel) => {
    if (hotel) {
      setEditingHotel(hotel);
      setFormData(hotel);
    } else {
      if (user?.role === UserRole.SUPPLIER) {
          alert("Suppliers cannot create new inventory. Please contact Admin to link new properties.");
          return;
      }
      setEditingHotel(null);
      setFormData({ 
        isActive: true,
        destinationId: allDestinations[0]?.id || '',
        category: '4 Star',
        mealPlan: 'BB',
        costType: 'Per Room',
        season: 'Off-Peak',
        currency: 'USD',
        validFrom: new Date().toISOString().split('T')[0],
        validTo: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    adminService.saveHotel({
      id: editingHotel?.id || '',
      name: formData.name!,
      destinationId: formData.destinationId!,
      category: formData.category as any,
      roomType: formData.roomType || 'Standard',
      mealPlan: formData.mealPlan as any,
      cost: Number(formData.cost),
      costType: formData.costType as any,
      currency: formData.currency || 'USD',
      season: formData.season as any,
      validFrom: formData.validFrom || new Date().toISOString().split('T')[0],
      validTo: formData.validTo || new Date().toISOString().split('T')[0],
      isActive: formData.isActive || false,
      createdBy: editingHotel?.createdBy || user?.id
    });

    const freshAll = adminService.getHotels();
    if (user?.role === UserRole.SUPPLIER) {
        setHotels(freshAll.filter(h => user.linkedInventoryIds?.includes(h.id)));
    } else if (user?.role === UserRole.OPERATOR) {
        setHotels(freshAll.filter(h => h.createdBy === user.id));
    } else {
        setHotels(freshAll);
    }
    
    setIsModalOpen(false);
  };

  const handleBulkImport = (data: any[]) => {
      // Mock logic as before
      alert(`Processed ${data.length} items`);
      setHotels(adminService.getHotels());
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Hotel Inventory</h1>
          <p className="text-slate-500 mt-1">Manage hotel contracts and seasonal rates.</p>
        </div>
        {canEdit && (
            <div className="flex gap-3">
                {user?.role !== UserRole.SUPPLIER && (
                    <InventoryImportExport 
                        data={displayedHotels}
                        headers={['id', 'name', 'destinationId', 'category', 'roomType', 'mealPlan', 'cost', 'currency', 'costType', 'season', 'isActive']}
                        filename="hotels_rates"
                        onImport={handleBulkImport}
                    />
                )}
                <button onClick={() => handleOpenModal()} className="bg-brand-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-brand-700 transition shadow-lg shadow-brand-200 font-medium">
                    <Plus size={20} /> {user?.role === UserRole.SUPPLIER ? 'Edit Selected' : 'Add Rate'}
                </button>
            </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Search hotels..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white shadow-sm transition-all"
                />
            </div>
        </div>

        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Hotel Details</th>
              <th className="px-6 py-4">Location</th>
              <th className="px-6 py-4">Room Config</th>
              <th className="px-6 py-4">Season</th>
              {showCost && <th className="px-6 py-4 text-right">Net Cost</th>}
              {canEdit && <th className="px-6 py-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredHotels.map((hotel) => {
              const dest = allDestinations.find(d => d.id === hotel.destinationId);
              return (
                <tr key={hotel.id} className="hover:bg-brand-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                            <HotelIcon size={20} />
                        </div>
                        <div>
                            <p className="font-bold text-slate-900 text-base">{hotel.name}</p>
                            <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-600 border border-slate-200 font-medium">{hotel.category}</span>
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-700 font-medium">{dest?.city}</td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">{hotel.roomType}</p>
                    <span className="text-xs text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{hotel.mealPlan}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase w-fit ${hotel.season === 'Peak' ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-green-100 text-green-700 border border-green-200'}`}>
                        {hotel.season}
                        </span>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Calendar size={10}/> {hotel.validFrom} <span className="mx-0.5">→</span> {hotel.validTo}
                        </div>
                    </div>
                  </td>
                  {showCost && (
                    <td className="px-6 py-4 text-right">
                        <span className="font-mono text-base font-bold text-slate-900">{hotel.currency || 'USD'} {hotel.cost.toLocaleString()}</span>
                        <span className="block text-[10px] text-slate-400 font-medium uppercase">{hotel.costType}</span>
                    </td>
                  )}
                  {canEdit && (
                    <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-100">
                            <button onClick={() => handleOpenModal(hotel)} className="p-2 text-slate-500 hover:text-brand-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition shadow-sm">
                                <Edit2 size={16} />
                            </button>
                        </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredHotels.length === 0 && (
            <div className="p-12 text-center text-slate-500 bg-slate-50/50">
                 <HotelIcon size={48} className="mx-auto mb-3 text-slate-300 opacity-50" />
                 <p className="font-medium">No hotels found matching your search.</p>
            </div>
        )}
      </div>

      {isModalOpen && canEdit && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-0 overflow-hidden transform scale-100 transition-all max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10 backdrop-blur-md">
              <h2 className="text-xl font-bold text-slate-900">{editingHotel ? 'Edit Rate' : 'Add Hotel Rate'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-6">
              
              {/* Hotel Basics */}
              <div className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Hotel Name</label>
                    <input 
                        required 
                        type="text" 
                        disabled={user?.role === UserRole.SUPPLIER} 
                        value={formData.name || ''} 
                        onChange={e => setFormData({...formData, name: e.target.value})} 
                        className="w-full pl-4 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white text-slate-900 font-medium transition-all shadow-sm disabled:bg-slate-50 disabled:text-slate-500"
                        placeholder="e.g. Marina Byblos Hotel"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Destination</label>
                        <select 
                            disabled={user?.role === UserRole.SUPPLIER} 
                            value={formData.destinationId} 
                            onChange={e => setFormData({...formData, destinationId: e.target.value})} 
                            className="w-full pl-3 pr-8 py-3 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-brand-500 outline-none font-medium shadow-sm transition disabled:bg-slate-50"
                        >
                        {allDestinations.map(d => <option key={d.id} value={d.id}>{d.city}, {d.country}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Category</label>
                        <select 
                            value={formData.category} 
                            onChange={e => setFormData({...formData, category: e.target.value as any})} 
                            className="w-full pl-3 pr-8 py-3 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-brand-500 outline-none font-medium shadow-sm transition"
                        >
                        <option>3 Star</option><option>4 Star</option><option>5 Star</option><option>Luxury</option>
                        </select>
                    </div>
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* Room Config Card */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <HotelIcon size={14} /> Room Configuration
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Room Type</label>
                        <input 
                            required 
                            type="text" 
                            value={formData.roomType || ''} 
                            onChange={e => setFormData({...formData, roomType: e.target.value})} 
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none bg-white font-medium shadow-sm"
                            placeholder="e.g. Deluxe Room"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Meal Plan</label>
                        <select 
                            value={formData.mealPlan} 
                            onChange={e => setFormData({...formData, mealPlan: e.target.value as any})} 
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-brand-500 outline-none font-medium shadow-sm"
                        >
                        <option value="RO">Room Only</option>
                        <option value="BB">Bed & Breakfast</option>
                        <option value="HB">Half Board</option>
                        <option value="FB">Full Board</option>
                        <option value="AI">All Inclusive</option>
                        </select>
                    </div>
                  </div>
              </div>

              {/* Pricing Card */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <DollarSign size={14} /> Rate & Validity
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Cost</label>
                        <div className="flex gap-2">
                            <select 
                                value={formData.currency} 
                                onChange={e => setFormData({...formData, currency: e.target.value})} 
                                className="w-24 px-2 py-3 border border-slate-300 rounded-xl bg-white font-bold focus:ring-2 focus:ring-brand-500 outline-none shadow-sm"
                            >
                                {currencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                            </select>
                            <input 
                                required 
                                type="number" 
                                value={formData.cost || ''} 
                                onChange={e => setFormData({...formData, cost: Number(e.target.value)})} 
                                className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none bg-white font-mono font-bold shadow-sm"
                                placeholder="0.00" 
                            />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Rate Basis</label>
                        <select 
                            value={formData.costType} 
                            onChange={e => setFormData({...formData, costType: e.target.value as any})} 
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-brand-500 outline-none font-medium shadow-sm"
                        >
                            <option>Per Room</option><option>Per Person</option>
                        </select>
                      </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Season</label>
                        <select 
                            value={formData.season} 
                            onChange={e => setFormData({...formData, season: e.target.value as any})} 
                            className="w-full px-3 py-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-brand-500 outline-none text-sm font-medium shadow-sm"
                        >
                        <option>Peak</option><option>Off-Peak</option><option>Shoulder</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">From</label>
                        <input 
                            type="date" 
                            value={formData.validFrom || ''} 
                            onChange={e => setFormData({...formData, validFrom: e.target.value})} 
                            className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none bg-white text-sm font-medium shadow-sm" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">To</label>
                        <input 
                            type="date" 
                            value={formData.validTo || ''} 
                            onChange={e => setFormData({...formData, validTo: e.target.value})} 
                            className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none bg-white text-sm font-medium shadow-sm" 
                        />
                      </div>
                  </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 bg-white pb-2">
                 <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="px-6 py-3 text-slate-700 hover:bg-slate-100 rounded-xl font-bold border border-slate-200 transition"
                 >
                    Cancel
                 </button>
                 <button 
                    type="submit" 
                    className="px-8 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 font-bold shadow-lg shadow-brand-200 transition transform hover:-translate-y-0.5"
                 >
                    Save Rate
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
