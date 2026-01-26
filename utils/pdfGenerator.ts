
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { Quote, PricingBreakdown, UserRole, User, Booking, PaymentEntry, GSTRecord, GSTCreditNote } from '../types';
import { BRANDING } from '../constants';

// --- STYLING CONSTANTS ---
const DEFAULT_PRIMARY: [number, number, number] = [14, 165, 233]; // Brand 500 (#0ea5e9)
const SECONDARY: [number, number, number] = [30, 41, 59]; // Slate 800
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

// --- HELPER: FETCH LOGO AS BASE64 ---
// This ensures the logo renders correctly across all browsers without security errors
const getLogoBase64 = async (url: string): Promise<string | null> => {
    if (!url) return null;
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn("Could not load logo for PDF", e);
        return null;
    }
};

// --- HELPER: TEXT SANITIZATION ---
const cleanText = (text: string | undefined | null): string => {
    if (!text) return '';
    let clean = text
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<li[^>]*>/gi, '\n• ')
        .replace(/<\/li>/gi, '')
        .replace(/<[^>]*>?/gm, '') // Strip remaining HTML
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
    return clean;
};

// --- HELPER: RESOLVE BRANDING ---
const resolveBranding = (role: UserRole, agentProfile?: User | null): BrandingOptions => {
    // If user is Agent (or Admin viewing as Agent context), use Agent Branding
    if (agentProfile && (role === UserRole.AGENT || role === UserRole.ADMIN || role === UserRole.STAFF)) {
        const ab = agentProfile.agentBranding;
        return {
            companyName: ab?.agencyName || agentProfile.companyName || agentProfile.name,
            address: ab?.officeAddress || agentProfile.city || '', 
            email: agentProfile.email, 
            phone: ab?.contactPhone || agentProfile.phone || "",
            website: ab?.website || "",
            logoUrl: ab?.logoUrl || agentProfile.logoUrl,
            primaryColorHex: ab?.primaryColor || '#0ea5e9'
        };
    }

    // Default Platform Branding
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

// --- MAIN GENERATOR FUNCTION ---
export const generateQuotePDF = async (
  quote: Quote, 
  breakdown: PricingBreakdown | null,
  role: UserRole,
  agentProfile?: User | null
) => {
  const doc = new jsPDF();
  const branding = resolveBranding(role, agentProfile);
  const primaryRGB = hexToRgb(branding.primaryColorHex);
  
  // Load Logo if available
  const logoBase64 = branding.logoUrl ? await getLogoBase64(branding.logoUrl) : null;

  doc.setFont("helvetica", "normal");

  // --- 1. HEADER SECTION ---
  // Top Color Bar
  doc.setFillColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
  doc.rect(0, 0, 210, 6, 'F'); 

  let yPos = 20;

  // Logo (Left)
  if (logoBase64) {
      try {
          doc.addImage(logoBase64, 'PNG', 15, 12, 35, 35, undefined, 'FAST');
      } catch (e) {
          // Fallback if image format fails
          doc.setFontSize(18);
          doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
          doc.text(branding.companyName.charAt(0), 20, 30);
      }
  }

  // Company Details (Left, below logo)
  const leftMargin = 15;
  const contentWidth = 180;
  
  // Align company info slightly right of logo if logo exists
  const infoX = logoBase64 ? 55 : 15;
  
  doc.setFontSize(18);
  doc.setTextColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
  doc.setFont("helvetica", "bold");
  doc.text(cleanText(branding.companyName), infoX, 20);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  
  let contactY = 26;
  if (branding.address) {
      doc.text(cleanText(branding.address), infoX, contactY);
      contactY += 5;
  }
  const contactParts = [];
  if (branding.phone) contactParts.push(branding.phone);
  if (branding.email) contactParts.push(branding.email);
  if (branding.website) contactParts.push(branding.website);
  
  doc.text(contactParts.join(' | '), infoX, contactY);

  // Quote Metadata (Right Side)
  doc.setFontSize(22);
  doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
  doc.setFont("helvetica", "bold");
  doc.text("TRAVEL ITINERARY", 195, 20, { align: 'right' });

  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.setFont("helvetica", "normal");
  doc.text(`Reference: ${cleanText(quote.uniqueRefNo)}`, 195, 28, { align: 'right' });
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 195, 33, { align: 'right' });

  // --- 2. TRIP SUMMARY BOX ---
  yPos = 55;
  
  doc.setDrawColor(220, 220, 220);
  doc.setFillColor(252, 252, 252);
  doc.roundedRect(15, yPos, contentWidth, 25, 2, 2, 'FD');

  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  
  // Row 1
  doc.setFont("helvetica", "bold");
  doc.text("Destination:", 20, yPos + 8);
  doc.setFont("helvetica", "normal");
  doc.text(cleanText(quote.destination), 45, yPos + 8);

  doc.setFont("helvetica", "bold");
  doc.text("Travel Date:", 110, yPos + 8);
  doc.setFont("helvetica", "normal");
  doc.text(new Date(quote.travelDate).toLocaleDateString(undefined, { dateStyle: 'long' }), 135, yPos + 8);

  // Row 2
  doc.setFont("helvetica", "bold");
  doc.text("Travelers:", 20, yPos + 16);
  doc.setFont("helvetica", "normal");
  doc.text(`${quote.paxCount} Pax`, 45, yPos + 16);

  if (quote.leadGuestName) {
      doc.setFont("helvetica", "bold");
      doc.text("Guest Name:", 110, yPos + 16);
      doc.setFont("helvetica", "normal");
      doc.text(cleanText(quote.leadGuestName), 135, yPos + 16);
  }

  yPos = 90;

  // --- 3. ITINERARY TABLE ---
  if (quote.itinerary && quote.itinerary.length > 0) {
    const tableBody: any[] = [];
    const startDate = new Date(quote.travelDate);
    
    quote.itinerary.forEach(item => {
      // Calculate Date
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + (item.day - 1));
      const dateStr = currentDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', weekday: 'short' });

      // 1. Group Header Row (Day X)
      // Spans across all columns
      tableBody.push([{ 
          content: `Day ${item.day}  |  ${dateStr}  |  ${cleanText(item.title)}`, 
          colSpan: 2, 
          styles: { 
              fillColor: [245, 247, 250], // Light Gray
              textColor: [30, 41, 59],    // Slate 800
              fontStyle: 'bold',
              fontSize: 10,
              halign: 'left',
              cellPadding: { top: 3, bottom: 3, left: 2 }
          } 
      }]);
      
      // 2. Day Description Row (Optional)
      if(item.description) {
          tableBody.push([{ 
              content: cleanText(item.description), 
              colSpan: 2, 
              styles: { 
                  fontStyle: 'italic', 
                  textColor: [100, 116, 139], // Slate 500
                  fontSize: 9,
                  cellPadding: { top: 1, bottom: 3, left: 2 }
              } 
          }]);
      }

      // 3. Service Rows
      if(item.services && item.services.length > 0) {
          item.services.forEach(svc => {
              let typeLabel = svc.type;
              
              // Build detailed description text
              let detailsText = cleanText(svc.name);

              const metaParts = [];
              if (svc.meta?.roomType) metaParts.push(`Room: ${svc.meta.roomType}`);
              if (svc.meta?.mealPlan) metaParts.push(`Meal: ${svc.meta.mealPlan}`);
              if (svc.meta?.vehicle) metaParts.push(`Vehicle: ${svc.meta.vehicle}`);
              if (svc.type === 'TRANSFER' && svc.quantity > 1) metaParts.push(`${svc.quantity} Vehicles`);
              
              if (metaParts.length > 0) {
                  detailsText += `\n[ ${metaParts.join(' | ')} ]`;
              }
              
              if (svc.meta?.description) {
                  detailsText += `\n${cleanText(svc.meta.description)}`;
              }

              // Row Data: [Service Type, Details]
              tableBody.push([
                  { content: typeLabel, styles: { fontStyle: 'bold', textColor: primaryRGB, fontSize: 8, valign: 'top' } },
                  { content: detailsText, styles: { fontSize: 9, textColor: [50, 50, 50], valign: 'top' } }
              ]);
          });
      } else {
           // Empty day spacer
           tableBody.push([{ content: "Free day at leisure.", colSpan: 2, styles: { textColor: [150, 150, 150], fontStyle: 'italic', fontSize: 9 } }]);
      }
    });

    autoTable(doc, {
      startY: yPos,
      head: [['Service Type', 'Details']],
      body: tableBody,
      theme: 'grid', // 'grid' | 'striped' | 'plain'
      
      // Header Styling
      headStyles: { 
          fillColor: primaryRGB, 
          textColor: TABLE_HEADER_TEXT, 
          fontStyle: 'bold',
          fontSize: 10,
          halign: 'left'
      },
      
      // Column Sizing (Prevents cutting)
      columnStyles: {
          0: { cellWidth: 35 }, // Type column fixed width
          1: { cellWidth: 'auto' } // Details column expands to fill
      },
      
      // General Styling
      styles: { 
          font: 'helvetica',
          overflow: 'linebreak', // CRITICAL: Wraps text
          cellPadding: 3,
          lineWidth: 0.1,
          lineColor: [230, 230, 230]
      },
      
      // Page Margins (Prevents side cutting)
      margin: { top: 20, right: 15, bottom: 20, left: 15 },
      
      // Clean up borders for the group headers
      didParseCell: (data) => {
          if (data.row.cells[0].colSpan === 2) {
              data.cell.styles.lineWidth = 0; // Remove internal borders for day headers
              data.cell.styles.halign = 'left';
          }
      }
    });
    
    // Update yPos for next element
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // --- 4. PRICE & FOOTER ---
  const displayPrice = quote.sellingPrice || quote.price || 0;
  
  if (displayPrice > 0) {
      // Check for page break
      if (yPos > 240) {
          doc.addPage();
          yPos = 30;
      }

      // Draw Total Box
      doc.setFillColor(248, 250, 252); // Slate 50
      doc.setDrawColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
      doc.setLineWidth(0.5);
      doc.roundedRect(120, yPos, 75, 30, 2, 2, 'FD');
      
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Total Package Cost", 125, yPos + 8);
      
      doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      const currency = quote.currency || 'INR';
      doc.text(`${currency} ${displayPrice.toLocaleString()}`, 125, yPos + 18);
      
      if (breakdown?.perPersonPrice) {
          doc.setTextColor(100, 100, 100);
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.text(`(~ ${currency} ${breakdown.perPersonPrice.toLocaleString()} per person)`, 125, yPos + 24);
      }
  }

  // --- 5. PAGE NUMBERING & FOOTER ---
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Bottom Line
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(15, 280, 195, 280);
    
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated by ${cleanText(branding.companyName)}`, 15, 286);
    doc.text(`Page ${i} of ${pageCount}`, 195, 286, { align: 'right' });
  }

  doc.save(`Itinerary_${quote.uniqueRefNo}.pdf`);
};

// Placeholder functions for other PDF types (unchanged logic)
export const generateReceiptPDF = (booking: Booking, payment: PaymentEntry, user: User) => {
    console.log("Generating Receipt PDF", booking.id, payment.id);
};

export const generateInvoicePDF = (invoice: GSTRecord, booking: Booking) => {
    console.log("Generating Invoice PDF", invoice.id, booking.id);
};

export const generateCreditNotePDF = (creditNote: GSTCreditNote, booking: Booking) => {
    console.log("Generating Credit Note PDF", creditNote.id, booking.id);
};
