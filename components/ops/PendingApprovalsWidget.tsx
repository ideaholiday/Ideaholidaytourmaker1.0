
import React from 'react';
import { OperatorInventoryItem } from '../../types';
import { Clock, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  items: OperatorInventoryItem[];
}

export const PendingApprovalsWidget: React.FC<Props> = ({ items }) => {
  const navigate = useNavigate();

  const getDaysPending = (dateStr: string) => {
    const created = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Clock size={18} className="text-amber-500" /> Pending Approvals
        </h3>
        <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-bold">{items.length}</span>
      </div>
      
      <div className="flex-1 overflow-y-auto max-h-[300px]">
        {items.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">All caught up! No pending items.</div>
        ) : (
            <div className="divide-y divide-slate-100">
                {items.map(item => {
                    const days = getDaysPending(item.createdAt);
                    return (
                        <div key={item.id} className="p-4 hover:bg-slate-50 transition flex justify-between items-center group">
                            <div>
                                <div className="font-medium text-slate-900 text-sm">{item.name}</div>
                                <div className="text-xs text-slate-500 mt-0.5">
                                    {item.type} • {item.operatorName}
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`text-[10px] font-bold px-2 py-1 rounded ${days > 3 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                                    {days} days
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
      </div>
      
      <div className="p-3 border-t border-slate-100 bg-slate-50">
          <button 
            onClick={() => navigate('/admin/approvals')}
            className="w-full text-xs text-brand-600 font-bold hover:text-brand-800 flex items-center justify-center gap-1"
          >
              Review All <ArrowRight size={12} />
          </button>
      </div>
    </div>
  );
};
