
import { Destination, Hotel, PricingRule, Transfer, Activity, Visa, FixedPackage, User, UserRole, ItineraryTemplate } from '../types';
import { MOCK_USERS } from '../constants';
import { INITIAL_TEMPLATES } from '../data/itineraryTemplates';
import { idGeneratorService } from './idGenerator';
import { db } from './firebase'; // Import Firebase DB
import { doc, setDoc, deleteDoc } from 'firebase/firestore'; // Firestore functions

// Mock Initial Data
const INITIAL_DESTINATIONS: Destination[] = [
  // India
  { id: 'd11', country: 'India', city: 'Delhi', currency: 'INR', timezone: 'GMT+5:30', isActive: true, createdBy: 'u1' },

  // UAE (Updated to INR)
  { id: 'd1', country: 'UAE', city: 'Dubai', currency: 'INR', timezone: 'GMT+4', isActive: true, createdBy: 'u1' },
  { id: 'd4', country: 'UAE', city: 'Abu Dhabi', currency: 'INR', timezone: 'GMT+4', isActive: true, createdBy: 'u1' },
  
  // Thailand (Updated to INR)
  { id: 'd2', country: 'Thailand', city: 'Phuket', currency: 'INR', timezone: 'GMT+7', isActive: true, createdBy: 'u1' },
  { id: 'd3', country: 'Thailand', city: 'Bangkok', currency: 'INR', timezone: 'GMT+7', isActive: true, createdBy: 'u1' },
  { id: 'd5', country: 'Thailand', city: 'Pattaya', currency: 'INR', timezone: 'GMT+7', isActive: true, createdBy: 'u1' },
  { id: 'd6', country: 'Thailand', city: 'Krabi', currency: 'INR', timezone: 'GMT+7', isActive: true, createdBy: 'u1' },

  // Vietnam (Updated to INR)
  { id: 'd7', country: 'Vietnam', city: 'Ha Noi', currency: 'INR', timezone: 'GMT+7', isActive: true, createdBy: 'u1' },
  { id: 'd8', country: 'Vietnam', city: 'Ha Long Bay', currency: 'INR', timezone: 'GMT+7', isActive: true, createdBy: 'u1' },
  { id: 'd9', country: 'Vietnam', city: 'Da Nang', currency: 'INR', timezone: 'GMT+7', isActive: true, createdBy: 'u1' },
  { id: 'd10', country: 'Vietnam', city: 'Ho Chi Minh City', currency: 'INR', timezone: 'GMT+7', isActive: true, createdBy: 'u1' },
];

const INITIAL_HOTELS: Hotel[] = [
  // India - Delhi
  { id: 'h_del_taj', name: 'Taj Palace', destinationId: 'd11', category: 'Luxury', roomType: 'Superior Room', mealPlan: 'BB', cost: 12000, costType: 'Per Room', season: 'Peak', validFrom: '2023-01-01', validTo: '2025-12-31', isActive: true, createdBy: 'u1', currency: 'INR' },
  { 
    id: 'h_dxb_marina', name: 'Marina Byblos', destinationId: 'd1', category: '4 Star', roomType: 'Deluxe Room', mealPlan: 'BB', cost: 8500, costType: 'Per Room', season: 'Peak', validFrom: '2023-01-01', validTo: '2025-12-31', isActive: true, createdBy: 'u1', currency: 'INR',
    description: 'Located in Dubai Marina with easy access to JBR Beach.',
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=400'
  },
  { id: 'h_dxb_atlantis', name: 'Atlantis The Palm', destinationId: 'd1', category: 'Luxury', roomType: 'Ocean King', mealPlan: 'HB', cost: 45000, costType: 'Per Room', season: 'Peak', validFrom: '2023-01-01', validTo: '2025-12-31', isActive: true, createdBy: 'u1', currency: 'INR' },
  { id: 'h_hkt_grace', name: 'Phuket Graceland', destinationId: 'd2', category: '4 Star', roomType: 'Superior', mealPlan: 'BB', cost: 6000, costType: 'Per Room', season: 'Off-Peak', validFrom: '2023-01-01', validTo: '2025-12-31', isActive: true, createdBy: 'u1', currency: 'INR' }
];

