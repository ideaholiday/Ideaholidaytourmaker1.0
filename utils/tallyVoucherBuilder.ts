
import { GSTRecord, PaymentEntry, GSTCreditNote } from '../types';

export class TallyVoucherBuilder {
  
  // Format Date for Tally (YYYYMMDD)
  private formatDate(isoDate: string): string {
    return isoDate.replace(/-/g, '').slice(0, 8);
  }

  // --- 1. SALES VOUCHER (INVOICES) ---
  buildSalesVoucher(invoice: GSTRecord): string {
    const date = this.formatDate(invoice.invoiceDate);
    
    // Ledger Logic
    // Credit: Sales Ledger (Taxable)
    // Credit: Tax Ledgers (IGST or CGST/SGST)
    // Debit: Party Ledger (Total Invoice Amount)

    let taxEntries = '';
    if (invoice.igstAmount > 0) {
        taxEntries += `
        <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>Output IGST</LEDGERNAME>
            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
            <AMOUNT>${invoice.igstAmount.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>`;
    } else {
        if (invoice.cgstAmount > 0) {
            taxEntries += `
            <ALLLEDGERENTRIES.LIST>
                <LEDGERNAME>Output CGST</LEDGERNAME>
                <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
                <AMOUNT>${invoice.cgstAmount.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>`;
        }
        if (invoice.sgstAmount > 0) {
            taxEntries += `
            <ALLLEDGERENTRIES.LIST>
                <LEDGERNAME>Output SGST</LEDGERNAME>
                <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
                <AMOUNT>${invoice.sgstAmount.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>`;
        }
    }

    return `
    <VOUCHER VCHTYPE="Sales" ACTION="Create">
        <DATE>${date}</DATE>
        <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
        <VOUCHERNUMBER>${invoice.invoiceNumber}</VOUCHERNUMBER>
        <REFERENCE>${invoice.bookingRef}</REFERENCE>
        <PARTYLEDGERNAME>${invoice.customerName}</PARTYLEDGERNAME>
        <NARRATION>Booking Ref: ${invoice.bookingRef}</NARRATION>
        
        <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>${invoice.customerName}</LEDGERNAME>
            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
            <AMOUNT>-${invoice.totalInvoiceAmount.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>

        <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>Sales Account</LEDGERNAME>
            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
            <AMOUNT>${invoice.taxableAmount.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>

        ${taxEntries}
    </VOUCHER>`;
  }

  // --- 2. RECEIPT VOUCHER (PAYMENTS) ---
  buildReceiptVoucher(payment: PaymentEntry, agentName: string): string {
    const date = this.formatDate(payment.date);
    const bankLedger = payment.mode === 'CASH' ? 'Cash in Hand' : 'Bank Account';

    return `
    <VOUCHER VCHTYPE="Receipt" ACTION="Create">
        <DATE>${date}</DATE>
        <VOUCHERTYPENAME>Receipt</VOUCHERTYPENAME>
        <VOUCHERNUMBER>${payment.receiptNumber || payment.id}</VOUCHERNUMBER>
        <REFERENCE>${payment.reference}</REFERENCE>
        <PARTYLEDGERNAME>${agentName}</PARTYLEDGERNAME>
        <NARRATION>Received via ${payment.mode} - Ref: ${payment.reference}</NARRATION>

        <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>${agentName}</LEDGERNAME>
            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
            <AMOUNT>${payment.amount.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>

        <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>${bankLedger}</LEDGERNAME>
            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
            <AMOUNT>-${payment.amount.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
    </VOUCHER>`;
  }

  // --- 3. CREDIT NOTE VOUCHER (REFUNDS/RETURNS) ---
  buildCreditNoteVoucher(cn: GSTCreditNote, agentName: string): string {
    const date = this.formatDate(cn.issuedDate);

    // Ledger Logic (Reversal)
    // Debit: Sales Return (Taxable)
    // Debit: Output Tax (Reversal)
    // Credit: Party Ledger (Total Refund)

    let taxEntries = '';
    // Simplifying Assumption: Using IGST if generic, in prod we check original invoice
    if (cn.refundGstAmount > 0) {
        taxEntries += `
        <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>Output IGST</LEDGERNAME>
            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
            <AMOUNT>-${cn.refundGstAmount.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>`;
    }

    return `
    <VOUCHER VCHTYPE="Credit Note" ACTION="Create">
        <DATE>${date}</DATE>
        <VOUCHERTYPENAME>Credit Note</VOUCHERTYPENAME>
        <VOUCHERNUMBER>${cn.creditNoteNumber}</VOUCHERNUMBER>
        <PARTYLEDGERNAME>${agentName}</PARTYLEDGERNAME>
        <NARRATION>Refund/Cancellation - ${cn.reason}</NARRATION>

        <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>${agentName}</LEDGERNAME>
            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
            <AMOUNT>${cn.totalRefundAmount.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>

        <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>Sales Return</LEDGERNAME>
            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
            <AMOUNT>-${cn.refundTaxableAmount.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>

        ${taxEntries}
    </VOUCHER>`;
  }

  // --- WRAPPER ---
  buildXML(vouchers: string[]): string {
    return `
<ENVELOPE>
    <HEADER>
        <TALLYREQUEST>Import Data</TALLYREQUEST>
    </HEADER>
    <BODY>
        <IMPORTDATA>
            <REQUESTDESC>
                <REPORTNAME>Vouchers</REPORTNAME>
            </REQUESTDESC>
            <REQUESTDATA>
                <TALLYMESSAGE xmlns:UDF="TallyUDF">
                    ${vouchers.join('\n')}
                </TALLYMESSAGE>
            </REQUESTDATA>
        </IMPORTDATA>
    </BODY>
</ENVELOPE>`.trim();
  }
}

export const tallyVoucherBuilder = new TallyVoucherBuilder();
