
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { Quote, PricingBreakdown, UserRole, User, Booking, PaymentEntry, GSTRecord, GSTCreditNote, FixedPackage } from '../types';
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
const cleanText = (text: string | undefined | null): string => {
    if (!text) return '';
    
    let clean = text;

    // 1. Convert block tags to newlines for formatting
    clean = clean.replace(/<\/p>/gi, '\n')
                 .replace(/<br\s*\/?>/gi, '\n')
                 .replace(/<\/div>/gi, '\n')
                 .replace(/<\/li>/gi, '\n')
                 .replace(/<li>/gi, '• ');

    // 2. Strip HTML Tags
    clean = clean.replace(/<[^>]*>/g, '');

    // 3. Decode common HTML entities
    clean = clean.replace(/&nbsp;/g, ' ')
                 .replace(/&amp;/g, '&')
                 .replace(/&lt;/g, '<')
                 .replace(/&gt;/g, '>')
                 .replace(/&quot;/g, '"')
                 .replace(/&#39;/g, "'");

    // 4. Cleanup Whitespace
    clean = clean.replace(/\n\s*\n/g, '\n'); // Remove multiple empty lines
    clean = clean.trim();

    return clean;
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

// --- QUOTE PDF GENERATOR ---
export const generateQuotePDF = (
  quote: Quote, 
  breakdown: PricingBreakdown | null,
  role: UserRole,
  agentProfile?: User | null
) => {
  const doc = new jsPDF();
  const branding = resolveBranding(role, agentProfile);
  const primaryRGB = hexToRgb(branding.primaryColorHex);
  
  doc.setFont("times", "normal");

  // --- HEADER ---
  doc.setFillColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
  doc.rect(0, 0, 210, 40, 'F'); 

  // Logo Handling
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

  // --- TRIP DETAILS BOX ---
  yPos = 50; 
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(250, 250, 250);
  // Increase height to accommodate more details
  const boxHeight = 55;
  doc.rect(120, yPos - 5, 75, boxHeight, 'F');
  doc.rect(120, yPos - 5, 75, boxHeight, 'S');

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
  
  // Calculate Duration
  const durationNights = quote.itinerary.length > 1 ? quote.itinerary.length - 1 : 1;
  doc.text(`Duration: ${durationNights} Nights / ${durationNights + 1} Days`, 125, yPos + 26);

  // Find Hotels
  const hotels = new Set<string>();
  quote.itinerary.forEach(day => {
      day.services?.forEach(svc => {
          if (svc.type === 'HOTEL') hotels.add(svc.name);
      });
  });
  const hotelStr = hotels.size > 0 ? Array.from(hotels).join(', ') : 'NA';
  
  // Hotel Display (Wrapped)
  const splitHotel = doc.splitTextToSize(`Hotel: ${hotelStr}`, 65);
  doc.text(splitHotel, 125, yPos + 32);

  if(quote.leadGuestName) doc.text(`Guest Name: ${cleanText(quote.leadGuestName)}`, 125, yPos + 32 + (splitHotel.length * 5));

  yPos = 115; 

  // --- ITINERARY TABLE ---
  if (quote.itinerary && quote.itinerary.length > 0) {
    const tableBody: any[] = [];
    const startDate = new Date(quote.travelDate);
    
    quote.itinerary.forEach(item => {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + (item.day - 1));
      const dateStr = currentDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', weekday: 'short' });

      // Group Row
      tableBody.push([{ 
          content: `Day ${item.day} | ${dateStr} | ${cleanText(item.title)}`, 
          colSpan: 2, 
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
              colSpan: 2, 
              styles: { fontStyle: 'italic', textColor: 80, fontSize: 10 } 
          }]);
      }

      // Services
      if(item.services && item.services.length > 0) {
          item.services.forEach(svc => {
              let typeLabel = svc.type;
              let detailsParts: string[] = [];

              if (svc.meta?.roomType) detailsParts.push(`Room: ${svc.meta.roomType}`);
              if (svc.meta?.mealPlan) detailsParts.push(`Meal: ${svc.meta.mealPlan}`);
              
              const sanitizedName = cleanText(svc.name);
              let finalContent = sanitizedName;
              
              if (detailsParts.length > 0) {
                  finalContent += `\n[ ${detailsParts.join(' | ')} ]`;
              }
              
              if (svc.meta?.description) {
                  const desc = cleanText(svc.meta.description);
                  if (desc) finalContent += `\n\n${desc}`;
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
          fillColor: primaryRGB,
          textColor: TABLE_HEADER_TEXT, 
          fontStyle: 'bold',
          fontSize: 11
      },
      columnStyles: {
          0: { cellWidth: 35 }, 
          1: { cellWidth: 'auto' }
      },
      styles: { 
          font: 'times',
          cellPadding: 6, 
          overflow: 'linebreak',
          fontSize: 10,
          valign: 'top'
      },
      margin: { top: 15, right: 15, bottom: 15, left: 15 }, 
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
  }

  // --- FOOTER ---
  addFooter(doc, branding, primaryRGB);

  doc.save(`Itinerary_${quote.uniqueRefNo}.pdf`);
};

// --- FIXED PACKAGE PDF GENERATOR ---
export const generateFixedPackagePDF = (
    pkg: FixedPackage,
    role: UserRole,
    agentProfile?: User | null
) => {
    const doc = new jsPDF();
    const branding = resolveBranding(role, agentProfile);
    const primaryRGB = hexToRgb(branding.primaryColorHex);
    doc.setFont("times", "normal");

    // 1. Header Banner
    doc.setFillColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
    doc.rect(0, 0, 210, 50, 'F');

    // Logo
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(15, 15, 30, 30, 2, 2, 'F');
    if (branding.logoUrl) {
        try {
            doc.addImage(branding.logoUrl, 'PNG', 16, 16, 28, 28, undefined, 'FAST');
        } catch (e) {
            doc.setFontSize(24);
            doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
            doc.text(branding.companyName.charAt(0), 30, 35, { align: 'center' });
        }
    }

    // Title & Subtitle
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("times", "bold");
    doc.text(cleanText(pkg.packageName), 55, 25);
    
    doc.setFontSize(12);
    doc.setFont("times", "normal");
    doc.text(`${pkg.nights} Nights | ${pkg.category || 'Group Tour'} Package`, 55, 33);

    // Price Bubble
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(150, 15, 45, 20, 2, 2, 'F');
    doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
    doc.setFontSize(10);
    doc.text("Starting From", 172.5, 21, { align: "center" });
    doc.setFontSize(16);
    doc.setFont("times", "bold");
    doc.text(`INR ${pkg.fixedPrice.toLocaleString()}`, 172.5, 30, { align: "center" });

    let yPos = 65;

    // 2. HIGHLIGHTS BAR (Duration & Hotel)
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.rect(15, yPos, 180, 25, 'F');
    doc.rect(15, yPos, 180, 25, 'S');

    doc.setTextColor(50, 50, 50);
    
    // Duration
    doc.setFontSize(11);
    doc.setFont("times", "bold");
    doc.text("Duration:", 25, yPos + 10);
    doc.setFont("times", "normal");
    doc.text(`${pkg.nights} Nights / ${pkg.nights + 1} Days`, 25, yPos + 18);

    // Hotel
    doc.setFont("times", "bold");
    doc.text("Accommodation:", 80, yPos + 10);
    doc.setFont("times", "normal");
    // Explicit Hotel Name Logic
    const hotelName = cleanText(pkg.hotelDetails) || "NA";
    doc.text(hotelName, 80, yPos + 18);

    // Validity/Type
    doc.setFont("times", "bold");
    doc.text("Travel Validity:", 140, yPos + 10);
    doc.setFont("times", "normal");
    const validityText = pkg.dateType === 'DAILY' ? 'Daily Departure' : 'Fixed Dates';
    doc.text(validityText, 140, yPos + 18);

    yPos += 35;

    // 3. Overview / Description
    if (pkg.description) {
        doc.setFontSize(14);
        doc.setTextColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
        doc.setFont("times", "bold");
        doc.text("Tour Overview", 15, yPos);
        yPos += 7;

        doc.setFontSize(10);
        doc.setFont("times", "normal");
        doc.setTextColor(80, 80, 80);
        const descLines = doc.splitTextToSize(cleanText(pkg.description), 180);
        doc.text(descLines, 15, yPos);
        yPos += (descLines.length * 5) + 10;
    }

    // 4. Inclusions & Exclusions (Improved Side by Side)
    const incExcY = yPos;
    const boxWidth = 85;
    const boxHeight = 60; // Fixed height for alignment

    // Inclusions
    doc.setFillColor(240, 253, 244); // Light Green bg
    doc.rect(15, incExcY, boxWidth, boxHeight, 'F');
    doc.setFontSize(12);
    doc.setTextColor(21, 128, 61); // Green 700
    doc.setFont("times", "bold");
    doc.text("Inclusions", 20, incExcY + 8);
    
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.setFont("times", "normal");
    let currentIncY = incExcY + 15;
    pkg.inclusions.forEach(inc => {
        if(currentIncY < incExcY + boxHeight - 5) {
            const lines = doc.splitTextToSize(`• ${cleanText(inc)}`, boxWidth - 10);
            doc.text(lines, 20, currentIncY);
            currentIncY += (lines.length * 4) + 1;
        }
    });

    // Exclusions
    doc.setFillColor(254, 242, 242); // Light Red bg
    doc.rect(110, incExcY, boxWidth, boxHeight, 'F');
    doc.setFontSize(12);
    doc.setTextColor(185, 28, 28); // Red 700
    doc.setFont("times", "bold");
    doc.text("Exclusions", 115, incExcY + 8);

    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.setFont("times", "normal");
    let currentExcY = incExcY + 15;
    pkg.exclusions.forEach(exc => {
        if(currentExcY < incExcY + boxHeight - 5) {
             const lines = doc.splitTextToSize(`• ${cleanText(exc)}`, boxWidth - 10);
             doc.text(lines, 115, currentExcY);
             currentExcY += (lines.length * 4) + 1;
        }
    });

    yPos = incExcY + boxHeight + 15;

    // 5. Itinerary Table
    if (pkg.itinerary && pkg.itinerary.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
        doc.setFont("times", "bold");
        doc.text("Detailed Itinerary", 15, yPos);
        yPos += 5;

        const tableBody = pkg.itinerary.map(day => [
            `Day ${day.day}`,
            cleanText(day.title),
            cleanText(day.description)
        ]);

        autoTable(doc, {
            startY: yPos,
            head: [['Day', 'Title', 'Details']],
            body: tableBody,
            theme: 'grid',
            headStyles: {
                fillColor: primaryRGB,
                textColor: 255,
                fontStyle: 'bold',
                fontSize: 10
            },
            columnStyles: {
                0: { cellWidth: 15, fontStyle: 'bold' },
                1: { cellWidth: 50, fontStyle: 'bold' },
                2: { cellWidth: 'auto' }
            },
            styles: {
                font: 'times',
                fontSize: 9,
                cellPadding: 4,
                overflow: 'linebreak'
            }
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // 6. Contact / Booking Footer
    addFooter(doc, branding, primaryRGB);

    doc.save(`Package_${pkg.packageName.replace(/\s+/g, '_')}.pdf`);
};

// --- SHARED FOOTER ---
const addFooter = (doc: jsPDF, branding: BrandingOptions, primaryRGB: [number, number, number]) => {
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        const pageHeight = doc.internal.pageSize.height;
        
        doc.setDrawColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
        doc.setLineWidth(1);
        doc.line(15, pageHeight - 20, 195, pageHeight - 20);
        
        doc.setFontSize(10);
        doc.setFont("times", "bold");
        doc.setTextColor(50, 50, 50);
        doc.text(branding.companyName, 15, pageHeight - 14);
        
        doc.setFontSize(9);
        doc.setFont("times", "normal");
        doc.setTextColor(100, 100, 100);
        
        let contactText = "";
        if (branding.phone) contactText += `Phone: ${branding.phone}  `;
        if (branding.email) contactText += `Email: ${branding.email}`;
        
        doc.text(contactText, 15, pageHeight - 9);
        
        doc.text(`Page ${i} of ${pageCount}`, 195, pageHeight - 9, { align: 'right' });
    }
};

export const generateReceiptPDF = (booking: Booking, payment: PaymentEntry, user: User) => { console.log("Receipt PDF Placeholder"); };
export const generateInvoicePDF = (invoice: GSTRecord, booking: Booking) => { console.log("Invoice PDF Placeholder"); };
export const generateCreditNotePDF = (creditNote: GSTCreditNote, booking: Booking) => { console.log("Credit Note PDF Placeholder"); };
