
import React, { useState, useEffect } from 'react';
import { contractService } from '../../services/contractService';
import { useAuth } from '../../context/AuthContext';
import { SupplierContract } from '../../types';
import { ContractStatusBadge } from '../../components/contracts/ContractStatusBadge';
import { Check, X, FileText, Calendar, CheckCircle } from 'lucide-react';

export const ContractApproval: React.FC = () => {
  const { user } = useAuth();
  const [pendingContracts, setPendingContracts] = useState<SupplierContract[]>([]);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    const all = await contractService.getAllContracts();
    setPendingContracts(all.filter(c => c.status === 'PENDING_APPROVAL'));
  };

  const handleApprove = (id: string) => {
      if (!user) return;
      if (confirm("Approve this contract? It will become active immediately.")) {
          contractService.updateStatus(id, 'ACTIVE', user);
          loadData();
      }
  };

  const handleReject = (id: string) => {
      if (!user) return;
      const reason = prompt("Enter rejection reason:");
      if (reason) {
          contractService.updateStatus(id, 'REJECTED', user, reason);
          loadData();
      }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Contract Approvals</h1>
        <p className="text-slate-500">Review pending supplier agreements.</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
          {pendingContracts.map(c => (
              <div key={c.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <div className="flex justify-between items-start mb-4">
                      <div>
                          <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-lg font-bold text-slate-900">{c.supplierName}</h3>
                              <ContractStatusBadge status={c.status} />
                          </div>
                          <p className="text-sm text-slate-500 font-mono">{c.contractCode} • {c.contractType}</p>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                          <p>Created: {new Date(c.createdAt).toLocaleDateString()}</p>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm">
                      <div>
                          <span className="block text-slate-400 text-xs font-bold uppercase">Pricing Model</span>
                          <span className="font-medium text-slate-800">{c.pricingModel}</span>
                      </div>
                      <div>
                          <span className="block text-slate-400 text-xs font-bold uppercase">Validity</span>
                          <span className="font-medium text-slate-800">{c.validFrom} to {c.validTo}</span>
                      </div>
                      <div>
                          <span className="block text-slate-400 text-xs font-bold uppercase">Tax Included</span>
                          <span className={`font-medium ${c.taxInclusive ? 'text-green-600' : 'text-amber-600'}`}>
                              {c.taxInclusive ? 'Yes' : 'No (+GST Extra)'}
                          </span>
                      </div>
                      <div>
                          <span className="block text-slate-400 text-xs font-bold uppercase">Cities</span>
                          <span className="font-medium text-slate-800">{c.applicableCities.length} Locations</span>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                      <div className="p-3 border rounded-lg">
                          <p className="font-bold text-slate-700 mb-1">Cancellation Policy</p>
                          <p className="text-slate-600 leading-snug">{c.cancellationPolicy}</p>
                      </div>
                      <div className="p-3 border rounded-lg">
                          <p className="font-bold text-slate-700 mb-1">Payment Terms</p>
                          <p className="text-slate-600 leading-snug">{c.paymentTerms}</p>
                      </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                      <button 
                        onClick={() => handleReject(c.id)}
                        className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-700 rounded-lg hover:bg-red-50 font-medium transition"
                      >
                          <X size={16} /> Reject
                      </button>
                      <button 
                        onClick={() => handleApprove(c.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold transition shadow-sm"
                      >
                          <Check size={16} /> Approve Contract
                      </button>
                  </div>
              </div>
          ))}
          {pendingContracts.length === 0 && (
              <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
                  <CheckCircle size={48} className="mx-auto mb-4 opacity-20" />
                  <p>No contracts pending approval.</p>
              </div>
          )}
      </div>
    </div>
  );
};