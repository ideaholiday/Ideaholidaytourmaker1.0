
import React from 'react';
import { BRANDING } from '../constants';
import { Shield, Phone, Mail, Globe } from 'lucide-react';
import { AgentBranding } from '../types';

interface Props {
  branding?: AgentBranding; // Optional branding override
}

export const QuoteHeader: React.FC<Props> = ({ branding }) => {
  
  // Default to Idea Holiday branding if no agent override
  const displayBrand = {
      name: branding?.agencyName || BRANDING.legalName,
      address: branding?.officeAddress || BRANDING.address,
      phone: branding?.contactPhone || BRANDING.supportPhone,
      email: BRANDING.email, // Always keep platform email as fallback or use agent's if we add it
      website: branding?.website || BRANDING.website,
      logoUrl: branding?.logoUrl || BRANDING.logoUrl, // Fallback to Platform Logo
      primaryColor: branding?.primaryColor || '#0284c7' // brand-600
  };

  return (
    <div className="bg-white border-b border-slate-200 p-8 flex flex-col md:flex-row justify-between items-center text-center md:text-left relative overflow-hidden">
      
      {/* Dynamic Top Border */}
      <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: displayBrand.primaryColor }}></div>

      <div className="mb-4 md:mb-0 relative z-10">
        <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
           {displayBrand.logoUrl ? (
               <img src={displayBrand.logoUrl} alt={displayBrand.name} className="h-12 w-auto object-contain" />
           ) : (
               <div className="text-white p-2 rounded-lg" style={{ backgroundColor: displayBrand.primaryColor }}>
                 <Shield size={24} />
               </div>
           )}
           <h1 className="text-2xl font-bold text-slate-900">{displayBrand.name}</h1>
        </div>
        <p className="text-sm text-slate-500 max-w-xs whitespace-pre-line">{displayBrand.address}</p>
      </div>
      
      <div className="text-sm text-slate-600 space-y-1 relative z-10">
        <div className="flex items-center gap-2 justify-center md:justify-end">
          <Phone size={16} style={{ color: displayBrand.primaryColor }} />
          <span>{displayBrand.phone}</span>
        </div>
        {/* Note: Email might be agent specific if we added it to interface, currently falling back to platform or skipped */}
        {branding?.website && (
            <div className="flex items-center gap-2 justify-center md:justify-end">
                <Globe size={16} style={{ color: displayBrand.primaryColor }} />
                <span>{displayBrand.website}</span>
            </div>
        )}
      </div>
    </div>
  );
};
