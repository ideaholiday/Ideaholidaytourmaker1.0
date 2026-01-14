
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../services/adminService';
import { Hotel, Transfer, UserRole } from '../../types';
import { Store, RefreshCw, AlertTriangle, CheckCircle, Save, Calendar, Ban } from 'lucide-react';
import { auditLogService } from '../../services/auditLogService';

export const SupplierDashboard: React.FC = () => {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<(Hotel | Transfer)[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Edit State
  const [editCost, setEditCost] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<boolean>(true);
  const [editBlackout, setEditBlackout] = useState<string>('');

  useEffect(() => {
    loadInventory();
  }, [user]);

  const loadInventory = () => {
    if (!user || user.role !== UserRole.SUPPLIER || !user.linkedInventoryIds) return;

    if (user.supplierType === 'HOTEL') {
        const allHotels = adminService.getHotels();
        setInventory(allHotels.filter(h => user.linkedInventoryIds?.includes(h.id)));
    } else if (user.supplierType === 'TRANSPORT') {
        const allTransfers = adminService.getTransfers();
        setInventory(allTransfers.filter(t => user.linkedInventoryIds?.includes(t.id)));
    }
  };

  const handleEdit = (item: Hotel | Transfer) => {
      setEditingId(item.id);
      setEditCost(item.cost);
      setEditStatus(item.isActive);
      setEditBlackout(item.blackoutDates?.join(', ') || '');
  };

  const handleCancel = () => {
      setEditingId(null);
  };

  const handleSave = (item: Hotel | Transfer) => {
      if (!user) return;

      const blackoutDates = editBlackout.split(',').map(d => d.trim()).filter(d => d.match(/^\d{4}-\d{2}-\d{2}$/)); // Basic validation YYYY-MM-DD

      if (user.supplierType === 'HOTEL') {
          const hotel = item as Hotel;
          adminService.saveHotel({
              ...hotel,
              cost: editCost,
              isActive: editStatus,
              blackoutDates
          });
      } else {
          const transfer = item as Transfer;
          adminService.saveTransfer({
              ...transfer,
              cost: editCost,
              isActive: editStatus,
              blackoutDates
          });
      }

      // Audit Log
      auditLogService.logAction({
          entityType: 'SUPPLIER_UPDATE',
          entityId: item.id,
          action: 'INVENTORY_UPDATE',
          description: `Supplier updated rates/availability for ${item.id}`,
          user: user,
          previousValue: { cost: item.cost, active: item.isActive },
          newValue: { cost: editCost, active: editStatus, blackout: blackoutDates }
      });

      setEditingId(null);
      loadInventory();
  };

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Store className="text-brand-600" /> Supplier Extranet
          </h1>
          <p className="text-slate-500">
            Welcome, <strong>{user.companyName || user.name}</strong>. Manage your {user.supplierType?.toLowerCase()} rates and availability below.
          </p>
        </div>
        <button onClick={loadInventory} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-brand-600 transition shadow-sm">
            <RefreshCw size={20} />
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h2 className="font-bold text-slate-800">My Inventory</h2>
              <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                  {inventory.length} Items Listed
              </span>
          </div>

          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                  <thead className="bg-white text-slate-500 border-b border-slate-100">
                      <tr>
                          <th className="px-6 py-4 font-semibold">Service Name</th>
                          <th className="px-6 py-4 font-semibold">Details</th>
                          <th className="px-6 py-4 font-semibold">Current Rate</th>
                          <th className="px-6 py-4 font-semibold">Availability</th>
                          <th className="px-6 py-4 font-semibold text-right">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
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
                                              <button onClick={handleCancel} className="text-xs font-medium text-slate-600 hover:bg-slate-200 px-3 py-1.5 rounded">Cancel</button>
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
                          <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-slate-500 bg-slate-50">
                                  No inventory items linked to your account. Please contact Admin.
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
};
