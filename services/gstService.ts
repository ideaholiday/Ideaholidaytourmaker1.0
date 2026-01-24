import { GSTRecord, GSTCreditNote, Booking, User, UserRole } from '../types';
import { dbHelper } from './firestoreHelper';
import { auditLogService } from './auditLogService';
import { companyService } from './companyService';

const COLL_GST = 'gst_records';
const COLL_CN = 'gst_credit_notes';

class GSTService {
  
  async getAllRecords(): Promise<GSTRecord[]> {
    return await dbHelper.getAll<GSTRecord>(COLL_GST);
  }
  
  async getAllCreditNotes(): Promise<GSTCreditNote[]> {
    return await dbHelper.getAll<GSTCreditNote>(COLL_CN);
  }

  async getInvoiceByBooking(bookingId: string): Promise<GSTRecord | null> {
      const results = await dbHelper.getWhere<GSTRecord>(COLL_GST, 'bookingId', '==', bookingId);
      return results[0] || null;
  }

  async generateInvoice(booking: Booking): Promise<GSTRecord | null> {
    const existing = await this.getInvoiceByBooking(booking.id);
    if (existing) return null;

    const companyId = booking.companyId || (await companyService.getDefaultCompany()).id;
    const company = await companyService.getCompany(companyId);
    if (!company) return null;

    const invoiceNumber = await companyService.generateNextInvoiceNumber(companyId);
    
    // Simple calculation logic
    const totalAmount = booking.sellingPrice;
    const gstRate = company.gstRate || 5;
    const taxableAmount = Number((totalAmount / (1 + gstRate / 100)).toFixed(2));
    const totalGst = Number((totalAmount - taxableAmount).toFixed(2));
    
    const newRecord: GSTRecord = {
      id: `gst_${Date.now()}`,
      bookingId: booking.id,
      bookingRef: booking.uniqueRefNo,
      invoiceNumber,
      invoiceDate: new Date().toISOString(),
      taxableAmount,
      gstRate,
      cgstAmount: totalGst / 2, 
      sgstAmount: totalGst / 2,
      igstAmount: 0, // Simplified
      totalGst,
      totalInvoiceAmount: totalAmount,
      customerName: booking.agentName,
      companyId: companyId,
      status: 'ACTIVE'
    };

    await dbHelper.save(COLL_GST, newRecord);

    // Audit
    const systemUser: User = { id: 'system', name: 'System', role: UserRole.ADMIN, email: '', isVerified: true };
    auditLogService.logAction({
      entityType: 'GST_INVOICE',
      entityId: newRecord.id,
      action: 'INVOICE_GENERATED',
      description: `Invoice generated for ${booking.uniqueRefNo}`,
      user: systemUser
    });

    return newRecord;
  }
  
  // Note: getSummaryStats needs to be async or called after data load in component
  async getSummaryStats() {
      const records = await this.getAllRecords();
      // ... calc logic ...
      return { grossTaxable: 0, grossGst: 0, netTaxable: 0, netGst: 0, cnCount: 0, invCount: records.length };
  }
}

export const gstService = new GSTService();