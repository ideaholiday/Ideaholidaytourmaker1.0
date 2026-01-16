
import { Destination, Hotel, PricingRule, Transfer, Activity, Visa, FixedPackage, User, UserRole, ItineraryTemplate } from '../types';
import { MOCK_USERS } from '../constants';
import { INITIAL_TEMPLATES } from '../data/itineraryTemplates';
import { idGeneratorService } from './idGenerator'; // Import generator

// Mock Initial Data - Assigned to Super Admin (u1) by default
const INITIAL_DESTINATIONS: Destination[] = [
  // UAE
  { id: 'd1', country: 'UAE', city: 'Dubai', currency: 'AED', timezone: 'GMT+4', isActive: true, createdBy: 'u1' },
  { id: 'd4', country: 'UAE', city: 'Abu Dhabi', currency: 'AED', timezone: 'GMT+4', isActive: true, createdBy: 'u1' },
  
  // Thailand
  { id: 'd2', country: 'Thailand', city: 'Phuket', currency: 'THB', timezone: 'GMT+7', isActive: true, createdBy: 'u1' },
  { id: 'd3', country: 'Thailand', city: 'Bangkok', currency: 'THB', timezone: 'GMT+7', isActive: true, createdBy: 'u1' },
  { id: 'd5', country: 'Thailand', city: 'Pattaya', currency: 'THB', timezone: 'GMT+7', isActive: true, createdBy: 'u1' },
  { id: 'd6', country: 'Thailand', city: 'Krabi', currency: 'THB', timezone: 'GMT+7', isActive: true, createdBy: 'u1' },

  // Vietnam
  { id: 'd7', country: 'Vietnam', city: 'Ha Noi', currency: 'USD', timezone: 'GMT+7', isActive: true, createdBy: 'u1' },
  { id: 'd8', country: 'Vietnam', city: 'Ha Long Bay', currency: 'USD', timezone: 'GMT+7', isActive: true, createdBy: 'u1' },
  { id: 'd9', country: 'Vietnam', city: 'Da Nang', currency: 'USD', timezone: 'GMT+7', isActive: true, createdBy: 'u1' },
  { id: 'd10', country: 'Vietnam', city: 'Ho Chi Minh City', currency: 'USD', timezone: 'GMT+7', isActive: true, createdBy: 'u1' },
];

