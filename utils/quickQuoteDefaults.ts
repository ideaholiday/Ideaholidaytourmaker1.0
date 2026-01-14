
/**
 * Quick Quote Defaults & Logic Helpers
 */

export const calculateRequiredRooms = (adults: number, children: number): number => {
  // Logic:
  // 1. Base rooms = Adults / 2 (rounded up)
  // 2. Extra checks: Max occupancy usually 3 adults or 2A + 2C
  // Simplified for Quick Quote:
  
  const baseRooms = Math.ceil(adults / 2);
  
  // If only 1 room needed by adults, but too many kids (e.g. 2A + 3C), add room
  if (baseRooms === 1 && children > 2) {
      return 2;
  }
  
  return Math.max(1, baseRooms);
};

export const getDestinationDefaults = (destinationName: string) => {
  const dest = destinationName.toLowerCase();
  
  if (dest.includes('dubai')) {
      return {
          transfers: true,
          sightseeing: 'Standard',
          hotelCategory: '4 Star',
          mealPlan: 'BB'
      };
  }
  
  if (dest.includes('maldives')) {
      return {
          transfers: true, // Seaplane/Speedboat always needed
          sightseeing: 'None', // Resort based
          hotelCategory: '5 Star',
          mealPlan: 'AI' // All Inclusive popular
      };
  }

  // General Default
  return {
      transfers: true,
      sightseeing: 'Standard',
      hotelCategory: '4 Star',
      mealPlan: 'BB'
  };
};
