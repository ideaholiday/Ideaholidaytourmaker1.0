
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { Quote, PricingBreakdown, UserRole, User, Booking, PaymentEntry, GSTRecord, GSTCreditNote } from '../types';
import { BRANDING } from '../constants';
import { currencyService } from '../services/currencyService';

// --- STYLING CONSTANTS ---
const COLORS = {
    primary: [14, 165, 233], // Brand 500
    secondary: [15, 23, 42], // Slate 900
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
const resolveBranding = (role: UserRole, agentProfile?: User | null) => {
    // Default Platform Branding
    let branding: BrandingOptions = {
        companyName: BRANDING.legalName,
        address: BRANDING.address,
        email: BRANDING.email,
        phone: BRANDING.supportPhone,
        website: BRANDING.website,
        primaryColorHex: '#0ea5e9'
    };

    // If Agent or Operator viewing, and Agent Profile exists, use Agent Branding
    if (role === UserRole.AGENT && agentProfile) {
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

  // --- HEADER ---
  doc.setFillColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
  doc.rect(0, 0, 210, 40, 'F'); 

  // Logo Placeholder
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(15, 15, 80, 25, 2, 2, 'F');
  
  if (branding.logoUrl) {
      try {
          doc.addImage(branding.logoUrl, 'PNG', 20, 18, 20, 20, undefined, 'FAST');
      } catch (e) {}
  }

  // Company Info
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
  const nameX = branding.logoUrl ? 45 : 20;
  doc.text(branding.companyName, nameX, 25);
  
  // Title
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("TRAVEL ITINERARY", 195, 28, { align: 'right' });
  doc.setFontSize(10);
  doc.text(`Ref: ${quote.uniqueRefNo}`, 195, 35, { align: 'right' });

  // --- TRIP DETAILS ---
  let yPos = 55;
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Destination: ${quote.destination}`, 15, yPos);
  doc.text(`Travel Date: ${quote.travelDate}`, 15, yPos + 6);
  doc.text(`Guests: ${quote.paxCount} Pax`, 15, yPos + 12);

  yPos += 25;

  // --- ITINERARY TABLE ---
  if (quote.itinerary && quote.itinerary.length > 0) {
    const tableBody: any[] = [];
    const startDate = new Date(quote.travelDate);
    
    quote.itinerary.forEach(item => {
      // Date Calc
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + (item.day - 1));
      const dateStr = currentDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

      // Header Row
      tableBody.push([{ 
          content: `Day ${item.day} - ${dateStr} - ${item.title}`, 
          colSpan: 1, 
          styles: { fontStyle: 'bold', fillColor: COLORS.tableHeader, textColor: COLORS.secondary } 
      }]);
      
      // Description
      if(item.description) {
          tableBody.push([{ content: item.description, styles: { fontStyle: 'italic', textColor: 80 } }]);
      }

      // Services
      if(item.services && item.services.length > 0) {
          item.services.forEach(svc => {
              let typeLabel: string = svc.type;
              let nameLabel = svc.name;
              let note = "";
              
              if (svc.type === 'OTHER') {
                  typeLabel = 'Special';
                  note = ' (Booked by Agent)';
              }

              let details = "";
              if (svc.meta?.roomType) details += ` • ${svc.meta.roomType}`;
              if (svc.meta?.mealPlan) details += ` (${svc.meta.mealPlan})`;
              if (svc.meta?.vehicle) details += ` • ${svc.meta.vehicle}`;

              tableBody.push([{ 
                  content: `[${typeLabel}] ${nameLabel}${details}${note}`, 
                  styles: { fontSize: 9 } 
              }]);
          });
      }
    });

    autoTable(doc, {
      startY: yPos,
      body: tableBody,
      theme: 'plain',
      styles: { cellPadding: 4 },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // --- FOOTER & PRICE ---
  const displayPrice = quote.sellingPrice || quote.price || 0;
  
  doc.setFillColor(245, 245, 245);
  doc.rect(120, yPos, 75, 25, 'F');
  doc.setFontSize(10);
  doc.text("Total Package Cost", 125, yPos + 8);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`${quote.currency || 'USD'} ${displayPrice.toLocaleString()}`, 125, yPos + 18);

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`Generated by ${branding.companyName} | ${branding.email}`, 105, 290, { align: 'center' });
  }

  doc.save(`Itinerary_${quote.uniqueRefNo}.pdf`);
};

// ... keep Receipt/Invoice logic as simple stubs or existing ...
export const generateReceiptPDF = (booking: Booking, payment: PaymentEntry, user: User) => {
    // Placeholder implementation
    console.log("Generating Receipt PDF", booking.id, payment.id);
};

export const generateInvoicePDF = (invoice: GSTRecord, booking: Booking) => {
    // Placeholder implementation
    console.log("Generating Invoice PDF", invoice.id, booking.id);
};

export const generateCreditNotePDF = (creditNote: GSTCreditNote, booking: Booking) => {
    // Placeholder implementation
    console.log("Generating Credit Note PDF", creditNote.id, booking.id);
};
