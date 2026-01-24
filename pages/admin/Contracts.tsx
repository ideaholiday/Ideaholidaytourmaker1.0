
import React, { useState, useEffect } from 'react';
import { contractService } from '../../services/contractService';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { SupplierContract, UserRole, User, Destination, PricingModel } from '../../types';
import { ContractStatusBadge } from '../../components/contracts/ContractStatusBadge';
import { Plus, Edit2, Search, Filter, FileText, CheckCircle, X, Save } from 'lucide-react';

export const Contracts: React.FC = () => {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<SupplierContract[]>([]);
  const [suppliers, setSuppliers] = useState<User[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  
  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<SupplierContract | null>(null);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState<Partial<SupplierContract>>({});

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = () => {
    // Load Suppliers
    const allUsers = adminService.getUsers();
    setSuppliers(allUsers.filter(u => u.role === UserRole.HOTEL_PARTNER && u.status === 'ACTIVE'));
    setDestinations(adminService.getDestinationsSync().filter(d => d.isActive));

    // Load Contracts
    if (user?.role === UserRole.HOTEL_PARTNER) {
        setContracts(contractService.getContractsBySupplier(user.id));
    } else {
        setContracts(contractService.getAllContracts());
    }
  };

  const handleOpenModal = (contract?: SupplierContract) => {
    if (contract) {
      setEditingContract(contract);
      setFormData(JSON.parse(JSON.stringify(contract)));
    } else {
      setEditingContract(null);
      // Defaults
      setFormData({
        status: 'DRAFT',
        contractType: 'HOTEL',
        pricingModel: 'NET',
        taxInclusive: false,
        validFrom: new Date().toISOString().split('T')[0],
        validTo: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        applicableCities: [],
        blackoutDates: [],
        supplierId: user?.role === UserRole.HOTEL_PARTNER ? user.id : ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.supplierId) return;

    // Find Supplier Name
    const supplier = suppliers.find(s => s.id === formData.supplierId);
    
    // Prepare Data
    const payload: Partial<SupplierContract> = {
        ...formData,
        supplierName: supplier?.name || formData.supplierName || 'Unknown',
        // Reset approval if editing logic
        status: user.role === UserRole.ADMIN ? (formData.status || 'ACTIVE') : 'PENDING_APPROVAL'
    };

    contractService.saveContract(payload, user);
    loadData();
    setIsModalOpen(false);
  };

  const filteredContracts = contracts.filter(c => 
    c.contractCode.toLowerCase().includes(search.toLowerCase()) ||
    c.supplierName.toLowerCase().includes(search.toLowerCase())
  );

  const toggleCity = (cityId: string) => {
      const current = formData.applicableCities || [];
      const updated = current.includes(cityId) 
        ? current.filter(id => id !== cityId) 
        : [...current, cityId];
      setFormData({ ...formData, applicableCities: updated });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contract Management</h1>
          <p className="text-slate-500">Manage commercial agreements, validity, and pricing models.</p>
        </div>
        <button 
            onClick={() => handleOpenModal()} 
            className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 transition"
        >
            <Plus size={18} /> New Contract
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="relative max-w-md">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input 
                  type="text" 
                  placeholder="Search by Contract Code or Supplier..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              />
          </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-xs">
                  <tr>
                      <th className="px-6 py-4 font-semibold">Contract Code</th>
                      <th className="px-6 py-4 font-semibold">Supplier</th>
                      <th className="px-6 py-4 font-semibold">Type</th>
                      <th className="px-6 py-4 font-semibold">Validity</th>
                      <th className="px-6 py-4 font-semibold">Pricing</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                      <th className="px-6 py-4 font-semibold text-right">Action</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                  {filteredContracts.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-mono font-medium text-brand-600">{c.contractCode}</td>
                          <td className="px-6 py-4 font-medium text-slate-900">{c.supplierName}</td>
                          <td className="px-6 py-4 text-xs">{c.contractType}</td>
                          <td className="px-6 py-4 text-slate-600 text-xs">
                              {c.validFrom} <span className="text-slate-400">to</span> {c.validTo}
                          </td>
                          <td className="px-6 py-4 text-xs">
                              <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200">{c.pricingModel}</span>
                          </td>
                          <td className="px-6 py-4">
                              <ContractStatusBadge status={c.status} />
                          </td>
                          <td className="px-6 py-4 text-right">
                              <button onClick={() => handleOpenModal(c)} className="text-slate-400 hover:text-brand-600 transition p-2">
                                  <Edit2 size={16} />
                              </button>
                          </td>
                      </tr>
                  ))}
                  {filteredContracts.length === 0 && (
                      <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-slate-400">No contracts found.</td>
                      </tr>
                  )}
              </tbody>
          </table>
      </div>

      {/* Contract Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-lg font-bold text-slate-900">{editingContract ? 'Edit Contract' : 'New Contract'}</h2>
                      <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                      
                      {/* Basic Info */}
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
                              <select 
                                  required 
                                  value={formData.supplierId} 
                                  onChange={e => setFormData({...formData, supplierId: e.target.value})} 
                                  disabled={user?.role === UserRole.HOTEL_PARTNER} // Supplier cannot change self
                                  className="w-full border p-2 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                              >
                                  <option value="">Select Supplier...</option>
                                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.companyName})</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Service Type</label>
                              <select 
                                  value={formData.contractType} 
                                  onChange={e => setFormData({...formData, contractType: e.target.value as any})}
                                  className="w-full border p-2 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                              >
                                  <option value="HOTEL">Hotel</option>
                                  <option value="TRANSFER">Transfer</option>
                                  <option value="ACTIVITY">Activity</option>
                                  <option value="MULTIPLE">Multiple Services</option>
                              </select>
                          </div>
                      </div>

                      {/* Dates */}
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Valid From</label>
                              <input type="date" required value={formData.validFrom} onChange={e => setFormData({...formData, validFrom: e.target.value})} className="w-full border p-2 rounded-lg text-sm" />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Valid To</label>
                              <input type="date" required value={formData.validTo} onChange={e => setFormData({...formData, validTo: e.target.value})} className="w-full border p-2 rounded-lg text-sm" />
                          </div>
                      </div>

                      {/* Pricing */}
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                          <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Pricing Configuration</h4>
                          <div className="grid grid-cols-2 gap-4 mb-3">
                              <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-1">Pricing Model</label>
                                  <select 
                                      value={formData.pricingModel} 
                                      onChange={e => setFormData({...formData, pricingModel: e.target.value as any})}
                                      className="w-full border p-2 rounded-lg text-sm bg-white"
                                  >
                                      <option value="NET">Net Rate (Non-Commissionable)</option>
                                      <option value="COMMISSION">Commissionable (Rack Rate)</option>
                                      <option value="RATE_CARD">Rate Card / Dynamic</option>
                                  </select>
                              </div>
                              {formData.pricingModel === 'COMMISSION' && (
                                  <div>
                                      <label className="block text-sm font-medium text-slate-700 mb-1">Commission %</label>
                                      <input type="number" min="0" max="100" value={formData.commissionPercentage || ''} onChange={e => setFormData({...formData, commissionPercentage: Number(e.target.value)})} className="w-full border p-2 rounded-lg text-sm" />
                                  </div>
                              )}
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={formData.taxInclusive || false} onChange={e => setFormData({...formData, taxInclusive: e.target.checked})} className="rounded text-brand-600 focus:ring-brand-500" />
                              <span className="text-sm text-slate-700">Rates include Taxes</span>
                          </label>
                      </div>

                      {/* Cities */}
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Applicable Cities</label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50">
                              {destinations.map(d => (
                                  <label key={d.id} className="flex items-center gap-2 text-xs p-1 hover:bg-white rounded cursor-pointer">
                                      <input 
                                          type="checkbox" 
                                          checked={formData.applicableCities?.includes(d.id)} 
                                          onChange={() => toggleCity(d.id)}
                                          className="rounded text-brand-600"
                                      />
                                      {d.city}, {d.country}
                                  </label>
                              ))}
                          </div>
                      </div>

                      {/* Terms */}
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Cancellation Policy</label>
                              <textarea rows={3} className="w-full border p-2 rounded-lg text-sm resize-none" value={formData.cancellationPolicy || ''} onChange={e => setFormData({...formData, cancellationPolicy: e.target.value})} placeholder="e.g. Free cancellation up to 7 days before check-in." />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Terms</label>
                              <textarea rows={3} className="w-full border p-2 rounded-lg text-sm resize-none" value={formData.paymentTerms || ''} onChange={e => setFormData({...formData, paymentTerms: e.target.value})} placeholder="e.g. 100% Pre-payment required." />
                          </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">Cancel</button>
                          <button type="submit" className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-brand-700 flex items-center gap-2">
                              <Save size={16} /> Save Contract
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
