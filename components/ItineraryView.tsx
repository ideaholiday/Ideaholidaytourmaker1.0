
import React from 'react';
import { ItineraryItem } from '../types';
import { CheckCircle, Car, Hotel, Camera, Calendar, Clock, MapPin, Coffee } from 'lucide-react';

interface Props {
  itinerary: ItineraryItem[];
  startDate?: string;
}

export const ItineraryView: React.FC<Props> = ({ itinerary, startDate }) => {
  if (!itinerary || itinerary.length === 0) return <p className="text-slate-500 italic p-6 text-center bg-slate-50 rounded-xl">No detailed itinerary available.</p>;

  const getDateForDay = (dayNum: number) => {
      if (!startDate) return null;
      const date = new Date(startDate);
      date.setDate(date.getDate() + (dayNum - 1));
      return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', weekday: 'short' });
  };

  return (
    <div className="space-y-0 relative">
      {/* Timeline Line */}
      <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-slate-200 z-0"></div>

      {itinerary.map((item, index) => {
        const dateStr = getDateForDay(item.day);

        return (
            <div key={index} className="relative z-10 pl-20 pb-8 last:pb-0 group">
                {/* Day Bubble */}
                <div className="absolute left-0 top-0 w-12 h-12 rounded-2xl bg-white border-2 border-slate-100 shadow-sm flex flex-col items-center justify-center z-20 group-hover:border-brand-500 group-hover:scale-105 transition-all">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Day</span>
                    <span className="text-lg font-bold text-slate-800 leading-none">{item.day}</span>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-all duration-300">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 pb-4 border-b border-slate-100">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
                            {dateStr && (
                                <p className="text-sm font-medium text-brand-600 flex items-center gap-2 mt-1">
                                    <Calendar size={14} /> {dateStr}
                                </p>
                            )}
                        </div>
                        {item.cityId && (
                            <span className="mt-2 sm:mt-0 text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full flex items-center gap-1">
                                <MapPin size={12} /> City Stay
                            </span>
                        )}
                    </div>
                    
                    <p className="text-slate-600 text-sm leading-relaxed mb-6 whitespace-pre-wrap">
                        {item.description}
                    </p>
                    
                    {/* Services Grid */}
                    {item.services && item.services.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                            {item.services.map((svc, sIdx) => (
                                <div key={sIdx} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-brand-200 hover:shadow-sm transition-all">
                                    <div className={`p-2 rounded-lg shrink-0 ${
                                        svc.type === 'HOTEL' ? 'bg-indigo-100 text-indigo-600' :
                                        svc.type === 'ACTIVITY' ? 'bg-pink-100 text-pink-600' :
                                        svc.type === 'TRANSFER' ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-600'
                                    }`}>
                                        {svc.type === 'HOTEL' && <Hotel size={18} />}
                                        {svc.type === 'ACTIVITY' && <Camera size={18} />}
                                        {svc.type === 'TRANSFER' && <Car size={18} />}
                                        {svc.type === 'OTHER' && <CheckCircle size={18} />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm">{svc.name}</p>
                                        <div className="text-xs text-slate-500 mt-0.5 space-y-0.5">
                                            {svc.meta?.vehicle && <div>Vehicle: {svc.meta.vehicle}</div>}
                                            {svc.meta?.roomType && <div>Room: {svc.meta.roomType}</div>}
                                            {svc.meta?.mealPlan && <div className="flex items-center gap-1"><Coffee size={10}/> Meal: {svc.meta.mealPlan}</div>}
                                            {svc.meta?.type && <div>Type: {svc.meta.type}</div>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Inclusions Tags */}
                    {item.inclusions && item.inclusions.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {item.inclusions.map((inc, i) => (
                                <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                                    <CheckCircle size={12} strokeWidth={3} /> {inc}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
      })}
    </div>
  );
};