const INITIAL_HOTELS: Hotel[] = [
  // Dubai
  { id: 'h1', name: 'Marina Byblos', destinationId: 'd1', category: '4 Star', roomType: 'Deluxe', mealPlan: 'BB', cost: 350, costType: 'Per Room', season: 'Off-Peak', validFrom: '2023-01-01', validTo: '2023-12-31', isActive: true, createdBy: 'u1', currency: 'AED' },
  { id: 'h2', name: 'Atlantis The Palm', destinationId: 'd1', category: 'Luxury', roomType: 'Ocean King', mealPlan: 'HB', cost: 1500, costType: 'Per Room', season: 'Peak', validFrom: '2023-10-01', validTo: '2024-03-31', isActive: true, createdBy: 'u1', currency: 'AED' },
  
  // Abu Dhabi
  { id: 'h4', name: 'Yas Island Rotana', destinationId: 'd4', category: '4 Star', roomType: 'Premium Room', mealPlan: 'BB', cost: 450, costType: 'Per Room', season: 'Off-Peak', validFrom: '2023-01-01', validTo: '2024-12-31', isActive: true, createdBy: 'u1', currency: 'AED' },
  { id: 'h5', name: 'Emirates Palace Mandarin Oriental', destinationId: 'd4', category: 'Luxury', roomType: 'Coral Room', mealPlan: 'BB', cost: 2200, costType: 'Per Room', season: 'Peak', validFrom: '2023-01-01', validTo: '2024-12-31', isActive: true, createdBy: 'u1', currency: 'AED' },

  // Thailand - Phuket
  { id: 'h3', name: 'Amari Phuket', destinationId: 'd2', category: '4 Star', roomType: 'Superior Ocean', mealPlan: 'BB', cost: 3200, costType: 'Per Room', season: 'Peak', validFrom: '2023-01-01', validTo: '2024-12-31', isActive: true, createdBy: 'u1', currency: 'THB' },
  { id: 'h6', name: 'The Kee Resort & Spa', destinationId: 'd2', category: '4 Star', roomType: 'Plaza Room', mealPlan: 'BB', cost: 2500, costType: 'Per Room', season: 'Off-Peak', validFrom: '2023-01-01', validTo: '2024-12-31', isActive: true, createdBy: 'u1', currency: 'THB' },

  // Thailand - Bangkok
  { id: 'h7', name: 'Baiyoke Sky Hotel', destinationId: 'd3', category: '4 Star', roomType: 'Space Zone', mealPlan: 'BB', cost: 2200, costType: 'Per Room', season: 'Off-Peak', validFrom: '2023-01-01', validTo: '2024-12-31', isActive: true, createdBy: 'u1', currency: 'THB' },
  { id: 'h8', name: 'Siam Kempinski', destinationId: 'd3', category: 'Luxury', roomType: 'Deluxe', mealPlan: 'BB', cost: 9500, costType: 'Per Room', season: 'Peak', validFrom: '2023-01-01', validTo: '2024-12-31', isActive: true, createdBy: 'u1', currency: 'THB' },

  // Thailand - Pattaya
  { id: 'h9', name: 'Hard Rock Hotel Pattaya', destinationId: 'd5', category: '4 Star', roomType: 'Deluxe City View', mealPlan: 'BB', cost: 3800, costType: 'Per Room', season: 'Peak', validFrom: '2023-01-01', validTo: '2024-12-31', isActive: true, createdBy: 'u1', currency: 'THB' },
  { id: 'h10', name: 'Grand Bella Hotel', destinationId: 'd5', category: '3 Star', roomType: 'Superior', mealPlan: 'BB', cost: 1200, costType: 'Per Room', season: 'Off-Peak', validFrom: '2023-01-01', validTo: '2024-12-31', isActive: true, createdBy: 'u1', currency: 'THB' },

  // Thailand - Krabi
  { id: 'h11', name: 'Centara Grand Beach Resort', destinationId: 'd6', category: 'Luxury', roomType: 'Deluxe Ocean Facing', mealPlan: 'BB', cost: 6500, costType: 'Per Room', season: 'Peak', validFrom: '2023-01-01', validTo: '2024-12-31', isActive: true, createdBy: 'u1', currency: 'THB' },
  
  // Vietnam - Ha Noi
  { id: 'h12', name: 'Apricot Hotel', destinationId: 'd7', category: '5 Star', roomType: 'Sketch Room', mealPlan: 'BB', cost: 110, costType: 'Per Room', season: 'Off-Peak', validFrom: '2023-01-01', validTo: '2024-12-31', isActive: true, createdBy: 'u1', currency: 'USD' },
  
  // Vietnam - Ha Long Bay
  { id: 'h13', name: 'Paradise Elegance Cruise', destinationId: 'd8', category: 'Luxury', roomType: 'Deluxe Balcony Cabin', mealPlan: 'FB', cost: 350, costType: 'Per Room', season: 'Peak', validFrom: '2023-01-01', validTo: '2024-12-31', isActive: true, createdBy: 'u1', currency: 'USD' },

  // Vietnam - Da Nang
  { id: 'h14', name: 'Furama Resort Danang', destinationId: 'd9', category: '5 Star', roomType: 'Garden View', mealPlan: 'BB', cost: 180, costType: 'Per Room', season: 'Peak', validFrom: '2023-01-01', validTo: '2024-12-31', isActive: true, createdBy: 'u1', currency: 'USD' },

  // Vietnam - Ho Chi Minh City
  { id: 'h15', name: 'Rex Hotel Saigon', destinationId: 'd10', category: '4 Star', roomType: 'Premium', mealPlan: 'BB', cost: 95, costType: 'Per Room', season: 'Off-Peak', validFrom: '2023-01-01', validTo: '2024-12-31', isActive: true, createdBy: 'u1', currency: 'USD' },
];

