
import React from 'react';
import { ItineraryItem } from '../types';
import { 
  CheckCircle, Car, Hotel, Camera, Calendar, 
  MapPin, Utensils, Flag, Clock, Users, Info, CheckSquare
} from 'lucide-react';

interface Props {
  itinerary: ItineraryItem[];
  startDate?: string;
}

export const ItineraryView: React.FC<Props> = ({ itinerary, startDate }) => {
  if (!itinerary || itinerary.length === 0) return (
    <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
      <Calendar size={48} className="mx-auto text-slate-300 mb-3" />
      <p className="text-slate-500 font-medium">No detailed itinerary available yet.</p>
    </div>
  );

  const getDateForDay = (dayNum: number) => {
      if (!startDate) return null;
      const date = new Date(startDate);
      date.setDate(date.getDate() + (dayNum - 1));
      return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', weekday: 'long' }); // e.g. Fri, Oct 12
  };

  const getTransferModeLabel = (mode: string) => {
      if (mode === 'SIC') return 'Shared Transfer';
      if (mode === 'PVT') return 'Private Transfer';
      return 'Ticket Only';
  };

  return (
    <div className="space-y-8 relative pb-4">
      {/* Connector Line (Desktop Only) */}
      <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-gradient-to-b from-brand-200 via-slate-200 to-transparent z-0 hidden md:block"></div>

      {itinerary.map((item, index) => {
        const dateStr = getDateForDay(item.day);
        const dayColor = index % 2 === 0 ? 'bg-brand-600' : 'bg-purple-600'; // Alternating colors for visual rhythm

        return (
            <div key={index} className="relative z-10 md:pl-24 group">
                
                {/* Desktop Day Marker */}
                <div className="absolute left-0 top-0 hidden md:flex w-16 h-16 rounded-2xl bg-white border-2 border-slate-100 shadow-md flex-col items-center justify-center z-10 transition-transform group-hover:scale-110 group-hover:border-brand-300">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Day</span>
                    <span className={`text-2xl font-black ${index % 2 === 0 ? 'text-brand-600' : 'text-purple-600'}`}>{item.day}</span>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
                    
                    {/* Header Strip */}
                    <div className="bg-slate-50/80 p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            {/* Mobile Day Marker */}
                            <div className={`md:hidden px-3 py-1 rounded-lg text-white font-bold text-sm ${dayColor}`}>
                                Day {item.day}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 leading-tight">{item.title}</h3>
                                {dateStr && (
                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mt-1">
                                        <Calendar size={12} className="text-brand-500" />
                                        {dateStr}
                                    </div>
                                )}
                            </div>
                        </div>
                        {item.cityId && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full shadow-sm text-xs font-semibold text-slate-700">
                                <MapPin size={12} className="text-red-500" />
                                <span>City Stay</span>
                            </div>
                        )}
                    </div>

                    <div className="p-6">
                        {/* Day Description */}
                        {item.description && (
                            <div className="mb-6 text-slate-600 text-sm leading-relaxed border-l-2 border-slate-200 pl-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h3]:font-bold [&_h3]:text-slate-800 [&_h3]:mt-2">
                                <div dangerouslySetInnerHTML={{ __html: item.description }} />
                            </div>
                        )}

                        {/* Services List */}
                        {item.services && item.services.length > 0 && (
                            <div className="space-y-3 mb-6">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Clock size={10} /> Planned Services
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {item.services.map((svc, sIdx) => (
                                        <div key={sIdx} className="flex items-start p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-brand-200 hover:shadow-sm transition-all group/svc">
                                            {/* Service Icon or Image */}
                                            {svc.meta?.imageUrl ? (
                                                <div className="w-16 h-16 rounded-lg mr-3 shadow-sm shrink-0 overflow-hidden border border-slate-200">
                                                     <img src={svc.meta.imageUrl} alt={svc.name} className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className={`p-2.5 rounded-xl mr-3 shadow-sm shrink-0 flex items-center justify-center ${
                                                    svc.type === 'HOTEL' ? 'bg-white text-indigo-600' :
                                                    svc.type === 'ACTIVITY' ? 'bg-white text-rose-500' :
                                                    svc.type === 'TRANSFER' ? 'bg-white text-sky-600' : 'bg-white text-slate-600'
                                                }`}>
                                                    {svc.type === 'HOTEL' && <Hotel size={18} strokeWidth={2.5} />}
                                                    {svc.type === 'ACTIVITY' && <Camera size={18} strokeWidth={2.5} />}
                                                    {svc.type === 'TRANSFER' && <Car size={18} strokeWidth={2.5} />}
                                                    {svc.type === 'OTHER' && <Flag size={18} strokeWidth={2.5} />}
                                                </div>
                                            )}
                                            
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start gap-2">
                                                    <p className="font-bold text-slate-800 text-sm leading-tight">{svc.name}</p>
                                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-500 uppercase tracking-wide shrink-0">{svc.type}</span>
                                                </div>
                                                
                                                {/* Service Description (Rich Text Support) */}
                                                {svc.meta?.description && (
                                                    <div 
                                                      className="text-xs text-slate-500 mt-1 line-clamp-3 leading-relaxed [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
                                                      dangerouslySetInnerHTML={{ __html: svc.meta.description }}
                                                    />
                                                )}

                                                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                                                    {svc.meta?.roomType && (
                                                        <span className="text-xs text-slate-500 flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-slate-100">
                                                            <Hotel size={10} /> {svc.meta.roomType}
                                                        </span>
                                                    )}
                                                    {svc.meta?.mealPlan && (
                                                        <span className="text-xs text-slate-500 flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-slate-100">
                                                            <Utensils size={10} /> {svc.meta.mealPlan}
                                                        </span>
                                                    )}
                                                    
                                                    {/* Pax Count Badges */}
                                                    {svc.meta?.paxDetails && (
                                                        <span className="text-xs text-slate-500 flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-slate-100" title="Passengers">
                                                            <Users size={10} /> {svc.meta.paxDetails.adult}A {svc.meta.paxDetails.child > 0 ? `+ ${svc.meta.paxDetails.child}C` : ''}
                                                        </span>
                                                    )}

                                                    {/* HIGHLIGHTED TRANSFER TYPE BOX */}
                                                    {svc.meta?.transferMode && (
                                                        <div className="w-full mt-1.5">
                                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
                                                                <CheckSquare size={12} className="text-emerald-600" /> 
                                                                [ {getTransferModeLabel(svc.meta.transferMode)} ]
                                                            </span>
                                                        </div>
                                                    )}
                                                    
                                                    {/* TRANSFER VEHICLE HIGHLIGHT */}
                                                    {svc.type === 'TRANSFER' && svc.meta?.vehicle && (
                                                         <div className="w-full mt-1.5">
                                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
                                                                <CheckSquare size={12} className="text-emerald-600" /> 
                                                                [ Private Transfer - {svc.meta.vehicle} ]
                                                            </span>
                                                        </div>
                                                    )}

                                                </div>

                                                {/* Internal Note */}
                                                {svc.meta?.notes && (
                                                    <div className="mt-1.5 flex items-start gap-1.5 text-[10px] text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-100">
                                                        <Info size={10} className="mt-0.5 shrink-0"/> {svc.meta.notes}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Inclusions */}
                        {item.inclusions && item.inclusions.length > 0 && (
                            <div className="pt-4 border-t border-slate-100">
                                <div className="flex flex-wrap gap-2">
                                    {item.inclusions.map((inc, i) => (
                                        <div key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100 shadow-sm transition hover:bg-emerald-100">
                                            <CheckCircle size={12} strokeWidth={2.5} />
                                            {inc}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
      })}
    </div>
  );
};
