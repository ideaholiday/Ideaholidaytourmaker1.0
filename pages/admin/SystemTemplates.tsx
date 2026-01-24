
import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { ItineraryTemplate, TemplateDay, TemplateServiceSlot } from '../../types';
import { Edit2, Trash2, Plus, X, Layers, Save, Tag, Calendar, MapPin, ArrowRight } from 'lucide-react';

export const SystemTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<ItineraryTemplate[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTpl, setEditingTpl] = useState<ItineraryTemplate | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<Partial<ItineraryTemplate>>({});
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
      refresh();
  }, []);

  const refresh = async () => {
      const data = await adminService.getSystemTemplates();
      setTemplates(data);
  };

  const handleOpenModal = (tpl?: ItineraryTemplate) => {
    if (tpl) {
      setEditingTpl(tpl);
      setFormData(JSON.parse(JSON.stringify(tpl))); // Deep copy
      setTagsInput(tpl.tags?.join(', ') || '');
    } else {
      setEditingTpl(null);
      setFormData({
        name: '',
        destinationKeyword: '',
        nights: 3,
        days: []
      });
      setTagsInput('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.destinationKeyword) return;

    const tags = tagsInput.split(',').map(s => s.trim()).filter(s => s.length > 0);

    // If adding new, generate minimal days structure if empty
    let days = formData.days || [];
    const targetDays = (formData.nights || 0) + 1;
    
    // Auto-generate day structure if missing
    if (days.length === 0 || days.length !== targetDays) {
       days = [];
       for(let i=1; i<=targetDays; i++) {
           days.push({
               day: i,
               title: i === 1 ? 'Arrival' : (i === targetDays ? 'Departure' : 'Sightseeing'),
               description: '',
               slots: []
           });
       }
    }

    const template: ItineraryTemplate = {
      id: editingTpl?.id || '',
      name: formData.name,
      destinationKeyword: formData.destinationKeyword,
      nights: Number(formData.nights),
      tags: tags,
      days: days
    };

    await adminService.saveSystemTemplate(template);
    await refresh();
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this template?')) {
      await adminService.deleteSystemTemplate(id);
      await refresh();
    }
  };

  // --- SLOT EDITOR HELPERS ---
  const updateDay = (dayIndex: number, field: keyof TemplateDay, value: any) => {
      const newDays = [...(formData.days || [])];
      newDays[dayIndex] = { ...newDays[dayIndex], [field]: value };
      setFormData({ ...formData, days: newDays });
  };

  const addSlot = (dayIndex: number, type: 'ACTIVITY' | 'TRANSFER') => {
      const newDays = [...(formData.days || [])];
      if (!newDays[dayIndex].slots) newDays[dayIndex].slots = [];
      newDays[dayIndex].slots.push({ type, category: '', keywords: [] });
      setFormData({ ...formData, days: newDays });
  };

  const updateSlot = (dayIndex: number, slotIndex: number, field: keyof TemplateServiceSlot, value: any) => {
      const newDays = [...(formData.days || [])];
      const slot = newDays[dayIndex].slots[slotIndex];
      
      if (field === 'keywords') {
          // Input is string, convert to array
          value = (value as string).split(',').map(s => s.trim());
      }
      
      newDays[dayIndex].slots[slotIndex] = { ...slot, [field]: value };
      setFormData({ ...formData, days: newDays });
  };

  const removeSlot = (dayIndex: number, slotIndex: number) => {
      const newDays = [...(formData.days || [])];
      newDays[dayIndex].slots = newDays[dayIndex].slots.filter((_, i) => i !== slotIndex);
      setFormData({ ...formData, days: newDays });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Itinerary Templates</h1>
          <p className="text-slate-500">Manage pre-built "Quick Start" templates for agents.</p>
        </div>
        <button onClick={() => handleOpenModal()} className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 transition">
          <Plus size={18} /> New Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map(t => (
            <div key={t.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col group">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                        <div className="bg-brand-50 text-brand-600 p-2 rounded-lg">
                            <Layers size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 line-clamp-1">{t.name}</h3>
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                <MapPin size={10}/> {t.destinationKeyword}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenModal(t)} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-50 rounded"><Edit2 size={16}/></button>
                        <button onClick={() => handleDelete(t.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-50 rounded"><Trash2 size={16}/></button>
                    </div>
                </div>
                
                <div className="bg-slate-50 rounded-lg p-3 mt-2 text-xs space-y-1 border border-slate-100">
                    <div className="flex justify-between">
                        <span className="text-slate-500">Duration:</span>
                        <span className="font-bold text-slate-700">{t.nights} Nights</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Days:</span>
                        <span className="font-bold text-slate-700">{t.days.length} Days</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Auto-Slots:</span>
                        <span className="font-bold text-slate-700">{t.days.reduce((acc, d) => acc + (d.slots?.length || 0), 0)} Configured</span>
                    </div>
                </div>

                <div className="flex flex-wrap gap-1 mt-3">
                    {t.tags?.map(tag => (
                        <span key={tag} className="text-[10px] bg-white text-slate-500 px-2 py-1 rounded border border-slate-200">{tag}</span>
                    ))}
                </div>
            </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full h-[90vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
              <h2 className="text-lg font-bold text-slate-900">{editingTpl ? 'Edit Template' : 'Create Template'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
                <form id="templateForm" onSubmit={handleSave} className="space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Template Name</label>
                            <input required type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-slate-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" placeholder="e.g. Dubai 4N Family Saver" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nights</label>
                            <input required type="number" min="1" value={formData.nights || ''} onChange={e => setFormData({...formData, nights: Number(e.target.value)})} className="w-full border border-slate-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Destination Keyword</label>
                            <input required type="text" value={formData.destinationKeyword || ''} onChange={e => setFormData({...formData, destinationKeyword: e.target.value})} className="w-full border border-slate-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" placeholder="e.g. Dubai" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tags (comma separated)</label>
                            <input type="text" value={tagsInput} onChange={e => setTagsInput(e.target.value)} className="w-full border border-slate-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Family, Budget, Honeymoon" />
                        </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Day Structure */}
                    <div>
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Layers size={18} className="text-brand-600"/> Day-wise Structure</h3>
                        
                        <div className="space-y-4">
                            {formData.days?.map((day, dIdx) => (
                                <div key={dIdx} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                                    <div className="flex justify-between mb-3 items-center">
                                        <span className="text-xs font-bold bg-slate-200 text-slate-700 px-3 py-1 rounded-full">Day {day.day}</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <input type="text" value={day.title} onChange={e => updateDay(dIdx, 'title', e.target.value)} className="border border-slate-300 p-2 rounded text-sm outline-none focus:border-brand-500" placeholder="Day Title (e.g. Arrival)" />
                                        <input type="text" value={day.description} onChange={e => updateDay(dIdx, 'description', e.target.value)} className="border border-slate-300 p-2 rounded text-sm outline-none focus:border-brand-500" placeholder="Brief description..." />
                                    </div>

                                    {/* Slots */}
                                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                                            <Tag size={10} /> Auto-Fill Logic (Optional)
                                        </p>
                                        
                                        {day.slots.map((slot, sIdx) => (
                                            <div key={sIdx} className="flex flex-wrap gap-2 items-center mb-2 text-sm bg-slate-50 p-2 rounded border border-slate-100">
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${slot.type === 'ACTIVITY' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>{slot.type}</span>
                                                
                                                {slot.type === 'ACTIVITY' && (
                                                    <select 
                                                        value={slot.category || ''} 
                                                        onChange={e => updateSlot(dIdx, sIdx, 'category', e.target.value)}
                                                        className="border border-slate-300 rounded px-2 py-1 text-xs bg-white outline-none"
                                                    >
                                                        <option value="">Any Category</option>
                                                        <option>City Tour</option>
                                                        <option>Adventure</option>
                                                        <option>Cruise</option>
                                                        <option>Show</option>
                                                    </select>
                                                )}
                                                
                                                <input 
                                                    type="text" 
                                                    value={slot.keywords?.join(', ')} 
                                                    onChange={e => updateSlot(dIdx, sIdx, 'keywords', e.target.value)}
                                                    className="border border-slate-300 rounded px-2 py-1 flex-1 text-xs outline-none"
                                                    placeholder="Keywords (e.g. Airport, Safari)"
                                                />
                                                <button type="button" onClick={() => removeSlot(dIdx, sIdx)} className="text-slate-400 hover:text-red-600 transition"><X size={14}/></button>
                                            </div>
                                        ))}

                                        <div className="flex gap-2 mt-3">
                                            <button type="button" onClick={() => addSlot(dIdx, 'ACTIVITY')} className="text-xs bg-pink-50 text-pink-700 px-3 py-1.5 rounded-lg hover:bg-pink-100 font-bold border border-pink-100">+ Activity Slot</button>
                                            <button type="button" onClick={() => addSlot(dIdx, 'TRANSFER')} className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 font-bold border border-blue-100">+ Transfer Slot</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(!formData.days || formData.days.length === 0) && (
                                <div className="text-center p-8 text-slate-500 italic bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                                    <Layers size={24} className="mx-auto mb-2 opacity-50"/>
                                    Save to generate day structure based on nights.
                                </div>
                            )}
                        </div>
                    </div>
                </form>
            </div>

            <div className="p-6 border-t border-slate-200 bg-white rounded-b-xl flex justify-end gap-3">
                <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 font-medium">Cancel</button>
                <button form="templateForm" type="submit" className="px-6 py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 flex items-center gap-2 font-bold shadow-lg shadow-brand-200">
                    <Save size={18} /> Save Template
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
