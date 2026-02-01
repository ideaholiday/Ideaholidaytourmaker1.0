
import React from 'react';
import { SystemNotification } from '../../types';
import { AlertCircle, Info, Link as LinkIcon, Video } from 'lucide-react';

interface Props {
  notifications: SystemNotification[];
}

export const NotificationTicker: React.FC<Props> = ({ notifications }) => {
  if (!notifications || notifications.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-700 h-10 flex items-center overflow-hidden shadow-2xl">
      
      {/* Label Badge */}
      <div className="bg-brand-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 h-full flex items-center shrink-0 z-10 shadow-lg relative">
        Announcements
        <div className="absolute right-[-8px] top-0 bottom-0 w-4 bg-brand-600 transform skew-x-[-15deg] origin-top z-0"></div>
      </div>

      {/* Scrolling Container */}
      <div className="flex-1 overflow-hidden relative h-full flex items-center">
        <div className="animate-marquee whitespace-nowrap flex items-center gap-12 pl-4">
          {notifications.map((note) => (
            <div key={note.id} className="inline-flex items-center gap-2 text-sm">
                <span className={`p-1 rounded-full ${
                    note.type === 'URGENT' ? 'bg-red-500 text-white' : 
                    note.type === 'MEETING' ? 'bg-purple-500 text-white' :
                    note.type === 'PROMO' ? 'bg-green-500 text-white' :
                    'bg-slate-700 text-slate-300'
                }`}>
                    {note.type === 'URGENT' && <AlertCircle size={12} />}
                    {note.type === 'MEETING' && <Video size={12} />}
                    {note.type === 'PROMO' && <Info size={12} />}
                    {note.type === 'INFO' && <Info size={12} />}
                </span>
                
                <span className={`${note.type === 'URGENT' ? 'text-red-300 font-bold' : 'text-slate-300'}`}>
                    {note.content}
                </span>

                {note.link && (
                    <a 
                        href={note.link} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-brand-400 hover:text-white hover:underline flex items-center gap-1 text-xs font-bold"
                    >
                        <LinkIcon size={10} /> Open Link
                    </a>
                )}
            </div>
          ))}
          {/* Duplicate for seamless loop if needed, though basic marquee works fine for now */}
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 25s linear infinite;
        }
        .animate-marquee:hover {
            animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};
