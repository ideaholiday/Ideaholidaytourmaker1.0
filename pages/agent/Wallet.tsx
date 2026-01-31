
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { paymentService } from '../../services/paymentService';
import { auditLogService } from '../../services/auditLogService';
import { AuditLog } from '../../types';
import { Wallet as WalletIcon, CreditCard, History, Plus, ArrowUpRight, DollarSign, Loader2, ArrowDownLeft, Search, Filter, Download } from 'lucide-react';

export const Wallet: React.FC = () => {
  const { user, reloadUser } = useAuth();
  const [topUpAmount, setTopUpAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactions, setTransactions] = useState<AuditLog[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<AuditLog[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [filterType, setFilterType] = useState<'ALL' | 'CREDIT' | 'DEBIT'>('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (user) {
        loadHistory();
    }
  }, [user]);

  useEffect(() => {
      let filtered = transactions;

      // Filter by Type
      if (filterType !== 'ALL') {
          filtered = filtered.filter(t => {
              const isCredit = t.action === 'WALLET_TOPUP';
              return filterType === 'CREDIT' ? isCredit : !isCredit;
          });
      }

      // Filter by Search
      if (search) {
          const lowerSearch = search.toLowerCase();
          filtered = filtered.filter(t => 
              t.description.toLowerCase().includes(lowerSearch) || 
              t.entityId.toLowerCase().includes(lowerSearch)
          );
      }

      setFilteredTransactions(filtered);
  }, [transactions, filterType, search]);

  const loadHistory = async () => {
      setIsLoadingHistory(true);
      // Fetch Audit logs related to payments for this user
      // We look for 'WALLET_TOPUP' (Credit) and 'WALLET_PAYMENT' (Debit)
      const logs = await auditLogService.getLogs({ entityType: 'PAYMENT' });
      
      const myTransactions = logs.filter(l => 
          l.performedById === user?.id && 
          (l.action === 'WALLET_TOPUP' || l.action === 'WALLET_PAYMENT')
      );
      
      setTransactions(myTransactions);
      setFilteredTransactions(myTransactions);
      setIsLoadingHistory(false);
  };

  if (!user) return null;

  const currentBalance = user.walletBalance || 0;
  const creditLimit = user.creditLimit || 0;
  const totalBuyingPower = currentBalance + creditLimit;

  const handleTopUp = () => {
      const amount = Number(topUpAmount);
      if (isNaN(amount) || amount <= 0) {
          alert("Please enter a valid amount.");
          return;
      }

      setIsProcessing(true);
      paymentService.initiateWalletTopUp(
          user,
          amount,
          async (newBalance) => {
              await reloadUser();
              await loadHistory(); // Refresh list
              setTopUpAmount('');
              setIsProcessing(false);
              alert("Wallet recharged successfully!");
          },
          (error) => {
              setIsProcessing(false);
              alert("Transaction failed: " + error);
          }
      );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <WalletIcon className="text-brand-600" /> Agency Wallet
            </h1>
            <p className="text-slate-500">Manage your pre-paid balance and credit limits.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            
            {/* Balance Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <WalletIcon size={100} />
                </div>
                <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Available Balance</p>
                <h2 className="text-4xl font-bold mb-4">₹ {currentBalance.toLocaleString()}</h2>
                
                <div className="flex gap-4 text-xs border-t border-slate-700 pt-4 mt-2">
                    <div>
                        <span className="block text-slate-400">Credit Limit</span>
                        <span className="font-bold">₹ {creditLimit.toLocaleString()}</span>
                    </div>
                    <div>
                        <span className="block text-slate-400">Total Power</span>
                        <span className="font-bold">₹ {totalBuyingPower.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Top Up Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm md:col-span-2">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Plus size={18} className="text-brand-600"/> Add Funds
                </h3>
                
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-sm font-medium text-slate-600 mb-2">Amount to Add (INR)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-3.5 text-slate-400 font-bold">₹</span>
                            <input 
                                type="number" 
                                min="100"
                                placeholder="Enter amount..." 
                                className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-lg font-bold"
                                value={topUpAmount}
                                onChange={(e) => setTopUpAmount(e.target.value)}
                            />
                        </div>
                    </div>
                    <button 
                        onClick={handleTopUp}
                        disabled={isProcessing || !topUpAmount}
                        className="bg-brand-600 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-brand-700 shadow-lg shadow-brand-100 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[160px] justify-center"
                    >
                        {isProcessing ? <Loader2 className="animate-spin" /> : <ArrowUpRight />}
                        Proceed to Pay
                    </button>
                </div>
                
                <div className="mt-4 flex gap-2">
                    {[1000, 5000, 10000, 25000].map(amt => (
                        <button 
                            key={amt}
                            onClick={() => setTopUpAmount(amt.toString())}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition"
                        >
                            + ₹{amt.toLocaleString()}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                    <History size={18} className="text-slate-500" />
                    <h3 className="font-bold text-slate-800">Transaction History</h3>
                </div>
                
                <div className="flex gap-2 w-full md:w-auto">
                     <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search transactions..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                    </div>
                    <select 
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as any)}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-brand-500"
                    >
                        <option value="ALL">All Types</option>
                        <option value="CREDIT">Credits (In)</option>
                        <option value="DEBIT">Debits (Out)</option>
                    </select>
                </div>
            </div>
            
            {isLoadingHistory ? (
                 <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                     <Loader2 className="animate-spin mb-2" />
                     Loading history...
                 </div>
            ) : filteredTransactions.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 text-xs uppercase">
                            <tr>
                                <th className="px-6 py-3 font-semibold">Date</th>
                                <th className="px-6 py-3 font-semibold">Description</th>
                                <th className="px-6 py-3 font-semibold">Transaction ID</th>
                                <th className="px-6 py-3 font-semibold text-right">Amount</th>
                                <th className="px-6 py-3 font-semibold text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredTransactions.map((tx) => {
                                const isCredit = tx.action === 'WALLET_TOPUP';
                                const amount = tx.newValue?.amount || 0;
                                const balance = tx.newValue?.newBalance;

                                return (
                                    <tr key={tx.id} className="hover:bg-slate-50 transition group">
                                        <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                                            {new Date(tx.timestamp).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-full ${isCredit ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                    {isCredit ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                                                </div>
                                                <div>
                                                    <span className="font-bold text-slate-800 block">
                                                        {isCredit ? 'Wallet Top-up' : 'Booking Payment'}
                                                    </span>
                                                    <span className="text-xs text-slate-500 line-clamp-1" title={tx.description}>
                                                        {tx.description.replace(/via Wallet/i, '').trim()}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-slate-400 text-xs group-hover:text-slate-600">
                                            {tx.entityId}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`font-bold text-base ${isCredit ? 'text-green-600' : 'text-slate-900'}`}>
                                                {isCredit ? '+' : '-'} ₹ {amount.toLocaleString()}
                                            </span>
                                            {balance !== undefined && (
                                                <div className="text-[10px] text-slate-400 mt-1">
                                                    Bal: ₹ {balance.toLocaleString()}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-100">
                                                Success
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="p-12 text-center text-slate-400 italic bg-slate-50/50">
                    No transactions found matching your filters.
                </div>
            )}
        </div>
    </div>
  );
};
