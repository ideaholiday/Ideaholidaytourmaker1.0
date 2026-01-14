
import React, { useMemo } from 'react';
import { User } from '../../types';
import { BrandContext, resolveAgentBranding } from '../../context/BrandContext';
import { ClientHeader } from './ClientHeader';
import { ClientFooter } from './ClientFooter';

interface Props {
  agent: User | null;
  children: React.ReactNode;
}

export const ClientPortalLayout: React.FC<Props> = ({ agent, children }) => {
  const branding = useMemo(() => resolveAgentBranding(agent), [agent]);
  
  return (
    <BrandContext.Provider value={{ branding, isPlatformDefault: !agent }}>
      <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
        <ClientHeader />
        <main className="flex-1 w-full">
          {children}
        </main>
        <ClientFooter />
      </div>
    </BrandContext.Provider>
  );
};
