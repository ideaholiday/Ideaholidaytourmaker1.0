
import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { agentService } from '../../services/agentService';
import { useAuth } from '../../context/AuthContext';
import { Visa } from '../../types';
import { FileText, Search, Clock, Calendar, DollarSign, CheckCircle, Info, FileCheck, ArrowRight, Loader2, X, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AgentVisa: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [visas, setVisas] = useState<Visa[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Application Modal State
  const [selectedVisa, setSelectedVisa] = useState<Visa | null>(null);
  const [form, setForm] = useState({
      travelDate: '',
      pax: 1,
      guestName: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadVisas = async () => {
      setLoading(true);
      const data = await adminService.getVisas();
      // Only show active visas
      setVisas(data.filter(v => v.isActive));
      setLoading(false);
    };
    loadVisas();
  }, []);

  const handleApplyClick = (visa: Visa) => {
      setSelectedVisa(visa);
      // Reset Form with tomorrow as default date
      const tmrw = new Date();
      tmrw.setDate(tmrw.getDate() + 1);
      setForm({
          travelDate: tmrw.toISOString().split('T')[0],
          pax: 1,
          guestName: ''
      });
  };

  const submitApplication = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user || !selectedVisa || !form.guestName) return;

      setIsSubmitting(true);
      try {
          const booking = await agentService.createVisaRequest(
              user, 
              selectedVisa, 
              form.travelDate, 
              Number(form.pax), 
              form.guestName
          );
          
          setSelectedVisa(null);
          // Optional: Navigate to booking or show success
          if(confirm(`Visa Request Sent! Reference: ${booking.uniqueRefNo}\n\nView request details now?`)) {
              navigate(`/booking/${booking.id}`);
          }
      } catch (error: any) {
          alert("Failed to submit request: " + error.message);
      } finally {
          setIsSubmitting(false);
      }
  };

  const filteredVisas = visas.filter(v => 
    v.country.toLowerCase().includes(search.toLowerCase()) || 
    v.visaType.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="text-brand-600" /> Visa Requirements
        </h1>
        <p className="text-slate-500">Check requirements or submit direct applications.</p>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6">
          <div className="relative max-w-lg">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input 
                  type="text" 
                  placeholder="Search by Country or Visa Type (e.g. Dubai, Tourist)..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              />
          </div>
      </div>

      {loading ? (
          <div className="text-center py-12 text-slate-400">Loading Visa Information...</div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVisas.map(visa => (
                  <div key={visa.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col h-full">
                      <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                          <div className="flex justify-between items-start">
                              <div>
                                  <h3 className="font-bold text-lg text-slate-900">{visa.country}</h3>
                                  <p className="text-sm text-brand-600 font-medium">{visa.visaType}</p>
                              </div>
                              <div className="text-right">
                                   <span className="block text-xs text-slate-400 uppercase font-bold">Cost</span>
                                   <span className="font-mono font-bold text-slate-800 text-lg">₹ {visa.cost.toLocaleString()}</span>
                              </div>
                          </div>
                      </div>
                      
                      <div className="p-5 flex-1 space-y-4">
                          <div className="flex items-center gap-4 text-sm text-slate-600">
                              <div className="flex items-center gap-1.5" title="Processing Time">
                                  <Clock size={16} className="text-slate-400" />
                                  <span>{visa.processingTime}</span>
                              </div>
                              <div className="flex items-center gap-1.5" title="Validity">
                                  <Calendar size={16} className="text-slate-400" />
                                  <span>{visa.validity || 'Standard'}</span>
                              </div>
                              <div className="flex items-center gap-1.5" title="Entry Type">
                                  <Info size={16} className="text-slate-400" />
                                  <span>{visa.entryType || 'Single'}</span>
                              </div>
                          </div>

                          {visa.description && (
                              <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 italic">
                                  "{visa.description}"
                              </p>
                          )}

                          <div>
                              <p className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                                  <FileCheck size={12} /> Documents Required
                              </p>
                              <ul className="text-sm text-slate-700 space-y-1">
                                  {visa.documentsRequired.map((doc, idx) => (
                                      <li key={idx} className="flex items-start gap-2">
                                          <CheckCircle size={14} className="text-green-500 shrink-0 mt-0.5" />
                                          <span className="leading-tight">{doc}</span>
                                      </li>
                                  ))}
                                  {visa.documentsRequired.length === 0 && (
                                      <li className="text-slate-400 italic text-xs">No specific documents listed.</li>
                                  )}
                              </ul>
                          </div>
                      </div>
                      
                      <div className="p-4 border-t border-slate-100 bg-slate-50">
                          <button 
                            onClick={() => handleApplyClick(visa)}
                            className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold text-sm transition flex items-center justify-center gap-2 shadow-sm"
                          >
                              Apply Now <ArrowRight size={16} />
                          </button>
                      </div>
                  </div>
              ))}
              {filteredVisas.length === 0 && (
                  <div className="col-span-3 text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">
                      <Search size={48} className="mx-auto mb-3 opacity-50" />
                      <p>No visa information found matching your search.</p>
                  </div>
              )}
          </div>
      )}

      {/* APPLICATION MODAL */}
      {selectedVisa && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95">
                  <div className="flex justify-between items-start mb-6">
                      <div>
                          <h3 className="text-lg font-bold text-slate-900">Apply for Visa</h3>
                          <p className="text-sm text-slate-500">{selectedVisa.country} - {selectedVisa.visaType}</p>
                      </div>
                      <button onClick={() => setSelectedVisa(null)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-1.5 rounded-full"><X size={20}/></button>
                  </div>

                  <form onSubmit={submitApplication} className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Lead Traveler Name</label>
                          <input 
                              type="text" 
                              required
                              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                              placeholder="As per passport"
                              value={form.guestName}
                              onChange={e => setForm({...form, guestName: e.target.value})}
                          />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Travel Date</label>
                              <input 
                                  type="date" 
                                  required
                                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                  value={form.travelDate}
                                  onChange={e => setForm({...form, travelDate: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Total Pax</label>
                              <input 
                                  type="number" 
                                  min="1"
                                  max="50"
                                  required
                                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                  value={form.pax}
                                  onChange={e => setForm({...form, pax: Number(e.target.value)})}
                              />
                          </div>
                      </div>

                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex gap-2 items-start text-xs text-blue-800">
                          <Info size={16} className="shrink-0 mt-0.5" />
                          <p>Submitting this request will alert our operations team. You will receive a booking reference (VISA-XXXX) to track status.</p>
                      </div>

                      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                          <button 
                            type="button" 
                            onClick={() => setSelectedVisa(null)}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                          >
                              Cancel
                          </button>
                          <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-brand-700 transition flex items-center gap-2 disabled:opacity-70"
                          >
                              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                              Submit Request
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
