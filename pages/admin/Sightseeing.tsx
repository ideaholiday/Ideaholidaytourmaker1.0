
import React, { useState } from 'react';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { UserRole, Activity } from '../../types';
import { Edit2, Trash2, Plus, X, Camera } from 'lucide-react';
import { InventoryImportExport } from '../../components/admin/InventoryImportExport';

export const Sightseeing: React.FC = () => {
  const { user } = useAuth();
  const allDestinations = adminService.getDestinations();
  const allActivities = adminService.getActivities();
  
  // Operators now have full access
  const canEdit = user?.role === UserRole.ADMIN || user?.role === UserRole.STAFF || user?.role === UserRole.OPERATOR;
  
  // Agents should NOT see the Cost Price (Net Rate)
  const showCost = user?.role !== UserRole.AGENT;

  // Filter for Operators: Only see what they created. Admins/Staff see all.
  const displayedActivities = user?.role === UserRole.OPERATOR 
    ? allActivities.filter(a => a.createdBy === user.id)
    : allActivities;

  const [activities, setActivities] = useState<Activity[]>(displayedActivities);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  
  const [formData, setFormData] = useState<Partial<Activity>>({});

  const handleOpenModal = (activity?: Activity) => {
    if (activity) {
      setEditingActivity(activity);
      setFormData(activity);
    } else {
      setEditingActivity(null);
      setFormData({ 
        isActive: true,
        destinationId: allDestinations[0]?.id || '',
        activityType: 'City Tour',
        ticketIncluded: false,
        transferIncluded: false,
        costAdult: 0,
        costChild: 0,
        description: '',
        notes: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.activityName || !formData.destinationId) return;

    adminService.saveActivity({
      id: editingActivity?.id || '',
      activityName: formData.activityName!,
      destinationId: formData.destinationId!,
      activityType: (formData.activityType || 'City Tour') as any,
      costAdult: Number(formData.costAdult),
      costChild: Number(formData.costChild),
      ticketIncluded: formData.ticketIncluded || false,
      transferIncluded: formData.transferIncluded || false,
      isActive: formData.isActive || false,
      createdBy: editingActivity?.createdBy || user?.id,
      description: formData.description,
      notes: formData.notes
    });

    setActivities(adminService.getActivities());
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this activity?')) {
      adminService.deleteActivity(id);
      setActivities(adminService.getActivities());
    }
  };

  // Bulk Import
  const handleBulkImport = (data: any[]) => {
      let count = 0;
      data.forEach(item => {
          if (item.activityName && item.destinationId) {
              adminService.saveActivity({
                  id: item.id || '',
                  activityName: item.activityName,
                  destinationId: item.destinationId,
                  activityType: item.activityType || 'City Tour',
                  costAdult: Number(item.costAdult || 0),
                  costChild: Number(item.costChild || 0),
                  ticketIncluded: item.ticketIncluded === true || item.ticketIncluded === 'TRUE',
                  transferIncluded: item.transferIncluded === true || item.transferIncluded === 'TRUE',
                  isActive: item.isActive === true || item.isActive === 'TRUE',
                  description: item.description || '',
                  notes: item.notes || '',
                  createdBy: user?.id
              });
              count++;
          }
      });
      alert(`Successfully processed ${count} activities.`);
      setActivities(adminService.getActivities());
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sightseeing & Activities</h1>
          <p className="text-slate-500">Manage tours, tickets, and excursion inventory.</p>
        </div>
        {canEdit && (
            <div className="flex gap-3">
                <InventoryImportExport 
                    data={displayedActivities}
                    headers={['id', 'activityName', 'destinationId', 'activityType', 'costAdult', 'costChild', 'ticketIncluded', 'transferIncluded', 'isActive', 'description']}
                    filename="activities"
                    onImport={handleBulkImport}
                />
                <button onClick={() => handleOpenModal()} className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 transition shadow-sm">
                    <Plus size={18} /> Add Activity
                </button>
            </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 font-semibold">Activity Name</th>
              <th className="px-6 py-4 font-semibold">Destination</th>
              <th className="px-6 py-4 font-semibold">Type</th>
              {showCost && <th className="px-6 py-4 font-semibold">Cost (Ad/Ch)</th>}
              <th className="px-6 py-4 font-semibold">Inclusions</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              {canEdit && <th className="px-6 py-4 font-semibold text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {activities.map((activity) => {
              const dest = allDestinations.find(d => d.id === activity.destinationId);
              return (
                <tr key={activity.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 font-medium text-slate-900">
                      <Camera size={16} className="text-slate-400" />
                      {activity.activityName}
                    </div>
                    {activity.description && <p className="text-xs text-slate-400 mt-1 truncate max-w-[200px]">{activity.description}</p>}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{dest?.city}</td>
                  <td className="px-6 py-4 text-slate-600">{activity.activityType}</td>
                  {showCost && (
                    <td className="px-6 py-4 text-slate-900 font-mono">
                        {activity.costAdult} / {activity.costChild}
                    </td>
                  )}
                  <td className="px-6 py-4 text-xs space-y-1">
                    {activity.ticketIncluded && <span className="block text-green-600">✓ Ticket</span>}
                    {activity.transferIncluded && <span className="block text-blue-600">✓ Transfer</span>}
                    {!activity.ticketIncluded && !activity.transferIncluded && <span className="text-slate-400">-</span>}
                  </td>
                  <td className="px-6 py-4">
                     <span className={`px-2 py-1 rounded-full text-xs font-semibold ${activity.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                      {activity.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-6 py-4 text-right">
                        <button onClick={() => handleOpenModal(activity)} className="p-2 text-slate-500 hover:text-brand-600 transition">
                        <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(activity.id)} className="p-2 text-slate-500 hover:text-red-600 transition ml-2">
                        <Trash2 size={16} />
                        </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {activities.length === 0 && (
          <div className="p-8 text-center text-slate-500">
              {user?.role === UserRole.OPERATOR 
                    ? "You haven't added any activities yet." 
                    : "No activities found."}
          </div>
        )}
      </div>

      {isModalOpen && canEdit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-900">{editingActivity ? 'Edit' : 'Add'} Activity</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Activity Name</label>
                <input required type="text" value={formData.activityName || ''} onChange={e => setFormData({...formData, activityName: e.target.value})} className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" placeholder="e.g. Desert Safari" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Destination</label>
                <select value={formData.destinationId} onChange={e => setFormData({...formData, destinationId: e.target.value})} className="w-full border p-2 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none">
                  {allDestinations.map(d => <option key={d.id} value={d.id}>{d.city}, {d.country}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select value={formData.activityType} onChange={e => setFormData({...formData, activityType: e.target.value as any})} className="w-full border p-2 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none">
                  <option>City Tour</option>
                  <option>Adventure</option>
                  <option>Cruise</option>
                  <option>Show</option>
                  <option>Theme Park</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cost (Adult)</label>
                <input required type="number" min="0" value={formData.costAdult || ''} onChange={e => setFormData({...formData, costAdult: Number(e.target.value)})} className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cost (Child)</label>
                <input required type="number" min="0" value={formData.costChild || ''} onChange={e => setFormData({...formData, costChild: Number(e.target.value)})} className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Description (Public)</label>
                <textarea 
                  rows={2}
                  value={formData.description || ''} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                  placeholder="What guests should expect..."
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Internal Notes</label>
                <textarea 
                  rows={2}
                  value={formData.notes || ''} 
                  onChange={e => setFormData({...formData, notes: e.target.value})} 
                  className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none bg-slate-50"
                  placeholder="Operational details, supplier info..."
                />
              </div>

              <div className="col-span-2 flex gap-6 pt-2">
                 <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.ticketIncluded || false} onChange={e => setFormData({...formData, ticketIncluded: e.target.checked})} className="rounded text-brand-600 focus:ring-brand-500" />
                    <span className="text-sm text-slate-700">Ticket Included</span>
                 </label>
                 <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.transferIncluded || false} onChange={e => setFormData({...formData, transferIncluded: e.target.checked})} className="rounded text-brand-600 focus:ring-brand-500" />
                    <span className="text-sm text-slate-700">Transfer Included</span>
                 </label>
                 <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.isActive || false} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="rounded text-brand-600 focus:ring-brand-500" />
                    <span className="text-sm text-slate-700">Active</span>
                 </label>
              </div>

              <div className="col-span-2 pt-4 border-t flex justify-end gap-3">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                 <button type="submit" className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700">Save Activity</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};