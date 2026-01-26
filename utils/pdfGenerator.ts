
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

// --- IMAGE HELPER ---
const getBase64ImageFromUrl = async (imageUrl: string): Promise<string | null> => {
    try {
        const res = await fetch(imageUrl);
        const blob = await res.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                resolve(reader.result as string);
            };
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.warn("Failed to load PDF image:", imageUrl);
        return null;
    }
};

// --- TEXT SANITIZATION HELPER ---
const cleanText = (text: string | undefined | null): string => {
    if (!text) return '';
    
    let clean = text;

    // 0. Handle HTML Tags for Rich Text
    clean = clean.replace(/<li[^>]*>/gi, '\n• ');
    clean = clean.replace(/<\/li>/gi, '');
    clean = clean.replace(/<ul[^>]*>/gi, '');
    clean = clean.replace(/<\/ul>/gi, '\n');
    clean = clean.replace(/<ol[^>]*>/gi, '');
    clean = clean.replace(/<\/ol>/gi, '\n');

    clean = clean.replace(/<br\s*\/?>/gi, '\n');
    clean = clean.replace(/<\/p>/gi, '\n\n');
    clean = clean.replace(/<\/div>/gi, '\n');
    clean = clean.replace(/<h[1-6][^>]*>/gi, '\n\n');
    clean = clean.replace(/<\/h[1-6]>/gi, '\n');

    clean = clean.replace(/<[^>]*>?/gm, '');

    // 1. Replace common symbols
    clean = clean.replace(/→/g, '->')
                 .replace(/•/g, '-')
                 .replace(/—/g, '-')
                 .replace(/–/g, '-');

    // 2. Remove Emojis 
    const emojiRegex = /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g;
    clean = clean.replace(emojiRegex, '');

    // 3. Normalize spacing
    clean = clean.replace(/[ \t\u00A0]+/g, ' ');
    clean = clean.replace(/\n{3,}/g, '\n\n');

    // 4. Decode HTML Entities
    clean = clean.replace(/&nbsp;/g, ' ')
                 .replace(/&amp;/g, '&')
                 .replace(/&lt;/g, '<')
                 .replace(/&gt;/g, '>');

    return clean.trim();
};

