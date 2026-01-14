
import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { agentService } from '../../services/agentService';
import { Search, Plus, Copy, Download, Share2, Eye, Filter, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { formatWhatsAppQuote } from '../../utils/whatsappFormatter';
import { generateQuotePDF } from '../../utils/pdfGenerator';
import { Quote } from '../../types';

export const QuoteList: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'BOOKED' | 'CANCELLED'>('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'createdAt', direction: 'desc' });

  if (!user) return null;

  const quotes = agentService.getQuotes(user.id);

  // Sorting Handler
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Process Data
  const processedQuotes = useMemo(() => {
    let data = [...quotes];

    // 1. Filter
    data = data.filter(q => {
      const matchesSearch = 
          q.destination.toLowerCase().includes(searchTerm.toLowerCase()) || 
          q.uniqueRefNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.paxCount.toString().includes(searchTerm);
      
      const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    // 2. Sort
    data.sort((a: any, b: any) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle Derived/Special Fields
      if (sortConfig.key === 'price') {
        aValue = a.sellingPrice || a.price || 0;
        bValue = b.sellingPrice || b.price || 0;
      } else if (sortConfig.key === 'createdAt') {
         // Fallback to travelDate if timestamps missing in mock data
         aValue = new Date(a.messages?.[0]?.timestamp || a.travelDate || 0).getTime();
         bValue = new Date(b.messages?.[0]?.timestamp || b.travelDate || 0).getTime();
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  }, [quotes, searchTerm, statusFilter, sortConfig]);

  const handleDuplicate = (quoteId: string) => {
    if (window.confirm("Create a copy of this quote? You will be redirected to the new draft.")) {
      const newQuote = agentService.duplicateQuote(quoteId, user.id);
      if (newQuote) {
        navigate(`/quote/${newQuote.id}`);
      }
    }
  };

  const handleShare = (quote: Quote) => {
     const mockBreakdown: any = {
         finalPrice: quote.sellingPrice || quote.price || 0,
         perPersonPrice: ((quote.sellingPrice || quote.price || 0) / quote.paxCount)
     };
     const text = formatWhatsAppQuote(quote, mockBreakdown, true);
     navigator.clipboard.writeText(text);
     alert("Quote details copied! Paste in WhatsApp.");
  };

  const handleDownload = (quote: Quote) => {
      const mockBreakdown: any = {
         finalPrice: quote.sellingPrice || quote.price || 0,
         perPersonPrice: ((quote.sellingPrice || quote.price || 0) / quote.paxCount),
         netCost: 0, companyMarkupValue: 0, agentMarkupValue: 0, gstAmount: 0
     };
     generateQuotePDF(quote, mockBreakdown, user.role, user);
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown size={14} className="ml-1 text-slate-300" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={14} className="ml-1 text-brand-600" /> 
      : <ArrowDown size={14} className="ml-1 text-brand-600" />;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">My Quotations</h1>
            <p className="text-slate-500 text-sm">Manage and track your client proposals.</p>
        </div>
        <Link to="/agent/create" className="bg-brand-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-brand-700 transition flex items-center gap-2 shadow-sm">
          <Plus size={18} /> New Quote
        </Link>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
            <input 
                type="text" 
                placeholder="Search by Quote ID, Destination or Pax..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
            />
            </div>
            <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition ${showFilters ? 'bg-slate-100 border-slate-300 text-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
            >
            <Filter size={18} /> {statusFilter === 'ALL' ? 'Filter' : `Status: ${statusFilter}`}
            </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-sm font-medium text-slate-700 mr-2">Status:</span>
                    {['ALL', 'PENDING', 'CONFIRMED', 'BOOKED', 'CANCELLED'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status as any)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                                statusFilter === status 
                                    ? 'bg-brand-600 text-white shadow-sm' 
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {status === 'ALL' ? 'All Quotes' : status.charAt(0) + status.slice(1).toLowerCase()}
                        </button>
                    ))}
                    {statusFilter !== 'ALL' && (
                        <button onClick={() => setStatusFilter('ALL')} className="ml-auto text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                            <X size={12} /> Clear Filter
                        </button>
                    )}
                </div>
            </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th 
                  className="px-6 py-4 font-semibold cursor-pointer hover:bg-slate-100 transition"
                  onClick={() => handleSort('uniqueRefNo')}
                >
                  <div className="flex items-center">Quote ID <SortIcon columnKey="uniqueRefNo"/></div>
                </th>
                <th 
                  className="px-6 py-4 font-semibold cursor-pointer hover:bg-slate-100 transition"
                  onClick={() => handleSort('destination')}
                >
                  <div className="flex items-center">Destination <SortIcon columnKey="destination"/></div>
                </th>
                <th 
                  className="px-6 py-4 font-semibold cursor-pointer hover:bg-slate-100 transition"
                  onClick={() => handleSort('travelDate')}
                >
                  <div className="flex items-center">Travel Date <SortIcon columnKey="travelDate"/></div>
                </th>
                <th 
                  className="px-6 py-4 font-semibold cursor-pointer hover:bg-slate-100 transition"
                  onClick={() => handleSort('paxCount')}
                >
                  <div className="flex items-center">Travellers <SortIcon columnKey="paxCount"/></div>
                </th>
                <th 
                  className="px-6 py-4 font-semibold cursor-pointer hover:bg-slate-100 transition"
                  onClick={() => handleSort('price')}
                >
                  <div className="flex items-center">Total Price <SortIcon columnKey="price"/></div>
                </th>
                <th 
                  className="px-6 py-4 font-semibold cursor-pointer hover:bg-slate-100 transition"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center">Status <SortIcon columnKey="status"/></div>
                </th>
                <th className="px-6 py-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processedQuotes.map((quote) => {
                  const displayPrice = quote.sellingPrice || quote.price || 0;
                  return (
                    <tr key={quote.id} className="hover:bg-slate-50 transition group">
                    <td className="px-6 py-4">
                        <span className="font-mono text-brand-600 font-medium">{quote.uniqueRefNo}</span>
                        {quote.type === 'QUICK' && <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded uppercase font-bold">Quick</span>}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">{quote.destination}</td>
                    <td className="px-6 py-4 text-slate-600">{quote.travelDate || <span className="text-slate-400">Not Set</span>}</td>
                    <td className="px-6 py-4 text-slate-600">{quote.paxCount}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                        {quote.currency} {displayPrice.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        quote.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                        quote.status === 'BOOKED' ? 'bg-blue-100 text-blue-700' :
                        quote.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                        }`}>
                        {quote.status}
                        </span>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <Link 
                            to={`/quote/${quote.id}`} 
                            title="View Details"
                            className="p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
                        >
                            <Eye size={18} />
                        </Link>
                        <button 
                            onClick={() => handleDownload(quote)}
                            title="Download PDF"
                            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                        >
                            <Download size={18} />
                        </button>
                        <button 
                            onClick={() => handleShare(quote)}
                            title="Share WhatsApp"
                            className="p-2 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                        >
                            <Share2 size={18} />
                        </button>
                        <button 
                            onClick={() => handleDuplicate(quote.id)}
                            title="Duplicate Quote"
                            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                            <Copy size={18} />
                        </button>
                        </div>
                    </td>
                    </tr>
                  );
              })}
            </tbody>
          </table>
          {processedQuotes.length === 0 && (
            <div className="p-12 text-center text-slate-500">
              <p>No quotes found matching your search.</p>
              {searchTerm && <button onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); }} className="text-brand-600 hover:underline mt-2 text-sm">Clear filters</button>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
