
import React from 'react';
import { Quote } from '../../types';
import { useNavigate } from 'react-router-dom';
import { OperatorQuoteActions } from './OperatorQuoteActions';
import { MapPin, Calendar, Briefcase, EyeOff, CheckCircle, Clock, XCircle, PlayCircle, Hotel, Car, Camera, Eye } from 'lucide-react';

interface Props {
  quotes: Quote[];
  onRefresh: () => void;
}

export const AssignedQuotesTable: React.FC<Props> = ({ quotes, onRefresh }) => {
  const navigate = useNavigate();

  // Helper to generate service icons based on itinerary content
  const getServiceBadges = (quote: Quote) => {
    const services = new Set<string>();
    
    if (quote.itinerary && quote.itinerary.length > 0) {
        quote.itinerary.forEach(day => {
            day.services?.forEach(svc => services.add(svc.type));
        });
    } else {
        // Fallback if itinerary is not detailed but we have a quote
        return <span className="text-xs text-slate-400 italic">Details in view</span>;
    }
    
    if (services.size === 0) return <span className="text-xs text-slate-400">-</span>;

    return Array.from(services).map(type => {
        let icon = <Briefcase size={10} />;
        let color = 'bg-slate-100 text-slate-600 border-slate-200';
        
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

  // Logic to determine which price to show based on privacy settings
  const getPriceDisplay = (quote: Quote) => {
      // Priority 1: Fixed Operator Price (Overrides everything)
      if (quote.operatorPrice) {
          return <span className="font-mono font-bold text-slate-800">{quote.currency} {quote.operatorPrice.toLocaleString()}</span>;
      }
      // Priority 2: Net Cost (Only if explicitly allowed)
      if (quote.netCostVisibleToOperator && quote.cost) {
          return <span className="font-mono font-bold text-slate-800">{quote.currency} {quote.cost.toLocaleString()}</span>;
      }
      // Default: Hidden
      return <span className="text-xs text-slate-400 italic flex items-center gap-1"><EyeOff size={10}/> Pending</span>;
  };

  const getStatusBadge = (quote: Quote) => {
      const opStatus = quote.operatorStatus || 'ASSIGNED';
      
      if (opStatus === 'DECLINED') {
          return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200"><XCircle size={12}/> Declined</span>;
      }
      
      if (opStatus === 'ACCEPTED') {
          if (quote.status === 'IN_PROGRESS') {
              return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200"><PlayCircle size={12}/> In Progress</span>;
          }
          if (quote.status === 'COMPLETED') {
              return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold border border-green-200"><CheckCircle size={12}/> Completed</span>;
          }
          return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200"><CheckCircle size={12}/> Accepted</span>;
      }

      // Default: Assigned/Pending
      return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200"><Clock size={12}/> Assigned</span>;
  };

  if (quotes.length === 0) {
      return (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Briefcase className="mx-auto text-slate-300 mb-3" size={48} />
              <h3 className="text-lg font-bold text-slate-900">No Assignments Found</h3>
              <p className="text-slate-500">You currently have no quotes matching this criteria.</p>
          </div>
      );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-xs tracking-wider">
            <tr>
              <th className="px-6 py-4 font-semibold">Quote Ref</th>
              <th className="px-6 py-4 font-semibold">Destination</th>
              <th className="px-6 py-4 font-semibold">Travel Date</th>
              <th className="px-6 py-4 font-semibold">Services</th>
              <th className="px-6 py-4 font-semibold">Operational Price</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {quotes.map((quote) => (
              <tr 
                key={quote.id} 
                className="hover:bg-slate-50 transition cursor-pointer"
                onClick={() => navigate(`/quote/${quote.id}`)}
              >
                <td className="px-6 py-4 font-mono font-medium text-brand-600 whitespace-nowrap">
                  {quote.uniqueRefNo}
                </td>
                <td className="px-6 py-4 text-slate-900">
                  <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-slate-400 shrink-0" />
                      {quote.destination}
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-slate-400 shrink-0" />
                      {quote.travelDate}
                  </div>
                </td>
                <td className="px-6 py-4">
                    <div className="flex flex-wrap max-w-[200px]">
                        {getServiceBadges(quote)}
                    </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    {getPriceDisplay(quote)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(quote)}
                </td>
                <td className="px-6 py-4 text-right whitespace-nowrap">
                    <div className="flex justify-end gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                        <OperatorQuoteActions quote={quote} onRefresh={onRefresh} />
                        <button 
                            onClick={() => navigate(`/quote/${quote.id}`)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg border border-slate-200 hover:border-brand-100 transition"
                        >
                            <Eye size={14} /> View
                        </button>
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
