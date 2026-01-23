import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { agentService } from '../../services/agentService';
import { bookingService } from '../../services/bookingService';
import { Quote, Booking } from '../../types';
import { AssignedQuotesTable } from '../../components/operator/AssignedQuotesTable';
import { AssignedBookingsTable } from '../../components/operator/AssignedBookingsTable';
import { Briefcase, FileText, CheckSquare, RefreshCw, Layers } from 'lucide-react';

export const WorkQueue: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'QUOTES' | 'BOOKINGS'>('QUOTES');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = () => {
    if (user) {
        setIsLoading(true);
        // Simulate concurrent data fetching
        setTimeout(async () => {
            const qData = await agentService.getOperatorAssignments(user.id);
            const bData = bookingService.getBookingsForOperator(user.id);
            
            // Sort by latest interaction
            qData.sort((a, b) => new Date(b.travelDate).getTime() - new Date(a.travelDate).getTime());
            bData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            setQuotes(qData);
            setBookings(bData);
            setIsLoading(false);
        }, 400);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Counts for tabs
  const pendingQuotes = quotes.filter(q => q.operatorStatus === 'ASSIGNED' || q.operatorStatus === 'PENDING').length;
  const pendingBookings = bookings.filter(b => b.operatorStatus === 'ASSIGNED').length;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="text-brand-600" /> Operational Work Queue
          </h1>
          <p className="text-slate-500">Manage your incoming tasks and service orders.</p>
        </div>
        
        <button 
            onClick={loadData} 
            className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-brand-600 rounded-lg shadow-sm transition"
            title="Refresh Data"
        >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px] flex flex-col">
          {/* Tab Navigation */}
          <div className="flex border-b border-slate-200">
              <button 
                onClick={() => setActiveTab('QUOTES')}
                className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition border-b-2 ${activeTab === 'QUOTES' ? 'border-brand-600 text-brand-600 bg-brand-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
              >
                  <FileText size={18} />
                  Pricing Requests
                  {pendingQuotes > 0 && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-bold">{pendingQuotes}</span>}
              </button>
              <button 
                onClick={() => setActiveTab('BOOKINGS')}
                className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition border-b-2 ${activeTab === 'BOOKINGS' ? 'border-brand-600 text-brand-600 bg-brand-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
              >
                  <Briefcase size={18} />
                  Service Orders
                  {pendingBookings > 0 && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-bold">{pendingBookings}</span>}
              </button>
          </div>

          {/* Content Area */}
          <div className="p-6 flex-1 bg-slate-50/30">
              {isLoading ? (
                  <div className="flex items-center justify-center h-64 text-slate-400">
                      <RefreshCw className="animate-spin mr-2" /> Loading Assignments...
                  </div>
              ) : (
                  <>
                    {activeTab === 'QUOTES' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-slate-700">Assigned Quote Requests</h3>
                                <div className="text-xs text-slate-500">Showing {quotes.length} records</div>
                            </div>
                            <AssignedQuotesTable quotes={quotes} onRefresh={loadData} />
                        </div>
                    )}

                    {activeTab === 'BOOKINGS' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-slate-700">Confirmed Service Orders</h3>
                                <div className="text-xs text-slate-500">Showing {bookings.length} records</div>
                            </div>
                            <AssignedBookingsTable bookings={bookings} onRefresh={loadData} />
                        </div>
                    )}
                  </>
              )}
          </div>
      </div>
    </div>
  );
};