const INITIAL_ACTIVITIES: Activity[] = [
  { 
    id: 'a_dxb_safari', 
    activityName: 'Desert Safari', 
    destinationId: 'd1', 
    activityType: 'Adventure', 
    costAdult: 3500, 
    costChild: 2500, 
    ticketIncluded: true, 
    transferIncluded: true, 
    isActive: true, 
    createdBy: 'u1', 
    currency: 'INR', 
    description: 'Dune bashing, BBQ dinner', 
    duration: '6 Hours', 
    startTime: '3:00 PM',
    imageUrl: 'https://images.unsplash.com/photo-1547234935-80c7142ee969?auto=format&fit=crop&q=80&w=400',
    season: 'All Year',
    validFrom: '2024-01-01',
    validTo: '2025-12-31'
  },
  { 
    id: 'a_dxb_burj', 
    activityName: 'Burj Khalifa 124th Floor', 
    destinationId: 'd1', 
    activityType: 'City Tour', 
    costAdult: 4500, 
    costChild: 3500, 
    ticketIncluded: true, 
    transferIncluded: false, 
    isActive: true, 
    createdBy: 'u1', 
    currency: 'INR', 
    description: 'Non-prime hours ticket',
    duration: '2 Hours',
    startTime: 'Flexible',
    imageUrl: 'https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?auto=format&fit=crop&q=80&w=400',
    season: 'All Year',
    validFrom: '2024-01-01',
    validTo: '2025-12-31'
  },
  { 
    id: 'a_hkt_phiphi', 
    activityName: 'Phi Phi Island Tour', 
    destinationId: 'd2', 
    activityType: 'Adventure', 
    costAdult: 4000, 
    costChild: 3000, 
    ticketIncluded: true, 
    transferIncluded: true, 
    isActive: true, 
    createdBy: 'u1', 
    currency: 'INR', 
    description: 'By Speedboat + Lunch',
    duration: 'Full Day',
    startTime: '8:00 AM',
    imageUrl: 'https://images.unsplash.com/photo-1537956965359-3578dddd1292?auto=format&fit=crop&q=80&w=400',
    season: 'Peak',
    validFrom: '2024-11-01',
    validTo: '2025-04-30'
  }
];

const INITIAL_TRANSFERS: Transfer[] = [
  { 
    id: 't_dxb_arr_pvt', 
    transferName: 'DXB Airport Arrival', 
    destinationId: 'd1', 
    transferType: 'PVT', 
    vehicleType: 'Sedan', 
    maxPassengers: 3, 
    cost: 2500, 
    currency: 'INR', 
    costBasis: 'Per Vehicle', 
    nightSurcharge: 500, 
    isActive: true, 
    createdBy: 'u1',
    luggageCapacity: 2,
    meetingPoint: 'Arrival Hall, Pillar 5',
    imageUrl: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=400',
    season: 'All Year',
    validFrom: '2024-01-01',
    validTo: '2025-12-31'
  },
  { 
    id: 't_hkt_arr_van', 
    transferName: 'HKT Airport Arrival', 
    destinationId: 'd2', 
    transferType: 'PVT', 
    vehicleType: 'Van', 
    maxPassengers: 8, 
    cost: 3000, 
    currency: 'INR', 
    costBasis: 'Per Vehicle', 
    nightSurcharge: 800, 
    isActive: true, 
    createdBy: 'u1',
    luggageCapacity: 6,
    meetingPoint: 'Exit Gate 2',
    imageUrl: 'https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?auto=format&fit=crop&q=80&w=400',
    season: 'All Year',
    validFrom: '2024-01-01',
    validTo: '2025-12-31'
  }
];

const INITIAL_VISAS: Visa[] = [
  { 
    id: 'v_uae_30', 
    country: 'UAE', 
    visaType: 'Tourist 30 Days', 
    processingTime: '2-3 Days', 
    cost: 7000, 
    documentsRequired: ['Passport Front/Back', 'Photo'], 
    isActive: true, 
    createdBy: 'u1',
    validity: '30 Days from Entry',
    entryType: 'Single'
  },
  { id: 'v_thai_evisa', country: 'Thailand', visaType: 'E-Visa', processingTime: '4-5 Days', cost: 4500, documentsRequired: ['Passport', 'Flight Ticket', 'Hotel Voucher'], isActive: true, createdBy: 'u1' }
];

const INITIAL_PRICING_RULE: PricingRule = {
  id: 'pr_default',
  name: 'Default',
  markupType: 'Percentage',
  companyMarkup: 10,
  agentMarkup: 10,
  gstPercentage: 5,
  roundOff: 'Nearest 10',
  baseCurrency: 'INR', // Explicitly set Base to INR for this region to match inventory
  isActive: true
};

const INITIAL_PACKAGES: FixedPackage[] = [
  {
    id: 'fp_dxb_saver', 
    packageName: 'Dubai Super Saver', 
    destinationId: 'd1', 
    nights: 4, 
    inclusions: ['4N Stay', 'Airport Transfers', 'City Tour', 'Desert Safari'], 
    exclusions: ['Flights', 'Visa', 'Tourism Dirham'], 
    fixedPrice: 35000, 
    validDates: ['2023-11-15', '2023-12-05'], 
    isActive: true, 
    createdBy: 'u1',
    description: 'A budget friendly package covering all essentials.',
    category: 'Budget'
  }
];

