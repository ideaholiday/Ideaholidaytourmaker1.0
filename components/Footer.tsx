
import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Facebook, Instagram, Globe, Linkedin, Youtube, ShieldCheck, Lock } from 'lucide-react';
import { useClientBranding } from '../hooks/useClientBranding';
import { BRANDING } from '../constants';

export const Footer: React.FC = () => {
  const { agencyName, email, phone, website, address, styles, isPlatformDefault } = useClientBranding();

  // Use the new Navy Blue theme for platform default
  const footerStyle = isPlatformDefault 
    ? { backgroundColor: '#0A1A2F' } 
    : styles.secondaryBg;

  // Platform specific content overrides
  const displayName = isPlatformDefault ? BRANDING.legalName : agencyName;
  const description = isPlatformDefault 
    ? "Your trusted Global B2B Partner. We simplify travel business with advanced technology, real-time rates, and automated tools." 
    : "Your trusted partner for creating memorable travel experiences.";

  const phoneList = phone ? phone.split('|').map(p => p.trim()) : [];

  return (
    <footer className="text-slate-300 py-16 mt-auto font-sans border-t border-slate-800" style={footerStyle}>
      <div className="container mx-auto px-4">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          {/* Column 1: Brand & About */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-white">
                <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center font-bold text-white text-xl shadow-lg">
                    {agencyName.charAt(0)}
                </div>
                <div>
                   <h3 className="font-heading font-bold text-lg leading-none">{displayName}</h3>
                   <span className="text-[10px] text-teal-400 uppercase tracking-widest font-bold">B2B Platform</span>
                </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
               {description}
            </p>
            <div className="flex space-x-3 pt-2">
              <a href="https://www.linkedin.com/company/ideaholiday" target="_blank" rel="noreferrer" className="p-2 rounded-full bg-slate-800 hover:bg-teal-500 hover:text-white transition-all text-slate-400"><Linkedin size={18} /></a>
              <a href="https://www.youtube.com/@ideatourmaker" target="_blank" rel="noreferrer" className="p-2 rounded-full bg-slate-800 hover:bg-red-500 hover:text-white transition-all text-slate-400"><Youtube size={18} /></a>
              <a href="#" className="p-2 rounded-full bg-slate-800 hover:bg-blue-600 hover:text-white transition-all text-slate-400"><Facebook size={18} /></a>
              <a href="#" className="p-2 rounded-full bg-slate-800 hover:bg-pink-600 hover:text-white transition-all text-slate-400"><Instagram size={18} /></a>
            </div>
          </div>

          {/* Column 2: Platform */}
          <div>
            <h4 className="text-white font-heading font-bold text-lg mb-6">Platform</h4>
            <ul className="space-y-3 text-sm font-medium text-slate-400">
              <li><Link to="/" className="hover:text-teal-400 transition-colors">Features</Link></li>
              <li><Link to="/destinations" className="hover:text-teal-400 transition-colors">Destinations</Link></li>
              <li><Link to="/login" className="hover:text-teal-400 transition-colors">Partner Login</Link></li>
              <li><Link to="/signup" className="hover:text-teal-400 transition-colors">Register Agency</Link></li>
              <li><a href="#" className="hover:text-teal-400 transition-colors">API Documentation</a></li>
            </ul>
          </div>

          {/* Column 3: Support */}
          <div>
            <h4 className="text-white font-heading font-bold text-lg mb-6">Support</h4>
            <ul className="space-y-4 text-sm text-slate-400">
              <li className="flex items-start gap-3">
                <Phone size={16} className="text-teal-500 mt-0.5" />
                <div className="flex flex-col gap-1">
                     {phoneList.slice(0, 2).map((p, i) => (
                         <span key={i} className="hover:text-white">{p}</span>
                     ))}
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Mail size={16} className="text-teal-500 mt-0.5" />
                <a href={`mailto:${email}`} className="hover:text-white transition-colors">{email}</a>
              </li>
              <li><Link to="/faq" className="hover:text-teal-400 transition-colors">Help Center</Link></li>
              <li><Link to="/support" className="hover:text-teal-400 transition-colors">Service Guarantee</Link></li>
            </ul>
          </div>

          {/* Column 4: Legal & Address */}
          <div>
            <h4 className="text-white font-heading font-bold text-lg mb-6">Legal & Office</h4>
            <ul className="space-y-3 text-sm font-medium text-slate-400 mb-6">
              <li><Link to="/terms" className="hover:text-teal-400 transition-colors">Terms & Conditions</Link></li>
              <li><Link to="/privacy" className="hover:text-teal-400 transition-colors">Privacy Policy</Link></li>
            </ul>
            <div className="flex items-start gap-3 text-sm text-slate-400">
                <MapPin size={16} className="text-teal-500 mt-1 shrink-0" />
                <span className="whitespace-pre-line">{address}</span>
            </div>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
            <p className="text-slate-500 text-xs">
                © {new Date().getFullYear()} {BRANDING.legalName}. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-slate-500 text-xs">
                    <ShieldCheck size={14} className="text-teal-500"/>
                    <span>PCI-DSS Compliant</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-xs">
                    <Lock size={14} className="text-teal-500"/>
                    <span>ISO 27001 Certified</span>
                </div>
                <span className="text-xs text-slate-600 italic">Your Brand, Our Backend.</span>
            </div>
        </div>
      </div>
    </footer>
  );
};
