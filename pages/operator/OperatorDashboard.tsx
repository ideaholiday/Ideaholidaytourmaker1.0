
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
        // Using Promise.all to fetch concurrently
        Promise.all([
            bookingService.getBookingsForOperator(user.id),
            agentService.getOperatorAssignments(user.id)
        ]).then(([bookingData, quoteData]) => {
            
            // Sort Bookings
            bookingData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setBookings(bookingData);

            // Sort Quotes
            quoteData.sort((a, b) => new Date(b.travelDate).getTime() - new Date(a.travelDate).getTime());
            setQuotes(quoteData);

            // Process Today's Operations
            processTodaysTasks(bookingData);

            setIsLoading(false);
        }).catch(err => {
            console.error("Dashboard Load Error:", err);
            setIsLoading(false);
        });
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
            <Briefcase className="text-brand-600" /> DMC Dashboard
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
          subtext="In Progress" 
          icon={<PlayCircle size={24} />} 
          color="bg-blue-500" 
        />
        <StatCard 
          label="Realized Earnings" 
          value={`$${realizedEarnings.toLocaleString()}`} 
          subtext="Completed Jobs" 
          icon={<DollarSign size={24} />} 
          color="bg-green-500" 
        />
        <StatCard 
          label="Pipeline Value" 
          value={`$${pipelineEarnings.toLocaleString()}`} 
          subtext="Confirmed Jobs" 
          icon={<Briefcase size={24} />} 
          color="bg-purple-500" 
        />
      </div>

      {/* Today's Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
            
            {/* New Assignments Section */}
            {(pendingQuotesCount > 0 || pendingBookingsCount > 0) && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-amber-50/50">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Clock size={18} className="text-amber-600" /> New Assignments
                        </h3>
                        <Link to="/operator/work-queue" className="text-xs font-bold text-brand-600 hover:underline flex items-center gap-1">
                            Go to Queue <ArrowRight size={12}/>
                        </Link>
                    </div>
                    <div className="p-0">
                         {/* Show mix of quotes and bookings that are pending */}
                         <AssignedQuotesTable quotes={quotes.filter(q => q.operatorStatus === 'ASSIGNED' || q.operatorStatus === 'PENDING').slice(0, 3)} onRefresh={loadData} />
                         {/* We could also show bookings here, but usually one table is enough for "Alerts" or split them */}
                    </div>
                </div>
            )}

            {/* Daily Schedule */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Calendar size={18} className="text-slate-500" /> Today's Schedule
                    </h3>
                    <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-600">
                        {todaysTasks.length} Tasks
                    </span>
                </div>
                <div className="divide-y divide-slate-50">
                    {todaysTasks.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm">
                            No scheduled tasks for today.
                        </div>
                    ) : (
                        todaysTasks.map((task, idx) => (
                            <div key={idx} className="p-4 hover:bg-slate-50 flex items-center gap-4 transition">
                                <div className="min-w-[60px] text-center">
                                    <span className="block text-sm font-bold text-slate-800">{task.time}</span>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                                    {task.type === 'HOTEL' && <Hotel size={18} />}
                                    {task.type === 'TRANSFER' && <Car size={18} />}
                                    {task.type === 'ACTIVITY' && <Camera size={18} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-slate-900 text-sm truncate">{task.name}</h4>
                                    <p className="text-xs text-slate-500 truncate">
                                        Guest: {task.guest} ({task.pax} Pax) • Ref: {task.ref}
                                    </p>
                                </div>
                                <Link to={`/booking/${task.id}`} className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition">
                                    <ArrowRight size={18} />
                                </Link>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
            <div className="bg-slate-900 text-white rounded-xl p-6 shadow-lg">
                <h3 className="font-bold text-lg mb-4">Quick Actions</h3>
                <div className="space-y-3">
                    <Link to="/operator/assigned-quotes" className="block p-3 bg-white/10 hover:bg-white/20 rounded-lg transition flex justify-between items-center text-sm">
                        <span>Review Pricing Requests</span>
                        <ArrowRight size={14} className="opacity-50" />
                    </Link>
                    <Link to="/operator/assigned-bookings" className="block p-3 bg-white/10 hover:bg-white/20 rounded-lg transition flex justify-between items-center text-sm">
                        <span>Manage Active Bookings</span>
                        <ArrowRight size={14} className="opacity-50" />
                    </Link>
                    <Link to="/operator/inventory" className="block p-3 bg-white/10 hover:bg-white/20 rounded-lg transition flex justify-between items-center text-sm">
                        <span>Update My Inventory</span>
                        <ArrowRight size={14} className="opacity-50" />
                    </Link>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <h3 className="font-bold text-slate-800 mb-3 text-sm">Recent Activity</h3>
                <div className="space-y-4">
                    {/* Mock Activity Feed - In real app, fetch from Audit Logs */}
                    <div className="flex gap-3 text-xs">
                        <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0"></div>
                        <div className="text-slate-600">
                            <span className="font-bold text-slate-900">Booking #1024</span> accepted.
                            <div className="text-slate-400 mt-0.5">2 hours ago</div>
                        </div>
                    </div>
                    <div className="flex gap-3 text-xs">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                        <div className="text-slate-600">
                            New quote request for <span className="font-bold text-slate-900">Dubai</span>.
                            <div className="text-slate-400 mt-0.5">5 hours ago</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
