
import React, { useState } from 'react';
import { adminService } from '../../services/adminService';
import { currencyService } from '../../services/currencyService';
import { useAuth } from '../../context/AuthContext';
import { UserRole, Transfer } from '../../types';
import { Edit2, Trash2, Plus, X, Car } from 'lucide-react';
import { InventoryImportExport } from '../../components/admin/InventoryImportExport';

export const Transfers: React.FC = () => {
  const { user } = useAuth();
  const allDestinations = adminService.getDestinations();
  const allTransfers = adminService.getTransfers();
  const currencies = currencyService.getCurrencies();
  
  // Permissions
  const canEdit = user?.role === UserRole.ADMIN || user?.role === UserRole.STAFF || user?.role === UserRole.OPERATOR || user?.role === UserRole.SUPPLIER;
  
  // Agents should NOT see the Cost Price
  const showCost = user?.role !== UserRole.AGENT;

  // Filter Logic
  let displayedTransfers = allTransfers;
  if (user?.role === UserRole.OPERATOR) {
      displayedTransfers = allTransfers.filter(t => t.createdBy === user.id);
  } else if (user?.role === UserRole.SUPPLIER) {
      displayedTransfers = allTransfers.filter(t => user.linkedInventoryIds?.includes(t.id));
  }

  const [transfers, setTransfers] = useState<Transfer[]>(displayedTransfers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  
  const [formData, setFormData] = useState<Partial<Transfer>>({});

  const handleOpenModal = (transfer?: Transfer) => {
    if (transfer) {
      setEditingTransfer(transfer);
      setFormData(transfer);
    } else {
      if (user?.role === UserRole.SUPPLIER) {
          alert("Suppliers cannot create new inventory. Please contact Admin.");
          return;
      }
      setEditingTransfer(null);
      // Default values
      setFormData({ 
        isActive: true,
        destinationId: allDestinations[0]?.id || '',
        transferType: 'PVT',
        vehicleType: 'Sedan',
        maxPassengers: 3,
        costBasis: 'Per Vehicle',
        nightSurcharge: 0,
        cost: 0,
        currency: 'USD',
        description: '',
        notes: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.transferName || !formData.destinationId) return;

    adminService.saveTransfer({
      id: editingTransfer?.id || '',
      transferName: formData.transferName!,
      destinationId: formData.destinationId!,
      transferType: (formData.transferType || 'PVT') as any,
      vehicleType: formData.vehicleType || 'Sedan',
      maxPassengers: Number(formData.maxPassengers),
      cost: Number(formData.cost),
      currency: formData.currency || 'USD',
      costBasis: (formData.costBasis || 'Per Vehicle') as any,
      nightSurcharge: Number(formData.nightSurcharge),
      isActive: formData.isActive || false,
      createdBy: editingTransfer?.createdBy || user?.id,
      description: formData.description,
      notes: formData.notes
    });

    // Refresh Logic
    const freshAll = adminService.getTransfers();
    if (user?.role === UserRole.SUPPLIER) {
        setTransfers(freshAll.filter(t => user.linkedInventoryIds?.includes(t.id)));
    } else if (user?.role === UserRole.OPERATOR) {
        setTransfers(freshAll.filter(t => t.createdBy === user.id));
    } else {
        setTransfers(freshAll);
    }
    
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this transfer?')) {
      adminService.deleteTransfer(id);
      setTransfers(adminService.getTransfers());
    }
  };

  // Bulk Import
  const handleBulkImport = (data: any[]) => {
      // ... Implementation ...
      alert("Import restricted.");
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transfer Management</h1>
          <p className="text-slate-500">Configure airport transfers, inter-city transport, and vehicle fleets.</p>
        </div>
        {canEdit && (
            <div className="flex gap-3">
                {user?.role !== UserRole.SUPPLIER && (
                    <InventoryImportExport 
                        data={displayedTransfers}
                        headers={['id', 'transferName', 'destinationId', 'transferType', 'vehicleType', 'maxPassengers', 'cost', 'currency', 'costBasis', 'nightSurcharge', 'isActive']}
                        filename="transfers"
                        onImport={handleBulkImport}
                    />
                )}
                <button onClick={() => handleOpenModal()} className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 transition shadow-sm">
                    <Plus size={18} /> {user?.role === UserRole.SUPPLIER ? 'Edit Selected' : 'Add Transfer'}
                </button>
            </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 font-semibold">Transfer Name</th>
              <th className="px-6 py-4 font-semibold">Destination</th>
              <th className="px-6 py-4 font-semibold">Type</th>
              <th className="px-6 py-4 font-semibold">Vehicle (Pax)</th>
              {showCost && <th className="px-6 py-4 font-semibold">Cost</th>}
              {showCost && <th className="px-6 py-4 font-semibold">Surcharge</th>}
              <th className="px-6 py-4 font-semibold">Status</th>
              {canEdit && <th className="px-6 py-4 font-semibold text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transfers.map((transfer) => {
              const dest = allDestinations.find(d => d.id === transfer.destinationId);
              return (
                <tr key={transfer.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      <Car size={16} className="text-slate-400" />
                      <div>
                        {transfer.transferName}
                        {transfer.description && <p className="text-xs text-slate-400 font-normal truncate max-w-[200px]">{transfer.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{dest?.city}</td>
                  <td className="px-6 py-4 text-slate-600">
                    <span className={`px-2 py-0.5 text-xs rounded border ${transfer.transferType === 'PVT' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                        {transfer.transferType}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {transfer.vehicleType} <span className="text-slate-400">({transfer.maxPassengers} Pax)</span>
                  </td>
                  {showCost && (
                    <td className="px-6 py-4 font-mono text-slate-900">
                        {transfer.currency || 'USD'} {transfer.cost} <span className="text-xs text-slate-400">/{transfer.costBasis === 'Per Vehicle' ? 'Veh' : 'Pax'}</span>
                    </td>
                  )}
                  {showCost && (
                    <td className="px-6 py-4 text-slate-600">
                        {transfer.nightSurcharge > 0 ? <span className="text-amber-600">+{transfer.currency || 'USD'} {transfer.nightSurcharge}</span> : '-'}
                    </td>
                  )}
                  <td className="px-6 py-4">
                     <span className={`px-2 py-1 rounded-full text-xs font-semibold ${transfer.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                      {transfer.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-6 py-4 text-right">
                        <button onClick={() => handleOpenModal(transfer)} className="p-2 text-slate-500 hover:text-brand-600 transition">
                        <Edit2 size={16} />
                        </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {transfers.length === 0 && (
          <div className="p-8 text-center text-slate-500">
              {user?.role === UserRole.SUPPLIER
                    ? "No transfers linked to your account." 
                    : "No transfers found."}
          </div>
        )}
      </div>

      {isModalOpen && canEdit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-900">{editingTransfer ? 'Edit' : 'Add'} Transfer</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Transfer Name</label>
                <input required type="text" disabled={user?.role === UserRole.SUPPLIER} value={formData.transferName || ''} onChange={e => setFormData({...formData, transferName: e.target.value})} className="w-full border p-2 rounded-lg text-sm disabled:bg-slate-100" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Destination</label>
                <select disabled={user?.role === UserRole.SUPPLIER} value={formData.destinationId} onChange={e => setFormData({...formData, destinationId: e.target.value})} className="w-full border p-2 rounded-lg text-sm bg-white disabled:bg-slate-100">
                  {allDestinations.map(d => <option key={d.id} value={d.id}>{d.city}, {d.country}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Transfer Type</label>
                <select disabled={user?.role === UserRole.SUPPLIER} value={formData.transferType} onChange={e => setFormData({...formData, transferType: e.target.value as any})} className="w-full border p-2 rounded-lg text-sm bg-white disabled:bg-slate-100">
                  <option value="PVT">Private (PVT)</option>
                  <option value="SIC">Shared (SIC)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle Type</label>
                <input required type="text" disabled={user?.role === UserRole.SUPPLIER} value={formData.vehicleType || ''} onChange={e => setFormData({...formData, vehicleType: e.target.value})} className="w-full border p-2 rounded-lg text-sm disabled:bg-slate-100" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Max Passengers</label>
                <input required type="number" min="1" disabled={user?.role === UserRole.SUPPLIER} value={formData.maxPassengers || ''} onChange={e => setFormData({...formData, maxPassengers: Number(e.target.value)})} className="w-full border p-2 rounded-lg text-sm disabled:bg-slate-100" />
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
                    <input required type="number" min="0" value={formData.cost || ''} onChange={e => setFormData({...formData, cost: Number(e.target.value)})} className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" placeholder="0.00" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rate Basis</label>
                <select disabled={user?.role === UserRole.SUPPLIER} value={formData.costBasis} onChange={e => setFormData({...formData, costBasis: e.target.value as any})} className="border w-full p-2 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none disabled:bg-slate-100">
                    <option value="Per Vehicle">Per Vehicle</option>
                    <option value="Per Person">Per Person</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Night Surcharge</label>
                <input required type="number" min="0" value={formData.nightSurcharge || ''} onChange={e => setFormData({...formData, nightSurcharge: Number(e.target.value)})} className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Extra cost" />
              </div>

              <div className="col-span-2 flex gap-6 pt-2">
                 <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.isActive || false} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="rounded text-brand-600 focus:ring-brand-500" />
                    <span className="text-sm text-slate-700">Active</span>
                 </label>
              </div>

              <div className="col-span-2 pt-4 border-t flex justify-end gap-3">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                 <button type="submit" className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700">Save Transfer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
