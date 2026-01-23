
import { QuickQuoteInputs } from '../types';

/**
 * MOCK PRICING DATABASE
 * In production, this would fetch average rates from historical data or a rate sheet.
 * VALUES ARE IN INR
 */
const BASE_RATES: Record<string, number> = {
    '3 Star': 4000,
    '4 Star': 7000,
    '5 Star': 15000,
    'Luxury': 35000
};

const MEAL_MULTIPLIERS: Record<string, number> = {
    'RO': 1.0,
    'BB': 1.1, // Breakfast
    'HB': 1.3, // Half Board
    'FB': 1.5, // Full Board
    'AI': 1.8  // All Inclusive
};

const SIGHTSEEING_PACKAGES: Record<string, number> = {
    'None': 0,
    'Standard': 3000,  // Per Pax Per Trip (Avg)
    'Premium': 8000    // Per Pax Per Trip (Avg)
};

const TRANSFER_COST_PER_PAX = 2000; // Avg round trip airport + basic intercity

export const calculateQuickEstimate = (
    destination: string, 
    nights: number, 
    pax: { adults: number, children: number },
    inputs: QuickQuoteInputs
): { perPerson: number, total: number, breakdown: any } => {
    
    // 1. Hotel Cost
    // Cost per room per night * number of rooms * nights
    const baseRate = BASE_RATES[inputs.hotelCategory] || 7000;
    const mealMult = MEAL_MULTIPLIERS[inputs.mealPlan] || 1.1;
    const nightlyRoomRate = baseRate * mealMult;
    
    const hotelTotal = nightlyRoomRate * inputs.rooms * nights;

    // 2. Transfers
    const transferTotal = inputs.transfersIncluded 
        ? (TRANSFER_COST_PER_PAX * (pax.adults + pax.children)) 
        : 0;

    // 3. Sightseeing
    // Standard logic: A specific bundle price per person
    // Scale by duration? Usually bundles are fixed "3N Package".
    // Let's add a duration scalar: Longer trips = more tours.
    const durationScalar = Math.max(1, nights / 3); 
    const tourRate = SIGHTSEEING_PACKAGES[inputs.sightseeingIntensity] || 0;
    const tourTotal = (tourRate * durationScalar) * (pax.adults + pax.children);

    // 4. Total Calculation
    const totalNet = hotelTotal + transferTotal + tourTotal;
    
    // 5. Margin & Buffer (Since this is an ESTIMATE, add 15% buffer)
    const bufferMargin = 1.15;
    const estimatedTotal = Math.ceil(totalNet * bufferMargin);
    
    const totalPax = pax.adults + pax.children;
    const perPerson = totalPax > 0 ? Math.ceil(estimatedTotal / totalPax) : 0;

    return {
        perPerson,
        total: estimatedTotal,
        breakdown: {
            hotel: hotelTotal,
            transfers: transferTotal,
            tours: tourTotal,
            nights
        }
    };
};
