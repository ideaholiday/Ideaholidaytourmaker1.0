import { PricingInput, PricingBreakdown } from '../types';
import { roundPrice } from './rounding';

/**
 * Calculates the Total Net Cost for the itinerary.
 * Note: Logic updated to usually handle this via the SmartBuilder now, 
 * but this utility remains for the manual calculator in QuoteDetail.
 */
const calculateNetCost = (input: PricingInput): number => {
  const { travelers, hotel, transfers, activities, visa } = input;
  const totalPax = travelers.adults + travelers.children; // Infants usually free or handled separately

  // 1. Hotel Cost
  let hotelCost = 0;
  if (hotel.costType === 'Per Room') {
    hotelCost = hotel.cost * hotel.nights * hotel.rooms;
  } else {
    hotelCost = hotel.cost * hotel.nights * totalPax;
  }

  // 2. Transfer Cost
  let transferCost = 0;
  transfers.forEach(t => {
    if (t.costBasis === 'Per Vehicle') {
      transferCost += t.cost * t.quantity;
    } else {
      transferCost += t.cost * totalPax;
    }
  });

  // 3. Activity Cost
  let activityCost = 0;
  activities.forEach(a => {
    activityCost += (a.costAdult * travelers.adults) + (a.costChild * travelers.children);
  });

  // 4. Visa Cost
  const visaCost = visa.enabled ? (visa.costPerPerson * totalPax) : 0;

  return hotelCost + transferCost + activityCost + visaCost;
};

/**
 * Master Calculation Function
 */
export const calculateQuotePrice = (input: PricingInput): PricingBreakdown => {
  const netCost = calculateNetCost(input);
  const totalPax = input.travelers.adults + input.travelers.children;

  // 1. Company Markup
  let companyMarkupValue = 0;
  if (input.rules.markupType === 'Percentage') {
    companyMarkupValue = netCost * (input.rules.companyMarkup / 100);
  } else {
    companyMarkupValue = input.rules.companyMarkup * totalPax; 
  }

  // 2. Agent Markup (Default estimation)
  const buyingPrice = netCost + companyMarkupValue;
  
  let agentMarkupValue = 0;
  if (input.rules.markupType === 'Percentage') {
    agentMarkupValue = buyingPrice * (input.rules.agentMarkup / 100);
  } else {
    agentMarkupValue = input.rules.agentMarkup * totalPax;
  }

  // 3. Subtotal
  const subtotal = buyingPrice + agentMarkupValue;

  // 4. GST
  const gstAmount = subtotal * (input.rules.gstPercentage / 100);

  // 5. Final Calculation
  let rawFinalPrice = subtotal + gstAmount;

  // 6. Rounding
  const finalPrice = roundPrice(rawFinalPrice, input.rules.roundOff);

  return {
    netCost: Number(netCost.toFixed(2)),
    companyMarkupValue: Number(companyMarkupValue.toFixed(2)),
    agentMarkupValue: Number(agentMarkupValue.toFixed(2)),
    subtotal: Number(subtotal.toFixed(2)),
    gstAmount: Number(gstAmount.toFixed(2)),
    finalPrice: finalPrice,
    perPersonPrice: totalPax > 0 ? Number((finalPrice / totalPax).toFixed(2)) : 0
  };
};