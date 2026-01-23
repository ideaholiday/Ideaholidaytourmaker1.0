
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AgentBranding, User } from '../../types';
import { profileService } from '../../services/profileService';
import { LogoUploader } from '../../components/agent/LogoUploader';
import { BrandColorPicker } from '../../components/agent/BrandColorPicker';
import { Palette, Globe, Phone, MapPin, Save, ArrowLeft, LayoutTemplate } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DEFAULT_BRANDING: AgentBranding = {
    primaryColor: '#0ea5e9', // Brand 500
    secondaryColor: '#0284c7', // Brand 600
};

export const Branding: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<AgentBranding>(DEFAULT_BRANDING);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user && user.agentBranding) {
        setFormData({ ...DEFAULT_BRANDING, ...user.agentBranding });
    } else if (user) {
        // Init defaults from user profile if branding missing
        setFormData(prev => ({
            ...prev,
            agencyName: user.companyName,
            contactPhone: user.phone,
            primaryColor: '#0ea5e9',
            secondaryColor: '#0f172a'
        }));
    }
  }, [user]);

  if (!user) return null;

  const handleChange = (field: keyof AgentBranding, value: any) => {
      setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
      setIsSaving(true);
      // Construct updated user object
      const updatedUser: Partial<User> = {
          agentBranding: formData
      };
      
      // Persist
      profileService.updateProfileDetails(user.id, updatedUser);
      
      // Simulate delay for feedback
      setTimeout(() => {
          setIsSaving(false);
          alert("Branding settings saved successfully!");
      }, 600);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <button onClick={() => navigate('/agent/dashboard')} className="flex items-center text-slate-500 hover:text-slate-800 mb-6">
        <ArrowLeft size={18} className="mr-1" /> Back to Dashboard
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
        <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Palette className="text-brand-600" /> Agency Branding
            </h1>
            <p className="text-slate-500">Customize how your quotes and itineraries look to your clients.</p>
        </div>
        <button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-brand-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-brand-700 transition shadow-lg shadow-brand-200 flex items-center gap-2 disabled:opacity-70"
        >
            <Save size={18} /> {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: EDITOR */}
          <div className="lg:col-span-2 space-y-6">
              
              {/* Identity Section */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <LayoutTemplate size={18} /> Visual Identity
                  </h3>
                  
                  <div className="space-y-6">
                      <LogoUploader 
                          currentLogoUrl={formData.logoUrl}
                          onLogoChange={(url) => handleChange('logoUrl', url)}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <BrandColorPicker 
                              label="Primary Brand Color"
                              color={formData.primaryColor || '#0ea5e9'}
                              defaultColor="#0ea5e9"
                              onChange={(c) => handleChange('primaryColor', c)}
                          />
                          <BrandColorPicker 
                              label="Secondary / Accent Color"
                              color={formData.secondaryColor || '#0f172a'}
                              defaultColor="#0f172a"
                              onChange={(c) => handleChange('secondaryColor', c)}
                          />
                      </div>
                  </div>
              </div>

              {/* Contact Details */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Globe size={18} /> Agency Details
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-slate-700 mb-1">Agency Name (Display)</label>
                          <input 
                              type="text" 
                              value={formData.agencyName || ''}
                              onChange={(e) => handleChange('agencyName', e.target.value)}
                              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                              placeholder="e.g. Dream Travels"
                          />
                      </div>
                      
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
                          <div className="relative">
                              <Globe size={16} className="absolute left-3 top-3 text-slate-400" />
                              <input 
                                  type="text" 
                                  value={formData.website || ''}
                                  onChange={(e) => handleChange('website', e.target.value)}
                                  className="w-full pl-10 border border-slate-300 rounded-lg p-2.5 text-sm"
                                  placeholder="www.example.com"
                              />
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Contact Phone</label>
                          <div className="relative">
                              <Phone size={16} className="absolute left-3 top-3 text-slate-400" />
                              <input 
                                  type="text" 
                                  value={formData.contactPhone || ''}
                                  onChange={(e) => handleChange('contactPhone', e.target.value)}
                                  className="w-full pl-10 border border-slate-300 rounded-lg p-2.5 text-sm"
                                  placeholder="+91 99999 99999"
                              />
                          </div>
                      </div>

                      <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-slate-700 mb-1">Office Address</label>
                          <div className="relative">
                              <MapPin size={16} className="absolute left-3 top-3 text-slate-400" />
                              <textarea 
                                  rows={2}
                                  value={formData.officeAddress || ''}
                                  onChange={(e) => handleChange('officeAddress', e.target.value)}
                                  className="w-full pl-10 border border-slate-300 rounded-lg p-2.5 text-sm resize-none"
                                  placeholder="Full office address for footer..."
                              />
                          </div>
                      </div>
                  </div>
              </div>
          </div>

          {/* RIGHT COLUMN: PREVIEW */}
          <div className="lg:col-span-1">
              <div className="sticky top-6">
                  <h3 className="font-bold text-slate-500 uppercase text-xs tracking-wider mb-3">Live Preview (Client View)</h3>
                  
                  {/* Mock Quote Header Preview */}
                  <div className="bg-white border border-slate-200 shadow-lg rounded-xl overflow-hidden">
                      {/* Brand Bar */}
                      <div className="h-2 w-full" style={{ backgroundColor: formData.primaryColor || '#0ea5e9' }}></div>
                      
                      <div className="p-6 text-center">
                          {formData.logoUrl ? (
                              <img src={formData.logoUrl} alt="Logo" className="h-16 mx-auto object-contain mb-3" />
                          ) : (
                              <div className="h-16 w-16 bg-slate-100 rounded-lg mx-auto flex items-center justify-center text-slate-300 mb-3 font-bold text-xl">
                                  {formData.agencyName?.charAt(0) || 'A'}
                              </div>
                          )}
                          
                          <h4 className="font-bold text-lg text-slate-900">{formData.agencyName || 'Your Agency Name'}</h4>
                          <p className="text-xs text-slate-500 mt-1">{formData.officeAddress || 'Your Address Here'}</p>
                          
                          <div className="flex justify-center gap-3 mt-4 text-xs">
                              {formData.contactPhone && <span className="px-2 py-1 bg-slate-50 rounded border border-slate-100">{formData.contactPhone}</span>}
                              {formData.website && <span className="px-2 py-1 bg-slate-50 rounded border border-slate-100">{formData.website}</span>}
                          </div>
                      </div>

                      {/* Mock Quote Body */}
                      <div className="border-t border-slate-100 p-4 bg-slate-50">
                          <div className="h-4 w-1/3 bg-slate-200 rounded mb-2"></div>
                          <div className="h-3 w-1/2 bg-slate-200 rounded"></div>
                          
                          <button 
                            className="mt-4 w-full py-2 rounded text-white text-xs font-bold"
                            style={{ backgroundColor: formData.primaryColor || '#0ea5e9' }}
                          >
                              Download Quote
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};
