
import React, { useState } from 'react';
import { ItineraryBuilderProvider, useBuilder } from '../../components/builder/ItineraryBuilderContext';
import { InventoryModal } from '../../components/builder/InventoryModal';
import { Plus, Trash2, MapPin, Loader2, Save, Calendar, Hotel, Camera, Car, Info } from 'lucide-react';
import { adminService } from '../../services/adminService'; 

const BuilderContent: React.FC = () => {
  const { state, initDestination, addService, removeService, saveItinerary } = useBuilder();
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean, dayId: string, type: any, destId: string } | null>(null);
  
  // Initial Setup State
  const [setup, setSetup] = useState({ destId: '', days: 3 });
  const destinations = adminService.getDestinations();

  const handleStart = () => {
      if (setup.destId) initDestination(setup.days, setup.destId);
  };

  const handleOpenModal = (dayId: string, type: 'HOTEL' | 'ACTIVITY' | 'TRANSFER', destId: string) => {
      setModalConfig({ isOpen: true, dayId, type, destId });
  };

  if (state.days.length === 0) {
      return (
          <div className="max-w-md mx-auto mt-20 bg-white p-8 rounded-xl shadow-lg border border-slate-200">
              <h2 className="text-2xl font-bold mb-6 text-center">Start New Itinerary</h2>
              <div className="space-y-4">
                  <div>
                      <label className="block text-sm font-medium mb-1">Destination</label>
                      <select 
                        className="w-full border p-2 rounded-lg"
                        value={setup.destId}
                        onChange={e => setSetup({...setup, destId: e.target.value})}
                      >
                          <option value="">Select City...</option>
                          {destinations.map(d => <option key={d.id} value={d.id}>{d.city}</option>)}
                      </select>
                  </div>
                  <div>
                      <label className="block text-sm font-medium mb-1">Duration (Nights)</label>
                      <input 
                        type="number" 
                        className="w-full border p-2 rounded-lg" 
                        value={setup.days}
                        onChange={e => setSetup({...setup, days: Number(e.target.value)})}
                        min={1} 
                      />
                  </div>
                  <button 
                    onClick={handleStart}
                    disabled={!setup.destId}
                    className="w-full bg-brand-600 text-white py-3 rounded-lg font-bold hover:bg-brand-700 disabled:opacity-50"
                  >
                      Create Itinerary
                  </button>
              </div>
          </div>
      );
  }

  return (
      <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8 sticky top-20 z-10 bg-slate-50 py-4 border-b border-slate-200">
              <div>
                  <h1 className="text-2xl font-bold text-slate-900">Itinerary Builder</h1>
                  <p className="text-slate-500 text-sm">Drafting for {state.days.length} Days</p>
              </div>
              <div className="flex items-center gap-6">
                  {/* NET COST */}
                  <div className="text-right border-r border-slate-200 pr-6">
                      <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center justify-end gap-1">
                          Net B2B Cost <Info size={10} className="text-slate-300"/>
                      </p>
                      <span className="text-lg font-mono font-medium text-slate-600">
                          {state.currency} {state.netCost.toLocaleString()}
                      </span>
                  </div>

                  {/* SELLING PRICE */}
                  <div className="text-right">
                      <p className="text-xs font-bold text-brand-600 uppercase">Client Price</p>
                      <div className="flex items-center gap-2">
                          {state.isCalculating && <Loader2 size={16} className="animate-spin text-brand-600"/>}
                          <span className="text-2xl font-mono font-bold text-slate-900">
                              {state.currency} {state.totalPrice.toLocaleString()}
                          </span>
                      </div>
                  </div>

                  <button 
                    onClick={() => {
                        const destId = state.days[0]?.destination_id || setup.destId;
                        const dest = destinations.find(d => d.id === destId);
                        const destName = dest ? `${dest.city}, ${dest.country}` : 'Unknown Destination';
                        saveItinerary("My New Trip", destName, new Date().toISOString().split('T')[0]);
                    }} 
                    className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 flex items-center gap-2 shadow-lg"
                  >
                      <Save size={18}/> Save
                  </button>
              </div>
          </div>

          <div className="space-y-6">
              {state.days.map((day, idx) => (
                  <div key={day.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex justify-between items-center">
                          <h3 className="font-bold text-slate-700 flex items-center gap-2">
                              <span className="bg-white border border-slate-200 px-2 py-1 rounded text-xs">Day {day.day_number}</span>
                              {day.title}
                          </h3>
                          <div className="flex gap-2">
                              <button onClick={() => handleOpenModal(day.id, 'HOTEL', day.destination_id)} className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded font-bold hover:bg-indigo-100 transition">+ Hotel</button>
                              <button onClick={() => handleOpenModal(day.id, 'ACTIVITY', day.destination_id)} className="text-xs bg-pink-50 text-pink-700 px-3 py-1.5 rounded font-bold hover:bg-pink-100 transition">+ Activity</button>
                              <button onClick={() => handleOpenModal(day.id, 'TRANSFER', day.destination_id)} className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded font-bold hover:bg-blue-100 transition">+ Transfer</button>
                          </div>
                      </div>
                      
                      <div className="p-6 space-y-3">
                          {day.services.length === 0 && (
                              <div className="text-center text-slate-400 text-sm italic py-4 border-2 border-dashed border-slate-100 rounded-lg">
                                  No services added for this day.
                              </div>
                          )}
                          {day.services.map(svc => (
                              <div key={svc.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:border-slate-300 transition bg-white group">
                                  <div className="flex items-center gap-3">
                                      <div className={`p-2 rounded-lg ${svc.type === 'HOTEL' ? 'bg-indigo-100 text-indigo-600' : svc.type === 'ACTIVITY' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>
                                          {svc.type === 'HOTEL' && <Hotel size={16}/>}
                                          {svc.type === 'ACTIVITY' && <Camera size={16}/>}
                                          {svc.type === 'TRANSFER' && <Car size={16}/>}
                                      </div>
                                      <div>
                                          <p className="font-bold text-slate-800 text-sm">{svc.name}</p>
                                          {svc.description && <p className="text-xs text-slate-500 line-clamp-1">{svc.description}</p>}
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                      <button onClick={() => removeService(day.id, svc.id)} className="text-slate-300 hover:text-red-500 transition">
                                          <Trash2 size={16} />
                                      </button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              ))}
          </div>

          {modalConfig && (
              <InventoryModal 
                  isOpen={modalConfig.isOpen}
                  onClose={() => setModalConfig(null)}
                  onSelect={(svc) => addService(modalConfig.dayId, svc)}
                  dayId={modalConfig.dayId}
                  type={modalConfig.type}
                  destinationId={modalConfig.destId}
              />
          )}
      </div>
  );
};

export const NewItineraryBuilder: React.FC = () => (
  <ItineraryBuilderProvider>
      <BuilderContent />
  </ItineraryBuilderProvider>
);
