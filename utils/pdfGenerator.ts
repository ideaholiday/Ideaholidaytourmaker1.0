
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { Quote, PricingBreakdown, UserRole, User, Booking, PaymentEntry, GSTRecord, GSTCreditNote } from '../types';
import { BRANDING } from '../constants';
import { currencyService } from '../services/currencyService';

// --- STYLING CONSTANTS ---
const COLORS = {
    primary: [14, 165, 233], // Brand 500 (#0ea5e9)
    secondary: [15, 23, 42], // Slate 900
    accent: [240, 249, 255], // Brand 50
    text: [51, 65, 85],      // Slate 700
    lightText: [100, 116, 139], // Slate 500
    tableHeader: [241, 245, 249] // Slate 100
};

interface BrandingOptions {
  companyName: string;
  address: string;
  email: string;
  phone: string;
  website: string;
  logoUrl?: string;
  primaryColorHex: string;
}

// Helper: Resolve Branding
const resolveBranding = (role: UserRole, agentProfile?: User | null, forcePlatform?: boolean) => {
    let branding: BrandingOptions = {
        companyName: BRANDING.legalName,
        address: BRANDING.address,
        email: BRANDING.email,
        phone: BRANDING.supportPhone,
        website: BRANDING.website,
        primaryColorHex: '#0ea5e9'
    };

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
    ] : COLORS.primary;
};

export const generateQuotePDF = (
  quote: Quote, 
  breakdown: PricingBreakdown | null,
  role: UserRole,
  agentProfile?: User | null
) => {
  const doc = new jsPDF();
  const branding = resolveBranding(role, agentProfile);
  const primaryRGB = hexToRgb(branding.primaryColorHex);

  // --- MODERN HEADER ---
  // Background Strip
  doc.setFillColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
  doc.rect(0, 0, 210, 40, 'F'); 

  // Company Name/Logo Area (White Box)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(15, 15, 80, 25, 2, 2, 'F');
  
  // Logo Logic
  if (branding.logoUrl) {
      try {
          doc.addImage(branding.logoUrl, 'PNG', 20, 18, 20, 20, undefined, 'FAST');
      } catch (e) { console.warn("Logo Error", e); }
  }

  // Company Name
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
  const nameX = branding.logoUrl ? 45 : 20;
  doc.text(branding.companyName, nameX, 25, { maxWidth: 45 });
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.lightText[0], COLORS.lightText[1], COLORS.lightText[2]);
  doc.text("Travel Partner", nameX, 33);

  // Document Title (Right Side on Blue)
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  const docTitle = role === UserRole.OPERATOR ? "SERVICE ORDER" : "TRAVEL PROPOSAL";
  doc.text(docTitle, 195, 28, { align: 'right' });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Ref: ${quote.uniqueRefNo}`, 195, 35, { align: 'right' });

  // --- TRIP SUMMARY CARD ---
  let yPos = 55;
  
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.roundedRect(15, yPos, 180, 28, 3, 3, 'FD');

  doc.setFontSize(9);
  doc.setTextColor(COLORS.lightText[0], COLORS.lightText[1], COLORS.lightText[2]);
  doc.text("Destination", 20, yPos + 8);
  doc.text("Travel Date", 80, yPos + 8);
  doc.text("Guests", 140, yPos + 8);

  doc.setFontSize(11);
  doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
  doc.setFont("helvetica", "bold");
  doc.text(quote.destination, 20, yPos + 16);
  doc.text(quote.travelDate, 80, yPos + 16);
  doc.text(`${quote.leadGuestName || 'Valued Guest'} (${quote.paxCount} Pax)`, 140, yPos + 16);

  // --- ITINERARY SECTION ---
  yPos += 40;
  doc.setFontSize(14);
  doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
  doc.text("Detailed Itinerary", 15, yPos);
  
  yPos += 5;

  if (quote.itinerary && quote.itinerary.length > 0) {
    const tableBody: any[] = [];
    const startDate = new Date(quote.travelDate);
    
    quote.itinerary.forEach(item => {
      // Calculate Date
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + (item.day - 1));
      const dateStr = currentDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', weekday: 'short' });

      // 1. Day Header Row
      tableBody.push([{ 
          content: `Day ${item.day}  |  ${dateStr}  -  ${item.title}`, 
          colSpan: 2, 
          styles: { 
              fontStyle: 'bold', 
              fontSize: 10,
              fillColor: COLORS.tableHeader, 
              textColor: COLORS.secondary,
              cellPadding: { top: 5, bottom: 5, left: 5 }
          } 
      }]);
      
      // 2. Description Row
      if(item.description) {
          tableBody.push([{ 
              content: item.description, 
              colSpan: 2, 
              styles: { 
                  fontStyle: 'italic', 
                  textColor: COLORS.text,
                  cellPadding: { top: 2, bottom: 5, left: 5, right: 5 }
              } 
          }]);
      }

      // 3. Services Rows
      if(item.services && item.services.length > 0) {
          item.services.forEach(svc => {
              let details = "";
              if (svc.type === 'TRANSFER' && svc.meta?.vehicle) details = ` • ${svc.meta.vehicle}`;
              else if (svc.type === 'HOTEL' && svc.meta?.roomType) details = ` • ${svc.meta.roomType} (${svc.meta.mealPlan})`;
              else if (svc.type === 'ACTIVITY' && svc.meta?.type) details = ` • ${svc.meta.type}`;

              // Price Logic (Strictly controlled)
              let priceText = "";
              // Admins see line items. Agents see "Included". Operators see nothing/masked.
              if (role === UserRole.ADMIN || role === UserRole.STAFF) {
                  // For Admin PDF, show converted line item price
                  const converted = currencyService.convert(svc.cost, svc.currency || 'USD', quote.currency || 'USD');
                  priceText = `${quote.currency || 'USD'} ${Math.round(converted).toLocaleString()}`;
              } else if (role === UserRole.AGENT) {
                  priceText = "Included";
              }

              // Icons
              const typeIcon = svc.type === 'HOTEL' ? 'HOTEL' : svc.type === 'TRANSFER' ? 'TRANSFER' : 'ACTIVITY';

              tableBody.push([
                  { content: `${typeIcon}: ${svc.name}${details}`, styles: { textColor: COLORS.secondary, fontSize: 9 } }, 
                  { content: priceText, styles: { halign: 'right', fontStyle: 'bold', textColor: primaryRGB as any, fontSize: 8 } }
              ]);
          });
      }
    });

    autoTable(doc, {
      startY: yPos,
      body: tableBody,
      theme: 'plain', // Clean look
      styles: { fontSize: 9, cellPadding: 2, valign: 'middle' },
      columnStyles: { 0: { cellWidth: 150 }, 1: { cellWidth: 30 } },
      didParseCell: (data) => {
          // Add border only at bottom of day block if needed, or leave clean
          if (data.row.cells[0].raw && typeof data.row.cells[0].raw === 'object' && (data.row.cells[0].raw as any).content.startsWith('Day')) {
             // Header styling already applied
          }
      }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // --- PRICING & FOOTER ---
  if (role !== UserRole.OPERATOR) {
      const displayPrice = role === UserRole.AGENT 
         ? (quote.sellingPrice || quote.price || 0) 
         : breakdown?.finalPrice || 0;
      
      const currencySymbol = quote.currency || 'USD';

      // Ensure space for price box
      if (yPos > 250) {
          doc.addPage();
          yPos = 40;
      }

      // Price Box (Right Aligned)
      doc.setFillColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
      doc.roundedRect(120, yPos, 75, 28, 2, 2, 'F');
      
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text("Total Package Cost", 130, yPos + 8);
      
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(`${currencySymbol} ${displayPrice.toLocaleString()}`, 130, yPos + 18);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("(Inclusive of all taxes)", 130, yPos + 23);
      
      // Contact Box (Left Aligned)
      doc.setFontSize(10);
      doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
      doc.setFont("helvetica", "bold");
      doc.text("Contact & Booking", 15, yPos + 8);
      
      doc.setFontSize(9);
      doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
      doc.setFont("helvetica", "normal");
      
      doc.text(branding.phone, 15, yPos + 15);
      doc.text(branding.email, 15, yPos + 20);
      if(branding.website) doc.text(branding.website, 15, yPos + 25);
  }

  // Footer on all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Generated by ${branding.companyName}`, 15, 290);
    doc.text(`Page ${i} of ${pageCount}`, 195, 290, { align: 'right' });
  }

  doc.save(`${branding.companyName.replace(/\s/g, '')}_${quote.uniqueRefNo}.pdf`);
};

