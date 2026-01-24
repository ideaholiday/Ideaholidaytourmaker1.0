import React, { useState, useEffect } from 'react';
import { companyService } from '../../services/companyService';
import { CompanyProfile } from '../../types';
import { Building, Plus, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';

export const CompanyManagement: React.FC = () => {
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingComp, setEditingComp] = useState<CompanyProfile | null>(null);
  
  const [formData, setFormData] = useState<Partial<CompanyProfile>>({});

  useEffect(() => {
      refresh();
  }, []);

  const refresh = () => companyService.getAllCompanies().then(setCompanies);

  const handleOpenModal = (comp?: CompanyProfile) => {
    if (comp) {
      setEditingComp(comp);
      setFormData(comp);
    } else {
      setEditingComp(null);
      setFormData({
        isActive: true,
        gstType: 'CGST_SGST',
        gstRate: 5,
        invoicePrefix: 'INV-',
        receiptPrefix: 'RCPT-',
        creditNotePrefix: 'CN-'
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName || !formData.gstin) return;

    const company: CompanyProfile = {
      id: editingComp?.id || '', // Service handles ID generation if empty
      companyName: formData.companyName!,
      brandName: formData.brandName || formData.companyName!,
      gstin: formData.gstin!,
      email: formData.email || '',
      phone: formData.phone || '',
      address: formData.address || '',
      stateCode: formData.stateCode || '09',
      gstRate: Number(formData.gstRate),
      gstType: formData.gstType as any,
      invoicePrefix: formData.invoicePrefix || 'INV-',
      nextInvoiceNumber: editingComp?.nextInvoiceNumber || 1,
      receiptPrefix: formData.receiptPrefix || 'RCPT-',
      nextReceiptNumber: editingComp?.nextReceiptNumber || 1,
      creditNotePrefix: formData.creditNotePrefix || 'CN-',
      nextCreditNoteNumber: editingComp?.nextCreditNoteNumber || 1,
      isActive: formData.isActive || false
    };

    companyService.saveCompany(company);
    refresh();
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this company?')) {
      companyService.deleteCompany(id);
      refresh();
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Company Master</h1>
          <p className="text-slate-500">Manage multiple business entities, GSTINs, and invoice series.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 transition"
        >
          <Plus size={18} /> Add Company
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {companies.map(comp => (
            <div key={comp.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col relative">
                <div className="absolute top-4 right-4 flex gap-2">
                    <button onClick={() => handleOpenModal(comp)} className="text-slate-400 hover:text-brand-600"><Edit2 size={18} /></button>
                    <button onClick={() => handleDelete(comp.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={18} /></button>
                </div>

                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-brand-50 p-2.5 rounded-lg text-brand-600">
                        <Building size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-900">{comp.brandName}</h3>
                        <p className="text-xs text-slate-500">{comp.companyName}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-y-3 text-sm text-slate-600 mb-4">
                    <div>
                        <span className="block text-xs text-slate-400 uppercase">GSTIN</span>
                        <span className="font-mono font-medium">{comp.gstin}</span>
                    </div>
                    <div>
                        <span className="block text-xs text-slate-400 uppercase">Invoice Series</span>
                        <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs">{comp.invoicePrefix}XXXX</span>
                    </div>
                    <div>
                        <span className="block text-xs text-slate-400 uppercase">Default Tax</span>
                        <span>{comp.gstRate}% ({comp.gstType.replace('_', ' + ')})</span>
                    </div>
                    <div>
                        <span className="block text-xs text-slate-400 uppercase">State Code</span>
                        <span>{comp.stateCode}</span>
                    </div>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center">
                    <span className={`flex items-center gap-1 text-xs font-bold ${comp.isActive ? 'text-green-600' : 'text-red-500'}`}>
                        {comp.isActive ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        {comp.isActive ? 'Active Entity' : 'Inactive'}
                    </span>
                    <span className="text-xs text-slate-400">ID: {comp.id}</span>
                </div>
            </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-6">{editingComp ? 'Edit Company' : 'New Company Entity'}</h2>
            
            <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Legal Company Name</label>
                        <input required type="text" value={formData.companyName || ''} onChange={e => setFormData({...formData, companyName: e.target.value})} className="w-full border p-2 rounded text-sm" placeholder="Private Ltd Name" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Brand Name (Display)</label>
                        <input required type="text" value={formData.brandName || ''} onChange={e => setFormData({...formData, brandName: e.target.value})} className="w-full border p-2 rounded text-sm" placeholder="Marketing Name" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">GSTIN</label>
                        <input required type="text" value={formData.gstin || ''} onChange={e => setFormData({...formData, gstin: e.target.value})} className="w-full border p-2 rounded text-sm uppercase" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Prefix</label>
                        <input required type="text" value={formData.invoicePrefix || ''} onChange={e => setFormData({...formData, invoicePrefix: e.target.value})} className="w-full border p-2 rounded text-sm uppercase" placeholder="e.g. IH-MUM-" />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Receipt Prefix</label>
                        <input required type="text" value={formData.receiptPrefix || ''} onChange={e => setFormData({...formData, receiptPrefix: e.target.value})} className="w-full border p-2 rounded text-sm uppercase" placeholder="e.g. RCPT-" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Credit Note Prefix</label>
                        <input required type="text" value={formData.creditNotePrefix || ''} onChange={e => setFormData({...formData, creditNotePrefix: e.target.value})} className="w-full border p-2 rounded text-sm uppercase" placeholder="e.g. CN-" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">State Code</label>
                        <input required type="text" value={formData.stateCode || ''} onChange={e => setFormData({...formData, stateCode: e.target.value})} className="w-full border p-2 rounded text-sm" placeholder="09" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">GST Rate (%)</label>
                        <input required type="number" value={formData.gstRate || ''} onChange={e => setFormData({...formData, gstRate: Number(e.target.value)})} className="w-full border p-2 rounded text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">GST Type</label>
                        <select value={formData.gstType || 'CGST_SGST'} onChange={e => setFormData({...formData, gstType: e.target.value as any})} className="w-full border p-2 rounded text-sm bg-white">
                            <option value="CGST_SGST">CGST + SGST</option>
                            <option value="IGST">IGST</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Registered Address</label>
                    <textarea value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full border p-2 rounded text-sm h-20" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border p-2 rounded text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                        <input type="text" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border p-2 rounded text-sm" />
                    </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                    <input type="checkbox" checked={formData.isActive || false} onChange={e => setFormData({...formData, isActive: e.target.checked})} id="activeCheck" className="rounded text-brand-600"/>
                    <label htmlFor="activeCheck" className="text-sm text-slate-700">Company is Active</label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700">Save Entity</button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};