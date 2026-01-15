
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../services/adminService';
import { bookingService } from '../../services/bookingService';
import { currencyService } from '../../services/currencyService';
import { Hotel, Transfer, UserRole, Booking, ItineraryService, Destination } from '../../types';
import { Store, RefreshCw, AlertTriangle, CheckCircle, Save, Calendar, Ban, User, BedDouble, Car, Clock, Search, LogOut, Plus, X } from 'lucide-react';
import { auditLogService } from '../../services/auditLogService';

type Tab = 'DASHBOARD' | 'RESERVATIONS' | 'INVENTORY';

interface ReservationRow {
  bookingId: string;
  bookingRef: string;
  status: string;
  guestName: string;
  pax: number;
  serviceDate: string; // Calculated Check-in
  serviceName: string;
  details: string; // Room Type or Vehicle
  nights?: number; // Estimated
}

export const SupplierDashboard: React.FC = () => {
  const { user, reloadUser } = useAuth(); // specific reload to refresh linkedIds in context if needed
  const [activeTab, setActiveTab] = useState<Tab>('DASHBOARD');
  
  // Inventory State
  const [inventory, setInventory] = useState<(Hotel | Transfer)[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [currencies, setCurrencies] = useState<string[]>([]);
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCost, setEditCost] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<boolean>(true);
  const [editBlackout, setEditBlackout] = useState<string>('');

  // Add New Inventory State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newInventory, setNewInventory] = useState<Partial<Hotel>>({
      currency: 'USD',
      season: 'Off-Peak',
      category: '4 Star',
      mealPlan: 'BB',
      costType: 'Per Room',
      isActive: true,
      validFrom: new Date().toISOString().split('T')[0],
      validTo: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
  });

  // Reservations State
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
        loadData();
        // Load helpers
        setDestinations(adminService.getDestinations().filter(d => d.isActive));
        setCurrencies(currencyService.getCurrencies().map(c => c.code));
    }
  }, [user]);

  const loadData = () => {
    if (!user || user.role !== UserRole.SUPPLIER) return;

    // 1. Load Inventory
    // Safeguard: linkedInventoryIds might be missing in old data
    const linkedIds = user.linkedInventoryIds || [];
    
    let myItems: (Hotel | Transfer)[] = [];
    if (user.supplierType === 'HOTEL') {
        const allHotels = adminService.getHotels();
        myItems = allHotels.filter(h => linkedIds.includes(h.id));
    } else if (user.supplierType === 'TRANSPORT') {
        const allTransfers = adminService.getTransfers();
        myItems = allTransfers.filter(t => linkedIds.includes(t.id));
    }
    setInventory(myItems);

    // 2. Load Bookings & Process Reservations
    const allBookings = bookingService.getAllBookings();
    const myReservations: ReservationRow[] = [];

    allBookings.forEach(booking => {
        // Iterate days to find services linked to this supplier
        booking.itinerary?.forEach(day => {
            day.services?.forEach(svc => {
                if (linkedIds.includes(svc.id)) {
                    // Calculate Service Date: TravelDate + (Day - 1)
                    const travelDate = new Date(booking.travelDate);
                    const serviceDate = new Date(travelDate);
                    serviceDate.setDate(travelDate.getDate() + (day.day - 1));

                    // Extract meta details
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
                        details: details
                    });
                }
            });
        });
    });

    // Sort by Date (Recent first)
    myReservations.sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime());
    setReservations(myReservations);
  };

  const handleEdit = (item: Hotel | Transfer) => {
      setEditingId(item.id);
      setEditCost(item.cost);
      setEditStatus(item.isActive);
      setEditBlackout(item.blackoutDates?.join(', ') || '');
  };

  const handleSave = (item: Hotel | Transfer) => {
      if (!user) return;
      const blackoutDates = editBlackout.split(',').map(d => d.trim()).filter(d => d.match(/^\d{4}-\d{2}-\d{2}$/)); 

      if (user.supplierType === 'HOTEL') {
          adminService.saveHotel({ ...item as Hotel, cost: editCost, isActive: editStatus, blackoutDates });
      } else {
          adminService.saveTransfer({ ...item as Transfer, cost: editCost, isActive: editStatus, blackoutDates });
      }

      auditLogService.logAction({
          entityType: 'SUPPLIER_UPDATE',
          entityId: item.id,
          action: 'INVENTORY_UPDATE',
          description: `Supplier updated rates for ${item.id}`,
          user: user,
          newValue: { cost: editCost, active: editStatus }
      });

      setEditingId(null);
      loadData();
  };

  const handleCreateInventory = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user || !newInventory.name || !newInventory.destinationId) return;

      // 1. Create the Hotel Object
      const newItem: Hotel = {
          ...newInventory,
          id: `h_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          createdBy: user.id
      } as Hotel;

      // 2. Save to System
      adminService.saveHotel(newItem);

      // 3. Link to Supplier (Update User Record)
      // Note: We need to update the actual user record in DB
      const currentUserRecord = adminService.getUsers().find(u => u.id === user.id);
      if (currentUserRecord) {
          const currentLinks = currentUserRecord.linkedInventoryIds || [];
          const updatedLinks = [...currentLinks, newItem.id];
          
          adminService.saveUser({
              ...currentUserRecord,
              linkedInventoryIds: updatedLinks
          });
          
          // Force reload to reflect changes
          await reloadUser();
      }

      auditLogService.logAction({
          entityType: 'SUPPLIER_UPDATE',
          entityId: newItem.id,
          action: 'INVENTORY_CREATED',
          description: `Supplier created new inventory: ${newItem.name}`,
          user: user,
          newValue: newItem
      });

      setIsAddModalOpen(false);
      // Reset form
      setNewInventory({
        currency: 'USD',
        season: 'Off-Peak',
        category: '4 Star',
        mealPlan: 'BB',
        costType: 'Per Room',
        isActive: true,
        validFrom: new Date().toISOString().split('T')[0],
        validTo: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
      });
      loadData();
      alert("Inventory added successfully!");
  };

  if (!user) return null;

  // --- STATS CALCULATION ---
  const today = new Date().toISOString().split('T')[0];
  const arrivalsToday = reservations.filter(r => r.serviceDate === today && r.status === 'CONFIRMED').length;
  const inHouseGuests = reservations.filter(r => {
      const d = new Date(r.serviceDate);
      const now = new Date();
      const diff = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
      return diff >= 0 && diff < 3 && r.status === 'CONFIRMED';
  }).length;

  const filteredReservations = reservations.filter(r => 
      (r.guestName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.bookingRef || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Store className="text-brand-600" /> Partner Extranet
          </h1>
          <p className="text-slate-500">
            {user.companyName || user.name} &bull; <span className="text-brand-600 font-medium">{user.supplierType} Partner</span>
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
              <Store size={16} /> Overview
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
              <BedDouble size={16} /> Manage Inventory
          </button>
      </div>

      {/* --- DASHBOARD TAB --- */}
      {activeTab === 'DASHBOARD' && (
          <div className="animate-in fade-in slide-in-from-bottom-2">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Arrivals Today</p>
                      <div className="flex items-center justify-between mt-2">
                          <h3 className="text-3xl font-bold text-slate-900">{arrivalsToday}</h3>
                          <div className="p-2 bg-green-50 text-green-600 rounded-lg"><LogOut size={20} className="rotate-180"/></div>
                      </div>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">In-House Guests</p>
                      <div className="flex items-center justify-between mt-2">
                          <h3 className="text-3xl font-bold text-slate-900">{inHouseGuests}</h3>
                          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><User size={20}/></div>
                      </div>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Inventory</p>
                      <div className="flex items-center justify-between mt-2">
                          <h3 className="text-3xl font-bold text-slate-900">{inventory.filter(i => i.isActive).length}</h3>
                          <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><CheckCircle size={20}/></div>
                      </div>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Bookings</p>
                      <div className="flex items-center justify-between mt-2">
                          <h3 className="text-3xl font-bold text-slate-900">{reservations.length}</h3>
                          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Clock size={20}/></div>
                      </div>
                  </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-bold text-slate-900 mb-4">Upcoming Arrivals (Next 7 Days)</h3>
                  {/* Simplified mini table for dashboard */}
                  <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 text-slate-500">
                              <tr>
                                  <th className="px-4 py-2">Date</th>
                                  <th className="px-4 py-2">Guest</th>
                                  <th className="px-4 py-2">Details</th>
                                  <th className="px-4 py-2">Status</th>
                              </tr>
                          </thead>
                          <tbody>
                              {reservations
                                  .filter(r => {
                                      const d = new Date(r.serviceDate);
                                      const now = new Date();
                                      const diff = (d.getTime() - now.getTime()) / (1000 * 3600 * 24);
                                      return diff >= 0 && diff <= 7 && r.status === 'CONFIRMED';
                                  })
                                  .slice(0, 5)
                                  .map((r, i) => (
                                      <tr key={i} className="border-b border-slate-100 last:border-0">
                                          <td className="px-4 py-3 font-medium text-slate-700">{r.serviceDate}</td>
                                          <td className="px-4 py-3">{r.guestName} <span className="text-xs text-slate-400">({r.pax} Pax)</span></td>
                                          <td className="px-4 py-3 text-slate-600">{r.details}</td>
                                          <td className="px-4 py-3"><span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">Confirmed</span></td>
                                      </tr>
                                  ))}
                              {reservations.filter(r => new Date(r.serviceDate) >= new Date()).length === 0 && (
                                  <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No upcoming arrivals in the next 7 days.</td></tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {/* --- RESERVATIONS TAB --- */}
      {activeTab === 'RESERVATIONS' && (
          <div className="animate-in fade-in slide-in-from-right-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6">
                  <div className="relative">
                      <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                      <input 
                          type="text" 
                          placeholder="Search by Guest Name or Booking Ref..."
                          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                      />
                  </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                          <tr>
                              <th className="px-6 py-4 font-semibold">Service Date</th>
                              <th className="px-6 py-4 font-semibold">Booking Ref</th>
                              <th className="px-6 py-4 font-semibold">Guest Name</th>
                              <th className="px-6 py-4 font-semibold">Service Details</th>
                              <th className="px-6 py-4 font-semibold">Status</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {filteredReservations.map((r, i) => (
                              <tr key={i} className="hover:bg-slate-50 transition">
                                  <td className="px-6 py-4 font-mono text-slate-700">{r.serviceDate}</td>
                                  <td className="px-6 py-4 font-medium text-brand-600">{r.bookingRef}</td>
                                  <td className="px-6 py-4">
                                      <div className="font-medium text-slate-900">{r.guestName}</div>
                                      <div className="text-xs text-slate-500">{r.pax} Guests</div>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="text-slate-800">{r.serviceName}</div>
                                      <div className="text-xs text-slate-500">{r.details}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                                          r.status === 'CONFIRMED' || r.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                          r.status.includes('CANCEL') ? 'bg-red-100 text-red-700' :
                                          'bg-amber-100 text-amber-700'
                                      }`}>
                                          {r.status === 'CONFIRMED' ? <CheckCircle size={12}/> : 
                                           r.status.includes('CANCEL') ? <AlertTriangle size={12}/> : <Clock size={12}/>}
                                          {r.status.replace('_', ' ')}
                                      </span>
                                  </td>
                              </tr>
                          ))}
                          {filteredReservations.length === 0 && (
                              <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">No reservations found.</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* --- INVENTORY TAB --- */}
      {activeTab === 'INVENTORY' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              
              {/* Actions Bar */}
              <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-800">Your Inventory</h3>
                  {user.supplierType === 'HOTEL' && (
                      <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 transition shadow-sm font-medium"
                      >
                          <Plus size={18} /> Add Inventory
                      </button>
                  )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                              <tr>
                                  <th className="px-6 py-4 font-semibold">Service Name</th>
                                  <th className="px-6 py-4 font-semibold">Details</th>
                                  <th className="px-6 py-4 font-semibold">Current Rate</th>
                                  <th className="px-6 py-4 font-semibold">Availability</th>
                                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {inventory.map(item => {
                                  const isEditing = editingId === item.id;
                                  const name = 'name' in item ? item.name : item.transferName;
                                  const detail = 'roomType' in item ? `${item.roomType} (${item.mealPlan})` : `${item.vehicleType} (${item.transferType})`;

                                  return (
                                      <tr key={item.id} className={isEditing ? 'bg-blue-50' : 'hover:bg-slate-50'}>
                                          <td className="px-6 py-4 font-medium text-slate-900">
                                              {name}
                                              {item.blackoutDates && item.blackoutDates.length > 0 && !isEditing && (
                                                  <div className="flex items-center gap-1 text-[10px] text-red-500 mt-1">
                                                      <Ban size={10} /> {item.blackoutDates.length} Blackout Dates
                                                  </div>
                                              )}
                                          </td>
                                          <td className="px-6 py-4 text-slate-600">{detail}</td>
                                          
                                          {/* COST */}
                                          <td className="px-6 py-4">
                                              {isEditing ? (
                                                  <div className="flex items-center gap-2">
                                                      <span className="text-slate-400 font-bold">{item.currency}</span>
                                                      <input 
                                                          type="number" 
                                                          value={editCost} 
                                                          onChange={e => setEditCost(Number(e.target.value))}
                                                          className="w-24 border border-blue-300 rounded px-2 py-1 font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                                                      />
                                                  </div>
                                              ) : (
                                                  <span className="font-mono font-bold text-slate-800">{item.currency} {item.cost.toLocaleString()}</span>
                                              )}
                                          </td>

                                          {/* STATUS & BLACKOUT */}
                                          <td className="px-6 py-4">
                                              {isEditing ? (
                                                  <div className="space-y-2">
                                                      <label className="flex items-center gap-2 cursor-pointer">
                                                          <input 
                                                              type="checkbox" 
                                                              checked={editStatus} 
                                                              onChange={e => setEditStatus(e.target.checked)}
                                                              className="rounded text-blue-600 focus:ring-blue-500" 
                                                          />
                                                          <span className="text-sm">Active for Booking</span>
                                                      </label>
                                                      <div>
                                                          <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1 mb-1"><Calendar size={10}/> Blackout Dates (YYYY-MM-DD)</label>
                                                          <input 
                                                              type="text" 
                                                              value={editBlackout} 
                                                              onChange={e => setEditBlackout(e.target.value)}
                                                              placeholder="2024-12-25, 2024-12-31"
                                                              className="w-full border border-blue-300 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                                                          />
                                                      </div>
                                                  </div>
                                              ) : (
                                                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                      {item.isActive ? <CheckCircle size={12}/> : <AlertTriangle size={12}/>}
                                                      {item.isActive ? 'Active' : 'Inactive'}
                                                  </span>
                                              )}
                                          </td>

                                          {/* ACTIONS */}
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
                                                      Update
                                                  </button>
                                              )}
                                          </td>
                                      </tr>
                                  );
                              })}
                              {inventory.length === 0 && (
                                  <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">No inventory items. Use "Add Inventory" to create new rates.</td></tr>
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
              <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <Plus size={20} className="text-brand-600"/> Add Hotel Inventory
                      </h2>
                      <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition"><X size={20}/></button>
                  </div>

                  <form onSubmit={handleCreateInventory} className="space-y-4">
                      
                      {/* Name & Destination */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Hotel Name</label>
                              <input 
                                  required 
                                  type="text" 
                                  value={newInventory.name || ''} 
                                  onChange={e => setNewInventory({...newInventory, name: e.target.value})} 
                                  className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                  placeholder="e.g. Marina Byblos"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">City / Location</label>
                              <select 
                                  required
                                  value={newInventory.destinationId} 
                                  onChange={e => setNewInventory({...newInventory, destinationId: e.target.value})}
                                  className="w-full border p-2 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                              >
                                  <option value="">Select City...</option>
                                  {destinations.map(d => (
                                      <option key={d.id} value={d.id}>{d.city}, {d.country}</option>
                                  ))}
                              </select>
                          </div>
                      </div>

                      {/* Room & Meal */}
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Room Type</label>
                              <input 
                                  required 
                                  type="text" 
                                  value={newInventory.roomType || ''} 
                                  onChange={e => setNewInventory({...newInventory, roomType: e.target.value})} 
                                  className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                  placeholder="e.g. Deluxe Room"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Meal Plan</label>
                              <select 
                                  value={newInventory.mealPlan} 
                                  onChange={e => setNewInventory({...newInventory, mealPlan: e.target.value as any})}
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

                      {/* Cost & Currency */}
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Cost Rate</label>
                              <div className="flex gap-2">
                                  <select 
                                      value={newInventory.currency} 
                                      onChange={e => setNewInventory({...newInventory, currency: e.target.value})}
                                      className="w-20 border p-2 rounded-lg text-sm bg-slate-50 font-bold focus:ring-2 focus:ring-brand-500 outline-none"
                                  >
                                      {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                                  </select>
                                  <input 
                                      required 
                                      type="number" 
                                      min="0"
                                      value={newInventory.cost || ''} 
                                      onChange={e => setNewInventory({...newInventory, cost: Number(e.target.value)})} 
                                      className="flex-1 border p-2 rounded-lg text-sm font-mono focus:ring-2 focus:ring-brand-500 outline-none"
                                      placeholder="0.00"
                                  />
                              </div>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Rate Basis</label>
                              <select 
                                  value={newInventory.costType} 
                                  onChange={e => setNewInventory({...newInventory, costType: e.target.value as any})}
                                  className="w-full border p-2 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                              >
                                  <option value="Per Room">Per Room</option>
                                  <option value="Per Person">Per Person</option>
                              </select>
                          </div>
                      </div>

                      {/* Metadata */}
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                              <select 
                                  value={newInventory.category} 
                                  onChange={e => setNewInventory({...newInventory, category: e.target.value as any})}
                                  className="w-full border p-2 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                              >
                                  <option value="3 Star">3 Star</option>
                                  <option value="4 Star">4 Star</option>
                                  <option value="5 Star">5 Star</option>
                                  <option value="Luxury">Luxury</option>
                              </select>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Season</label>
                              <select 
                                  value={newInventory.season} 
                                  onChange={e => setNewInventory({...newInventory, season: e.target.value as any})}
                                  className="w-full border p-2 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                              >
                                  <option value="Off-Peak">Off-Peak</option>
                                  <option value="Peak">Peak</option>
                                  <option value="Shoulder">Shoulder</option>
                              </select>
                          </div>
                      </div>

                      {/* Validity */}
                      <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valid From</label>
                              <input 
                                  type="date" 
                                  value={newInventory.validFrom} 
                                  onChange={e => setNewInventory({...newInventory, validFrom: e.target.value})} 
                                  className="w-full border p-1.5 rounded text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valid To</label>
                              <input 
                                  type="date" 
                                  value={newInventory.validTo} 
                                  onChange={e => setNewInventory({...newInventory, validTo: e.target.value})} 
                                  className="w-full border p-1.5 rounded text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                              />
                          </div>
                      </div>

                      <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                          <button 
                              type="button" 
                              onClick={() => setIsAddModalOpen(false)}
                              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                          >
                              Cancel
                          </button>
                          <button 
                              type="submit" 
                              className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-brand-700 shadow-sm flex items-center gap-2"
                          >
                              <Plus size={16} /> Add Inventory
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
