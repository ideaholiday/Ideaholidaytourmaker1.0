
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { Quote, PricingBreakdown, UserRole, User, Booking, PaymentEntry, GSTRecord, GSTCreditNote } from '../types';
import { BRANDING } from '../constants';
import { companyService } from '../services/companyService';
import { gstService } from '../services/gstService';

interface BrandingOptions {
  companyName: string;
  address: string;
  email: string;
  phone: string;
  website: string;
  logoUrl?: string;
  primaryColorHex: string;
}

// Helper: Amount to Words (Simplified)
const numToWords = (n: number): string => {
    // This is a simplified version. For enterprise use, use a library like 'number-to-words'
    return `${n.toLocaleString()} ONLY`;
};

// Helper: Resolve Branding
const resolveBranding = (role: UserRole, agentProfile?: User | null, forcePlatform?: boolean) => {
    // Default: Idea Holiday Branding (Platform)
    let branding: BrandingOptions = {
        companyName: BRANDING.legalName,
        address: BRANDING.address,
        email: BRANDING.email,
        phone: BRANDING.supportPhone,
        website: BRANDING.website,
        primaryColorHex: '#0ea5e9' // Brand 500
    };

    // If Agent context (and not forced Platform doc like Tax Invoice), use Agent Branding
    if (!forcePlatform && role === UserRole.AGENT && agentProfile) {
        const ab = agentProfile.agentBranding;
        branding = {
            companyName: ab?.agencyName || agentProfile.companyName || agentProfile.name,
            address: ab?.officeAddress || "Authorized Travel Partner", 
            email: agentProfile.email,
            phone: ab?.contactPhone || agentProfile.phone || "",
            website: ab?.website || "",
            logoUrl: ab?.logoUrl,
            primaryColorHex: ab?.primaryColor || '#0ea5e9'
        };
    }
    return branding;
};

// Helper: Hex to RGB
const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : [14, 165, 233];
};

export const generateQuotePDF = (
  quote: Quote, 
  breakdown: PricingBreakdown | null,
  role: UserRole,
  agentProfile?: User | null
) => {
  const doc = new jsPDF();
  const branding = resolveBranding(role, agentProfile);
  const primaryColor = hexToRgb(branding.primaryColorHex);
  const darkColor = [15, 23, 42]; // Slate 900
  const lightColor = [241, 245, 249]; // Slate 100

  // --- HEADER ---
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 5, 'F'); 

  // Logo
  if (branding.logoUrl) {
      try {
          doc.addImage(branding.logoUrl, 'PNG', 15, 15, 25, 25, undefined, 'FAST');
      } catch (e) {
          console.warn("Could not add logo to PDF", e);
      }
  }

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  
  const textX = branding.logoUrl ? 45 : 15;
  doc.text(branding.companyName, textX, 25);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  if(branding.address) doc.text(branding.address, textX, 31);
  if(branding.phone) doc.text(`Phone: ${branding.phone}`, textX, 36);
  if(branding.website) doc.text(branding.website, textX, 41);

  // Quote Meta
  doc.setFontSize(28);
  doc.setTextColor(200); 
  const docTitle = role === UserRole.OPERATOR ? "SERVICE ORDER" : "QUOTATION";
  doc.text(docTitle, 200, 30, { align: 'right' });
  
  doc.setFontSize(10);
  doc.setTextColor(50);
  doc.text(`Ref No: ${quote.uniqueRefNo}`, 200, 40, { align: 'right' });
  doc.text(`Date: ${new Date().toISOString().split('T')[0]}`, 200, 45, { align: 'right' });

  // --- TRIP OVERVIEW ---
  doc.setDrawColor(200);
  doc.line(15, 55, 195, 55);
  
  doc.setFillColor(lightColor[0], lightColor[1], lightColor[2]);
  doc.roundedRect(15, 60, 180, 20, 2, 2, 'F');
  
  doc.setFontSize(10);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  
  doc.text("Destination:", 20, 67);
  doc.setFont("helvetica", "bold");
  doc.text(quote.destination, 20, 73);
  
  doc.setFont("helvetica", "normal");
  doc.text("Travel Date:", 80, 67);
  doc.setFont("helvetica", "bold");
  doc.text(quote.travelDate, 80, 73);
  
  doc.setFont("helvetica", "normal");
  doc.text("Travellers:", 140, 67);
  doc.setFont("helvetica", "bold");
  doc.text(`${quote.paxCount} Pax`, 140, 73);

  // --- ITINERARY ---
  let finalY = 90;
  if (quote.itinerary && quote.itinerary.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("Travel Itinerary", 15, finalY);
    
    finalY += 5;

    const tableData = quote.itinerary.map(item => {
      let details = item.description || "";
      if (item.services?.some(s => s.isRef)) details += "\n\n[NOTICE: Hotel booked directly by Agent. Cost NOT included.]";
      if (item.inclusions && item.inclusions.length > 0) details += `\n\nIncluded: ${item.inclusions.join(', ')}`;
      return [`Day ${item.day}`, item.title, details];
    });

    autoTable(doc, {
      startY: finalY,
      head: [['Day', 'Title', 'Details']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: primaryColor as any, textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 4, valign: 'top' },
      columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 50 } }
    });
    
    finalY = (doc as any).lastAutoTable.finalY + 15;
  }

  // --- PRICING ---
  if (role !== UserRole.OPERATOR) {
      const displayPrice = role === UserRole.AGENT 
         ? (quote.sellingPrice || quote.price || 0) 
         : breakdown?.finalPrice || 0;
      
      const perPerson = displayPrice / (quote.paxCount || 1);

      doc.setFillColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.rect(120, finalY, 75, 30, 'F');
      
      doc.setTextColor(255);
      doc.setFontSize(10);
      doc.text("Total Package Cost", 130, finalY + 10);
      
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(`${quote.currency} ${displayPrice.toLocaleString()}`, 130, finalY + 18);
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`(approx ${quote.currency} ${Math.round(perPerson).toLocaleString()} per person)`, 130, finalY + 25);

      if (quote.hotelMode === 'REF') {
          doc.setTextColor(200, 0, 0); 
          doc.setFontSize(9);
          doc.text("* Note: Hotel cost is excluded from this package price.", 15, finalY + 10);
      }
  }

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`${branding.companyName} - Thank you for your business.`, 105, 290, { align: 'center' });
    doc.text(`Page ${i} of ${pageCount}`, 195, 290, { align: 'right' });
  }

  doc.save(`${branding.companyName.replace(/\s/g, '')}_${quote.uniqueRefNo}.pdf`);
};

