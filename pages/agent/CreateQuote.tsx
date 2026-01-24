import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { agentService } from '../../services/agentService';
import { adminService } from '../../services/adminService';
import { generateItinerary } from '../../services/geminiService';
import { MapPin, Calendar, Users, ArrowRight, Sparkles, Moon, Briefcase, Loader2, User } from 'lucide-react';

export const CreateQuote: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const destinations = adminService.getDestinationsSync().filter(d => d.isActive);
  
  const [formData, setFormData] = useState({
    destination: '',
    travelDate: '',
    nights: 4,
    pax: 2,
    guestName: '',
    guestSalutation: 'Mr',
    tripType: 'Leisure',
    useAI: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingText, setLoadingText] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.destination) return;
    
    setIsSubmitting(true);
    setLoadingText('Initializing Workspace...');

    try {
        const fullGuestName = `${formData.guestSalutation}. ${formData.guestName}`;

        // 1. Create Base Quote
        const newQuote = await agentService.createQuote(
            user, 
            formData.destination, 
            formData.travelDate, 
            formData.pax,
            fullGuestName
        );

        // 2. AI Enhancement (Optional)
        let aiContent = '';
        if (formData.useAI) {
            setLoadingText('Consulting AI Agent...');
            const durationText = `${formData.nights} Nights / ${formData.nights + 1} Days`;
            aiContent = await generateItinerary(
                formData.destination, 
                durationText, 
                formData.tripType
            );
        }

        // 3. Update Quote Details
        const updatedQuote = {
            ...newQuote,
            serviceDetails: aiContent || `${formData.nights} Nights ${formData.tripType} Trip to ${formData.destination}.`,
            // Store rough structure in metadata if needed, for now serviceDetails text is fine
        };
        
        await agentService.updateQuote(updatedQuote);

        // 4. Redirect
        navigate(`/quote/${newQuote.id}`);

    } catch (error) {
        console.error("Quote Creation Failed", error);
        alert("Failed to create quote. Please try again.");
        setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 flex justify-center">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">New Quick Quote</h1>
          <p className="text-slate-500">Generate a proposal in seconds. Enhanced with AI.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 relative overflow-hidden">
          {isSubmitting && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-brand-600">
                  <Loader2 size={48} className="animate-spin mb-4" />
                  <p className="font-bold text-lg animate-pulse">{loadingText}</p>
              </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Destination */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Destination</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3.5 text-slate-400" size={20} />
                <select
                  required
                  value={formData.destination}
                  onChange={(e) => setFormData({...formData, destination: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none appearance-none bg-white text-slate-900"
                >
                  <option value="">Select a City/Country...</option>
                  {destinations.map(d => (
                      <option key={d.id} value={`${d.city}, ${d.country}`}>{d.city}, {d.country}</option>
                  ))}
                  <option value="Custom">Other (Custom Request)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Travel Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3.5 text-slate-400" size={20} />
                  <input
                    required
                    type="date"
                    value={formData.travelDate}
                    onChange={(e) => setFormData({...formData, travelDate: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
              </div>

              {/* Guest Name */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Lead Guest Name</label>
                <div className="flex">
                    <select
                        value={formData.guestSalutation}
                        onChange={(e) => setFormData({...formData, guestSalutation: e.target.value})}
                        className="rounded-l-xl border border-r-0 border-slate-300 px-3 py-3 bg-slate-50 focus:ring-2 focus:ring-brand-500 outline-none font-medium text-sm"
                    >
                        <option value="Mr">Mr.</option>
                        <option value="Ms">Ms.</option>
                        <option value="Mrs">Mrs.</option>
                    </select>
                    <div className="relative flex-1">
                        <User className="absolute left-3 top-3.5 text-slate-400" size={20} />
                        <input
                            type="text"
                            value={formData.guestName}
                            onChange={(e) => setFormData({...formData, guestName: e.target.value})}
                            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-r-xl focus:ring-2 focus:ring-brand-500 outline-none"
                            placeholder="John Doe"
                        />
                    </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nights */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Duration (Nights)</label>
                    <div className="relative">
                        <Moon className="absolute left-3 top-3.5 text-slate-400" size={20} />
                        <input
                            required
                            type="number"
                            min="1"
                            max="30"
                            value={formData.nights}
                            onChange={(e) => setFormData({...formData, nights: Number(e.target.value)})}
                            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                    </div>
                </div>

                {/* Pax */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Travellers</label>
                    <div className="relative">
                        <Users className="absolute left-3 top-3.5 text-slate-400" size={20} />
                        <input
                            required
                            type="number"
                            min="1"
                            max="100"
                            value={formData.pax}
                            onChange={(e) => setFormData({...formData, pax: Number(e.target.value)})}
                            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Trip Type */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Trip Type</label>
                <div className="relative">
                    <Briefcase className="absolute left-3 top-3.5 text-slate-400" size={20} />
                    <select
                        value={formData.tripType}
                        onChange={(e) => setFormData({...formData, tripType: e.target.value})}
                        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                    >
                        <option value="Leisure">Leisure / Family</option>
                        <option value="Honeymoon">Honeymoon</option>
                        <option value="Adventure">Adventure</option>
                        <option value="Business">Corporate / Business</option>
                        <option value="Luxury">Luxury</option>
                    </select>
                </div>
            </div>

            {/* AI Toggle */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 p-4 rounded-xl flex items-center justify-between cursor-pointer" onClick={() => setFormData(prev => ({...prev, useAI: !prev.useAI}))}>
                <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-lg text-purple-600 shadow-sm">
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <span className="block font-bold text-purple-900 text-sm">Generate Itinerary with AI</span>
                        <span className="block text-xs text-purple-700">Auto-create day-wise plan based on duration & type.</span>
                    </div>
                </div>
                <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${formData.useAI ? 'bg-purple-600' : 'bg-slate-300'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${formData.useAI ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {formData.useAI ? 'Generate & Create' : 'Create Blank Quote'} 
                <ArrowRight size={20} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};