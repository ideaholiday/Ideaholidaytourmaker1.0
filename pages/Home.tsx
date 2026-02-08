
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Zap, Globe, Palette, BarChart3, Cpu, MessageCircle, TrendingUp, 
  ArrowRight, CheckCircle2, PlayCircle, Star, ShieldCheck, 
  MapPin, Phone, Quote, XCircle
} from 'lucide-react';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState({ days: 2, hours: 15, mins: 47 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.mins > 0) return { ...prev, mins: prev.mins - 1 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, mins: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, mins: 59 };
        return prev;
      });
    }, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const destinations = [
    { name: 'Thailand', image: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&q=80&w=600', tag: 'Adventure' },
    { name: 'Dubai', image: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&q=80&w=600', tag: 'Luxury' },
    { name: 'Vietnam', image: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&q=80&w=600', tag: 'Nature' },
    { name: 'Bali', image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=600', tag: 'Honeymoon' },
    { name: 'Malaysia', image: 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&q=80&w=600', tag: 'City Break' },
    { name: 'Europe', image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=600', tag: 'MICE' },
    { name: 'Sri Lanka', image: 'https://images.unsplash.com/photo-1566296314736-6eaac1ca0cb9?auto=format&fit=crop&q=80&w=600', tag: 'Culture' },
  ];

  const features = [
    { icon: <Zap size={24} />, title: 'Live Rate Engine', desc: 'Access real-time B2B pricing for 50+ destinations. No hidden fees.' },
    { icon: <Palette size={24} />, title: 'White-Label Everything', desc: 'Proposals, invoices, vouchers—all under your brand. Zero mention of ours.' },
    { icon: <BarChart3 size={24} />, title: 'Dashboard Intelligence', desc: 'Track bookings, earnings, and client history in one smart dashboard.' },
    { icon: <Cpu size={24} />, title: 'Automate Proposals', desc: 'Convert inquiries to polished itineraries in <60 seconds.' },
    { icon: <MessageCircle size={24} />, title: 'Direct Partner Support', desc: 'Dedicated WhatsApp/phone support—no bots, no delay.' },
    { icon: <TrendingUp size={24} />, title: 'Higher Margin Plans', desc: 'Tiered commissions. Earn more as you grow.' },
  ];

  const testimonials = [
      {
          text: "Before Idea Holiday, I’d spend days chasing suppliers. Now, I access 100+ destinations directly from DMCs, get live prices in 10 seconds, and send branded proposals instantly.",
          name: "Ananya R.",
          role: "Travel Agent, Mumbai",
          image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150"
      },
      {
          text: "Buying direct from DMCs used to mean endless back-and-forth. Now, I can confidently buy global tour packages directly with full transparency. The best part? I present everything under my own branding.",
          name: "Vikram S.",
          role: "Tour Operator, Delhi",
          image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150"
      },
      {
          text: "As a DMC in Thailand, reaching agents was hard. Now with Idea Holiday, we sell our packages globally in minutes. No more heavy marketing spend—the platform handles distribution.",
          name: "Channarong P.",
          role: "DMC Owner, Phuket",
          image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150"
      },
      {
          text: "My revenue doubled in 6 months. I’m directly connected to DMCs worldwide, offering better prices and faster confirmations. The 10-second quote feature alone saves me 20 hours a week.",
          name: "Priya M.",
          role: "Travel Consultant, Bangalore",
          image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150"
      },
      {
          text: "Before, we spent 80% of our time on sales calls and custom quotes. Now, agents directly access our live inventory—tours, activities, transfers—and book instantly.",
          name: "Maria L.",
          role: "Operations Director, Goa DMC",
          image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=150"
      },
      {
          text: "This platform transforms how we partner. Instead of chasing individual agents, we now have thousands of verified agents discovering and selling our packages under their own branding.",
          name: "David K.",
          role: "CEO, Dubai Experiences DMC",
          image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=150"
      }
  ];

  return (
    <div className="flex-1 flex flex-col font-sans bg-white text-slate-900 overflow-x-hidden">
      
      {/* Floating WhatsApp Widget */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-4 group">
          <div className="bg-white px-4 py-2 rounded-xl shadow-lg border border-slate-100 text-sm font-bold text-slate-700 animate-in slide-in-from-right-10 fade-in duration-700 hidden md:block relative">
             Need Help? Chat with us!
             <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-white transform rotate-45 border-t border-r border-slate-100"></div>
          </div>
          <a 
            href="https://wa.me/919696777391?text=Hi,%20I%20am%20interested%20in%20joining%20Idea%20Holiday%20B2B%20Network." 
            target="_blank" 
            rel="noreferrer"
            className="bg-[#25D366] p-4 rounded-full shadow-2xl hover:scale-110 transition-transform cursor-pointer flex items-center justify-center text-white relative"
            title="Chat with Support"
          >
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
            <MessageCircle size={32} fill="white" />
          </a>
      </div>

      {/* --- 1. HERO SECTION --- */}
      <section className="relative min-h-[90vh] flex items-center bg-[#020617] overflow-hidden">
        {/* Dynamic Background Effects */}
        <div className="absolute inset-0">
          {/* Main Glows */}
          <div className="absolute -top-[30%] -right-[10%] w-[1000px] h-[1000px] bg-indigo-600/20 rounded-full blur-[130px] animate-pulse"></div>
          <div className="absolute -bottom-[30%] -left-[10%] w-[1000px] h-[1000px] bg-blue-600/20 rounded-full blur-[130px]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-teal-500/10 rounded-full blur-[100px]"></div>
          
          {/* Texture Overlay */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10 flex flex-col items-center text-center pt-20">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-teal-400/30 text-teal-400 text-xs font-bold mb-8 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
                Now Live: Instant Rates 50+ Destination
            </div>

            <h1 className="text-5xl md:text-7xl font-heading font-bold text-white mb-6 leading-tight max-w-5xl">
                Access Global DMC Prices & <br className="hidden md:block"/>
                <span className="text-red-500" style={{ WebkitTextStroke: '2px white', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>Create itineraries in 10 seconds.</span>
            </h1>

            <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-3xl font-light">
                Real-time rates, automated proposals, and white-label tools—all in one dashboard. <span className="text-white font-medium">Start free.</span>
            </p>

            <Link 
                to="/signup"
                className="group relative px-8 py-5 bg-accent-500 hover:bg-accent-600 text-white rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(255,107,53,0.4)] hover:shadow-[0_0_30px_rgba(255,107,53,0.6)] transition-all transform hover:-translate-y-1 flex items-center gap-3 overflow-hidden"
            >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1s_infinite]"></div>
                🚀 GET INSTANT ACCESS — 60 Sec Signup
            </Link>

            <div className="mt-12 flex flex-col items-center">
                <p className="text-slate-400 text-sm mb-4">Used by <span className="text-white font-bold">3,200+</span> travel businesses across India & UAE</p>
                <div className="flex gap-8 opacity-40 grayscale items-center justify-center flex-wrap">
                    {/* Placeholder Partner Logos */}
                    <div className="font-heading font-bold text-xl text-white">TRAVEL<span className="text-teal-400">X</span></div>
                    <div className="font-heading font-bold text-xl text-white">SKY<span className="text-blue-400">TRIP</span></div>
                    <div className="font-heading font-bold text-xl text-white">GLOBAL<span className="text-purple-400">DMC</span></div>
                    <div className="font-heading font-bold text-xl text-white">WANDER<span className="text-orange-400">LUST</span></div>
                </div>
            </div>
        </div>
      </section>

      {/* --- 2. VALUE GRID --- */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-heading font-bold text-navy-900 mb-4">Everything You Need to Dominate</h2>
                <p className="text-slate-500 max-w-2xl mx-auto">Stop using spreadsheets. Upgrade to a command center designed for modern travel sales.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
                {features.map((f, i) => (
                    <div key={i} className="flex gap-4 group p-4 rounded-xl hover:bg-slate-50 transition-colors">
                        <div className="w-12 h-12 rounded-lg bg-navy-900 text-teal-400 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                            {f.icon}
                        </div>
                        <div>
                            <h3 className="font-bold text-navy-900 text-lg mb-2">{f.title}</h3>
                            <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* --- 3. PLATFORM SHOWCASE --- */}
      <section className="py-24 bg-slate-50 overflow-hidden">
         <div className="container mx-auto px-4">
             <div className="flex flex-col lg:flex-row items-center gap-16">
                 {/* Mockup */}
                 <div className="lg:w-1/2 relative">
                     <div className="absolute inset-0 bg-gradient-to-tr from-teal-400 to-blue-500 rounded-full blur-[100px] opacity-20 transform -translate-x-20 translate-y-20"></div>
                     <div className="relative z-10 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform rotate-y-12 hover:rotate-0 transition duration-700">
                         {/* Fake Browser Header */}
                         <div className="bg-slate-100 p-3 flex gap-2 border-b border-slate-200">
                             <div className="w-3 h-3 rounded-full bg-red-400"></div>
                             <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                             <div className="w-3 h-3 rounded-full bg-green-400"></div>
                             <div className="ml-4 bg-white rounded-md px-3 py-1 text-[10px] text-slate-400 w-64">b2b.ideaholiday.com/dashboard</div>
                         </div>
                         {/* Fake Content */}
                         <div className="p-6 bg-slate-50">
                             <div className="flex gap-4 mb-6">
                                 <div className="w-1/4 h-24 bg-white rounded-xl shadow-sm p-4">
                                     <div className="w-8 h-8 rounded bg-blue-100 mb-2"></div>
                                     <div className="w-16 h-3 bg-slate-200 rounded"></div>
                                 </div>
                                 <div className="w-1/4 h-24 bg-white rounded-xl shadow-sm p-4">
                                     <div className="w-8 h-8 rounded bg-teal-100 mb-2"></div>
                                     <div className="w-16 h-3 bg-slate-200 rounded"></div>
                                 </div>
                                 <div className="w-2/4 h-24 bg-navy-900 rounded-xl shadow-lg p-4 flex items-center justify-center text-white">
                                     <div className="text-center">
                                         <div className="text-2xl font-bold">₹ 1.2L</div>
                                         <div className="text-[10px] opacity-70">Total Revenue</div>
                                     </div>
                                 </div>
                             </div>
                             <div className="space-y-3">
                                 <div className="h-12 bg-white rounded-lg shadow-sm border border-slate-200 flex items-center px-4 justify-between">
                                     <div className="w-32 h-3 bg-slate-200 rounded"></div>
                                     <div className="w-16 h-6 bg-green-100 rounded"></div>
                                 </div>
                                 <div className="h-12 bg-white rounded-lg shadow-sm border border-slate-200 flex items-center px-4 justify-between">
                                     <div className="w-24 h-3 bg-slate-200 rounded"></div>
                                     <div className="w-16 h-6 bg-amber-100 rounded"></div>
                                 </div>
                             </div>
                         </div>
                     </div>
                 </div>

                 {/* Copy */}
                 <div className="lg:w-1/2">
                     <span className="text-accent-600 font-bold uppercase tracking-wider text-sm mb-2 block">Zero Learning Curve</span>
                     <h2 className="text-4xl font-heading font-bold text-navy-900 mb-6">No Training Needed</h2>
                     <p className="text-lg text-slate-600 mb-6 italic border-l-4 border-teal-400 pl-4">
                        “If you can use WhatsApp, you can use our platform. The most intuitive B2B tool for travel professionals.”
                     </p>
                     
                     <div className="space-y-4 mb-8">
                         {['Drag-and-Drop day planner', 'Create Itinerary in 10 Seconds', 'Generate Quotes with your Branding', 'Generate Image with your Branding', 'Real-time availability'].map((feat, i) => (
                             <div key={i} className="flex items-center gap-3">
                                 <CheckCircle2 size={20} className="text-teal-500" />
                                 <span className="font-medium text-slate-800">{feat}</span>
                             </div>
                         ))}
                     </div>

                     <button className="text-navy-900 font-bold flex items-center gap-2 hover:gap-4 transition-all group">
                         Explore Features in Detail <ArrowRight size={20} className="text-accent-500" />
                     </button>
                 </div>
             </div>
         </div>
      </section>

      {/* --- 4. DESTINATION SHOWCASE --- */}
      <section className="py-24 bg-navy-900 text-white overflow-hidden">
          <div className="container mx-auto px-4 mb-10 flex justify-between items-end">
              <div>
                  <h2 className="text-3xl font-heading font-bold mb-2">Trending Destinations</h2>
                  <p className="text-slate-400">Instant quotes available for these hotspots.</p>
              </div>
              <div className="hidden md:flex gap-2">
                  <span className="text-sm font-medium text-teal-400">Scroll to explore &rarr;</span>
              </div>
          </div>

          <div className="flex overflow-x-auto snap-x space-x-6 pb-8 px-4 no-scrollbar container mx-auto">
              {destinations.map((dest, i) => (
                  <div key={i} className="snap-center shrink-0 w-80 h-[400px] relative rounded-2xl overflow-hidden group cursor-pointer border border-white/10 hover:border-teal-400/50 transition-all">
                      <img src={dest.image} alt={dest.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-navy-900 from-20% via-navy-900/40 to-transparent"></div>
                      <div className="absolute top-4 right-4 bg-navy-900/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold border border-white/20">
                          {dest.tag}
                      </div>
                      <div className="absolute bottom-0 left-0 w-full p-6 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                          <h3 className="text-2xl font-bold mb-2">{dest.name}</h3>
                          <button className="text-sm font-bold text-teal-400 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity delay-100">
                              View Sample Itinerary <ArrowRight size={14} />
                          </button>
                      </div>
                  </div>
              ))}
          </div>
      </section>

      {/* --- 5. SOCIAL PROOF (Stats) --- */}
      <section className="py-20 bg-white">
         <div className="container mx-auto px-4 max-w-6xl">
             <div className="grid md:grid-cols-2 gap-16 items-center">
                 <div className="relative">
                     {/* Video Placeholder */}
                     <div className="bg-slate-100 rounded-2xl aspect-video flex items-center justify-center relative overflow-hidden shadow-lg group cursor-pointer">
                         <img src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&q=80&w=800" className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition duration-700" alt="Testimonial" />
                         <div className="absolute inset-0 bg-navy-900/20 group-hover:bg-navy-900/40 transition"></div>
                         <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center z-10 shadow-xl group-hover:scale-110 transition">
                             <PlayCircle size={32} className="text-accent-500 ml-1" />
                         </div>
                         <div className="absolute bottom-4 left-4 text-white text-left">
                             <p className="font-bold text-sm">Rahul S.</p>
                             <p className="text-xs opacity-90">CEO, Dream Travels Mumbai</p>
                         </div>
                     </div>
                 </div>

                 <div>
                     <h2 className="text-3xl font-heading font-bold text-navy-900 mb-6">Trusted by the Industry</h2>
                     <div className="grid grid-cols-2 gap-y-8 gap-x-12">
                         <div>
                             <p className="text-4xl font-bold text-navy-900">4,200+</p>
                             <p className="text-sm text-slate-500 uppercase tracking-wide font-medium mt-1">Agents Quoting</p>
                         </div>
                         <div>
                             <p className="text-4xl font-bold text-navy-900">850+</p>
                             <p className="text-sm text-slate-500 uppercase tracking-wide font-medium mt-1">Global DMCs</p>
                         </div>
                         <div>
                             <p className="text-4xl font-bold text-navy-900 flex items-center gap-1">15 <span className="text-lg text-slate-400 font-normal">hrs</span></p>
                             <p className="text-sm text-slate-500 uppercase tracking-wide font-medium mt-1">Saved Weekly/Agent</p>
                         </div>
                         <div>
                             <p className="text-4xl font-bold text-navy-900">5x</p>
                             <p className="text-sm text-slate-500 uppercase tracking-wide font-medium mt-1">Faster Distribution</p>
                         </div>
                     </div>
                 </div>
             </div>
         </div>
      </section>

      {/* --- 6. TESTIMONIALS (Replaces Registration Form) --- */}
      <section className="py-24 bg-slate-50">
          <div className="container mx-auto px-4 max-w-6xl">
              <div className="text-center mb-16">
                  <h2 className="text-3xl md:text-4xl font-heading font-bold text-navy-900 mb-4">Partner Success Stories</h2>
                  <p className="text-slate-500 max-w-2xl mx-auto">
                    "Idea Holiday isn’t just a booking system—it’s removing friction from the entire B2B travel chain."
                  </p>
              </div>

              <div className="flex overflow-x-auto snap-x space-x-6 pb-8 px-4 no-scrollbar">
                  {testimonials.map((t, i) => (
                      <div key={i} className="snap-center shrink-0 w-full md:w-[400px] bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                          <Quote className="text-teal-400 mb-4 h-8 w-8" />
                          <p className="text-slate-600 mb-6 flex-grow italic">"{t.text}"</p>
                          <div className="flex items-center gap-4 mt-auto">
                              <img src={t.image} alt={t.name} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                              <div>
                                  <p className="font-bold text-slate-900 text-sm">{t.name}</p>
                                  <p className="text-xs text-slate-500">{t.role}</p>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>

              <div className="mt-12 text-center">
                  <Link 
                      to="/signup" 
                      className="inline-flex items-center justify-center gap-2 bg-navy-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-navy-800 transition shadow-lg transform hover:-translate-y-1"
                  >
                      Join Our Network <ArrowRight size={18} />
                  </Link>
              </div>
          </div>
      </section>

      {/* --- 7. COMPARISON SECTION --- */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-navy-900 mb-4">Why 4,200+ Agents Switched</h2>
            <p className="text-slate-500">Stop struggling with outdated processes. Upgrade to the modern standard.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 relative">
            {/* VS Badge */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow-lg z-10 hidden md:block">
                <div className="bg-slate-900 text-white font-bold rounded-full w-12 h-12 flex items-center justify-center">VS</div>
            </div>

            {/* Old Way */}
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 opacity-70 hover:opacity-100 transition duration-300">
                <h3 className="text-xl font-bold text-slate-700 mb-6 flex items-center gap-2">
                    <div className="bg-red-100 p-2 rounded-full"><XCircle className="text-red-500" size={24} /></div>
                    The Old Way
                </h3>
                <ul className="space-y-4">
                    <li className="flex gap-3 text-slate-600"><XCircle className="text-red-400 shrink-0" size={20}/> Wait 1-2 days for quotes</li>
                    <li className="flex gap-3 text-slate-600"><XCircle className="text-red-400 shrink-0" size={20}/> Multiple supplier calls & emails</li>
                    <li className="flex gap-3 text-slate-600"><XCircle className="text-red-400 shrink-0" size={20}/> Manual proposal creation (Word/Excel)</li>
                    <li className="flex gap-3 text-slate-600"><XCircle className="text-red-400 shrink-0" size={20}/> Limited destination access</li>
                </ul>
            </div>

            {/* New Way */}
            <div className="bg-white p-8 rounded-2xl border-2 border-teal-500 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-teal-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">Recommended</div>
                <h3 className="text-xl font-bold text-teal-700 mb-6 flex items-center gap-2">
                    <div className="bg-teal-100 p-2 rounded-full"><CheckCircle2 className="text-teal-600" size={24} /></div>
                    The Idea Holiday Way
                </h3>
                <ul className="space-y-4">
                    <li className="flex gap-3 text-slate-800 font-medium"><CheckCircle2 className="text-teal-500 shrink-0" size={20}/> 10-second live DMC rates</li>
                    <li className="flex gap-3 text-slate-800 font-medium"><CheckCircle2 className="text-teal-500 shrink-0" size={20}/> Direct DMC access (No Middlemen)</li>
                    <li className="flex gap-3 text-slate-800 font-medium"><CheckCircle2 className="text-teal-500 shrink-0" size={20}/> Auto-branded PDF Proposals</li>
                    <li className="flex gap-3 text-slate-800 font-medium"><CheckCircle2 className="text-teal-500 shrink-0" size={20}/> Access 100+ Destinations instantly</li>
                </ul>
            </div>
            </div>
        </div>
      </section>

      {/* --- 8. FINAL CTA (Urgency Section Updated) --- */}
      <section className="py-20 bg-navy-900 relative overflow-hidden">
          {/* Background Glows */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-teal-500/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>

          <div className="container mx-auto px-4 relative z-10 text-center max-w-4xl">
              <h2 className="text-4xl md:text-6xl font-heading font-bold text-white mb-6 leading-tight">
                  Ready to Quote Faster & <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-400">Earn More?</span>
              </h2>
              <p className="text-slate-300 text-xl mb-10 max-w-2xl mx-auto">
                  Join 4,200+ travel agents who get live DMC rates in 10 seconds, create branded proposals instantly, and access 100+ destinations directly.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link 
                      to="/signup" 
                      className="w-full sm:w-auto px-8 py-4 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(20,184,166,0.3)] transition transform hover:-translate-y-1 flex items-center justify-center gap-2"
                  >
                      🚀 START FREE & SEE LIVE RATES
                  </Link>
                   
              </div>
              
              <div className="mt-8 flex items-center justify-center gap-6 text-sm text-slate-400">
                  <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-teal-500"/> No Subscription, access all free for first 1 Years.</span>
                  <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-teal-500"/> No setup fees</span>
              </div>
          </div>
      </section>

    </div>
  );
};
