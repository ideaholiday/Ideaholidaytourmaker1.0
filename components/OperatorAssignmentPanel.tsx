
import React from 'react';
import { Quote } from '../types';

interface Props {
  quote: Quote;
  currency: string;
  priceMode: 'NET' | 'FIXED';
  setPriceMode: (mode: 'NET' | 'FIXED') => void;
  fixedPrice: number;
  setFixedPrice: (price: number) => void;
}

export const OperatorAssignmentPanel: React.FC<Props> = ({ 
    quote, 
    currency, 
    priceMode, 
    setPriceMode, 
    fixedPrice, 
    setFixedPrice 
}) => {
  return (
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Pricing Visibility</label>
          
          <div className="space-y-2">
              <label className="flex items-start gap-3 cursor-pointer p-2 hover:bg-slate-100 rounded transition">
                  <input 
                      type="radio" 
                      name="pricingMode" 
                      checked={priceMode === 'NET'} 
                      onChange={() => setPriceMode('NET')}
                      className="text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                      <span className="text-sm font-medium text-slate-800">Share Operational Cost</span>
                      <p className="text-xs text-slate-500">Operator sees exactly: <strong>{currency} {(quote.cost || 0).toLocaleString()}</strong></p>
                  </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer p-2 hover:bg-slate-100 rounded transition">
                  <input 
                      type="radio" 
                      name="pricingMode" 
                      checked={priceMode === 'FIXED'} 
                      onChange={() => setPriceMode('FIXED')}
                      className="text-brand-600 focus:ring-brand-500"
                  />
                  <div className="flex-1">
                      <span className="text-sm font-medium text-slate-800">Set Fixed Operator Price</span>
                      <p className="text-xs text-slate-500 mb-2">Hide actual cost and show a specific amount.</p>
                      
                      {priceMode === 'FIXED' && (
                          <div className="relative mt-2">
                              <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-bold">{currency}</span>
                              <input 
                                  type="number" 
                                  required
                                  min="0"
                                  value={fixedPrice}
                                  onChange={(e) => setFixedPrice(Number(e.target.value))}
                                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-brand-500 outline-none font-medium"
                                  placeholder="0.00"
                              />
                          </div>
                      )}
                  </div>
              </label>
          </div>
      </div>
  );
};
