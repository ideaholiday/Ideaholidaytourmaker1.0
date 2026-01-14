
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileService } from '../../services/profileService';
import { User, UserStatus } from '../../types';
import { Search, Eye, Filter } from 'lucide-react';

export const AgentsList: React.FC = () => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<User[]>(profileService.getAllAgents());
  const [search, setSearch] = useState('');

  const filtered = agents.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) || 
    a.email.toLowerCase().includes(search.toLowerCase()) ||
    a.companyName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agent Directory</h1>
          <p className="text-slate-500">Manage B2B travel partners and agencies.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search agents..." 
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
              <th className="px-6 py-4 font-semibold">Agent Name</th>
              <th className="px-6 py-4 font-semibold">Agency</th>
              <th className="px-6 py-4 font-semibold">Contact</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(agent => (
              <tr key={agent.id} className="hover:bg-slate-50 transition">
                <td className="px-6 py-4 font-medium text-slate-900">{agent.name}</td>
                <td className="px-6 py-4 text-slate-600">{agent.companyName || '-'}</td>
                <td className="px-6 py-4 text-slate-600">{agent.email}<br/><span className="text-xs text-slate-400">{agent.phone}</span></td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    agent.status === 'ACTIVE' || !agent.status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {agent.status || 'ACTIVE'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => navigate(`/admin/agents/${agent.id}`)}
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
