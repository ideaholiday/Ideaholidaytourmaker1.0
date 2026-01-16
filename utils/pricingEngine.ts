
import { PricingInput, PricingBreakdown, PricingRule } from '../types';
import { roundPrice } from './rounding';
import { currencyService } from '../services/currencyService';

/**
 * Calculates Supplier Net Cost (Raw Inventory Cost) converted to Target Currency.
 */
export const calculateSupplierCost = (input: PricingInput): number => {
  const { travelers, hotel, transfers, activities, visa, targetCurrency } = input;
  const totalPax = travelers.adults + travelers.children; 
  
  // Helper: Convert amount from Source Currency to Quote Target Currency
  const toTarget = (amount: number, sourceCurrency?: string) => {
      const currency = sourceCurrency || 'USD'; // Fallback only if data missing
      return currencyService.convert(amount, currency, targetCurrency);
  };

  // 1. Hotel Cost
  let hotelCost = 0;
  if (hotel.costType === 'Per Room') {
    hotelCost = hotel.cost * hotel.nights * hotel.rooms;
  } else {
    hotelCost = hotel.cost * hotel.nights * totalPax;
  }
  const hotelCostTotal = toTarget(hotelCost, hotel.currency);

  // 2. Transfer Cost
  let transferCostTotal = 0;
  transfers.forEach(t => {
    let cost = 0;
    if (t.costBasis === 'Per Vehicle') {
      cost = t.cost * t.quantity;
    } else {
      cost = t.cost * totalPax;
    }
    transferCostTotal += toTarget(cost, t.currency);
  });

  // 3. Activity Cost
  let activityCostTotal = 0;
  activities.forEach(a => {
    const cost = (a.costAdult * travelers.adults) + (a.costChild * travelers.children);
    activityCostTotal += toTarget(cost, a.currency);
  });

  // 4. Visa Cost
  const visaCostTotal = visa.enabled ? toTarget(visa.costPerPerson * totalPax, visa.currency) : 0;

  return hotelCostTotal + transferCostTotal + activityCostTotal + visaCostTotal;
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
 * Assumes inputs are already summed/converted to target currency.
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
    
    let agentMarkupValue = 0;
    if (agentMarkupOverride !== undefined) {
        // Flat markup override is assumed to be in target currency already
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
