import React, { useState } from 'react';
import { adminService } from '../../services/adminService';
import { PricingRule } from '../../types';
import { Save, AlertCircle } from 'lucide-react';

export const PricingRules: React.FC = () => {
  const [rule, setRule] = useState<PricingRule>(adminService.getPricingRule());
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    adminService.savePricingRule(rule);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Pricing & Markup Logic</h1>
        <p className="text-slate-500">Global rules applied to the calculation engine.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-6">
        
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex gap-3 text-blue-900 text-sm">
          <AlertCircle size={20} className="shrink-0" />
          <p>
            <strong>Logic Flow:</strong> Net Cost + Company Markup + Agent Markup + GST = Final Price.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Company Markup (%)</label>
          <div className="flex items-center gap-4">
             <input 
              type="number" 
              value={rule.companyMarkup} 
              onChange={e => setRule({...rule, companyMarkup: Number(e.target.value)})} 
              className="w-32 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none" 
             />
             <span className="text-slate-500 text-sm">Base margin added to Net Cost</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Agent Markup Default (%)</label>
          <div className="flex items-center gap-4">
             <input 
              type="number" 
              value={rule.agentMarkup} 
              onChange={e => setRule({...rule, agentMarkup: Number(e.target.value)})} 
              className="w-32 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none" 
             />
             <span className="text-slate-500 text-sm">Can be overridden per quote</span>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-6">
           <label className="block text-sm font-medium text-slate-700 mb-2">GST / Tax Percentage</label>
           <input 
              type="number" 
              value={rule.gstPercentage} 
              onChange={e => setRule({...rule, gstPercentage: Number(e.target.value)})} 
              className="w-32 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none" 
           />
        </div>

        <div className="pt-6">
          <button 
            onClick={handleSave} 
            className="flex items-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-700 transition"
          >
            <Save size={18} />
            {saved ? 'Settings Saved!' : 'Save Pricing Rules'}
          </button>
        </div>
      </div>
    </div>
  );
};
