
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { profileService } from '../../services/profileService';
import { inventoryService } from '../../services/inventoryService';
import { adminService } from '../../services/adminService';
import { User } from '../../types';
import { Save, User as UserIcon, MapPin, Box, Building, Phone, Mail, Globe, Loader2 } from 'lucide-react';

export const OperatorProfilePage: React.FC = () => {
  const { user, reloadUser } = useAuth();
  const [formData, setFormData] = useState<Partial<User>>({});
  const [inventoryStats, setInventoryStats] = useState({ total: 0, approved: 0, pending: 0 });
  const [assignedCityNames, setAssignedCityNames] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        companyName: user.companyName,
        phone: user.phone,
        email: user.email
      });

      // Load Inventory Stats
      const items = inventoryService.getItemsByOperator(user.id);
      setInventoryStats({
        total: items.length,
        approved: items.filter(i => i.status === 'APPROVED').length,
        pending: items.filter(i => i.status === 'PENDING_APPROVAL').length
      });

      // Resolve City Names
      const allDestinations = adminService.getDestinations();
      const names = (user.assignedDestinations || []).map(id => {
        const dest = allDestinations.find(d => d.id === id);
        return dest ? `${dest.city}, ${dest.country}` : id;
      });
      setAssignedCityNames(names);
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    
    try {
      await profileService.updateProfileDetails(user.id, {
        name: formData.name,
        companyName: formData.companyName,
        phone: formData.phone
      });
      await reloadUser();
      alert("Profile updated successfully!");
    } catch (error) {
      console.error(error);
      alert("Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Operator Profile</h1>
      <p className="text-slate-500 mb-8">Manage your company details and view operational scope.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Edit Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <UserIcon size={20} className="text-brand-600" /> Company & Contact
            </h3>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contact Name</label>
                  <input 
                    type="text" 
                    value={formData.name || ''} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Company Name</label>
                  <div className="relative">
                    <Building size={16} className="absolute left-3 top-3 text-slate-400" />
                    <input 
                      type="text" 
                      value={formData.companyName || ''} 
                      onChange={e => setFormData({...formData, companyName: e.target.value})}
                      className="w-full pl-9 border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input 
                    type="email" 
                    value={formData.email || ''} 
                    disabled
                    className="w-full pl-9 border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-sm text-slate-500 cursor-not-allowed"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Contact admin to change registered email.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input 
                    type="text" 
                    value={formData.phone || ''} 
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full pl-9 border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="bg-brand-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-brand-700 transition shadow-lg shadow-brand-200 flex items-center gap-2 disabled:opacity-70"
                >
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Read-only Stats */}
        <div className="space-y-6">
          {/* Operational Scope */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <MapPin size={20} className="text-purple-600" /> Assigned Regions
            </h3>
            
            {assignedCityNames.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {assignedCityNames.map((city, idx) => (
                  <span key={idx} className="bg-purple-50 text-purple-700 border border-purple-100 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">
                    <Globe size={12} /> {city}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">No specific regions assigned. Contact Admin.</p>
            )}
          </div>

          {/* Inventory Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Box size={20} className="text-amber-600" /> Inventory Status
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-600">Total Items</span>
                <span className="font-bold text-slate-900">{inventoryStats.total}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-100">
                <span className="text-sm text-green-700">Approved</span>
                <span className="font-bold text-green-800">{inventoryStats.approved}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg border border-amber-100">
                <span className="text-sm text-amber-700">Pending Review</span>
                <span className="font-bold text-amber-800">{inventoryStats.pending}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
