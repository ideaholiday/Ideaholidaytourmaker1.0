import React from 'react';
import { ItineraryItem } from '../types';
import { MapPin, CheckCircle, Car, Hotel, Camera } from 'lucide-react';

interface Props {
  itinerary: ItineraryItem[];
}

export const ItineraryView: React.FC<Props> = ({ itinerary }) => {
  if (!itinerary || itinerary.length === 0) return <p className="text-slate-500 italic p-4">No detailed itinerary available.</p>;

  return (
    <div className="space-y-6">
      {itinerary.map((item, index) => (
        <div key={index} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm">
              {item.day}
            </div>
            {index < itinerary.length - 1 && <div className="w-0.5 h-full bg-slate-200 my-1"></div>}
          </div>
          
          <div className="flex-1 pb-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
            <p className="text-slate-600 text-sm leading-relaxed mb-3">{item.description}</p>
            
            {/* Display Services if present */}
            {item.services && item.services.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                    {item.services.map((svc, sIdx) => (
                        <div key={sIdx} className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-50 border border-slate-200 text-xs text-slate-700">
                             {svc.type === 'HOTEL' && <Hotel size={12} className="text-indigo-500" />}
                             {svc.type === 'ACTIVITY' && <Camera size={12} className="text-pink-500" />}
                             {svc.type === 'TRANSFER' && <Car size={12} className="text-blue-500" />}
                             <span className="font-medium">{svc.name}</span>
                        </div>
                    ))}
                </div>
            )}

            {item.inclusions && item.inclusions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {item.inclusions.map((inc, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-50 text-green-700 text-xs font-medium border border-green-100">
                    <CheckCircle size={10} /> {inc}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};