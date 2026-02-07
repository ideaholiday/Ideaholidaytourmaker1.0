
import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Facebook, Instagram, Globe, ExternalLink, ArrowRight } from 'lucide-react';
import { useClientBranding } from '../hooks/useClientBranding';
import { BRANDING } from '../constants';

export const Footer: React.FC = () => {
  const { agencyName, email, phone, website, address, styles, isPlatformDefault } = useClientBranding();

  // Use the premium dark gradient for platform default, otherwise use agent branding
  const footerStyle = isPlatformDefault 
    ? { background: 'linear-gradient(to right, #0f172a, #1e293b)' } // Slate 900 to 800
    : styles.secondaryBg;

  // Platform specific content overrides
  const displayName = isPlatformDefault ? BRANDING.legalName : agencyName;
  const description = isPlatformDefault 
    ? "Your trusted Global Partner for travel solutions. We simplify Connect Travel Agents and DMC Partner with advanced technology." 
    : "Your trusted partner for creating memorable travel experiences. We simplify your journey with expert planning.";

  // Helper to split phones nicely
  const phoneList = phone ? phone.split('|').map(p => p.trim()) : [];

  return (
    <footer className="text-slate-300 py-16 mt-auto font-sans border-t border-white/5" style={footerStyle}>
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          
          {/* Column 1: Brand */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-white">
                <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center font-bold text-white shadow-lg shadow-brand-900/50">
                    {agencyName.charAt(0)}
                </div>
                <div>
                   <h3 className="font-bold text-lg leading-none">{displayName}</h3>
                   <span className="text-[10px] text-brand-400 uppercase tracking-widest font-bold">Travel Technology</span>
                </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
               {description}
            </p>
            <div className="flex space-x-3 pt-2">
              <a href="#" className="p-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 hover:text-white transition-all text-slate-400">
                <Facebook size={18} />
              </a>
              <a href="#" className="p-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 hover:text-white transition-all text-slate-400">
                <Instagram size={18} />
              </a>
              {website && (
                  <a href={`https://${website}`} target="_blank" rel="noreferrer" className="p-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 hover:text-white transition-all text-slate-400">
                    <Globe size={18} />
                  </a>
              )}
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="lg:pl-8">
            <h4 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                Quick Links
                <div className="h-1 w-8 bg-brand-600 rounded-full"></div>
            </h4>
            <ul className="space-y-3 text-sm font-medium">
              <li><Link to="/terms" className="hover:text-brand-400 hover:translate-x-1 transition-all inline-block flex items-center gap-2"><div className="w-1 h-1 bg-slate-500 rounded-full"></div> Terms & Conditions</Link></li>
              <li><Link to="/privacy" className="hover:text-brand-400 hover:translate-x-1 transition-all inline-block flex items-center gap-2"><div className="w-1 h-1 bg-slate-500 rounded-full"></div> Privacy Policy</Link></li>
              <li><Link to="/faq" className="hover:text-brand-400 hover:translate-x-1 transition-all inline-block flex items-center gap-2"><div className="w-1 h-1 bg-slate-500 rounded-full"></div> FAQ</Link></li>
              <li><Link to="/support" className="hover:text-brand-400 hover:translate-x-1 transition-all inline-block flex items-center gap-2"><div className="w-1 h-1 bg-slate-500 rounded-full"></div> Support Center</Link></li>
            </ul>
          </div>

          {/* Column 3: Contact Us */}
          <div>
            <h4 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                Contact Us
                <div className="h-1 w-8 bg-brand-600 rounded-full"></div>
            </h4>
            <ul className="space-y-5 text-sm">
              <li className="flex items-start gap-4 group">
                <div className="mt-1 p-2 rounded-lg bg-white/5 group-hover:bg-brand-600/20 text-brand-500 transition-colors">
                    <MapPin size={18} />
                </div>
                <span className="text-slate-400 whitespace-pre-line leading-relaxed group-hover:text-slate-300 transition-colors">
                    {address}
                </span>
              </li>
              <li className="flex items-start gap-4 group">
                <div className="mt-1 p-2 rounded-lg bg-white/5 group-hover:bg-brand-600/20 text-brand-500 transition-colors">
                    <Phone size={18} />
                </div>
                <div className="flex flex-col text-slate-400 gap-1 group-hover:text-slate-300 transition-colors">
                     {phoneList.slice(0, 4).map((p, i) => (
                         <span key={i} className="whitespace-nowrap">{p}</span>
                     ))}
                </div>
              </li>
              <li className="flex items-start gap-4 group">
                <div className="mt-1 p-2 rounded-lg bg-white/5 group-hover:bg-brand-600/20 text-brand-500 transition-colors">
                    <Mail size={18} />
                </div>
                <div className="flex flex-col text-slate-400 gap-1">
                    <a href={`mailto:${email}`} className="hover:text-white hover:underline transition-all">{email}</a>
                    {isPlatformDefault && BRANDING.b2bEmail && (
                        <a href={`mailto:${BRANDING.b2bEmail}`} className="hover:text-white hover:underline transition-all">{BRANDING.b2bEmail}</a>
                    )}
                </div>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="border-t border-white/5 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
            <p className="text-slate-500 text-sm">
                © {new Date().getFullYear()} {agencyName}. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-slate-600">
                <span className="hover:text-slate-400 cursor-pointer transition-colors">Privacy</span>
                <span className="hover:text-slate-400 cursor-pointer transition-colors">Security</span>
                <span className="hover:text-slate-400 cursor-pointer transition-colors">Sitemap</span>
            </div>
        </div>
      </div>
    </footer>
  );
};
