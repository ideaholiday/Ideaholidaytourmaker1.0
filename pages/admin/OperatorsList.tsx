
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileService } from '../../services/profileService';
import { User } from '../../types';
import { Search, Eye, MapPin } from 'lucide-react';

export const OperatorsList: React.FC = () => {
  const navigate = useNavigate();
  const [operators, setOperators] = useState<User[]>(profileService.getAllOperators());
  const [search, setSearch] = useState('');

  const filtered = operators.filter(o => 
    o.name.toLowerCase().includes(search.toLowerCase()) || 
    o.companyName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ground Operators</h1>
          <p className="text-slate-500">Manage DMC partners and service providers.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search operators..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none w-64"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold">Operator Name</th>
              <th className="px-6 py-4 font-semibold">Company</th>
              <th className="px-6 py-4 font-semibold">Locations</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(op => (
              <tr key={op.id} className="hover:bg-slate-50 transition">
                <td className="px-6 py-4 font-medium text-slate-900">{op.name}</td>
                <td className="px-6 py-4 text-slate-600">{op.companyName || '-'}</td>
                <td className="px-6 py-4 text-slate-600">
                  <div className="flex flex-wrap gap-1">
                    {op.assignedDestinations?.map(d => (
                      <span key={d} className="bg-slate-100 px-2 py-0.5 rounded text-xs border border-slate-200">{d}</span>
                    ))}
                    {!op.assignedDestinations?.length && <span className="text-xs text-slate-400">None</span>}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    op.status === 'ACTIVE' || !op.status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {op.status || 'ACTIVE'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => navigate(`/admin/operators/${op.id}`)}
                    className="text-brand-600 hover:bg-brand-50 p-2 rounded transition"
                  >
                    <Eye size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
