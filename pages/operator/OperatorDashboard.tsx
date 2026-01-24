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
        setTimeout(async () => {
            // Load Bookings (Service Orders)
            const bookingData = await bookingService.getBookingsForOperator(user.id);
            bookingData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setBookings(bookingData);

            // Load Quotes (Pricing Requests)
            const quoteData = await agentService.getOperatorAssignments(user.id);
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
          color="bg-amber-500