
import { PricingInput, PricingBreakdown, PricingRule } from '../types';
import { roundPrice } from './rounding';
import { currencyService } from '../services/currencyService';

const BASE_CURRENCY = 'INR';

/**
 * Helper: Normalize any amount to System Base Currency (INR)
 */
const normalizeToBase = (amount: number, sourceCurrency?: string): number => {
    return currencyService.convertToBase(amount, sourceCurrency || BASE_CURRENCY);
};

/**
 * Calculates Supplier Net Cost (Raw Inventory Cost) in BASE CURRENCY (INR).
 */
export const calculateSupplierCostBase = (input: PricingInput): number => {
  const { travelers, hotel, transfers, activities, visa } = input;
  const totalPax = travelers.adults + travelers.children; 
  
  // 1. Hotel Cost
  let hotelCost = 0;
  if (hotel.costType === 'Per Room') {
    hotelCost = hotel.cost * hotel.nights * hotel.rooms;
  } else {
    hotelCost = hotel.cost * hotel.nights * totalPax;
  }
  const hotelCostBase = normalizeToBase(hotelCost, hotel.currency);

  // 2. Transfer Cost
  let transferCostBase = 0;
  transfers.forEach(t => {
    let cost = 0;
    if (t.costBasis === 'Per Vehicle') {
      cost = t.cost * t.quantity;
    } else {
      cost = t.cost * totalPax;
    }
    transferCostBase += normalizeToBase(cost, t.currency);
  });

  // 3. Activity Cost
  let activityCostBase = 0;
  activities.forEach(a => {
    const cost = (a.costAdult * travelers.adults) + (a.costChild * travelers.children);
    activityCostBase += normalizeToBase(cost, a.currency);
  });

  // 4. Visa Cost
  const visaCostBase = visa.enabled ? normalizeToBase(visa.costPerPerson * totalPax, visa.currency) : 0;

  return hotelCostBase + transferCostBase + activityCostBase + visaCostBase;
};

/**
 * Calculates Markup Value based on amount and rule.
 * Always returns value in the same currency as baseAmount.
 */
const calculateMarkupValue = (baseAmount: number, markup: number, type: 'Percentage' | 'Fixed', paxCount: number): number => {
    if (baseAmount <= 0) return 0; // Safeguard: No markup on zero cost
    
    if (type === 'Percentage') {
        return baseAmount * (markup / 100);
    }
    // Fixed markup is usually Per Person
    return markup * paxCount;
};

/**
 * Master Calculation Function
 */
export const calculateQuotePrice = (input: PricingInput): PricingBreakdown => {
  // Step 1: Net Cost in Base
  const supplierCostBase = calculateSupplierCostBase(input);
  const totalPax = input.travelers.adults + input.travelers.children;

  // Step 2: Company Markup (Platform Margin) in Base
  const companyMarkupValueBase = calculateMarkupValue(supplierCostBase, input.rules.companyMarkup, input.rules.markupType, totalPax);
  
  // Platform Net (B2B Price) in Base
  const platformNetCostBase = supplierCostBase + companyMarkupValueBase;

  // Step 3: Agent Markup in Base
  let agentMarkupValueBase = 0;
  // Prevent markup on empty itinerary
  if (platformNetCostBase > 0) {
      if (input.rules.markupType === 'Fixed') {
          const fixedInTarget = input.rules.agentMarkup * totalPax;
          agentMarkupValueBase = normalizeToBase(fixedInTarget, input.targetCurrency);
      } else {
          agentMarkupValueBase = calculateMarkupValue(platformNetCostBase, input.rules.agentMarkup, 'Percentage', totalPax);
      }
  }

  // Step 4: Subtotal (Before Tax) in Base
  const subtotalBase = platformNetCostBase + agentMarkupValueBase;

  // Step 5: GST (Tax) in Base
  const gstAmountBase = subtotalBase * (input.rules.gstPercentage / 100);

  // Step 6: Final Total in Base
  const finalPriceBase = subtotalBase + gstAmountBase;

  // --- CONVERSION TO TARGET CURRENCY ---
  // Since system is INR only, this is 1:1
  
  const convert = (val: number) => currencyService.convert(val, BASE_CURRENCY, input.targetCurrency);

  const finalPriceTarget = convert(finalPriceBase);
  const roundedFinalPrice = roundPrice(finalPriceTarget, input.rules.roundOff);

  return {
    supplierCost: Number(convert(supplierCostBase).toFixed(2)),
    companyMarkupValue: Number(convert(companyMarkupValueBase).toFixed(2)),
    platformNetCost: Number(convert(platformNetCostBase).toFixed(2)),
    agentMarkupValue: Number(convert(agentMarkupValueBase).toFixed(2)),
    subtotal: Number(convert(subtotalBase).toFixed(2)),
    gstAmount: Number(convert(gstAmountBase).toFixed(2)),
    finalPrice: roundedFinalPrice,
    perPersonPrice: totalPax > 0 ? Number((roundedFinalPrice / totalPax).toFixed(2)) : 0,
    
    // Legacy alias
    netCost: Number(convert(platformNetCostBase).toFixed(2))
  };
};

