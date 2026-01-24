
import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { Visa } from '../../types';
import { FileText, Search, Clock, Calendar, DollarSign, CheckCircle, Info, FileCheck } from 'lucide-react';

export const AgentVisa: React.FC = () => {
  const [visas, setVisas] = useState<Visa[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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
        <p className="text-slate-500">Check processing times, fees, and document checklists for various destinations.</p>
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
                  <div key={visa.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col">
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
    </div>
  );
};
