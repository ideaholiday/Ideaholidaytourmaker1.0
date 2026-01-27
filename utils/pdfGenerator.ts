
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { Quote, PricingBreakdown, UserRole, User, Booking, PaymentEntry, GSTRecord } from '../types';
import { BRANDING } from '../constants';

// --- STYLING CONSTANTS ---
const DEFAULT_PRIMARY: [number, number, number] = [202, 165, 0]; // Gold/Mustard default
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
            primaryColorHex: ab?.primaryColor || '#d97706' 
        };
    }

    return {
        companyName: BRANDING.legalName,
        address: BRANDING.address,
        email: BRANDING.email,
        phone: BRANDING.supportPhone,
        website: BRANDING.website,
        primaryColorHex: '#d97706' 
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

  // Use Times New Roman for a premium, editorial feel
  doc.setFont("times", "normal");

  // --- CONFIG ---
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  const headerHeight = 45;

  // --- HEADER & FOOTER FUNCTION ---
  const drawHeaderFooter = (data: any) => {
      // --- HEADER BACKGROUND ---
      doc.setFillColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
      doc.rect(0, 0, pageWidth, headerHeight, 'F');

      // --- LOGO ---
      const logoBoxSize = 30;
      const logoMargin = 8;
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, logoMargin, logoBoxSize, logoBoxSize, 2, 2, 'F');

      if (logoBase64) {
          try {
              const props = doc.getImageProperties(logoBase64);
              const aspect = props.width / props.height;
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
              // Fallback
          }
      }

      // --- HEADER TEXT ---
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont("times", "bold"); 
      doc.text("ITINERARY", pageWidth - margin, 22, { align: 'right' });

      doc.setFont("times", "normal");
      doc.setFontSize(10);
      doc.text(`Reference: ${cleanText(quote.uniqueRefNo)}`, pageWidth - margin, 30, { align: 'right' });
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - margin, 35, { align: 'right' });

      // --- FOOTER ---
      const footerY = pageHeight - 15;
      doc.setDrawColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]); 
      doc.setLineWidth(0.5);
      doc.line(margin, footerY, pageWidth - margin, footerY);
      
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.setFont("times", "italic");
      doc.text(`${cleanText(branding.companyName)}  |  ${branding.phone}`, margin, footerY + 6);
      
      doc.setFont("times", "normal");
      doc.setFontSize(8);
      const pageNum = "Page " + data.pageNumber;
      doc.text(pageNum, pageWidth - margin, footerY + 6, { align: 'right' });
  };

  // --- START DOCUMENT CONTENT ---
  let cursorY = headerHeight + 12;
  
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40); 
  doc.setFont("times", "bold");
  doc.text(cleanText(branding.companyName), margin, cursorY);
  
  cursorY += 6;
  doc.setFontSize(10);
  doc.setFont("times", "normal");
  doc.setTextColor(80, 80, 80);
  
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

  // -- TRIP SUMMARY BOX --
  const summaryBoxY = headerHeight + 12;
  const summaryBoxX = pageWidth / 2 + 10;
  const summaryBoxWidth = contentWidth / 2 - 10;
  const summaryBoxHeight = 45;

  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.1);
  doc.setFillColor(252, 252, 252);
  doc.roundedRect(summaryBoxX, summaryBoxY, summaryBoxWidth, summaryBoxHeight, 2, 2, 'FD');

  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("Trip Overview", summaryBoxX + 5, summaryBoxY + 8);

  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);

  let sumTextY = summaryBoxY + 16;
  doc.text(`Destination: ${cleanText(quote.destination)}`, summaryBoxX + 5, sumTextY);
  sumTextY += 6;
  doc.text(`Travel Date: ${new Date(quote.travelDate).toLocaleDateString()}`, summaryBoxX + 5, sumTextY);
  sumTextY += 6;
  doc.text(`Guests: ${quote.paxCount} Pax`, summaryBoxX + 5, sumTextY);
  sumTextY += 6;
  if (quote.leadGuestName) {
      doc.text(`Guest: ${cleanText(quote.leadGuestName)}`, summaryBoxX + 5, sumTextY);
  }

  // --- START ITINERARY TABLE ---
  let startY = Math.max(cursorY, summaryBoxY + summaryBoxHeight) + 15;

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
              fillColor: [240, 242, 245], 
              textColor: [30, 41, 59],
              fontStyle: 'bold',
              font: 'times',
              fontSize: 11,
              halign: 'left',
              cellPadding: { top: 6, bottom: 6, left: 5 }
          } 
      }]);
      
      // 2. Description Row
      if(item.description) {
          tableBody.push([{ 
              content: cleanText(item.description), 
              colSpan: 2, 
              styles: { 
                  fontStyle: 'italic', 
                  textColor: [70, 70, 70],
                  fontSize: 10,
                  cellPadding: { top: 4, bottom: 8, left: 5 }
              } 
          }]);
      }

      // 3. Service Rows
      if(item.services && item.services.length > 0) {
          item.services.forEach(svc => {
              let typeLabel = svc.type;
              
              let detailsText = "";
              const tags: string[] = [];
              const specialLines: string[] = []; 

              if (svc.type === 'HOTEL') {
                  detailsText += cleanText(svc.name);
                  if (svc.meta?.roomType) tags.push(`Room: ${svc.meta.roomType}`);
                  if (svc.meta?.mealPlan) tags.push(`Meal: ${getMealLabel(svc.meta.mealPlan)}`);
              } 
              else if (svc.type === 'TRANSFER') {
                  detailsText += cleanText(svc.name);
                  
                  const mode = svc.meta?.transferMode || 'PVT';
                  const vehicle = svc.meta?.vehicle || 'Standard';

                  // Show Vehicle in details
                  if (vehicle) detailsText += `\nVehicle: ${vehicle}`;

                  if (mode === 'SIC') {
                      specialLines.push("[ \u2714 Shared Transfer ]");
                  } else {
                      // CLEAN TAG AS REQUESTED
                      specialLines.push(`[ \u2714 Private Transfer ]`);
                  }
              }
              else if (svc.type === 'ACTIVITY') {
                  detailsText += cleanText(svc.name);
                  
                  const mode = svc.meta?.transferMode || 'TICKET_ONLY';
                  if (mode === 'TICKET_ONLY') {
                      specialLines.push("[ \u2714 Ticket Only ]");
                  } else if (mode === 'SIC') {
                      specialLines.push("[ \u2714 Shared Transfer ]");
                  } else if (mode === 'PVT') {
                      specialLines.push("[ \u2714 Private Transfer ]");
                  }
              }
              else {
                  detailsText += cleanText(svc.name);
              }

              if (svc.meta?.description) {
                   detailsText += `\n${cleanText(svc.meta.description)}`;
              }

              if (tags.length > 0) {
                  detailsText += `\n${tags.join(' | ')}`;
              }
              
              // Append special highlighted lines at the end
              if (specialLines.length > 0) {
                  detailsText += `\n\n${specialLines.join('\n')}`;
              }

              tableBody.push([
                  { content: typeLabel, styles: { fontStyle: 'bold', textColor: primaryRGB, fontSize: 9, valign: 'top' } },
                  { content: detailsText, styles: { fontSize: 10, textColor: [50, 50, 50], valign: 'top', cellPadding: { top: 4, bottom: 6 } } }
              ]);
          });
      } else {
           tableBody.push([{ content: "Free day at leisure.", colSpan: 2, styles: { textColor: [150, 150, 150], fontStyle: 'italic', fontSize: 10 } }]);
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
          font: 'times',
          fontSize: 11,
          halign: 'left',
          cellPadding: 6
      },
      
      columnStyles: {
          0: { cellWidth: 35 }, 
          1: { cellWidth: 'auto' }
      },
      
      styles: { 
          font: 'times',
          overflow: 'linebreak',
          cellPadding: 4,
          lineWidth: 0.1,
          lineColor: [230, 230, 230]
      },
      
      margin: { top: headerHeight + 15, right: margin, bottom: 25, left: margin },
      
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
      // Safe access to finalY
      const lastAutoTable = (doc as any).lastAutoTable;
      let finalY = lastAutoTable ? lastAutoTable.finalY + 15 : startY + 50;
      
      if (finalY + 60 > pageHeight) {
          doc.addPage();
          drawHeaderFooter({ pageNumber: doc.internal.getNumberOfPages() }); 
          finalY = headerHeight + 15; 
      }

      const boxWidth = 90;
      const boxX = pageWidth - margin - boxWidth;
      
      doc.setFillColor(250, 250, 252); 
      doc.setDrawColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
      doc.setLineWidth(0.5);
      doc.roundedRect(boxX, finalY, boxWidth, 35, 3, 3, 'FD');
      
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(11);
      doc.setFont("times", "normal");
      doc.text("Total Package Cost", boxX + 6, finalY + 10);
      
      doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
      doc.setFontSize(18);
      doc.setFont("times", "bold");
      const currency = quote.currency || 'INR';
      doc.text(`${currency} ${displayPrice.toLocaleString()}`, boxX + 6, finalY + 22);
      
      if (breakdown?.perPersonPrice) {
          doc.setTextColor(120, 120, 120);
          doc.setFontSize(9);
          doc.setFont("times", "italic");
          doc.text(`(Approx. ${currency} ${breakdown.perPersonPrice.toLocaleString()} per person)`, boxX + 6, finalY + 29);
      }
  }

  doc.save(`Itinerary_${quote.uniqueRefNo}.pdf`);
};

export const generateReceiptPDF = (booking: Booking, payment: PaymentEntry, user: User) => {
    console.log("Generating Receipt PDF", booking.id, payment.id);
    alert("Receipt downloaded (Mock).");
};

export const generateInvoicePDF = (invoice: GSTRecord, booking: Booking) => {
    console.log("Generating Invoice PDF", invoice.id, booking.id);
    alert("Invoice downloaded (Mock).");
};
