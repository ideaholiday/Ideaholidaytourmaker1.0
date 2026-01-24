
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { agentService } from '../../services/agentService';
import { useAuth } from '../../context/AuthContext';
import { FixedPackage, Quote, ItineraryItem } from '../../types';
import { Package, Calendar, MapPin, CheckCircle, ArrowRight, Loader2, Info } from 'lucide-react';

export const AgentPackages: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [packages, setPackages] = useState<FixedPackage[]>([]);
  const [destinations, setDestinations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const [pkgs, dests] = await Promise.all([
        adminService.getFixedPackages(),
        adminService.getDestinations()
      ]);
      // Filter only active packages
      setPackages(pkgs.filter(p => p.isActive));
      setDestinations(dests);
      setIsLoading(false);
    };
    load();
  }, []);

  const handleCreateQuote = async (pkg: FixedPackage) => {
    if (!user) return;
    setProcessingId(pkg.id);

    try {
        // 1. Find next valid date
        const nextDate = pkg.validDates
            .map(d => new Date(d))
            .sort((a,b) => a.getTime() - b.getTime())
            .find(d => d.getTime() >= new Date().setHours(0,0,0,0));
            
        const travelDate = nextDate ? nextDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        
        // 2. Resolve City Name
        const dest = destinations.find(d => d.id === pkg.destinationId);
        const destName = dest ? `${dest.city}, ${dest.country}` : 'Fixed Package Trip';

        // 3. Create Base Quote
        const newQuote = await agentService.createQuote(
            user,
            destName,
            travelDate,
            2, // Default 2 pax
            'Valued Client'
        );

        // 4. Construct Itinerary from Package Data
        const itinerary: ItineraryItem[] = [];
        for(let i=1; i<=pkg.nights; i++) {
            itinerary.push({
                day: i,
                title: i===1 ? `Arrival in ${dest?.city || 'Destination'}` : `Day ${i} - ${pkg.packageName}`,
                description: i===1 ? 'Welcome to your fixed departure tour. Transfer to hotel.' : 'Enjoy the planned activities for this package.',
                inclusions: pkg.inclusions.slice(0, 2), // Add first 2 inclusions as sample
                services: [] // Services would ideally be mapped if package had detailed structure, for now empty
            });
        }
        // Add Departure Day
        itinerary.push({
            day: pkg.nights + 1,
            title: 'Departure',
            description: 'Transfer to airport.',
            inclusions: ['Breakfast']
        });

        // 5. Update Quote with Package Specifics
        const updatedQuote: Quote = {
            ...newQuote,
            serviceDetails: `Fixed Package: ${pkg.packageName} (${pkg.nights} Nights)`,
            itinerary: itinerary,
            price: pkg.fixedPrice, // Net Price for Agent
            sellingPrice: pkg.fixedPrice, // Suggest same selling initially
            currency: 'INR',
            status: 'DRAFT',
            isLocked: false
        };

        await agentService.updateQuote(updatedQuote);
        
        // 6. Navigate
        navigate(`/quote/${newQuote.id}`);

    } catch (error) {
        console.error("Error creating quote from package", error);
        alert("Could not create quote. Please try again.");
    } finally {
        setProcessingId(null);
    }
  };

  const getDestinationName = (id: string) => {
      const d = destinations.find(x => x.id === id);
      return d ? d.city : 'Unknown';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="text-brand-600" /> Fixed Departure Packages
        </h1>
        <p className="text-slate-500">Ready-to-book group tours with fixed dates and best rates.</p>
      </div>

      {isLoading ? (
          <div className="flex justify-center py-20 text-slate-400">
              <Loader2 className="animate-spin mr-2" /> Loading packages...
          </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map(pkg => {
                 // Calculate Next Date
                 const nextDate = pkg.validDates
                    .map(d => new Date(d))
                    .sort((a,b) => a.getTime() - b.getTime())
                    .find(d => d.getTime() >= new Date().setHours(0,0,0,0));

                 return (
                    <div key={pkg.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition group">
                        {/* Image Header */}
                        <div className="h-40 bg-slate-200 relative overflow-hidden">
                            {pkg.imageUrl ? (
                                <img src={pkg.imageUrl} alt={pkg.packageName} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                    <Package size={40} opacity={0.5} />
                                </div>
                            )}
                            <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-bold text-slate-800 shadow-sm">
                                {pkg.nights} Nights
                            </div>
                        </div>

                        <div className="p-5 flex-1 flex flex-col">
                            <div className="flex items-center gap-2 text-xs text-brand-600 font-bold mb-1 uppercase tracking-wide">
                                <MapPin size={12} /> {getDestinationName(pkg.destinationId)}
                            </div>
                            <h3 className="font-bold text-lg text-slate-900 mb-2">{pkg.packageName}</h3>
                            <p className="text-xs text-slate-500 line-clamp-2 mb-4 flex-1">{pkg.description || 'No description available.'}</p>
                            
                            <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-2 mb-4">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Next Departure:</span>
                                    <span className="font-bold text-slate-800">
                                        {nextDate ? nextDate.toLocaleDateString() : 'Sold Out'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Available Dates:</span>
                                    <span className="font-bold text-slate-800">{pkg.validDates.length}</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center border-t border-slate-100 pt-4">
                                <div>
                                    <p className="text-xs text-slate-400 font-bold uppercase">Starting From</p>
                                    <p className="text-xl font-bold text-slate-900">₹ {pkg.fixedPrice.toLocaleString()}</p>
                                </div>
                                <button 
                                    onClick={() => handleCreateQuote(pkg)}
                                    disabled={!!processingId}
                                    className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-700 transition flex items-center gap-2 disabled:opacity-70"
                                >
                                    {processingId === pkg.id ? <Loader2 size={16} className="animate-spin"/> : <ArrowRight size={16} />}
                                    Create Quote
                                </button>
                            </div>
                        </div>
                    </div>
                 );
            })}
            {packages.length === 0 && (
                <div className="col-span-3 text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-400">
                    <Info size={40} className="mx-auto mb-3 opacity-50" />
                    <p>No fixed packages available at the moment. Please check back later.</p>
                </div>
            )}
        </div>
      )}
    </div>
  );
};
