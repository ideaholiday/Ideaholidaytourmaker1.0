
import React, { useState, useEffect } from 'react';
import { auditLogService } from '../../services/auditLogService';
import { AuditLog, EntityType } from '../../types';
import { Search, Filter, ShieldCheck, Clock, User, FileText, ChevronDown, ChevronRight } from 'lucide-react';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  
  // Filter States
  const [filterEntity, setFilterEntity] = useState<EntityType | 'ALL'>('ALL');
  const [filterAction, setFilterAction] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    // Load Logs
    auditLogService.getLogs().then(data => {
        setLogs(data);
        setFilteredLogs(data);
    });
  }, []);

  // Apply Filters
  useEffect(() => {
    auditLogService.getLogs({
      entityType: filterEntity,
      action: filterAction,
      userId: filterUser ? undefined : undefined // For simple text match we use local filter below
    }).then(result => {
        const textFiltered = result.filter(l => {
           const matchUser = filterUser ? l.performedByName.toLowerCase().includes(filterUser.toLowerCase()) : true;
           return matchUser;
        });
        setFilteredLogs(textFiltered);
    });
  }, [filterEntity, filterAction, filterUser]);

  const toggleExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  const getEntityColor = (type: EntityType) => {
    switch(type) {
      case 'BOOKING': return 'bg-blue-100 text-blue-700';
      case 'PAYMENT': return 'bg-green-100 text-green-700';
      case 'CANCELLATION': return 'bg-red-100 text-red-700';
      case 'USER': return 'bg-purple-100 text-purple-700';
      case 'PERMISSION': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck size={24} className="text-brand-600" /> Compliance Audit Logs
          </h1>
          <p className="text-slate-500">Immutable record of all critical system actions.</p>
        </div>
        <div className="bg-slate-100 px-3 py-1 rounded text-xs text-slate-500 font-mono">
           {filteredLogs.length} Records Found
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Entity Type</label>
           <select 
             className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
             value={filterEntity}
             onChange={(e) => setFilterEntity(e.target.value as any)}
           >
             <option value="ALL">All Entities</option>
             <option value="BOOKING">Booking</option>
             <option value="PAYMENT">Payment</option>
             <option value="QUOTE">Quote</option>
             <option value="USER">User Profile</option>
             <option value="PERMISSION">Permissions</option>
             <option value="OPERATOR_ASSIGNMENT">Operator Assign</option>
             <option value="CANCELLATION">Cancellation</option>
           </select>
        </div>
        <div className="flex-1">
           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Action Search</label>
           <div className="relative">
             <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
             <input 
               type="text" 
               className="w-full pl-9 border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
               placeholder="e.g. STATUS_CHANGE"
               value={filterAction}
               onChange={(e) => setFilterAction(e.target.value)}
             />
           </div>
        </div>
        <div className="flex-1">
           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">User Search</label>
           <div className="relative">
             <User size={16} className="absolute left-3 top-2.5 text-slate-400" />
             <input 
               type="text" 
               className="w-full pl-9 border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
               placeholder="Performed By..."
               value={filterUser}
               onChange={(e) => setFilterUser(e.target.value)}
             />
           </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold w-10"></th>
              <th className="px-6 py-4 font-semibold">Timestamp</th>
              <th className="px-6 py-4 font-semibold">User</th>
              <th className="px-6 py-4 font-semibold">Entity</th>
              <th className="px-6 py-4 font-semibold">Action</th>
              <th className="px-6 py-4 font-semibold">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLogs.map((log) => (
              <React.Fragment key={log.id}>
                <tr 
                  className={`hover:bg-slate-50 cursor-pointer transition ${expandedLogId === log.id ? 'bg-brand-50' : ''}`}
                  onClick={() => toggleExpand(log.id)}
                >
                  <td className="px-6 py-4 text-slate-400">
                    {expandedLogId === log.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{log.performedByName}</div>
                    <div className="text-xs text-slate-500">{log.performedByRole}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${getEntityColor(log.entityType)}`}>
                      {log.entityType}
                    </span>
                    <div className="text-xs font-mono text-slate-400 mt-1">{log.entityId.substring(0, 12)}...</div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs font-bold text-slate-700">
                    {log.action}
                  </td>
                  <td className="px-6 py-4 text-slate-600 truncate max-w-xs">
                    {log.description}
                  </td>
                </tr>
                {expandedLogId === log.id && (
                  <tr className="bg-slate-50">
                    <td colSpan={6} className="px-6 py-4 border-b border-slate-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                        <div>
                          <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                            <Clock size={16} /> Change Details
                          </h4>
                          <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                             <div className="mb-2">
                               <span className="text-xs text-slate-400 uppercase font-bold">Previous Value</span>
                               <pre className="text-xs text-red-600 mt-1 whitespace-pre-wrap">{log.previousValue ? JSON.stringify(log.previousValue, null, 2) : 'N/A'}</pre>
                             </div>
                             <div className="border-t border-slate-100 pt-2">
                               <span className="text-xs text-slate-400 uppercase font-bold">New Value</span>
                               <pre className="text-xs text-green-600 mt-1 whitespace-pre-wrap">{log.newValue ? JSON.stringify(log.newValue, null, 2) : 'N/A'}</pre>
                             </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                            <FileText size={16} /> Metadata
                          </h4>
                          <div className="bg-white p-3 rounded border border-slate-200 shadow-sm space-y-2">
                             <p><span className="text-slate-500">Log ID:</span> <span className="font-mono">{log.id}</span></p>
                             <p><span className="text-slate-500">Full Description:</span> {log.description}</p>
                             <p><span className="text-slate-500">User ID:</span> <span className="font-mono">{log.performedById}</span></p>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  No logs found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
