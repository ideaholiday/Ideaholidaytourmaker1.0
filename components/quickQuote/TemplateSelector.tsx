
import React, { useState, useEffect } from 'react';
import { QuickQuoteTemplate } from '../../types';
import { quickQuoteTemplateService } from '../../services/quickQuoteTemplateService';
import { useAuth } from '../../context/AuthContext';
import { Search, Sparkles, User, Shield, MapPin, Moon, ArrowRight, Star } from 'lucide-react';

interface Props {
  onSelect: (template: QuickQuoteTemplate) => void;
  onClose?: () => void;
}

export const TemplateSelector: React.FC<Props> = ({ onSelect, onClose }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'SYSTEM' | 'MY'>('SYSTEM');
  const [search, setSearch] = useState('');
  const [templates, setTemplates] = useState<QuickQuoteTemplate[]>([]);

  useEffect(() => {
    if (!user) return;
    if (activeTab === 'SYSTEM') {
      quickQuoteTemplateService.getSystemTemplates().then(setTemplates);
    } else {
      quickQuoteTemplateService.getAgentTemplates(user.id).then(setTemplates);
    }
  }, [activeTab, user]);

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.destination.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col h-[600px] w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles size={20} className="text-brand-600"/> Quote Templates
          </h3>
          <p className="text-sm text-slate-500">Jumpstart your proposal with pre-built packages.</p>
        </div>
        {onClose && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">Close</button>
        )}
      </div>

      {/* Toolbar */}
      <div className="p-4 border-b border-slate-100 flex gap-4 items-center">
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('SYSTEM')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${activeTab === 'SYSTEM' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Shield size={14} /> System Best Sellers
          </button>
          <button 
            onClick={() => setActiveTab('MY')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${activeTab === 'MY' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <User size={14} /> My Saved Templates
          </button>
        </div>
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search destination or template name..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
        {filteredTemplates.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <Sparkles size={48} className="mb-4 opacity-20" />
            <p>No templates found matching your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map(t => (
              <div 
                key={t.id}
                onClick={() => onSelect(t)}
                className="group bg-white p-5 rounded-xl border border-slate-200 hover:border-brand-300 hover:shadow-md transition cursor-pointer flex flex-col h-full"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="bg-brand-50 text-brand-700 p-2 rounded-lg group-hover:bg-brand-600 group-hover:text-white transition">
                    <MapPin size={20} />
                  </div>
                  {t.isSystem && (
                    <span className="bg-slate-100 text-slate-500 text-[10px] uppercase font-bold px-2 py-1 rounded">System</span>
                  )}
                </div>
                
                <h4 className="font-bold text-slate-900 mb-1 group-hover:text-brand-700 transition">{t.name}</h4>
                <p className="text-xs text-slate-500 line-clamp-2 mb-4 flex-1">{t.description}</p>
                
                <div className="flex flex-wrap gap-1 mb-4">
                  {t.tags.map(tag => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 bg-slate-50 border border-slate-100 rounded text-slate-600">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-sm">
                  <div className="flex items-center gap-3 text-slate-600">
                    <span className="flex items-center gap-1"><Moon size={12}/> {t.nights}N</span>
                    <span className="flex items-center gap-1"><Star size={12}/> {t.inputs.hotelCategory.split(' ')[0]}</span>
                  </div>
                  <div className="text-brand-600 font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition transform translate-x-2 group-hover:translate-x-0">
                    Select <ArrowRight size={14} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};