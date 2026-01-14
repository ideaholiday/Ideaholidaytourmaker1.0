import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService'; 
import { User, UserRole } from '../../types'; 
import { useAuth } from '../../context/AuthContext';
import { Edit2, Trash2, Plus, X, Search } from 'lucide-react';

export const Suppliers: React.FC = () => {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<User[]>([]); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<User | null>(null);
  const [search, setSearch] = useState('');
  
  // Form State
  const [formData, setFormData] = useState<Partial<User>>({});

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = () => {
    // Fetch users and filter by role SUPPLIER
    const allUsers = adminService.getUsers();
    setSuppliers(allUsers.filter(u => u.role === UserRole.SUPPLIER));
  };

  const handleOpenModal = (supplier?: User) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({ ...supplier });
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
      // Ensure role is fixed
      role: UserRole.SUPPLIER
    };

    if (!editingSupplier) {
        cleanUser.joinedAt = new Date().toISOString();
        cleanUser.password = 'password123'; // Default for new
    }

    adminService.saveUser(cleanUser);
    loadSuppliers();
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this supplier?')) {
      adminService.deleteUser(id);
      loadSuppliers();
    }
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
          <p className="text-slate-500">Manage vendor accounts (Hotels, Transporters).</p>
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
            placeholder="Search suppliers..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none w-full md:w-64"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-xs tracking-wider">
            <tr>
              <th className="px-6 py-4 font-semibold">Name / Contact</th>
              <th className="px-6 py-4 font-semibold">Company</th>
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
                  <div className="text-xs text-slate-500">{s.email}</div>
                  <div className="text-xs text-slate-500">{s.phone}</div>
                </td>
                <td className="px-6 py-4 text-slate-600">{s.companyName || '-'}</td>
                <td className="px-6 py-4">
                    <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs font-bold border border-purple-100">
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
                        className="p-2 text-slate-500 hover:text-brand-600 rounded transition"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button 
                        onClick={() => handleDelete(s.id)}
                        className="p-2 text-slate-500 hover:text-red-600 rounded transition"
                    >
                        <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredSuppliers.length === 0 && (
                <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                        No suppliers found.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                    <input 
                        required 
                        type="text" 
                        value={formData.name || ''} 
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input 
                        required 
                        type="email" 
                        value={formData.email || ''} 
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                    <input 
                        type="text" 
                        value={formData.companyName || ''} 
                        onChange={e => setFormData({...formData, companyName: e.target.value})}
                        className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                    <input 
                        type="text" 
                        value={formData.phone || ''} 
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Service Type</label>
                    <select 
                        value={formData.supplierType || 'HOTEL'} 
                        onChange={e => setFormData({...formData, supplierType: e.target.value as any})}
                        className="w-full border p-2 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                    >
                        <option value="HOTEL">Hotel Provider</option>
                        <option value="TRANSPORT">Transport Provider</option>
                    </select>
                </div>
                <div className="flex items-center gap-2 pt-2">
                    <input 
                        type="checkbox" 
                        checked={formData.status === 'ACTIVE'}
                        onChange={e => setFormData({...formData, status: e.target.checked ? 'ACTIVE' : 'SUSPENDED'})}
                        id="statusCheck"
                        className="rounded text-brand-600 focus:ring-brand-500"
                    />
                    <label htmlFor="statusCheck" className="text-sm text-slate-700">Account Active</label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">Cancel</button>
                    <button type="submit" className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-bold shadow-sm">Save</button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};