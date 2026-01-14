import React from 'react';
import { Link } from 'react-router-dom';
import { BRANDING } from '../constants';
import { Shield, Users, Briefcase, Lock } from 'lucide-react';

export const Home: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-brand-50 to-white py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6 tracking-tight">
            The Ultimate <span className="text-brand-600">B2B Travel</span> Operating System
          </h1>
          <p className="text-xl text-slate-600 mb-10 leading-relaxed">
            Streamline your travel business with Idea Holiday Tour Maker. 
            Seamlessly connect Admins, Staff, Agents, and Operators with privacy-first controls.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login" className="bg-brand-600 text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-brand-700 transition shadow-lg shadow-brand-200">
              Access Portal
            </Link>
            <a href={`mailto:${BRANDING.email}`} className="bg-white text-slate-700 border border-slate-300 px-8 py-3 rounded-lg font-semibold text-lg hover:bg-slate-50 transition">
              Contact Sales
            </a>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard 
              icon={<Shield className="w-8 h-8 text-brand-600" />}
              title="Secure Platform"
              desc="Enterprise-grade security ensuring your data remains protected at all times."
            />
             <FeatureCard 
              icon={<Lock className="w-8 h-8 text-brand-600" />}
              title="Privacy Walls"
              desc="Advanced role-based access control. Operators see only what they need to execute services."
            />
            <FeatureCard 
              icon={<Users className="w-8 h-8 text-brand-600" />}
              title="Multi-Role System"
              desc="Dedicated dashboards for Admins, Staff, Agents, and Ground Operators."
            />
            <FeatureCard 
              icon={<Briefcase className="w-8 h-8 text-brand-600" />}
              title="B2B Optimized"
              desc="Designed specifically for the complexities of B2B travel distribution."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-slate-900 text-white py-16 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to modernize your operations?</h2>
          <p className="text-slate-400 mb-8 max-w-2xl mx-auto">
            Join hundreds of partners using {BRANDING.name} to deliver exceptional travel experiences.
          </p>
          <Link to="/login" className="inline-block bg-brand-500 text-white px-8 py-3 rounded-lg font-bold hover:bg-brand-400 transition">
            Login to Dashboard
          </Link>
        </div>
      </section>
    </div>
  );
};

const FeatureCard: React.FC<{icon: React.ReactNode, title: string, desc: string}> = ({ icon, title, desc }) => (
  <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-md transition">
    <div className="mb-4">{icon}</div>
    <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
    <p className="text-slate-600 leading-relaxed">{desc}</p>
  </div>
);