
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { bookingService } from '../../services/bookingService';
import { agentService } from '../../services/agentService'; // Import Agent Service for Quotes
import { currencyService } from '../../services/currencyService';
import { Booking, Quote } from '../../types';
import { AssignedBookingsTable } from '../../components/operator/AssignedBookingsTable';
import { AssignedQuotesTable } from '../../components/operator/AssignedQuotesTable';
import { Briefcase, Calendar, CheckCircle, AlertTriangle, RefreshCw, ArrowRight, FileText, PlayCircle, Book, DollarSign, TrendingUp } from 'lucide-react';

export const OperatorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const loadData = () => {
    if (user) {
        setIsLoading(true);
        setTimeout(() => {
            // Load Bookings (Service Orders)
            const bookingData = bookingService.getBookingsForOperator(user.id);
            bookingData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setBookings(bookingData);

            // Load Quotes (Pricing Requests)
            const quoteData = agentService.getOperatorAssignments(user.id);
            quoteData.sort((a, b) => new Date(b.travelDate).getTime() - new Date(a.travelDate).getTime());
            setQuotes(quoteData);

            setIsLoading(false);
        }, 300);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);
  
  if (!user) return null;

  // KPI Logic
  const today = new Date();
  today.setHours(0,0,0,0);

  // 1. Pending Quote Requests (Need Pricing/Acceptance)
  const pendingQuotesCount = quotes.filter(q => q.operatorStatus === 'ASSIGNED' || q.operatorStatus === 'PENDING').length;

  // 2. Upcoming Service Orders (Confirmed bookings for today or future, not yet started)
  const upcomingOrdersCount = bookings.filter(b => {
      const travelDate = new Date(b.travelDate);
      return b.status === 'CONFIRMED' && travelDate >= today;
  }).length;
  
  // 3. Active Operations (Currently In Progress)
  const activeJobsCount = bookings.filter(b => b.status === 'IN_PROGRESS').length;

  // 4. Earnings Calculation (Converted to USD for aggregation)
  const calculateEarnings = (statusList: string[]) => {
      return bookings.reduce((sum, b) => {
          if (statusList.includes(b.status)) {
              // Priority: Fixed Operator Price -> Net Cost (if visible) -> 0
              const rawPrice = b.operatorPrice !== undefined ? b.operatorPrice : (b.netCostVisibleToOperator ? b.netCost : 0);
              // Convert to USD base
              return sum + currencyService.convert(rawPrice, b.currency || 'USD', 'USD');
          }
          return sum;
      }, 0);
  };

  const realizedEarnings = calculateEarnings(['COMPLETED']);
  const pipelineEarnings = calculateEarnings(['CONFIRMED', 'IN_PROGRESS']);

  const StatCard = ({ label, value, subtext, icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-start justify-between hover:shadow-md transition-shadow">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
        {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
      </div>
      <div className={`p-3 rounded-lg ${color} text-white shadow-sm`}>
        {icon}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="text-brand-600" /> Operations Dashboard
          </h1>
          <p className="text-slate-500">
            Welcome, {user.name} 
            {user.assignedDestinations && user.assignedDestinations.length > 0 
                ? ` (Region: ${user.assignedDestinations.join(', ')})` 
                : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
            <Link to="/operator/guidebook" className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-brand-600 rounded-lg shadow-sm transition flex items-center gap-2">
                <Book size={18} /> <span className="text-xs font-medium">Guide Book</span>
            </Link>
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-lg text-xs flex items-center gap-2">
                <AlertTriangle size={14} />
                <span>Privacy Mode Active: Pricing & Agent details hidden.</span>
            </div>
            <button 
                onClick={loadData} 
                className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-brand-600 rounded-lg shadow-sm transition"
                title="Refresh Data"
            >
                <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
            </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard 
          label="Pending Quotes" 
          value={pendingQuotesCount} 
          subtext="Requests awaiting pricing" 
          icon={<FileText size={24} />} 
          color="bg-amber-500" 
        />
        <StatCard 
          label="Upcoming Orders" 
          value={upcomingOrdersCount} 
          subtext="Confirmed future trips" 
          icon={<Calendar size={24} />} 
          color="bg-blue-600" 
        />
        <StatCard 
          label="Active Jobs" 
          value={activeJobsCount} 
          subtext="Services currently running" 
          icon={<PlayCircle size={24} />} 
          color="bg-indigo-600" 
        />
        <StatCard 
          label="Total Earnings" 
          value={`$${Math.round(realizedEarnings).toLocaleString()}`} 
          subtext={`+ $${Math.round(pipelineEarnings).toLocaleString()} pending`} 
          icon={<DollarSign size={24} />} 
          color="bg-emerald-600" 
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Quote Requests Section */}
          <div className="space-y-4">
              <div className="flex justify-between items-center">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                    <FileText size={20} className="text-slate-400"/> New Quote Requests
                  </h2>
                  <Link to="/operator/assigned-quotes" className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
                      View All <ArrowRight size={14} />
                  </Link>
              </div>
              <AssignedQuotesTable quotes={quotes.slice(0, 5)} onRefresh={loadData} />
          </div>

          {/* Service Orders Section */}
          <div className="space-y-4">
              <div className="flex justify-between items-center">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                    <Briefcase size={20} className="text-slate-400"/> Service Orders (Bookings)
                  </h2>
                  <Link to="/operator/assigned-bookings" className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
                      View All <ArrowRight size={14} />
                  </Link>
              </div>
              <AssignedBookingsTable bookings={bookings.slice(0, 5)} onRefresh={loadData} />
          </div>
      </div>
    </div>
  );
};
