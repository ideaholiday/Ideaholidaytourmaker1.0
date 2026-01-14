
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileService } from '../../services/profileService';
import { permissionService, ALL_PERMISSIONS } from '../../services/permissionService';
import { User, Permission } from '../../types';
import { Plus, Check, UserCog } from 'lucide-react';

export const StaffManagement: React.FC = () => {
  const navigate = useNavigate();
  const [staff, setStaff] = useState<User[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  useEffect(() => {
    setStaff(profileService.getAllStaff());
  }, []);

  const handleTogglePermission = (userId: string, perm: Permission) => {
    const user = staff.find(u => u.id === userId);
    if (!user) return;

    const currentPerms = user.permissions || [];
    let newPerms: Permission[];

    if (currentPerms.includes(perm)) {
      newPerms = currentPerms.filter(p => p !== perm);
    } else {
      newPerms = [...currentPerms, perm];
    }

    permissionService.updatePermissions(userId, newPerms);
    
    // Refresh local state
    setStaff(prev => prev.map(u => u.id === userId ? { ...u, permissions: newPerms } : u));
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Staff & Permissions</h1>
          <p className="text-slate-500">Manage internal team access levels.</p>
        </div>
        <button 
          onClick={() => navigate('/admin/users')}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 transition"
        >
          <Plus size={18} /> Add Staff
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Staff List */}
        <div className="space-y-4">
          {staff.map(u => (
            <div 
              key={u.id} 
              onClick={() => setSelectedStaffId(u.id)}
              className={`p-4 rounded-xl border cursor-pointer transition ${selectedStaffId === u.id ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-white border-slate-200 hover:border-blue-300'}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  {u.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{u.name}</h3>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </div>
              </div>
            </div>
          ))}
          {staff.length === 0 && <div className="text-slate-400 text-sm text-center p-4">No staff members found.</div>}
        </div>

        {/* Permission Matrix */}
        <div className="lg:col-span-2">
          {selectedStaffId ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
                <UserCog size={20} className="text-slate-500" />
                <h3 className="text-lg font-bold text-slate-900">Access Control: {staff.find(u => u.id === selectedStaffId)?.name}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ALL_PERMISSIONS.map((perm) => {
                  const user = staff.find(u => u.id === selectedStaffId);
                  const isEnabled = user?.permissions?.includes(perm.key);

                  return (
                    <div 
                      key={perm.key}
                      onClick={() => handleTogglePermission(selectedStaffId, perm.key)}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${
                        isEnabled ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className={`text-sm font-medium ${isEnabled ? 'text-green-800' : 'text-slate-600'}`}>
                        {perm.label}
                      </span>
                      <div className={`w-5 h-5 rounded flex items-center justify-center ${isEnabled ? 'bg-green-600 text-white' : 'bg-slate-300 text-white'}`}>
                        {isEnabled && <Check size={14} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400">
              Select a staff member to configure permissions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
