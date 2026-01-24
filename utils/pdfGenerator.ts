
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { Quote, PricingBreakdown, UserRole, User, Booking, PaymentEntry, GSTRecord, GSTCreditNote } from '../types';
import { BRANDING } from '../constants';

// --- STYLING CONSTANTS ---
const DEFAULT_PRIMARY = [14, 165, 233]; // Brand 500 (#0ea5e9)
const SECONDARY = [15, 23, 42]; // Slate 900
const TABLE_HEADER_TEXT = [255, 255, 255]; 

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
const resolveBranding = (role: UserRole, agentProfile?: User | null): BrandingOptions => {
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
    // This supports "White Label" behavior for Agents
    if ((role === UserRole.AGENT || role === UserRole.ADMIN || role === UserRole.STAFF) && agentProfile) {
        const ab = agentProfile.agentBranding;
        branding = {
            companyName: ab?.agencyName || agentProfile.companyName || agentProfile.name,
            address: ab?.officeAddress || agentProfile.city || BRANDING.address, 
            email: agentProfile.email, // Use registered email
            phone: ab?.contactPhone || agentProfile.phone || "",
            website: ab?.website || "",
            logoUrl: ab?.logoUrl,
            primaryColorHex: ab?.primaryColor || '#0ea5e9'
        };
    }
    return branding;
};

