import { Quote, PricingBreakdown } from '../types';
import { BRANDING } from '../constants';

export const formatWhatsAppQuote = (quote: Quote, breakdown: PricingBreakdown | null, showPrice: boolean): string => {
  const priceSection = showPrice && breakdown
    ? `
💰 *Total Package Cost:* ${quote.currency} ${breakdown.finalPrice.toLocaleString()}
💳 *Per Person:* ${quote.currency} ${breakdown.perPersonPrice.toLocaleString()}
`
    : '';

  const hotelInfo = `
🏨 *Service Info:*
${quote.serviceDetails.split(',')[0] || 'Standard Package'}
`;

  return `
✨ *${BRANDING.name}* ✨

📍 *Destination:* ${quote.destination}
📅 *Travel Dates:* ${quote.travelDate}
👥 *Travellers:* ${quote.paxCount}

${hotelInfo}
${priceSection}
📄 *Quote Ref:* ${quote.uniqueRefNo}
⏳ *Valid Till:* ${new Date(new Date(quote.travelDate).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}

📞 ${BRANDING.supportPhone}
🌐 ${BRANDING.website}
`.trim();
};
