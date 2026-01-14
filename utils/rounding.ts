/**
 * Rounds a number based on B2B travel industry standards.
 * Usually rounding UP to the nearest psychological price point.
 */

export const roundPrice = (
  price: number, 
  rule: 'Nearest 1' | 'Nearest 10' | 'Nearest 100' | 'None'
): number => {
  if (rule === 'None') return Math.ceil(price);

  if (rule === 'Nearest 1') {
    // E.g. 104.2 -> 105
    return Math.ceil(price);
  }

  if (rule === 'Nearest 10') {
    // Strategy: Round up to nearest 10, then subtract 1 if you want ending in 9
    // Standard B2B: often just round to nearest 10 for clean accounting
    // Or psychological: 452 -> 459
    return Math.ceil((price + 1) / 10) * 10;
  }
  
  if (rule === 'Nearest 100') {
     // E.g. 1450 -> 1499 or 1500
     return Math.ceil(price / 100) * 100;
  }

  return price;
};

// Helper for psychological pricing (ending in 9)
export const applyPsychologicalPricing = (price: number): number => {
  // 142 -> 149
  // 149 -> 149
  // 150 -> 159
  return Math.ceil((price + 1) / 10) * 10 - 1;
};
