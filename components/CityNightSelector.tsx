
import React from 'react';
import { Destination, CityVisit } from '../types';
import { Plus, X, ArrowUp, ArrowDown, MapPin, Moon } from 'lucide-react';

interface Props {
  destinations: Destination[]; // Available destinations for selected country
  selectedCities: CityVisit[];
  onChange: (cities: CityVisit[]) => void;
}

export const CityNightSelector: React.FC<Props> = ({ destinations, selectedCities, onChange }) => {
  
  const handleAddCity = (cityId: string) => {
    if (!cityId) return;
    const dest = destinations.find(d => d.id === cityId);
    if (!dest) return;

    const newVisit: CityVisit = {
      id: `visit_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      cityId: dest.id,
      cityName: dest.city,
      nights: 2, // Default 2 nights
    };

    onChange([...selectedCities, newVisit]);
  };

  const handleRemoveCity = (index: number) => {
    const updated = selectedCities.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleUpdateNights = (index: number, nights: number) => {
    if (nights < 1) return;
    const updated = [...selectedCities];
    updated[index].nights = nights;
    onChange(updated);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === selectedCities.length - 1) return;

    const updated = [...selectedCities];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [updated[index], updated[swapIndex]] = [updated[swapIndex], updated[index]];
    onChange(updated);
  };

  // Filter out already selected cities is handled by the user logic (allowing return visits A -> B -> A is valid in B2B)
  // For simplicity here, we show all options
  const availableOptions = destinations; 

  const totalNights = selectedCities.reduce((sum, c) => sum + c.nights, 0);

  return (
    <div className="space-y-4">
      {/* Selector */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-3 text-slate-400" size={18} />
          <select 
            className="w-full pl-10 border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white text-sm"
            onChange={(e) => {
              handleAddCity(e.target.value);
              e.target.value = ''; // Reset
            }}
          >
            <option value="">+ Add City to Route...</option>
            {availableOptions.map(d => (
              <option key={d.id} value={d.id}>{d.city}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected List */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
        {selectedCities.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-sm italic">
            No cities added. Select a city above to build the route.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {selectedCities.map((visit, idx) => (
              <div key={visit.id} className="p-3 flex items-center justify-between hover:bg-white transition-colors group">
                
                {/* Route Order Controls */}
                <div className="flex flex-col gap-1 mr-3">
                  <button 
                    onClick={() => handleMove(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1 rounded hover:bg-slate-200 text-slate-400 disabled:opacity-30 transition"
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button 
                    onClick={() => handleMove(idx, 'down')}
                    disabled={idx === selectedCities.length - 1}
                    className="p-1 rounded hover:bg-slate-200 text-slate-400 disabled:opacity-30 transition"
                  >
                    <ArrowDown size={12} />
                  </button>
                </div>

                {/* City Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-200 text-slate-600 text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">{idx + 1}</span>
                    <span className="font-bold text-slate-800">{visit.cityName}</span>
                  </div>
                </div>

                {/* Nights Input */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-white border border-slate-300 rounded-lg overflow-hidden">
                    <button 
                      onClick={() => handleUpdateNights(idx, visit.nights - 1)}
                      className="px-2 py-1 hover:bg-slate-100 border-r border-slate-300 text-slate-500"
                    >
                      -
                    </button>
                    <div className="w-12 text-center text-sm font-bold text-slate-800 flex items-center justify-center gap-1">
                       {visit.nights} <Moon size={10} className="text-slate-400"/>
                    </div>
                    <button 
                      onClick={() => handleUpdateNights(idx, visit.nights + 1)}
                      className="px-2 py-1 hover:bg-slate-100 border-l border-slate-300 text-slate-500"
                    >
                      +
                    </button>
                  </div>
                  
                  <button 
                    onClick={() => handleRemoveCity(idx)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                    title="Remove City"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Footer Summary */}
        {selectedCities.length > 0 && (
          <div className="bg-slate-100 p-3 border-t border-slate-200 flex justify-between items-center text-sm">
            <span className="font-medium text-slate-600">Total Duration:</span>
            <span className="font-bold text-brand-700">{totalNights} Nights / {totalNights + 1} Days</span>
          </div>
        )}
      </div>
    </div>
  );
};
