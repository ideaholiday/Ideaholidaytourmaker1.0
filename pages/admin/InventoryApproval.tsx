import React, { useState, useEffect } from 'react';
import { inventoryService } from '../../services/inventoryService';
import { permissionService } from '../../services/permissionService';
import { useAuth } from '../../context/AuthContext';
import { OperatorInventoryItem } from '../../types';
import { InventoryStatusBadge } from '../../components/inventory/InventoryStatusBadge';
import { Check, X, Search, Filter, Box, ShieldAlert, GitBranch } from 'lucide-react';

export const InventoryApproval: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<OperatorInventoryItem[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'>('PENDING_APPROVAL');
  
  useEffect(() => {
    if (user && permissionService.hasPermission(user, 'APPROVE_INVENTORY')) {
      loadItems();
    }
  }, [user]);

  const loadItems = async () => {
    setItems(await inventoryService.getAllItems());
  };

  const handleApprove = (id: string) => {
    if (!user) return;
    if (window.confirm("Approve this version? It will become the live version for all agents.")) {
        inventoryService.approveItem(id, user);
        loadItems();
    }
  };

  const handleReject = (id: string) => {
    if (!user) return;
    const reason = prompt("Enter rejection reason:");
    if (reason) {
        inventoryService.rejectItem(id, reason, user);
        loadItems();
    }
  };

  if (!user) return null;

  // Security Check
  if (!permissionService.hasPermission(user, 'APPROVE_INVENTORY')) {
      return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500">
              <div className="bg-red-50 p-4 rounded-full mb-4">
                  <ShieldAlert size={48} className="text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Permission Required</h2>
              <p className="max-w-md text-center">You need the <strong>'Approve Inventory'</strong> permission to access this module. Please contact an administrator.</p>
          </div>
      );
  }

  const filteredItems = items.filter(i => filter === 'ALL' || i.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory Approval</h1>
          <p className="text-slate-500">Review and moderate operator-submitted inventory.</p>
        </div>
      </div>

      <div className="flex bg-white p-2 rounded-xl shadow-sm border border-slate-200 gap-2 mb-4">
          <button 
            onClick={() => setFilter('PENDING_APPROVAL')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-800' : 'text-slate-600 hover:bg-slate-50'}`}
          >
              Pending Review
          </button>
          <button 
            onClick={() => setFilter('APPROVED')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === 'APPROVED' ? 'bg-green-100 text-green-800' : 'text-slate-600 hover:bg-slate-50'}`}
          >
              Approved
          </button>
          <button 
            onClick={() => setFilter('REJECTED')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === 'REJECTED' ? 'bg-red-100 text-red-800' : 'text-slate-600 hover:bg-slate-50'}`}
          >
              Rejected
          </button>
          <button 
            onClick={() => setFilter('ALL')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === 'ALL' ? 'bg-slate-100 text-slate-800' : 'text-slate-600 hover:bg-slate-50'}`}
          >
              All Items
          </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 font-semibold">Item Details</th>
              <th className="px-6 py-4 font-semibold">Version</th>
              <th className="px-6 py-4 font-semibold">Operator</th>
              <th className="px-6 py-4 font-semibold">Type</th>
              <th className="px-6 py-4 font-semibold">Net Cost</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.map(item => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <p className="font-bold text-slate-900">{item.name}</p>
                  <p className="text-xs text-slate-500 line-clamp-1">{item.description || 'No description'}</p>
                </td>
                <td className="px-6 py-4">
                    <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-200 w-fit">
                        <GitBranch size={10} /> v{item.version}
                    </span>
                </td>
                <td className="px-6 py-4 text-slate-600">
                    <span className="font-medium">{item.operatorName}</span>
                    <div className="text-xs text-slate-400">ID: {item.operatorId}</div>
                </td>
                <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-slate-100 rounded text-xs border border-slate-200 font-mono uppercase">{item.type}</span>
                </td>
                <td className="px-6 py-4 font-mono font-bold text-slate-700">
                    {item.currency} {item.costPrice}
                </td>
                <td className="px-6 py-4">
                    <InventoryStatusBadge status={item.status} reason={item.rejectionReason} />
                    {item.isCurrent && <span className="text-[9px] text-green-600 font-bold ml-1">LIVE</span>}
                </td>
                <td className="px-6 py-4 text-right">
                    {item.status === 'PENDING_APPROVAL' && (
                        <div className="flex justify-end gap-2">
                            <button 
                                onClick={() => handleReject(item.id)} 
                                className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
                                title="Reject"
                            >
                                <X size={16} />
                            </button>
                            <button 
                                onClick={() => handleApprove(item.id)} 
                                className="p-2 text-white bg-green-600 hover:bg-green-700 rounded-lg transition shadow-sm"
                                title="Approve"
                            >
                                <Check size={16} />
                            </button>
                        </div>
                    )}
                </td>
              </tr>
            ))}
            {filteredItems.length === 0 && (
                <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                        No inventory items found in this category.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};