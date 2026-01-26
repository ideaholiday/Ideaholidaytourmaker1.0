
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { Quote, PricingBreakdown, UserRole, User, Booking, PaymentEntry, GSTRecord } from '../types';
import { BRANDING } from '../constants';

// --- STYLING CONSTANTS ---
const DEFAULT_PRIMARY: [number, number, number] = [202, 165, 0]; // Gold/Mustard default as per screenshot suggestion, or Agent Color
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
        // 4. Strip Emojis
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
            primaryColorHex: ab?.primaryColor || '#d97706' // Default to a gold/amber if not set
        };
    }

    return {
        companyName: BRANDING.legalName,
        address: BRANDING.address,
        email: BRANDING.email,
        phone: BRANDING.supportPhone,
        website: BRANDING.website,
        primaryColorHex: '#d97706' // Idea Holiday Gold/Amber
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
  const headerHeight = 45;

  // --- HEADER & FOOTER FUNCTION (Applied to every page) ---
  const drawHeaderFooter = (data: any) => {
      // --- HEADER BACKGROUND (Solid Color Banner) ---
      doc.setFillColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
      doc.rect(0, 0, pageWidth, headerHeight, 'F');

      // --- LOGO (Left Side in White Box) ---
      const logoBoxSize = 30;
      const logoMargin = 8;
      
      // White rounded rect for logo background
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, logoMargin, logoBoxSize, logoBoxSize, 2, 2, 'F');

      if (logoBase64) {
          try {
              const props = doc.getImageProperties(logoBase64);
              const aspect = props.width / props.height;
              
              // Fit inside the 30x30 box with padding
              let imgW = logoBoxSize - 4;
              let imgH = imgW / aspect;
              
              if (imgH > logoBoxSize - 4) {
                  imgH = logoBoxSize - 4;
                  imgW = imgH * aspect;
              }
              
              const xOffset = margin + (logoBoxSize - imgW) / 2;
              const yOffset = logoMargin + (logoBoxSize - imgH) / 2;

              doc.addImage(logoBase64, 'PNG', xOffset, yOffset, imgW, imgH, undefined, 'FAST');
          } catch (e) {
              // Fallback text
              doc.setFontSize(14);
              doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
              doc.setFont("helvetica", "bold");
              doc.text(branding.companyName.substring(0, 2).toUpperCase(), margin + 5, logoMargin + 20);
          }
      }

      // --- HEADER TEXT (Right Side) ---
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("times", "normal"); // Using Times for a more 'Screenshot 1' elegant look, or stick to Helvetica
      doc.text("TRAVEL ITINERARY", pageWidth - margin, 20, { align: 'right' });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Ref: ${cleanText(quote.uniqueRefNo)}`, pageWidth - margin, 28, { align: 'right' });
      doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - margin, 33, { align: 'right' });

      // --- COMPANY INFO (Below Header) ---
      // We draw this only if it's the first page OR simply at top of body area if needed.
      // But standard designs often have footer contact or header contact.
      // Screenshot 1 implies specific styling. Let's put Company Name prominently below banner.
      
      if (data.pageNumber === 1) {
          // Drawn in main body flow for Page 1, see below
      }

      // --- FOOTER ---
      const footerY = pageHeight - 15;
      
      // Footer Line
      doc.setDrawColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]); // Footer line matches branding
      doc.setLineWidth(1);
      doc.line(margin, footerY, pageWidth - margin, footerY);
      
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`${cleanText(branding.companyName)} | ${branding.phone}`, margin, footerY + 6);
      
      const pageNum = "Page " + data.pageNumber;
      doc.text(pageNum, pageWidth - margin, footerY + 6, { align: 'right' });
  };

  // --- START DOCUMENT CONTENT ---
  
  // -- AGENCY DETAILS (Page 1 Top) --
  let cursorY = headerHeight + 10;
  
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40); // Dark Slate
  doc.setFont("helvetica", "bold");
  doc.text(cleanText(branding.companyName), margin, cursorY);
  
  cursorY += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  
  // Address wrap
  const addressLines = doc.splitTextToSize(cleanText(branding.address), 100);
  doc.text(addressLines, margin, cursorY);
  cursorY += (addressLines.length * 4) + 2;

  if (branding.email) {
      doc.text(`Email: ${branding.email}`, margin, cursorY);
      cursorY += 4;
  }
  if (branding.phone) {
      doc.text(`Phone: ${branding.phone}`, margin, cursorY);
      cursorY += 4;
  }
  if (branding.website) {
      doc.text(`Web: ${branding.website}`, margin, cursorY);
  }

  // -- TRIP SUMMARY BOX (Right Side of Agency Details) --
  const summaryBoxY = headerHeight + 10;
  const summaryBoxX = pageWidth / 2 + 10;
  const summaryBoxWidth = contentWidth / 2 - 10;
  const summaryBoxHeight = 45;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.1);
  doc.setFillColor(250, 250, 250);
  doc.rect(summaryBoxX, summaryBoxY, summaryBoxWidth, summaryBoxHeight, 'F');
  doc.rect(summaryBoxX, summaryBoxY, summaryBoxWidth, summaryBoxHeight, 'S');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text("Trip Summary", summaryBoxX + 5, summaryBoxY + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);

  let sumTextY = summaryBoxY + 16;
  doc.text(`Destination: ${cleanText(quote.destination)}`, summaryBoxX + 5, sumTextY);
  sumTextY += 6;
  doc.text(`Travel Date: ${new Date(quote.travelDate).toLocaleDateString()}`, summaryBoxX + 5, sumTextY);
  sumTextY += 6;
  doc.text(`Guests: ${quote.paxCount} Pax`, summaryBoxX + 5, sumTextY);
  sumTextY += 6;
  if (quote.leadGuestName) {
      doc.text(`Guest Name: ${cleanText(quote.leadGuestName)}`, summaryBoxX + 5, sumTextY);
  }

  // --- START ITINERARY TABLE ---
  // Ensure we start below the agency details and summary box
  let startY = Math.max(cursorY, summaryBoxY + summaryBoxHeight) + 10;

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
                  
                  // ENHANCED TRANSFER LOGIC (Req 2)
                  const mode = svc.meta?.transferMode || 'PVT';
                  const vehicle = svc.meta?.vehicle || 'Standard';

                  if (mode === 'SIC') {
                      tags.push('Vehicle: Sharing');
                  } else {
                      // PVT or Default
                      tags.push(`Vehicle: Pvt ${vehicle}`);
                  }
              }
              else if (svc.type === 'ACTIVITY') {
                  detailsText += cleanText(svc.name);
                  
                  // ENHANCED ACTIVITY LOGIC (Req 3)
                  // We'll append this to detailsText at the end or push to tags
                  const mode = svc.meta?.transferMode || 'TICKET_ONLY';
                  if (mode === 'TICKET_ONLY') {
                      tags.push("Ticket Only");
                  } else if (mode === 'SIC') {
                      tags.push("Sharing Transfer");
                  } else if (mode === 'PVT') {
                      tags.push("Private Transfer");
                  }
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
      
      margin: { top: headerHeight + 10, right: margin, bottom: 25, left: margin },
      
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
          finalY = headerHeight + 10; // Reset Y below header
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
