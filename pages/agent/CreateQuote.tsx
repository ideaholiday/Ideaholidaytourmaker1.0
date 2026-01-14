
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { agentService } from '../../services/agentService';
import { MapPin, Calendar, Users, ArrowRight } from 'lucide-react';
import { adminService } from '../../services/adminService'; // To get destinations

export const CreateQuote: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const destinations = adminService.getDestinations().filter(d => d.isActive);
  
  const [formData, setFormData] = useState({
    destination: '',
    travelDate: '',
    pax: 2
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.destination) return;
    
    setIsSubmitting(true);
    
    // Simulate API delay
    setTimeout(() => {
        const newQuote = agentService.createQuote(
            user, 
            formData.destination, 
            formData.travelDate, 
            formData.pax
        );
        navigate(`/quote/${newQuote.id}`);
    }, 800);
  };

  return (
    <div className="container mx-auto px-4 py-12 flex justify-center">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Build a New Itinerary</h1>
          <p className="text-slate-500">Start by selecting the destination and basic trip details.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Destination</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-slate-400" size={20} />
                <select
                  required
                  value={formData.destination}
                  onChange={(e) => setFormData({...formData, destination: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none appearance-none bg-white"
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Travel Start Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 text-slate-400" size={20} />
                  <input
                    required
                    type="date"
                    value={formData.travelDate}
                    onChange={(e) => setFormData({...formData, travelDate: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Number of Travellers</label>
                <div className="relative">
                  <Users className="absolute left-3 top-3 text-slate-400" size={20} />
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

            <div className="pt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-brand-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-brand-700 transition flex items-center justify-center gap-2 shadow-lg shadow-brand-200"
              >
                {isSubmitting ? 'Creating Workspace...' : 'Create Quote Workspace'}
                {!isSubmitting && <ArrowRight size={20} />}
              </button>
              <p className="text-center text-xs text-slate-400 mt-4">
                You will be redirected to the quote editor to add hotels and services.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
