
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { permissionService, ALL_PERMISSIONS } from '../../services/permissionService';
import { useAuth } from '../../context/AuthContext';
import { User, UserRole, Permission, Destination, Hotel, Transfer } from '../../types';
import { Users, Edit2, Trash2, Plus, X, Shield, Briefcase, User as UserIcon, Lock, Search, MapPin, CreditCard, Building, Store, Hotel as HotelIcon, Car, KeyRound, Globe, ShieldAlert, Eye } from 'lucide-react';

export const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [users, setUsers] = useState<User[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  
  // Inventory for linking
  const [allHotels, setAllHotels] = useState<Hotel[]>([]);
  const [allTransfers, setAllTransfers] = useState<Transfer[]>([]);

  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  
  // Form State
  const [formData, setFormData] = useState<Partial<User>>({});

  useEffect(() => {
    loadData();
  }, []);

  // Handle URL params for quick actions (e.g. from Dashboard)
  useEffect(() => {
    const createRole = searchParams.get('createRole');
    if (createRole && Object.values(UserRole).includes(createRole as UserRole)) {
        handleOpenModal(undefined, createRole as UserRole);
        // Clean URL without refresh
        window.history.replaceState(null, '', window.location.hash.split('?')[0]);
    }
  }, [searchParams]);

  const loadData = async () => {
    setUsers(await adminService.getUsers());
    setDestinations(adminService.getDestinationsSync());
    setAllHotels(adminService.getHotelsSync());
    setAllTransfers(adminService.getTransfersSync());
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
        isVerified: true, // Auto-verify manually created users
        status: 'ACTIVE',
        name: '',
        email: '',
        companyName: '',
        creditLimit: 0,
        permissions: [],
        assignedDestinations: [],
        linkedInventoryIds: [],
        partnerType: 'HOTEL',
        customDomain: '',
        logoUrl: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.name || !formData.role) return;

    // STRICT DATA SANITIZATION: Only save fields relevant to the selected role
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

    if (formData.role === UserRole.HOTEL_PARTNER) {
        cleanUser.partnerType = formData.partnerType || 'HOTEL';
        cleanUser.linkedInventoryIds = formData.linkedInventoryIds || [];
    }

    // Preserve mock password if editing, or set default for new
    if (editingUser?.password) {
        cleanUser.password = editingUser.password;
    } else if (!editingUser) {
        cleanUser.password = 'password123'; // Default mock password
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

  const handleViewProfile = (user: User) => {
      if (user.role === UserRole.AGENT) {
          navigate(`/admin/agents/${user.id}`);
      } else if (user.role === UserRole.OPERATOR) {
          navigate(`/admin/operators/${user.id}`);
      }
  };

  // --- FORM HANDLERS ---

  const togglePermission = (perm: Permission) => {
      const current = formData.permissions || [];
      const updated = current.includes(perm) 
        ? current.filter(p => p !== perm) 
        : [...current, perm];
      setFormData({ ...formData, permissions: updated });
  };

  const toggleDestination = (destId: string) => {
      const current = formData.assignedDestinations || [];
      const updated = current.includes(destId)
        ? current.filter(d => d !== destId)
        : [...current, destId];
      setFormData({ ...formData, assignedDestinations: updated });
  };

  const toggleLinkedInventory = (id: string) => {
      const current = formData.linkedInventoryIds || [];
      const updated = current.includes(id)
        ? current.filter(i => i !== id)
        : [...current, id];
      setFormData({ ...formData, linkedInventoryIds: updated });
  };

  // --- RENDER HELPERS ---

  const filteredUsers = users.filter(u => {
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || 
                            u.email.toLowerCase().includes(search.toLowerCase()) ||
                            u.companyName?.toLowerCase().includes(search.toLowerCase());
      return matchesRole && matchesSearch;
  });

  const getRoleIcon = (role: UserRole) => {
      switch(role) {
          case UserRole.ADMIN: return <Shield size={16} className="text-red-600" />;
          case UserRole.STAFF: return <UserIcon size={16} className="text-blue-600" />;
          case UserRole.OPERATOR: return <Briefcase size={16} className="text-amber-600" />;
          case UserRole.HOTEL_PARTNER: return <Store size={16} className="text-purple-600" />;
          default: return <Users size={16} className="text-emerald-600" />;
      }
  };

  const getInventoryNames = (ids: string[], type: 'HOTEL' | 'TRANSPORT' | undefined) => {
      if (!ids || ids.length === 0) return 'None';
      if (type === 'HOTEL') {
          return allHotels.filter(h => ids.includes(h.id)).map(h => h.name).join(', ');
      }
      return allTransfers.filter(t => ids.includes(t.id)).map(t => t.transferName).join(', ');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500">Create and manage accounts, roles, and access permissions.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 transition shadow-sm"
        >
          <Plus size={18} /> Add User
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex gap-2 overflow-x-auto w-full md:w-auto">
              {['ALL', UserRole.AGENT, UserRole.OPERATOR, UserRole.HOTEL_PARTNER, UserRole.STAFF, UserRole.ADMIN].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRoleFilter(r as any)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${roleFilter === r ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                      {r === 'ALL' ? 'All Users' : r.replace('_', ' ')}
                  </button>
              ))}
          </div>
          
          <div className="relative w-full md:w-64">
              <Search size={18} className="absolute left-3 top-2.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search name, email..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm"
              />
          </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-xs tracking-wider">
            <tr>
              <th className="px-6 py-4 font-semibold">User Details</th>
              <th className="px-6 py-4 font-semibold">Role</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold">Specifics</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50 transition group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                          u.role === UserRole.ADMIN ? 'bg-red-500' : 
                          u.role === UserRole.STAFF ? 'bg-blue-500' :
                          u.role === UserRole.OPERATOR ? 'bg-amber-500' :
                          u.role === UserRole.HOTEL_PARTNER ? 'bg-purple-500' : 'bg-emerald-500'
                      }`}>
                          {u.name.charAt(0)}
                      </div>
                      <div>
                          <div className="font-medium text-slate-900">{u.name} {u.id === currentUser?.id && '(You)'}</div>
                          <div className="text-slate-500 text-xs">{u.email}</div>
                          {u.companyName && <div className="text-xs text-slate-400 flex items-center gap-1"><Building size={10}/> {u.companyName}</div>}
                      </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-slate-700">
                    {getRoleIcon(u.role)}
                    <span className="capitalize text-xs font-medium">{u.role.toLowerCase().replace('_', ' ')}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                    <button 
                        onClick={() => handleToggleStatus(u)}
                        disabled={u.id === currentUser?.id}
                        className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${
                            u.status === 'ACTIVE' 
                                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                                : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {u.status || 'ACTIVE'}
                    </button>
                </td>
                <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate">
                    {u.role === UserRole.AGENT && (
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1" title="Credit Limit">
                                <CreditCard size={12} className="text-slate-400" />
                                ${u.creditLimit?.toLocaleString() || 0}
                            </div>
                            {u.customDomain && (
                                <div className="flex items-center gap-1" title="White Label Domain">
                                    <Globe size={12} className="text-purple-400" />
                                    {u.customDomain}
                                </div>
                            )}
                        </div>
                    )}
                    {u.role === UserRole.OPERATOR && (
                        <div className="flex items-center gap-1" title="Assigned Regions">
                            <MapPin size={12} className="text-slate-400" />
                            {u.assignedDestinations?.join(', ') || 'None'}
                        </div>
                    )}
                    {u.role === UserRole.STAFF && (
                        <div className="flex items-center gap-1" title="Permissions Count">
                            <Lock size={12} className="text-slate-400" />
                            {u.permissions?.length || 0} Perms
                        </div>
                    )}
                    {u.role === UserRole.HOTEL_PARTNER && (
                        <div className="flex items-center gap-1" title={getInventoryNames(u.linkedInventoryIds || [], u.partnerType)}>
                            <Store size={12} className="text-slate-400" />
                            <span className="truncate">{getInventoryNames(u.linkedInventoryIds || [], u.partnerType)}</span>
                        </div>
                    )}
                    {u.role === UserRole.ADMIN && (
                        <span className="text-red-500 font-bold flex items-center gap-1"><Shield size={10} /> Full System Access</span>
                    )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {(u.role === UserRole.AGENT || u.role === UserRole.OPERATOR) && (
                        <button 
                            onClick={() => handleViewProfile(u)}
                            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="View Full Profile"
                        >
                            <Eye size={16} />
                        </button>
                    )}
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
                            title="Delete Permanently"
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
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500 italic">
                        No users found matching criteria.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
      {/* ... MODAL CODE REMAINS SAME ... */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">{editingUser ? 'Edit User' : 'Create New User'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                    <input 
                      required
                      type="text" 
                      value={formData.name || ''} 
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                    <input 
                      required
                      type="email" 
                      value={formData.email || ''} 
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                    <select 
                      value={formData.role} 
                      onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                      className="w-full border p-2.5 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none font-medium"
                    >
                        <option value={UserRole.AGENT}>Travel Agent</option>
                        <option value={UserRole.OPERATOR}>Ground Operator (DMC)</option>
                        <option value={UserRole.HOTEL_PARTNER}>Hotel Partner</option>
                        <option value={UserRole.STAFF}>Internal Staff</option>
                        <option value={UserRole.ADMIN}>Administrator</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Company / Brand</label>
                    <input 
                      type="text" 
                      value={formData.companyName || ''} 
                      onChange={e => setFormData({...formData, companyName: e.target.value})}
                      className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" 
                      placeholder={formData.role === UserRole.STAFF ? 'Department' : 'Company Name'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone (Optional)</label>
                    <input 
                      type="text" 
                      value={formData.phone || ''} 
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" 
                    />
                  </div>
                  <div className="flex items-end pb-2">
                     <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={formData.isVerified}
                            onChange={e => setFormData({...formData, isVerified: e.target.checked})}
                            className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                        />
                        <span className="text-sm font-medium text-slate-700">Account Verified</span>
                     </label>
                  </div>
              </div>

              {!editingUser && (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex gap-2 text-xs text-slate-600">
                      <KeyRound size={16} />
                      <p>A temporary password (<strong>password123</strong>) will be assigned. User can reset it via email.</p>
                  </div>
              )}

              <hr className="border-slate-100" />

              {/* DYNAMIC ROLE FIELDS */}
              {formData.role === UserRole.AGENT && (
                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 animate-in fade-in space-y-4">
                      <div>
                        <h3 className="font-bold text-emerald-800 text-sm mb-3 flex items-center gap-2"><CreditCard size={16}/> Financials</h3>
                        <label className="block text-xs font-bold text-emerald-700 uppercase mb-1">Credit Limit</label>
                        <input 
                            type="number" 
                            value={formData.creditLimit || 0}
                            onChange={e => setFormData({...formData, creditLimit: Number(e.target.value)})}
                            className="w-full border border-emerald-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                        <p className="text-xs text-emerald-600 mt-1">Maximum booking value allowed on credit.</p>
                      </div>
                      <div className="border-t border-emerald-100 pt-4">
                        <h3 className="font-bold text-emerald-800 text-sm mb-3 flex items-center gap-2"><Globe size={16}/> White Label Configuration</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-emerald-700 uppercase mb-1">Custom Domain (CNAME)</label>
                                <input 
                                    type="text" 
                                    placeholder="trips.besttravels.com"
                                    value={formData.customDomain || ''}
                                    onChange={e => setFormData({...formData, customDomain: e.target.value})}
                                    className="w-full border border-emerald-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-emerald-700 uppercase mb-1">Logo URL</label>
                                <input 
                                    type="text" 
                                    placeholder="https://example.com/logo.png"
                                    value={formData.logoUrl || ''}
                                    onChange={e => setFormData({...formData, logoUrl: e.target.value})}
                                    className="w-full border border-emerald-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-emerald-600 mt-2">
                            Use these settings to hide Idea Holiday branding on client links.
                        </p>
                      </div>
                  </div>
              )}

              {formData.role === UserRole.OPERATOR && (
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 animate-in fade-in">
                      <h3 className="font-bold text-amber-800 text-sm mb-3 flex items-center gap-2"><MapPin size={16}/> Assigned Regions</h3>
                      <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                          {destinations.map(d => (
                              <label key={d.id} className="flex items-center gap-2 p-2 bg-white rounded border border-amber-100 cursor-pointer hover:border-amber-300">
                                  <input 
                                    type="checkbox" 
                                    checked={formData.assignedDestinations?.includes(d.id)}
                                    onChange={() => toggleDestination(d.id)}
                                    className="text-amber-600 rounded focus:ring-amber-500"
                                  />
                                  <span className="text-sm text-slate-700">{d.city}, {d.country}</span>
                              </label>
                          ))}
                      </div>
                      <p className="text-xs text-amber-700 mt-2">Operator can only view and manage bookings for selected regions.</p>
                  </div>
              )}

              {formData.role === UserRole.HOTEL_PARTNER && (
                  <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 animate-in fade-in">
                      <h3 className="font-bold text-purple-800 text-sm mb-3 flex items-center gap-2"><Store size={16}/> Inventory Linking</h3>
                      
                      <div className="mb-4">
                          <label className="block text-xs font-bold text-purple-700 uppercase mb-1">Partner Type</label>
                          <select 
                              value={formData.partnerType || 'HOTEL'} 
                              onChange={e => setFormData({ ...formData, partnerType: e.target.value as any, linkedInventoryIds: [] })}
                              className="w-full border border-purple-200 p-2.5 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                          >
                              <option value="HOTEL">Hotels</option>
                              <option value="TRANSPORT">Transportation</option>
                          </select>
                      </div>

                      <label className="block text-xs font-bold text-purple-700 uppercase mb-1">Select Inventory Items to Link</label>
                      <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto border border-purple-200 bg-white rounded-lg p-2">
                          {formData.partnerType === 'HOTEL' && allHotels.map(h => (
                              <label key={h.id} className="flex items-center gap-2 p-1 hover:bg-purple-50 rounded cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={formData.linkedInventoryIds?.includes(h.id)}
                                    onChange={() => toggleLinkedInventory(h.id)}
                                    className="text-purple-600 rounded focus:ring-purple-500"
                                  />
                                  <span className="text-sm text-slate-700 flex items-center gap-1"><HotelIcon size={12}/> {h.name} <span className="text-xs text-slate-400">({h.category})</span></span>
                              </label>
                          ))}
                          {formData.partnerType === 'TRANSPORT' && allTransfers.map(t => (
                              <label key={t.id} className="flex items-center gap-2 p-1 hover:bg-purple-50 rounded cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={formData.linkedInventoryIds?.includes(t.id)}
                                    onChange={() => toggleLinkedInventory(t.id)}
                                    className="text-purple-600 rounded focus:ring-purple-500"
                                  />
                                  <span className="text-sm text-slate-700 flex items-center gap-1"><Car size={12}/> {t.transferName} <span className="text-xs text-slate-400">({t.vehicleType})</span></span>
                              </label>
                          ))}
                          {(formData.partnerType === 'HOTEL' ? allHotels.length : allTransfers.length) === 0 && (
                              <p className="text-xs text-slate-400 italic p-2">No inventory available to link.</p>
                          )}
                      </div>
                      <p className="text-xs text-purple-700 mt-2">Selected items will be editable by this user in the Extranet.</p>
                  </div>
              )}

              {formData.role === UserRole.STAFF && (
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 animate-in fade-in">
                      <h3 className="font-bold text-blue-800 text-sm mb-3 flex items-center gap-2"><Lock size={16}/> Access Permissions</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                          {ALL_PERMISSIONS.map(perm => (
                              <label key={perm.key} className="flex items-start gap-2 p-2 bg-white rounded border border-blue-100 cursor-pointer hover:border-blue-300">
                                  <input 
                                    type="checkbox" 
                                    checked={formData.permissions?.includes(perm.key)}
                                    onChange={() => togglePermission(perm.key)}
                                    className="mt-1 text-blue-600 rounded focus:ring-blue-500"
                                  />
                                  <div>
                                      <span className="block text-sm font-medium text-slate-800">{perm.label}</span>
                                      <span className="block text-[10px] text-slate-500 leading-tight">{perm.description}</span>
                                  </div>
                              </label>
                          ))}
                      </div>
                  </div>
              )}

              {formData.role === UserRole.ADMIN && (
                  <div className="bg-red-50 p-4 rounded-xl border border-red-100 animate-in fade-in flex items-start gap-3">
                      <ShieldAlert size={20} className="text-red-600 mt-1" />
                      <div>
                          <h3 className="font-bold text-red-900 text-sm mb-1">Full System Access</h3>
                          <p className="text-xs text-red-800 leading-relaxed">
                              Administrators have unrestricted access to all modules, settings, and financial data. 
                              They bypass all permission checks. <strong>Use with caution.</strong>
                          </p>
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
