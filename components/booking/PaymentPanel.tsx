
import React, { useState } from 'react';
import { Booking, User, UserRole, PaymentMode, PaymentEntry } from '../../types';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { generateReceiptPDF } from '../../utils/pdfGenerator';
import { DollarSign, PlusCircle, History, Download, Wallet, CreditCard, PieChart, CheckCircle } from 'lucide-react';

interface Props {
  booking: Booking;
  user: User;
  onRecordPayment: (amount: number, mode: PaymentMode, reference: string) => void;
}

export const PaymentPanel: React.FC<Props> = ({ booking, user, onRecordPayment }) => {
  // PRIVACY WALL: Operator NEVER sees this panel.
  // This ensures Operators cannot see how much the Agent/Client has paid.
  if (user.role === UserRole.OPERATOR) return null;

  const [showAddModal, setShowAddModal] = useState(false);
  const [amount, setAmount] = useState<string>('');
  const [mode, setMode] = useState<PaymentMode>('BANK_TRANSFER');
  const [reference, setReference] = useState('');

  const isAdminOrStaff = user.role === UserRole.ADMIN || user.role === UserRole.STAFF;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    onRecordPayment(Number(amount), mode, reference);
    setShowAddModal(false);
    setAmount('');
    setReference('');
  };

  const handleDownloadReceipt = (payment: PaymentEntry) => {
      generateReceiptPDF(booking, payment, user);
  };

  const percentPaid = Math.min(100, Math.round((booking.paidAmount / booking.totalAmount) * 100));
  const currency = booking.currency || 'USD';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Wallet size={18} className="text-brand-600" /> Payment Status
        </h3>
        <PaymentStatusBadge status={booking.paymentStatus} />
      </div>

      <div className="p-6">
        {/* Financial Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Booking Value</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{currency} {booking.totalAmount.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-xs font-bold text-green-700 uppercase tracking-wider">Received</p>
                        <p className="text-xl font-bold text-green-800 mt-1">{currency} {booking.paidAmount.toLocaleString()}</p>
                    </div>
                    <CheckCircle size={20} className="text-green-500 opacity-50" />
                </div>
            </div>
            <div className={`p-4 rounded-xl border ${booking.balanceAmount > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex justify-between items-start">
                    <div>
                        <p className={`text-xs font-bold uppercase tracking-wider ${booking.balanceAmount > 0 ? 'text-red-700' : 'text-slate-500'}`}>Pending Balance</p>
                        <p className={`text-xl font-bold mt-1 ${booking.balanceAmount > 0 ? 'text-red-800' : 'text-slate-400'}`}>
                            {currency} {booking.balanceAmount.toLocaleString()}
                        </p>
                    </div>
                    {booking.balanceAmount > 0 && <PieChart size={20} className="text-red-500 opacity-50" />}
                </div>
            </div>
        </div>

        {/* Visual Progress */}
        <div className="mb-8">
            <div className="flex justify-between text-xs font-medium text-slate-500 mb-1.5">
                <span>Progress</span>
                <span>{percentPaid}% Paid</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-100">
                <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${percentPaid >= 100 ? 'bg-green-500' : 'bg-brand-500'}`} 
                    style={{ width: `${percentPaid}%` }}
                ></div>
            </div>
        </div>

        {/* Admin Controls */}
        {isAdminOrStaff && (
            <div className="mb-6 flex justify-end">
                <button 
                    onClick={() => setShowAddModal(true)}
                    disabled={booking.balanceAmount <= 0}
                    className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-700 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <PlusCircle size={16} /> Record Manual Payment
                </button>
            </div>
        )}

        {/* Transaction History */}
        <div>
            <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <History size={16} className="text-slate-400" /> Transaction History
            </h4>
            {booking.payments.length > 0 ? (
                <div className="overflow-hidden border border-slate-200 rounded-lg">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs uppercase">
                            <tr>
                                <th className="px-4 py-3 font-semibold">Date</th>
                                <th className="px-4 py-3 font-semibold">Details</th>
                                <th className="px-4 py-3 font-semibold">Mode</th>
                                <th className="px-4 py-3 font-semibold text-right">Amount</th>
                                <th className="px-4 py-3 font-semibold text-right">Receipt</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {booking.payments.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50 transition">
                                    <td className="px-4 py-3 text-slate-600 font-medium whitespace-nowrap">
                                        {new Date(p.date).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                            p.type === 'ADVANCE' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                            p.type === 'FULL' || p.type === 'BALANCE' ? 'bg-green-50 text-green-700 border-green-100' :
                                            'bg-slate-100 text-slate-600 border-slate-200'
                                        }`}>
                                            {p.type}
                                        </span>
                                        {p.reference && <div className="text-xs text-slate-400 mt-1 font-mono">{p.reference}</div>}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 text-xs">
                                        {p.mode.replace('_', ' ')}
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-slate-800">
                                        {currency} {Math.abs(p.amount).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button 
                                            onClick={() => handleDownloadReceipt(p)}
                                            className="text-brand-600 hover:text-brand-800 p-1.5 hover:bg-brand-50 rounded transition"
                                            title="Download Receipt"
                                        >
                                            <Download size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center p-6 border border-dashed border-slate-300 rounded-lg text-slate-400 text-xs italic bg-slate-50">
                    No payments recorded yet.
                </div>
            )}
        </div>
      </div>

      {/* Add Payment Modal */}
      {showAddModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl animate-in zoom-in-95">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Record Payment</h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Payment Amount</label>
                          <div className="relative">
                              <DollarSign size={16} className="absolute left-3 top-3 text-slate-400" />
                              <input 
                                  type="number" 
                                  required
                                  min="1"
                                  max={booking.balanceAmount}
                                  value={amount}
                                  onChange={e => setAmount(e.target.value)}
                                  className="w-full pl-10 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 outline-none font-bold text-slate-900"
                                  placeholder="0.00"
                              />
                          </div>
                          <p className="text-xs text-slate-500 mt-1 text-right">Max: {currency} {booking.balanceAmount}</p>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Payment Mode</label>
                          <select 
                              value={mode}
                              onChange={e => setMode(e.target.value as PaymentMode)}
                              className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 bg-white"
                          >
                              <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</option>
                              <option value="UPI">UPI / GPay</option>
                              <option value="CASH">Cash</option>
                              <option value="ONLINE">Online Gateway</option>
                              <option value="CREDIT_LIMIT">Credit Limit Adjustment</option>
                          </select>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Reference / Transaction ID</label>
                          <input 
                              type="text" 
                              required
                              value={reference}
                              onChange={e => setReference(e.target.value)}
                              className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 outline-none"
                              placeholder="e.g. UTR Number"
                          />
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                          <button 
                              type="button" 
                              onClick={() => setShowAddModal(false)}
                              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                          >
                              Cancel
                          </button>
                          <button 
                              type="submit"
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-bold flex items-center gap-2 shadow-sm"
                          >
                              <CheckCircle size={16} /> Confirm
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
