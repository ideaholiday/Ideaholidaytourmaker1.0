import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { operatorAssignmentService } from '../../services/operatorAssignmentService';
import { Quote } from '../../types';
import { AssignedQuotesTable } from '../../components/operator/AssignedQuotesTable';
import { Briefcase, RefreshCw, Filter } from 'lucide-react';

export const AssignedQuotes: React.FC = () => {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'ACCEPTED'>('ALL');

  const loadQuotes = () => {
    if (user) {
      setIsLoading(true);
      // Simulate network delay for realistic feel
      setTimeout(async () => {
          const data = await operatorAssignmentService.getAssignedQuotes(user.id);
          setQuotes(data);
          setIsLoading(false);
      }, 400);
    }
  };

  useEffect(() => {
    loadQuotes();
  }, [user]);

  const filteredQuotes = quotes.filter(q => {
      const status = q.operatorStatus || 'ASSIGNED';
      if (filter === 'ALL') return true;
      if (filter === 'PENDING') return status === 'ASSIGNED' || status === 'PENDING';
      if (filter === 'ACCEPTED') return status === 'ACCEPTED';
      return true;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="text-brand-600" /> Work Queue
          </h1>
          <p className="text-slate-500">Manage your assigned service orders and execution tasks.</p>
        </div>
        
        <div className="flex items-center gap-3">
            <div className="flex bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                <button 
                    onClick={() => setFilter('ALL')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${filter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                    All
                </button>
                <button 
                    onClick={() => setFilter('PENDING')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${filter === 'PENDING' ? 'bg-amber-500 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                    Pending
                </button>
                <button 
                    onClick={() => setFilter('ACCEPTED')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${filter === 'ACCEPTED' ? 'bg-green-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                    Active
                </button>
            </div>
            
            <button 
                onClick={loadQuotes} 
                className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-brand-600 rounded-lg shadow-sm transition"
                title="Refresh List"
            >
                <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
            </button>
        </div>
      </div>

      <AssignedQuotesTable quotes={filteredQuotes} onRefresh={loadQuotes} />
    </div>
  );
};