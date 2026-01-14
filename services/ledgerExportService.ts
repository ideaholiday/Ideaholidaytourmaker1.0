
import { LedgerEntry, GSTRecord, GSTCreditNote, PaymentEntry, Booking } from '../types';
import { gstService } from './gstService';
import { bookingService } from './bookingService';
import { companyService } from './companyService';

class LedgerExportService {
  
  /**
   * Generates double-entry ledger records.
   */
  generateLedger(dateFrom: string, dateTo: string, companyId?: string): LedgerEntry[] {
    const entries: LedgerEntry[] = [];
    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);
    endDate.setDate(endDate.getDate() + 1); // Inclusive

    // 1. SALES INVOICES (GST Records)
    const invoices = gstService.getAllRecords().filter(r => {
        const d = new Date(r.invoiceDate);
        const dateMatch = d >= startDate && d < endDate;
        const compMatch = companyId ? r.companyId === companyId : true;
        return dateMatch && compMatch && r.status !== 'CANCELLED'; 
    });

    invoices.forEach(inv => {
        // ENTRY 1: Debit Agent Receivable (Total Amount)
        // CREDIT: Sales Account (Taxable)
        entries.push({
            entryId: `led_${inv.id}_sales`,
            date: inv.invoiceDate,
            voucherType: 'SALES',
            voucherNumber: inv.invoiceNumber,
            ledgerDebit: `Agent Receivable - ${inv.customerName}`,
            ledgerCredit: 'Sales Account',
            amount: inv.taxableAmount,
            narration: `Booking #${inv.bookingRef} - Sales`,
            bookingId: inv.bookingId,
            companyId: inv.companyId
        });

        // ENTRY 2: GST Liability
        // DEBIT: Agent Receivable (Tax Amount) -- In combined entry logic, Agent is debited full amount.
        // Here we split rows: Agent Dr (Tax part) -> Output GST Cr
        if (inv.totalGst > 0) {
            if (inv.igstAmount > 0) {
                entries.push({
                    entryId: `led_${inv.id}_igst`,
                    date: inv.invoiceDate,
                    voucherType: 'SALES',
                    voucherNumber: inv.invoiceNumber,
                    ledgerDebit: `Agent Receivable - ${inv.customerName}`,
                    ledgerCredit: 'Output IGST',
                    amount: inv.igstAmount,
                    gstComponent: { type: 'IGST', amount: inv.igstAmount },
                    narration: `IGST @ ${inv.gstRate}%`,
                    bookingId: inv.bookingId,
                    companyId: inv.companyId
                });
            } else {
                if (inv.cgstAmount > 0) {
                    entries.push({
                        entryId: `led_${inv.id}_cgst`,
                        date: inv.invoiceDate,
                        voucherType: 'SALES',
                        voucherNumber: inv.invoiceNumber,
                        ledgerDebit: `Agent Receivable - ${inv.customerName}`,
                        ledgerCredit: 'Output CGST',
                        amount: inv.cgstAmount,
                        gstComponent: { type: 'CGST', amount: inv.cgstAmount },
                        narration: `CGST @ ${inv.gstRate / 2}%`,
                        bookingId: inv.bookingId,
                        companyId: inv.companyId
                    });
                }
                if (inv.sgstAmount > 0) {
                    entries.push({
                        entryId: `led_${inv.id}_sgst`,
                        date: inv.invoiceDate,
                        voucherType: 'SALES',
                        voucherNumber: inv.invoiceNumber,
                        ledgerDebit: `Agent Receivable - ${inv.customerName}`,
                        ledgerCredit: 'Output SGST',
                        amount: inv.sgstAmount,
                        gstComponent: { type: 'SGST', amount: inv.sgstAmount },
                        narration: `SGST @ ${inv.gstRate / 2}%`,
                        bookingId: inv.bookingId,
                        companyId: inv.companyId
                    });
                }
            }
        }
    });

    // 2. RECEIPTS (Payments)
    const allBookings = bookingService.getAllBookings();
    
    allBookings.forEach(booking => {
        if (companyId && booking.companyId !== companyId) return;

        booking.payments.forEach(pay => {
            const pDate = new Date(pay.date);
            if (pDate >= startDate && pDate < endDate && pay.type !== 'REFUND') {
                const bankLedger = pay.mode === 'CASH' ? 'Cash Account' : 'Bank Account (Main)'; 

                entries.push({
                    entryId: `led_${pay.id}`,
                    date: pay.date,
                    voucherType: 'RECEIPT',
                    voucherNumber: pay.id,
                    ledgerDebit: bankLedger,
                    ledgerCredit: `Agent Receivable - ${booking.agentName}`,
                    amount: pay.amount,
                    narration: `Payment for ${booking.uniqueRefNo} via ${pay.mode}`,
                    bookingId: booking.id,
                    companyId: booking.companyId
                });
            }
        });
    });

    // 3. CREDIT NOTES (Returns / Cancellations)
    const creditNotes = gstService.getAllCreditNotes().filter(cn => {
        const d = new Date(cn.issuedDate);
        const dateMatch = d >= startDate && d < endDate;
        const compMatch = companyId ? cn.companyId === companyId : true;
        return dateMatch && compMatch;
    });

