
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { Quote, PricingBreakdown, UserRole, User, Booking, PaymentEntry, GSTRecord, GSTCreditNote } from '../types';
import { BRANDING } from '../constants';

// --- STYLING CONSTANTS ---
const DEFAULT_PRIMARY: [number, number, number] = [14, 165, 233]; // Brand 500 (#0ea5e9)
const SECONDARY: [number, number, number] = [15, 23, 42]; // Slate 900
const TABLE_HEADER_TEXT: [number, number, number] = [255, 255, 255]; 

interface BrandingOptions {
  companyName: string;
  address: string;
  email: string;
  phone: string;
  website: string;
  logoUrl?: string;
  primaryColorHex: string;
}

// --- TEXT SANITIZATION HELPER ---
// jsPDF standard fonts do not support Emojis or advanced Unicode symbols. 
// We strip unsupported characters but MUST preserve formatting (newlines).
const cleanText = (text: string | undefined | null): string => {
    if (!text) return '';
    
    let clean = text;

    // 0. Handle HTML Tags for Rich Text
    // List Items: <li>Item</li> -> "\n• Item"
    clean = clean.replace(/<li[^>]*>/gi, '\n• ');
    clean = clean.replace(/<\/li>/gi, '');
    clean = clean.replace(/<ul[^>]*>/gi, '');
    clean = clean.replace(/<\/ul>/gi, '\n');
    clean = clean.replace(/<ol[^>]*>/gi, '');
    clean = clean.replace(/<\/ol>/gi, '\n');

    // Structural Tags
    clean = clean.replace(/<br\s*\/?>/gi, '\n');
    clean = clean.replace(/<\/p>/gi, '\n\n');
    clean = clean.replace(/<\/div>/gi, '\n');
    clean = clean.replace(/<h[1-6][^>]*>/gi, '\n\n');
    clean = clean.replace(/<\/h[1-6]>/gi, '\n');

    // Strip remaining tags
    clean = clean.replace(/<[^>]*>?/gm, '');

    // 1. Replace common symbols with ASCII approximations
    clean = clean.replace(/→/g, '->')
                 .replace(/←/g, '<-')
                 .replace(/↔/g, '<->')
                 .replace(/•/g, '-')
                 .replace(/—/g, '-')
                 .replace(/–/g, '-')
                 .replace(/…/g, '...')
                 .replace(/“/g, '"')
                 .replace(/”/g, '"')
                 .replace(/‘/g, "'")
                 .replace(/’/g, "'");

    // 2. Remove Emojis and Pictographs (Ranges for common emojis)
    // This prevents the 'ð' and other mojibake characters in the PDF
    const emojiRegex = /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g;
    clean = clean.replace(emojiRegex, '');

    // 3. Normalize spacing BUT PRESERVE NEWLINES
    // Replace multiple horizontal spaces (not newlines) with single space
    clean = clean.replace(/[ \t\u00A0]+/g, ' ');
    
    // Trim excessive newlines (more than 2)
    clean = clean.replace(/\n{3,}/g, '\n\n');

    // 4. Decode HTML Entities (Basic)
    clean = clean.replace(/&nbsp;/g, ' ')
                 .replace(/&amp;/g, '&')
                 .replace(/&lt;/g, '<')
                 .replace(/&gt;/g, '>');

    return clean.trim();
};

// Helper: Resolve Branding
const resolveBranding = (role: UserRole, agentProfile?: User | null): BrandingOptions => {
    // 1. If Agent Profile is provided (Public View or Agent Context), use STRICTLY Agent Branding
    if (agentProfile && (role === UserRole.AGENT || role === UserRole.ADMIN || role === UserRole.STAFF)) {
        const ab = agentProfile.agentBranding;
        return {
            companyName: ab?.agencyName || agentProfile.companyName || agentProfile.name,
            address: ab?.officeAddress || agentProfile.city || '', 
            email: agentProfile.email, // Use registered email
            phone: ab?.contactPhone || agentProfile.phone || "",
            website: ab?.website || "",
            logoUrl: ab?.logoUrl || agentProfile.logoUrl,
            primaryColorHex: ab?.primaryColor || '#0ea5e9'
        };
    }

    // 2. Default Platform Branding (Only if no agent is involved/visible)
    return {
        companyName: BRANDING.legalName,
        address: BRANDING.address,
        email: BRANDING.email,
        phone: BRANDING.supportPhone,
        website: BRANDING.website,
        primaryColorHex: '#0ea5e9'
    };
};

