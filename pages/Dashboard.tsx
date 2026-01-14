import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { INITIAL_QUOTES } from '../constants';
import { Quote, UserRole } from '../types';
import { Link } from 'react-router-dom';
import { Calendar, Users, DollarSign, Activity, ChevronRight } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [quotes] = useState<Quote[]>(INITIAL_QUOTES);

  if (!user) return null;

  // Filter quotes based on visibility rules would go here in a real app API call
  // For now we show all, but we will protect details in the detail view.
  const myQuotes = quotes.filter(q => {
      if (user.role === UserRole.ADMIN || user.role === UserRole.STAFF) return true;
      if (user.role === UserRole.AGENT) return q.agentId === user.id;
      if (user.role === UserRole.OPERATOR) return q.operatorId === user.id;
      return false;
  });

  const StatsCard = ({ title, value, icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Welcome back, {user.name}</h1>
        <p className="text-slate-500">Here is what's happening in your travel desk today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatsCard 
          title="Active Quotes" 
          value={myQuotes.length} 
          icon={<Activity size={24} className="text-blue-600" />}
          color="bg-blue-50"
        />
        <StatsCard 
          title="Upcoming Trips" 
          value={myQuotes.filter(q => new Date(q.travelDate) > new Date()).length} 
          icon={<Calendar size={24} className="text-purple-600" />}
          color="bg-purple-50"
        />
        {user.role !== UserRole.OPERATOR && (
            <StatsCard 
            title="Total Revenue" 
            value={`$${myQuotes.reduce((acc, q) => acc + (q.price || 0), 0)}`} 
            icon={<DollarSign size={24} className="text-green-600" />}
            color="bg-green-50"
            />
        )}
        <StatsCard 
          title="Pax Traveling" 
          value={myQuotes.reduce((acc, q) => acc + q.paxCount, 0)} 
          icon={<Users size={24} className="text-orange-600" />}
          color="bg-orange-50"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="font-semibold text-slate-900">Recent Quotes & Bookings</h2>
          {user.role !== UserRole.OPERATOR && (
             <button className="text-sm text-brand-600 hover:text-brand-700 font-medium">Create New Quote</button>
          )}
        </div>
        <div className="divide-y divide-slate-100">
          {myQuotes.length > 0 ? (
            myQuotes.map((quote) => (
              <div key={quote.id} className="p-6 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {quote.uniqueRefNo}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      quote.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 
                      quote.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {quote.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-medium text-slate-900">{quote.destination}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {quote.travelDate} &bull; {quote.paxCount} Pax &bull; {user.role === UserRole.OPERATOR ? 'View Details for Service' : `Agent: ${quote.agentName}`}
                  </p>
                </div>
                
                <div className="flex items-center gap-6">
                  {user.role !== UserRole.OPERATOR && (
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-medium text-slate-900">{quote.currency} {quote.price}</p>
                      <p className="text-xs text-slate-500">Total Price</p>
                    </div>
                  )}
                  <Link 
                    to={`/quote/${quote.id}`}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 text-slate-600 hover:bg-brand-600 hover:text-white transition"
                  >
                    <ChevronRight size={20} />
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-slate-500">
              No quotes found assigned to you.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};