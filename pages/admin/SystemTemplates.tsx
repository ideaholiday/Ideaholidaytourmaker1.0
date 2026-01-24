
import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { ItineraryTemplate, TemplateDay, TemplateServiceSlot } from '../../types';
import { Edit2, Trash2, Plus, X, Layers, Save, Tag } from 'lucide-react';

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
    
    if (days.length === 0) {
       for(let i=1; i<=targetDays; i++) {
           days.push({
               day: i,
               title: i === 1 ? 'Arrival' : (i === targetDays ? 'Departure' : 'Exploration'),
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
            <div key={t.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                        <Layers size={20} className="text-brand-500" />
                        <h3 className="font-bold text-slate-900">{t.name}</h3>
                    </div>
                    <div className="flex gap-1">
                        <button onClick={() => handleOpenModal(t)} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-50 rounded"><Edit2 size={16}/></button>
                        <button onClick={() => handleDelete(t.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-50 rounded"><Trash2 size={16}/></button>
                    </div>
                </div>
                
                <div className="text-sm text-slate-600 mb-3 space-y-1">
                    <p><span className="font-medium">Destination:</span> {t.destinationKeyword}</p>
                    <p><span className="font-medium">Duration:</span> {t.nights} Nights / {t.nights + 1} Days</p>
                </div>

                <div className="flex flex-wrap gap-1 mt-auto">
                    {t.tags?.map(tag => (
                        <span key={tag} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200">{tag}</span>
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
                            <label className="block text-sm font-medium text-slate-700 mb-1">Template Name</label>
                            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border p-2 rounded text-sm" placeholder="e.g. Dubai 4N Family Saver" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nights</label>
                            <input required type="number" min="1" value={formData.nights} onChange={e => setFormData({...formData, nights: Number(e.target.value)})} className="w-full border p-2 rounded text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Destination Keyword</label>
                            <input required type="text" value={formData.destinationKeyword} onChange={e => setFormData({...formData, destinationKeyword: e.target.value})} className="w-full border p-2 rounded text-sm" placeholder="e.g. Dubai" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tags (comma separated)</label>
                            <input type="text" value={tagsInput} onChange={e => setTagsInput(e.target.value)} className="w-full border p-2 rounded text-sm" placeholder="Family, Budget, Honeymoon" />
                        </div>
                    </div>

                    <hr className="border-slate-200" />

                    {/* Day Structure */}
                    <div>
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Layers size={18}/> Day-wise Structure</h3>
                        
                        <div className="space-y-4">
                            {formData.days?.map((day, dIdx) => (
                                <div key={dIdx} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded">Day {day.day}</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                        <input type="text" value={day.title} onChange={e => updateDay(dIdx, 'title', e.target.value)} className="border p-2 rounded text-sm" placeholder="Day Title" />
                                        <input type="text" value={day.description} onChange={e => updateDay(dIdx, 'description', e.target.value)} className="border p-2 rounded text-sm" placeholder="Brief description..." />
                                    </div>

                                    {/* Slots */}
                                    <div className="bg-white p-3 rounded border border-slate-200">
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-2">Auto-Fill Slots</p>
                                        {day.slots.map((slot, sIdx) => (
                                            <div key={sIdx} className="flex gap-2 items-center mb-2 text-sm">
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${slot.type === 'ACTIVITY' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>{slot.type}</span>
                                                <select 
                                                    value={slot.category || ''} 
                                                    onChange={e => updateSlot(dIdx, sIdx, 'category', e.target.value)}
                                                    className="border rounded px-2 py-1 w-32"
                                                >
                                                    <option value="">Any Category</option>
                                                    <option>City Tour</option>
                                                    <option>Adventure</option>
                                                    <option>Cruise</option>
                                                    <option>Show</option>
                                                </select>
                                                <input 
                                                    type="text" 
                                                    value={slot.keywords?.join(', ')} 
                                                    onChange={e => updateSlot(dIdx, sIdx, 'keywords', e.target.value)}
                                                    className="border rounded px-2 py-1 flex-1"
                                                    placeholder="Keywords (e.g. Airport, Safari)"
                                                />
                                                <button type="button" onClick={() => removeSlot(dIdx, sIdx)} className="text-red-400 hover:text-red-600"><X size={14}/></button>
                                            </div>
                                        ))}
                                        <div className="flex gap-2 mt-2">
                                            <button type="button" onClick={() => addSlot(dIdx, 'ACTIVITY')} className="text-xs bg-pink-50 text-pink-600 px-2 py-1 rounded hover:bg-pink-100">+ Activity</button>
                                            <button type="button" onClick={() => addSlot(dIdx, 'TRANSFER')} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100">+ Transfer</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(!formData.days || formData.days.length === 0) && (
                                <div className="text-center p-4 text-slate-500 italic bg-slate-50 rounded border border-dashed border-slate-300">
                                    Save to generate day structure based on nights.
                                </div>
                            )}
                        </div>
                    </div>
                </form>
            </div>

            <div className="p-6 border-t border-slate-200 bg-white rounded-b-xl flex justify-end gap-3">
                <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                <button form="templateForm" type="submit" className="px-5 py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 flex items-center gap-2 font-medium">
                    <Save size={18} /> Save Template
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
