
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { agentService } from '../../services/agentService';
import { useAuth } from '../../context/AuthContext';
import { ItineraryTemplate, Quote } from '../../types';
import { Layers, Calendar, Tag, ArrowRight, Loader2, MapPin, Layout } from 'lucide-react';

export const AgentTemplates: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<ItineraryTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
        setIsLoading(true);
        const data = await adminService.getSystemTemplates();
        setTemplates(data);
        setIsLoading(false);
    };
    load();
  }, []);

  const handleUseTemplate = async (tpl: ItineraryTemplate) => {
      if (!user) return;
      setProcessingId(tpl.id);

      try {
          // 1. Create Quote Shell
          const newQuote = await agentService.createQuote(
              user,
              tpl.destinationKeyword, // Approx destination
              new Date().toISOString().split('T')[0], // Today
              2,
              'Valued Client'
          );

          // 2. Map Template Days to Quote Itinerary
          const itinerary = tpl.days.map(d => ({
              day: d.day,
              title: d.title,
              description: d.description,
              inclusions: ['Breakfast'], // Default
              services: [] // Services would require mapping logic or just placeholders
          }));

          // 3. Update Quote
          const updatedQuote: Quote = {
              ...newQuote,
              serviceDetails: `Based on template: ${tpl.name}`,
              itinerary: itinerary,
              status: 'DRAFT'
          };

          await agentService.updateQuote(updatedQuote);

          // 4. Redirect to Edit (so they can fill in services)
          navigate(`/quote/${newQuote.id}`);

      } catch (error) {
          console.error("Template error", error);
          alert("Failed to apply template.");
      } finally {
          setProcessingId(null);
      }
  };

  const filteredTemplates = templates.filter(t => 
      t.name.toLowerCase().includes(filter.toLowerCase()) || 
      t.destinationKeyword.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Layout className="text-brand-600" /> Itinerary Templates
        </h1>
        <p className="text-slate-500">Quick start your proposals with pre-built best sellers.</p>
      </div>

      <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <input 
              type="text" 
              placeholder="Search templates by name or destination..."
              className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand-500 outline-none"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
          />
      </div>

      {isLoading ? (
          <div className="flex justify-center py-20 text-slate-400">
              <Loader2 className="animate-spin mr-2" /> Loading templates...
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map(tpl => (
                  <div key={tpl.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col hover:border-brand-300 transition group">
                      <div className="flex justify-between items-start mb-3">
                          <div className="bg-brand-50 text-brand-700 p-2 rounded-lg">
                              <MapPin size={20} />
                          </div>
                          <div className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                              <Calendar size={12} /> {tpl.nights} Nights
                          </div>
                      </div>
                      
                      <h3 className="font-bold text-lg text-slate-900 mb-1">{tpl.name}</h3>
                      <p className="text-xs text-slate-500 font-medium mb-3 uppercase tracking-wider">{tpl.destinationKeyword}</p>
                      
                      <div className="flex flex-wrap gap-1 mb-6">
                          {tpl.tags?.map(tag => (
                              <span key={tag} className="text-[10px] px-2 py-0.5 bg-slate-50 border border-slate-100 rounded text-slate-500">
                                  {tag}
                              </span>
                          ))}
                      </div>

                      <div className="mt-auto pt-4 border-t border-slate-100">
                          <button 
                              onClick={() => handleUseTemplate(tpl)}
                              disabled={!!processingId}
                              className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 transition flex items-center justify-center gap-2 disabled:opacity-70"
                          >
                              {processingId === tpl.id ? <Loader2 size={16} className="animate-spin"/> : <ArrowRight size={16} />}
                              Use Template
                          </button>
                      </div>
                  </div>
              ))}
              {filteredTemplates.length === 0 && (
                  <div className="col-span-3 text-center py-12 text-slate-400 italic">
                      No templates found matching search.
                  </div>
              )}
          </div>
      )}
    </div>
  );
};
