
import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { PricingRule } from '../../types';
import { Save, AlertCircle, Calculator, ArrowRight, ArrowDown } from 'lucide-react';

export const PricingRules: React.FC = () => {
  const [rule, setRule] = useState<PricingRule>(adminService.getPricingRuleSync());
  const [saved, setSaved] = useState(false);
  
  // Simulator State
  const [simCost, setSimCost] = useState<number>(10000);
  const [simCalc, setSimCalc] = useState<any>({});

  useEffect(() => {
    // Calculate Simulation
    const supplierCost = Number(simCost);
    const companyMarginVal = supplierCost * (rule.companyMarkup / 100);
    const agentNet = supplierCost + companyMarginVal;
    
    const agentMarkupVal = agentNet * (rule.agentMarkup / 100);
    const subtotal = agentNet + agentMarkupVal;
    
    const gstVal = subtotal * (rule.gstPercentage / 100);
    const final = subtotal + gstVal;

    setSimCalc({
        companyMarginVal,
        agentNet,
        agentMarkupVal,
        subtotal,
        gstVal,
        final
    });
  }, [simCost, rule]);

  const handleSave = () => {
    adminService.savePricingRule(rule);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Pricing & Markup Logic</h1>
        <p className="text-slate-500">Configure global margins and tax rules applied to all quotes.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT: SETTINGS FORM */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-8 h-fit">
            
            <div>
              <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                  1. Admin Configuration
              </h3>
              
              <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Base Currency</label>
                    <div className="flex items-center gap-4">
                        <div className="w-full border border-slate-200 bg-slate-50 text-slate-600 font-bold rounded-lg px-4 py-3">
                            INR (₹)
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">System is locked to Indian Rupee for accounting compliance.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Company Markup (Global)</label>
                    <div className="relative">
                        <input 
                            type="number" 
                            min="0"
                            value={rule.companyMarkup} 
                            onChange={e => setRule({...rule, companyMarkup: Number(e.target.value)})} 
                            className="w-full border border-slate-300 rounded-lg pl-4 pr-12 py-3 focus:ring-2 focus:ring-brand-500 outline-none font-bold text-lg" 
                        />
                        <span className="absolute right-4 top-4 text-slate-400 font-bold">%</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Added to <strong>ALL</strong> inventory (Operators, Hotel Partners, & Transfers).<br/>
                        This creates the <strong>B2B Agent Net Rate</strong>.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Default Agent Markup</label>
                    <div className="relative">
                        <input 
                            type="number" 
                            min="0"
                            value={rule.agentMarkup} 
                            onChange={e => setRule({...rule, agentMarkup: Number(e.target.value)})} 
                            className="w-full border border-slate-300 rounded-lg pl-4 pr-12 py-3 focus:ring-2 focus:ring-brand-500 outline-none font-bold text-lg" 
                        />
                        <span className="absolute right-4 top-4 text-slate-400 font-bold">%</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        Agents can override this per quote.
                    </p>
                  </div>

                  <div className="border-t border-slate-100 pt-5">
                    <label className="block text-sm font-medium text-slate-700 mb-2">GST / Tax Percentage</label>
                    <div className="relative">
                        <input 
                            type="number" 
                            min="0"
                            value={rule.gstPercentage} 
                            onChange={e => setRule({...rule, gstPercentage: Number(e.target.value)})} 
                            className="w-full border border-slate-300 rounded-lg pl-4 pr-12 py-3 focus:ring-2 focus:ring-brand-500 outline-none font-bold text-lg" 
                        />
                        <span className="absolute right-4 top-4 text-slate-400 font-bold">%</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Applied on final subtotal (Cost + Margins).</p>
                  </div>
              </div>
            </div>

            <div className="pt-2">
              <button 
                onClick={handleSave} 
                className="w-full flex items-center justify-center gap-2 bg-brand-600 text-white px-6 py-4 rounded-xl font-bold hover:bg-brand-700 transition shadow-lg shadow-brand-200"
              >
                <Save size={20} />
                {saved ? 'Rules Updated!' : 'Save Pricing Rules'}
              </button>
            </div>
          </div>

          {/* RIGHT: SIMULATOR */}
          <div className="bg-slate-900 text-white rounded-xl shadow-xl p-8 h-fit border border-slate-700">
              <div className="flex items-center gap-3 mb-6 border-b border-slate-700 pb-4">
                  <div className="bg-brand-500 p-2 rounded-lg text-white">
                      <Calculator size={24} />
                  </div>
                  <div>
                      <h3 className="font-bold text-lg">Live Logic Simulator</h3>
                      <p className="text-slate-400 text-xs">See how prices are calculated in real-time.</p>
                  </div>
              </div>

              <div className="mb-8">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Partner/Supplier Net (Input)</label>
                  <div className="relative">
                      <span className="absolute left-4 top-3 text-slate-500 font-bold">₹</span>
                      <input 
                          type="number" 
                          value={simCost}
                          onChange={(e) => setSimCost(Number(e.target.value))}
                          className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-8 pr-4 py-2.5 text-white font-mono focus:ring-2 focus:ring-brand-500 outline-none"
                      />
                  </div>
              </div>

              <div className="space-y-4 relative">
                  {/* Waterfall Steps */}
                  
                  {/* Step 1 */}
                  <div className="flex justify-between items-center group">
                      <div className="text-sm text-slate-300">
                          <span className="block font-bold text-white">1. Supplier Net</span>
                          <span className="text-xs">Raw Cost</span>
                      </div>
                      <div className="font-mono font-bold">₹ {simCost.toLocaleString()}</div>
                  </div>

                  <div className="flex justify-center -my-2"><ArrowDown size={14} className="text-slate-600"/></div>

                  {/* Step 2 */}
                  <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                      <div className="text-sm text-brand-400">
                          <span className="block font-bold">+ Company Margin</span>
                          <span className="text-xs opacity-80">{rule.companyMarkup}% of Net</span>
                      </div>
                      <div className="font-mono font-bold text-brand-400">+ {simCalc.companyMarginVal?.toLocaleString()}</div>
                  </div>

                  <div className="flex justify-center -my-2"><ArrowDown size={14} className="text-slate-600"/></div>

                  {/* Step 3 (Important Milestone) */}
                  <div className="flex justify-between items-center border-t border-b border-slate-600 py-3 bg-slate-800">
                      <div className="text-sm text-white">
                          <span className="block font-bold text-yellow-400">2. Agent B2B Cost</span>
                          <span className="text-xs text-slate-400">Agent Buying Price</span>
                      </div>
                      <div className="font-mono font-bold text-yellow-400">₹ {simCalc.agentNet?.toLocaleString()}</div>
                  </div>

                  <div className="flex justify-center -my-2"><ArrowDown size={14} className="text-slate-600"/></div>

                  {/* Step 4 */}
                  <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                      <div className="text-sm text-green-400">
                          <span className="block font-bold">+ Agent Profit</span>
                          <span className="text-xs opacity-80">{rule.agentMarkup}% of B2B Cost</span>
                      </div>
                      <div className="font-mono font-bold text-green-400">+ {simCalc.agentMarkupVal?.toLocaleString()}</div>
                  </div>

                  <div className="flex justify-center -my-2"><ArrowDown size={14} className="text-slate-600"/></div>

                  {/* Step 5 */}
                  <div className="flex justify-between items-center p-2">
                      <div className="text-sm text-slate-400">
                          <span className="block font-medium">+ GST ({rule.gstPercentage}%)</span>
                      </div>
                      <div className="font-mono text-slate-400">+ {simCalc.gstVal?.toLocaleString()}</div>
                  </div>

                  <div className="border-t border-slate-500 pt-4 mt-2">
                      <div className="flex justify-between items-end">
                          <div className="text-left">
                              <span className="block text-2xl font-black text-white">3. Final Price</span>
                              <span className="text-xs text-slate-400 uppercase tracking-widest">Client Selling Price</span>
                          </div>
                          <div className="font-mono text-3xl font-bold text-white">
                              ₹ {Math.ceil(simCalc.final || 0).toLocaleString()}
                          </div>
                      </div>
                  </div>

              </div>
          </div>
      </div>
    </div>
  );
};
