
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { profileService } from '../../services/profileService';
import { agentService } from '../../services/agentService';
import { bookingService } from '../../services/bookingService';
import { auditLogService } from '../../services/auditLogService';
import { User, Quote, Booking, AuditLog } from '../../types';
import { ProfileCard } from '../../components/profile/ProfileCard';
import { 
    FileText, CheckCircle, XCircle, AlertTriangle, ArrowLeft, 
    Wallet, CreditCard, TrendingUp, History, PlusCircle, MinusCircle, 
    Loader2, Eye, ArrowUpRight, ArrowDownLeft 
} from 'lucide-react';

export const AgentProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Data State
  const [agent, setAgent] = useState<User | undefined>();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [walletLogs, setWalletLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<any>({});
  
  // UI State
  const [activeTab, setActiveTab] = useState<'QUOTES' | 'BOOKINGS' | 'WALLET'>('QUOTES');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdjustingWallet, setIsAdjustingWallet] = useState(false);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');

  useEffect(() => {
    if (id) {
      loadFullProfile();
    }
  }, [id]);

  const loadFullProfile = async () => {
      if (!id) return;
      setIsLoading(true);
      
      try {
          const userProfile = profileService.getUser(id);
          setAgent(userProfile);

          if (userProfile) {
              // Parallel Fetch for Speed
              const [agentQuotes, agentBookings, allLogs] = await Promise.all([
                  agentService.fetchQuotes(id),
                  bookingService.getBookingsForAgent(id),
                  auditLogService.getLogs({ entityType: 'PAYMENT' }) // Fetch payments to filter later
              ]);

              setQuotes(agentQuotes);
              setBookings(agentBookings);

              // Filter logs for this agent's wallet transactions
              const myWalletLogs = allLogs.filter(l => 
                  (l.performedById === id || l.entityId.startsWith('wallet_') || l.description.includes(userProfile.name)) &&
                  (l.action === 'WALLET_TOPUP' || l.action === 'WALLET_PAYMENT')
              );
              setWalletLogs(myWalletLogs);

              // Calculate Stats
              const confirmedBookingsList = agentBookings.filter(b => b.status === 'CONFIRMED' || b.status === 'COMPLETED');
              const totalRevenue = confirmedBookingsList.reduce((sum, b) => sum + (b.sellingPrice || 0), 0);
              const totalNetCost = confirmedBookingsList.reduce((sum, b) => sum + (b.netCost || 0), 0);
              
              setStats({
                  totalQuotes: agentQuotes.length,
                  totalBookings: agentBookings.length,
                  confirmedBookings: confirmedBookingsList.length,
                  totalRevenue: totalRevenue,
                  totalProfit: totalRevenue - totalNetCost, // Agent's Profit
                  walletBalance: userProfile.walletBalance || 0
              });
          }
      } catch (error) {
          console.error("Error loading agent profile", error);
      } finally {
          setIsLoading(false);
      }
  };

  const handleStatusToggle = () => {
    if (!agent) return;
    const newStatus = agent.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    profileService.updateUserStatus(agent.id, newStatus);
    setAgent({ ...agent, status: newStatus });
  };

  const handleWalletAdjustment = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!agent || !adjustmentAmount) return;

      const amount = Number(adjustmentAmount);
      if (isNaN(amount) || amount <= 0) {
          alert("Invalid amount");
          return;
      }

      // If DEBIT, we send negative amount to the service
      const finalAmount = adjustmentType === 'CREDIT' ? amount : -amount;

      try {
          await agentService.addWalletFunds(agent.id, finalAmount);
          
          // Log the Admin Action
          auditLogService.logAction({
              entityType: 'PAYMENT',
              entityId: `admin_adj_${Date.now()}`,
              action: adjustmentType === 'CREDIT' ? 'WALLET_TOPUP' : 'WALLET_PAYMENT',
              description: `Admin Manual Adjustment: ${adjustmentType} ${amount}`,
              user: agent, // Logged against agent but performed by admin logically
              newValue: { amount: finalAmount, type: 'MANUAL_ADJUSTMENT' }
          });

          setAdjustmentAmount('');
          setIsAdjustingWallet(false);
          loadFullProfile(); // Reload to see new balance
          alert("Wallet updated successfully.");
      } catch (error: any) {
          alert("Failed to update wallet: " + error.message);
      }
  };

  if (!agent) return <div className="p-8 text-center">Loading Profile...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/admin/agents')} className="flex items-center text-slate-500 hover:text-slate-800">
            <ArrowLeft size={18} className="mr-1" /> Back to Agents
          </button>
          
          <div className="flex gap-2">
               <button 
                onClick={() => setIsAdjustingWallet(!isAdjustingWallet)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition"
              >
                <Wallet size={16} /> Adjust Wallet
              </button>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Main Profile Card */}
          <div className="lg:col-span-2">
              <ProfileCard 
                user={agent} 
                actions={
                  <button 
                    onClick={handleStatusToggle}
                    className={`px-4 py-2 rounded-lg text-sm font-bold border ${agent.status === 'SUSPENDED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}
                  >
                    {agent.status === 'SUSPENDED' ? 'Resume Account' : 'Suspend Account'}
                  </button>
                }
              />
          </div>

          {/* Financial Snapshot */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                  <CreditCard size={120} />
              </div>
              
              <div>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Financial Status</h3>
                  <div className="mb-4">
                      <p className="text-xs text-slate-400">Wallet Balance</p>
                      <p className="text-3xl font-bold text-slate-900">₹ {(agent.walletBalance || 0).toLocaleString()}</p>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-4">
                      <div>
                          <p className="text-xs text-slate-400">Credit Limit</p>
                          <p className="text-lg font-bold text-slate-700">₹ {(agent.creditLimit || 0).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                          <p className="text-xs text-slate-400">Total Booked Margin</p>
                          <p className="text-lg font-bold text-green-600">+ ₹ {stats.totalProfit?.toLocaleString()}</p>
                      </div>
                  </div>
              </div>

              {isAdjustingWallet && (
                  <form onSubmit={handleWalletAdjustment} className="mt-4 bg-slate-50 p-3 rounded-lg border border-slate-200 animate-in fade-in slide-in-from-top-2">
                      <div className="flex gap-2 mb-2">
                          <button 
                            type="button" 
                            onClick={() => setAdjustmentType('CREDIT')}
                            className={`flex-1 text-xs font-bold py-1.5 rounded ${adjustmentType === 'CREDIT' ? 'bg-green-600 text-white' : 'bg-white text-slate-600 border'}`}
                          >
                              Credit (+)
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setAdjustmentType('DEBIT')}
                            className={`flex-1 text-xs font-bold py-1.5 rounded ${adjustmentType === 'DEBIT' ? 'bg-red-600 text-white' : 'bg-white text-slate-600 border'}`}
                          >
                              Debit (-)
                          </button>
                      </div>
                      <input 
                        type="number" 
                        placeholder="Amount" 
                        value={adjustmentAmount}
                        onChange={e => setAdjustmentAmount(e.target.value)}
                        className="w-full border rounded p-1.5 text-sm mb-2"
                        autoFocus
                      />
                      <button type="submit" className="w-full bg-slate-900 text-white text-xs font-bold py-2 rounded hover:bg-slate-800">
                          Confirm Adjustment
                      </button>
                  </form>
              )}
          </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button 
            onClick={() => setActiveTab('QUOTES')}
            className={`px-6 py-4 text-sm font-bold border-b-2 transition flex items-center gap-2 ${activeTab === 'QUOTES' ? 'border-brand-600 text-brand-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <FileText size={16} /> All Quotes
          </button>
          <button 
            onClick={() => setActiveTab('BOOKINGS')}
            className={`px-6 py-4 text-sm font-bold border-b-2 transition flex items-center gap-2 ${activeTab === 'BOOKINGS' ? 'border-brand-600 text-brand-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <CheckCircle size={16} /> Confirmed Bookings
          </button>
          <button 
            onClick={() => setActiveTab('WALLET')}
            className={`px-6 py-4 text-sm font-bold border-b-2 transition flex items-center gap-2 ${activeTab === 'WALLET' ? 'border-brand-600 text-brand-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <History size={16} /> Wallet Ledger
          </button>
        </div>

        <div className="p-0">
            {/* QUOTES TAB */}
            {activeTab === 'QUOTES' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Ref No</th>
                      <th className="px-6 py-3 font-semibold">Created</th>
                      <th className="px-6 py-3 font-semibold">Destination</th>
                      <th className="px-6 py-3 font-semibold text-right text-slate-500">System Cost</th>
                      <th className="px-6 py-3 font-semibold text-right text-blue-600">Net Cost (B2B)</th>
                      <th className="px-6 py-3 font-semibold text-right text-green-600">Markup</th>
                      <th className="px-6 py-3 font-semibold text-right text-slate-900">Selling Price</th>
                      <th className="px-6 py-3 font-semibold">Status</th>
                      <th className="px-6 py-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {quotes.map(q => {
                        const net = q.price || 0; // B2B Price
                        const sell = q.sellingPrice || 0;
                        const markup = sell - net;
                        const markupPercent = net > 0 ? ((markup / net) * 100).toFixed(1) : '0';
                        const cost = q.cost || 0; // System Cost

                        return (
                          <tr key={q.id} className="hover:bg-slate-50 transition">
                            <td className="px-6 py-3 font-mono text-brand-600 font-medium">{q.uniqueRefNo}</td>
                            <td className="px-6 py-3 text-slate-500">{new Date(q.id.split('_')[1] ? Number(q.id.split('_')[1]) : Date.now()).toLocaleDateString()}</td>
                            <td className="px-6 py-3 text-slate-800">{q.destination}</td>
                            <td className="px-6 py-3 text-right font-mono text-slate-500">
                                {q.currency} {cost.toLocaleString()}
                            </td>
                            <td className="px-6 py-3 text-right font-mono font-medium text-blue-600">
                                {q.currency} {net.toLocaleString()}
                            </td>
                            <td className="px-6 py-3 text-right font-mono text-green-600">
                                + {q.currency} {markup.toLocaleString()} <span className="text-[10px] text-slate-400">({markupPercent}%)</span>
                            </td>
                            <td className="px-6 py-3 text-right font-mono font-bold text-slate-900">
                                {q.currency} {sell.toLocaleString()}
                            </td>
                            <td className="px-6 py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  q.status === 'CONFIRMED' || q.status === 'BOOKED' ? 'bg-green-100 text-green-700' : 
                                  q.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {q.status}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-right">
                                <button 
                                    onClick={() => navigate(`/quote/${q.id}`)}
                                    className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-100 rounded"
                                >
                                    <Eye size={16} />
                                </button>
                            </td>
                          </tr>
                        );
                    })}
                    {quotes.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-slate-400">No quotes found.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}

            {/* BOOKINGS TAB */}
            {activeTab === 'BOOKINGS' && (
                 <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm">
                   <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                     <tr>
                       <th className="px-6 py-3 font-semibold">Booking Ref</th>
                       <th className="px-6 py-3 font-semibold">Travel Date</th>
                       <th className="px-6 py-3 font-semibold">Guest</th>
                       <th className="px-6 py-3 font-semibold text-right text-blue-600">Net B2B</th>
                       <th className="px-6 py-3 font-semibold text-right text-slate-900">Selling Price</th>
                       <th className="px-6 py-3 font-semibold text-right text-green-600">Margin</th>
                       <th className="px-6 py-3 font-semibold text-right">Paid</th>
                       <th className="px-6 py-3 font-semibold">Status</th>
                       <th className="px-6 py-3 font-semibold text-right">Action</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {bookings.map(b => {
                       const net = b.netCost || 0;
                       const sell = b.sellingPrice || 0;
                       const margin = sell - net;
                       const marginPercent = net > 0 ? ((margin / net) * 100).toFixed(1) : '0';

                       return (
                       <tr key={b.id} className="hover:bg-slate-50 transition">
                         <td className="px-6 py-3 font-mono text-brand-600 font-medium">{b.uniqueRefNo}</td>
                         <td className="px-6 py-3 text-slate-500">{new Date(b.travelDate).toLocaleDateString()}</td>
                         <td className="px-6 py-3 text-slate-800 font-medium">
                             {b.travelers[0] ? `${b.travelers[0].firstName} ${b.travelers[0].lastName}` : 'Guest'}
                         </td>
                         <td className="px-6 py-3 text-right font-mono font-medium text-blue-600">
                             {b.currency} {net.toLocaleString()}
                         </td>
                         <td className="px-6 py-3 text-right font-mono font-bold text-slate-900">
                             {b.currency} {sell.toLocaleString()}
                         </td>
                         <td className="px-6 py-3 text-right font-mono text-green-600">
                             + {b.currency} {margin.toLocaleString()} <div className="text-[9px] text-slate-400">({marginPercent}%)</div>
                         </td>
                         <td className="px-6 py-3 text-right font-mono text-slate-600">
                             {b.currency} {b.paidAmount.toLocaleString()}
                         </td>
                         <td className="px-6 py-3">
                             <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${b.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                 {b.status.replace('_', ' ')}
                             </span>
                         </td>
                         <td className="px-6 py-3 text-right">
                             <button 
                                 onClick={() => navigate(`/booking/${b.id}`)}
                                 className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-100 rounded"
                             >
                                 <Eye size={16} />
                             </button>
                         </td>
                       </tr>
                     )})}
                     {bookings.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-slate-400">No confirmed bookings yet.</td></tr>}
                   </tbody>
                 </table>
               </div>
            )}

            {/* WALLET TAB */}
            {activeTab === 'WALLET' && (
                 <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm">
                   <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                     <tr>
                       <th className="px-6 py-3 font-semibold">Date</th>
                       <th className="px-6 py-3 font-semibold">Type</th>
                       <th className="px-6 py-3 font-semibold">Description</th>
                       <th className="px-6 py-3 font-semibold text-right">Amount</th>
                       <th className="px-6 py-3 font-semibold text-right">Balance After</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {walletLogs.map(log => {
                         const isCredit = log.action === 'WALLET_TOPUP';
                         const amount = log.newValue?.amount || 0;
                         const balance = log.newValue?.newBalance;

                         return (
                           <tr key={log.id} className="hover:bg-slate-50 transition">
                             <td className="px-6 py-3 text-slate-500 text-xs font-mono">
                                 {new Date(log.timestamp).toLocaleString()}
                             </td>
                             <td className="px-6 py-3">
                                 <span className={`flex items-center gap-1 text-xs font-bold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                                     {isCredit ? <ArrowDownLeft size={14}/> : <ArrowUpRight size={14}/>}
                                     {isCredit ? 'CREDIT' : 'DEBIT'}
                                 </span>
                             </td>
                             <td className="px-6 py-3 text-slate-700 text-xs max-w-md truncate" title={log.description}>
                                 {log.description}
                             </td>
                             <td className={`px-6 py-3 text-right font-mono font-bold ${isCredit ? 'text-green-700' : 'text-slate-800'}`}>
                                 {isCredit ? '+' : '-'} {Math.abs(amount).toLocaleString()}
                             </td>
                             <td className="px-6 py-3 text-right font-mono text-slate-500">
                                 {balance !== undefined ? balance.toLocaleString() : '-'}
                             </td>
                           </tr>
                         );
                     })}
                     {walletLogs.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">No transactions recorded.</td></tr>}
                   </tbody>
                 </table>
               </div>
            )}
        </div>
      </div>
    </div>
  );
};
