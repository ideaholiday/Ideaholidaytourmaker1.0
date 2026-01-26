

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { profileService } from '../../services/profileService';
import { agentService } from '../../services/agentService';
import { User, Quote } from '../../types';
import { ProfileCard } from '../../components/profile/ProfileCard';
import { FileText, CheckCircle, XCircle, AlertTriangle, ArrowLeft, Eye, Trash2 } from 'lucide-react';
import { bookingService } from '../../services/bookingService';

export const AgentProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<User | undefined>();
  const [stats, setStats] = useState<any>({});
  const [activeTab, setActiveTab] = useState<'QUOTES' | 'BOOKINGS'>('QUOTES');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [bookings, setBookings] = useState<any[]>([]); // Using 'any' for quick mapping

  useEffect(() => {
    if (id) {
      // 1. Load Profile
      setAgent(profileService.getUser(id));
      
      // 2. Load Stats
      profileService.getAgentStats(id); // Warning: this function in original service was sync mock, better to recalc here if needed
      
      // 3. Load Real Quotes
      agentService.fetchQuotes(id).then(qs => {
          setQuotes(quotes => qs.sort((a,b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()));
          
          // Basic Stats Calculation on the fly
          const confirmed = qs.filter(q => q.status === 'BOOKED' || q.status === 'CONFIRMED');
          setStats({
              totalQuotes: qs.length,
              activeQuotes: qs.filter(q => q.status === 'DRAFT' || q.status === 'PENDING').length,
              confirmedBookings: confirmed.length,
              totalBusinessValue: confirmed.reduce((acc, curr) => acc + (curr.sellingPrice || curr.price || 0), 0)
          });
      });

      // 4. Load Bookings
      bookingService.getBookingsForAgent(id).then(setBookings);
    }
  }, [id]);

  if (!agent) return <div className="p-8">Loading...</div>;

  const handleStatusToggle = () => {
    const newStatus = agent.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    profileService.updateUserStatus(agent.id, newStatus);
    setAgent(profileService.getUser(agent.id));
  };

  const handleDeleteQuote = async (quoteId: string) => {
      if(confirm("Are you sure you want to delete this quote from the agent's account?")) {
          await agentService.deleteQuote(quoteId);
          // Refresh list
          agentService.fetchQuotes(id!).then(setQuotes);
      }
  };

  return (
    <div>
      <button onClick={() => navigate('/admin/agents')} className="flex items-center text-slate-500 mb-4 hover:text-slate-800">
        <ArrowLeft size={18} className="mr-1" /> Back to Agents
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
          <p className="text-slate-500 text-xs uppercase font-bold">Total Sales</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">₹ {stats.totalBusinessValue?.toLocaleString()}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8">
        <div className="flex border-b border-slate-200 mb-4 gap-4">
          <button 
            onClick={() => setActiveTab('QUOTES')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${activeTab === 'QUOTES' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Quote History ({quotes.length})
          </button>
          <button 
            onClick={() => setActiveTab('BOOKINGS')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${activeTab === 'BOOKINGS' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Confirmed Bookings ({bookings.length})
          </button>
        </div>

        {activeTab === 'QUOTES' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-semibold">Ref No</th>
                  <th className="px-6 py-3 font-semibold">Destination</th>
                  <th className="px-6 py-3 font-semibold">Guest</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold text-right">Selling Price</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotes.map(q => (
                  <tr key={q.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-mono text-brand-600 font-medium">{q.uniqueRefNo}</td>
                    <td className="px-6 py-3">{q.destination}</td>
                    <td className="px-6 py-3">{q.leadGuestName || '-'}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        q.status === 'CONFIRMED' || q.status === 'BOOKED' ? 'bg-green-100 text-green-700' : 
                        q.status === 'DRAFT' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {q.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-mono font-medium">
                        {q.currency} {(q.sellingPrice || q.price || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-right">
                        <div className="flex justify-end gap-2">
                             <button onClick={() => navigate(`/quote/${q.id}`)} className="text-slate-400 hover:text-brand-600" title="View Full Quote">
                                 <Eye size={16} />
                             </button>
                             <button onClick={() => handleDeleteQuote(q.id)} className="text-slate-400 hover:text-red-600" title="Delete Quote">
                                 <Trash2 size={16} />
                             </button>
                        </div>
                    </td>
                  </tr>
                ))}
                {quotes.length === 0 && (
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">No quotes created by this agent.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'BOOKINGS' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-semibold">Ref No</th>
                  <th className="px-6 py-3 font-semibold">Destination</th>
                  <th className="px-6 py-3 font-semibold">Travel Date</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold text-right">Amount</th>
                  <th className="px-6 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-mono text-brand-600 font-medium">{b.uniqueRefNo}</td>
                    <td className="px-6 py-3">{b.destination}</td>
                    <td className="px-6 py-3">{b.travelDate}</td>
                    <td className="px-6 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">
                        {b.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-mono font-medium">
                        {b.currency} {b.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-right">
                         <button onClick={() => navigate(`/booking/${b.id}`)} className="text-brand-600 hover:underline text-xs font-bold">
                             Manage
                         </button>
                    </td>
                  </tr>
                ))}
                {bookings.length === 0 && (
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">No bookings found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};