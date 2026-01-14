
import React, { useState, useEffect } from 'react';
import { quickQuoteTemplateService } from '../../services/quickQuoteTemplateService';
import { QuickQuoteTemplate, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Trash2, Plus, Sparkles, X, Save } from 'lucide-react';

export const QuickQuoteTemplateManager: React.FC = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<QuickQuoteTemplate[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Minimal form for adding new system templates (simplified for brevity, usually full form)
  const [formData, setFormData] = useState<Partial<QuickQuoteTemplate>>({
      name: '',
      destination: '',
      nights: 3,
      basePriceEstimate: 0
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = () => {
    setTemplates(quickQuoteTemplateService.getSystemTemplates());
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this system template?")) {
        quickQuoteTemplateService.deleteTemplate(id);
        loadTemplates();
    }
  };

  const handleSave = (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;

      const newTemplate: QuickQuoteTemplate = {
          id: `sys_tpl_${Date.now()}`,
          name: formData.name || 'New Template',
          description: 'Admin created template',
          destination: formData.destination || 'Dubai',
          nights: formData.nights || 3,
          defaultPax: { adults: 2, children: 0 },
          inputs: {
              hotelCategory: '4 Star',
              mealPlan: 'BB',
              transfersIncluded: true,
              sightseeingIntensity: 'Standard',
              rooms: 1
          },
          tags: ['System', 'Admin'],
          isSystem: true,
          createdBy: 'admin',
          createdAt: new Date().toISOString(),
          basePriceEstimate: Number(formData.basePriceEstimate) || 0
      };

      quickQuoteTemplateService.saveTemplate(newTemplate);
      setIsModalOpen(false);
      loadTemplates();
  };

  if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.STAFF)) {
      return <div>Access Denied</div>;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="text-brand-600" /> Quick Quote Templates
          </h1>
          <p className="text-slate-500">Manage global system templates for agents.</p>
        </div>
        <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 transition shadow-sm"
        >
            <Plus size={18} /> New System Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(t => (
              <div key={t.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 relative group">
                  <button 
                    onClick={() => handleDelete(t.id)}
                    className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                  >
                      <Trash2 size={18} />
                  </button>
                  
                  <div className="flex items-start justify-between mb-2">
                      <span className="bg-slate-100 text-slate-600 text-[10px] uppercase font-bold px-2 py-1 rounded">
                          {t.destination}
                      </span>
                  </div>
                  
                  <h3 className="font-bold text-slate-900 mb-1">{t.name}</h3>
                  <p className="text-xs text-slate-500 mb-4 line-clamp-2">{t.description}</p>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg">
                      <div>
                          <span className="block text-slate-400">Duration</span>
                          <span className="font-medium">{t.nights} Nights</span>
                      </div>
                      <div>
                          <span className="block text-slate-400">Est. Price</span>
                          <span className="font-medium">${t.basePriceEstimate?.toLocaleString()}</span>
                      </div>
                      <div>
                          <span className="block text-slate-400">Hotel</span>
                          <span className="font-medium">{t.inputs.hotelCategory}</span>
                      </div>
                      <div>
                          <span className="block text-slate-400">Pax</span>
                          <span className="font-medium">{t.defaultPax.adults}A + {t.defaultPax.children}C</span>
                      </div>
                  </div>
              </div>
          ))}
      </div>

      {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold">New System Template</h3>
                      <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-slate-400"/></button>
                  </div>
                  <form onSubmit={handleSave} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Template Name</label>
                          <input required type="text" className="w-full border p-2 rounded" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Destination</label>
                              <input required type="text" className="w-full border p-2 rounded" value={formData.destination} onChange={e => setFormData({...formData, destination: e.target.value})} />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Nights</label>
                              <input required type="number" className="w-full border p-2 rounded" value={formData.nights} onChange={e => setFormData({...formData, nights: Number(e.target.value)})} />
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Base Price Estimate</label>
                          <input type="number" className="w-full border p-2 rounded" value={formData.basePriceEstimate} onChange={e => setFormData({...formData, basePriceEstimate: Number(e.target.value)})} />
                      </div>
                      <div className="flex justify-end pt-4">
                          <button type="submit" className="bg-brand-600 text-white px-4 py-2 rounded font-bold flex items-center gap-2">
                              <Save size={16} /> Save Template
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