const INITIAL_ACTIVITIES: Activity[] = [
  // Dubai
  { id: 'a1', activityName: 'Dhow Cruise Dinner - Marina', destinationId: 'd1', activityType: 'Cruise', costAdult: 120, costChild: 90, ticketIncluded: true, transferIncluded: true, isActive: true, createdBy: 'u1', currency: 'AED', description: '2-hour cruise with buffet dinner along Dubai Marina.' },
  { id: 'a2', activityName: 'Desert Safari Premium', destinationId: 'd1', activityType: 'Adventure', costAdult: 110, costChild: 90, ticketIncluded: true, transferIncluded: true, isActive: true, createdBy: 'u1', currency: 'AED', description: 'Dune bashing, BBQ dinner, camel ride, and belly dance show.' },
  { id: 'a3', activityName: 'Burj Khalifa 124th Floor', destinationId: 'd1', activityType: 'City Tour', costAdult: 160, costChild: 120, ticketIncluded: true, transferIncluded: false, isActive: true, createdBy: 'u1', currency: 'AED', description: 'Non-prime hours entry ticket.' },
  { id: 'a16', activityName: 'Museum of the Future', destinationId: 'd1', activityType: 'City Tour', costAdult: 145, costChild: 145, ticketIncluded: true, transferIncluded: false, isActive: true, createdBy: 'u1', currency: 'AED', description: 'Entry ticket to the most beautiful building on earth.' },

  // Abu Dhabi
  { id: 'a4', activityName: 'Ferrari World General Admission', destinationId: 'd4', activityType: 'Theme Park', costAdult: 310, costChild: 310, ticketIncluded: true, transferIncluded: false, isActive: true, createdBy: 'u1', currency: 'AED', description: 'Full day access to world-class rides.' },
  { id: 'a5', activityName: 'Abu Dhabi City Tour', destinationId: 'd4', activityType: 'City Tour', costAdult: 150, costChild: 100, ticketIncluded: false, transferIncluded: true, isActive: true, createdBy: 'u1', currency: 'AED', description: 'Visit Sheikh Zayed Mosque, Heritage Village, and Dates Market from Dubai.' },

  // Thailand - Phuket
  { id: 'a6', activityName: 'Phi Phi Island by Speedboat', destinationId: 'd2', activityType: 'Adventure', costAdult: 1400, costChild: 1000, ticketIncluded: true, transferIncluded: true, isActive: true, createdBy: 'u1', currency: 'THB', description: 'Includes lunch, snorkeling gear, and National Park fees.' },
  { id: 'a7', activityName: 'Phuket Fantasea Show', destinationId: 'd2', activityType: 'Show', costAdult: 1800, costChild: 1600, ticketIncluded: true, transferIncluded: true, isActive: true, createdBy: 'u1', currency: 'THB', description: 'Show + Buffet Dinner, Seat Upgrade available.' },
  { id: 'a8', activityName: 'James Bond Island by Big Boat', destinationId: 'd2', activityType: 'Adventure', costAdult: 1200, costChild: 900, ticketIncluded: true, transferIncluded: true, isActive: true, createdBy: 'u1', currency: 'THB', description: 'Scenic bay cruise with canoeing and lunch.' },

  // Thailand - Bangkok
  { id: 'a9', activityName: 'Chao Phraya Dinner Cruise', destinationId: 'd3', activityType: 'Cruise', costAdult: 900, costChild: 700, ticketIncluded: true, transferIncluded: true, isActive: true, createdBy: 'u1', currency: 'THB', description: 'International buffet with live music.' },
  { id: 'a10', activityName: 'Safari World & Marine Park', destinationId: 'd3', activityType: 'Theme Park', costAdult: 1100, costChild: 900, ticketIncluded: true, transferIncluded: true, isActive: true, createdBy: 'u1', currency: 'THB', description: 'Full day pass with lunch buffet.' },

  // Thailand - Pattaya
  { id: 'a11', activityName: 'Coral Island Tour (Koh Larn)', destinationId: 'd5', activityType: 'Adventure', costAdult: 500, costChild: 400, ticketIncluded: true, transferIncluded: true, isActive: true, createdBy: 'u1', currency: 'THB', description: 'Speedboat transfer with Indian Lunch.' },
  { id: 'a12', activityName: 'Alcazar Cabaret Show', destinationId: 'd5', activityType: 'Show', costAdult: 600, costChild: 500, ticketIncluded: true, transferIncluded: true, isActive: true, createdBy: 'u1', currency: 'THB', description: 'Standard seat tickets.' },
  { id: 'a13', activityName: 'Nong Nooch Tropical Garden', destinationId: 'd5', activityType: 'City Tour', costAdult: 800, costChild: 600, ticketIncluded: true, transferIncluded: true, isActive: true, createdBy: 'u1', currency: 'THB', description: 'Entry with Cultural Show and Elephant Show.' },

  // Thailand - Krabi
  { id: 'a14', activityName: '4 Island Tour by Speedboat', destinationId: 'd6', activityType: 'Adventure', costAdult: 900, costChild: 700, ticketIncluded: true, transferIncluded: true, isActive: true, createdBy: 'u1', currency: 'THB', description: 'Visit Poda Island, Chicken Island, Tup Island and Phra Nang Cave.' },

  // Vietnam - Ha Noi
  { id: 'a15', activityName: 'Ha Noi City Tour', destinationId: 'd7', activityType: 'City Tour', costAdult: 45, costChild: 30, ticketIncluded: true, transferIncluded: true, isActive: true, createdBy: 'u1', currency: 'USD', description: 'Full day tour visiting Ho Chi Minh Mausoleum, One Pillar Pagoda, and Old Quarter.' },
  { id: 'a17', activityName: 'Water Puppet Show', destinationId: 'd7', activityType: 'Show', costAdult: 15, costChild: 15, ticketIncluded: true, transferIncluded: false, isActive: true, createdBy: 'u1', currency: 'USD', description: 'Traditional performance tickets.' },

  // Vietnam - Ha Long
  { id: 'a18', activityName: 'Ha Long Bay Day Cruise', destinationId: 'd8', activityType: 'Cruise', costAdult: 60, costChild: 40, ticketIncluded: true, transferIncluded: true, isActive: true, createdBy: 'u1', currency: 'USD', description: '6-hour cruise with seafood lunch and kayaking.' },

  // Vietnam - Da Nang
  { id: 'a19', activityName: 'Ba Na Hills & Golden Bridge', destinationId: 'd9', activityType: 'City Tour', costAdult: 75, costChild: 60, ticketIncluded: true, transferIncluded: true, isActive: true, createdBy: 'u1', currency: 'USD', description: 'Cable car, French Village, and Golden Bridge visit with buffet lunch.' },

  // Vietnam - HCMC
  { id: 'a20', activityName: 'Cu Chi Tunnels', destinationId: 'd10', activityType: 'City Tour', costAdult: 35, costChild: 25, ticketIncluded: true, transferIncluded: true, isActive: true, createdBy: 'u1', currency: 'USD', description: 'Half day tour to the historic tunnels.' },
  { id: 'a21', activityName: 'Mekong Delta Day Trip', destinationId: 'd10', activityType: 'Adventure', costAdult: 40, costChild: 30, ticketIncluded: true, transferIncluded: true, isActive: true, createdBy: 'u1', currency: 'USD', description: 'Boat trip, local village visit, and lunch.' },
];

