
import React, { useMemo } from 'react';
import { CityVisit } from '../types';
import { citySequenceAI } from '../services/citySequenceAI';
import { Sparkles, ArrowRight, Check, Map, RefreshCw } from 'lucide-react';

interface Props {
  currentVisits: CityVisit[];
  onApply: (sorted: CityVisit[]) => void;
}

export const CitySequencePreview: React.FC<Props> = ({ currentVisits, onApply }) => {
  const { sorted, reasoning, isDifferent, score } = useMemo(() => 
    citySequenceAI.optimizeRoute(currentVisits), 
  [currentVisits]);

  if (!isDifferent || currentVisits.length < 2) return null;

  return (
    <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 border border-violet-200 rounded-xl p-4 animate-in fade-in slide-in-from-top-4 mt-4">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div className="bg-white p-1.5 rounded-lg shadow-sm text-violet-600">
            <Sparkles size={18} />
          </div>
          <div>
            <h4 className="font-bold text-violet-900 text-sm">AI Optimization Available</h4>
            <p className="text-xs text-violet-700">We found a better route for this trip (Score: {score}/100)</p>
          </div>
        </div>
        <button 
          onClick={() => onApply(sorted)}
          className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-2"
        >
          <RefreshCw size={12} /> Apply Route
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 text-sm">
        {/* Suggestion Visual */}
        <div className="flex-1 bg-white/60 rounded-lg p-3 border border-violet-100 flex items-center gap-2 overflow-x-auto">
           {sorted.map((city, idx) => (
             <React.Fragment key={city.id}>
               <div className="flex items-center gap-1 shrink-0">
                 <span className="w-5 h-5 rounded-full bg-violet-200 text-violet-700 flex items-center justify-center text-[10px] font-bold">
                   {idx + 1}
                 </span>
                 <span className="font-medium text-slate-800">{city.cityName}</span>
                 <span className="text-xs text-slate-500">({city.nights}N)</span>
               </div>
               {idx < sorted.length - 1 && <ArrowRight size={14} className="text-slate-300 shrink-0" />}
             </React.Fragment>
           ))}
        </div>

        {/* Reasoning */}
        <div className="md:w-1/3 text-xs text-violet-800 space-y-1">
           {reasoning.slice(0, 2).map((r, i) => (
             <div key={i} className="flex items-start gap-1.5">
               <Check size={12} className="mt-0.5 shrink-0" /> {r}
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};
