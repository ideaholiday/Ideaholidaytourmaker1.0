
import React, { useState } from 'react';
import { Save, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, note: string) => void;
}

export const FavoriteTemplateModal: React.FC<Props> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name, note);
    setName('');
    setNote('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Save size={20} className="text-brand-600" /> Save as Favorite
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        
        <p className="text-sm text-slate-500 mb-6">
          Save this itinerary structure to reuse later. Prices will be updated automatically based on future rates.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Template Name</label>
            <input 
              type="text" 
              required
              autoFocus
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              placeholder="e.g. Dubai 5N Family Special"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
            <textarea 
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none"
              rows={3}
              placeholder="Best for families, includes theme parks..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700">Save Template</button>
          </div>
        </form>
      </div>
    </div>
  );
};
