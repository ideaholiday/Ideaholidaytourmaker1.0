
import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService'; 
import { User, UserRole, BankDetails, Hotel, Transfer } from '../../types'; 
import { useAuth } from '../../context/AuthContext';
import { Edit2, Trash2, Plus, X, Search, Building, CreditCard, Link as LinkIcon, CheckSquare, Square } from 'lucide-react';

export const Suppliers: React.FC = () => {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<User[]>([]); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<User | null>(null);
  const [search, setSearch] = useState('');
  
  // Inventory Data for Linking
  const [allHotels, setAllHotels] = useState<Hotel[]>([]);
  const [allTransfers, setAllTransfers] = useState<Transfer[]>([]);

  // Form State
  const [formData, setFormData] = useState<Partial<User>>({});
  const [bankData, setBankData] = useState<Partial<BankDetails>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const allUsers = adminService.getUsers();
    setSuppliers(allUsers.filter(u => u.role === UserRole.SUPPLIER));
    setAllHotels(adminService.getHotels());
    setAllTransfers(adminService.getTransfers());
  };

  const handleOpenModal = (supplier?: User) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({ ...supplier });
      setBankData(supplier.bankDetails || { currency: 'USD' });
    } else {
      setEditingSupplier(null);
      setFormData({
        role: UserRole.SUPPLIER,
        isVerified: true,
        status: 'ACTIVE',
        supplierType: 'HOTEL', // Default
        name: '',
        email: '',
        companyName: '',
        phone: '',
        linkedInventoryIds: []
      });
      setBankData({ currency: 'USD', accountName: '', accountNumber: '', bankName: '', branchName: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.name) return;

    const cleanUser: any = {
      ...formData,
      id: editingSupplier?.id || '',
      updatedAt: new Date().toISOString(),
      role: UserRole.SUPPLIER,
      bankDetails: bankData as BankDetails
    };

    if (!editingSupplier) {
        cleanUser.joinedAt = new Date().toISOString();
        cleanUser.password = 'password123'; // Default for new users
    }

    adminService.saveUser(cleanUser);
    loadData();
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this supplier? This action cannot be undone.')) {
      adminService.deleteUser(id);
      loadData();
    }
  };

  const toggleInventoryLink = (id: string) => {
      const current = formData.linkedInventoryIds || [];
      const updated = current.includes(id) 
        ? current.filter(i => i !== id) 
        : [...current, id];
      setFormData({ ...formData, linkedInventoryIds: updated });
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.companyName?.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Supplier Management</h1>
          <p className="text-slate-500">Manage vendor accounts, bank details, and inventory assignments.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 transition shadow-sm"
        >
          <Plus size={18} /> Add Supplier
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search suppliers by name, company, or email..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none w-full md:w-96"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-xs tracking-wider">
            <tr>
              <th className="px-6 py-4 font-semibold">Contact Person</th>
              <th className="px-6 py-4 font-semibold">Company / Brand</th>
              <th className="px-6 py-4 font-semibold">Contact Info</th>
              <th className="px-6 py-4 font-semibold">Type</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSuppliers.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50 transition">
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-900">{s.name}</div>
                  {s.uniqueId && <div className="text-[10px] text-slate-400 font-mono">{s.uniqueId}</div>}
                </td>
                <td className="px-6 py-4 text-slate-600">
                    <div className="flex items-center gap-2">
                        <Building size={14} className="text-slate-400"/>
                        {s.companyName || '-'}
                    </div>
                </td>
                <td className="px-6 py-4">
                    <div className="text-slate-600">{s.email}</div>
                    <div className="text-xs text-slate-400">{s.phone}</div>
                </td>
                <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${
                        s.supplierType === 'HOTEL' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                    }`}>
                        {s.supplierType || 'HOTEL'}
                    </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    s.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {s.status || 'ACTIVE'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                        onClick={() => handleOpenModal(s)}
                        className="p-2 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded transition"
                        title="Edit Details"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button 
                        onClick={() => handleDelete(s.id)}
                        className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                        title="Delete Supplier"
                    >
                        <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredSuppliers.length === 0 && (
                <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        No suppliers found matching criteria.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-4xl w-full p-0 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                <h2 className="text-xl font-bold text-slate-900">{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full transition"><X size={20}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
                <form id="supplierForm" onSubmit={handleSave} className="space-y-8">
                    
                    {/* 1. Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                                <Building size={16} className="text-brand-500"/> Company Information
                            </h3>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person *</label>
                            <input 
                                required 
                                type="text" 
                                value={formData.name || ''} 
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                placeholder="Full Name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Company / Brand Name</label>
                            <input 
                                type="text" 
                                value={formData.companyName || ''} 
                                onChange={e => setFormData({...formData, companyName: e.target.value})}
                                className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                placeholder="Registered Business Name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address *</label>
                            <input 
                                required 
                                type="email" 
                                value={formData.email || ''} 
                                onChange={e => setFormData({...formData, email: e.target.value})}
                                className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                placeholder="vendor@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                            <input 
                                type="text" 
                                value={formData.phone || ''} 
                                onChange={e => setFormData({...formData, phone: e.target.value})}
                                className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                placeholder="+91 98765 43210"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Supplier Type</label>
                            <select 
                                value={formData.supplierType || 'HOTEL'} 
                                onChange={e => setFormData({...formData, supplierType: e.target.value as any})}
                                className="w-full border p-2.5 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                            >
                                <option value="HOTEL">Hotel Provider</option>
                                <option value="TRANSPORT">Transport Provider</option>
                            </select>
                        </div>
                        <div className="flex items-end pb-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={formData.status === 'ACTIVE'}
                                    onChange={e => setFormData({...formData, status: e.target.checked ? 'ACTIVE' : 'SUSPENDED'})}
                                    className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                                />
                                <span className="text-sm font-medium text-slate-700">Account Active</span>
                            </label>
                        </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* 2. Bank Details */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                            <CreditCard size={16} className="text-brand-500"/> Bank Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Account Name</label>
                                <input 
                                    type="text" 
                                    value={bankData.accountName || ''} 
                                    onChange={e => setBankData({...bankData, accountName: e.target.value})}
                                    className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Account Number</label>
                                <input 
                                    type="text" 
                                    value={bankData.accountNumber || ''} 
                                    onChange={e => setBankData({...bankData, accountNumber: e.target.value})}
                                    className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bank Name</label>
                                <input 
                                    type="text" 
                                    value={bankData.bankName || ''} 
                                    onChange={e => setBankData({...bankData, bankName: e.target.value})}
                                    className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Branch Name</label>
                                <input 
                                    type="text" 
                                    value={bankData.branchName || ''} 
                                    onChange={e => setBankData({...bankData, branchName: e.target.value})}
                                    className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">IFSC / Swift Code</label>
                                <input 
                                    type="text" 
                                    value={bankData.ifscCode || bankData.swiftCode || ''} 
                                    onChange={e => setBankData({...bankData, ifscCode: e.target.value, swiftCode: e.target.value})}
                                    className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none uppercase font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Currency</label>
                                <select 
                                    value={bankData.currency || 'USD'} 
                                    onChange={e => setBankData({...bankData, currency: e.target.value})}
                                    className="w-full border p-2 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                                >
                                    <option value="USD">USD ($)</option>
                                    <option value="INR">INR (₹)</option>
                                    <option value="AED">AED</option>
                                    <option value="THB">THB</option>
                                    <option value="EUR">EUR (€)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* 3. Inventory Linking */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                            <LinkIcon size={16} className="text-brand-500"/> Inventory Mapping
                        </h3>
                        <p className="text-xs text-slate-500 mb-2">Select the {formData.supplierType === 'HOTEL' ? 'Hotels' : 'Transfers'} this supplier manages.</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-3 bg-slate-50 border border-slate-200 rounded-xl">
                            {formData.supplierType === 'HOTEL' ? (
                                allHotels.map(h => (
                                    <label key={h.id} className={`flex items-center gap-2 p-2 rounded cursor-pointer transition ${formData.linkedInventoryIds?.includes(h.id) ? 'bg-white border border-brand-200 shadow-sm' : 'hover:bg-white border border-transparent'}`}>
                                        <div className={`text-brand-600 ${formData.linkedInventoryIds?.includes(h.id) ? 'opacity-100' : 'opacity-40'}`}>
                                            {formData.linkedInventoryIds?.includes(h.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            className="hidden"
                                            checked={formData.linkedInventoryIds?.includes(h.id)}
                                            onChange={() => toggleInventoryLink(h.id)}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-700 truncate">{h.name}</p>
                                            <p className="text-[10px] text-slate-400">{h.category}</p>
                                        </div>
                                    </label>
                                ))
                            ) : (
                                allTransfers.map(t => (
                                    <label key={t.id} className={`flex items-center gap-2 p-2 rounded cursor-pointer transition ${formData.linkedInventoryIds?.includes(t.id) ? 'bg-white border border-brand-200 shadow-sm' : 'hover:bg-white border border-transparent'}`}>
                                        <div className={`text-brand-600 ${formData.linkedInventoryIds?.includes(t.id) ? 'opacity-100' : 'opacity-40'}`}>
                                            {formData.linkedInventoryIds?.includes(t.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            className="hidden"
                                            checked={formData.linkedInventoryIds?.includes(t.id)}
                                            onChange={() => toggleInventoryLink(t.id)}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-700 truncate">{t.transferName}</p>
                                            <p className="text-[10px] text-slate-400">{t.vehicleType} | {t.transferType}</p>
                                        </div>
                                    </label>
                                ))
                            )}
                            {(formData.supplierType === 'HOTEL' ? allHotels.length : allTransfers.length) === 0 && (
                                <div className="col-span-3 text-center text-xs text-slate-400 py-4">No inventory items available to link. Add them in Inventory sections first.</div>
                            )}
                        </div>
                    </div>

                </form>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition">
                    Cancel
                </button>
                <button type="submit" form="supplierForm" className="px-6 py-2.5 bg-brand-600 text-white hover:bg-brand-700 rounded-lg font-bold shadow-lg transition">
                    {editingSupplier ? 'Update Supplier' : 'Create Account'}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
