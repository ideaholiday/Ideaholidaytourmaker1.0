
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { inventoryService } from '../../services/inventoryService';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { OperatorInventoryItem, ActivityTransferOptions, Destination, ItineraryItem, PackagePricingTiers } from '../../types';
import { InventoryStatusBadge } from '../../components/inventory/InventoryStatusBadge';
import { RichTextEditor } from '../../components/ui/RichTextEditor';
import { 
    Plus, Save, X, Box, GitBranch, DollarSign, Bus, Car, Ticket, 
    Edit2, Trash2, Search, Filter, Image as ImageIcon, MapPin, 
    Calendar, FileText, Check, ArrowUpDown, ArrowUp, ArrowDown, 
    CalendarRange, Hotel, Users, Layers, Package, Info
} from 'lucide-react';

const DEFAULT_TRANSFER_OPTS: ActivityTransferOptions = {
    sic: { enabled: false, costPerPerson: 0 },
    pvt: { enabled: false, costPerVehicle: 0, vehicleCapacity: 4 }
};

const DEFAULT_PRICING_TIERS: PackagePricingTiers = {
    solo: 0,
    twin: 0,
    quad: 0,
    six: 0,
    childWithBed: 0,
    childNoBed: 0
};

type ModalTab = 'GENERAL' | 'ITINERARY' | 'PRICING' | 'MEDIA';
type SortKey = 'name' | 'costPrice' | 'createdAt' | 'status';

