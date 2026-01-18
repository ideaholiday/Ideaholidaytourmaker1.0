
import React from 'react';
import { Booking } from '../../types';
import { useNavigate } from 'react-router-dom';
import { OperatorBookingActions } from './OperatorBookingActions';
import { MapPin, Calendar, Briefcase, EyeOff, CheckCircle, Clock, XCircle, PlayCircle, Hotel, Car, Camera, User } from 'lucide-react';

interface Props {
  bookings: Booking[];
  onRefresh: () => void;
}

export const AssignedBookingsTable: React.FC<Props> = ({ bookings, onRefresh }) => {
  const navigate = useNavigate();

  const getServiceBadges = (booking: Booking) => {
    const services = new Set<string>();
    booking.itinerary?.forEach(day => {
        day.services?.forEach(svc => services.add(svc.type));
    });
    
    return Array.from(services).map(type => {
        let icon = <Briefcase size={10} />;
        let color = 'bg-slate-100 text-slate-600';
        
        switch(type) {
            case 'HOTEL': icon = <Hotel size={10} />; color = 'bg-indigo-50 text-indigo-700 border-indigo-100'; break;
            case 'TRANSFER': icon = <Car size={10} />; color = 'bg-blue-50 text-blue-700 border-blue-100'; break;
            case 'ACTIVITY': icon = <Camera size={10} />; color = 'bg-pink-50 text-pink-700 border-pink-100'; break;
        }
        
        return (
            <span key={type} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${color} mr-1 mb-1`}>
                {icon} {type}
            </span>
        );
    });
  };

  const getPriceDisplay = (booking: Booking) => {
      // Priority 1: Fixed Operator Price
      if (booking.operatorPrice) {
          return <span className="font-mono font-bold text-slate-800">{booking.currency} {booking.operatorPrice.toLocaleString()}</span>;
      }
      // Priority 2: Net Cost if allowed
      if (booking.netCostVisibleToOperator) {
          return <span className="font-mono font-bold text-slate-800">{booking.currency} {booking.netCost.toLocaleString()}</span>;
      }
      // Default: Hidden
      return <span className="text-xs text-slate-400 italic flex items-center gap-1"><EyeOff size={10}/> Pending</span>;
  };

  const getStatusBadge = (booking: Booking) => {
      if (booking.status.includes('CANCEL')) {
          return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold"><XCircle size={12}/> Cancelled</span>;
      }

      const opStatus = booking.operatorStatus || 'ASSIGNED';
      
      if (opStatus === 'DECLINED') {
          return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold"><XCircle size={12}/> Declined</span>;
      }
      
      if (opStatus === 'ACCEPTED') {
          if (booking.status === 'IN_PROGRESS') {
              return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold"><PlayCircle size={12}/> In Progress</span>;
          }
          if (booking.status === 'COMPLETED') {
              return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold"><CheckCircle size={12}/> Completed</span>;
          }
          return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold"><CheckCircle size={12}/> Accepted</span>;
      }

      return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold"><Clock size={12}/> New Assignment</span>;
  };

  if (bookings.length === 0) {
      return (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Briefcase className="mx-auto text-slate-300 mb-3" size={48} />
              <h3 className="text-lg font-bold text-slate-900">No Bookings Found</h3>
              <p className="text-slate-500">You currently have no confirmed service orders.</p>
          </div>
      );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-xs tracking-wider">
            <tr>
              <th className="px-6 py-4 font-semibold">Ref No</th>
              <th className="px-6 py-4 font-semibold">Guest Name</th>
              <th className="px-6 py-4 font-semibold">Destination</th>
              <th className="px-6 py-4 font-semibold">Travel Date</th>
              <th className="px-6 py-4 font-semibold">Services</th>
              <th className="px-6 py-4 font-semibold">Operational Price</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bookings.map((booking) => {
              const leadGuest = booking.travelers?.[0] 
                ? `${booking.travelers[0].title} ${booking.travelers[0].firstName} ${booking.travelers[0].lastName}`
                : 'Guest';

              return (
                <tr 
                  key={booking.id} 
                  className="hover:bg-slate-50 transition cursor-pointer"
                  onClick={() => navigate(`/booking/${booking.id}`)}
                >
                  <td className="px-6 py-4 font-mono font-medium text-brand-600">
                    {booking.uniqueRefNo}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 font-medium text-slate-900">
                        <User size={14} className="text-slate-400" />
                        {leadGuest}
                    </div>
                    <div className="text-xs text-slate-500 pl-6">{booking.paxCount} Pax</div>
                  </td>
                  <td className="px-6 py-4 text-slate-900">
                    <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-slate-400" />
                        {booking.destination}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400" />
                        {booking.travelDate}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                      <div className="flex flex-wrap max-w-[200px]">
                          {getServiceBadges(booking)}
                      </div>
                  </td>
                  <td className="px-6 py-4">
                      {getPriceDisplay(booking)}
                  </td>
                  <td className="px-6 py-4">
                      {getStatusBadge(booking)}
                  </td>
                  <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <OperatorBookingActions booking={booking} onRefresh={onRefresh} />
                          <button 
                              onClick={() => navigate(`/booking/${booking.id}`)}
                              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-transparent hover:border-slate-200 transition"
                          >
                              View
                          </button>
                      </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
