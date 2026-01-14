
import React from 'react';
import { InventoryStatus } from '../../types';
import { CheckCircle, XCircle, AlertCircle, FileText } from 'lucide-react';

interface Props {
  status: InventoryStatus;
  reason?: string;
}

export const InventoryStatusBadge: React.FC<Props> = ({ status, reason }) => {
  let badgeClass = 'bg-slate-100 text-slate-600 border-slate-200';
  let icon = <FileText size={12} />;
  let label = 'Draft';

  switch (status) {
    case 'APPROVED':
      badgeClass = 'bg-green-100 text-green-700 border-green-200';
      icon = <CheckCircle size={12} />;
      label = 'Approved';
      break;
    case 'REJECTED':
      badgeClass = 'bg-red-100 text-red-700 border-red-200';
      icon = <XCircle size={12} />;
      label = 'Rejected';
      break;
    case 'PENDING_APPROVAL':
      badgeClass = 'bg-amber-100 text-amber-700 border-amber-200';
      icon = <AlertCircle size={12} />;
      label = 'Pending Review';
      break;
  }

  return (
    <div className="flex flex-col items-start">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeClass}`}>
            {icon} {label}
        </span>
        {status === 'REJECTED' && reason && (
            <p className="text-[10px] text-red-600 mt-1 max-w-[150px] truncate" title={reason}>
                Reason: {reason}
            </p>
        )}
    </div>
  );
};
