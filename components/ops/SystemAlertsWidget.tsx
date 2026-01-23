
import React from 'react';
import { SystemAlert } from '../../types';
import { Bell, Info, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  alerts: SystemAlert[];
}

export const SystemAlertsWidget: React.FC<Props> = ({ alerts }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
      <div className="p-4 border-b border-slate-100 bg-slate-50">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Bell size={18} className="text-blue-600" /> System Alerts
        </h3>
      </div>
      
      <div className="p-4 space-y-3">
          {alerts.length === 0 ? (
              <div className="text-center text-slate-400 text-sm py-2">No active system alerts.</div>
          ) : (
              alerts.map(alert => (
                  <div key={alert.id} className={`p-3 rounded-lg border flex gap-3 items-start ${
                      alert.type === 'CRITICAL' ? 'bg-red-50 border-red-200 text-red-800' :
                      alert.type === 'WARNING' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                      'bg-blue-50 border-blue-200 text-blue-800'
                  }`}>
                      <div className="mt-0.5 shrink-0">
                          {alert.type === 'CRITICAL' && <ShieldAlert size={18} />}
                          {alert.type === 'WARNING' && <AlertTriangle size={18} />}
                          {alert.type === 'INFO' && <Info size={18} />}
                      </div>
                      <div className="flex-1">
                          <h4 className="font-bold text-sm">{alert.title}</h4>
                          <p className="text-xs mt-0.5 opacity-90">{alert.description}</p>
                          {alert.actionLink && (
                              <Link to={alert.actionLink} className="text-xs font-bold underline mt-1.5 inline-block hover:opacity-80">
                                  Take Action
                              </Link>
                          )}
                      </div>
                  </div>
              ))
          )}
      </div>
    </div>
  );
};