const INITIAL_TRANSFERS: Transfer[] = [
  // UAE
  { id: 't1', transferName: 'DXB Airport to Hotel (Deira/Bur Dubai)', destinationId: 'd1', transferType: 'PVT', vehicleType: 'Sedan', maxPassengers: 3, cost: 85, costBasis: 'Per Vehicle', nightSurcharge: 20, isActive: true, createdBy: 'u1', currency: 'AED' },
  { id: 't2', transferName: 'DXB Airport to Hotel (Marina/Palm)', destinationId: 'd1', transferType: 'PVT', vehicleType: 'Minivan', maxPassengers: 6, cost: 160, costBasis: 'Per Vehicle', nightSurcharge: 30, isActive: true, createdBy: 'u1', currency: 'AED' },
  { id: 't4', transferName: 'AUH Airport to Abu Dhabi City', destinationId: 'd4', transferType: 'PVT', vehicleType: 'Sedan', maxPassengers: 3, cost: 120, costBasis: 'Per Vehicle', nightSurcharge: 20, isActive: true, createdBy: 'u1', currency: 'AED' },
  { id: 't5', transferName: 'Dubai Hotel to Abu Dhabi City Tour', destinationId: 'd1', transferType: 'PVT', vehicleType: 'SUV', maxPassengers: 6, cost: 500, costBasis: 'Per Vehicle', nightSurcharge: 0, isActive: true, createdBy: 'u1', currency: 'AED' },

  // Thailand - Phuket
  { id: 't3', transferName: 'HKT Airport - Patong/Kata/Karon', destinationId: 'd2', transferType: 'PVT', vehicleType: 'Van', maxPassengers: 9, cost: 800, costBasis: 'Per Vehicle', nightSurcharge: 200, isActive: true, createdBy: 'u1', currency: 'THB' },
  
  // Thailand - Bangkok
  { id: 't6', transferName: 'BKK/DMK Airport - Bangkok Hotel', destinationId: 'd3', transferType: 'PVT', vehicleType: 'Sedan', maxPassengers: 3, cost: 900, costBasis: 'Per Vehicle', nightSurcharge: 200, isActive: true, createdBy: 'u1', currency: 'THB' },
  { id: 't7', transferName: 'Bangkok Hotel - Pattaya Hotel', destinationId: 'd3', transferType: 'PVT', vehicleType: 'Sedan', maxPassengers: 3, cost: 1500, costBasis: 'Per Vehicle', nightSurcharge: 300, isActive: true, createdBy: 'u1', currency: 'THB' },

  // Thailand - Pattaya
  { id: 't8', transferName: 'UTP Airport - Pattaya Hotel', destinationId: 'd5', transferType: 'PVT', vehicleType: 'Van', maxPassengers: 9, cost: 1200, costBasis: 'Per Vehicle', nightSurcharge: 200, isActive: true, createdBy: 'u1', currency: 'THB' },

  // Thailand - Krabi
  { id: 't9', transferName: 'KBV Airport - Ao Nang Hotel', destinationId: 'd6', transferType: 'PVT', vehicleType: 'Sedan', maxPassengers: 3, cost: 600, costBasis: 'Per Vehicle', nightSurcharge: 150, isActive: true, createdBy: 'u1', currency: 'THB' },

  // Vietnam
  { id: 't10', transferName: 'Noi Bai Airport (HAN) - Hanoi Center', destinationId: 'd7', transferType: 'PVT', vehicleType: 'Sedan', maxPassengers: 3, cost: 25, costBasis: 'Per Vehicle', nightSurcharge: 5, isActive: true, createdBy: 'u1', currency: 'USD' },
  { id: 't11', transferName: 'Hanoi - Ha Long Bay', destinationId: 'd7', transferType: 'SIC', vehicleType: 'Limousine Bus', maxPassengers: 1, cost: 15, costBasis: 'Per Person', nightSurcharge: 0, isActive: true, createdBy: 'u1', currency: 'USD' },
  { id: 't12', transferName: 'Da Nang Airport (DAD) - Hotel', destinationId: 'd9', transferType: 'PVT', vehicleType: 'SUV', maxPassengers: 4, cost: 20, costBasis: 'Per Vehicle', nightSurcharge: 5, isActive: true, createdBy: 'u1', currency: 'USD' },
  { id: 't13', transferName: 'Tan Son Nhat Airport (SGN) - D1 Hotel', destinationId: 'd10', transferType: 'PVT', vehicleType: 'Sedan', maxPassengers: 3, cost: 22, costBasis: 'Per Vehicle', nightSurcharge: 5, isActive: true, createdBy: 'u1', currency: 'USD' },
];

