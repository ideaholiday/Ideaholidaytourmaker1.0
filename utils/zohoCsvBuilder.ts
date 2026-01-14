
import { GSTRecord, PaymentEntry, GSTCreditNote } from '../types';

export class ZohoCsvBuilder {
  
  // --- INVOICES CSV ---
  buildInvoicesCSV(invoices: GSTRecord[]): string {
    const header = [
      "Invoice Number",
      "Invoice Date",
      "Customer Name",
      "Place of Supply",
      "Item Name",
      "Item Rate",
      "Tax Name",
      "Tax Percentage",
      "Tax Amount",
      "Total"
    ].join(',');

    const rows = invoices.map(inv => {
      // Determine Tax Label
      let taxLabel = "IGST";
      if (inv.cgstAmount > 0) taxLabel = "GST (Intra State)";
      
      return [
        inv.invoiceNumber,
        new Date(inv.invoiceDate).toISOString().split('T')[0],
        `"${inv.customerName}"`,
        "Uttar Pradesh", // Default/Placeholder, should come from Agent State
        "Travel Services", // Generic Item
        inv.taxableAmount.toFixed(2),
        taxLabel,
        `${inv.gstRate}%`,
        inv.totalGst.toFixed(2),
        inv.totalInvoiceAmount.toFixed(2)
      ].join(',');
    });

    return [header, ...rows].join('\n');
  }

  // --- PAYMENTS CSV ---
  buildPaymentsCSV(payments: PaymentEntry[], getAgentName: (id: string) => string): string {
    const header = [
      "Payment Number",
      "Payment Date",
      "Reference Number",
      "Payment Mode",
      "Amount",
      "Customer Name",
      "Description"
    ].join(',');

    const rows = payments.map(pay => {
      // Find agent from booking ideally, here we mock or assume booking service lookup done before
      // Ideally payment entry should store agentName directly for easier export
      // We will rely on the passed helper
      
      return [
        pay.receiptNumber || pay.id,
        new Date(pay.date).toISOString().split('T')[0],
        pay.reference || '',
        pay.mode,
        pay.amount.toFixed(2),
        `"${getAgentName(pay.id)}"`, // Placeholder, logic needs booking link
        `Payment for ${pay.reference}`
      ].join(',');
    });

    return [header, ...rows].join('\n');
  }

  // --- CREDIT NOTES CSV ---
  buildCreditNotesCSV(cns: GSTCreditNote[], getInvoice: (id: string) => GSTRecord | undefined): string {
    const header = [
      "Credit Note Number",
      "Credit Note Date",
      "Invoice Number",
      "Reason",
      "Item Name",
      "Rate",
      "Tax Amount",
      "Total"
    ].join(',');

    const rows = cns.map(cn => {
      const inv = getInvoice(cn.originalInvoiceId);
      
      return [
        cn.creditNoteNumber,
        new Date(cn.issuedDate).toISOString().split('T')[0],
        inv ? inv.invoiceNumber : '',
        `"${cn.reason}"`,
        "Cancellation Charges / Refund",
        cn.refundTaxableAmount.toFixed(2),
        cn.refundGstAmount.toFixed(2),
        cn.totalRefundAmount.toFixed(2)
      ].join(',');
    });

    return [header, ...rows].join('\n');
  }
}

export const zohoCsvBuilder = new ZohoCsvBuilder();