const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : [DEFAULT_PRIMARY[0], DEFAULT_PRIMARY[1], DEFAULT_PRIMARY[2]];
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
  
  // Font Upgrade: Use standard serif font (Times) as a proxy for elegant typography
  doc.setFont("times", "normal");

  // --- HEADER ---
  // Solid Brand Color Header Background
  doc.setFillColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
  doc.rect(0, 0, 210, 40, 'F'); 

  // Logo Handling
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(15, 10, 25, 25, 2, 2, 'F');
  
  if (branding.logoUrl) {
      try {
          // Attempt to add logo. If format isn't supported or URL fails (CORS), it will throw.
          // Note: In real production, images usually need to be base64 strings or proxied.
          doc.addImage(branding.logoUrl, 'PNG', 16, 11, 23, 23, undefined, 'FAST');
      } catch (e) {
          // Fallback Initials
          doc.setFontSize(20);
          doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
          doc.text(branding.companyName.charAt(0), 27.5, 26, { align: 'center' });
      }
  } else {
      // Initials Fallback
      doc.setFontSize(20);
      doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
      doc.text(branding.companyName.charAt(0), 27.5, 26, { align: 'center' });
  }

  // Company Info (Right Side of Header)
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("TRAVEL ITINERARY", 195, 20, { align: 'right' });
  
  doc.setFontSize(10);
  doc.text(`Ref: ${quote.uniqueRefNo}`, 195, 28, { align: 'right' });
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 195, 33, { align: 'right' });

  // --- AGENCY CONTACT INFO (Under Header) ---
  let yPos = 50;
  doc.setFontSize(16);
  doc.setTextColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]); // Slate Dark
  doc.setFont("times", "bold");
  doc.text(branding.companyName, 15, yPos);
  
  doc.setFontSize(10);
  doc.setFont("times", "normal");
  doc.setTextColor(100, 100, 100);
  yPos += 5;
  if(branding.address) {
      const splitAddr = doc.splitTextToSize(branding.address, 90);
      doc.text(splitAddr, 15, yPos);
      yPos += (splitAddr.length * 5) + 2;
  }
  
  doc.text(`Email: ${branding.email}`, 15, yPos);
  yPos += 5;
  if(branding.phone) doc.text(`Phone: ${branding.phone}`, 15, yPos);
  yPos += 5;
  if(branding.website) doc.text(`Web: ${branding.website}`, 15, yPos);

  // --- TRIP DETAILS (Right Side Box) ---
  yPos = 50; // Reset for right column
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(250, 250, 250);
  doc.rect(120, yPos - 5, 75, 40, 'F');
  doc.rect(120, yPos - 5, 75, 40, 'S');

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont("times", "bold");
  doc.text("Trip Summary", 125, yPos + 2);
  
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  const city = quote.destination || 'Multiple Cities';
  doc.text(`Destination: ${city}`, 125, yPos + 8);
  doc.text(`Travel Date: ${new Date(quote.travelDate).toLocaleDateString()}`, 125, yPos + 14);
  doc.text(`Guests: ${quote.paxCount} Pax`, 125, yPos + 20);
  if(quote.leadGuestName) doc.text(`Guest Name: ${quote.leadGuestName}`, 125, yPos + 26);

  yPos = 100; // Start of Table

  // --- ITINERARY TABLE ---
  if (quote.itinerary && quote.itinerary.length > 0) {
    const tableBody: any[] = [];
    const startDate = new Date(quote.travelDate);
    
    quote.itinerary.forEach(item => {
      // Date Calc
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + (item.day - 1));
      const dateStr = currentDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', weekday: 'short' });

      // Group Row (Day Header)
      tableBody.push([{ 
          content: `Day ${item.day} | ${dateStr} | ${item.title}`, 
          colSpan: 2, 
          styles: { 
              fontStyle: 'bold', 
              fillColor: [240, 240, 240], // Light Grey
              textColor: [50, 50, 50],
              halign: 'left',
              fontSize: 10
          } 
      }]);
      
      // Description
      if(item.description) {
          tableBody.push([{ 
              content: item.description, 
              colSpan: 2, 
              styles: { fontStyle: 'italic', textColor: 80, fontSize: 10 } 
          }]);
      }

      // Services
      if(item.services && item.services.length > 0) {
          item.services.forEach(svc => {
              let typeLabel: string = svc.type;
              
              let details = "";
              // Basic Meta
              if (svc.meta?.roomType) details += `Room: ${svc.meta.roomType}`;
              if (svc.meta?.mealPlan) details += ` (${svc.meta.mealPlan})`;
              if (svc.meta?.vehicle) details += `Vehicle: ${svc.meta.vehicle}`;
              if (svc.meta?.type) details += `Type: ${svc.meta.type}`;
              
              // Rich Description logic if needed
              if (svc.meta?.description) {
                  details += details ? `\n` : '';
                  details += `${svc.meta.description}`;
              }

              tableBody.push([
                  { content: typeLabel, styles: { fontSize: 9, fontStyle: 'bold', textColor: primaryRGB, valign: 'top' } },
                  { content: `${svc.name}\n${details}`, styles: { fontSize: 10, valign: 'top' } }
              ]);
          });
      }
    });

    autoTable(doc, {
      startY: yPos,
      head: [['Type', 'Service Details']],
      body: tableBody,
      theme: 'grid',
      headStyles: { 
          fillColor: primaryRGB, // Use Agent Primary Color
          textColor: TABLE_HEADER_TEXT, 
          fontStyle: 'bold',
          fontSize: 11
      },
      columnStyles: {
          0: { cellWidth: 35 }, // Fixed width for type
          1: { cellWidth: 'auto' } // Flexible width for details
      },
      styles: { 
          font: 'times', // Apply serif font to table
          cellPadding: 6, 
          overflow: 'linebreak', // Essential for wrapping long text
          fontSize: 10
      },
      margin: { top: 15, right: 15, bottom: 15, left: 15 }, 
      didParseCell: (data) => {
          // Clean grouping rows
          if (data.section === 'body' && data.row.cells[0].colSpan === 2) {
             // Let styling handle it
          }
      }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // --- PRICE BOX ---
  // Only show if price exists and is > 0
  const displayPrice = quote.sellingPrice || quote.price || 0;
  
  if (displayPrice > 0) {
      // Check page break
      if (yPos > 240) {
          doc.addPage();
          yPos = 30;
      }

      doc.setFillColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]); // Brand Background
      doc.roundedRect(120, yPos, 75, 30, 2, 2, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.text("Total Package Cost", 125, yPos + 8);
      
      doc.setFontSize(18);
      doc.setFont("times", "bold");
      const currency = quote.currency || 'INR';
      doc.text(`${currency} ${displayPrice.toLocaleString()}`, 125, yPos + 18);
      
      if (breakdown?.perPersonPrice) {
          doc.setFontSize(9);
          doc.setFont("times", "normal");
          doc.text(`(~ ${currency} ${breakdown.perPersonPrice.toLocaleString()} per person)`, 125, yPos + 24);
      }
  }

  // --- FOOTER ---
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Bottom Line with Brand Color
    doc.setDrawColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
    doc.setLineWidth(1);
    doc.line(15, 280, 195, 280);
    
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Prepared by ${branding.companyName}`, 15, 286);
    doc.text(`Page ${i} of ${pageCount}`, 195, 286, { align: 'right' });
  }

  doc.save(`Itinerary_${quote.uniqueRefNo}.pdf`);
};

export const generateReceiptPDF = (booking: Booking, payment: PaymentEntry, user: User) => {
    // Placeholder - would implement similar branding logic
    console.log("Generating Receipt PDF", booking.id, payment.id);
};

export const generateInvoicePDF = (invoice: GSTRecord, booking: Booking) => {
    // Placeholder
    console.log("Generating Invoice PDF", invoice.id, booking.id);
};

export const generateCreditNotePDF = (creditNote: GSTCreditNote, booking: Booking) => {
    // Placeholder
    console.log("Generating Credit Note PDF", creditNote.id, booking.id);
};