const INITIAL_VISAS: Visa[] = [
  { id: 'v1', country: 'UAE', visaType: 'Tourist (30 Days)', processingTime: '2-3 Working Days', cost: 90, documentsRequired: ['Passport Copy (Front & Back)', 'Passport Size Photo'], isActive: true, createdBy: 'u1' },
  { id: 'v2', country: 'Thailand', visaType: 'Tourist Sticker Visa', processingTime: '4-5 Working Days', cost: 55, documentsRequired: ['Original Passport', 'Bank Statement', 'Flight Tickets', 'Hotel Voucher'], isActive: true, createdBy: 'u1' },
  { id: 'v3', country: 'Singapore', visaType: 'E-Visa', processingTime: '3 Working Days', cost: 45, documentsRequired: ['Form 14A', 'Photo', 'Passport Copy'], isActive: true, createdBy: 'u1' },
  { id: 'v4', country: 'Vietnam', visaType: 'E-Visa (30 Days)', processingTime: '3-4 Working Days', cost: 35, documentsRequired: ['Passport Scan', 'Photo'], isActive: true, createdBy: 'u1' },
];

const INITIAL_PACKAGES: FixedPackage[] = [
  {
    id: 'p1',
    packageName: 'Dubai Super Saver',
    destinationId: 'd1',
    nights: 4,
    inclusions: ['4 Nights Stay in 3 Star Hotel', 'Daily Breakfast', 'Airport Transfers', 'Half Day City Tour'],
    exclusions: ['Visa Charges', 'Personal Expenses', 'Flight Tickets'],
    fixedPrice: 299,
    validDates: ['2023-11-15', '2023-11-20', '2023-12-05'],
    isActive: true,
    createdBy: 'u1'
  },
  {
    id: 'p2',
    packageName: 'Phuket Beach Escape',
    destinationId: 'd2',
    nights: 5,
    inclusions: ['5 Nights Resort Stay', 'Welcome Drink', 'Phi Phi Island Tour', 'Airport Transfers'],
    exclusions: ['National Park Fees', 'Lunch & Dinner'],
    fixedPrice: 450,
    validDates: ['2023-12-10', '2024-01-15'],
    isActive: true,
    createdBy: 'u1'
  },
  {
    id: 'p3',
    packageName: 'Best of Vietnam (HAN-HAL-SGN)',
    destinationId: 'd7',
    nights: 7,
    inclusions: ['7 Nights Accommodation', 'Ha Long Overnight Cruise', 'Domestic Flights', 'City Tours'],
    exclusions: ['International Flights', 'Visa', 'Tips'],
    fixedPrice: 850,
    validDates: ['2024-02-10', '2024-03-15'],
    isActive: true,
    createdBy: 'u1'
  }
];