/**
 * GENERATE PAYMENT RECEIPT
 * Agent -> Client or Platform -> Agent
 */
export const generateReceiptPDF = (
    booking: Booking,
    payment: PaymentEntry,
    agentProfile: User | null
) => {
    const doc = new jsPDF();
    
    // Receipt = Agent Branding if they are the face, but legal header usually implies who collected money.
    // For SaaS, we use Agent Branding for the "Letterhead" feel, but state "Powered by Platform"
    const branding = resolveBranding(UserRole.AGENT, agentProfile);
    const primaryColor = hexToRgb(branding.primaryColorHex);

    // --- HEADER ---
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, 'F');

    const title = payment.type === 'REFUND' ? 'REFUND RECEIPT' : 'PAYMENT RECEIPT';

    doc.setTextColor(255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text(title, 105, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Receipt No: ${payment.receiptNumber || 'PENDING'}`, 105, 28, { align: "center" });
    doc.text(`Date: ${new Date(payment.date).toLocaleDateString()}`, 105, 34, { align: "center" });

    // --- FROM / TO ---
    doc.setTextColor(0);
    doc.setFontSize(10);
    
    // Left: Agency Info
    const startY = 55;
    doc.setFont("helvetica", "bold");
    doc.text(payment.type === 'REFUND' ? "Refunded By:" : "Received By:", 15, startY);
    doc.setFont("helvetica", "normal");
    doc.text(branding.companyName, 15, startY + 6);
    if (branding.address) doc.text(branding.address, 15, startY + 12);
    if (branding.phone) doc.text(branding.phone, 15, startY + 18);

    // Right: Client Info (From Booking Travelers or Agent Name if B2B)
    doc.setFont("helvetica", "bold");
    doc.text(payment.type === 'REFUND' ? "Refunded To:" : "Received From:", 120, startY);
    doc.setFont("helvetica", "normal");
    // Ideally use Lead Traveler Name, fallback to Agent Name if B2B internal receipt
    const payerName = booking.travelers?.[0]?.firstName ? `${booking.travelers[0].title} ${booking.travelers[0].firstName} ${booking.travelers[0].lastName}` : booking.agentName;
    doc.text(payerName, 120, startY + 6);
    doc.text(`Ref: ${booking.uniqueRefNo}`, 120, startY + 12);
    doc.text(booking.destination, 120, startY + 18);

    // --- PAYMENT DETAILS BOX ---
    const boxY = startY + 30;
    doc.setFillColor(245, 247, 250);
    doc.setDrawColor(200);
    doc.roundedRect(15, boxY, 180, 50, 2, 2, 'FD');

    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`Amount: ${booking.currency} ${Math.abs(payment.amount).toLocaleString()}`, 105, boxY + 15, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`(in words: ${numToWords(Math.abs(payment.amount))} ${booking.currency})`, 105, boxY + 22, { align: "center" });

    doc.setDrawColor(220);
    doc.line(40, boxY + 28, 170, boxY + 28);

    doc.setTextColor(50);
    doc.text(`Mode: ${payment.mode.replace('_', ' ')}`, 30, boxY + 40);
    doc.text(`Ref: ${payment.reference || 'N/A'}`, 120, boxY + 40);

    // --- FOOTER ---
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text("This is a computer-generated receipt and requires no signature.", 105, 270, { align: "center" });
    doc.text(`Powered by ${BRANDING.legalName}`, 105, 275, { align: "center" });

    doc.save(`Receipt_${payment.receiptNumber || payment.id}.pdf`);
};

/**
 * GENERATE TAX INVOICE
 * Platform -> Agent (B2B Compliance)
 */
export const generateInvoicePDF = (
    invoice: GSTRecord,
    booking: Booking
) => {
    const doc = new jsPDF();
    const company = companyService.getCompany(invoice.companyId) || companyService.getDefaultCompany();
    
    // Invoice is always Platform Branding (Legal Entity)
    const primaryColor = [15, 23, 42]; // Slate 900 for Official Docs

    // --- HEADER ---
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("TAX INVOICE", 195, 20, { align: "right" });

    doc.setFontSize(16);
    doc.text(company.brandName, 15, 20);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    doc.text(company.address, 15, 26);
    doc.text(`GSTIN: ${company.gstin}`, 15, 36);
    doc.text(`Email: ${company.email}`, 15, 41);

    // Invoice Meta
    const metaY = 55;
    doc.text("Invoice Details:", 120, metaY);
    doc.setFont("helvetica", "bold");
    doc.text(`Invoice No: ${invoice.invoiceNumber}`, 120, metaY + 5);
    doc.text(`Date: ${new Date(invoice.invoiceDate).toLocaleDateString()}`, 120, metaY + 10);
    doc.text(`Booking Ref: ${invoice.bookingRef}`, 120, metaY + 15);

    // Billed To
    doc.setFont("helvetica", "normal");
    doc.text("Billed To:", 15, metaY);
    doc.setFont("helvetica", "bold");
    doc.text(invoice.customerName, 15, metaY + 5);
    doc.setFont("helvetica", "normal");
    if(invoice.customerGst) doc.text(`GSTIN: ${invoice.customerGst}`, 15, metaY + 10);
    doc.text(`Destination: ${booking.destination}`, 15, metaY + 15);

    // --- TABLE ---
    const tableY = metaY + 25;
    
    const tableBody = [
        [
            "Travel Services - Tour Package",
            "9985", // SAC Code
            `${booking.currency} ${invoice.taxableAmount.toLocaleString()}`,
            `${invoice.totalGst.toLocaleString()} (${invoice.gstRate}%)`,
            `${booking.currency} ${invoice.totalInvoiceAmount.toLocaleString()}`
        ]
    ];

    autoTable(doc, {
        startY: tableY,
        head: [['Description of Services', 'SAC Code', 'Taxable Value', 'GST Amount', 'Total Value']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: primaryColor as any, textColor: 255 },
        columnStyles: { 0: { cellWidth: 80 }, 4: { cellWidth: 30, halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } }
    });

    // Tax Breakdown (if split)
    let taxY = (doc as any).lastAutoTable.finalY + 10;
    
    if (invoice.cgstAmount > 0) {
        doc.text(`CGST: ${invoice.cgstAmount.toLocaleString()}`, 195, taxY, { align: "right" });
        taxY += 5;
        doc.text(`SGST: ${invoice.sgstAmount.toLocaleString()}`, 195, taxY, { align: "right" });
        taxY += 5;
    } else {
        doc.text(`IGST: ${invoice.igstAmount.toLocaleString()}`, 195, taxY, { align: "right" });
        taxY += 5;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Grand Total: ${booking.currency} ${invoice.totalInvoiceAmount.toLocaleString()}`, 195, taxY + 5, { align: "right" });

    // Footer
    const footerY = 250;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Declaration:", 15, footerY);
    doc.text("We declare that this invoice shows the actual price of the goods/services described and that all particulars are true and correct.", 15, footerY + 5);
    
    doc.text("Authorized Signatory", 195, footerY + 20, { align: "right" });
    doc.text(`For ${company.brandName}`, 195, footerY + 25, { align: "right" });

    doc.save(`Invoice_${invoice.invoiceNumber}.pdf`);
};

