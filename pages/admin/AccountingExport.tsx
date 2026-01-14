
import React, { useState } from 'react';
import { accountingExportService } from '../../services/accountingExportService';
import { useAuth } from '../../context/AuthContext';
import { FileText, Download, Calendar, Database, ShieldCheck } from 'lucide-react';

export const AccountingExport: React.FC = () => {
  const { user } = useAuth();
  
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [exportFormat, setExportFormat] = useState<'TALLY' | 'ZOHO'>('TALLY');

  const handleExport = () => {
    if (!user) return;
    
    if (exportFormat === 'TALLY') {
        accountingExportService.generateTallyExport(dateFrom, dateTo, user);
    } else {
        accountingExportService.generateZohoExport(dateFrom, dateTo, user);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Database size={28} className="text-brand-600" /> Accounting Bridge
        </h1>
        <p className="text-slate-500">Export financial data for external accounting software (Tally / Zoho).</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Control Panel */}
          <div className="md:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                      <Calendar size={20} className="text-slate-500" /> Export Configuration
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">From Date</label>
                          <input 
                              type="date" 
                              value={dateFrom} 
                              onChange={e => setDateFrom(e.target.value)} 
                              className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">To Date</label>
                          <input 
                              type="date" 
                              value={dateTo} 
                              onChange={e => setDateTo(e.target.value)} 
                              className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                          />
                      </div>
                  </div>

                  <div className="mb-8">
                      <label className="block text-sm font-medium text-slate-700 mb-3">Target Software</label>
                      <div className="grid grid-cols-2 gap-4">
                          <button 
                            onClick={() => setExportFormat('TALLY')}
                            className={`p-4 rounded-xl border-2 text-left transition flex items-center gap-3 ${exportFormat === 'TALLY' ? 'border-green-500 bg-green-50 text-green-800' : 'border-slate-200 hover:border-slate-300'}`}
                          >
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${exportFormat === 'TALLY' ? 'border-green-600 bg-green-600' : 'border-slate-400'}`}>
                                  {exportFormat === 'TALLY' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                              </div>
                              <div>
                                  <span className="font-bold block">Tally ERP 9 / Prime</span>
                                  <span className="text-xs opacity-70">XML Vouchers</span>
                              </div>
                          </button>

                          <button 
                            onClick={() => setExportFormat('ZOHO')}
                            className={`p-4 rounded-xl border-2 text-left transition flex items-center gap-3 ${exportFormat === 'ZOHO' ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-slate-200 hover:border-slate-300'}`}
                          >
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${exportFormat === 'ZOHO' ? 'border-blue-600 bg-blue-600' : 'border-slate-400'}`}>
                                  {exportFormat === 'ZOHO' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                              </div>
                              <div>
                                  <span className="font-bold block">Zoho Books</span>
                                  <span className="text-xs opacity-70">CSV Templates</span>
                              </div>
                          </button>
                      </div>
                  </div>

                  <button 
                    onClick={handleExport}
                    className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition shadow-lg"
                  >
                      <Download size={20} /> Generate Export Package
                  </button>
              </div>
          </div>

          {/* Info Panel */}
          <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-100 p-5 rounded-xl text-blue-800 text-sm">
                  <h4 className="font-bold mb-2 flex items-center gap-2"><ShieldCheck size={18} /> Audit Safety</h4>
                  <p className="leading-relaxed">
                      All exports are logged with your user ID and timestamp. 
                      Ensure that the accounting period selected is closed in your system to prevent data duplication.
                  </p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <FileText size={18} className="text-slate-400" /> Data Scope
                  </h4>
                  <ul className="space-y-3 text-xs text-slate-600">
                      <li className="flex justify-between border-b border-slate-100 pb-2">
                          <span>Sales Vouchers</span>
                          <span className="font-mono font-bold text-slate-800">Included</span>
                      </li>
                      <li className="flex justify-between border-b border-slate-100 pb-2">
                          <span>Payment Receipts</span>
                          <span className="font-mono font-bold text-slate-800">Included</span>
                      </li>
                      <li className="flex justify-between border-b border-slate-100 pb-2">
                          <span>Credit Notes (Refunds)</span>
                          <span className="font-mono font-bold text-slate-800">Included</span>
                      </li>
                      <li className="flex justify-between border-b border-slate-100 pb-2">
                          <span>GST Breakup</span>
                          <span className="font-mono font-bold text-slate-800">IGST/CGST/SGST</span>
                      </li>
                  </ul>
              </div>
          </div>
      </div>
    </div>
  );
};