const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : DEFAULT_PRIMARY;
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
  doc.text(`Ref: ${cleanText(quote.uniqueRefNo)}`, 195, 28, { align: 'right' });
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 195, 33, { align: 'right' });

  // --- AGENCY CONTACT INFO (Under Header) ---
  let yPos = 50;
  doc.setFontSize(16);
  doc.setTextColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]); // Slate Dark
  doc.setFont("times", "bold");
  doc.text(cleanText(branding.companyName), 15, yPos);
  
  doc.setFontSize(10);
  doc.setFont("times", "normal");
  doc.setTextColor(100, 100, 100);
  yPos += 5;
  if(branding.address) {
      const cleanAddress = cleanText(branding.address);
      const splitAddr = doc.splitTextToSize(cleanAddress, 90);
      doc.text(splitAddr, 15, yPos);
      yPos += (splitAddr.length * 5) + 2;
  }
  
  doc.text(`Email: ${cleanText(branding.email)}`, 15, yPos);
  yPos += 5;
  if(branding.phone) doc.text(`Phone: ${cleanText(branding.phone)}`, 15, yPos);
  yPos += 5;
  if(branding.website) doc.text(`Web: ${cleanText(branding.website)}`, 15, yPos);

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
  const city = cleanText(quote.destination || 'Multiple Cities');
  doc.text(`Destination: ${city}`, 125, yPos + 8);
  doc.text(`Travel Date: ${new Date(quote.travelDate).toLocaleDateString()}`, 125, yPos + 14);
  doc.text(`Guests: ${quote.paxCount} Pax`, 125, yPos + 20);
  if(quote.leadGuestName) doc.text(`Guest Name: ${cleanText(quote.leadGuestName)}`, 125, yPos + 26);

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
      const dayTitleClean = cleanText(item.title);
      
      tableBody.push([{ 
          content: `Day ${item.day} | ${dateStr} | ${dayTitleClean}`, 
          colSpan: 2, 
          styles: { 
              fontStyle: 'bold', 
              fillColor: [240, 240, 240], // Light Grey
              textColor: [50, 50, 50],
              halign: 'left',
              fontSize: 10
          } 
      }]);
      
      // Day Description
      if(item.description) {
          tableBody.push([{ 
              content: cleanText(item.description), 
              colSpan: 2, 
              styles: { fontStyle: 'italic', textColor: 80, fontSize: 10 } 
          }]);
      }

      // Services
      if(item.services && item.services.length > 0) {
          item.services.forEach(svc => {
              let typeLabel: string = svc.type;
              
              let detailsParts: string[] = [];

              // 1. Core Meta (Room/Meal/Vehicle)
              if (svc.meta?.roomType) detailsParts.push(`Room: ${svc.meta.roomType}`);
              if (svc.meta?.mealPlan) detailsParts.push(`Meal: ${svc.meta.mealPlan}`);
              if (svc.meta?.vehicle) detailsParts.push(`Vehicle: ${svc.meta.vehicle}`);
              if (svc.meta?.type && svc.type === 'ACTIVITY') detailsParts.push(`Type: ${svc.meta.type}`);
              
              // 2. Quantity Logic for Transfers
              if (svc.type === 'TRANSFER' && svc.quantity > 1) {
                  detailsParts.push(`${svc.quantity} Vehicles`);
              }
              
              // 3. Pax Details (New)
              if (svc.meta?.paxDetails) {
                  const { adult, child } = svc.meta.paxDetails;
                  let paxStr = `Pax: ${adult} Adt` + (child > 0 ? `, ${child} Chd` : '');
                  detailsParts.push(paxStr);
              }

              // 4. Transfer Mode for Activities
              if (svc.meta?.transferMode) {
                  const mapMode: Record<string, string> = {
                      'TICKET_ONLY': 'Ticket Only',
                      'SIC': 'Sharing Transfer',
                      'PVT': 'Private Transfer'
                  };
                  const label = mapMode[svc.meta.transferMode] || svc.meta.transferMode;
                  detailsParts.push(label);
              }

              // Sanitize Name
              const sanitizedName = cleanText(svc.name);
              
              // Construct Body
              let finalContent = sanitizedName;
              
              // Add Meta Line if exists
              if (detailsParts.length > 0) {
                  finalContent += `\n[ ${detailsParts.join(' | ')} ]`;
              }
              
              // Add Description (Preserving Newlines)
              if (svc.meta?.description) {
                  const desc = cleanText(svc.meta.description);
                  if (desc) finalContent += `\n\n${desc}`;
              }

              // Add Notes
              if (svc.meta?.notes) {
                  const note = cleanText(svc.meta.notes);
                  if (note) finalContent += `\n\nNote: ${note}`;
              }

              tableBody.push([
                  { content: typeLabel, styles: { fontSize: 9, fontStyle: 'bold', textColor: primaryRGB, valign: 'top' } },
                  { content: finalContent, styles: { fontSize: 10, valign: 'top', cellPadding: 4 } }
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
          fontSize: 10,
          valign: 'top'
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
    // Use the Branding Company Name instead of platform hardcode
    doc.text(`Prepared by ${cleanText(branding.companyName)}`, 15, 286);
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
