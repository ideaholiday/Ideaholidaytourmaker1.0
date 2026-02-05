
import React, { useState, useEffect } from 'react';
import { inventoryService } from '../../services/inventoryService';
import { permissionService } from '../../services/permissionService';
import { useAuth } from '../../context/AuthContext';
import { OperatorInventoryItem } from '../../types';
import { InventoryStatusBadge } from '../../components/inventory/InventoryStatusBadge';
import { Check, X, Search, Filter, Box, ShieldAlert, GitBranch, Eye, Calendar, MapPin, DollarSign, FileText, Layers, Image as ImageIcon } from 'lucide-react';

export const InventoryApproval: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<OperatorInventoryItem[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'>('PENDING_APPROVAL');
  
  // Detail View State
  const [viewingItem, setViewingItem] = useState<OperatorInventoryItem | null>(null);

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
        setViewingItem(null);
    }
  };

  const handleReject = (id: string) => {
    if (!user) return;
    const reason = prompt("Enter rejection reason:");
    if (reason) {
        inventoryService.rejectItem(id, reason, user);
        loadItems();
        setViewingItem(null);
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

      <div className="flex bg-white p-2 rounded-xl shadow-sm border border-slate-200 gap-2 mb-4 overflow-x-auto">
          <button 
            onClick={() => setFilter('PENDING_APPROVAL')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${filter === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-800' : 'text-slate-600 hover:bg-slate-50'}`}
          >
              Pending Review
          </button>
          <button 
            onClick={() => setFilter('APPROVED')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${filter === 'APPROVED' ? 'bg-green-100 text-green-800' : 'text-slate-600 hover:bg-slate-50'}`}
          >
              Approved
          </button>
          <button 
            onClick={() => setFilter('REJECTED')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${filter === 'REJECTED' ? 'bg-red-100 text-red-800' : 'text-slate-600 hover:bg-slate-50'}`}
          >
              Rejected
          </button>
          <button 
            onClick={() => setFilter('ALL')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${filter === 'ALL' ? 'bg-slate-100 text-slate-800' : 'text-slate-600 hover:bg-slate-50'}`}
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
                  <p className="text-xs text-slate-500 line-clamp-1">{item.description?.replace(/<[^>]*>?/gm, '') || 'No description'}</p>
                </td>
                <td className="px-6 py-4">
                    <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-200 w-fit">
                        <GitBranch size={10} /> v{item.version}
                    </span>
                </td>
                <td className="px-6 py-4 text-slate-600">
                    <span className="font-medium">{item.operatorName}</span>
                </td>
                <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs border font-bold uppercase ${
                        item.type === 'PACKAGE' ? 'bg-orange-50 text-orange-700 border-orange-100' : 
                        item.type === 'HOTEL' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                        'bg-slate-50 text-slate-700 border-slate-100'
                    }`}>
                        {item.type}
                    </span>
                </td>
                <td className="px-6 py-4 font-mono font-bold text-slate-700">
                    {item.currency} {item.costPrice}
                </td>
                <td className="px-6 py-4">
                    <InventoryStatusBadge status={item.status} reason={item.rejectionReason} />
                    {item.isCurrent && <span className="text-[9px] text-green-600 font-bold ml-1">LIVE</span>}
                </td>
                <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                         <button 
                            onClick={() => setViewingItem(item)} 
                            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Inspect Details"
                        >
                            <Eye size={16} />
                        </button>
                        {item.status === 'PENDING_APPROVAL' && (
                            <>
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
                            </>
                        )}
                    </div>
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

      {/* INSPECTION MODAL */}
      {viewingItem && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-start bg-slate-50 rounded-t-2xl">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-xl font-bold text-slate-900">{viewingItem.name}</h2>
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-xs font-bold rounded">v{viewingItem.version}</span>
                    </div>
                    <p className="text-sm text-slate-500 flex items-center gap-2">
                        Submitted by <strong className="text-slate-700">{viewingItem.operatorName}</strong>
                        <span>•</span>
                        {new Date(viewingItem.createdAt).toLocaleDateString()}
                    </p>
                </div>
                <button onClick={() => setViewingItem(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X size={20}/></button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
                
                {/* 1. Quick Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Service Type</p>
                        <p className="font-bold text-slate-800 flex items-center gap-2">
                            <Box size={16} className="text-brand-600" /> {viewingItem.type}
                        </p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Net Cost</p>
                        <p className="font-bold text-slate-800 flex items-center gap-2">
                            <DollarSign size={16} className="text-green-600" /> 
                            {viewingItem.currency} {viewingItem.type === 'ACTIVITY' ? viewingItem.costAdult : viewingItem.costPrice}
                        </p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Validity</p>
                        <p className="font-bold text-slate-800 flex items-center gap-2">
                            <Calendar size={16} className="text-blue-600" /> 
                            {viewingItem.validTo ? new Date(viewingItem.validTo).toLocaleDateString() : 'Ongoing'}
                        </p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Status</p>
                        <InventoryStatusBadge status={viewingItem.status} />
                    </div>
                </div>

                {/* 2. Description & Image */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2">
                        <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                            <FileText size={18} /> Description
                        </h3>
                        <div 
                            className="prose prose-sm max-w-none text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100"
                            dangerouslySetInnerHTML={{ __html: viewingItem.description }}
                        />
                    </div>
                    <div>
                         <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                            <ImageIcon size={18} /> Preview Image
                        </h3>
                        {viewingItem.imageUrl ? (
                            <img src={viewingItem.imageUrl} alt={viewingItem.name} className="w-full h-48 object-cover rounded-xl border border-slate-200 shadow-sm" />
                        ) : (
                            <div className="w-full h-48 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 border border-slate-200 border-dashed">
                                No Image
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Specific Details Based on Type */}
                {viewingItem.type === 'HOTEL' && (
                    <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-xl">
                        <h3 className="font-bold text-indigo-900 mb-4">Hotel Specifics</h3>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                            <div><span className="text-indigo-700 block text-xs font-bold">Category</span> {viewingItem.category}</div>
                            <div><span className="text-indigo-700 block text-xs font-bold">Room Type</span> {viewingItem.roomType}</div>
                            <div><span className="text-indigo-700 block text-xs font-bold">Meal Plan</span> {viewingItem.mealPlan}</div>
                        </div>
                    </div>
                )}

                {viewingItem.type === 'TRANSFER' && (
                    <div className="bg-blue-50 border border-blue-100 p-5 rounded-xl">
                        <h3 className="font-bold text-blue-900 mb-4">Fleet Details</h3>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                            <div><span className="text-blue-700 block text-xs font-bold">Vehicle</span> {viewingItem.vehicleType}</div>
                            <div><span className="text-blue-700 block text-xs font-bold">Capacity</span> {viewingItem.maxPassengers} Pax</div>
                            <div><span className="text-blue-700 block text-xs font-bold">Luggage</span> {viewingItem.luggageCapacity} Bags</div>
                        </div>
                    </div>
                )}

                {viewingItem.type === 'PACKAGE' && (
                    <div className="space-y-6">
                        <div className="bg-orange-50 border border-orange-100 p-5 rounded-xl">
                            <h3 className="font-bold text-orange-900 mb-4">Package Configuration</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                                <div><span className="text-orange-700 block text-xs font-bold">Duration</span> {viewingItem.nights} Nights</div>
                                <div><span className="text-orange-700 block text-xs font-bold">Departure Type</span> {viewingItem.dateType === 'DAILY' ? 'Daily / Flexible' : 'Fixed Dates'}</div>
                            </div>
                            
                            {/* Inclusions & Exclusions */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white/50 p-3 rounded-lg border border-orange-200">
                                    <h4 className="text-xs font-bold text-orange-800 uppercase mb-2">Inclusions</h4>
                                    <ul className="list-disc pl-4 text-xs text-slate-700 space-y-1">
                                        {viewingItem.inclusions?.map((inc, i) => <li key={i}>{inc}</li>)}
                                    </ul>
                                </div>
                                <div className="bg-white/50 p-3 rounded-lg border border-orange-200">
                                    <h4 className="text-xs font-bold text-red-800 uppercase mb-2">Exclusions</h4>
                                    <ul className="list-disc pl-4 text-xs text-slate-700 space-y-1">
                                        {viewingItem.exclusions?.map((exc, i) => <li key={i}>{exc}</li>)}
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Itinerary Timeline */}
                        {viewingItem.itinerary && viewingItem.itinerary.length > 0 && (
                            <div>
                                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <Layers size={18} /> Detailed Itinerary
                                </h3>
                                <div className="space-y-3">
                                    {viewingItem.itinerary.map((day, idx) => (
                                        <div key={idx} className="flex gap-4">
                                            <div className="flex flex-col items-center">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600 border border-slate-200">
                                                    {day.day}
                                                </div>
                                                {idx < (viewingItem.itinerary?.length || 0) - 1 && <div className="w-0.5 flex-1 bg-slate-100 my-1"></div>}
                                            </div>
                                            <div className="flex-1 pb-4">
                                                <h4 className="font-bold text-slate-800 text-sm">{day.title}</h4>
                                                <div 
                                                    className="text-xs text-slate-500 mt-1 prose prose-sm"
                                                    dangerouslySetInnerHTML={{ __html: day.description }} 
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
                <button 
                    onClick={() => setViewingItem(null)} 
                    className="px-5 py-2.5 text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg text-sm font-medium transition"
                >
                    Close
                </button>
                {viewingItem.status === 'PENDING_APPROVAL' && (
                    <>
                        <button 
                            onClick={() => handleReject(viewingItem.id)} 
                            className="px-5 py-2.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm font-bold transition"
                        >
                            Reject
                        </button>
                        <button 
                            onClick={() => handleApprove(viewingItem.id)} 
                            className="px-6 py-2.5 bg-green-600 text-white hover:bg-green-700 rounded-lg text-sm font-bold shadow-sm transition flex items-center gap-2"
                        >
                            <Check size={16} /> Approve & Publish
                        </button>
                    </>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
