
import React from 'react';
import { useClientBranding } from '../../hooks/useClientBranding';
import { Phone, Mail, MapPin, Globe } from 'lucide-react';

export const AgentContactCard: React.FC = () => {
  const { agencyName, phone, email, address, website, styles } = useClientBranding();

  // Extract primary phone for clickable link
  const primaryPhone = phone.split('|')[0].replace(/,/g, '').trim();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h3 className="font-bold text-slate-900 mb-4 text-lg">Your Travel Agent</h3>
      
      <div className="space-y-4">
        {phone && (
          <div className="flex items-center gap-3">
            <div className="bg-slate-50 p-2 rounded-full text-slate-600 border border-slate-100 shrink-0">
              <Phone size={18}/>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold">Call Us</p>
              <a href={`tel:${primaryPhone}`} className="text-sm font-medium hover:underline" style={styles.primaryText}>
                {phone}
              </a>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="bg-slate-50 p-2 rounded-full text-slate-600 border border-slate-100 shrink-0">
            <Mail size={18}/>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase font-bold">Email Us</p>
            <a href={`mailto:${email}`} className="text-sm font-medium text-slate-900 break-all">
              {email}
            </a>
          </div>
        </div>

        {website && (
          <div className="flex items-center gap-3">
            <div className="bg-slate-50 p-2 rounded-full text-slate-600 border border-slate-100 shrink-0">
              <Globe size={18}/>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold">Visit Website</p>
              <a href={`https://${website}`} target="_blank" rel="noreferrer" className="text-sm font-medium hover:underline" style={styles.primaryText}>
                {website}
              </a>
            </div>
          </div>
        )}

        {address && (
          <div className="flex items-start gap-3">
            <div className="bg-slate-50 p-2 rounded-full text-slate-600 border border-slate-100 shrink-0">
              <MapPin size={18}/>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold">Office</p>
              <p className="text-sm text-slate-700 leading-snug whitespace-pre-line">
                {address}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100 text-center">
        <p className="text-xs text-slate-400">
          Managed by <strong>{agencyName}</strong>
        </p>
      </div>
    </div>
  );
};
