
import React from 'react';
import { BookingStatus } from '../../types';
import { Check, Clock, Play, Flag, XCircle, AlertCircle } from 'lucide-react';

interface Props {
  status: BookingStatus;
}

const STEPS: { status: BookingStatus; label: string; icon: any }[] = [
  { status: 'REQUESTED', label: 'Requested', icon: Clock },
  { status: 'CONFIRMED', label: 'Confirmed', icon: Check },
  { status: 'IN_PROGRESS', label: 'In Progress', icon: Play },
  { status: 'COMPLETED', label: 'Completed', icon: Flag },
];

export const BookingStatusTimeline: React.FC<Props> = ({ status }) => {
  const safeStatus = status || 'REQUESTED'; // Fallback

  if (safeStatus === 'CANCELLED_NO_REFUND' || safeStatus === 'CANCELLED_WITH_REFUND' || safeStatus === 'REJECTED') {
      return (
          <div className="bg-red-50 p-4 rounded-lg flex items-center justify-center gap-2 text-red-700 font-bold border border-red-200">
              <XCircle size={20} />
              Booking {safeStatus.replace(/_/g, ' ')}
          </div>
      );
  }

  if (safeStatus === 'ON_HOLD') {
      return (
          <div className="bg-amber-50 p-4 rounded-lg flex items-center justify-center gap-2 text-amber-700 font-bold border border-amber-200">
              <AlertCircle size={20} />
              Booking ON HOLD
          </div>
      );
  }

  const currentIdx = STEPS.findIndex(s => s.status === safeStatus);
  // If status not in main flow (e.g. specialized state), default to 0
  const activeIndex = currentIdx === -1 ? 0 : currentIdx;

  return (
    <div className="flex items-center justify-between w-full max-w-2xl mx-auto py-6">
      {STEPS.map((step, idx) => {
        const isCompleted = idx <= activeIndex;
        const isCurrent = idx === activeIndex;
        const Icon = step.icon;

        return (
          <div key={step.status} className="flex flex-col items-center relative z-10 flex-1">
            {/* Line connector */}
            {idx !== 0 && (
              <div 
                className={`absolute top-4 -left-1/2 w-full h-1 ${idx <= activeIndex ? 'bg-green-500' : 'bg-slate-200'}`} 
                style={{ zIndex: -1 }}
              />
            )}
            
            <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${
                    isCompleted ? 'bg-green-500 text-white shadow-md' : 'bg-slate-200 text-slate-400'
                }`}
            >
                <Icon size={14} strokeWidth={3} />
            </div>
            <span className={`text-xs mt-2 font-medium ${isCurrent ? 'text-slate-900' : 'text-slate-400'}`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};
