
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

// --- HELPER: FETCH LOGO AS BASE64 ---
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
        // 1. Replace HTML structure with text equivalents
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<li[^>]*>/gi, '• ')
        .replace(/<\/li>/gi, '\n')
        .replace(/<\/ul>/gi, '\n')
        .replace(/<\/ol>/gi, '\n')
        // 2. Strip remaining tags
        .replace(/<[^>]*>?/gm, '')
        // 3. Decode HTML Entities
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        // 4. Strip Emojis (Standard PDF fonts don't support them and they look like garbage)
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
        .trim();
    
    return clean;
};

// --- HELPER: RESOLVE BRANDING ---
const resolveBranding = (role: UserRole, agentProfile?: User | null): BrandingOptions => {
    if (agentProfile && (role === UserRole.AGENT || role === UserRole.ADMIN || role === UserRole.STAFF)) {
        const ab = agentProfile.agentBranding;
        return {
            companyName: ab?.agencyName || agentProfile.companyName || agentProfile.name,
            address: cleanText(ab?.officeAddress || agentProfile.city || ''), 
            email: agentProfile.email, 
            phone: ab?.contactPhone || agentProfile.phone || "",
            website: ab?.website || "",
            logoUrl: ab?.logoUrl || agentProfile.logoUrl,
            primaryColorHex: ab?.primaryColor || '#0ea5e9'
        };
    }

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

// --- HELPER: MEAL PLAN MAPPER ---
const getMealLabel = (code: string) => {
    const map: Record<string, string> = {
        'RO': 'Room Only',
        'BB': 'Breakfast',
        'HB': 'Breakfast & Dinner',
        'FB': 'Breakfast, Lunch & Dinner',
        'AI': 'All Inclusive'
    };
    return map[code] || code;
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
  
  const logoBase64 = branding.logoUrl ? await getLogoBase64(branding.logoUrl) : null;

  doc.setFont("helvetica", "normal");

  // --- CONFIG ---
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);

  // --- HEADER & FOOTER FUNCTION (Applied to every page) ---
  const drawHeaderFooter = (data: any) => {
      // HEADER
      // Top Color Line
      doc.setDrawColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
      doc.setLineWidth(2);
      doc.line(0, 5, pageWidth, 5); 

      // Logo (Left)
      if (logoBase64) {
          try {
              // Maintain aspect ratio, max height 20
              const props = doc.getImageProperties(logoBase64);
              const aspect = props.width / props.height;
              const height = 20;
              const width = height * aspect;
              doc.addImage(logoBase64, 'PNG', margin, 10, width, height, undefined, 'FAST');
          } catch (e) {
              // Fallback text logo
              doc.setFontSize(16);
              doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
              doc.setFont("helvetica", "bold");
              doc.text(branding.companyName.substring(0, 2).toUpperCase(), margin, 25);
          }
      }

      // Company Info (Left - Adjusted based on logo)
      const textX = logoBase64 ? margin + 45 : margin;
      
      doc.setFontSize(14);
      doc.setTextColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
      doc.setFont("helvetica", "bold");
      doc.text(cleanText(branding.companyName), textX, 16);
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      
      let contactY = 22;
      const contactInfo = [
          branding.phone,
          branding.email,
          branding.website
      ].filter(Boolean).join(' | ');

      doc.text(contactInfo, textX, contactY);
      
      if (branding.address) {
          contactY += 4;
          const addr = cleanText(branding.address).replace(/\n/g, ', '); // Single line address
          // Truncate address if too long to avoid overlapping right side
          const maxAddrWidth = 80;
          const splitAddr = doc.splitTextToSize(addr, maxAddrWidth);
          doc.text(splitAddr[0] + (splitAddr.length > 1 ? '...' : ''), textX, contactY);
      }

      // Title (Right)
      doc.setFontSize(22);
      doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
      doc.setFont("helvetica", "bold");
      doc.text("TRAVEL ITINERARY", pageWidth - margin, 20, { align: 'right' });

      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.setFont("helvetica", "normal");
      doc.text(`Ref: ${cleanText(quote.uniqueRefNo)}`, pageWidth - margin, 28, { align: 'right' });
      doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - margin, 33, { align: 'right' });

      // FOOTER
      const footerY = pageHeight - 15;
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.2);
      doc.line(margin, footerY, pageWidth - margin, footerY);
      
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Generated by ${cleanText(branding.companyName)}`, margin, footerY + 6);
      
      const pageNum = "Page " + data.pageNumber;
      doc.text(pageNum, pageWidth - margin, footerY + 6, { align: 'right' });
  };

  // --- TRIP SUMMARY (First Page Only) ---
  let startY = 45;

  doc.setDrawColor(220, 220, 220);
  doc.setFillColor(252, 252, 252);
  doc.roundedRect(margin, startY, contentWidth, 24, 2, 2, 'FD');

  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  
  // Row 1
  doc.setFont("helvetica", "bold");
  doc.text("Destination:", margin + 5, startY + 8);
  doc.setFont("helvetica", "normal");
  doc.text(cleanText(quote.destination), margin + 30, startY + 8);

  doc.setFont("helvetica", "bold");
  doc.text("Travel Date:", margin + 100, startY + 8);
  doc.setFont("helvetica", "normal");
  doc.text(new Date(quote.travelDate).toLocaleDateString(undefined, { dateStyle: 'long' }), margin + 125, startY + 8);

  // Row 2
  doc.setFont("helvetica", "bold");
  doc.text("Travelers:", margin + 5, startY + 16);
  doc.setFont("helvetica", "normal");
  doc.text(`${quote.paxCount} Pax`, margin + 30, startY + 16);

  if (quote.leadGuestName) {
      doc.setFont("helvetica", "bold");
      doc.text("Guest Name:", margin + 100, startY + 16);
      doc.setFont("helvetica", "normal");
      doc.text(cleanText(quote.leadGuestName), margin + 125, startY + 16);
  }

  startY += 35; // Space after summary

  // --- ITINERARY TABLE ---
  const tableBody: any[] = [];
  
  if (quote.itinerary && quote.itinerary.length > 0) {
    const startDate = new Date(quote.travelDate);
    
    quote.itinerary.forEach(item => {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + (item.day - 1));
      const dateStr = currentDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', weekday: 'short' });

      // 1. Day Header Row
      tableBody.push([{ 
          content: `Day ${item.day}  |  ${dateStr}  |  ${cleanText(item.title)}`, 
          colSpan: 2, 
          styles: { 
              fillColor: [245, 247, 250], 
              textColor: [30, 41, 59],
              fontStyle: 'bold',
              fontSize: 10,
              halign: 'left',
              cellPadding: { top: 4, bottom: 4, left: 3 }
          } 
      }]);
      
      // 2. Description Row
      if(item.description) {
          tableBody.push([{ 
              content: cleanText(item.description), 
              colSpan: 2, 
              styles: { 
                  fontStyle: 'italic', 
                  textColor: [80, 80, 80],
                  fontSize: 9,
                  cellPadding: { top: 2, bottom: 4, left: 3 }
              } 
          }]);
      }

      // 3. Service Rows
      if(item.services && item.services.length > 0) {
          item.services.forEach(svc => {
              // --- TYPE LABEL ---
              let typeLabel = svc.type;
              
              // --- DETAILS BUILDER ---
              let detailsText = "";
              const tags: string[] = [];

              if (svc.type === 'HOTEL') {
                  detailsText += cleanText(svc.name);
                  if (svc.meta?.roomType) tags.push(`Room: ${svc.meta.roomType}`);
                  if (svc.meta?.mealPlan) tags.push(`Meal: ${getMealLabel(svc.meta.mealPlan)}`);
              } 
              else if (svc.type === 'TRANSFER') {
                  detailsText += cleanText(svc.name);
                  if (svc.meta?.vehicle) tags.push(`Vehicle: ${svc.meta.vehicle}`);
                  let tType = "Private";
                  if (svc.meta?.transferMode === 'SIC' || svc.name.toLowerCase().includes('shared')) {
                      tType = "Shared";
                  }
                  tags.push(tType);
              }
              else if (svc.type === 'ACTIVITY') {
                  detailsText += cleanText(svc.name);
                  const mode = svc.meta?.transferMode || 'TICKET_ONLY';
                  if (mode === 'SIC') tags.push("Shared Transfer");
                  else if (mode === 'PVT') tags.push("Private Transfer");
              }
              else {
                  detailsText += cleanText(svc.name);
              }

              if (svc.meta?.description) {
                   detailsText += `\n${cleanText(svc.meta.description)}`;
              }

              if (tags.length > 0) {
                  detailsText += `\n[ ${tags.join(' | ')} ]`;
              }

              tableBody.push([
                  { content: typeLabel, styles: { fontStyle: 'bold', textColor: primaryRGB, fontSize: 8, valign: 'top' } },
                  { content: detailsText, styles: { fontSize: 9, textColor: [50, 50, 50], valign: 'top' } }
              ]);
          });
      } else {
           tableBody.push([{ content: "Free day at leisure.", colSpan: 2, styles: { textColor: [150, 150, 150], fontStyle: 'italic', fontSize: 9 } }]);
      }
    });
  } else {
      tableBody.push([{ content: "No itinerary details available.", colSpan: 2 }]);
  }

  // Draw Table
  autoTable(doc, {
      startY: startY,
      head: [['Service Type', 'Details']],
      body: tableBody,
      theme: 'grid',
      
      headStyles: { 
          fillColor: primaryRGB, 
          textColor: TABLE_HEADER_TEXT, 
          fontStyle: 'bold',
          fontSize: 10,
          halign: 'left'
      },
      
      columnStyles: {
          0: { cellWidth: 30 }, 
          1: { cellWidth: 'auto' }
      },
      
      styles: { 
          font: 'helvetica',
          overflow: 'linebreak',
          cellPadding: 3,
          lineWidth: 0.1,
          lineColor: [230, 230, 230]
      },
      
      margin: { top: 25, right: margin, bottom: 25, left: margin },
      
      // Hooks for Header/Footer and cleanup
      didDrawPage: drawHeaderFooter,
      
      didParseCell: (data) => {
          if (data.row.cells[0].colSpan === 2) {
              data.cell.styles.lineWidth = 0; 
              data.cell.styles.halign = 'left';
          }
      }
  });

  // --- PRICE SECTION ---
  const displayPrice = quote.sellingPrice || quote.price || 0;
  
  if (displayPrice > 0) {
      let finalY = (doc as any).lastAutoTable.finalY + 10;
      
      // Check if price box fits on current page (allow 40px height + 20px footer margin)
      if (finalY + 60 > pageHeight) {
          doc.addPage();
          drawHeaderFooter({ pageNumber: doc.internal.getNumberOfPages() }); // Manually call for new page
          finalY = 40;
      }

      // Draw Price Box
      const boxWidth = 80;
      const boxX = pageWidth - margin - boxWidth;
      
      doc.setFillColor(248, 250, 252); 
      doc.setDrawColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
      doc.setLineWidth(0.5);
      doc.roundedRect(boxX, finalY, boxWidth, 30, 2, 2, 'FD');
      
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Total Package Cost", boxX + 5, finalY + 8);
      
      doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      const currency = quote.currency || 'INR';
      doc.text(`${currency} ${displayPrice.toLocaleString()}`, boxX + 5, finalY + 18);
      
      if (breakdown?.perPersonPrice) {
          doc.setTextColor(100, 100, 100);
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.text(`(~ ${currency} ${breakdown.perPersonPrice.toLocaleString()} per person)`, boxX + 5, finalY + 24);
      }
  }

  doc.save(`Itinerary_${quote.uniqueRefNo}.pdf`);
};

export const generateReceiptPDF = (booking: Booking, payment: PaymentEntry, user: User) => {
    // Placeholder for Receipt generation logic
    console.log("Generating Receipt PDF", booking.id, payment.id);
    alert("Receipt downloaded (Mock).");
};

export const generateInvoicePDF = (invoice: GSTRecord, booking: Booking) => {
    // Placeholder for Invoice generation logic
    console.log("Generating Invoice PDF", invoice.id, booking.id);
    alert("Invoice downloaded (Mock).");
};