    creditNotes.forEach(cn => {
        // Reverse Sales (Taxable)
        entries.push({
            entryId: `led_${cn.id}_ret`,
            date: cn.issuedDate,
            voucherType: 'CREDIT_NOTE',
            voucherNumber: cn.creditNoteNumber,
            ledgerDebit: 'Sales Return',
            ledgerCredit: 'Agent Receivable', // Customer Name derived in export or use Generic
            amount: cn.refundTaxableAmount,
            narration: `Return Taxable - ${cn.reason}`,
            bookingId: undefined, // Linked via Original Invoice ideally
            companyId: cn.companyId
        });

        // Reverse GST
        if (cn.refundGstAmount > 0) {
             // Assuming simple reversal, typically split IGST/CGST/SGST based on original invoice. 
             // For this demo, we debit a generic Output GST Reversal or split 50/50 if assumed intra.
             // Ideally we fetch original invoice to know tax type.
             const invoice = gstService.getAllRecords().find(r => r.id === cn.originalInvoiceId);
             const isIGST = invoice?.igstAmount && invoice.igstAmount > 0;

             if (isIGST) {
                 entries.push({
                    entryId: `led_${cn.id}_igst_rev`,
                    date: cn.issuedDate,
                    voucherType: 'CREDIT_NOTE',
                    voucherNumber: cn.creditNoteNumber,
                    ledgerDebit: 'Output IGST',
                    ledgerCredit: 'Agent Receivable',
                    amount: cn.refundGstAmount,
                    gstComponent: { type: 'IGST', amount: cn.refundGstAmount },
                    narration: `IGST Reversal`,
                    companyId: cn.companyId
                 });
             } else {
                 const halfTax = Number((cn.refundGstAmount / 2).toFixed(2));
                 entries.push({
                    entryId: `led_${cn.id}_cgst_rev`,
                    date: cn.issuedDate,
                    voucherType: 'CREDIT_NOTE',
                    voucherNumber: cn.creditNoteNumber,
                    ledgerDebit: 'Output CGST',
                    ledgerCredit: 'Agent Receivable',
                    amount: halfTax,
                    gstComponent: { type: 'CGST', amount: halfTax },
                    narration: `CGST Reversal`,
                    companyId: cn.companyId
                 });
                 entries.push({
                    entryId: `led_${cn.id}_sgst_rev`,
                    date: cn.issuedDate,
                    voucherType: 'CREDIT_NOTE',
                    voucherNumber: cn.creditNoteNumber,
                    ledgerDebit: 'Output SGST',
                    ledgerCredit: 'Agent Receivable',
                    amount: halfTax,
                    gstComponent: { type: 'SGST', amount: halfTax },
                    narration: `SGST Reversal`,
                    companyId: cn.companyId
                 });
             }
        }
    });

    return entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Export to Zoho Books CSV
   */
  exportToZohoCSV(entries: LedgerEntry[]): string {
    const header = ['Date', 'Voucher Number', 'Voucher Type', 'Ledger Name', 'Debit', 'Credit', 'Narration', 'Tax Type', 'Tax Amount'];
    const rows = entries.map(e => {
        // In our entries, we defined Debit/Credit Ledgers.
        // Zoho expects one row per line item.
        // Since we split entries into rows already:
        // E.g. Sales Row: Dr Agent (Implicit in Zoho Invoice usually, but for journal CSV):
        // Usually Zoho Import is: Date, Account, Debit/Credit...
        
        // Let's create a Journal format row for the specific line item
        // If the entry says: Dr Agent, Cr Sales.
        // We output TWO rows for a pure journal export, or one row if it's "Sales" import.
        // To keep it simple and compliant with the "Single Row" Ledger View requested:
        
        // We will output the PRIMARY impact of the row.
        // If it's a Sales Row: It credits Sales. The debit is implied to Customer (Agent).
        // BUT, for a strict "Ledger" CSV, we list:
        
        return [
            new Date(e.date).toISOString().split('T')[0],
            e.voucherNumber,
            e.voucherType,
            e.ledgerCredit, // The Income/Tax Ledger
            0, // Debit
            e.amount, // Credit
            e.narration,
            e.gstComponent?.type || '',
            e.gstComponent?.amount || ''
        ].join(',');
    });
    
    // Note: This is a simplified "Sales Register" view. A full double-entry CSV would require doubling rows.
    return [header.join(','), ...rows].join('\n');
  }

  /**
   * Export to Tally Compatible CSV
   */
  exportToTallyCSV(entries: LedgerEntry[]): string {
    const header = ['Voucher Date', 'Voucher Type', 'Voucher No', 'Ledger Head', 'Amount (Dr/Cr)', 'Narration'];
    const rows = entries.map(e => {
        // Tally Vouchers need Dr and Cr. 
        // We will output the Credit Leg here for Sales, and Debit Leg for Receipts.
        
        const isReceipt = e.voucherType === 'RECEIPT';
        const ledger = isReceipt ? e.ledgerDebit : e.ledgerCredit;
        const drCr = isReceipt ? 'Dr' : 'Cr';
        
        return [
            new Date(e.date).toLocaleDateString('en-GB').replace(/\//g, '-'),
            e.voucherType,
            e.voucherNumber,
            ledger,
            `${e.amount} ${drCr}`,
            e.narration
        ].join(',');
    });

    return [header.join(','), ...rows].join('\n');
  }
}

export const ledgerExportService = new LedgerExportService();
