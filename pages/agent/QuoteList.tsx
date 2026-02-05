
import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { agentService } from '../../services/agentService';
import { bookingService } from '../../services/bookingService';
import { Search, Plus, Copy, Download, Share2, Eye, Filter, ArrowUpDown, ArrowUp, ArrowDown, Trash2, CheckCircle, Link as LinkIcon, History, FileText, Loader2, Plane, UserCheck } from 'lucide-react';
import { formatWhatsAppQuote } from '../../utils/whatsappFormatter';
import { generateQuotePDF } from '../../utils/pdfGenerator';
import { Quote } from '../../types';

export const QuoteList: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'QUOTES' | 'HISTORY'>('QUOTES');
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'createdAt', direction: 'desc' });

  // Load Data
  const [quotes, setQuotes] = useState<Quote[]>([]);
  // Use 'any' here because history returns Quotes but we might want to check booking-specific fields
  // In a real app, History usually comes from the Bookings table, but here we use Quote status
  const [history, setHistory] = useState<Quote[]>([]);
  // Also fetch bookings to check operational status for history items
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
      if (user) {
          setLoading(true);
          // Parallel fetch simulation
          Promise.all([
             agentService.fetchQuotes(user.id),
             agentService.getBookedHistory(user.id),
             bookingService.getBookingsForAgent(user.id) // Fetch bookings for status check
          ]).then(([q, h, b]) => {
             setQuotes(q || agentService.getQuotes(user.id));
             setHistory(h || []);
             setBookings(b || []);
             setLoading(false);
          });
      }
  }, [user, refreshTrigger, activeTab]);

  if (!user) return null;

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const processedData = useMemo(() => {
    let data = activeTab === 'QUOTES' ? quotes : history;
    
    // Filter
    data = data.filter(q => {
      const matchesSearch = 
          (q.destination || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
          (q.uniqueRefNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (q.leadGuestName || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });

    // Sort
    data.sort((a: any, b: any) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];
      if (sortConfig.key === 'price') {
        aValue = a.sellingPrice || a.price || 0;
        bValue = b.sellingPrice || b.price || 0;
      } 
      // Add more sort keys if needed
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  }, [quotes, history, searchTerm, sortConfig, activeTab]);

  // --- ACTIONS ---

  const handleDelete = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation(); 
      e.preventDefault(); // Added robust prevention
      if (window.confirm("Are you sure you want to delete this quote?\n\nThis cannot be undone.")) {
          try {
              await agentService.deleteQuote(id);
              setRefreshTrigger(prev => prev + 1); // Reload list
          } catch (e: any) {
              alert(e.message);
          }
      }
  };

  const handleBook = async (e: React.MouseEvent, quote: Quote) => {
      e.stopPropagation(); 
      e.preventDefault();
      if (window.confirm(`Confirm Booking for ${quote.uniqueRefNo}?\n\nThis will create a booking record and notify operations.`)) {
          try {
              // 1. Create Booking Record (Local DB Sync)
              await bookingService.createBookingFromQuote(quote, user);
              
              // 2. Sync Status to API (Backend)
              await agentService.bookQuote(quote.id, user);
              
              alert("Booking Created! Moving to History.");
              setActiveTab('HISTORY');
              setRefreshTrigger(prev => prev + 1);
          } catch (e: any) {
              alert("Booking Error: " + e.message);
          }
      }
  };

  const handleCopyLink = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const url = `${window.location.origin}/#/view/${id}`;
      navigator.clipboard.writeText(url);
      alert("Public Link copied to clipboard!");
  };

  const handleDuplicate = async (e: React.MouseEvent, quoteId: string) => {
      e.stopPropagation();
      const newQuote = await agentService.duplicateQuote(quoteId, user.id);
      if (newQuote) {
        navigate(`/quote/${newQuote.id}`);
      }
  };

  const handleDownload = (e: React.MouseEvent, quote: Quote) => {
       e.stopPropagation();
       const mockBreakdown: any = {
         finalPrice: quote.sellingPrice || quote.price || 0,
         perPersonPrice: ((quote.sellingPrice || quote.price || 0) / quote.paxCount),
     };
     generateQuotePDF(quote, mockBreakdown, user.role, user);
  };

  const handleShare = (e: React.MouseEvent, quote: Quote) => {
      e.stopPropagation();
      const mockBreakdown: any = {
         finalPrice: quote.sellingPrice || quote.price || 0,
         perPersonPrice: ((quote.sellingPrice || quote.price || 0) / quote.paxCount)
     };
     const text = formatWhatsAppQuote(quote, mockBreakdown, true);
     const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
     window.open(url, '_blank');
  };

  // Helper to find booking status for a quote in history
  const getOperationalStatus = (quoteId: string) => {
      const booking = bookings.find(b => b.quoteId === quoteId);
      if (!booking) return null;
      
      // If Operator Accepted, it's Operationally Ready
      if (booking.operatorStatus === 'ACCEPTED') {
          return (
              <span className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                  <UserCheck size={12} /> Ground Ops Ready
              </span>
          );
      }
      
      if (booking.status === 'CONFIRMED' || booking.paymentStatus === 'PAID_IN_FULL') {
          return (
              <span className="flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                  <CheckCircle size={12} /> Confirmed
              </span>
          );
      }
      
      return null;
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown size={14} className="ml-1 text-slate-300" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1 text-brand-600" /> : <ArrowDown size={14} className="ml-1 text-brand-600" />;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">Agent Portal</h1>
            <p className="text-slate-500 text-sm">Manage quotes and bookings.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
                onClick={() => setActiveTab('QUOTES')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'QUOTES' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
                <FileText size={16} /> Active Quotes
            </button>
            <button 
                onClick={() => setActiveTab('HISTORY')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'HISTORY' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
                <History size={16} /> Booked History
            </button>
        </div>
        <Link to="/agent/create" className="bg-brand-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-brand-700 transition flex items-center gap-2 shadow-sm">
          <Plus size={18} /> New Quote
        </Link>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
                <input 
                    type="text" 
                    placeholder="Search by Quote ID, Guest Name, Destination..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                />
            </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
            <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
                <Loader2 size={24} className="animate-spin" /> Loading data...
            </div>
        ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-4 font-semibold cursor-pointer" onClick={() => handleSort('uniqueRefNo')}>Quote ID <SortIcon columnKey="uniqueRefNo"/></th>
                        <th className="px-6 py-4 font-semibold">Guest</th>
                        <th className="px-6 py-4 font-semibold cursor-pointer" onClick={() => handleSort('destination')}>Destination <SortIcon columnKey="destination"/></th>
                        <th className="px-6 py-4 font-semibold">Price</th>
                        <th className="px-6 py-4 font-semibold">Status</th>
                        {activeTab === 'HISTORY' && <th className="px-6 py-4 font-semibold">Ops Status</th>}
                        <th className="px-6 py-4 font-semibold text-center">Actions</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                    {processedData.map((quote) => {
                        const displayPrice = quote.sellingPrice || quote.price || 0;
                        const opsBadge = activeTab === 'HISTORY' ? getOperationalStatus(quote.id) : null;
                        const bookingLink = bookings.find(b => b.quoteId === quote.id)?.id;
                        const targetLink = bookingLink ? `/booking/${bookingLink}` : `/quote/${quote.id}`;

                        return (
                            <tr key={quote.id} className="hover:bg-slate-50 transition group cursor-pointer" onClick={() => navigate(targetLink)}>
                            <td className="px-6 py-4">
                                <span className="font-mono text-brand-600 font-medium">{quote.uniqueRefNo}</span>
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-800">
                                {quote.leadGuestName || <span className="text-slate-400 italic">No Name</span>}
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-900">{quote.destination}</td>
                            <td className="px-6 py-4 font-bold text-slate-900">
                                {quote.currency} {displayPrice.toLocaleString()}
                            </td>
                            <td className="px-6 py-4">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                    quote.status === 'BOOKED' ? 'bg-indigo-100 text-indigo-700' : 
                                    quote.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                                    quote.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                                    'bg-slate-100 text-slate-600'
                                }`}>
                                {quote.status}
                                </span>
                            </td>
                            {activeTab === 'HISTORY' && (
                                <td className="px-6 py-4">
                                    {opsBadge || <span className="text-xs text-slate-400">-</span>}
                                </td>
                            )}
                            <td className="px-6 py-4">
                                <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                                    {activeTab === 'QUOTES' && (
                                        <>
                                            <button onClick={(e) => handleBook(e, quote)} title="Book Now" className="p-2 text-white bg-green-600 hover:bg-green-700 rounded-lg transition shadow-sm mr-2 flex items-center gap-1 px-3">
                                                <CheckCircle size={14} /> <span className="text-xs font-bold">Book</span>
                                            </button>
                                            <button onClick={(e) => handleDelete(e, quote.id)} title="Delete" className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                                                <Trash2 size={18} />
                                            </button>
                                        </>
                                    )}
                                    {activeTab === 'HISTORY' ? (
                                        <button onClick={(e) => { e.stopPropagation(); navigate(targetLink); }} title="View Booking" className="p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition">
                                            <Eye size={18} />
                                        </button>
                                    ) : (
                                        <Link to={`/quote/${quote.id}`} title="View/Edit" className="p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition">
                                            <Eye size={18} />
                                        </Link>
                                    )}
                                    <button onClick={(e) => handleCopyLink(e, quote.id)} title="Copy Link" className="p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition">
                                        <LinkIcon size={18} />
                                    </button>
                                    <button onClick={(e) => handleDownload(e, quote)} title="PDF" className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition">
                                        <Download size={18} />
                                    </button>
                                    <button onClick={(e) => handleShare(e, quote)} title="WhatsApp" className="p-2 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition">
                                        <Share2 size={18} />
                                    </button>
                                    {activeTab === 'QUOTES' && (
                                        <button onClick={(e) => handleDuplicate(e, quote.id)} title="Duplicate" className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                                            <Copy size={18} />
                                        </button>
                                    )}
                                </div>
                            </td>
                            </tr>
                        );
                    })}
                    {processedData.length === 0 && (
                        <tr><td colSpan={activeTab === 'HISTORY' ? 7 : 6} className="px-6 py-12 text-center text-slate-500">No records found.</td></tr>
                    )}
                    </tbody>
                </table>
            </div>
        )}
      </div>
    </div>
  );
};