const INITIAL_PRICING: PricingRule = {
  id: 'global_rule',
  name: 'Standard B2B Pricing',
  markupType: 'Percentage',
  companyMarkup: 10,
  agentMarkup: 5,
  gstPercentage: 5,
  roundOff: 'Nearest 10',
  isActive: true
};

const STORAGE_KEYS = {
  DESTINATIONS: 'iht_cms_destinations',
  HOTELS: 'iht_cms_hotels',
  PRICING: 'iht_cms_pricing',
  TRANSFERS: 'iht_cms_transfers',
  ACTIVITIES: 'iht_cms_activities',
  VISAS: 'iht_cms_visas',
  PACKAGES: 'iht_cms_packages',
  TEMPLATES: 'iht_cms_templates',
  USERS: 'iht_users_db' // Shared with AuthService
};

class AdminService {
  // --- USER MANAGEMENT (ADMIN ONLY) ---
  getUsers(): User[] {
    const stored = localStorage.getItem(STORAGE_KEYS.USERS);
    // Merge mock users if storage is empty to ensure initial state
    return stored ? JSON.parse(stored) : [...MOCK_USERS];
  }

  saveUser(user: User) {
    const list = this.getUsers();
    const index = list.findIndex(u => u.id === user.id);
    
    if (index >= 0) {
      list[index] = user;
    } else {
      // Create new user (Simulated)
      const newUser = {
        ...user,
        id: user.id || `u${Date.now()}`,
        isVerified: true, // Admin created users are auto-verified
        // Assign Unique ID if not present
        uniqueId: user.uniqueId || idGeneratorService.generateUniqueId(user.role)
      };
      list.push(newUser);
    }
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(list));
  }

  deleteUser(userId: string) {
    const list = this.getUsers().filter(u => u.id !== userId);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(list));
  }

  // --- INVENTORY MANAGEMENT ---

  // Destinations
  getDestinations(): Destination[] {
    const stored = localStorage.getItem(STORAGE_KEYS.DESTINATIONS);
    return stored ? JSON.parse(stored) : INITIAL_DESTINATIONS;
  }

  saveDestination(dest: Destination) {
    const list = this.getDestinations();
    const index = list.findIndex(d => d.id === dest.id);
    if (index >= 0) list[index] = dest;
    else list.push({ ...dest, id: dest.id || `d_${Date.now()}` });
    localStorage.setItem(STORAGE_KEYS.DESTINATIONS, JSON.stringify(list));
  }

  deleteDestination(id: string) {
    const list = this.getDestinations().filter(d => d.id !== id);
    localStorage.setItem(STORAGE_KEYS.DESTINATIONS, JSON.stringify(list));
  }

  // Hotels
  getHotels(): Hotel[] {
    const stored = localStorage.getItem(STORAGE_KEYS.HOTELS);
    return stored ? JSON.parse(stored) : INITIAL_HOTELS;
  }

  saveHotel(hotel: Hotel) {
    const list = this.getHotels();
    const index = list.findIndex(h => h.id === hotel.id);
    if (index >= 0) list[index] = hotel;
    else list.push({ ...hotel, id: hotel.id || `h_${Date.now()}` });
    localStorage.setItem(STORAGE_KEYS.HOTELS, JSON.stringify(list));
  }

  deleteHotel(id: string) {
    const list = this.getHotels().filter(h => h.id !== id);
    localStorage.setItem(STORAGE_KEYS.HOTELS, JSON.stringify(list));
  }

  // Activities
  getActivities(): Activity[] {
    const stored = localStorage.getItem(STORAGE_KEYS.ACTIVITIES);
    return stored ? JSON.parse(stored) : INITIAL_ACTIVITIES;
  }

  saveActivity(activity: Activity) {
    const list = this.getActivities();
    const index = list.findIndex(a => a.id === activity.id);
    if (index >= 0) list[index] = activity;
    else list.push({ ...activity, id: activity.id || `a_${Date.now()}` });
    localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(list));
  }

  deleteActivity(id: string) {
    const list = this.getActivities().filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(list));
  }

  // Transfers
  getTransfers(): Transfer[] {
    const stored = localStorage.getItem(STORAGE_KEYS.TRANSFERS);
    return stored ? JSON.parse(stored) : INITIAL_TRANSFERS;
  }

  saveTransfer(transfer: Transfer) {
    const list = this.getTransfers();
    const index = list.findIndex(t => t.id === transfer.id);
    if (index >= 0) list[index] = transfer;
    else list.push({ ...transfer, id: transfer.id || `t_${Date.now()}` });
    localStorage.setItem(STORAGE_KEYS.TRANSFERS, JSON.stringify(list));
  }

  deleteTransfer(id: string) {
    const list = this.getTransfers().filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TRANSFERS, JSON.stringify(list));
  }

  // Visas
  getVisas(): Visa[] {
    const stored = localStorage.getItem(STORAGE_KEYS.VISAS);
    return stored ? JSON.parse(stored) : INITIAL_VISAS;
  }

  saveVisa(visa: Visa) {
    const list = this.getVisas();
    const index = list.findIndex(v => v.id === visa.id);
    if (index >= 0) list[index] = visa;
    else list.push({ ...visa, id: visa.id || `v_${Date.now()}` });
    localStorage.setItem(STORAGE_KEYS.VISAS, JSON.stringify(list));
  }

  deleteVisa(id: string) {
    const list = this.getVisas().filter(v => v.id !== id);
    localStorage.setItem(STORAGE_KEYS.VISAS, JSON.stringify(list));
  }

  // Fixed Packages
  getFixedPackages(): FixedPackage[] {
    const stored = localStorage.getItem(STORAGE_KEYS.PACKAGES);
    return stored ? JSON.parse(stored) : INITIAL_PACKAGES;
  }

  saveFixedPackage(pkg: FixedPackage) {
    const list = this.getFixedPackages();
    const index = list.findIndex(p => p.id === pkg.id);
    if (index >= 0) list[index] = pkg;
    else list.push({ ...pkg, id: pkg.id || `p_${Date.now()}` });
    localStorage.setItem(STORAGE_KEYS.PACKAGES, JSON.stringify(list));
  }

  deleteFixedPackage(id: string) {
    const list = this.getFixedPackages().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PACKAGES, JSON.stringify(list));
  }

  // System Templates (CRUD)
  getSystemTemplates(): ItineraryTemplate[] {
    const stored = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    return stored ? JSON.parse(stored) : INITIAL_TEMPLATES;
  }

  saveSystemTemplate(template: ItineraryTemplate) {
    const list = this.getSystemTemplates();
    const index = list.findIndex(t => t.id === template.id);
    if (index >= 0) list[index] = template;
    else list.push({ ...template, id: template.id || `tpl_${Date.now()}` });
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(list));
  }

  deleteSystemTemplate(id: string) {
    const list = this.getSystemTemplates().filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(list));
  }

  // Pricing
  getPricingRule(): PricingRule {
    const stored = localStorage.getItem(STORAGE_KEYS.PRICING);
    return stored ? JSON.parse(stored) : INITIAL_PRICING;
  }

  savePricingRule(rule: PricingRule) {
    localStorage.setItem(STORAGE_KEYS.PRICING, JSON.stringify(rule));
  }
}

export const adminService = new AdminService();
