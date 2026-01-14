
import React from 'react';
import { PaymentStatus } from '../../types';
import { CheckCircle, AlertCircle, Clock, PieChart } from 'lucide-react';

interface Props {
  status: PaymentStatus;
  className?: string;
}

export const PaymentStatusBadge: React.FC<Props> = ({ status, className = '' }) => {
  let color = 'bg-slate-100 text-slate-600';
  let icon = <Clock size={12} />;
  let label = 'Pending';

  switch (status) {
    case 'PAID_IN_FULL':
      color = 'bg-green-100 text-green-700 border border-green-200';
      icon = <CheckCircle size={12} />;
      label = 'Fully Paid';
      break;
    case 'ADVANCE_PAID':
      color = 'bg-blue-100 text-blue-700 border border-blue-200';
      icon = <CheckCircle size={12} />;
      label = 'Advance Paid';
      break;
    case 'PARTIALLY_PAID':
      color = 'bg-amber-100 text-amber-700 border border-amber-200';
      icon = <PieChart size={12} />;
      label = 'Partial Payment';
      break;
    case 'OVERDUE':
      color = 'bg-red-100 text-red-700 border border-red-200';
      icon = <AlertCircle size={12} />;
      label = 'Payment Overdue';
      break;
    default:
      color = 'bg-slate-100 text-slate-600 border border-slate-200';
      label = 'Payment Pending';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${color} ${className}`}>
      {icon} {label}
    </span>
  );
};