// Local Storage Keys
const KEYS = {
  DESTINATIONS: 'iht_destinations',
  HOTELS: 'iht_hotels',
  ACTIVITIES: 'iht_activities',
  TRANSFERS: 'iht_transfers',
  VISAS: 'iht_visas',
  PRICING: 'iht_pricing_rules',
  PACKAGES: 'iht_fixed_packages',
  USERS: 'iht_users_db', // Shared with Auth Service
  TEMPLATES: 'iht_system_templates'
};

class AdminService {
  
  /**
   * Enhanced Getter that merges Stored Data with Code Defaults.
   * This ensures new code deployments (adding new default hotels/tours) appear
   * without deleting or overwriting user-modified data.
   */
  private getData<T extends { id: string }>(key: string, defaults: T[]): T[] {
    const stored = localStorage.getItem(key);
    if (!stored) return defaults;

    try {
        const storedData = JSON.parse(stored) as T[];
        const storedIds = new Set(storedData.map(item => item.id));
        
        // Find defaults that are NOT in storage (newly added in code)
        const newDefaults = defaults.filter(d => !storedIds.has(d.id));
        
        // Return Stored Data + New Code Defaults
        return [...storedData, ...newDefaults];
    } catch (e) {
        console.error("Error parsing storage", e);
        return defaults;
    }
  }

  // Generic Setter
  private saveData<T>(key: string, data: T[]) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // --- DESTINATIONS ---
  getDestinations(): Destination[] {
    return this.getData<Destination>(KEYS.DESTINATIONS, INITIAL_DESTINATIONS);
  }
  saveDestination(dest: Destination) {
    const list = this.getDestinations();
    if (!dest.id) dest.id = idGeneratorService.generateUniqueId(UserRole.ADMIN); // Fallback ID logic
    const index = list.findIndex(d => d.id === dest.id);
    if (index >= 0) list[index] = dest;
    else list.push({ ...dest, id: dest.id || `d_${Date.now()}` });
    this.saveData(KEYS.DESTINATIONS, list);
  }
  deleteDestination(id: string) {
    const list = this.getDestinations().filter(d => d.id !== id);
    this.saveData(KEYS.DESTINATIONS, list);
  }

  // --- HOTELS ---
  getHotels(): Hotel[] {
    return this.getData<Hotel>(KEYS.HOTELS, INITIAL_HOTELS);
  }
  saveHotel(hotel: Hotel) {
    const list = this.getHotels();
    const index = list.findIndex(h => h.id === hotel.id);
    if (index >= 0) list[index] = hotel;
    else list.push({ ...hotel, id: hotel.id || `h_${Date.now()}` });
    this.saveData(KEYS.HOTELS, list);
  }
  deleteHotel(id: string) {
    this.saveData(KEYS.HOTELS, this.getHotels().filter(h => h.id !== id));
  }

  // --- ACTIVITIES ---
  getActivities(): Activity[] {
    return this.getData<Activity>(KEYS.ACTIVITIES, INITIAL_ACTIVITIES);
  }
  saveActivity(activity: Activity) {
    const list = this.getActivities();
    const index = list.findIndex(a => a.id === activity.id);
    if (index >= 0) list[index] = activity;
    else list.push({ ...activity, id: activity.id || `a_${Date.now()}` });
    this.saveData(KEYS.ACTIVITIES, list);
  }
  deleteActivity(id: string) {
    this.saveData(KEYS.ACTIVITIES, this.getActivities().filter(a => a.id !== id));
  }

  // --- TRANSFERS ---
  getTransfers(): Transfer[] {
    return this.getData<Transfer>(KEYS.TRANSFERS, INITIAL_TRANSFERS);
  }
  saveTransfer(transfer: Transfer) {
    const list = this.getTransfers();
    const index = list.findIndex(t => t.id === transfer.id);
    if (index >= 0) list[index] = transfer;
    else list.push({ ...transfer, id: transfer.id || `t_${Date.now()}` });
    this.saveData(KEYS.TRANSFERS, list);
  }
  deleteTransfer(id: string) {
    this.saveData(KEYS.TRANSFERS, this.getTransfers().filter(t => t.id !== id));
  }

  // --- VISAS ---
  getVisas(): Visa[] {
    return this.getData<Visa>(KEYS.VISAS, INITIAL_VISAS);
  }
  saveVisa(visa: Visa) {
    const list = this.getVisas();
    const index = list.findIndex(v => v.id === visa.id);
    if (index >= 0) list[index] = visa;
    else list.push({ ...visa, id: visa.id || `v_${Date.now()}` });
    this.saveData(KEYS.VISAS, list);
  }
  deleteVisa(id: string) {
    this.saveData(KEYS.VISAS, this.getVisas().filter(v => v.id !== id));
  }

