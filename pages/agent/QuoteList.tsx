import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { agentService } from '../../services/agentService';
import { Search, Plus, Copy, Download, Share2, Eye, Filter, X } from 'lucide-react';
import { formatWhatsAppQuote } from '../../utils/whatsappFormatter';
import { generateQuotePDF } from '../../utils/pdfGenerator';
import { Quote } from '../../types';

export const QuoteList: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'BOOKED' | 'CANCELLED'>('ALL');
  const [showFilters, setShowFilters] = useState(false);
  
  if (!user) return null;

  const quotes = agentService.getQuotes(user.id);
  
  const filteredQuotes = quotes.filter(q => {
    const matchesSearch = 
        q.destination.toLowerCase().includes(searchTerm.toLowerCase()) || 
        q.uniqueRefNo.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleDuplicate = (quoteId: string) => {
    if (window.confirm("Create a copy of this quote? You will be redirected to the new draft.")) {
      const newQuote = agentService.duplicateQuote(quoteId, user.id);
      if (newQuote) {
        navigate(`/quote/${newQuote.id}`);
      }
    }
  };

  const handleShare = (quote: Quote) => {
     // We need to mock breakdown for sharing from list view (using stored price)
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
         // Cost components are irrelevant for Agent PDF
         netCost: 0, companyMarkupValue: 0, agentMarkupValue: 0, gstAmount: 0
     };
     generateQuotePDF(quote, mockBreakdown, user.role, user);
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
                placeholder="Search by Quote ID or Destination..." 
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
                <th className="px-6 py-4 font-semibold">Quote ID</th>
                <th className="px-6 py-4 font-semibold">Destination</th>
                <th className="px-6 py-4 font-semibold">Travel Date</th>
                <th className="px-6 py-4 font-semibold">Travellers</th>
                <th className="px-6 py-4 font-semibold">Total Price</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQuotes.map((quote) => {
                  const displayPrice = quote.sellingPrice || quote.price || 0;
                  return (
                    <tr key={quote.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                        <span className="font-mono text-brand-600 font-medium">{quote.uniqueRefNo}</span>
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
                        <div className="flex items-center justify-center gap-2">
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
          {filteredQuotes.length === 0 && (
            <div className="p-10 text-center text-slate-500">
              No quotes found matching your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};