export const InventoryManager: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<OperatorInventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  
  // ... (rest of state initialization remains same)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ModalTab>('GENERAL');
  const [editingItem, setEditingItem] = useState<OperatorInventoryItem | null>(null);
  
  // Extended Form Data
  const [formData, setFormData] = useState<Partial<OperatorInventoryItem> & { 
      inclusionsText?: string; 
      exclusionsText?: string;
      datesText?: string;
      nights?: number;
      itinerary?: ItineraryItem[];
      dateType?: 'SPECIFIC' | 'RANGE'; 
  }>({});
  
  const [transferOpts, setTransferOpts] = useState<ActivityTransferOptions>(DEFAULT_TRANSFER_OPTS);
  const [pricingTiers, setPricingTiers] = useState<PackagePricingTiers>(DEFAULT_PRICING_TIERS);
  const [isSaving, setIsSaving] = useState(false);

  // Filter & Sort State
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'HOTEL' | 'ACTIVITY' | 'TRANSFER' | 'PACKAGE'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APPROVED' | 'PENDING' | 'REJECTED'>('ALL');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'createdAt', direction: 'desc' });

  // Bulk Action State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRate, setBulkRate] = useState<string>('');
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);

  useEffect(() => {
    const init = async () => {
        if (user) {
            setIsLoading(true);
            const [myItems, dests] = await Promise.all([
                inventoryService.getItemsByOperator(user.id),
                adminService.getDestinations()
            ]);
            setItems(myItems);
            setDestinations(dests.filter(d => d.isActive));
            setIsLoading(false);
        }
    };
    init();
  }, [user]);

  // ... (rest of logic functions like refreshList, handleSort, handleSelectAll, etc. remain unchanged)
  
  const refreshList = async () => {
      if(user) {
          const data = await inventoryService.getItemsByOperator(user.id);
          setItems(data);
          setSelectedIds(new Set()); // Clear selection on refresh
          setIsBulkEditOpen(false);
      }
  };

  const handleSort = (key: SortKey) => {
      setSortConfig(current => ({
          key,
          direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
      }));
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
          setSelectedIds(new Set(processedItems.map(i => i.id)));
      } else {
          setSelectedIds(new Set());
      }
  };

  const handleSelectRow = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
  };

  const handleBulkUpdateRate = async () => {
      if (!bulkRate || isNaN(Number(bulkRate))) return alert("Please enter a valid rate");
      if (!user) return;
      if (!confirm(`Update rates for ${selectedIds.size} items? This will reset their status to Pending Approval.`)) return;

      setIsSaving(true);
      try {
          for (const rawId of Array.from(selectedIds)) {
              const id = String(rawId);
              const item = items.find(i => i.id === id);
              if (item) {
                  const updates: any = {};
                  if (item.type === 'ACTIVITY') {
                      updates.costAdult = Number(bulkRate);
                  } else {
                      updates.costPrice = Number(bulkRate);
                  }
                  await inventoryService.updateItem(id, updates, user);
              }
          }
          await refreshList();
          alert("Bulk update complete.");
      } catch (e: any) {
          alert("Bulk update failed: " + e.message);
      } finally {
          setIsSaving(false);
      }
  };

  const processedItems = useMemo(() => {
      let filtered = items.filter(i => {
          const name = i.name || '';
          const matchSearch = name.toLowerCase().includes(searchTerm.toLowerCase());
          const matchType = typeFilter === 'ALL' || i.type === typeFilter;
          
          let matchStatus = true;
          if (statusFilter === 'APPROVED') matchStatus = i.status === 'APPROVED';
          if (statusFilter === 'PENDING') matchStatus = i.status === 'PENDING_APPROVAL';
          if (statusFilter === 'REJECTED') matchStatus = i.status === 'REJECTED';

          return matchSearch && matchType && matchStatus;
      });

      return filtered.sort((a: OperatorInventoryItem, b: OperatorInventoryItem) => {
          const key = sortConfig.key;
          
          const multiplier = sortConfig.direction === 'asc' ? 1 : -1;

          if (key === 'createdAt') {
              const dateA = new Date(a.createdAt).getTime();
              const dateB = new Date(b.createdAt).getTime();
              return (dateA - dateB) * multiplier;
          }

          const k = key as keyof OperatorInventoryItem;
          const aVal = a[k];
          const bVal = b[k];

          if (aVal === bVal) return 0;
          
          if (key === 'costPrice') {
             const costA = a.type === 'ACTIVITY' ? (a.costAdult || 0) : (a.costPrice || 0);
             const costB = b.type === 'ACTIVITY' ? (b.costAdult || 0) : (b.costPrice || 0);
             return (costA - costB) * multiplier;
          }
          
          return ((aVal as any) > (bVal as any) ? 1 : -1) * multiplier;
      });
  }, [items, searchTerm, typeFilter, statusFilter, sortConfig]);

  const handleOpenModal = (item?: any) => {
      setActiveTab('GENERAL');
      if (item) {
          setEditingItem(item);
          setFormData({ 
              ...item,
              inclusionsText: item.inclusions ? item.inclusions.join('\n') : '',
              exclusionsText: item.exclusions ? item.exclusions.join('\n') : '',
              datesText: item.validDates ? item.validDates.join(', ') : '',
              itinerary: item.itinerary || [],
              dateType: (item as any).dateType || (item.validFrom ? 'RANGE' : 'SPECIFIC') // Determine date type
          });
          setTransferOpts(item.transferOptions || DEFAULT_TRANSFER_OPTS);
          setPricingTiers(item.pricingTiers || DEFAULT_PRICING_TIERS);
      } else {
          setEditingItem(null);
          setFormData({
              type: 'HOTEL',
              currency: 'INR',
              status: 'PENDING_APPROVAL',
              destinationId: destinations[0]?.id || '',
              inclusionsText: '',
              exclusionsText: '',
              datesText: '',
              itinerary: [],
              dateType: 'SPECIFIC'
          });
          setTransferOpts(DEFAULT_TRANSFER_OPTS);
          setPricingTiers(DEFAULT_PRICING_TIERS);
      }
      setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      
      setIsSaving(true);
      try {
          const payload: any = { ...formData };
          if (payload.type === 'ACTIVITY') {
              payload.transferOptions = transferOpts;
          }
          if (payload.type === 'PACKAGE') {
              payload.inclusions = formData.inclusionsText?.split('\n').map(s => s.trim()).filter(s => s) || [];
              payload.exclusions = formData.exclusionsText?.split('\n').map(s => s.trim()).filter(s => s) || [];
              payload.pricingTiers = pricingTiers;
              
              payload.dateType = formData.dateType || 'SPECIFIC';
              if (payload.dateType === 'SPECIFIC') {
                  payload.validDates = formData.datesText?.split(',').map(s => s.trim()).filter(s => s) || [];
                  payload.validFrom = null; 
                  payload.validTo = null;
              } else {
                  payload.validDates = [];
                  if (!payload.validFrom || !payload.validTo) {
                      throw new Error("Valid From and To dates are required for Date Range.");
                  }
              }

              payload.fixedPrice = pricingTiers.twin || payload.costPrice;
              payload.costPrice = pricingTiers.twin || payload.costPrice;
              
              payload.itinerary = formData.itinerary || [];
          }
          
          payload.currency = 'INR';

          delete payload.inclusionsText;
          delete payload.exclusionsText;
          delete payload.datesText;

          if (editingItem) {
              await inventoryService.updateItem(editingItem.id, payload, user);
          } else {
              await inventoryService.createItem(payload, user);
          }
          
          setIsModalOpen(false);
          await refreshList();
      } catch (err: any) {
          alert("Error saving inventory: " + err.message);
      } finally {
          setIsSaving(false);
      }
  };

  const handleDelete = async (id: string) => {
      if(confirm("Are you sure? This will remove the item permanently.")) {
          alert("Deletion logic pending implementation in service.");
      }
  };

  const updateSic = (field: string, value: any) => setTransferOpts(prev => ({ ...prev, sic: { ...prev.sic, [field]: value } }));
  const updatePvt = (field: string, value: any) => setTransferOpts(prev => ({ ...prev, pvt: { ...prev.pvt, [field]: value } }));
  const updateTier = (field: keyof PackagePricingTiers, value: number) => {
      setPricingTiers(prev => ({ ...prev, [field]: value }));
  };

  const handleAddDay = () => {
      const current = formData.itinerary || [];
      const dayNum = current.length + 1;
      const newDay: ItineraryItem = {
          day: dayNum,
          title: `Day ${dayNum}`,
          description: '',
          services: [] 
      };
      setFormData({...formData, itinerary: [...current, newDay]});
  };

  const handleUpdateDay = (idx: number, field: keyof ItineraryItem, val: any) => {
      const current = [...(formData.itinerary || [])];
      current[idx] = { ...current[idx], [field]: val };
      setFormData({...formData, itinerary: current});
  };

  const handleRemoveDay = (idx: number) => {
      const current = [...(formData.itinerary || [])];
      current.splice(idx, 1);
      const updated = current.map((day, i) => ({ ...day, day: i + 1 }));
      setFormData({...formData, itinerary: updated});
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
      if (sortConfig.key !== col) return <ArrowUpDown size={14} className="text-slate-300 ml-1" />;
      return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-brand-600 ml-1" /> : <ArrowDown size={14} className="text-brand-600 ml-1" />;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* ... (Header and Bulk Actions are same) ... */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Box className="text-brand-600" /> Inventory Management
          </h1>
          <p className="text-slate-500">Manage your services, rates, and approval status.</p>
        </div>
        <button 
            onClick={() => handleOpenModal()}
            className="bg-brand-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-brand-700 transition shadow-lg shadow-brand-200 font-bold transform hover:-translate-y-0.5"
        >
            <Plus size={18} /> Add New Item
        </button>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
          <div className="bg-brand-50 border border-brand-200 p-4 rounded-xl mb-6 flex items-center justify-between animate-in slide-in-from-top-2">
              <div className="flex items-center gap-4">
                  <span className="bg-brand-600 text-white px-3 py-1 rounded-lg text-sm font-bold shadow-sm">{selectedIds.size} Selected</span>
                  <div className="h-6 w-px bg-brand-200"></div>
                  {isBulkEditOpen ? (
                      <div className="flex items-center gap-2">
                          <input 
                              type="number" 
                              placeholder="New Rate" 
                              value={bulkRate} 
                              onChange={e => setBulkRate(e.target.value)} 
                              className="w-32 px-3 py-1.5 border border-brand-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                              autoFocus
                          />
                          <button onClick={handleBulkUpdateRate} disabled={isSaving} className="px-3 py-1.5 bg-brand-600 text-white rounded-lg text-sm font-bold hover:bg-brand-700 shadow-sm disabled:opacity-50">
                              {isSaving ? 'Updating...' : 'Confirm'}
                          </button>
                          <button onClick={() => setIsBulkEditOpen(false)} className="p-1.5 text-brand-700 hover:bg-brand-100 rounded"><X size={16}/></button>
                      </div>
                  ) : (
                      <button onClick={() => setIsBulkEditOpen(true)} className="flex items-center gap-2 text-sm font-bold text-brand-700 hover:text-brand-900 transition">
                          <DollarSign size={16} /> Bulk Update Rates
                      </button>
                  )}
              </div>
              <button onClick={() => setSelectedIds(new Set())} className="text-sm text-slate-500 hover:text-slate-800">Deselect All</button>
          </div>
      )}

      {/* ... (Filters block same as before) ... */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              
              {/* Type Filter */}
              <div className="flex bg-slate-100 p-1 rounded-lg">
                  {(['ALL', 'HOTEL', 'ACTIVITY', 'TRANSFER', 'PACKAGE'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => setTypeFilter(type)}
                        className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${typeFilter === type ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                          {type === 'ALL' ? 'All Types' : type === 'PACKAGE' ? 'Fixed Pkg' : type}
                      </button>
                  ))}
              </div>

              {/* Status Filter */}
              <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button onClick={() => setStatusFilter('ALL')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${statusFilter === 'ALL' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>All</button>
                  <button onClick={() => setStatusFilter('APPROVED')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${statusFilter === 'APPROVED' ? 'bg-green-100 text-green-700 shadow-sm' : 'text-slate-500'}`}>Approved</button>
                  <button onClick={() => setStatusFilter('PENDING')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${statusFilter === 'PENDING' ? 'bg-amber-100 text-amber-700 shadow-sm' : 'text-slate-500'}`}>Pending</button>
                  <button onClick={() => setStatusFilter('REJECTED')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${statusFilter === 'REJECTED' ? 'bg-red-100 text-red-700 shadow-sm' : 'text-slate-500'}`}>Rejected</button>
              </div>

              {/* Search */}
              <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <input 
                      type="text" 
                      placeholder="Search items..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                  />
              </div>
          </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase text-xs">
            <tr>
              <th className="px-6 py-4 w-10">
                  <div className="flex items-center justify-center">
                    <input 
                        type="checkbox" 
                        onChange={handleSelectAll} 
                        checked={processedItems.length > 0 && selectedIds.size === processedItems.length}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer" 
                    />
                  </div>
              </th>
              <th className="px-6 py-4 font-semibold w-16">Image</th>
              <th className="px-6 py-4 font-semibold cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort('name')}>
                  <div className="flex items-center">Service Name <SortIcon col='name'/></div>
              </th>
              <th className="px-6 py-4 font-semibold">Type</th>
              <th className="px-6 py-4 font-semibold cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort('costPrice')}>
                  <div className="flex items-center">Net Rate (You) <SortIcon col='costPrice'/></div>
              </th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort('createdAt')}>
                   <div className="flex items-center">Last Updated <SortIcon col='createdAt'/></div>
              </th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {processedItems.map(item => (
              <tr key={item.id} className={`transition ${selectedIds.has(item.id) ? 'bg-brand-50/50' : 'hover:bg-slate-50'}`}>
                {/* ... (Checkbox, Image, Name, Type columns same as before) ... */}
                <td className="px-6 py-4 text-center">
                    <input 
                        type="checkbox" 
                        checked={selectedIds.has(item.id)} 
                        onChange={() => handleSelectRow(item.id)}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer" 
                    />
                </td>
                <td className="px-6 py-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200">
                        {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                            <ImageIcon size={16} className="text-slate-400" />
                        )}
                    </div>
                </td>
                <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 text-base">{item.name}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                        <GitBranch size={10} /> v{item.version}
                        {item.type === 'HOTEL' && <span className="bg-slate-100 px-1.5 rounded">{item.category}</span>}
                    </div>
                </td>
                <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold border flex items-center w-fit gap-1 ${
                        item.type === 'HOTEL' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                        item.type === 'ACTIVITY' ? 'bg-pink-50 text-pink-700 border-pink-100' :
                        item.type === 'PACKAGE' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                        'bg-blue-50 text-blue-700 border-blue-100'
                    }`}>
                        {item.type === 'HOTEL' && <Box size={10}/>}
                        {item.type === 'ACTIVITY' && <Ticket size={10}/>}
                        {item.type === 'TRANSFER' && <Car size={10}/>}
                        {item.type === 'PACKAGE' && <Package size={10}/>}
                        {item.type}
                    </span>
                </td>
                <td className="px-6 py-4 font-mono text-slate-700">
                    {item.currency} {item.type === 'ACTIVITY' ? item.costAdult : item.costPrice}
                    {item.type === 'ACTIVITY' && <span className="text-[10px] text-slate-400 block">Base Adult</span>}
                    {item.type === 'PACKAGE' && <span className="text-[10px] text-slate-400 block">Twin Share</span>}
                </td>
                <td className="px-6 py-4">
                    <InventoryStatusBadge status={item.status} reason={item.rejectionReason} />
                </td>
                <td className="px-6 py-4 text-xs text-slate-500">
                    {new Date(item.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                        <button 
                            onClick={() => handleOpenModal(item)}
                            className="p-2 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition"
                            title="Edit Item"
                        >
                            <Edit2 size={16} />
                        </button>
                        {item.status === 'DRAFT' || item.status === 'REJECTED' ? (
                            <button 
                                onClick={() => handleDelete(item.id)}
                                className="p-2 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition"
                                title="Delete"
                            >
                                <Trash2 size={16} />
                            </button>
                        ) : null}
                    </div>
                </td>
              </tr>
            ))}
            {processedItems.length === 0 && (
                <tr>
                    <td colSpan={8} className="px-6 py-16 text-center text-slate-400 italic">
                        <Box size={40} className="mx-auto mb-3 opacity-20" />
                        No inventory items found. Click "Add New Item" to start.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- ADD/EDIT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-0 shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-20">
              <div>
                  <h2 className="text-xl font-bold text-slate-900">
                      {editingItem ? 'Edit Inventory Item' : 'Submit New Inventory'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Changes require Admin approval before going live.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition"><X size={24}/></button>
            </div>
            
            {/* TABS */}
            <div className="flex border-b border-slate-200 px-6 sticky top-[80px] z-10 bg-white">
                <button 
                    onClick={() => setActiveTab('GENERAL')}
                    className={`px-4 py-3 text-sm font-bold border-b-2 transition flex items-center gap-2 ${activeTab === 'GENERAL' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <FileText size={16} /> General Info
                </button>
                {formData.type === 'PACKAGE' && (
                     <button 
                        onClick={() => setActiveTab('ITINERARY')}
                        className={`px-4 py-3 text-sm font-bold border-b-2 transition flex items-center gap-2 ${activeTab === 'ITINERARY' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <Layers size={16} /> Itinerary
                    </button>
                )}
                <button 
                    onClick={() => setActiveTab('PRICING')}
                    className={`px-4 py-3 text-sm font-bold border-b-2 transition flex items-center gap-2 ${activeTab === 'PRICING' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <DollarSign size={16} /> Pricing & Config
                </button>
                <button 
                    onClick={() => setActiveTab('MEDIA')}
                    className={`px-4 py-3 text-sm font-bold border-b-2 transition flex items-center gap-2 ${activeTab === 'MEDIA' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <ImageIcon size={16} /> Media
                </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                <div className="p-6 space-y-6">
                    {/* ... (GENERAL and ITINERARY tabs same as before) ... */}
                    
                    {/* TAB: GENERAL */}
                    {activeTab === 'GENERAL' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Service Type</label>
                                    <select 
                                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-medium focus:ring-2 focus:ring-brand-500 outline-none"
                                        value={formData.type}
                                        onChange={e => setFormData({...formData, type: e.target.value as any})}
                                        disabled={!!editingItem} 
                                    >
                                        <option value="HOTEL">Hotel</option>
                                        <option value="ACTIVITY">Activity / Tour</option>
                                        <option value="TRANSFER">Transfer</option>
                                        <option value="PACKAGE">Fixed Departure Package</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Destination</label>
                                    <select 
                                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                                        value={formData.destinationId}
                                        onChange={e => setFormData({...formData, destinationId: e.target.value})}
                                        required
                                    >
                                        <option value="">Select City...</option>
                                        {destinations.map(d => <option key={d.id} value={d.id}>{d.city}, {d.country}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{formData.type === 'PACKAGE' ? 'Package Title' : 'Service Name'}</label>
                                    <input 
                                        required
                                        type="text" 
                                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none font-medium"
                                        placeholder={formData.type === 'HOTEL' ? 'e.g. Marina Byblos Hotel' : 'e.g. Desert Safari'}
                                        value={formData.name || ''}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                    />
                                </div>
                                {formData.type === 'PACKAGE' && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Duration (Nights)</label>
                                        <input 
                                            required
                                            type="number" 
                                            min="1"
                                            className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none font-medium"
                                            value={formData.nights || ''}
                                            onChange={e => setFormData({...formData, nights: Number(e.target.value)})}
                                        />
                                    </div>
                                )}
                            </div>

                            <RichTextEditor 
                                label={formData.type === 'PACKAGE' ? "Detailed Itinerary & Overview" : "Description & Inclusions"}
                                value={formData.description || ''}
                                onChange={val => setFormData({...formData, description: val})}
                                placeholder="Provide detailed description..."
                                height="h-64"
                            />
                        </div>
                    )}
                    
                    {/* TAB: ITINERARY (PACKAGE ONLY) */}
                    {activeTab === 'ITINERARY' && formData.type === 'PACKAGE' && (
                         <div className="space-y-6 animate-in fade-in">
                             <div className="flex justify-between items-center mb-4">
                                 <h3 className="font-bold text-slate-800">Day-wise Plan</h3>
                                 <button 
                                    type="button" 
                                    onClick={handleAddDay} 
                                    className="text-xs bg-brand-50 text-brand-700 px-3 py-1.5 rounded-lg border border-brand-200 font-bold hover:bg-brand-100 flex items-center gap-1"
                                 >
                                     <Plus size={12}/> Add Day
                                 </button>
                             </div>

                             <div className="space-y-4">
                                 {(!formData.itinerary || formData.itinerary.length === 0) && (
                                     <div className="text-center p-8 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 italic">
                                         No itinerary days defined. Click "Add Day" to start.
                                     </div>
                                 )}
                                 
                                 {formData.itinerary?.map((day, idx) => (
                                     <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm relative group">
                                         <button 
                                            type="button" 
                                            onClick={() => handleRemoveDay(idx)} 
                                            className="absolute top-4 right-4 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                                         >
                                             <Trash2 size={16}/>
                                         </button>
                                         
                                         <div className="flex items-center gap-3 mb-3">
                                             <span className="bg-white border border-slate-200 text-slate-700 px-2 py-1 rounded text-xs font-bold shadow-sm">Day {day.day}</span>
                                             <input 
                                                 type="text" 
                                                 placeholder="Day Title (e.g. Arrival)" 
                                                 value={day.title}
                                                 onChange={e => handleUpdateDay(idx, 'title', e.target.value)}
                                                 className="flex-1 border-b border-transparent hover:border-slate-300 focus:border-brand-500 bg-transparent px-2 py-1 text-sm font-bold text-slate-800 outline-none transition"
                                             />
                                         </div>
                                         
                                         <RichTextEditor 
                                             label=""
                                             value={day.description || ''}
                                             onChange={(val) => handleUpdateDay(idx, 'description', val)}
                                             placeholder="Detailed activities for this day..."
                                             height="h-32"
                                         />
                                     </div>
                                 ))}
                             </div>
                         </div>
                    )}

                    {/* TAB: PRICING */}
                    {activeTab === 'PRICING' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 flex items-start gap-3">
                                <Info className="text-blue-600 shrink-0 mt-0.5" size={20} />
                                <div className="text-sm text-blue-900">
                                    <strong>Important:</strong> Enter your <strong>NET RATE</strong> (Payable to You). <br/>
                                    The system will automatically add the admin markup before showing prices to agents. Do not add markup here.
                                </div>
                            </div>
                            
                            {/* D. PACKAGE FORM */}
                            {formData.type === 'PACKAGE' && (
                                <div className="space-y-6">
                                    {/* ... Accommodation Section same ... */}
                                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200">
                                        <h4 className="text-xs font-bold text-indigo-800 uppercase mb-3 flex items-center gap-2"><Hotel size={14}/> Accommodation Details</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hotel Name</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                                                    value={formData.hotelName || ''}
                                                    onChange={e => setFormData({...formData, hotelName: e.target.value})}
                                                    placeholder="e.g. Citymax Hotel"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                                                <select 
                                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white"
                                                    value={formData.category || ''}
                                                    onChange={e => setFormData({...formData, category: e.target.value})}
                                                >
                                                    <option value="">Select Rating...</option>
                                                    <option>3 Star</option>
                                                    <option>4 Star</option>
                                                    <option>5 Star</option>
                                                    <option>Luxury</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                                        {/* ... Date Logic same ... */}
                                         <h4 className="text-xs font-bold text-orange-800 uppercase mb-3 flex items-center gap-2"><Package size={14}/> Package Specifics</h4>
                                        
                                        {/* Date Type Selector */}
                                        <div className="flex gap-4 mb-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="radio" 
                                                    name="dateType"
                                                    checked={formData.dateType === 'SPECIFIC' || !formData.dateType} // Default
                                                    onChange={() => setFormData({...formData, dateType: 'SPECIFIC'})}
                                                    className="text-orange-600 focus:ring-orange-500"
                                                />
                                                <span className="text-sm font-medium text-slate-700">Specific Dates</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="radio" 
                                                    name="dateType" 
                                                    checked={formData.dateType === 'RANGE'}
                                                    onChange={() => setFormData({...formData, dateType: 'RANGE'})}
                                                    className="text-orange-600 focus:ring-orange-500"
                                                />
                                                <span className="text-sm font-medium text-slate-700">Daily / Date Range</span>
                                            </label>
                                        </div>

                                        {/* Inputs based on type */}
                                        {formData.dateType === 'RANGE' ? (
                                            <div className="grid grid-cols-2 gap-4 mb-4 animate-in fade-in">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valid From</label>
                                                    <input 
                                                        type="date" 
                                                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                                                        value={formData.validFrom || ''}
                                                        onChange={e => setFormData({...formData, validFrom: e.target.value})}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valid To</label>
                                                    <input 
                                                        type="date" 
                                                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                                                        value={formData.validTo || ''}
                                                        onChange={e => setFormData({...formData, validTo: e.target.value})}
                                                    />
                                                </div>
                                                <p className="text-[10px] text-slate-500 col-span-2 flex items-center gap-1">
                                                    <CalendarRange size={12} /> Package is available for daily departure between these dates.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="mb-4 animate-in fade-in">
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Specific Departure Dates</label>
                                                <textarea 
                                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-mono h-24 resize-none"
                                                    placeholder="2024-10-15, 2024-11-20, 2024-12-05"
                                                    value={formData.datesText || ''}
                                                    onChange={e => setFormData({...formData, datesText: e.target.value})}
                                                />
                                                <p className="text-[10px] text-slate-500 mt-1">Enter dates in YYYY-MM-DD format, separated by commas.</p>
                                            </div>
                                        )}
                                        
                                        {/* NEW: Tiered Pricing Grid */}
                                        <div className="mt-6 border-t border-orange-200 pt-4">
                                            <label className="block text-xs font-bold text-slate-700 uppercase mb-2 flex items-center gap-2">
                                                <Users size={14}/> Tiered Pricing (Your Net Cost in INR)
                                            </label>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white p-3 rounded-lg border border-slate-200">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Solo Pax</label>
                                                    <input type="number" min="0" className="w-full border p-2 rounded text-sm font-mono" placeholder="0" value={pricingTiers.solo} onChange={e => updateTier('solo', Number(e.target.value))} />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 mb-1">2 Pax Base</label>
                                                    <input type="number" min="0" className="w-full border p-2 rounded text-sm font-mono font-bold bg-brand-50" placeholder="0" value={pricingTiers.twin} onChange={e => updateTier('twin', Number(e.target.value))} />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 mb-1">4 Pax Base</label>
                                                    <input type="number" min="0" className="w-full border p-2 rounded text-sm font-mono" placeholder="0" value={pricingTiers.quad} onChange={e => updateTier('quad', Number(e.target.value))} />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 mb-1">6 Pax Base</label>
                                                    <input type="number" min="0" className="w-full border p-2 rounded text-sm font-mono" placeholder="0" value={pricingTiers.six} onChange={e => updateTier('six', Number(e.target.value))} />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 mt-3 bg-white p-3 rounded-lg border border-slate-200">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Child With Bed</label>
                                                    <input type="number" min="0" className="w-full border p-2 rounded text-sm font-mono" placeholder="0" value={pricingTiers.childWithBed} onChange={e => updateTier('childWithBed', Number(e.target.value))} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-400 mb-1">Child No Bed</label>
                                                    <input type="number" min="0" className="w-full border p-2 rounded text-sm font-mono" placeholder="0" value={pricingTiers.childNoBed} onChange={e => updateTier('childNoBed', Number(e.target.value))} />
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-2">Enter the Net Cost per person. We calculate total and add system markup.</p>
                                        </div>

                                    </div>

                                    {/* ... Inclusions/Exclusions same ... */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Inclusions (One per line)</label>
                                            <textarea 
                                                rows={5}
                                                className="w-full border border-slate-300 rounded-lg p-2 text-sm resize-none focus:ring-2 focus:ring-brand-500 outline-none"
                                                placeholder="Accommodation&#10;Breakfast&#10;Transfers"
                                                value={formData.inclusionsText || ''}
                                                onChange={e => setFormData({...formData, inclusionsText: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Exclusions (One per line)</label>
                                            <textarea 
                                                rows={5}
                                                className="w-full border border-slate-300 rounded-lg p-2 text-sm resize-none focus:ring-2 focus:ring-brand-500 outline-none"
                                                placeholder="Flights&#10;Visa Cost"
                                                value={formData.exclusionsText || ''}
                                                onChange={e => setFormData({...formData, exclusionsText: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* A. ACTIVITY FORM */}
                            {formData.type === 'ACTIVITY' && (
                                <div className="space-y-4">
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Net Ticket Cost (INR)</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs text-slate-500 mb-1">Adult Net</label>
                                                <input required type="number" min="0" value={formData.costAdult} onChange={e => setFormData({...formData, costAdult: Number(e.target.value), costPrice: Number(e.target.value)})} className="w-full border border-slate-300 rounded-lg p-2 font-mono" />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-slate-500 mb-1">Child Net</label>
                                                <input required type="number" min="0" value={formData.costChild} onChange={e => setFormData({...formData, costChild: Number(e.target.value)})} className="w-full border border-slate-300 rounded-lg p-2 font-mono" />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* ... Transfer Toggles same ... */}
                                    <div className="space-y-3 p-4 border border-slate-200 rounded-xl">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Transfer Add-ons (Net Cost)</h4>
                                        
                                        <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                                            <input type="checkbox" checked={transferOpts.sic.enabled} onChange={e => updateSic('enabled', e.target.checked)} className="rounded text-brand-600 focus:ring-brand-500" />
                                            <Bus size={16} className="text-blue-500"/> Enable Shared Transfer (SIC)
                                        </label>
                                        {transferOpts.sic.enabled && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-500">Cost/Pax:</span>
                                                <input type="number" min="0" value={transferOpts.sic.costPerPerson} onChange={e => updateSic('costPerPerson', Number(e.target.value))} className="w-24 border border-slate-300 rounded p-1.5 font-mono text-sm" />
                                            </div>
                                        )}
                                        </div>

                                        <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                                            <input type="checkbox" checked={transferOpts.pvt.enabled} onChange={e => updatePvt('enabled', e.target.checked)} className="rounded text-brand-600 focus:ring-brand-500" />
                                            <Car size={16} className="text-purple-500"/> Enable Private Transfer (PVT)
                                        </label>
                                        </div>
                                        {transferOpts.pvt.enabled && (
                                            <div className="pl-6 grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                <div>
                                                <label className="block text-xs text-slate-500 mb-1">Cost Per Vehicle</label>
                                                <input type="number" min="0" value={transferOpts.pvt.costPerVehicle} onChange={e => updatePvt('costPerVehicle', Number(e.target.value))} className="w-full border border-slate-300 rounded p-1.5 font-mono text-sm" />
                                                </div>
                                                <div>
                                                <label className="block text-xs text-slate-500 mb-1">Vehicle Capacity</label>
                                                <input type="number" min="1" value={transferOpts.pvt.vehicleCapacity} onChange={e => updatePvt('vehicleCapacity', Number(e.target.value))} className="w-full border border-slate-300 rounded p-1.5 font-mono text-sm" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* B. TRANSFER FORM */}
                            {formData.type === 'TRANSFER' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vehicle Type</label>
                                            <input required type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" placeholder="e.g. Toyota Innova" value={formData.vehicleType || ''} onChange={e => setFormData({...formData, vehicleType: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Max Pax</label>
                                            <input required type="number" min="1" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" value={formData.maxPassengers || ''} onChange={e => setFormData({...formData, maxPassengers: Number(e.target.value)})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Luggage Bags</label>
                                            <input required type="number" min="0" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" value={formData.luggageCapacity || ''} onChange={e => setFormData({...formData, luggageCapacity: Number(e.target.value)})} />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Net Cost Per Vehicle (INR)</label>
                                            <input required type="number" min="0" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-bold font-mono" value={formData.costPrice || ''} onChange={e => setFormData({...formData, costPrice: Number(e.target.value)})} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* C. HOTEL FORM */}
                            {formData.type === 'HOTEL' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Star Category</label>
                                            <select className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})}>
                                                <option>3 Star</option><option>4 Star</option><option>5 Star</option><option>Luxury</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Meal Plan</label>
                                            <select className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white" value={formData.mealPlan} onChange={e => setFormData({...formData, mealPlan: e.target.value as any})}>
                                                <option>RO</option><option>BB</option><option>HB</option><option>FB</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Net Cost Per Room (INR)</label>
                                            <input 
                                                required
                                                type="number" 
                                                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-mono font-bold"
                                                placeholder="0.00"
                                                value={formData.costPrice || ''}
                                                onChange={e => setFormData({...formData, costPrice: Number(e.target.value)})}
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Room Type</label>
                                            <input required type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" placeholder="e.g. Deluxe Sea View" value={formData.roomType || ''} onChange={e => setFormData({...formData, roomType: e.target.value})} />
                                        </div>
                                    </div>
                                </div>
                            )}

                             {/* Date Validity (Common for all except Package which uses specific dates/range logic above) */}
                             {formData.type !== 'PACKAGE' && (
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valid From</label>
                                        <input type="date" className="w-full border border-slate-300 rounded-lg p-2 text-sm" value={formData.validFrom || ''} onChange={e => setFormData({...formData, validFrom: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valid To</label>
                                        <input type="date" className="w-full border border-slate-300 rounded-lg p-2 text-sm" value={formData.validTo || ''} onChange={e => setFormData({...formData, validTo: e.target.value})} />
                                    </div>
                                </div>
                             )}
                        </div>
                    )}

                    {/* TAB: MEDIA */}
                    {activeTab === 'MEDIA' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Image URL</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={formData.imageUrl || ''} 
                                        onChange={e => setFormData({...formData, imageUrl: e.target.value})} 
                                        className="flex-1 border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                        placeholder="https://example.com/image.jpg"
                                    />
                                </div>
                                <p className="text-xs text-slate-400 mt-1">Paste a public URL for the main image.</p>
                            </div>

                            {/* Preview */}
                            <div className="bg-slate-50 rounded-xl border border-slate-200 h-48 flex items-center justify-center overflow-hidden">
                                {formData.imageUrl ? (
                                    <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-center text-slate-300">
                                        <ImageIcon size={32} className="mx-auto mb-2" />
                                        <span className="text-sm">Image Preview</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </form>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl sticky bottom-0 z-20">
                <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="px-5 py-2.5 text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg text-sm font-medium transition"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleSubmit} 
                    disabled={isSaving}
                    className="bg-brand-600 text-white px-8 py-2.5 rounded-lg hover:bg-brand-700 font-bold shadow-md transition flex items-center gap-2 disabled:opacity-70"
                >
                    <Save size={18} /> {isSaving ? 'Submitting...' : 'Submit for Approval'}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
