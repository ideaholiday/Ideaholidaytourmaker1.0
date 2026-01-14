
import React, { useState, useEffect } from 'react';
import { AgentFavoriteTemplate, ItineraryTemplate } from '../types';
import { favoriteTemplateService } from '../services/favoriteTemplateService';
import { adminService } from '../services/adminService';
import { Sparkles, Calendar, ArrowRight, Star, Trash2, Layout, Tag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Props {
  destination: string;
  nights: number;
  onSelectSystem: (template: ItineraryTemplate) => void;
  onSelectFavorite: (template: AgentFavoriteTemplate) => void;
}

export const TemplateSelector: React.FC<Props> = ({ destination, nights, onSelectSystem, onSelectFavorite }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'SYSTEM' | 'FAVORITE'>('SYSTEM');
  const [favorites, setFavorites] = useState<AgentFavoriteTemplate[]>([]);
  const [systemTemplates, setSystemTemplates] = useState<ItineraryTemplate[]>([]);

  useEffect(() => {
    // Load System Templates
    const allSystem = adminService.getSystemTemplates();
    const filteredSystem = allSystem.filter(t => 
      destination.includes(t.destinationKeyword) && t.nights === nights
    );
    setSystemTemplates(filteredSystem);

    // Load Favorites
    if (user && activeTab === 'FAVORITE') {
      const userFavs = favoriteTemplateService.getTemplates(user.id);
      const relevantFavs = userFavs.filter(t => 
        (destination.toLowerCase().includes(t.destinationName.toLowerCase()) || t.destinationName.toLowerCase().includes(destination.toLowerCase())) 
        && t.nights === nights
      );
      setFavorites(relevantFavs);
    }
  }, [user, activeTab, destination, nights]);

  const handleDeleteFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if(window.confirm('Remove this template from favorites?')) {
        favoriteTemplateService.deleteTemplate(id);
        if (user) {
            const userFavs = favoriteTemplateService.getTemplates(user.id);
            const relevantFavs = userFavs.filter(t => 
                destination.toLowerCase().includes(t.destinationName.toLowerCase()) && t.nights === nights
            );
            setFavorites(relevantFavs);
        }
    }
  };

  if (systemTemplates.length === 0 && favorites.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-purple-600" />
            <h3 className="font-bold text-slate-800">Quick Start Templates</h3>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-lg">
             <button 
                onClick={() => setActiveTab('SYSTEM')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition ${activeTab === 'SYSTEM' ? 'bg-white shadow text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
             >
                <Layout size={14} /> System
             </button>
             <button 
                onClick={() => setActiveTab('FAVORITE')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition ${activeTab === 'FAVORITE' ? 'bg-white shadow text-amber-600' : 'text-slate-500 hover:text-slate-700'}`}
             >
                <Star size={14} /> My Favorites
             </button>
          </div>
      </div>
      
      {activeTab === 'SYSTEM' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systemTemplates.map(t => (
                <button 
                    key={t.id}
                    onClick={() => onSelectSystem(t)}
                    className="group relative bg-white p-4 rounded-xl border-2 border-slate-100 hover:border-purple-500 hover:shadow-md transition text-left h-full flex flex-col"
                >
                    <div className="flex justify-between items-start mb-2 w-full">
                        <span className="font-bold text-slate-800 group-hover:text-purple-700 line-clamp-1">{t.name}</span>
                        <div className="bg-purple-50 text-purple-700 p-1.5 rounded-lg shrink-0 ml-2">
                            <Calendar size={16} />
                        </div>
                    </div>
                    
                    {t.tags && (
                        <div className="flex flex-wrap gap-1 mb-2">
                            {t.tags.map(tag => (
                                <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    <p className="text-xs text-slate-500 mb-3 line-clamp-2 flex-grow">
                        {t.days.map(d => d.title).join(' • ')}
                    </p>
                    <div className="flex items-center gap-1 text-xs font-bold text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity mt-auto">
                        Apply Template <ArrowRight size={12} />
                    </div>
                </button>
            ))}
            {systemTemplates.length === 0 && <p className="text-slate-400 italic text-sm">No system templates for {nights} nights.</p>}
        </div>
      )}

      {activeTab === 'FAVORITE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {favorites.map(t => (
                <button 
                    key={t.id}
                    onClick={() => onSelectFavorite(t)}
                    className="group relative bg-white p-4 rounded-xl border-2 border-slate-100 hover:border-amber-500 hover:shadow-md transition text-left h-full flex flex-col"
                >
                    <div className="flex justify-between items-start mb-2 w-full">
                        <span className="font-bold text-slate-800 group-hover:text-amber-700 line-clamp-1">{t.templateName}</span>
                        <div className="bg-amber-50 text-amber-700 p-1.5 rounded-lg flex items-center gap-1 shrink-0 ml-2">
                            <Star size={12} fill="currentColor" />
                            <span className="text-xs font-bold">{t.nights}N</span>
                        </div>
                    </div>
                    {t.note && <p className="text-xs text-slate-500 mb-2 italic line-clamp-1">"{t.note}"</p>}
                    <p className="text-xs text-slate-400 mb-3