/**
 * GENERATE GST CREDIT NOTE
 * Platform -> Agent (Reversal of Invoice)
 */
export const generateCreditNotePDF = (
    creditNote: GSTCreditNote,
    booking: Booking
) => {
    const doc = new jsPDF();
    const company = companyService.getCompany(creditNote.companyId) || companyService.getDefaultCompany();
    const originalInvoice = gstService.getAllRecords().find(r => r.id === creditNote.originalInvoiceId);
    
    // Official Branding (Platform)
    const primaryColor = [15, 23, 42]; 

    // --- HEADER ---
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("CREDIT NOTE", 195, 20, { align: "right" });

    doc.setFontSize(16);
    doc.text(company.brandName, 15, 20);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    doc.text(company.address, 15, 26);
    doc.text(`GSTIN: ${company.gstin}`, 15, 36);

    // Details
    const metaY = 55;
    doc.text("Credit Note Details:", 120, metaY);
    doc.setFont("helvetica", "bold");
    doc.text(`CN No: ${creditNote.creditNoteNumber}`, 120, metaY + 5);
    doc.text(`Date: ${new Date(creditNote.issuedDate).toLocaleDateString()}`, 120, metaY + 10);
    doc.text(`Orig. Invoice: ${originalInvoice?.invoiceNumber || 'N/A'}`, 120, metaY + 15);
    doc.text(`Inv. Date: ${originalInvoice ? new Date(originalInvoice.invoiceDate).toLocaleDateString() : 'N/A'}`, 120, metaY + 20);

    // Billed To (From Booking/Invoice)
    doc.setFont("helvetica", "normal");
    doc.text("Issued To:", 15, metaY);
    doc.setFont("helvetica", "bold");
    doc.text(booking.agentName, 15, metaY + 5);
    doc.setFont("helvetica", "normal");
    doc.text(`Booking Ref: ${booking.uniqueRefNo}`, 15, metaY + 10);
    if(originalInvoice?.customerGst) doc.text(`GSTIN: ${originalInvoice.customerGst}`, 15, metaY + 15);

    // --- TABLE ---
    const tableY = metaY + 30;
    
    const tableBody = [
        [
            `Cancellation/Refund - ${creditNote.reason}`,
            "9985", // SAC Code
            `${booking.currency} ${creditNote.refundTaxableAmount.toLocaleString()}`,
            `${creditNote.refundGstAmount.toLocaleString()}`,
            `${booking.currency} ${creditNote.totalRefundAmount.toLocaleString()}`
        ]
    ];

    autoTable(doc, {
        startY: tableY,
        head: [['Description', 'SAC Code', 'Taxable Reversal', 'GST Reversal', 'Total Refund']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: primaryColor as any, textColor: 255 },
        columnStyles: { 0: { cellWidth: 80 }, 4: { cellWidth: 30, halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } }
    });

    // Totals
    let taxY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Net Refund Total: ${booking.currency} ${creditNote.totalRefundAmount.toLocaleString()}`, 195, taxY + 5, { align: "right" });

    // Footer
    const footerY = 250;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Declaration:", 15, footerY);
    doc.text("This credit note is issued for reversal of GST liability due to cancellation/refund.", 15, footerY + 5);
    
    doc.text("Authorized Signatory", 195, footerY + 20, { align: "right" });
    doc.text(`For ${company.brandName}`, 195, footerY + 25, { align: "right" });

    doc.save(`CreditNote_${creditNote.creditNoteNumber}.pdf`);
};
