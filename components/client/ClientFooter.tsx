
import React from 'react';
import { useClientBranding } from '../../hooks/useClientBranding';
import { BRANDING } from '../../constants';

export const ClientFooter: React.FC = () => {
  const { agencyName, address, styles, isPlatformDefault } = useClientBranding();

  return (
    <footer className="bg-slate-50 border-t border-slate-200 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Agent Branding Side */}
          <div>
            <h4 className="font-bold text-slate-900 text-lg mb-2">{agencyName}</h4>
            {address && <p className="text-sm text-slate-500 whitespace-pre-line">{address}</p>}
            <p className="text-sm text-slate-500 mt-4">
              &copy; {new Date().getFullYear()} {agencyName}. All rights reserved.
            </p>
          </div>

          {/* Platform Trust Side */}
          <div className="md:text-right">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-2">Secure Booking</p>
            <div className="flex md:justify-end gap-4 text-sm text-slate-500">
              <span>SSL Encrypted</span>
              <span>•</span>
              <span>Verified Partner</span>
            </div>
          </div>
        </div>

        {/* Mandatory Platform Footer (Idea Holiday) - HIDDEN IF AGENT BRANDING ACTIVE */}
        {isPlatformDefault && (
            <div className="border-t border-slate-200 pt-6 text-center">
              <p className="text-xs text-slate-400 font-medium">
                Powered by <strong className="text-slate-500">{BRANDING.legalName}</strong> &bull; Idea Holiday Tour Maker Platform
              </p>
              <div className="flex justify-center gap-4 mt-2 text-[10px] text-slate-400">
                <span>Terms of Service</span>
                <span>Privacy Policy</span>
              </div>
            </div>
        )}
      </div>
      
      {/* Decorative Bottom Bar */}
      <div className="h-1 w-full" style={styles.secondaryBg}></div>
    </footer>
  );
};
