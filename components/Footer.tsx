
import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Facebook, Instagram } from 'lucide-react';
import { useClientBranding } from '../hooks/useClientBranding';

export const Footer: React.FC = () => {
  const { agencyName, email, phone, website, address, styles, isPlatformDefault } = useClientBranding();

  // If agent branding, use custom colors, else default slate-900
  const bgStyle = isPlatformDefault ? { backgroundColor: '#0f172a' } : styles.secondaryBg;

  return (
    <footer className="text-slate-300 py-10 mt-auto transition-colors duration-300" style={bgStyle}>
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-white font-bold text-lg mb-4">{agencyName}</h3>
            <p className="text-sm text-slate-400 mb-4">
              Your trusted partner for travel solutions. We simplify tour operations with advanced technology.
            </p>
            <div className="flex space-x-4">
              {/* Socials placeholder - could be dynamic later */}
              <a href="#" className="hover:text-white transition" title="Facebook">
                <Facebook size={20} />
              </a>
              <a href="#" className="hover:text-white transition" title="Instagram">
                <Instagram size={20} />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-white font-bold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/terms" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Terms & Conditions</Link></li>
              <li><Link to="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Privacy Policy</Link></li>
              <li><Link to="/faq" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">FAQ</Link></li>
              <li><Link to="/support" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Support Center</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-bold text-lg mb-4">Contact Us</h3>
            <ul className="space-y-3 text-sm">
              {address && (
                  <li className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 shrink-0 opacity-70" />
                    <span>{address}</span>
                  </li>
              )}
              {phone && (
                  <li className="flex items-center gap-3">
                    <Phone className="w-5 h-5 shrink-0 opacity-70" />
                    <span>{phone}</span>
                  </li>
              )}
              {email && (
                  <li className="flex items-center gap-3">
                    <Mail className="w-5 h-5 shrink-0 opacity-70" />
                    <a href={`mailto:${email}`} className="hover:text-white">{email}</a>
                  </li>
              )}
            </ul>
          </div>
          
           <div>
            <h3 className="text-white font-bold text-lg mb-4">Visit Us</h3>
             <p className="text-sm text-slate-400">
               {agencyName}<br/>
               {website && <a href={`https://${website}`} target="_blank" rel="noreferrer" className="hover:underline hover:text-white">{website}</a>}
             </p>
          </div>
        </div>
        <div className="border-t border-white/10 mt-8 pt-8 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} {agencyName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
};
