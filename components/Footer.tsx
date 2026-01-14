
import React from 'react';
import { Link } from 'react-router-dom';
import { BRANDING } from '../constants';
import { Mail, Phone, MapPin, Facebook, Instagram } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 py-10 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-white font-bold text-lg mb-4">{BRANDING.name}</h3>
            <p className="text-sm text-slate-400 mb-4">
              Your trusted partner for B2B travel solutions. We simplify tour operations with advanced technology.
            </p>
            <div className="flex space-x-4">
              <a href="https://www.facebook.com/ideaholiday.in" target="_blank" rel="noopener noreferrer" className="hover:text-white transition" title="Facebook">
                <Facebook size={20} />
              </a>
              <a href="https://www.instagram.com/ideaholiday1/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition" title="Instagram">
                <Instagram size={20} />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-white font-bold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/terms" target="_blank" rel="noopener noreferrer" className="hover:text-brand-500 transition">Terms & Conditions</Link></li>
              <li><Link to="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-brand-500 transition">Privacy Policy</Link></li>
              <li><Link to="/faq" target="_blank" rel="noopener noreferrer" className="hover:text-brand-500 transition">FAQ</Link></li>
              <li><Link to="/support" target="_blank" rel="noopener noreferrer" className="hover:text-brand-500 transition">Support Center</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-bold text-lg mb-4">Contact Us</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-brand-500 shrink-0" />
                <span>{BRANDING.address}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-brand-500 shrink-0" />
                <span>{BRANDING.supportPhone}</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-brand-500 shrink-0" />
                <a href={`mailto:${BRANDING.email}`} className="hover:text-brand-500">{BRANDING.email}</a>
              </li>
            </ul>
          </div>
          
           <div>
            <h3 className="text-white font-bold text-lg mb-4">Powered By</h3>
             <p className="text-sm text-slate-400">
               {BRANDING.legalName}<br/>
               <a href={`https://${BRANDING.website}`} target="_blank" rel="noreferrer" className="text-brand-500 hover:underline">{BRANDING.website}</a>
             </p>
             <div className="mt-4 text-xs text-slate-500">
               © {new Date().getFullYear()} {BRANDING.authDomain}
             </div>
          </div>
        </div>
        <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} {BRANDING.legalName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
};
