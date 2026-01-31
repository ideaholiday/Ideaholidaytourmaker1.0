
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bookingService } from '../../services/bookingService';
// import { profileService } from '../../services/profileService'; // Removed sync service dependency
import { agentService } from '../../services/agentService'; 
import { Booking, Quote, User, UserRole, Traveler, PricingBreakdown } from '../../types';
import { MapPin, Calendar, Users, CheckCircle, Briefcase, ArrowRight, CreditCard, ShieldCheck, Download, Printer } from 'lucide-react';
import { generateQuotePDF } from '../../utils/pdfGenerator';
import { ClientPortalLayout } from '../../components/client/ClientPortalLayout';
import { AgentContactCard } from '../../components/client/AgentContactCard';
import { ClientBookingModal } from '../../components/client/ClientBookingModal';
import { useClientBranding } from '../../hooks/useClientBranding';
import { ItineraryView } from '../../components/ItineraryView';
import { dbHelper } from '../../services/firestoreHelper'; 

// Internal Component to consume hooks inside the provider
const TripContent: React.FC<{ 
  data: Booking | Quote; 
  agent: User | null;
  loading: boolean;
  onBook: () => void;
}> = ({ data, agent, loading, onBook }) => {
  
  const { styles } = useClientBranding();
  const navigate = useNavigate();

  const handleDownloadPDF = () => {
      // Ensure data and agent are available
      if (!data) return;
      // If agent is null, PDF generator will fallback to platform defaults, which is acceptable if agent loading failed
      
      const isBooking = 'payments' in data;
      let breakdown: PricingBreakdown | null = null;
      
      // For Client view, we construct a breakdown based on the single "selling price"
      const price = isBooking ? (data as Booking).sellingPrice : (data as Quote).sellingPrice || (data as Quote).price || 0;

      breakdown = {
          finalPrice: price,
          perPersonPrice: data.paxCount > 0 ? (price / data.paxCount) : 0,
          netCost: 0, 
          companyMarkupValue: 0, 
          agentMarkupValue: 0, 
          gstAmount: 0, 
          subtotal: 0,
          supplierCost: 0,
          platformNetCost: 0
      };
      
      // Pass the LOADED agent profile to ensuring branding is correct in PDF
      generateQuotePDF(data as Quote, breakdown, UserRole.AGENT, agent);
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center text-slate-400">Loading Trip Details...</div>;

  if (!data) return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-500">
          <div className="bg-white p-8 rounded-xl shadow-sm text-center">
              <ShieldCheck size={48} className="mx-auto mb-4 text-slate-300" />
              <h2 className="text-xl font-bold text-slate-900 mb-2">Trip Not Found</h2>
              <p>The link might be expired or incorrect.</p>
          </div>
      </div>
  );

  const isBooking = 'payments' in data;
  const status = data.status;
  const bookingData = isBooking ? (data as Booking) : null;
  
  // Show "Book Now" if it's a Quote (Pending)
  const showBookAction = !isBooking && (data.status === 'PENDING' || data.status === 'DRAFT' || data.status === 'APPROVED'); 
  
  // Show "Make Payment" if Booking Confirmed and Balance > 0
  const showPaymentAction = isBooking && 
                            bookingData && bookingData.balanceAmount > 0 && 
                            (status === 'CONFIRMED' || status === 'IN_PROGRESS' || status === 'REQUESTED');

  const displayPrice = isBooking ? (data as Booking).sellingPrice : ((data as Quote).sellingPrice || (data as Quote).price || 0);
  const currency = data.currency || 'INR';

  return (
    <div className="pb-12">
      {/* Hero Section */}
      <div 
        className="text-white py-16 px-4 relative overflow-hidden bg-slate-900"
        style={styles.primaryBg}
      >
          <div className="absolute inset-0 bg-black/20"></div>
          {/* Decorative Circles */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-10 -mb-10 pointer-events-none"></div>

          <div className="container mx-auto relative z-10 text-center">
              <h2 className="text-3xl md:text-5xl font-bold mb-4 drop-shadow-sm">{data.destination}</h2>
              <p className="text-white/90 text-lg mb-8 font-medium">
                  {data.paxCount} Travellers &bull; {new Date(data.travelDate).toLocaleDateString(undefined, { dateStyle: 'long' })}
              </p>
              
              {/* Status Tracker */}
              <div className="max-w-2xl mx-auto bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 shadow-lg">
                  <div className="flex justify-between items-center relative">
                      {/* Line */}
                      <div className="absolute top-4 left-0 w-full h-0.5 bg-white/20 -z-10"></div>
                      
                      {['Draft', 'Confirmed', 'Travel'].map((step, idx) => {
                          let active = false;
                          if (status === 'DRAFT' || status === 'PENDING' || status === 'REQUESTED') active = idx === 0;
                          if (status === 'CONFIRMED' || status === 'BOOKED') active = idx <= 1;
                          if (status === 'IN_PROGRESS' || status === 'COMPLETED') active = idx <= 2;
                          
                          return (
                            <div key={step} className="flex flex-col items-center gap-2 z-10">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${active ? 'bg-white text-brand-600' : 'bg-slate-800 text-slate-400'}`}>
                                    {active ? <CheckCircle size={16} /> : idx + 1}
                                </div>
                                <span className="text-xs font-medium text-white/80">{step}</span>
                            </div>
                          )
                      })}
                  </div>
              </div>
          </div>
      </div>

      <div className="container mx-auto px-4 -mt-8 relative z-20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                  {/* Summary Card */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                      <h3 className="font-bold text-slate-900 text-lg mb-4 flex items-center gap-2">
                          <Briefcase className="text-brand-500" size={20} /> Trip Summary
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                              <p className="text-xs text-slate-500 uppercase font-bold">Reference</p>
                              <p className="font-mono text-slate-800 font-medium">{data.uniqueRefNo}</p>
                          </div>
                          <div>
                              <p className="text-xs text-slate-500 uppercase font-bold">Duration</p>
                              <p className="text-slate-800 font-medium">{data.itinerary ? data.itinerary.length : 0} Days</p>
                          </div>
                          <div>
                              <p className="text-xs text-slate-500 uppercase font-bold">Travel Date</p>
                              <p className="text-slate-800 font-medium">{new Date(data.travelDate).toLocaleDateString()}</p>
                          </div>
                          <div>
                              <p className="text-xs text-slate-500 uppercase font-bold">Guests</p>
                              <p className="text-slate-800 font-medium">{data.paxCount} Pax</p>
                          </div>
                      </div>
                  </div>

                  {/* Itinerary */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                       <h3 className="font-bold text-slate-900 text-lg mb-6 flex items-center gap-2">
                          <MapPin className="text-brand-500" size={20} /> Daily Itinerary
                      </h3>
                      <ItineraryView itinerary={data.itinerary} startDate={data.travelDate} />
                  </div>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1 space-y-6">
                  
                  {/* Price Card */}
                  <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 sticky top-24">
                      <div className="text-center mb-6">
                          <p className="text-sm text-slate-500 font-medium">Total Trip Cost</p>
                          <h2 className="text-4xl font-bold text-slate-900 mt-2 flex items-center justify-center gap-1" style={styles.primaryText}>
                             {currency} {displayPrice.toLocaleString()}
                          </h2>
                          <p className="text-xs text-slate-400 mt-1">Inclusive of all taxes</p>
                      </div>

                      <div className="space-y-3">
                          {showBookAction && (
                              <button 
                                onClick={onBook}
                                className="w-full py-4 rounded-xl font-bold text-lg text-white shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 animate-pulse"
                                style={styles.button}
                              >
                                  Confirm Booking <ArrowRight size={20} />
                              </button>
                          )}

                          {showPaymentAction && bookingData && (
                              <button 
                                onClick={() => navigate(`/payment/${bookingData.id}`)}
                                className="w-full py-4 rounded-xl font-bold text-lg text-white shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                                style={styles.button}
                              >
                                  <CreditCard size={20} /> Pay Now
                              </button>
                          )}

                          <button 
                            onClick={handleDownloadPDF}
                            className="w-full py-3 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition flex items-center justify-center gap-2"
                          >
                              <Download size={18} /> Download Itinerary
                          </button>
                      </div>

                      <div className="mt-6 pt-6 border-t border-slate-100">
                          <AgentContactCard />
                      </div>
                  </div>

              </div>
          </div>
      </div>
    </div>
  );
};

export const ClientTripView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [data, setData] = useState<Booking | Quote | null>(null);
    const [agent, setAgent] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

    useEffect(() => {
        const loadTrip = async () => {
            if (!id) return;
            
            try {
                // 1. Try Finding in Bookings
                let booking = await bookingService.getBooking(id);
                let agentId = '';
                
                if (booking) {
                    setData(booking);
                    agentId = booking.agentId;
                } else {
                    // 2. Try Finding in Quotes (Firestore)
                    const quote = await dbHelper.getById<Quote>('quotes', id);
                    if (quote) {
                        setData(quote);
                        agentId = quote.agentId;
                    }
                }

                // 3. ASYNC AGENT LOAD (Critical Fix for Public View)
                if (agentId) {
                    // Fetch agent directly from DB, bypassing internal admin cache
                    const agentProfile = await dbHelper.getById<User>('users', agentId);
                    if (agentProfile) {
                        setAgent(agentProfile);
                    }
                }
                
            } catch(e) { 
                console.error("Public fetch failed", e); 
            } finally {
                setLoading(false);
            }
        };
        loadTrip();
    }, [id]);

    const handleBookRequest = (travelers: Traveler[]) => {
        if (!data || 'payments' in data) return; // Only Quotes can be booked
        
        // Convert to Booking Request
        bookingService.requestPublicBooking(data as Quote, travelers).then((newBooking) => {
            alert("Booking Request Sent! Your agent will contact you shortly.");
            setIsBookingModalOpen(false);
            // Reload as booking
            setData(newBooking);
        });
    };

    return (
        <ClientPortalLayout agent={agent}>
            <TripContent 
                data={data!} 
                agent={agent} 
                loading={loading}
                onBook={() => setIsBookingModalOpen(true)}
            />
            {data && !('payments' in data) && (
                <ClientBookingModal 
                    quote={data as Quote}
                    isOpen={isBookingModalOpen}
                    onClose={() => setIsBookingModalOpen(false)}
                    onSubmit={handleBookRequest}
                />
            )}
        </ClientPortalLayout>
    );
};
