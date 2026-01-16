
import React from 'react';
import { Link } from 'react-router-dom';
import { BRANDING } from '../constants';
import { Shield, Users, Briefcase, Lock, Globe, CheckCircle, Award, HeartHandshake } from 'lucide-react';

export const Home: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col font-sans">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-brand-50 to-white py-20 px-4 relative overflow-hidden">
        {/* Decorative background blobs for depth */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-100/40 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none"></div>

        <div className="container mx-auto text-center max-w-4xl relative z-10">
          
          {/* Company Logo */}
          <div className="flex justify-center mb-8 animate-in fade-in zoom-in duration-1000">
            <img 
              src={BRANDING.logoUrl} 
              alt="Idea Holiday Logo" 
              className="h-32 md:h-40 w-auto drop-shadow-2xl hover:scale-105 transition-transform duration-500"
            />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-brand-100 text-brand-600 text-xs font-bold uppercase tracking-wider mb-6 shadow-sm animate-in fade-in slide-in-from-top-4">
            <Award size={14} /> #1 B2B Travel Platform
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 mb-6 tracking-tight leading-tight animate-in fade-in slide-in-from-bottom-2">
            The Ultimate <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-purple-600">Travel Operating System</span>
          </h1>
          <p className="text-xl text-slate-600 mb-10 leading-relaxed max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-3 duration-700">
            Streamline your travel business with Idea Tour Maker. 
            Connect Admins, Staff, Agents, and Operators in one secure ecosystem.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <Link to="/login" className="w-full sm:w-auto bg-brand-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-brand-700 transition shadow-xl shadow-brand-500/20 transform hover:-translate-y-1">
              Login to Portal
            </Link>
            <Link to="/signup" className="w-full sm:w-auto bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-50 transition shadow-sm hover:shadow-md">
              Become a Partner
            </Link>
          </div>
        </div>
      </section>

      {/* TRUST BADGE STRIP */}
      <section className="bg-slate-50 border-y border-slate-200 py-12">
        <div className="container mx-auto px-4">
          <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-10">Trusted by leading travel partners</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="flex flex-col items-center text-center gap-3 group">
              <div className="p-4 bg-white rounded-2xl shadow-sm text-green-600 mb-1 group-hover:scale-110 transition-transform duration-300">
                <Shield size={28} strokeWidth={2} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">100% Secure</h3>
                <p className="text-sm text-slate-500">Bank-grade encryption</p>
              </div>
            </div>
            <div className="flex flex-col items-center text-center gap-3 group">
              <div className="p-4 bg-white rounded-2xl shadow-sm text-blue-600 mb-1 group-hover:scale-110 transition-transform duration-300">
                <Globe size={28} strokeWidth={2} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Global Network</h3>
                <p className="text-sm text-slate-500">Verified partners only</p>
              </div>
            </div>
            <div className="flex flex-col items-center text-center gap-3 group">
              <div className="p-4 bg-white rounded-2xl shadow-sm text-purple-600 mb-1 group-hover:scale-110 transition-transform duration-300">
                <CheckCircle size={28} strokeWidth={2} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Verified Inventory</h3>
                <p className="text-sm text-slate-500">Direct net rates</p>
              </div>
            </div>
            <div className="flex flex-col items-center text-center gap-3 group">
              <div className="p-4 bg-white rounded-2xl shadow-sm text-amber-600 mb-1 group-hover:scale-110 transition-transform duration-300">
                <HeartHandshake size={28} strokeWidth={2} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">24/7 Support</h3>
                <p className="text-sm text-slate-500">Dedicated B2B assistance</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">Everything you need to grow</h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-lg leading-relaxed">
              A complete suite of tools designed specifically for the complexities of modern travel distribution.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Shield className="w-6 h-6 text-brand-600" />}
              title="Privacy Walls"
              desc="Advanced role-based access control ensuring operators and agents see only what they need."
            />
            <FeatureCard 
              icon={<Users className="w-6 h-6 text-purple-600" />}
              title="Multi-Role Architecture"
              desc="Dedicated dashboards for Admins, Staff, Agents, and Ground Operators."
            />
            <FeatureCard 
              icon={<Briefcase className="w-6 h-6 text-amber-600" />}
              title="Operations Automation"
              desc="Automated booking flows, status updates, and voucher generation."
            />
             <FeatureCard 
              icon={<Globe className="w-6 h-6 text-green-600" />}
              title="Direct Inventory"
              desc="Connect directly with ground suppliers for the best net rates."
            />
             <FeatureCard 
              icon={<Lock className="w-6 h-6 text-red-600" />}
              title="Secure Payments"
              desc="Integrated payment gateways and credit limit management for agents."
            />
             <FeatureCard 
              icon={<Award className="w-6 h-6 text-blue-600" />}
              title="White-Label Ready"
              desc="Send quotes and itineraries with your own agency branding."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-slate-900 text-white py-20 px-4 relative overflow-hidden">
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?ixlib=rb-4.0.3&auto=format&fit=crop&w=2021&q=80')] bg-cover bg-center opacity-10"></div>
        
        <div className="container mx-auto text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to modernize your travel business?</h2>
          <p className="text-slate-300 mb-10 max-w-2xl mx-auto text-lg">
            Join hundreds of partners using {BRANDING.name} to deliver exceptional travel experiences.
          </p>
          <Link to="/signup" className="inline-block bg-brand-500 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-brand-400 transition shadow-lg shadow-brand-900/50 transform hover:-translate-y-1">
            Get Started Now
          </Link>
        </div>
      </section>
    </div>
  );
};

const FeatureCard: React.FC<{icon: React.ReactNode, title: string, desc: string}> = ({ icon, title, desc }) => (
  <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-lg hover:border-brand-100 transition duration-300 group">
    <div className="mb-6 p-4 bg-white rounded-xl shadow-sm w-fit group-hover:scale-110 transition-transform duration-300">{icon}</div>
    <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
    <p className="text-slate-600 leading-relaxed">{desc}</p>
  </div>
);
