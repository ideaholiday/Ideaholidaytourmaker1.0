
import React, { useState } from 'react';
import { adminService } from '../../services/adminService';
import { currencyService } from '../../services/currencyService';
import { useAuth } from '../../context/AuthContext';
import { UserRole, Hotel } from '../../types';
import { Edit2, Trash2, Plus, X } from 'lucide-react';
import { InventoryImportExport } from '../../components/admin/InventoryImportExport';

export const Hotels: React.FC = () => {
  const { user } = useAuth();
  const allDestinations = adminService.getDestinations();
  const allHotels = adminService.getHotels();
  const currencies = currencyService.getCurrencies();
  
  // Operators and Suppliers have access
  const canEdit = user?.role === UserRole.ADMIN || user?.role === UserRole.STAFF || user?.role === UserRole.OPERATOR || user?.role === UserRole.SUPPLIER;
  
  // Agents should NOT see the Cost Price (Net Rate)
  const showCost = user?.role !== UserRole.AGENT;

  // Filter Logic
  let displayedHotels = allHotels;
  if (user?.role === UserRole.OPERATOR) {
      displayedHotels = allHotels.filter(h => h.createdBy === user.id);
  } else if (user?.role === UserRole.SUPPLIER) {
      displayedHotels = allHotels.filter(h => user.linkedInventoryIds?.includes(h.id));
  }
  
  const [hotels, setHotels] = useState<Hotel[]>(displayedHotels);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
  const [formData, setFormData] = useState<Partial<Hotel>>({});

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
        currency: 'USD' // Default
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

    // Refresh Filtered List
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

  // Bulk Import Handler
  const handleBulkImport = (data: any[]) => {
      if (user?.role === UserRole.SUPPLIER) {
          alert("Bulk Import is restricted for your role.");
          return;
      }

      let count = 0;
      data.forEach(item => {
          // Resolve Destination ID from Name if needed
          let destId = item.destinationId;
          const matchedDest = allDestinations.find(d => 
              d.id === item.destinationId || 
              d.city.toLowerCase() === String(item.destinationId).toLowerCase()
          );
          
          if (matchedDest) {
              destId = matchedDest.id;
          }

          if (item.name && destId) {
              adminService.saveHotel({
                  id: item.id || '',
                  name: item.name,
                  destinationId: destId,
                  category: item.category || '4 Star',
                  roomType: item.roomType || 'Standard',
                  mealPlan: item.mealPlan || 'BB',
                  cost: Number(item.cost || 0),
                  costType: item.costType || 'Per Room',
                  currency: item.currency || 'USD',
                  season: item.season || 'Off-Peak',
                  validFrom: item.validFrom || new Date().toISOString().split('T')[0],
                  validTo: item.validTo || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
                  isActive: item.isActive === true || String(item.isActive).toUpperCase() === 'TRUE',
                  createdBy: user?.id
              });
              count++;
          }
      });
      alert(`Successfully processed ${count} hotels.`);
      setHotels(adminService.getHotels());
  };

  const handleDownloadTemplate = () => {
      const headers = [
          'name', 'destinationId', 'category', 'roomType', 
          'mealPlan', 'cost', 'currency', 'costType', 'season', 
          'validFrom', 'validTo', 'isActive'
      ];
      
      const sampleRows = [
          ['Grand Hotel', 'Dubai', '4 Star', 'Deluxe Room', 'BB', '150', 'USD', 'Per Room', 'Peak', '2024-01-01', '2024-12-31', 'TRUE'],
          ['Sea View Resort', 'Phuket', '5 Star', 'Ocean Suite', 'HB', '200', 'USD', 'Per Room', 'Off-Peak', '2024-01-01', '2024-12-31', 'TRUE']
      ];
      
      const csvContent = [
          headers.join(','), 
          ...sampleRows.map(r => r.map(c => `"${c}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `hotel_inventory_template.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hotel Inventory</h1>
          <p className="text-slate-500">Manage hotel contracts and seasonal rates.</p>
        </div>
        {canEdit && (
            <div className="flex gap-3">
                {user?.role !== UserRole.SUPPLIER && (
                    <InventoryImportExport 
                        data={displayedHotels}
                        headers={['id', 'name', 'destinationId', 'category', 'roomType', 'mealPlan', 'cost', 'currency', 'costType', 'season', 'isActive']}
                        filename="hotels_rates"
                        onImport={handleBulkImport}
                        onDownloadTemplate={handleDownloadTemplate}
                    />
                )}
                <button onClick={() => handleOpenModal()} className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 transition shadow-sm">
                    <Plus size={18} /> {user?.role === UserRole.SUPPLIER ? 'Edit Selected' : 'Add Rate'}
                </button>
            </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 font-semibold">Hotel Name</th>
              <th className="px-6 py-4 font-semibold">City</th>
              <th className="px-6 py-4 font-semibold">Details</th>
              <th className="px-6 py-4 font-semibold">Season</th>
              {showCost && <th className="px-6 py-4 font-semibold text-right">Cost</th>}
              {canEdit && <th className="px-6 py-4 font-semibold text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {hotels.map((hotel) => {
              const dest = allDestinations.find(d => d.id === hotel.destinationId);
              return (
                <tr key={hotel.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">{hotel.name}</p>
                    <span className="text-xs text-slate-500">{hotel.category}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{dest?.city}</td>
                  <td className="px-6 py-4 text-slate-600">
                    <p>{hotel.roomType}</p>
                    <span className="text-xs text-slate-400">{hotel.mealPlan}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${hotel.season === 'Peak' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                      {hotel.season}
                    </span>
                  </td>
                  {showCost && (
                    <td className="px-6 py-4 text-right font-mono text-slate-900">
                        {hotel.currency || 'USD'} {hotel.cost}
                        <span className="block text-xs text-slate-400">{hotel.costType}</span>
                    </td>
                  )}
                  {canEdit && (
                    <td className="px-6 py-4 text-right">
                        <button onClick={() => handleOpenModal(hotel)} className="p-2 text-slate-500 hover:text-brand-600 transition">
                        <Edit2 size={16} />
                        </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {hotels.length === 0 && (
            <div className="p-8 text-center text-slate-500">
                 {user?.role === UserRole.SUPPLIER
                    ? "No hotels linked to your account. Contact Admin." 
                    : "No available hotel inventory found."}
            </div>
        )}
      </div>

      {isModalOpen && canEdit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-900">{editingHotel ? 'Edit' : 'Add'} Hotel Rate</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Hotel Name</label>
                <input required type="text" disabled={user?.role === UserRole.SUPPLIER} value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border p-2 rounded-lg text-sm disabled:bg-slate-100" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Destination</label>
                <select disabled={user?.role === UserRole.SUPPLIER} value={formData.destinationId} onChange={e => setFormData({...formData, destinationId: e.target.value})} className="w-full border p-2 rounded-lg text-sm bg-white disabled:bg-slate-100">
                  {allDestinations.map(d => <option key={d.id} value={d.id}>{d.city}, {d.country}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})} className="w-full border p-2 rounded-lg text-sm bg-white">
                  <option>3 Star</option><option>4 Star</option><option>5 Star</option><option>Luxury</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Room Type</label>
                <input required type="text" value={formData.roomType || ''} onChange={e => setFormData({...formData, roomType: e.target.value})} className="w-full border p-2 rounded-lg text-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Meal Plan</label>
                <select value={formData.mealPlan} onChange={e => setFormData({...formData, mealPlan: e.target.value as any})} className="w-full border p-2 rounded-lg text-sm bg-white">
                  <option value="RO">Room Only</option>
                  <option value="BB">Bed & Breakfast</option>
                  <option value="HB">Half Board</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Season</label>
                <select value={formData.season} onChange={e => setFormData({...formData, season: e.target.value as any})} className="w-full border p-2 rounded-lg text-sm bg-white">
                  <option>Peak</option><option>Off-Peak</option><option>Shoulder</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cost Rate</label>
                <div className="flex gap-2">
                  <select 
                    value={formData.currency} 
                    onChange={e => setFormData({...formData, currency: e.target.value})} 
                    className="border p-2 rounded-lg text-sm bg-white w-20"
                  >
                    {currencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                  </select>
                  <input required type="number" value={formData.cost || ''} onChange={e => setFormData({...formData, cost: Number(e.target.value)})} className="w-full border p-2 rounded-lg text-sm" placeholder="Amount" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rate Basis</label>
                <select value={formData.costType} onChange={e => setFormData({...formData, costType: e.target.value as any})} className="w-full border p-2 rounded-lg text-sm bg-white">
                    <option>Per Room</option><option>Per Person</option>
                </select>
              </div>

              {/* Added Validity for Suppliers */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Valid From</label>
                <input type="date" value={formData.validFrom || ''} onChange={e => setFormData({...formData, validFrom: e.target.value})} className="w-full border p-2 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Valid To</label>
                <input type="date" value={formData.validTo || ''} onChange={e => setFormData({...formData, validTo: e.target.value})} className="w-full border p-2 rounded-lg text-sm" />
              </div>

              <div className="col-span-2 pt-4 border-t flex justify-end gap-3">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                 <button type="submit" className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700">Save Rate</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