/**
 * Simplified Calculator for direct values (e.g. SmartBuilder live view)
 * Input 'netCost' is assumed to be in BASE CURRENCY (INR).
 */
export const calculatePriceFromNet = (
    netCostBase: number, 
    rules: PricingRule, 
    paxCount: number,
    markupOverridePercent?: number, // Optional override (0-100)
    targetCurrency: string = 'INR'
): PricingBreakdown => {
    
    if (netCostBase <= 0) {
        return {
            supplierCost: 0, companyMarkupValue: 0, platformNetCost: 0, agentMarkupValue: 0,
            subtotal: 0, gstAmount: 0, finalPrice: 0, perPersonPrice: 0, netCost: 0
        };
    }

    // 1. Platform Margin (Backend Logic mirror)
    // System margin is typically applied on Supplier Net
    const companyMarkupValueBase = calculateMarkupValue(netCostBase, rules.companyMarkup, 'Percentage', paxCount);
    const platformNetCostBase = netCostBase + companyMarkupValueBase;
    
    // 2. Agent Markup
    let agentMarkupValueBase = 0;
    
    // If override provided, use it as percentage
    if (markupOverridePercent !== undefined && markupOverridePercent !== null) {
        agentMarkupValueBase = platformNetCostBase * (markupOverridePercent / 100);
    } else {
        // Fallback to rules
        if (rules.markupType === 'Fixed') {
             const fixedInTarget = rules.agentMarkup * paxCount;
             agentMarkupValueBase = normalizeToBase(fixedInTarget, targetCurrency);
        } else {
             agentMarkupValueBase = calculateMarkupValue(platformNetCostBase, rules.agentMarkup, 'Percentage', paxCount);
        }
    }

    // 3. Tax (GST)
    const subtotalBase = platformNetCostBase + agentMarkupValueBase;
    const gstAmountBase = subtotalBase * (rules.gstPercentage / 100);
    const finalPriceBase = subtotalBase + gstAmountBase;

    // 4. Convert All to Target
    const convert = (val: number) => currencyService.convert(val, BASE_CURRENCY, targetCurrency);
    
    const finalPriceTarget = convert(finalPriceBase);
    const roundedFinalPrice = roundPrice(finalPriceTarget, rules.roundOff);

    return {
        supplierCost: Number(convert(netCostBase).toFixed(2)),
        companyMarkupValue: Number(convert(companyMarkupValueBase).toFixed(2)),
        platformNetCost: Number(convert(platformNetCostBase).toFixed(2)),
        agentMarkupValue: Number(convert(agentMarkupValueBase).toFixed(2)),
        subtotal: Number(convert(subtotalBase).toFixed(2)),
        gstAmount: Number(convert(gstAmountBase).toFixed(2)),
        finalPrice: roundedFinalPrice,
        perPersonPrice: paxCount > 0 ? Number((roundedFinalPrice / paxCount).toFixed(2)) : 0,
        netCost: Number(convert(platformNetCostBase).toFixed(2))
    };
}