  // --- FIXED PACKAGES ---
  getFixedPackages(): FixedPackage[] {
    return this.getData<FixedPackage>(KEYS.PACKAGES, INITIAL_PACKAGES);
  }
  saveFixedPackage(pkg: FixedPackage) {
    const list = this.getFixedPackages();
    const index = list.findIndex(p => p.id === pkg.id);
    if (index >= 0) list[index] = pkg;
    else list.push({ ...pkg, id: pkg.id || `pkg_${Date.now()}` });
    this.saveData(KEYS.PACKAGES, list);
  }
  deleteFixedPackage(id: string) {
    this.saveData(KEYS.PACKAGES, this.getFixedPackages().filter(p => p.id !== id));
  }

  // --- SYSTEM TEMPLATES ---
  getSystemTemplates(): ItineraryTemplate[] {
    return this.getData<ItineraryTemplate>(KEYS.TEMPLATES, INITIAL_TEMPLATES);
  }
  saveSystemTemplate(template: ItineraryTemplate) {
    const list = this.getSystemTemplates();
    const index = list.findIndex(t => t.id === template.id);
    if (index >= 0) list[index] = template;
    else list.push({ ...template, id: template.id || `tpl_${Date.now()}` });
    this.saveData(KEYS.TEMPLATES, list);
  }
  deleteSystemTemplate(id: string) {
    this.saveData(KEYS.TEMPLATES, this.getSystemTemplates().filter(t => t.id !== id));
  }

  // --- PRICING RULE ---
  getPricingRule(): PricingRule {
    const stored = localStorage.getItem(KEYS.PRICING);
    if (stored) {
        const parsed = JSON.parse(stored);
        if (!parsed.baseCurrency) {
            parsed.baseCurrency = 'INR';
        }
        return parsed;
    }
    return INITIAL_PRICING_RULE;
  }
  savePricingRule(rule: PricingRule) {
    localStorage.setItem(KEYS.PRICING, JSON.stringify(rule));
  }

  // --- USERS (Sync with Auth Service) ---
  // Note: AuthService manages MOCK_USERS initialization logic
  getUsers(): User[] {
    const stored = localStorage.getItem(KEYS.USERS);
    // Merge with constants if empty or just return constants for safety if LS is cleared
    // In a real app, this comes from API
    if (!stored) return MOCK_USERS;
    
    // Ensure mock users are present if local storage is fresh
    const users: User[] = JSON.parse(stored);
    const existingIds = new Set(users.map(u => u.id));
    const missingMocks = MOCK_USERS.filter(u => !existingIds.has(u.id));
    return [...missingMocks, ...users];
  }

  saveUser(user: Partial<User>) {
    const list = this.getUsers();
    const index = list.findIndex(u => u.id === user.id);
    
    let userToSave: User;

    if (index >= 0) {
      userToSave = { ...list[index], ...user } as User;
      list[index] = userToSave;
    } else {
      // New User
      const role = user.role || UserRole.AGENT;
      const uniqueId = idGeneratorService.generateUniqueId(role);
      
      userToSave = {
        id: user.id || `u_${Date.now()}`,
        uniqueId,
        name: user.name || 'New User',
        email: user.email || '',
        role: role,
        isVerified: user.isVerified !== undefined ? user.isVerified : true,
        status: user.status || 'ACTIVE',
        joinedAt: new Date().toISOString(),
        ...user
      } as User;
      list.push(userToSave);
    }
    
    localStorage.setItem(KEYS.USERS, JSON.stringify(list));

    // CRITICAL: Pre-provision role in Firestore so Auth Service picks it up on new device
    // We store minimal role data keyed by EMAIL, because we might not know the UID yet 
    // if the user hasn't registered in Firebase Auth but Admin created them here.
    if (userToSave.email) {
        const roleRef = doc(db, 'user_roles', userToSave.email.toLowerCase());
        setDoc(roleRef, {
            email: userToSave.email.toLowerCase(),
            role: userToSave.role,
            assignedDestinations: userToSave.assignedDestinations || [],
            permissions: userToSave.permissions || [],
            companyName: userToSave.companyName || '',
            updatedAt: new Date().toISOString()
        }, { merge: true }).catch(err => console.warn("Failed to sync role to cloud:", err));
    }
  }

  deleteUser(id: string) {
    const list = this.getUsers();
    const user = list.find(u => u.id === id);
    if (user && user.email) {
        // Remove role provisioning
        deleteDoc(doc(db, 'user_roles', user.email.toLowerCase())).catch(console.warn);
    }
    
    const filteredList = list.filter(u => u.id !== id);
    localStorage.setItem(KEYS.USERS, JSON.stringify(filteredList));
  }
}

export const adminService = new AdminService();
