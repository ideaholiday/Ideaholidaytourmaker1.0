import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../services/adminService';
import { inventoryService } from '../../services/inventoryService';
import { bookingService } from '../../services/bookingService';
import { currencyService } from '../../services/currencyService';
import { UserRole, Destination, OperatorInventoryItem } from '../../types';
import { Store, RefreshCw, AlertTriangle, CheckCircle, Save, Calendar, Ban, User, BedDouble, Clock, Search, LogOut, Plus, X, TrendingUp, BarChart3, DollarSign, ArrowRight } from 'lucide-react';
import { auditLogService } from '../../services/auditLogService';
import { InventoryStatusBadge } from '../../components/inventory/InventoryStatusBadge';

type Tab = 'DASHBOARD' | 'RESERVATIONS' | 'INVENTORY';

interface ReservationRow {
  bookingId: string;
  bookingRef: string;
  status: string;
  guestName: string;
  pax: number;
  serviceDate: string;
  serviceName: string;
  details: string;
  nights: number;
  netValue: number;
}

export const SupplierDashboard: React.FC = () => {
  const { user } = useAuth(); 
  const [activeTab, setActiveTab] = useState<Tab>('DASHBOARD');
  
  // Inventory State (Using OperatorInventoryItem type now for workflow support)
  const [inventory, setInventory] = useState<OperatorInventoryItem[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [currencies, setCurrencies] = useState<string[]>([]);
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCost, setEditCost] = useState<number>(0);
  
  // Add New Inventory State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItemData, setNewItemData] = useState<Partial<OperatorInventoryItem>>({
      type: 'HOTEL',
      currency: 'INR', // Default INR
      status: 'PENDING_APPROVAL'
  });

  // Reservations State
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
        loadData();
        setDestinations(adminService.getDestinationsSync().filter(d => d.isActive));
        setCurrencies(currencyService.getCurrencies().map(c => c.code));
    }
  }, [user]);

  const loadData = async () => {
    if (!user || user.role !== UserRole.HOTEL_PARTNER) return;

    // 1. Load Inventory (Created by this supplier)
    // NOTE: In the new model, Partners create their own items in the inventory service
    const myItems = await inventoryService.getItemsByOperator(user.id);
    setInventory(myItems);

    // 2. Load Bookings (Logic remains similar but mapped to inventory IDs)
    const allBookings = await bookingService.getAllBookings();
    const myReservations: ReservationRow[] = [];
    const myInventoryIds = myItems.map(i => i.id);

    allBookings.forEach(booking => {
        booking.itinerary?.forEach(day => {
            day.services?.forEach(svc => {
                // Check if service ID matches one of my inventory items
                if (svc.inventory_id && myInventoryIds.includes(svc.inventory_id)) {
                    const travelDate = new Date(booking.travelDate);
                    const serviceDate = new Date(travelDate);
                    serviceDate.setDate(travelDate.getDate() + (day.day - 1));

                    let details = '-';
                    if (svc.meta?.roomType) details = `${svc.meta.roomType} (${svc.meta.mealPlan})`;
                    if (svc.meta?.vehicle) details = svc.meta.vehicle;

                    myReservations.push({
                        bookingId: booking.id,
                        bookingRef: booking.uniqueRefNo || 'N/A',
                        status: booking.status || 'REQUESTED',
                        guestName: booking.travelers?.[0] ? `${booking.travelers[0].firstName} ${booking.travelers[0].lastName}` : (booking.agentName || 'Unknown'),
                        pax: booking.paxCount || 0,
                        serviceDate: serviceDate.toISOString().split('T')[0],
                        serviceName: svc.name || 'Service',
                        details: details,
                        nights: 1, 
                        netValue: svc.cost || 0
                    });
                }
            });
        });
    });

    myReservations.sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime());
    setReservations(myReservations);
  };

  const handleEdit = (item: OperatorInventoryItem) => {
      setEditingId(item.id);
      setEditCost(item.costPrice);
  };

  const handleSave = (item: OperatorInventoryItem) => {
      if (!user) return;
      
      // Updating cost triggers status reset to PENDING_APPROVAL
      inventoryService.updateItem(item.id, { costPrice: editCost }, user);
      
      setEditingId(null);
      loadData();
      alert("Rate updated. Item is now Pending Approval.");
  };

  const handleCreateInventory = (e: React.FormEvent) => {
      e.preventDefault();
      if (!user || !newItemData.name || !newItemData.destinationId) return;

      try {
          // FORCE CURRENCY TO INR
          const payload = { ...newItemData, currency: 'INR' };
          inventoryService.createItem(payload, user);
          setIsAddModalOpen(false);
          loadData();
          // Reset Form
          setNewItemData({ type: 'HOTEL', currency: 'INR', status: 'PENDING_APPROVAL' });
          alert("Inventory submitted for Admin approval.");
      } catch (e: any) {
          alert(e.message);
      }
  };

  if (!user) return null;

  // --- KPI CALCS ---
  const today = new Date().toISOString().split('T')[0];
  const arrivalsToday = reservations.filter(r => r.serviceDate === today && r.status === 'CONFIRMED').length;
  const currentMonth = new Date().getMonth();
  const revenueThisMonth = reservations
    .filter(r => new Date(r.serviceDate).getMonth() === currentMonth && r.status === 'CONFIRMED')
    .reduce((sum, r) => sum + (r.netValue || 0), 0);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Store className="text-brand-600" /> Partner Console
          </h1>
          <p className="text-slate-500">
            {user.companyName || user.name} &bull; <span className="text-brand-600 font-medium">Hotel Partner</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
                <p className="text-xs text-slate-400 font-bold uppercase">System Date</p>
                <p className="text-sm font-mono font-bold text-slate-700">{today}</p>
            </div>
            <button onClick={loadData} className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-brand-600 transition shadow-sm">
                <RefreshCw size={18} />
            </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 mb-6">
          <button 
            onClick={() => setActiveTab('DASHBOARD')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${activeTab === 'DASHBOARD' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
              <BarChart3 size={16} /> Overview
          </button>
          <button 
            onClick={() => setActiveTab('RESERVATIONS')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${activeTab === 'RESERVATIONS' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
              <Calendar size={16} /> Reservations
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">{reservations.length}</span>
          </button>
          <button 
            onClick={() => setActiveTab('INVENTORY')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${activeTab === 'INVENTORY' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
              <BedDouble size={16} /> Manage Rates
          </button>
      </div>

      {/* --- DASHBOARD TAB --- */}
      {activeTab === 'DASHBOARD' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Arrivals Today</p>
                      <div className="flex items-center justify-between mt-2">
                          <h3 className="text-2xl font-bold text-slate-900">{arrivalsToday}</h3>
                          <div className="p-2 bg-green-50 text-green-600 rounded-lg"><LogOut size={20} className="rotate-180"/></div>
                      </div>
                  </div>
                  <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Bookings</p>
                      <div className="flex items-center justify-between mt-2">
                          <h3 className="text-2xl font-bold text-slate-900">{reservations.length}</h3>
                          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Clock size={20}/></div>
                      </div>
                  </div>
                  <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Est. Revenue (Month)</p>
                      <div className="flex items-center justify-between mt-2">
                          <h3 className="text-2xl font-bold text-emerald-700">${revenueThisMonth.toLocaleString()}</h3>
                          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><TrendingUp size={20}/></div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- INVENTORY TAB --- */}
      {activeTab === 'INVENTORY' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-800">Your Hotel & Rates</h3>
                  <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 transition shadow-sm font-medium"
                  >
                      <Plus size={18} /> Add Rate
                  </button>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                              <tr>
                                  <th className="px-6 py-4 font-semibold">Service Name</th>
                                  <th className="px-6 py-4 font-semibold">Details</th>
                                  <th className="px-6 py-4 font-semibold">Net Rate</th>
                                  <th className="px-6 py-4 font-semibold">Status</th>
                                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {inventory.map(item => {
                                  const isEditing = editingId === item.id;
                                  const detail = `${item.roomType || ''} ${item.mealPlan ? `(${item.mealPlan})` : ''}`;

                                  return (
                                      <tr key={item.id} className={isEditing ? 'bg-blue-50' : 'hover:bg-slate-50'}>
                                          <td className="px-6 py-4 font-medium text-slate-900">
                                              {item.name}
                                              <p className="text-xs text-slate-400">{item.description}</p>
                                          </td>
                                          <td className="px-6 py-4 text-slate-600">{detail}</td>
                                          <td className="px-6 py-4">
                                              {isEditing ? (
                                                  <div className="flex items-center gap-2">
                                                      <span className="text-slate-400 font-bold">{item.currency || 'INR'}</span>
                                                      <input 
                                                          type="number" 
                                                          value={editCost} 
                                                          onChange={e => setEditCost(Number(e.target.value))}
                                                          className="w-24 border border-blue-300 rounded px-2 py-1 font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                                                      />
                                                  </div>
                                              ) : (
                                                  <span className="font-mono font-bold text-slate-800">{item.currency || 'INR'} {item.costPrice.toLocaleString()}</span>
                                              )}
                                          </td>
                                          <td className="px-6 py-4">
                                              <InventoryStatusBadge status={item.status} reason={item.rejectionReason} />
                                          </td>
                                          <td className="px-6 py-4 text-right">
                                              {isEditing ? (
                                                  <div className="flex justify-end gap-2">
                                                      <button onClick={() => setEditingId(null)} className="text-xs font-medium text-slate-600 hover:bg-slate-200 px-3 py-1.5 rounded">Cancel</button>
                                                      <button onClick={() => handleSave(item)} className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded flex items-center gap-1 shadow-sm">
                                                          <Save size={12} /> Save
                                                      </button>
                                                  </div>
                                              ) : (
                                                  <button onClick={() => handleEdit(item)} className="text-sm font-medium text-brand-600 hover:text-brand-800 border border-brand-200 hover:border-brand-300 px-4 py-1.5 rounded-lg transition bg-white">
                                                      Edit Rate
                                                  </button>
                                              )}
                                          </td>
                                      </tr>
                                  );
                              })}
                              {inventory.length === 0 && (
                                  <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">No inventory found. Add your first hotel rate.</td></tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {/* --- ADD INVENTORY MODAL --- */}
      {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <Plus size={20} className="text-brand-600"/> Add Hotel Rate
                      </h2>
                      <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition"><X size={20}/></button>
                  </div>

                  <form onSubmit={handleCreateInventory} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Hotel Name</label>
                              <input 
                                  required 
                                  type="text" 
                                  value={newItemData.name || ''} 
                                  onChange={e => setNewItemData({...newItemData, name: e.target.value})} 
                                  className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                  placeholder="e.g. Marina View"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                              <select 
                                  required
                                  value={newItemData.destinationId} 
                                  onChange={e => setNewItemData({...newItemData, destinationId: e.target.value})}
                                  className="w-full border p-2 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                              >
                                  <option value="">Select City...</option>
                                  {destinations.map(d => (
                                      <option key={d.id} value={d.id}>{d.city}, {d.country}</option>
                                  ))}
                              </select>
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Room Type</label>
                              <input 
                                  required 
                                  type="text" 
                                  value={newItemData.roomType || ''} 
                                  onChange={e => setNewItemData({...newItemData, roomType: e.target.value})} 
                                  className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                  placeholder="e.g. Deluxe Room"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Meal Plan</label>
                              <select 
                                  value={newItemData.mealPlan} 
                                  onChange={e => setNewItemData({...newItemData, mealPlan: e.target.value as any})}
                                  className="w-full border p-2 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                              >
                                  <option value="RO">Room Only</option>
                                  <option value="BB">Bed & Breakfast</option>
                                  <option value="HB">Half Board</option>
                                  <option value="FB">Full Board</option>
                                  <option value="AI">All Inclusive</option>
                              </select>
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Net Cost</label>
                              <input 
                                  required 
                                  type="number" 
                                  min="0"
                                  value={newItemData.costPrice || ''} 
                                  onChange={e => setNewItemData({...newItemData, costPrice: Number(e.target.value)})} 
                                  className="w-full border p-2 rounded-lg text-sm font-mono focus:ring-2 focus:ring-brand-500 outline-none"
                                  placeholder="0.00"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                              <div className="w-full border p-2 rounded-lg text-sm bg-slate-50 font-bold text-slate-600">
                                  INR
                              </div>
                          </div>
                      </div>

                      {newItemData.type === 'HOTEL' && (
                          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                                  <select className="w-full border p-2 rounded text-sm" onChange={e => setNewItemData({...newItemData, category: e.target.value as any})}>
                                      <option>3 Star</option><option>4 Star</option><option>5 Star</option>
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Meal Plan</label>
                                  <select className="w-full border p-2 rounded text-sm" onChange={e => setNewItemData({...newItemData, mealPlan: e.target.value as any})}>
                                      <option>RO</option><option>BB</option><option>HB</option>
                                  </select>
                              </div>
                          </div>
                      )}

                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                          <textarea 
                              className="w-full border p-2 rounded-lg h-24 resize-none text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                              placeholder="Amenities, view, etc."
                              value={newItemData.description || ''}
                              onChange={e => setNewItemData({...newItemData, description: e.target.value})}
                          />
                      </div>

                      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                          <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
                          <button type="submit" className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-brand-700 shadow-sm flex items-center gap-2">
                              <Plus size={16} /> Submit for Approval
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};