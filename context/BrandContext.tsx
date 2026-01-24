
import React, { createContext, useContext } from 'react';
import { AgentBranding, User } from '../types';
import { BRANDING } from '../constants';

export interface ResolvedBranding {
  agencyName: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  phone: string;
  email: string;
  website?: string;
  address?: string;
  whatsapp?: string;
}

interface BrandContextType {
  branding: ResolvedBranding;
  isPlatformDefault: boolean;
}

// Default Fallback (Idea Holiday Branding)
const DEFAULT_BRANDING: ResolvedBranding = {
  agencyName: BRANDING.name,
  primaryColor: '#0ea5e9', // Brand 500
  secondaryColor: '#0f172a', // Slate 900
  phone: BRANDING.supportPhone,
  email: BRANDING.email,
  website: BRANDING.website,
  address: BRANDING.address
};

export const BrandContext = createContext<BrandContextType>({
  branding: DEFAULT_BRANDING,
  isPlatformDefault: true
});

export const useBrandContext = () => useContext(BrandContext);

// Helper to resolve branding from Agent User object
export const resolveAgentBranding = (agent: User | null): ResolvedBranding => {
  if (!agent) return DEFAULT_BRANDING;

  const ab = agent.agentBranding;
  
  return {
    agencyName: ab?.agencyName || agent.companyName || agent.name,
    logoUrl: ab?.logoUrl || agent.logoUrl, // Fallback to legacy logo field
    primaryColor: ab?.primaryColor || '#0ea5e9', // Default blue if missing or empty
    secondaryColor: ab?.secondaryColor || '#0f172a', // Default dark slate
    phone: ab?.contactPhone || agent.phone || '',
    email: agent.email, // Always use agent account email for reliability
    website: ab?.website || '',
    address: ab?.officeAddress || '',
    whatsapp: ab?.whatsappNumber || ''
  };
};
