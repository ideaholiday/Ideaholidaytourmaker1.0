
import React from 'react';
import { User, UserRole } from '../../types';
import { Mail, Phone, MapPin, Building, Shield, CreditCard, Calendar } from 'lucide-react';

interface Props {
  user: User;
  actions?: React.ReactNode;
}

export const ProfileCard: React.FC<Props> = ({ user, actions }) => {
  const statusColor = user.status === 'ACTIVE' || !user.status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
  const statusLabel = user.status || 'ACTIVE';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white ${
            user.role === UserRole.ADMIN ? 'bg-red-600' : 
            user.role === UserRole.STAFF ? 'bg-blue-600' :
            user.role === UserRole.AGENT ? 'bg-emerald-600' : 'bg-amber-600'
          }`}>
            {user.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-slate-500 flex items-center gap-1">
                <Shield size={14} /> {user.role}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor}`}>
                {statusLabel}
              </span>
            </div>
          </div>
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-slate-600">
            <Mail size={16} className="text-slate-400" />
            <span>{user.email}</span>
          </div>
          <div className="flex items-center gap-3 text-slate-600">
            <Phone size={16} className="text-slate-400" />
            <span>{user.phone || 'No phone'}</span>
          </div>
          <div className="flex items-center gap-3 text-slate-600">
            <Building size={16} className="text-slate-400" />
            <span>{user.companyName || 'No Company'}</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 text-slate-600">
            <MapPin size={16} className="text-slate-400" />
            <span>{user.city ? `${user.city}, ${user.state || ''}` : 'Location Unset'}</span>
          </div>
          {user.role === UserRole.AGENT && (
            <div className="flex items-center gap-3 text-slate-600">
              <CreditCard size={16} className="text-slate-400" />
              <span>Credit Limit: <strong>${(user.creditLimit || 0).toLocaleString()}</strong></span>
            </div>
          )}
          <div className="flex items-center gap-3 text-slate-600">
            <Calendar size={16} className="text-slate-400" />
            <span>Joined: {new Date(user.joinedAt || Date.now()).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
