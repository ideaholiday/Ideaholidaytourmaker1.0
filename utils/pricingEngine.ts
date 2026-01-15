
import { PricingInput, PricingBreakdown, PricingRule } from '../types';
import { roundPrice } from './rounding';

/**
 * Calculates Supplier Net Cost (Raw Inventory Cost).
 * Admin Only View.
 */
export const calculateSupplierCost = (input: PricingInput): number => {
  const { travelers, hotel, transfers, activities, visa } = input;
  const totalPax = travelers.adults + travelers.children; 

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
 * Calculates Markup Value based on amount and rule (Percentage vs Fixed).
 */
const calculateMarkupValue = (baseAmount: number, markup: number, type: 'Percentage' | 'Fixed', paxCount: number): number => {
    if (type === 'Percentage') {
        return baseAmount * (markup / 100);
    }
    // Fixed markup is usually Per Person in travel
    return markup * paxCount;
};

/**
 * Master Calculation Function
 * Flow:
 * 1. Supplier Cost (Raw)
 * 2. + Company Markup = Platform Net (Agent's Cost)
 * 3. + Agent Markup = Subtotal
 * 4. + GST = Final Price
 */
export const calculateQuotePrice = (input: PricingInput): PricingBreakdown => {
  const supplierCost = calculateSupplierCost(input);
  const totalPax = input.travelers.adults + input.travelers.children;

  // 1. Company Markup (Platform Margin)
  const companyMarkupValue = calculateMarkupValue(supplierCost, input.rules.companyMarkup, input.rules.markupType, totalPax);
  
  // 2. Platform Net Cost (This is what the Agent Sees as "Net Cost")
  const platformNetCost = supplierCost + companyMarkupValue;

  // 3. Agent Markup (Added by Agent)
  const agentMarkupValue = calculateMarkupValue(platformNetCost, input.rules.agentMarkup, input.rules.markupType, totalPax);

  // 4. Subtotal (Before Tax)
  const subtotal = platformNetCost + agentMarkupValue;

  // 5. GST (Tax on Subtotal)
  const gstAmount = subtotal * (input.rules.gstPercentage / 100);

  // 6. Final Calculation
  let rawFinalPrice = subtotal + gstAmount;

  // 7. Rounding
  const finalPrice = roundPrice(rawFinalPrice, input.rules.roundOff);

  return {
    supplierCost: Number(supplierCost.toFixed(2)),
    companyMarkupValue: Number(companyMarkupValue.toFixed(2)),
    platformNetCost: Number(platformNetCost.toFixed(2)),
    agentMarkupValue: Number(agentMarkupValue.toFixed(2)),
    subtotal: Number(subtotal.toFixed(2)),
    gstAmount: Number(gstAmount.toFixed(2)),
    finalPrice: finalPrice,
    perPersonPrice: totalPax > 0 ? Number((finalPrice / totalPax).toFixed(2)) : 0,
    
    // Legacy support alias
    netCost: Number(platformNetCost.toFixed(2))
  };
};

/**
 * Simplified Calculator for direct values (e.g. SmartBuilder live view)
 * Assumes inputs are already summed or raw.
 */
export const calculatePriceFromNet = (
    netCost: number, 
    rules: PricingRule, 
    paxCount: number,
    agentMarkupOverride?: number
): PricingBreakdown => {
    // Treat input 'netCost' as 'supplierCost' effectively
    const supplierCost = netCost;
    
    const companyMarkupValue = calculateMarkupValue(supplierCost, rules.companyMarkup, rules.markupType, paxCount);
    const platformNetCost = supplierCost + companyMarkupValue;
    
    const effectiveAgentMarkup = agentMarkupOverride !== undefined ? agentMarkupOverride : rules.agentMarkup;
    // If override is provided, assume it's a fixed value (flat fee) added to total, OR if percentage logic needed, handle here.
    // For SmartBuilder, Agent usually adds a FLAT markup.
    
    let agentMarkupValue = 0;
    if (agentMarkupOverride !== undefined) {
        // Flat markup override
        agentMarkupValue = agentMarkupOverride;
    } else {
        // Use rule
        agentMarkupValue = calculateMarkupValue(platformNetCost, rules.agentMarkup, rules.markupType, paxCount);
    }

    const subtotal = platformNetCost + agentMarkupValue;
    const gstAmount = subtotal * (rules.gstPercentage / 100);
    const rawFinalPrice = subtotal + gstAmount;
    const finalPrice = roundPrice(rawFinalPrice, rules.roundOff);

    return {
        supplierCost,
        companyMarkupValue,
        platformNetCost,
        agentMarkupValue,
        subtotal,
        gstAmount,
        finalPrice,
        perPersonPrice: paxCount > 0 ? Number((finalPrice / paxCount).toFixed(2)) : 0,
        netCost: platformNetCost
    };
}
