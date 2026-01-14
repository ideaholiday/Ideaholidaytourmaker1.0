
import React, { useState } from 'react';
import { Quote, Traveler } from '../../types';
import { X, User, CheckCircle } from 'lucide-react';

interface Props {
  quote: Quote;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (travelers: Traveler[]) => void;
}

export const BookingWizard: React.FC<Props> = ({ quote, isOpen, onClose, onSubmit }) => {
  const [travelers, setTravelers] = useState<Traveler[]>(() => {
    const initial = [];
    for (let i = 0; i < quote.paxCount; i++) {
        initial.push({ title: 'Mr', firstName: '', lastName: '', type: 'ADULT' as const });
    }
    return initial;
  });

  if (!isOpen) return null;

  const handleChange = (index: number, field: keyof Traveler, value: string) => {
      const updated = [...travelers];
      updated[index] = { ...updated[index], [field]: value };
      setTravelers(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit(travelers);
  };

  return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                  <div>
                      <h2 className="text-xl font-bold text-slate-900">Confirm Booking</h2>
                      <p className="text-sm text-slate-500">Enter traveler details for {quote.uniqueRefNo}</p>
                  </div>
                  <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                  <form id="bookingForm" onSubmit={handleSubmit} className="space-y-6">
                      {travelers.map((t, idx) => (
                          <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                              <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                  <div className="bg-white p-1 rounded-full border border-slate-200"><User size={14}/></div>
                                  Traveler {idx + 1}
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Title</label>
                                      <select 
                                          className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                                          value={t.title}
                                          onChange={e => handleChange(idx, 'title', e.target.value)}
                                      >
                                          <option>Mr</option>
                                          <option>Ms</option>
                                          <option>Mrs</option>
                                          <option>Mstr</option>
                                          <option>Miss</option>
                                      </select>
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">First Name</label>
                                      <input 
                                          required 
                                          type="text" 
                                          className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                                          value={t.firstName}
                                          onChange={e => handleChange(idx, 'firstName', e.target.value)}
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Last Name</label>
                                      <input 
                                          required 
                                          type="text" 
                                          className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                                          value={t.lastName}
                                          onChange={e => handleChange(idx, 'lastName', e.target.value)}
                                      />
                                  </div>
                                  <div className="md:col-span-3">
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Passport No (Optional)</label>
                                      <input 
                                          type="text" 
                                          className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                                          placeholder="Enter passport number if available"
                                          value={t.passportNo || ''}
                                          onChange={e => handleChange(idx, 'passportNo', e.target.value)}
                                      />
                                  </div>
                              </div>
                          </div>
                      ))}
                  </form>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end gap-3">
                  <button type="button" onClick={onClose} className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition">
                      Cancel
                  </button>
                  <button type="submit" form="bookingForm" className="px-6 py-2.5 bg-brand-600 text-white hover:bg-brand-700 rounded-lg font-bold shadow-lg flex items-center gap-2 transition">
                      <CheckCircle size={18} /> Confirm Booking
                  </button>
              </div>
          </div>
      </div>
  );
};
