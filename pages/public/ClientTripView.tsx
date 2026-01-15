
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bookingService } from '../../services/bookingService';
import { profileService } from '../../services/profileService';
import { Booking, Quote, User, ItineraryItem, UserRole, Traveler, PricingBreakdown } from '../../types';
import { MapPin, Calendar, Users, CheckCircle, Clock, Download, Plane, Hotel, Star, ShieldCheck, Car, Briefcase, ArrowRight, CreditCard } from 'lucide-react';
import { INITIAL_QUOTES } from '../../constants';
import { generateQuotePDF } from '../../utils/pdfGenerator';
import { ClientPortalLayout } from '../../components/client/ClientPortalLayout';
import { AgentContactCard } from '../../components/client/AgentContactCard';
import { ClientBookingModal } from '../../components/client/ClientBookingModal';
import { useClientBranding } from '../../hooks/useClientBranding';

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
      if (!data || !agent) return;
      const isQuote = !('payments' in data);
      
      let breakdown: PricingBreakdown | null = null;
      
      if (isQuote) {
          const sellingPrice = data.sellingPrice || (data as Quote).price || 0;
          breakdown = {
              finalPrice: sellingPrice,
              perPersonPrice: (sellingPrice / data.paxCount),
              netCost: 0, 
              companyMarkupValue: 0, 
              agentMarkupValue: 0, 
              gstAmount: 0, 
              subtotal: 0,
              supplierCost: 0,
              platformNetCost: 0
          };
      }
      
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
  const showBookAction = !isBooking && (data.status === 'PENDING' || data.status === 'CONFIRMED'); 
  
  // Show "Make Payment" if Booking Confirmed and Balance > 0
  const showPaymentAction = isBooking && 
                            bookingData?.balanceAmount > 0 && 
                            (status === 'CONFIRMED' || status === 'IN_PROGRESS' || status === 'REQUESTED'); // Requested bookings can pay advance too

  // Logic to show pricing or not
  // For Client View, we always show sellingPrice if available
  const displayPrice = data.sellingPrice || (data as Quote).price || 0;

  return (
    <>
      {/* Hero Section */}
      <div 
        className="text-white py-16 px-4 relative overflow-hidden"
        style={styles.primaryBg}
      >
          <div className="absolute inset-0 bg-black/20"></div>
          {/* Decorative Circles */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-10 -mb-10"></div>

          <div className="container mx-auto relative z-10 text-center">
              <h2 className="text-3xl md:text-5xl font-bold mb-4 drop-shadow-sm">{data.destination}</h2>
              <p className="text-white/90 text-lg mb-8 font-medium">
                  {data.paxCount} Travellers &bull; {new Date(data.travelDate).toLocaleDateString(undefined, { dateStyle: 'long' })}
              </p>
              
              {/* Status Tracker */}
              <div className="max-w-2xl mx-auto bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 shadow-lg">
                  <div className="flex justify-between items-center relative">
                      {/* Line */}
                      <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/20 -z-10"></div>
                      
                      <div className="flex flex-col items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg"><CheckCircle size={16}/></div>
                          <span className="text-xs font-medium">Proposal</span>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${isBooking ? 'bg-green-500 text-white' : 'bg-white text-slate-800'}`}>
                              {isBooking ? <CheckCircle size={16}/> : <Clock size={16}/>}
                          </div>
                          <span className="text-xs font-medium">Booked</span>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${status === 'COMPLETED' ? 'bg-green-500 text-white' : (status === 'IN_PROGRESS' ? 'bg-blue-500 text-white animate-pulse' : 'bg-slate-300 text-slate-500')}`}>
                              {status === 'COMPLETED' ? <CheckCircle size={16}/> : (status === 'IN_PROGRESS' ? <Plane size={16}/> : <Plane size={16}/>)}
                          </div>
                          <span className="text-xs font-medium">Travelled</span>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      <div className="container mx-auto px-4 py-8 -mt-8 relative z-20">
          
          {/* CONFIRMATION BANNER (If Booking) */}
          {isBooking && (status === 'CONFIRMED' || status === 'REQUESTED') && (
              <div className="bg-white rounded-2xl shadow-lg border-l-4 border-l-green-500 p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4">
                  <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-full ${status === 'CONFIRMED' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                          <CheckCircle size={32} />
                      </div>
                      <div>
                          <h3 className="text-xl font-bold text-slate-900">
                              {status === 'CONFIRMED' ? 'Booking Confirmed!' : 'Booking Requested'}
                          </h3>
                          <p className="text-slate-500">
                              Reference: <span className="font-mono font-bold text-slate-800">{data.uniqueRefNo}</span>
                          </p>
                      </div>
                  </div>
                  <div className="text-right">
                      <p className="text-xs text-slate-400 uppercase tracking-wide font-bold">Total Cost</p>
                      <p className="text-2xl font-bold text-slate-900" style={styles.primaryText}>
                          {(data as Booking).currency} {displayPrice.toLocaleString()}
                      </p>
                  </div>
              </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Main Itinerary */}
              <div className="lg:col-span-2 space-y-6">
                  
                  {/* Driver / Live Info */}
                  {bookingData?.driverDetails && (
                      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 animate-in slide-in-from-bottom-4">
                          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2" style={styles.primaryText}>
                              <Car size={20} /> Driver Assigned
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                  <p className="text-xs text-slate-500 uppercase font-bold">Driver Name</p>
                                  <p className="text-slate-900 font-medium">{bookingData.driverDetails.name}</p>
                              </div>
                              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                  <p className="text-xs text-slate-500 uppercase font-bold">Vehicle</p>
                                  <p className="text-slate-900 font-medium">{bookingData.driverDetails.vehicleModel} ({bookingData.driverDetails.vehicleNumber})</p>
                              </div>
                              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 md:col-span-2">
                                  <p className="text-xs text-slate-500 uppercase font-bold">Contact</p>
                                  <a href={`tel:${bookingData.driverDetails.phone}`} className="font-bold hover:underline" style={styles.primaryText}>
                                      {bookingData.driverDetails.phone}
                                  </a>
                              </div>
                          </div>
                      </div>
                  )}

                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
                      <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                          <Calendar style={styles.primaryText} /> Trip Itinerary
                      </h3>
                      
                      <div className="space-y-8 relative">
                          {/* Vertical Line */}
                          <div className="absolute left-3.5 top-2 bottom-0 w-0.5 bg-slate-100"></div>

                          {data.itinerary?.map((item: ItineraryItem, idx: number) => (
                              <div key={idx} className="relative pl-12">
                                  <div 
                                    className="absolute left-0 top-0 w-8 h-8 rounded-full bg-white border-2 flex items-center justify-center font-bold text-sm shadow-sm" 
                                    style={{ ...styles.primaryBorder, ...styles.primaryText }}
                                  >
                                      {item.day}
                                  </div>
                                  
                                  <h4 className="font-bold text-lg text-slate-900 mb-2">{item.title}</h4>
                                  <p className="text-slate-600 text-sm leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 mb-3">
                                      {item.description}
                                  </p>

                                  {/* Services Chips */}
                                  {item.services && item.services.length > 0 && (
                                      <div className="flex flex-wrap gap-2">
                                          {item.services.map((svc: any, sIdx: number) => (
                                              <span key={sIdx} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-700 shadow-sm">
                                                  {svc.type === 'HOTEL' && <Hotel size={12} className="text-indigo-500" />}
                                                  {svc.type === 'ACTIVITY' && <Star size={12} className="text-amber-500" />}
                                                  {svc.type === 'TRANSFER' && <Plane size={12} className="text-blue-500" />}
                                                  {svc.name}
                                              </span>
                                          ))}
                                      </div>
                                  )}
                              </div>
                          ))}
                      </div>
                  </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                  {/* Action / Downloads Card */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-24">
                      <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                          <Briefcase size={18} className="text-slate-400" /> Actions
                      </h3>
                      
                      <div className="space-y-3">
                          {/* Book Button Logic */}
                          {showBookAction && (
                              <button 
                                onClick={onBook}
                                className="w-full text-white px-4 py-3 rounded-xl hover:opacity-90 transition flex items-center justify-center gap-2 font-bold shadow-lg transform hover:-translate-y-0.5"
                                style={styles.button}
                              >
                                <CheckCircle size={20} /> Book This Trip
                              </button>
                          )}

                          {/* Payment Button Logic */}
                          {showPaymentAction && (
                              <button 
                                onClick={() => navigate(`/payment/${data.id}`)}
                                className="w-full text-white px-4 py-3 rounded-xl hover:opacity-90 transition flex items-center justify-center gap-2 font-bold shadow-lg transform hover:-translate-y-0.5 animate-pulse"
                                style={styles.button}
                              >
                                <CreditCard size={20} /> Make Payment
                              </button>
                          )}

                          {/* Download Button Logic */}
                          <button 
                            onClick={handleDownloadPDF}
                            className="w-full bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-3 rounded-xl transition flex items-center justify-center gap-2 font-medium"
                          >
                              <Download size={20} /> {isBooking ? 'Download Voucher' : 'Download Quote PDF'}
                          </button>
                      </div>

                      {!isBooking && (
                          <div className="mt-4 p-4 bg-blue-50 rounded-xl text-xs text-blue-700 border border-blue-100">
                              <p className="font-bold mb-1">Ready to travel?</p>
                              Click "Book This Trip" to confirm your details and send a booking request to your agent.
                          </div>
                      )}
                  </div>

                  {/* Agent Contact */}
                  <AgentContactCard />
              </div>
          </div>
      </div>
    </>
  );
};

export const ClientTripView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [data, setData] = useState<Booking | Quote | null>(null);
  const [agent, setAgent] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);

  useEffect(() => {
    if (!id) return;

    // 1. Try finding a Booking first
    const booking = bookingService.getBooking(id);
    if (booking) {
        setData(booking);
        fetchAgent(booking.agentId);
        return;
    }

    // 2. Try finding a Quote in simulated storage
    const allQuotesStr = localStorage.getItem('iht_agent_quotes'); 
    if (allQuotesStr) {
        const allQuotes: Quote[] = JSON.parse(allQuotesStr);
        const quote = allQuotes.find(q => q.id === id);
        if (quote) {
            setData(quote);
            fetchAgent(quote.agentId);
            return;
        }
    }

    // Fallback constants
    const quote = INITIAL_QUOTES.find((q: Quote) => q.id === id);
    if (quote) {
        setData(quote);
        fetchAgent(quote.agentId);
    } else {
        setLoading(false);
    }

  }, [id]);

  const fetchAgent = (agentId: string) => {
      const user = profileService.getUser(agentId);
      setAgent(user || null);
      setLoading(false);
  };

  const handleBookingSubmit = (travelers: Traveler[]) => {
      if (!data) return;
      // Convert Quote to Booking
      const newBooking = bookingService.requestPublicBooking(data as Quote, travelers);
      
      setIsBookModalOpen(false);
      // Redirect to new booking view
      navigate(`/view/${newBooking.id}`);
      // Force reload data state
      setData(newBooking);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">Initializing Portal...</div>;

  return (
    <ClientPortalLayout agent={agent}>
      <TripContent 
        data={data!} 
        agent={agent} 
        loading={loading} 
        onBook={() => setIsBookModalOpen(true)}
      />
      {data && !('payments' in data) && (
          <ClientBookingModal 
            quote={data as Quote}
            isOpen={isBookModalOpen}
            onClose={() => setIsBookModalOpen(false)}
            onSubmit={handleBookingSubmit}
          />
      )}
    </ClientPortalLayout>
  );
};