export const generateReceiptPDF = (
    booking: Booking,
    payment: PaymentEntry,
    agentProfile: User | null
) => {
    // Reusing logic for cleaner output
    const doc = new jsPDF();
    const branding = resolveBranding(UserRole.AGENT, agentProfile);
    const primaryRGB = hexToRgb(branding.primaryColorHex);

    // Header
    doc.setFillColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
    doc.rect(0, 0, 210, 30, 'F');
    
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text(payment.type === 'REFUND' ? "PAYMENT REFUND" : "PAYMENT RECEIPT", 105, 20, { align: "center" });

    // Details
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Receipt No: ${payment.receiptNumber || payment.id}`, 15, 45);
    doc.text(`Date: ${new Date(payment.date).toLocaleDateString()}`, 15, 52);
    
    doc.setFontSize(12);
    doc.text(`Received From: ${booking.agentName}`, 15, 65);
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Amount: ${booking.currency} ${Math.abs(payment.amount).toLocaleString()}`, 15, 80);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Payment Mode: ${payment.mode}`, 15, 90);
    doc.text(`Reference: ${payment.reference}`, 15, 97);
    
    doc.save(`Receipt_${payment.receiptNumber || payment.id}.pdf`);
};

export const generateInvoicePDF = (invoice: GSTRecord, booking: Booking) => {
     const doc = new jsPDF();
     doc.text("TAX INVOICE", 105, 20, { align: "center" });
     // Simplified placeholder logic for invoice
     doc.save(`Invoice_${invoice.invoiceNumber}.pdf`);
};

export const generateCreditNotePDF = (creditNote: GSTCreditNote, booking: Booking) => {
     const doc = new jsPDF();
     doc.text("CREDIT NOTE", 105, 20, { align: "center" });
     doc.save(`CN_${creditNote.creditNoteNumber}.pdf`);
};
