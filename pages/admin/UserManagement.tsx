
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { permissionService, ALL_PERMISSIONS } from '../../services/permissionService';
import { bookingService } from '../../services/bookingService';
import { agentService } from '../../services/agentService';
import { useAuth } from '../../context/AuthContext';
import { User, UserRole, Permission, Destination, Hotel, Transfer } from '../../types';
import { Users, Edit2, Trash2, Plus, X, Shield, Briefcase, User as UserIcon, Lock, Check, Search, MapPin, CreditCard, Building, Store, Hotel as HotelIcon, Car, KeyRound, AlertTriangle, Globe, Activity, CheckCircle, XCircle } from 'lucide-react';

export const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [users, setUsers] = useState<User[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  
  // Inventory for linking
  const [allHotels, setAllHotels] = useState<Hotel[]>([]);
  const [allTransfers, setAllTransfers] = useState<Transfer[]>([]);

  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<UserRole | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  
  // Form State
  const [formData, setFormData] = useState<Partial<User>>({});

  useEffect(() => {
    loadData();
  }, []);

  // Handle URL params for quick actions
  useEffect(() => {
    const createRole = searchParams.get('createRole');
    if (createRole && Object.values(UserRole).includes(createRole as UserRole)) {
        setActiveTab(createRole as UserRole); // Switch tab to the role being created
        handleOpenModal(undefined, createRole as UserRole);
        window.history.replaceState(null, '', window.location.hash.split('?')[0]);
    }
  }, [searchParams]);

  const loadData = () => {
    setUsers(adminService.getUsers());
    setDestinations(adminService.getDestinations());
    setAllHotels(adminService.getHotels());
    setAllTransfers(adminService.getTransfers());
  };

  const handleOpenModal = (user?: User, defaultRole: UserRole = UserRole.AGENT) => {
    if (user) {
      setEditingUser(user);
      setFormData({
          ...user,
          permissions: user.permissions || [],
          assignedDestinations: user.assignedDestinations || [],
          serviceLocations: user.serviceLocations || [],
          linkedInventoryIds: user.linkedInventoryIds || []
      });
    } else {
      setEditingUser(null);
      setFormData({
        role: defaultRole,
        isVerified: true,
        status: 'ACTIVE',
        name: '',
        email: '',
        companyName: '',
        creditLimit: 0,
        permissions: [],
        assignedDestinations: [],
        linkedInventoryIds: [],
        supplierType: 'HOTEL',
        customDomain: '',
        logoUrl: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.name || !formData.role) return;

    const cleanUser: any = {
      id: editingUser?.id || '',
      email: formData.email,
      name: formData.name,
      role: formData.role,
      companyName: formData.companyName || '',
      phone: formData.phone || '',
      isVerified: formData.isVerified !== undefined ? formData.isVerified : true,
      status: formData.status || 'ACTIVE',
      joinedAt: editingUser?.joinedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (formData.role === UserRole.AGENT) {
        cleanUser.creditLimit = Number(formData.creditLimit) || 0;
        cleanUser.customDomain = formData.customDomain;
        cleanUser.logoUrl = formData.logoUrl;
    }

    if (formData.role === UserRole.OPERATOR) {
        cleanUser.assignedDestinations = formData.assignedDestinations || [];
    }

    if (formData.role === UserRole.STAFF) {
        cleanUser.permissions = formData.permissions || [];
    }

    if (formData.role === UserRole.SUPPLIER) {
        cleanUser.supplierType = formData.supplierType || 'HOTEL';
        cleanUser.linkedInventoryIds = formData.linkedInventoryIds || [];
    }

    if (editingUser?.password) {
        cleanUser.password = editingUser.password;
    } else if (!editingUser) {
        cleanUser.password = 'password123'; 
    }

    adminService.saveUser(cleanUser);
    loadData();
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (id === currentUser?.id) {
        alert("You cannot delete your own account.");
        return;
    }
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      adminService.deleteUser(id);
      loadData();
    }
  };

  const handleToggleStatus = (user: User) => {
      if (user.id === currentUser?.id) return;
      const newStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      adminService.saveUser({ ...user, status: newStatus });
      loadData();
  };

  // --- FORM HANDLERS ---
  const togglePermission = (perm: Permission) => {
      const current = formData.permissions || [];
      const updated = current.includes(perm) ? current.filter(p => p !== perm) : [...current, perm];
      setFormData({ ...formData, permissions: updated });
  };

  const toggleDestination = (destId: string) => {
      const current = formData.assignedDestinations || [];
      const updated = current.includes(destId) ? current.filter(d => d !== destId) : [...current, destId];
      setFormData({ ...formData, assignedDestinations: updated });
  };

  const toggleLinkedInventory = (id: string) => {
      const current = formData.linkedInventoryIds || [];
      const updated = current.includes(id) ? current.filter(i => i !== id) : [...current, id];
      setFormData({ ...formData, linkedInventoryIds: updated });
  };

  // --- HELPERS ---
  const getRoleIcon = (role: UserRole) => {
      switch(role) {
          case UserRole.ADMIN: return <Shield size={16} className="text-red-600" />;
          case UserRole.STAFF: return <UserIcon size={16} className="text-blue-600" />;
          case UserRole.OPERATOR: return <Briefcase size={16} className="text-amber-600" />;
          case UserRole.SUPPLIER: return <Store size={16} className="text-purple-600" />;
          default: return <Users size={16} className="text-emerald-600" />;
      }
  };

  const getRoleColor = (role: UserRole) => {
      switch(role) {
          case UserRole.ADMIN: return 'bg-red-50 text-red-700 border-red-100';
          case UserRole.STAFF: return 'bg-blue-50 text-blue-700 border-blue-100';
          case UserRole.OPERATOR: return 'bg-amber-50 text-amber-700 border-amber-100';
          case UserRole.SUPPLIER: return 'bg-purple-50 text-purple-700 border-purple-100';
          default: return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      }
  };

  const getRoleMetrics = (u: User) => {
      if (u.role === UserRole.AGENT) {
          const stats = agentService.getStats(u.id);
          return (
              <div className="flex gap-3 text-xs">
                  <span className="flex items-center gap-1" title="Confirmed Bookings"><CheckCircle size={12} className="text-emerald-500"/> {stats.confirmedQuotes}</span>
                  <span className="flex items-center gap-1" title="Credit Limit"><CreditCard size={12} className="text-slate-400"/> ${u.creditLimit?.toLocaleString()}</span>
              </div>
          );
      }
      if (u.role === UserRole.OPERATOR) {
          const activeJobs = bookingService.getBookingsForOperator(u.id).filter(b => b.status === 'IN_PROGRESS').length;
          return (
              <div className="flex gap-3 text-xs">
                  <span className="flex items-center gap-1" title="Active Jobs"><Activity size={12} className="text-blue-500"/> {activeJobs} Active</span>
                  <span className="flex items-center gap-1" title="Assigned Regions"><MapPin size={12} className="text-slate-400"/> {u.assignedDestinations?.length || 0} Regions</span>
              </div>
          );
      }
      if (u.role === UserRole.SUPPLIER) {
          return (
              <div className="flex gap-3 text-xs">
                  <span className="flex items-center gap-1" title="Linked Inventory"><Briefcase size={12} className="text-purple-500"/> {u.linkedInventoryIds?.length || 0} Items</span>
                  <span className="bg-slate-100 px-1.5 rounded text-[10px] uppercase font-bold text-slate-500">{u.supplierType}</span>
              </div>
          );
      }
      return <span className="text-xs text-slate-400">-</span>;
  };

  const filteredUsers = users.filter(u => {
      const matchesRole = activeTab === 'ALL' || u.role === activeTab;
      const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || 
                            u.email.toLowerCase().includes(search.toLowerCase()) ||
                            u.companyName?.toLowerCase().includes(search.toLowerCase());
      return matchesRole && matchesSearch;
  });

  const TabButton = ({ role, label, icon: Icon }: any) => (
      <button 
        onClick={() => setActiveTab(role)}
        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === role 
            ? 'border-brand-600 text-brand-600 bg-brand-50/50' 
            : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
        }`}
      >
          <Icon size={16} />
          {label}
          <span className="ml-1.5 bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
              {users.filter(u => role === 'ALL' ? true : u.role === role).length}
          </span>
      </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500">Administrate accounts across all 4 tiers of the platform.</p>
        </div>
        <button 
          onClick={() => handleOpenModal(undefined, activeTab === 'ALL' ? UserRole.AGENT : activeTab)}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 transition shadow-sm"
        >
          <Plus size={18} /> Add {activeTab === 'ALL' ? 'User' : activeTab.toLowerCase().charAt(0).toUpperCase() + activeTab.slice(1).toLowerCase()}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-slate-200 overflow-x-auto">
              <TabButton role="ALL" label="All Users" icon={Users} />
              <TabButton role={UserRole.AGENT} label="Agents" icon={Users} />
              <TabButton role={UserRole.OPERATOR} label="Operators" icon={Briefcase} />
              <TabButton role={UserRole.SUPPLIER} label="Suppliers" icon={Store} />
              <TabButton role={UserRole.STAFF} label="Staff" icon={UserIcon} />
              <TabButton role={UserRole.ADMIN} label="Admins" icon={Shield} />
          </div>

          {/* Toolbar */}
          <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative w-full md:w-96">
                  <Search size={18} className="absolute left-3 top-2.5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search by name, email, company..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm bg-white"
                  />
              </div>
              <div className="text-xs text-slate-500 italic">
                  Showing {filteredUsers.length} active accounts
              </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">User Profile</th>
                  <th className="px-6 py-4 font-semibold">Role & Access</th>
                  <th className="px-6 py-4 font-semibold">Performance / Scope</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm ${
                              u.role === UserRole.ADMIN ? 'bg-red-500' : 
                              u.role === UserRole.STAFF ? 'bg-blue-500' :
                              u.role === UserRole.OPERATOR ? 'bg-amber-500' :
                              u.role === UserRole.SUPPLIER ? 'bg-purple-500' : 'bg-emerald-500'
                          }`}>
                              {u.name.charAt(0)}
                          </div>
                          <div>
                              <div className="font-bold text-slate-900">{u.name} {u.id === currentUser?.id && <span className="text-xs font-normal text-slate-400">(You)</span>}</div>
                              <div className="text-slate-500 text-xs">{u.email}</div>
                              {u.companyName && <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><Building size={10}/> {u.companyName}</div>}
                          </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold border ${getRoleColor(u.role)}`}>
                        {getRoleIcon(u.role)}
                        <span className="capitalize">{u.role.toLowerCase()}</span>
                      </div>
                      <div className="mt-1.5 text-xs text-slate-400">
                          ID: <span className="font-mono">{u.uniqueId || u.id.substring(0,8)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                        {getRoleMetrics(u)}
                    </td>
                    <td className="px-6 py-4">
                        <button 
                            onClick={() => handleToggleStatus(u)}
                            disabled={u.id === currentUser?.id}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase border transition ${
                                u.status === 'ACTIVE' 
                                    ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                                    : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {u.status === 'ACTIVE' ? <CheckCircle size={12}/> : <XCircle size={12}/>}
                            {u.status || 'ACTIVE'}
                        </button>
                        {!u.isVerified && <div className="text-[10px] text-amber-600 mt-1 font-bold">Pending Verification</div>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={() => handleOpenModal(u)} 
                            className="p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
                            title="Edit User"
                        >
                          <Edit2 size={16} />
                        </button>
                        {u.id !== currentUser?.id && (
                            <button 
                                onClick={() => handleDelete(u.id)} 
                                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="Delete User"
                            >
                            <Trash2 size={16} />
                            </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                    <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                            No users found for this filter.
                        </td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
      </div>

      {/* CREATE / EDIT MODAL - (Reused logic with enhanced styling) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">{editingUser ? 'Edit User Profile' : 'Create New Account'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                    <input required type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                    <input required type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">System Role</label>
                    <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})} className="w-full border p-2.5 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none font-bold text-slate-800">
                        {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Company / Brand</label>
                    <input type="text" value={formData.companyName || ''} onChange={e => setFormData({...formData, companyName: e.target.value})} className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Company Name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                    <input type="text" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                  </div>
                  <div className="flex items-end pb-2">
                     <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2 rounded-lg border border-slate-200 w-full">
                        <input type="checkbox" checked={formData.isVerified} onChange={e => setFormData({...formData, isVerified: e.target.checked})} className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"/>
                        <span className="text-sm font-bold text-slate-700">Verified Account</span>
                     </label>
                  </div>
              </div>

              {!editingUser && (
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex gap-2 text-xs text-blue-800">
                      <KeyRound size={16} className="shrink-0" />
                      <p>A temporary password (<strong>password123</strong>) will be set. The user can reset it via email link later.</p>
                  </div>
              )}

              <hr className="border-slate-100" />

              {/* DYNAMIC ROLE FIELDS */}
              {formData.role === UserRole.AGENT && (
                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 animate-in fade-in space-y-4">
                      <h3 className="font-bold text-emerald-800 text-sm mb-2 flex items-center gap-2"><CreditCard size={16}/> Agent Configuration</h3>
                      <div>
                        <label className="block text-xs font-bold text-emerald-700 uppercase mb-1">Credit Limit</label>
                        <input type="number" value={formData.creditLimit || 0} onChange={e => setFormData({...formData, creditLimit: Number(e.target.value)})} className="w-full border border-emerald-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-emerald-700 uppercase mb-1">Custom Domain</label>
                              <input type="text" placeholder="trips.agency.com" value={formData.customDomain || ''} onChange={e => setFormData({...formData, customDomain: e.target.value})} className="w-full border border-emerald-200 p-2.5 rounded-lg text-sm" />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-emerald-700 uppercase mb-1">Logo URL</label>
                              <input type="text" placeholder="https://..." value={formData.logoUrl || ''} onChange={e => setFormData({...formData, logoUrl: e.target.value})} className="w-full border border-emerald-200 p-2.5 rounded-lg text-sm" />
                          </div>
                      </div>
                  </div>
              )}

              {formData.role === UserRole.OPERATOR && (
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 animate-in fade-in">
                      <h3 className="font-bold text-amber-800 text-sm mb-3 flex items-center gap-2"><MapPin size={16}/> Assigned Regions</h3>
                      <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                          {destinations.map(d => (
                              <label key={d.id} className="flex items-center gap-2 p-2 bg-white rounded border border-amber-100 cursor-pointer hover:border-amber-300">
                                  <input type="checkbox" checked={formData.assignedDestinations?.includes(d.id)} onChange={() => toggleDestination(d.id)} className="text-amber-600 rounded focus:ring-amber-500"/>
                                  <span className="text-sm text-slate-700">{d.city}, {d.country}</span>
                              </label>
                          ))}
                      </div>
                  </div>
              )}

              {formData.role === UserRole.SUPPLIER && (
                  <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 animate-in fade-in">
                      <h3 className="font-bold text-purple-800 text-sm mb-3 flex items-center gap-2"><Store size={16}/> Supplier Configuration</h3>
                      <div className="mb-4">
                          <label className="block text-xs font-bold text-purple-700 uppercase mb-1">Supply Type</label>
                          <select value={formData.supplierType || 'HOTEL'} onChange={e => setFormData({ ...formData, supplierType: e.target.value as any, linkedInventoryIds: [] })} className="w-full border border-purple-200 p-2.5 rounded-lg text-sm bg-white">
                              <option value="HOTEL">Hotels</option>
                              <option value="TRANSPORT">Transportation</option>
                          </select>
                      </div>
                      <label className="block text-xs font-bold text-purple-700 uppercase mb-1">Link Inventory Items</label>
                      <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto border border-purple-200 bg-white rounded-lg p-2">
                          {formData.supplierType === 'HOTEL' && allHotels.map(h => (
                              <label key={h.id} className="flex items-center gap-2 p-1 hover:bg-purple-50 rounded cursor-pointer">
                                  <input type="checkbox" checked={formData.linkedInventoryIds?.includes(h.id)} onChange={() => toggleLinkedInventory(h.id)} className="text-purple-600 rounded focus:ring-purple-500"/>
                                  <span className="text-sm text-slate-700 flex items-center gap-1"><HotelIcon size={12}/> {h.name}</span>
                              </label>
                          ))}
                          {formData.supplierType === 'TRANSPORT' && allTransfers.map(t => (
                              <label key={t.id} className="flex items-center gap-2 p-1 hover:bg-purple-50 rounded cursor-pointer">
                                  <input type="checkbox" checked={formData.linkedInventoryIds?.includes(t.id)} onChange={() => toggleLinkedInventory(t.id)} className="text-purple-600 rounded focus:ring-purple-500"/>
                                  <span className="text-sm text-slate-700 flex items-center gap-1"><Car size={12}/> {t.transferName}</span>
                              </label>
                          ))}
                      </div>
                  </div>
              )}

              {formData.role === UserRole.STAFF && (
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 animate-in fade-in">
                      <h3 className="font-bold text-blue-800 text-sm mb-3 flex items-center gap-2"><Lock size={16}/> Access Permissions</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                          {ALL_PERMISSIONS.map(perm => (
                              <label key={perm.key} className="flex items-start gap-2 p-2 bg-white rounded border border-blue-100 cursor-pointer hover:border-blue-300">
                                  <input type="checkbox" checked={formData.permissions?.includes(perm.key)} onChange={() => togglePermission(perm.key)} className="mt-1 text-blue-600 rounded focus:ring-blue-500"/>
                                  <div>
                                      <span className="block text-sm font-medium text-slate-800">{perm.label}</span>
                                      <span className="block text-[10px] text-slate-500 leading-tight">{perm.description}</span>
                                  </div>
                              </label>
                          ))}
                      </div>
                  </div>
              )}

              <div className="pt-4 flex justify-end gap-3">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
                 <button type="submit" className="px-6 py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-bold shadow-sm transition">
                    {editingUser ? 'Update User' : 'Create Account'}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
