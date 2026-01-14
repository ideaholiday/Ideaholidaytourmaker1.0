
import { ItineraryTemplate } from '../types';

export const INITIAL_TEMPLATES: ItineraryTemplate[] = [
  // --- DUBAI TEMPLATES ---
  {
    id: 'dxb_3n_4d',
    name: 'Dubai Essentials (3N/4D)',
    destinationKeyword: 'Dubai',
    nights: 3,
    tags: ['Short Trip', 'Budget Friendly'],
    days: [
      {
        day: 1,
        title: 'Arrival in Dubai',
        description: 'Welcome to Dubai! Private transfer from airport to your hotel. Evening at leisure.',
        slots: [{ type: 'TRANSFER', keywords: ['Airport'], isArrival: true }]
      },
      {
        day: 2,
        title: 'Dubai City Tour & Burj Khalifa',
        description: 'Explore the historic and modern sights of Dubai followed by a view from the top.',
        slots: [
            { type: 'ACTIVITY', category: 'City Tour', timeSlot: 'Morning' },
            { type: 'ACTIVITY', keywords: ['Burj', 'Khalifa'], timeSlot: 'Evening' }
        ]
      },
      {
        day: 3,
        title: 'Desert Safari Adventure',
        description: 'Afternoon pickup for a thrilling dune bashing experience with BBQ dinner.',
        slots: [{ type: 'ACTIVITY', category: 'Adventure', keywords: ['Safari'], timeSlot: 'Evening' }]
      },
      {
        day: 4,
        title: 'Departure',
        description: 'Check out and transfer to the airport for your flight back home.',
        slots: [{ type: 'TRANSFER', keywords: ['Airport'], isDeparture: true }]
      }
    ]
  },
  {
    id: 'dxb_4n_5d',
    name: 'Dubai & Dhow Cruise (4N/5D)',
    destinationKeyword: 'Dubai',
    nights: 4,
    tags: ['Best Seller', 'Family'],
    days: [
      {
        day: 1,
        title: 'Arrival',
        description: 'Transfer to hotel.',
        slots: [{ type: 'TRANSFER', keywords: ['Airport'], isArrival: true }]
      },
      {
        day: 2,
        title: 'City Tour',
        description: 'Half day city tour.',
        slots: [{ type: 'ACTIVITY', category: 'City Tour' }]
      },
      {
        day: 3,
        title: 'Marina Dhow Cruise',
        description: 'Evening dinner cruise with entertainment.',
        slots: [{ type: 'ACTIVITY', category: 'Cruise', timeSlot: 'Evening' }]
      },
      {
        day: 4,
        title: 'Desert Safari',
        description: 'Standard desert safari.',
        slots: [{ type: 'ACTIVITY', category: 'Adventure' }]
      },
      {
        day: 5,
        title: 'Departure',
        description: 'Transfer to airport.',
        slots: [{ type: 'TRANSFER', keywords: ['Airport'], isDeparture: true }]
      }
    ]
  },
  {
    id: 'dxb_5n_6d_lux',
    name: 'Dubai Luxury & Leisure (5N/6D)',
    destinationKeyword: 'Dubai',
    nights: 5,
    tags: ['Luxury', 'Relaxed Pace'],
    days: [
      {
        day: 1,
        title: 'VIP Arrival',
        description: 'Private transfer to your luxury resort.',
        slots: [{ type: 'TRANSFER', keywords: ['Airport'], isArrival: true }]
      },
      {
        day: 2,
        title: 'Modern Dubai Tour',
        description: 'Visit the Frame, Future Museum, and Burj Khalifa.',
        slots: [{ type: 'ACTIVITY', keywords: ['Khalifa', 'City'] }]
      },
      {
        day: 3,
        title: 'Yacht or Cruise',
        description: 'Evening cruise experience.',
        slots: [{ type: 'ACTIVITY', category: 'Cruise' }]
      },
      {
        day: 4,
        title: 'Shopping & Leisure',
        description: 'Day at leisure for Dubai Mall.',
        slots: []
      },
      {
        day: 5,
        title: 'Desert Experience',
        description: 'Premium desert safari.',
        slots: [{ type: 'ACTIVITY', category: 'Adventure' }]
      },
      {
        day: 6,
        title: 'Departure',
        description: 'Transfer to airport.',
        slots: [{ type: 'TRANSFER', keywords: ['Airport'], isDeparture: true }]
      }
    ]
  },
  // --- THAILAND (PHUKET) TEMPLATES ---
  {
    id: 'hkt_3n_4d',
    name: 'Phuket Island Escape (3N/4D)',
    destinationKeyword: 'Phuket',
    nights: 3,
    tags: ['Beach', 'Adventure'],
    days: [
      {
        day: 1,
        title: 'Arrival Phuket',
        description: 'Transfer to resort.',
        slots: [{ type: 'TRANSFER', keywords: ['Airport'], isArrival: true }]
      },
      {
        day: 2,
        title: 'Phi Phi Island Tour',
        description: 'Full day island hopping by speedboat.',
        slots: [{ type: 'ACTIVITY', category: 'Adventure', keywords: ['Island'] }]
      },
      {
        day: 3,
        title: 'Leisure & Show',
        description: 'Day at leisure. Evening Fantasea show.',
        slots: [{ type: 'ACTIVITY', category: 'Show' }]
      },
      {
        day: 4,
        title: 'Departure',
        description: 'Transfer to airport.',
        slots: [{ type: 'TRANSFER', keywords: ['Airport'], isDeparture: true }]
      }
    ]
  }
];
