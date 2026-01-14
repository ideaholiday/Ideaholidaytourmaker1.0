
import React from 'react';
import { ContractStatus } from '../../types';
import { FileText, CheckCircle, XCircle, AlertCircle, PauseCircle, Clock } from 'lucide-react';

interface Props {
  status: ContractStatus;
}

export const ContractStatusBadge: React.FC<Props> = ({ status }) => {
  let color = 'bg-slate-100 text-slate-600';
  let icon = <FileText size={12} />;
  let label = 'Draft';

  switch (status) {
    case 'ACTIVE':
      color = 'bg-green-100 text-green-700 border-green-200';
      icon = <CheckCircle size={12} />;
      label = 'Active';
      break;
    case 'PENDING_APPROVAL':
      color = 'bg-amber-100 text-amber-700 border-amber-200';
      icon = <Clock size={12} />;
      label = 'Pending Review';
      break;
    case 'REJECTED':
      color = 'bg-red-100 text-red-700 border-red-200';
      icon = <XCircle size={12} />;
      label = 'Rejected';
      break;
    case 'EXPIRED':
      color = 'bg-slate-200 text-slate-500 border-slate-300';
      icon = <AlertCircle size={12} />;
      label = 'Expired';
      break;
    case 'SUSPENDED':
      color = 'bg-orange-100 text-orange-700 border-orange-200';
      icon = <PauseCircle size={12} />;
      label = 'Suspended';
      break;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${color}`}>
      {icon} {label}
    </span>
  );
};
