
import React from 'react';
import { useClientBranding } from '../../hooks/useClientBranding';
import { Phone, MessageCircle } from 'lucide-react';

export const ClientHeader: React.FC = () => {
  const { agencyName, logoUrl, phone, whatsapp, styles } = useClientBranding();

  // Handle multiple numbers: Use first valid number for tel: link
  const primaryPhone = phone.split('|')[0].replace(/,/g, '').trim();

  return (
    <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-50">
      {/* Brand Color Top Line */}
      <div className="h-1 w-full" style={styles.primaryBg}></div>
      
      <div className="container mx-auto px-4 h-20 flex justify-between items-center">
        {/* Logo / Name */}
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt={agencyName} 
              className="h-12 w-auto object-contain max-w-[150px]" 
            />
          ) : (
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm"
              style={styles.primaryBg}
            >
              {agencyName.charAt(0)}
            </div>
          )}
          
          <div className="hidden sm:block">
            <h1 className="font-bold text-lg text-slate-900 leading-tight">{agencyName}</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Travel Partner</p>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-2">
          {phone && (
            <a 
              href={`tel:${primaryPhone}`}
              className="p-2 rounded-full hover:bg-slate-50 border border-slate-200 text-slate-600 transition flex items-center justify-center"
              title={`Call ${primaryPhone}`}
            >
              <Phone size={18} />
            </a>
          )}
          {whatsapp && (
            <a 
              href={`https://wa.me/${whatsapp}`}
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 rounded-full text-white transition flex items-center justify-center shadow-sm"
              style={{ backgroundColor: '#25D366' }} // Standard WhatsApp Color
              title="Chat on WhatsApp"
            >
              <MessageCircle size={18} />
            </a>
          )}
        </div>
      </div>
    </header>
  );
};
