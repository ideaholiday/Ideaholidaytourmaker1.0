
import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { User, UserRole } from '../../types';
import { X, Shield, DollarSign, UserPlus, CheckCircle, Lock } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (operatorId: string, operatorName: string, options: { priceMode: 'NET_COST' | 'FIXED_PRICE', price?: number, instructions?: string }) => void;
  currentNetCost: number;
  currency: string;
}

export const AssignOperatorModal: React.FC<Props> = ({ isOpen, onClose, onAssign, currentNetCost, currency }) => {
  const [operators, setOperators] = useState<User[]>([]);
  const [selectedOpId, setSelectedOpId] = useState('');
  const [priceMode, setPriceMode] = useState<'NET_COST' | 'FIXED_PRICE'>('NET_COST');
  const [fixedPrice, setFixedPrice] = useState<number>(0);
  const [instructions, setInstructions] = useState('');

  useEffect(() => {
    if (isOpen) {
        const allUsers = adminService.getUsers();
        setOperators(allUsers.filter(u => u.role === UserRole.OPERATOR && u.isVerified));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const op = operators.find(u => u.id === selectedOpId);
    if (!op) return;

    onAssign(op.id, op.companyName || op.name, {
        priceMode,
        price: priceMode === 'FIXED_PRICE' ? fixedPrice : undefined,
        instructions
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <UserPlus size={22} className="text-brand-600" /> Assign Operator
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Operator Selection */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Service Provider</label>
                <select 
                    required
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                    value={selectedOpId}
                    onChange={(e) => setSelectedOpId(e.target.value)}
                >
                    <option value="">-- Choose Operator --</option>
                    {operators.map(op => (
                        <option key={op.id} value={op.id}>
                            {op.companyName || op.name} {op.assignedDestinations ? `(${op.assignedDestinations.length} Locs)` : ''}
                        </option>
                    ))}
                </select>
            </div>

            {/* Privacy Notice */}
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex gap-2 items-start">
                <Lock size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-800">
                    <strong>Privacy Wall Active:</strong> The selected operator will NOT see the Agent's name, markup, or client selling price. They only see the itinerary and the price you configure below.
                </div>
            </div>

            {/* Pricing Control */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-1">
                    <DollarSign size={14} /> Operator Pricing Config
                </label>
                
                <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer p-2 hover:bg-slate-100 rounded transition">
                        <input 
                            type="radio" 
                            name="priceMode" 
                            checked={priceMode === 'NET_COST'} 
                            onChange={() => setPriceMode('NET_COST')}
                            className="mt-1 text-brand-600 focus:ring-brand-500"
                        />
                        <div>
                            <span className="text-sm font-medium text-slate-800">Reveal System Net Cost</span>
                            <p className="text-xs text-slate-500">Operator sees exactly: <strong>{currency} {currentNetCost.toLocaleString()}</strong></p>
                        </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer p-2 hover:bg-slate-100 rounded transition">
                        <input 
                            type="radio" 
                            name="priceMode" 
                            checked={priceMode === 'FIXED_PRICE'} 
                            onChange={() => setPriceMode('FIXED_PRICE')}
                            className="mt-1 text-brand-600 focus:ring-brand-500"
                        />
                        <div className="flex-1">
                            <span className="text-sm font-medium text-slate-800">Set Custom Fixed Price</span>
                            <p className="text-xs text-slate-500 mb-2">Hide actual cost and show a specific amount.</p>
                            
                            {priceMode === 'FIXED_PRICE' && (
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

            {/* Instructions */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Execution Notes (Optional)</label>
                <textarea 
                    rows={3}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                    placeholder="Specific instructions for the operator (e.g. 'VIP Client', 'Use White Placard')..."
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                />
            </div>

            <div className="flex justify-end gap-3 pt-2">
                <button 
                    type="button" 
                    onClick={onClose}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
                >
                    Cancel
                </button>
                <button 
                    type="submit"
                    className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-bold shadow-sm flex items-center gap-2"
                >
                    <CheckCircle size={16} /> Confirm Assignment
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};
