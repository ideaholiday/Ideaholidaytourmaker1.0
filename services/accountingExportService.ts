
import { User, ExportLog } from '../types';
import { gstService } from './gstService';
import { bookingService } from './bookingService';
import { tallyVoucherBuilder } from '../utils/tallyVoucherBuilder';
import { zohoCsvBuilder } from '../utils/zohoCsvBuilder';
import { auditLogService } from './auditLogService';

class AccountingExportService {
  
  // Helper to fetch data within range
  private getData(startDate: Date, endDate: Date) {
    const invoices = gstService.getAllRecords().filter(r => {
        const d = new Date(r.invoiceDate);
        return d >= startDate && d <= endDate;
    });

    const bookings = bookingService.getAllBookings(); // To link payments/agents
    const creditNotes = gstService.getAllCreditNotes().filter(cn => {
        const d = new Date(cn.issuedDate);
        return d >= startDate && d <= endDate;
    });

    const payments = [];
    bookings.forEach(b => {
        b.payments.forEach(p => {
            const d = new Date(p.date);
            if (d >= startDate && d <= endDate) {
                // Attach agent name temporarily for CSV builder
                // We use a map in the builder usually, but let's pass a helper
                payments.push({ ...p, _agentName: b.agentName }); 
            }
        });
    });

    return { invoices, payments, creditNotes };
  }

  /**
   * Generates Tally XML File
   */
  generateTallyExport(from: string, to: string, user: User): void {
    const { invoices, payments, creditNotes } = this.getData(new Date(from), new Date(to));
    const vouchers: string[] = [];

    invoices.forEach(inv => vouchers.push(tallyVoucherBuilder.buildSalesVoucher(inv)));
    // @ts-ignore
    payments.forEach(pay => vouchers.push(tallyVoucherBuilder.buildReceiptVoucher(pay, pay._agentName || 'Unknown Agent')));
    
    creditNotes.forEach(cn => {
        const inv = gstService.getInvoiceByBooking(cn.originalInvoiceId); // Warning: originalInvoiceId is actually Invoice ID in GSTService
        // Actually gstService uses originalInvoiceId to link to GSTRecord.id
        const parentInv = gstService.getAllRecords().find(r => r.id === cn.originalInvoiceId);
        vouchers.push(tallyVoucherBuilder.buildCreditNoteVoucher(cn, parentInv?.customerName || 'Unknown'));
    });

    const xmlContent = tallyVoucherBuilder.buildXML(vouchers);
    this.downloadFile(xmlContent, `Tally_Export_${from}_${to}.xml`, 'text/xml');

    this.logExport(user, 'TALLY_XML', from, to, vouchers.length);
  }

  /**
   * Generates Zoho CSV Files (Multiple)
   * Note: In a real app we'd Zip these. Here we trigger multiple downloads.
   */
  generateZohoExport(from: string, to: string, user: User): void {
    const { invoices, payments, creditNotes } = this.getData(new Date(from), new Date(to));

    // 1. Invoices
    const invCsv = zohoCsvBuilder.buildInvoicesCSV(invoices);
    this.downloadFile(invCsv, `Zoho_Invoices_${from}_${to}.csv`, 'text/csv');

    // 2. Payments
    // @ts-ignore
    const payCsv = zohoCsvBuilder.buildPaymentsCSV(payments, (id) => payments.find(p => p.id === id)?._agentName || 'Unknown');
    this.downloadFile(payCsv, `Zoho_Payments_${from}_${to}.csv`, 'text/csv');

    // 3. Credit Notes
    const cnCsv = zohoCsvBuilder.buildCreditNotesCSV(creditNotes, (id) => gstService.getAllRecords().find(r => r.id === id));
    this.downloadFile(cnCsv, `Zoho_CreditNotes_${from}_${to}.csv`, 'text/csv');

    this.logExport(user, 'ZOHO_CSV', from, to, invoices.length + payments.length + creditNotes.length);
  }

  private downloadFile(content: string, fileName: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private logExport(user: User, format: 'TALLY_XML' | 'ZOHO_CSV', from: string, to: string, count: number) {
      auditLogService.logAction({
          entityType: 'ACCOUNTING_EXPORT',
          entityId: `exp_${Date.now()}`,
          action: 'EXPORT_GENERATED',
          description: `Generated ${format} export for range ${from} to ${to}. Records: ${count}`,
          user: user
      });
  }
}

export const accountingExportService = new AccountingExportService();
