
import React, { useState } from 'react';
import { Quote, Traveler } from '../../types';
import { X, User, CheckCircle, ShieldCheck } from 'lucide-react';
import { useClientBranding } from '../../hooks/useClientBranding';

interface Props {
  quote: Quote;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (travelers: Traveler[]) => void;
}

export const ClientBookingModal: React.FC<Props> = ({ quote, isOpen, onClose, onSubmit }) => {
  const { styles } = useClientBranding();
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
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <div>
                      <h2 className="text-xl font-bold text-slate-900">Finalize Your Trip</h2>
                      <p className="text-sm text-slate-500">Please enter traveler details for {quote.paxCount} passengers.</p>
                  </div>
                  <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full transition"><X size={24} /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-6 flex gap-3">
                      <ShieldCheck className="text-blue-600 shrink-0" size={20} />
                      <div className="text-sm text-blue-800">
                          <strong>Secure Booking:</strong> Your data is transmitted securely. Submitting this form will send a booking request to your agent for final confirmation.
                      </div>
                  </div>

                  <form id="publicBookingForm" onSubmit={handleSubmit} className="space-y-6">
                      {travelers.map((t, idx) => (
                          <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                              <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                                  <div className="bg-slate-100 p-1.5 rounded-full"><User size={14} className="text-slate-500"/></div>
                                  Passenger {idx + 1}
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Title</label>
                                      <select 
                                          className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-brand-500"
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
                                          className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                          placeholder="As per passport"
                                          value={t.firstName}
                                          onChange={e => handleChange(idx, 'firstName', e.target.value)}
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Last Name</label>
                                      <input 
                                          required 
                                          type="text" 
                                          className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                          placeholder="Surname"
                                          value={t.lastName}
                                          onChange={e => handleChange(idx, 'lastName', e.target.value)}
                                      />
                                  </div>
                              </div>
                          </div>
                      ))}
                  </form>
              </div>

              <div className="p-6 border-t border-slate-200 bg-white flex justify-end gap-3 items-center">
                  <button type="button" onClick={onClose} className="px-6 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition">
                      Cancel
                  </button>
                  <button 
                    type="submit" 
                    form="publicBookingForm" 
                    className="px-8 py-3 text-white rounded-xl font-bold shadow-lg flex items-center gap-2 transition hover:opacity-90 transform hover:-translate-y-0.5"
                    style={styles.button}
                  >
                      <CheckCircle size={18} /> Confirm Request
                  </button>
              </div>
          </div>
      </div>
  );
};
