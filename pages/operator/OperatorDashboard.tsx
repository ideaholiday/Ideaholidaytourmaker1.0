
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { bookingService } from '../../services/bookingService';
import { agentService } from '../../services/agentService';
import { currencyService } from '../../services/currencyService';
import { Booking, Quote, ItineraryItem } from '../../types';
import { AssignedBookingsTable } from '../../components/operator/AssignedBookingsTable';
import { AssignedQuotesTable } from '../../components/operator/AssignedQuotesTable';
import { Briefcase, Calendar, Clock, AlertTriangle, RefreshCw, ArrowRight, FileText, PlayCircle, Book, DollarSign, MapPin, User, Car, Camera, Hotel } from 'lucide-react';

export const OperatorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [todaysTasks, setTodaysTasks] = useState<{
      time: string;
      type: string;
      name: string;
      guest: string;
      pax: number;
      ref: string;
      id: string;
      location?: string;
  }[]>([]);
  
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

            // Process Today's Operations
            processTodaysTasks(bookingData);

            setIsLoading(false);
        }, 300);
    }
  };

  const processTodaysTasks = (allBookings: Booking[]) => {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const tasks: any[] = [];

      allBookings.forEach(b => {
          if (b.status === 'CONFIRMED' || b.status === 'IN_PROGRESS') {
              const startDate = new Date(b.travelDate);
              
              b.itinerary?.forEach((day: ItineraryItem) => {
                  const serviceDate = new Date(startDate);
                  serviceDate.setDate(startDate.getDate() + (day.day - 1));
                  
                  if (serviceDate.toISOString().split('T')[0] === todayStr) {
                      // Found tasks for today
                      day.services?.forEach(svc => {
                          const isMyService = !b.operatorId || b.operatorId === user?.id; // Basic check
                          if (isMyService) {
                              tasks.push({
                                  time: svc.meta?.startTime || 'Day',
                                  type: svc.type,
                                  name: svc.name,
                                  guest: b.travelers?.[0] ? `${b.travelers[0].firstName} ${b.travelers[0].lastName}` : 'Guest',
                                  pax: b.paxCount,
                                  ref: b.uniqueRefNo,
                                  id: b.id,
                                  location: b.destination
                              });
                          }
                      });
                  }
              });
          }
      });
      
      // Sort: Morning first, then flexible
      setTodaysTasks(tasks.sort((a, b) => a.time.localeCompare(b.time)));
  };

  useEffect(() => {
    loadData();
  }, [user]);
  
  if (!user) return null;

  // KPI Logic
  const pendingQuotesCount = quotes.filter(q => q.operatorStatus === 'ASSIGNED' || q.operatorStatus === 'PENDING').length;
  const pendingBookingsCount = bookings.filter(b => b.operatorStatus === 'ASSIGNED').length;
  const activeJobsCount = bookings.filter(b => b.status === 'IN_PROGRESS').length;

  const calculateEarnings = (statusList: string[]) => {
      return bookings.reduce((sum, b) => {
          if (statusList.includes(b.status)) {
              const rawPrice = b.operatorPrice !== undefined ? b.operatorPrice : (b.netCostVisibleToOperator ? b.netCost : 0);
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
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-lg text-xs flex items-center gap-2 font-medium">
                <AlertTriangle size={14} />
                <span>Privacy Mode Active</span>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          label="Action Required" 
          value={pendingQuotesCount + pendingBookingsCount} 
          subtext="New Requests" 
          icon={<AlertTriangle size={24} />} 
          color="bg-amber-500" 
        />
        <StatCard 
          label="Active Jobs" 
          value={activeJobsCount} 
          subtext="In Progress Now" 
          icon={<PlayCircle size={24} />} 
          color="bg-blue-600" 
        />
        <StatCard 
          label="Confirmed Future" 
          value={bookings.filter(b => b.status === 'CONFIRMED').length} 
          subtext="Upcoming Orders" 
          icon={<Calendar size={24} />} 
          color="bg-indigo-600" 
        />
        <StatCard 
          label="Total Revenue" 
          value={`$${Math.round(realizedEarnings).toLocaleString()}`} 
          subtext={`+ $${Math.round(pipelineEarnings).toLocaleString()} pipeline`} 
          icon={<DollarSign size={24} />} 
          color="bg-emerald-600" 
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="xl:col-span-2 space-y-8">
              
              {/* TODAY'S OPERATIONS */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                          <Clock size={18} className="text-blue-600"/> Today's Live Operations
                      </h3>
                      <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long'})}
                      </span>
                  </div>
                  
                  {todaysTasks.length > 0 ? (
                      <div className="divide-y divide-slate-100">
                          {todaysTasks.map((task, idx) => (
                              <div key={idx} className="p-4 hover:bg-slate-50 transition flex items-center gap-4">
                                  <div className="w-16 text-center">
                                      <span className="text-xs font-bold text-slate-500 block">{task.time}</span>
                                  </div>
                                  <div className={`p-2 rounded-lg shrink-0 ${
                                      task.type === 'TRANSFER' ? 'bg-blue-50 text-blue-600' : 
                                      task.type === 'HOTEL' ? 'bg-indigo-50 text-indigo-600' : 'bg-pink-50 text-pink-600'
                                  }`}>
                                      {task.type === 'TRANSFER' ? <Car size={18}/> : 
                                       task.type === 'HOTEL' ? <Hotel size={18}/> : <Camera size={18}/>}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <h4 className="font-bold text-slate-900 text-sm truncate">{task.name}</h4>
                                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                          <span className="flex items-center gap-1"><User size={10}/> {task.guest} ({task.pax})</span>
                                          <span className="flex items-center gap-1"><MapPin size={10}/> {task.location}</span>
                                      </div>
                                  </div>
                                  <div className="text-right">
                                      <span className="block font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded mb-1">{task.ref}</span>
                                      <Link to={`/booking/${task.id}`} className="text-xs text-brand-600 hover:underline">View</Link>
                                  </div>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <div className="p-8 text-center text-slate-400 text-sm italic">
                          No operations scheduled for today.
                      </div>
                  )}
              </div>

              {/* ACTION QUEUE: Service Orders */}
              <div className="space-y-4">
                  <div className="flex justify-between items-center">
                      <h2 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                        <Briefcase size={20} className="text-slate-400"/> Recent Service Orders
                      </h2>
                      <Link to="/operator/assigned-bookings" className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
                          View All <ArrowRight size={14} />
                      </Link>
                  </div>
                  <AssignedBookingsTable bookings={bookings.slice(0, 5)} onRefresh={loadData} />
              </div>
          </div>

          {/* Sidebar: Quote Requests */}
          <div className="xl:col-span-1 space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col">
                  <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                          <FileText size={18} className="text-amber-500"/> Pricing Requests
                      </h3>
                      {pendingQuotesCount > 0 && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-bold">{pendingQuotesCount} New</span>}
                  </div>
                  <div className="flex-1 overflow-hidden">
                      <AssignedQuotesTable quotes={quotes.slice(0, 6)} onRefresh={loadData} />
                  </div>
                  <div className="p-4 border-t border-slate-100 text-center">
                      <Link to="/operator/assigned-quotes" className="text-sm text-brand-600 hover:text-brand-700 font-medium block">
                          View All Requests
                      </Link>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};
