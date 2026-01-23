
import { User, UserRole, Quote } from './types';

export const BRANDING = {
  name: "Idea Tour Maker",
  legalName: "Idea Holiday Pvt Ltd.",
  logoUrl: "", // Removed broken URL, will fallback to Globe icon
  email: "info@ideaholiday.com",
  supportPhone: "+91 9696 777 391",
  website: "b2b.ideaholiday.com",
  authDomain: "b2b.ideaholiday.com",
  address: "Office No 129, Deva Palace, Lucknow",
  googleClientId: "669144046620-dr4v4553lo3nvpbus5b1b2h8h8a5uiq9.apps.googleusercontent.com",
  oauthRedirectUri: "https://b2b.ideaholiday.com/__/auth/handler"
};

export const SESSION_CONFIG = {
  INACTIVITY_TIMEOUT_MS: 30 * 60 * 1000, // 30 Minutes
  ABSOLUTE_TIMEOUT_MS: 8 * 60 * 60 * 1000, // 8 Hours
  WARNING_THRESHOLD_MS: 2 * 60 * 1000,   // Warn 2 mins before timeout
};

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Super Admin', email: 'admin@ideaholiday.com', role: UserRole.ADMIN, isVerified: true },
  { id: 'u2', name: 'Staff Sarah', email: 'sarah@ideaholiday.com', role: UserRole.STAFF, isVerified: true },
  { id: 'u3', name: 'Agent Smith', email: 'smith@travelagency.com', role: UserRole.AGENT, companyName: 'Best Travels', isVerified: true },
  { id: 'u4', name: 'Operator Ops', email: 'ops@localdmc.com', role: UserRole.OPERATOR, companyName: 'Lucknow Transports', isVerified: true, assignedDestinations: ['d1'] }, // Assigned to Dubai (d1)
  { 
    id: 'u5', 
    name: 'Hotel Manager', 
    email: 'hotel@partner.com', 
    role: UserRole.HOTEL_PARTNER, 
    companyName: 'Marina Hotels Group', 
    isVerified: true, 
    partnerType: 'HOTEL', 
    linkedInventoryIds: ['h1', 'h2'] // Linked to Marina Byblos & Atlantis
  }
];

export const INITIAL_QUOTES: Quote[] = [
  {
    id: 'q1',
    uniqueRefNo: 'IHT-2023-001',
    version: 1,
    isLocked: true,
    destination: 'Dubai, UAE',
    travelDate: '2023-11-15',
    paxCount: 2,
    serviceDetails: '5N/6D Package, 4 Star Hotel, Desert Safari, Burj Khalifa',
    itinerary: [
      { day: 1, title: 'Arrival in Dubai', description: 'Meet and greet at airport. Transfer to Marina Byblos Hotel. Evening Dhow Cruise Dinner.', inclusions: ['Airport Transfer', 'Dinner'] },
      { day: 2, title: 'Dubai City Tour', description: 'Half day city tour visiting Dubai Museum, Jumeirah Mosque and Photo stop at Burj Al Arab.', inclusions: ['Breakfast', 'Guide'] },
      { day: 3, title: 'Desert Safari', description: 'Afternoon pickup for Desert Safari with BBQ Dinner and Belly Dancing.', inclusions: ['Breakfast', 'Dinner', 'Safari'] },
      { day: 4, title: 'Burj Khalifa & Mall', description: 'Visit the 124th Floor of Burj Khalifa. Free time for shopping at Dubai Mall.', inclusions: ['Breakfast', 'Tickets'] },
      { day: 5, title: 'Free Day', description: 'Day at leisure for personal activities or optional tours.', inclusions: ['Breakfast'] },
      { day: 6, title: 'Departure', description: 'Check out from hotel and transfer to airport.', inclusions: ['Breakfast', 'Airport Transfer'] }
    ],
    price: 1500,
    cost: 1200,
    markup: 300,
    currency: 'USD',
    agentId: 'u3',
    agentName: 'Agent Smith',
    staffId: 'u2',
    staffName: 'Staff Sarah',
    operatorId: 'u4',
    operatorName: 'Operator Ops',
    status: 'CONFIRMED',
    messages: [
      {
        id: 'm1',
        senderId: 'u2',
        senderName: 'Staff Sarah',
        senderRole: UserRole.STAFF,
        content: 'Booking confirmed. Please arrange pickup.',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        isSystem: false
      }
    ]
  },
  {
    id: 'q2',
    uniqueRefNo: 'IHT-2023-088',
    version: 1,
    isLocked: false,
    destination: 'Thailand',
    travelDate: '2023-12-20',
    paxCount: 4,
    serviceDetails: 'Phuket & Krabi, Speedboat transfer required.',
    itinerary: [
      { day: 1, title: 'Arrival Phuket', description: 'Transfer to hotel. Evening at Fantasea Show.', inclusions: ['Transfer'] },
      { day: 2, title: 'Phi Phi Island Tour', description: 'Full day tour by speedboat with lunch.', inclusions: ['Breakfast', 'Lunch'] }
    ],
    price: 2200,
    cost: 1800,
    markup: 400,
    currency: 'USD',
    agentId: 'u3',
    agentName: 'Agent Smith',
    staffId: 'u2',
    staffName: 'Staff Sarah',
    status: 'PENDING',
    messages: []
  }
];