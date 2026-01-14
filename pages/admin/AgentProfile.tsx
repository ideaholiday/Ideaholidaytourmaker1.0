
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { profileService } from '../../services/profileService';
import { agentService } from '../../services/agentService';
import { User, Quote } from '../../types';
import { ProfileCard } from '../../components/profile/ProfileCard';
import { FileText, CheckCircle, XCircle, AlertTriangle, ArrowLeft } from 'lucide-react';

export const AgentProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<User | undefined>();
  const [stats, setStats] = useState<any>({});
  const [activeTab, setActiveTab] = useState<'QUOTES' | 'BOOKINGS'>('QUOTES');
  const [quotes, setQuotes] = useState<Quote[]>([]);

  useEffect(() => {
    if (id) {
      setAgent(profileService.getUser(id));
      setStats(profileService.getAgentStats(id));
      setQuotes(agentService.getQuotes(id));
    }
  }, [id]);

  if (!agent) return <div className="p-8">Loading...</div>;

  const handleStatusToggle = () => {
    const newStatus = agent.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    profileService.updateUserStatus(agent.id, newStatus);
    setAgent(profileService.getUser(agent.id));
  };

  return (
    <div>
      <button onClick={() => navigate('/admin/users')} className="flex items-center text-slate-500 mb-4 hover:text-slate-800">
        <ArrowLeft size={18} className="mr-1" /> Back to List
      </button>

      <ProfileCard 
        user={agent} 
        actions={
          <button 
            onClick={handleStatusToggle}
            className={`px-4 py-2 rounded-lg text-sm font-bold border ${agent.status === 'SUSPENDED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}
          >
            {agent.status === 'SUSPENDED' ? 'Resume Account' : 'Suspend Account'}
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-slate-500 text-xs uppercase font-bold">Total Quotes</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalQuotes}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-slate-500 text-xs uppercase font-bold">Active Inquiries</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.activeQuotes}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-slate-500 text-xs uppercase font-bold">Confirmed Business</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.confirmedBookings}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-slate-500 text-xs uppercase font-bold">Total Value</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">${stats.totalBusinessValue?.toLocaleString()}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8">
        <div className="flex border-b border-slate-200 mb-4">
          <button 
            onClick={() => setActiveTab('QUOTES')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition ${activeTab === 'QUOTES' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500'}`}
          >
            Quote History
          </button>
          <button 
            onClick={() => setActiveTab('BOOKINGS')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition ${activeTab === 'BOOKINGS' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500'}`}
          >
            Bookings
          </button>
        </div>

        {activeTab === 'QUOTES' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-semibold">Ref No</th>
                  <th className="px-6 py-3 font-semibold">Destination</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotes.map(q => (
                  <tr key={q.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-mono text-slate-600">{q.uniqueRefNo}</td>
                    <td className="px-6 py-3">{q.destination}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${q.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                        {q.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-mono">{q.price.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
