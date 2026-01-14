
import { GSTRecord, GSTCreditNote, Booking, User, UserRole } from '../types';
import { adminService } from './adminService';
import { auditLogService } from './auditLogService';
import { companyService } from './companyService';

const STORAGE_KEY_GST = 'iht_gst_records';
const STORAGE_KEY_CREDIT_NOTES = 'iht_gst_credit_notes';

class GSTService {
  private records: GSTRecord[];
  private creditNotes: GSTCreditNote[];

  constructor() {
    const storedRecords = localStorage.getItem(STORAGE_KEY_GST);
    const storedCN = localStorage.getItem(STORAGE_KEY_CREDIT_NOTES);
    
    this.records = storedRecords ? JSON.parse(storedRecords) : [];
    this.creditNotes = storedCN ? JSON.parse(storedCN) : [];
  }

  private save() {
    localStorage.setItem(STORAGE_KEY_GST, JSON.stringify(this.records));
    localStorage.setItem(STORAGE_KEY_CREDIT_NOTES, JSON.stringify(this.creditNotes));
  }

  getInvoiceByBooking(bookingId: string): GSTRecord | undefined {
    return this.records.find(r => r.bookingId === bookingId);
  }

  getAllRecords(): GSTRecord[] {
    return this.records;
  }

  getAllCreditNotes(): GSTCreditNote[] {
    return this.creditNotes;
  }

  /**
   * Generates a tax invoice for a confirmed booking.
   * Logic: Back-calculates taxable amount from the Total Selling Price.
   * Uses Company Service for specific Invoice numbering.
   */
  generateInvoice(booking: Booking): GSTRecord | null {
    // Avoid duplicates
    if (this.records.some(r => r.bookingId === booking.id)) {
      return null; 
    }

    // Determine Company Config
    // If booking has no companyId (legacy), use default
    const companyId = booking.companyId || companyService.getDefaultCompany().id;
    const company = companyService.getCompany(companyId);
    
    if (!company) {
        console.error("GST Generation Failed: Company not found for ID", companyId);
        return null;
    }

    const gstRate = company.gstRate || 5; 
    const totalAmount = booking.sellingPrice;

    // Back calculation: Taxable = Total / (1 + Rate/100)
    const taxableAmount = Number((totalAmount / (1 + gstRate / 100)).toFixed(2));
    const totalGst = Number((totalAmount - taxableAmount).toFixed(2));

    // Split logic
    let cgst = 0, sgst = 0, igst = 0;
    
    if (company.gstType === 'IGST') {
        igst = totalGst;
    } else {
        cgst = Number((totalGst / 2).toFixed(2));
        sgst = Number((totalGst / 2).toFixed(2));
    }

    const newRecord: GSTRecord = {
      id: `gst_${Date.now()}`,
      bookingId: booking.id,
      bookingRef: booking.uniqueRefNo,
      invoiceNumber: companyService.generateNextInvoiceNumber(companyId),
      invoiceDate: new Date().toISOString(),
      
      taxableAmount,
      gstRate,
      
      cgstAmount: cgst,
      sgstAmount: sgst,
      igstAmount: igst,
      totalGst,
      
      totalInvoiceAmount: totalAmount,
      customerName: booking.agentName,
      companyId: companyId,
      status: 'ACTIVE'
    };

    this.records.unshift(newRecord);
    this.save();

    // Audit
    const systemUser: User = { id: 'system', name: 'System', role: UserRole.ADMIN, email: '', isVerified: true };
    auditLogService.logAction({
      entityType: 'GST_INVOICE',
      entityId: newRecord.id,
      action: 'INVOICE_GENERATED',
      description: `Invoice ${newRecord.invoiceNumber} generated for Booking ${booking.uniqueRefNo} under ${company.brandName}.`,
      user: systemUser,
      newValue: newRecord
    });

    return newRecord;
  }

  /**
   * Generates a Credit Note upon cancellation/refund.
   * Requires Original Invoice to exist.
   */
  generateCreditNote(booking: Booking, refundAmount: number): GSTCreditNote | null {
    const invoice = this.getInvoiceByBooking(booking.id);
    if (!invoice) {
        console.warn("Cannot generate Credit Note: Original Invoice not found.");
        return null;
    }

    // Use Company Service to get proper sequential number
    const cnNumber = companyService.generateNextCreditNoteNumber(invoice.companyId);

    // Formula: RefundTaxable = RefundAmount / (1 + GST_Rate/100)
    const refundTaxable = Number((refundAmount / (1 + invoice.gstRate / 100)).toFixed(2));
    const refundGst = Number((refundAmount - refundTaxable).toFixed(2));

    const cn: GSTCreditNote = {
      id: `cn_${Date.now()}`,
      originalInvoiceId: invoice.id,
      creditNoteNumber: cnNumber,
      issuedDate: new Date().toISOString(),
      refundTaxableAmount: refundTaxable,
      refundGstAmount: refundGst,
      totalRefundAmount: refundAmount,
      companyId: invoice.companyId,
      reason: booking.cancellation?.reason || 'Booking Cancelled'
    };

    this.creditNotes.unshift(cn);
    
    // Update Invoice Status if fully refunded (or mostly)
    // Business logic: If total refund >= total invoice, mark refunded.
    // Floating point comparison needs small epsilon or >=
    if (refundAmount >= invoice.totalInvoiceAmount) {
        invoice.status = 'REFUNDED'; // Full Refund
    } 
    invoice.creditNoteId = cn.id;

    this.save();

    // Audit
    const systemUser: User = { id: 'system', name: 'System', role: UserRole.ADMIN, email: '', isVerified: true };
    auditLogService.logAction({
      entityType: 'GST_CREDIT_NOTE',
      entityId: cn.id,
      action: 'CREDIT_NOTE_ISSUED',
      description: `Credit Note ${cn.creditNoteNumber} issued for Invoice ${invoice.invoiceNumber}. Amount: ${refundAmount}`,
      user: systemUser,
      newValue: cn
    });

    return cn;
  }

  // --- REPORTING HELPERS ---

  getSummaryStats() {
    const totalTaxable = this.records.reduce((sum, r) => sum + (r.status === 'ACTIVE' ? r.taxableAmount : 0), 0);
    const totalGst = this.records.reduce((sum, r) => sum + (r.status === 'ACTIVE' ? r.totalGst : 0), 0);
    
    const reversalTaxable = this.creditNotes.reduce((sum, cn) => sum + cn.refundTaxableAmount, 0);
    const reversalGst = this.creditNotes.reduce((sum, cn) => sum + cn.refundGstAmount, 0);

    return {
      grossTaxable: totalTaxable,
      grossGst: totalGst,
      netTaxable: totalTaxable - reversalTaxable,
      netGst: totalGst - reversalGst,
      cnCount: this.creditNotes.length,
      invCount: this.records.length
    };
  }
}

export const gstService = new GSTService();
