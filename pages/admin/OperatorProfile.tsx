
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { profileService } from '../../services/profileService';
import { agentService } from '../../services/agentService';
import { User, Quote } from '../../types';
import { ProfileCard } from '../../components/profile/ProfileCard';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

export const OperatorProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [operator, setOperator] = useState<User | undefined>();
  const [stats, setStats] = useState<any>({});
  const [assignments, setAssignments] = useState<Quote[]>([]);

  useEffect(() => {
    if (id) {
      const loadProfile = async () => {
          setOperator(profileService.getUser(id));
          const statsData = await profileService.getOperatorStats(id);
          setStats(statsData);
          const quotesData = await agentService.getOperatorAssignments(id);
          setAssignments(quotesData);
      };
      loadProfile();
    }
  }, [id]);

  if (!operator) return <div className="p-8">Loading...</div>;

  const handleStatusToggle = () => {
    const newStatus = operator.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
    profileService.updateUserStatus(operator.id, newStatus);
    setOperator(profileService.getUser(operator.id));
  };

  return (
    <div>
      <button onClick={() => navigate('/admin/users')} className="flex items-center text-slate-500 mb-4 hover:text-slate-800">
        <ArrowLeft size={18} className="mr-1" /> Back to List
      </button>

      <h1 className="text-2xl font-bold text-slate-900 mb-4">DMC Profile</h1>

      <ProfileCard 
        user={operator} 
        actions={
          <button 
            onClick={handleStatusToggle}
            className={`px-4 py-2 rounded-lg text-sm font-bold border ${operator.status === 'BLOCKED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}
          >
            {operator.status === 'BLOCKED' ? 'Unblock DMC' : 'Block DMC'}
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-slate-500 text-xs uppercase font-bold">Assigned</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalAssigned}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-slate-500 text-xs uppercase font-bold">Pending</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pendingAction}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-slate-500 text-xs uppercase font-bold">Accepted</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.acceptedJobs}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-slate-500 text-xs uppercase font-bold">Completed</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.completedJobs}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-slate-500 text-xs uppercase font-bold">Declined</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{stats.declinedJobs}</p>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Assignment History</h3>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-3 font-semibold">Ref No</th>
                <th className="px-6 py-3 font-semibold">Destination</th>
                <th className="px-6 py-3 font-semibold">Travel Date</th>
                <th className="px-6 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assignments.map(q => (
                <tr key={q.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-mono text-slate-600">{q.uniqueRefNo}</td>
                  <td className="px-6 py-3">{q.destination}</td>
                  <td className="px-6 py-3">{q.travelDate}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
                      q.operatorStatus === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
                      q.operatorStatus === 'DECLINED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {q.operatorStatus || 'ASSIGNED'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
