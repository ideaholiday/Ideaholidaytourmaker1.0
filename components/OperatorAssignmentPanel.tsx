
import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { User, UserRole, Quote } from '../types';
import { UserPlus, DollarSign, Shield, CheckCircle, AlertCircle, XCircle, RotateCcw } from 'lucide-react';

interface Props {
  quote: Quote;
  onAssign: (operatorId: string, operatorName: string, pricing: { mode: 'NET' | 'FIXED', price?: number }) => void;
}

export const OperatorAssignmentPanel: React.FC<Props> = ({ quote, onAssign }) => {
  const [operators, setOperators] = useState<User[]>([]);
  const [selectedOpId, setSelectedOpId] = useState('');
  const [pricingMode, setPricingMode] = useState<'NET' | 'FIXED'>('NET');
  const [fixedPrice, setFixedPrice] = useState<number>(0);
  const [isReassigning, setIsReassigning] = useState(false);

  useEffect(() => {
    // Load active operators
    const allUsers = adminService.getUsers();
    setOperators(allUsers.filter(u => u.role === UserRole.OPERATOR && u.isVerified));
  }, []);

  const handleAssign = () => {
    if (!selectedOpId) return;
    const op = operators.find(o => o.id === selectedOpId);
    if (!op) return;

    if (window.confirm(`Assign quote to ${op.companyName || op.name}?\nThey will be notified immediately.`)) {
        onAssign(op.id, op.companyName || op.name, {
            mode: pricingMode,
            price: pricingMode === 'FIXED' ? fixedPrice : undefined
        });
        setIsReassigning(false);
    }
  };

  // If already assigned and not in reassign mode
  if (quote.operatorId && !isReassigning) {
      return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Shield size={18} className="text-purple-600" />
                  Operator Assignment
              </h3>
              
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-100 mb-4">
                  <div className="flex justify-between items-start">
                      <div>
                          <p className="text-xs text-purple-600 font-bold uppercase mb-1">Assigned To</p>
                          <p className="font-medium text-slate-900">{quote.operatorName}</p>
                      </div>
                      <div className="text-right">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                              quote.operatorStatus === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
                              quote.operatorStatus === 'DECLINED' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                          }`}>
                              {quote.operatorStatus === 'ACCEPTED' && <CheckCircle size={12} />}
                              {quote.operatorStatus === 'DECLINED' && <XCircle size={12} />}
                              {quote.operatorStatus || 'ASSIGNED'}
                          </span>
                      </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-purple-100 grid grid-cols-2 gap-4 text-sm">
                      <div>
                          <span className="text-slate-500 text-xs block">Pricing Mode</span>
                          <span className="font-medium text-slate-800">
                              {quote.operatorPrice ? 'Fixed Price' : (quote.netCostVisibleToOperator ? 'Net Cost Visible' : 'Hidden')}
                          </span>
                      </div>
                      <div>
                          <span className="text-slate-500 text-xs block">Operational Value</span>
                          <span className="font-medium text-slate-800">
                              {quote.currency} {quote.operatorPrice ? quote.operatorPrice.toLocaleString() : (quote.netCostVisibleToOperator ? (quote.cost || 0).toLocaleString() : '---')}
                          </span>
                      </div>
                  </div>
              </div>

              {quote.operatorStatus === 'DECLINED' && (
                  <div className="mb-4 bg-red-50 p-3 rounded border border-red-100 text-sm text-red-800">
                      <strong>Decline Reason:</strong> {quote.operatorDeclineReason || 'No reason provided.'}
                  </div>
              )}

              <button 
                onClick={() => setIsReassigning(true)} 
                className="w-full text-center text-sm text-brand-600 hover:text-brand-800 font-medium flex items-center justify-center gap-2 border border-slate-200 py-2 rounded-lg hover:bg-slate-50 transition"
              >
                  <RotateCcw size={14} /> {quote.operatorStatus === 'DECLINED' ? 'Reassign Operator' : 'Change Operator'}
              </button>
          </div>
      );
  }

  // Selection Mode (Initial or Reassigning)
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <UserPlus size={18} className="text-brand-600" />
              {isReassigning ? 'Reassign Operator' : 'Assign Ground Operator'}
          </h3>
          {isReassigning && (
              <button onClick={() => setIsReassigning(false)} className="text-xs text-slate-500 hover:text-slate-800">
                  Cancel
              </button>
          )}
      </div>

      <div className="space-y-4">
          <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Select Operator</label>
              <select 
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  value={selectedOpId}
                  onChange={(e) => setSelectedOpId(e.target.value)}
              >
                  <option value="">-- Choose Partner --</option>
                  {operators.map(op => (
                      <option key={op.id} value={op.id}>
                          {op.companyName || op.name} {op.assignedDestinations ? `(${op.assignedDestinations.length} Areas)` : ''}
                      </option>
                  ))}
              </select>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Pricing Visibility</label>
              
              <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                          type="radio" 
                          name="pricingMode" 
                          checked={pricingMode === 'NET'} 
                          onChange={() => setPricingMode('NET')}
                          className="text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-sm text-slate-700">Share System Net Cost <span className="text-slate-400">({quote.currency} {(quote.cost || 0).toLocaleString()})</span></span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                          type="radio" 
                          name="pricingMode" 
                          checked={pricingMode === 'FIXED'} 
                          onChange={() => setPricingMode('FIXED')}
                          className="text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-sm text-slate-700">Set Fixed Operator Price</span>
                  </label>
              </div>

              {pricingMode === 'FIXED' && (
                  <div className="mt-3 pl-6">
                      <div className="relative">
                          <DollarSign size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                          <input 
                              type="number" 
                              value={fixedPrice}
                              onChange={(e) => setFixedPrice(Number(e.target.value))}
                              className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                              placeholder="Enter Amount"
                          />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">This is the ONLY price they will see.</p>
                  </div>
              )}
          </div>

          <div className="pt-2">
              <button 
                  onClick={handleAssign}
                  disabled={!selectedOpId || (pricingMode === 'FIXED' && fixedPrice <= 0)}
                  className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                  {isReassigning ? 'Update Assignment' : 'Confirm Assignment'}
              </button>
          </div>
      </div>
    </div>
  );
};
