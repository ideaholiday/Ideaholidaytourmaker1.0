
/**
 * Rounds a number based on B2B travel industry standards.
 * Usually rounding UP to the nearest psychological price point.
 */

export const roundPrice = (
  price: number, 
  rule: 'Nearest 1' | 'Nearest 10' | 'Nearest 100' | 'None'
): number => {
  if (price <= 0.01) return 0; // Prevent rounding empty/zero prices up

  if (rule === 'None') return Math.ceil(price);

  if (rule === 'Nearest 1') {
    // E.g. 104.2 -> 105
    return Math.ceil(price);
  }

  if (rule === 'Nearest 10') {
    // Strategy: Round up to nearest 10
    // e.g. 452 -> 460
    return Math.ceil(price / 10) * 10;
  }
  
  if (rule === 'Nearest 100') {
     // E.g. 1450 -> 1500
     return Math.ceil(price / 100) * 100;
  }

  return price;
};

// Helper for psychological pricing (ending in 9)
export const applyPsychologicalPricing = (price: number): number => {
  if (price <= 0) return 0;
  // 142 -> 149
  return Math.ceil((price + 1) / 10) * 10 - 1;
};