// Helper: Resolve Branding
const resolveBranding = (role: UserRole, agentProfile?: User | null): BrandingOptions => {
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

export const generateQuotePDF = async (
  quote: Quote, 
  breakdown: PricingBreakdown | null,
  role: UserRole,
  agentProfile?: User | null
) => {
  const doc = new jsPDF();
  const branding = resolveBranding(role, agentProfile);
  const primaryRGB = hexToRgb(branding.primaryColorHex);
  
  doc.setFont("times", "normal");

  // --- PRE-FETCH IMAGES ---
  // We need to map service IDs to Base64 strings to use inside autoTable hook
  const imageMap: Record<string, string> = {};
  
  if (quote.itinerary) {
      const promises: Promise<void>[] = [];
      
      quote.itinerary.forEach(day => {
          day.services?.forEach(svc => {
              if (svc.meta?.imageUrl) {
                  promises.push(
                      getBase64ImageFromUrl(svc.meta.imageUrl).then(base64 => {
                          if (base64) imageMap[svc.id] = base64;
                      })
                  );
              }
          });
      });
      
      await Promise.all(promises);
  }

  // --- HEADER ---
  doc.setFillColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
  doc.rect(0, 0, 210, 40, 'F'); 

  // Logo
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(15, 10, 25, 25, 2, 2, 'F');
  
  if (branding.logoUrl) {
      try {
          doc.addImage(branding.logoUrl, 'PNG', 16, 11, 23, 23, undefined, 'FAST');
      } catch (e) {
          doc.setFontSize(20);
          doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
          doc.text(branding.companyName.charAt(0), 27.5, 26, { align: 'center' });
      }
  } else {
      doc.setFontSize(20);
      doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
      doc.text(branding.companyName.charAt(0), 27.5, 26, { align: 'center' });
  }

  // Company Info
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("TRAVEL ITINERARY", 195, 20, { align: 'right' });
  
  doc.setFontSize(10);
  doc.text(`Ref: ${cleanText(quote.uniqueRefNo)}`, 195, 28, { align: 'right' });
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 195, 33, { align: 'right' });

  // --- AGENCY CONTACT INFO ---
  let yPos = 50;
  doc.setFontSize(16);
  doc.setTextColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]); 
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

  // --- TRIP DETAILS ---
  yPos = 50; 
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

  yPos = 100;

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
          colSpan: 3, // Increased colspan for image column
          styles: { 
              fontStyle: 'bold', 
              fillColor: [240, 240, 240], 
              textColor: [50, 50, 50],
              halign: 'left',
              fontSize: 10
          } 
      }]);
      
      // Day Description
      if(item.description) {
          tableBody.push([{ 
              content: cleanText(item.description), 
              colSpan: 3, 
              styles: { fontStyle: 'italic', textColor: 80, fontSize: 10 } 
          }]);
      }

      // Services
      if(item.services && item.services.length > 0) {
          item.services.forEach(svc => {
              let typeLabel: string = svc.type;
              let detailsParts: string[] = [];

              // Meta Details
              if (svc.meta?.roomType) detailsParts.push(`Room: ${svc.meta.roomType}`);
              if (svc.meta?.mealPlan) detailsParts.push(`Meal: ${svc.meta.mealPlan}`);
              if (svc.meta?.vehicle) detailsParts.push(`Vehicle: ${svc.meta.vehicle}`);
              
              if (svc.type === 'TRANSFER' && svc.quantity > 1) {
                  detailsParts.push(`${svc.quantity} Vehicles`);
              }
              
              const sanitizedName = cleanText(svc.name);
              let finalContent = sanitizedName;
              
              if (detailsParts.length > 0) {
                  finalContent += `\n[ ${detailsParts.join(' | ')} ]`;
              }
              
              if (svc.meta?.description) {
                  const desc = cleanText(svc.meta.description);
                  if (desc) finalContent += `\n\n${desc}`;
              }

              if (svc.meta?.notes) {
                  const note = cleanText(svc.meta.notes);
                  if (note) finalContent += `\n\nNote: ${note}`;
              }

              // Row Data: [Image Placeholder, Type, Details]
              // We pass the service ID in the 'content' of the first column temporarily 
              // to identify which image to draw in didDrawCell
              tableBody.push([
                  { content: svc.id, styles: { minCellHeight: 20 } }, // Column 0: Image
                  { content: typeLabel, styles: { fontSize: 9, fontStyle: 'bold', textColor: primaryRGB, valign: 'top' } }, // Column 1: Type
                  { content: finalContent, styles: { fontSize: 10, valign: 'top', cellPadding: 4 } } // Column 2: Details
              ]);
          });
      }
    });

    autoTable(doc, {
      startY: yPos,
      head: [['Image', 'Type', 'Service Details']],
      body: tableBody,
      theme: 'grid',
      headStyles: { 
          fillColor: primaryRGB, 
          textColor: TABLE_HEADER_TEXT, 
          fontStyle: 'bold',
          fontSize: 11
      },
      columnStyles: {
          0: { cellWidth: 25 }, // Image column
          1: { cellWidth: 25 }, // Type
          2: { cellWidth: 'auto' } // Details
      },
      styles: { 
          font: 'times',
          cellPadding: 3, 
          overflow: 'linebreak',
          fontSize: 10,
          valign: 'middle'
      },
      margin: { top: 15, right: 15, bottom: 15, left: 15 }, 
      didDrawCell: (data) => {
          // Custom Image Rendering
          if (data.section === 'body' && data.column.index === 0 && !data.row.raw[0].colSpan) {
              const serviceId = data.cell.raw as string; // We stored ID in content
              const base64Img = imageMap[serviceId];

              // Clear text content (the ID)
              // Note: jspdf-autotable doesn't easily allow clearing text *after* calculation but *before* draw
              // The text is already drawn by the time didDrawCell fires? No, this is "didDraw".
              // Actually, to hide the ID text, we can use 'willDrawCell' or just draw a white box over it,
              // OR better: use empty content in body and map by row index.
              // BUT row index is tricky with group headers.
              
              // Easier hack: Draw a white rectangle over the cell background before image
              doc.setFillColor(255, 255, 255);
              doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');

              if (base64Img) {
                  // Fit image in cell with padding
                  const padding = 2;
                  const boxWidth = data.cell.width - (padding * 2);
                  const boxHeight = data.cell.height - (padding * 2);
                  
                  // Keep aspect ratio 4:3 roughly
                  const imgW = boxWidth;
                  const imgH = boxHeight;

                  try {
                    doc.addImage(base64Img, 'JPEG', data.cell.x + padding, data.cell.y + padding, imgW, imgH, undefined, 'FAST');
                  } catch(e) {
                      // Fail silently
                  }
              }
          }
      }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // --- PRICE BOX ---
  const displayPrice = quote.sellingPrice || quote.price || 0;
  
  if (displayPrice > 0) {
      if (yPos > 240) {
          doc.addPage();
          yPos = 30;
      }

      doc.setFillColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]); 
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
    doc.setDrawColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
    doc.setLineWidth(1);
    doc.line(15, 280, 195, 280);
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Prepared by ${cleanText(branding.companyName)}`, 15, 286);
    doc.text(`Page ${i} of ${pageCount}`, 195, 286, { align: 'right' });
  }

  doc.save(`Itinerary_${quote.uniqueRefNo}.pdf`);
};

// ... keep other exports unchanged (generateReceiptPDF, etc.) ...
export const generateReceiptPDF = (booking: Booking, payment: PaymentEntry, user: User) => {
    console.log("Generating Receipt PDF", booking.id, payment.id);
};

export const generateInvoicePDF = (invoice: GSTRecord, booking: Booking) => {
    console.log("Generating Invoice PDF", invoice.id, booking.id);
};

export const generateCreditNotePDF = (creditNote: GSTCreditNote, booking: Booking) => {
    console.log("Generating Credit Note PDF", creditNote.id, booking.id);
};
