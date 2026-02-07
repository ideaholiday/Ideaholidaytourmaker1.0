
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Zap, Globe, LayoutTemplate, ArrowRight, CheckCircle2, 
  ShieldCheck, Map, Users, TrendingUp, FileText, Send, UserPlus, Share2 
} from 'lucide-react';

export const Home: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col font-sans bg-white text-slate-900 selection:bg-brand-100 selection:text-brand-900">
      
      {/* --- HERO SECTION --- */}
      <section className="relative pt-24 pb-20 lg:pt-32 lg:pb-32 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/50 via-white to-white"></div>
        <div className="absolute inset-0 -z-10 opacity-[0.03]" style={{ backgroundImage: 'url("https://upload.wikimedia.org/wikipedia/commons/8/80/World_map_-_low_resolution.svg")' }}></div>

        <div className="container mx-auto px-4 max-w-6xl relative z-10 text-center">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-sm font-semibold mb-8 animate-in fade-in slide-in-from-bottom-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
            </span>
            #1 Travel Tech Platform
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-tight text-slate-900 animate-in fade-in slide-in-from-bottom-6">
            Sell Global Travel. <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-teal-500">Faster.</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8">
            Access <strong>global DMC prices</strong> and create branded itineraries, quotes, and tour packages in just <span className="text-brand-700 font-bold border-b-2 border-brand-200">10 seconds</span>.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-in fade-in slide-in-from-bottom-10">
            <Link 
              to="/signup" 
              className="w-full sm:w-auto px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-lg shadow-xl shadow-brand-200 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2"
            >
              Start for Free <ArrowRight size={20} />
            </Link>
            <Link 
              to="/signup" 
              className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2"
            >
              Register as Partner
            </Link>
          </div>
          
          <div className="mt-12 flex flex-col md:flex-row justify-center items-center gap-6 text-sm text-slate-500 font-medium animate-in fade-in slide-in-from-bottom-12 delay-100">
             <div className="flex items-center gap-2">
                 <CheckCircle2 size={18} className="text-green-500" /> Zero Cost to Start
             </div>
             <div className="flex items-center gap-2">
                 <CheckCircle2 size={18} className="text-green-500" /> No Subscription Fees
             </div>
             <div className="flex items-center gap-2">
                 <CheckCircle2 size={18} className="text-green-500" /> Instant Access
             </div>
          </div>
        </div>
      </section>

      {/* --- TRUST SECTION --- */}
      <section className="bg-slate-50 py-10 border-y border-slate-100">
          <div className="container mx-auto px-4 text-center">
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-6">Trusted by 3000+ Travel Agents Pan India</p>
              <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                  {/* Abstract Logos */}
                  <div className="flex items-center gap-2 text-xl font-black text-slate-800"><Globe className="text-brand-600"/> TRAVEL<span className="text-brand-600">HUB</span></div>
                  <div className="flex items-center gap-2 text-xl font-black text-slate-800"><Map className="text-purple-600"/> TRIP<span className="text-purple-600">GO</span></div>
                  <div className="flex items-center gap-2 text-xl font-black text-slate-800"><Send className="text-teal-600"/> FLY<span className="text-teal-600">FAST</span></div>
                  <div className="flex items-center gap-2 text-xl font-black text-slate-800"><ShieldCheck className="text-blue-600"/> SECURE<span className="text-blue-600">TRIP</span></div>
              </div>
          </div>
      </section>

      {/* --- KEY FEATURES --- */}
      <section className="py-24 bg-white relative">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">Everything you need to grow</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
                Stop wasting hours on Excel. Our AI-powered platform gives you superpowers.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-brand-100 transition-all duration-300 group">
              <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                <Globe size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Global DMC Pricing</h3>
              <p className="text-slate-600 leading-relaxed">
                Access real-time net rates from verified DMCs worldwide. No middlemen, better margins for you.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-teal-100 transition-all duration-300 group">
              <div className="w-14 h-14 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600 mb-6 group-hover:scale-110 transition-transform">
                <Zap size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">10-Second Builder</h3>
              <p className="text-slate-600 leading-relaxed">
                Build professional itineraries instantly. Smart automation selects the best routes and hotels.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-purple-100 transition-all duration-300 group">
              <div className="w-14 h-14 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 mb-6 group-hover:scale-110 transition-transform">
                <LayoutTemplate size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Free Agent Branding</h3>
              <p className="text-slate-600 leading-relaxed">
                Your logo, your contact details. Every PDF and link is 100% white-labeled to your agency.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-orange-100 transition-all duration-300 group">
              <div className="w-14 h-14 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 mb-6 group-hover:scale-110 transition-transform">
                <FileText size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Flyer & Quote Gen</h3>
              <p className="text-slate-600 leading-relaxed">
                Generate marketing flyers and detailed quote PDFs with one click. Share instantly via WhatsApp.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-emerald-100 transition-all duration-300 group lg:col-span-2">
               <div className="flex flex-col md:flex-row gap-6 items-center">
                    <div className="w-14 h-14 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-2 md:mb-0 shrink-0 group-hover:scale-110 transition-transform">
                        <TrendingUp size={28} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Zero Cost to Start</h3>
                        <p className="text-slate-600 leading-relaxed">
                            No setup fees. No monthly subscription. Pay only when you book or use our wallet system for seamless transactions. 
                            <Link to="/signup" className="text-brand-600 font-bold hover:underline ml-2">Register Free &rarr;</Link>
                        </p>
                    </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- HOW IT WORKS (SIMPLIFYING B2B TRAVEL) --- */}
      <section className="py-24 relative overflow-hidden bg-slate-950">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
              <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-[100px]"></div>
              <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[100px]"></div>
          </div>
          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5"></div>

          <div className="container mx-auto px-4 relative z-10">
              <div className="text-center mb-20">
                  <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
                      Simplifying B2B Travel
                  </h2>
                  <p className="text-xl text-slate-400 max-w-2xl mx-auto font-light">
                      From lead to booking in <span className="text-teal-400 font-medium">minutes</span> — not days.
                  </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
                  {/* Connecting Line (Desktop) */}
                  <div className="hidden md:block absolute top-12 left-[12%] right-[12%] h-0.5 bg-gradient-to-r from-transparent via-slate-700 to-transparent z-0"></div>

                  {/* Steps */}
                  {[
                      { 
                          step: "01", 
                          title: "Register", 
                          desc: "Create your free agent or DMC account instantly. No setup cost, no subscription.",
                          icon: <UserPlus size={24} className="text-blue-400" />
                      },
                      { 
                          step: "02", 
                          title: "Create", 
                          desc: "Build branded itineraries, quotes, or fixed packages in under 10 seconds using global DMC pricing.",
                          icon: <Zap size={24} className="text-amber-400" />
                      },
                      { 
                          step: "03", 
                          title: "Share", 
                          desc: "Send white-label PDFs or links to clients via WhatsApp, email, or link — fully branded.",
                          icon: <Share2 size={24} className="text-purple-400" />
                      },
                      { 
                          step: "04", 
                          title: "Sell", 
                          desc: "Confirm bookings, earn better margins, and scale your travel business effortlessly.",
                          icon: <TrendingUp size={24} className="text-emerald-400" />
                      }
                  ].map((item, idx) => (
                      <div key={idx} className="relative z-10 group">
                          <div className="flex flex-col items-center text-center">
                              {/* Icon Circle */}
                              <div className="w-24 h-24 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(0,0,0,0.3)] group-hover:border-slate-500 group-hover:shadow-[0_0_30px_rgba(14,165,233,0.15)] transition-all duration-500 relative">
                                  {/* Large Number Background */}
                                  <span className="absolute text-5xl font-black text-slate-800/50 select-none group-hover:text-slate-700/50 transition-colors">
                                      {item.step}
                                  </span>
                                  <div className="relative z-10">
                                      {item.icon}
                                  </div>
                              </div>

                              <h3 className="text-xl font-bold text-white mb-3 group-hover:text-brand-300 transition-colors">
                                  {item.title}
                              </h3>
                              <p className="text-sm text-slate-400 leading-relaxed">
                                  {item.desc}
                              </p>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </section>

      {/* --- ROLE SELECTION CTA --- */}
      <section className="py-24 bg-white">
          <div className="container mx-auto px-4 max-w-5xl">
              <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold text-slate-900">Join the Ecosystem</h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8">
                  {/* Agent Card */}
                  <div className="bg-brand-50 rounded-3xl p-10 border border-brand-100 hover:shadow-2xl hover:scale-[1.01] transition-all relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                          <Users size={120} className="text-brand-600"/>
                      </div>
                      <div className="relative z-10">
                          <h3 className="text-2xl font-bold text-brand-900 mb-2">I am a Travel Agent</h3>
                          <p className="text-brand-800 mb-8 h-12">Looking for net rates, branding tools, and faster itinerary building.</p>
                          <Link to="/signup" className="inline-flex items-center gap-2 bg-brand-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-brand-700 transition shadow-lg shadow-brand-200">
                              Register as Agent <ArrowRight size={18}/>
                          </Link>
                      </div>
                  </div>

                  {/* DMC Card */}
                  <div className="bg-slate-50 rounded-3xl p-10 border border-slate-200 hover:shadow-2xl hover:scale-[1.01] transition-all relative overflow-hidden group">
                       <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                          <Globe size={120} className="text-slate-600"/>
                      </div>
                      <div className="relative z-10">
                          <h3 className="text-2xl font-bold text-slate-900 mb-2">I am a DMC / Operator</h3>
                          <p className="text-slate-600 mb-8 h-12">I want to distribute my inventory and services to thousands of agents.</p>
                          <Link to="/signup" className="inline-flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg">
                              Partner Sign Up <ArrowRight size={18}/>
                          </Link>
                      </div>
                  </div>
              </div>
          </div>
      </section>

    </div>
  );
};
