
import { Destination, Hotel, PricingRule, Transfer, Activity, Visa, FixedPackage, User, UserRole, ItineraryTemplate } from '../types';
import { MOCK_USERS } from '../constants';
import { INITIAL_TEMPLATES } from '../data/itineraryTemplates';
import { idGeneratorService } from './idGenerator';
import { db } from './firebase'; 
import { doc, setDoc, deleteDoc, getDocs, collection, query } from 'firebase/firestore'; 

const INITIAL_DESTINATIONS: Destination[] = [
  { id: 'd11', country: 'India', city: 'Delhi', currency: 'INR', timezone: 'GMT+5:30', isActive: true, createdBy: 'u1' },
  { id: 'd1', country: 'UAE', city: 'Dubai', currency: 'INR', timezone: 'GMT+4', isActive: true, createdBy: 'u1' },
  { id: 'd4', country: 'UAE', city: 'Abu Dhabi', currency: 'INR', timezone: 'GMT+4', isActive: true, createdBy: 'u1' },
  { id: 'd2', country: 'Thailand', city: 'Phuket', currency: 'INR', timezone: 'GMT+7', isActive: true, createdBy: 'u1' },
  { id: 'd3', country: 'Thailand', city: 'Bangkok', currency: 'INR', timezone: 'GMT+7', isActive: true, createdBy: 'u1' },
  { id: 'd5', country: 'Thailand', city: 'Pattaya', currency: 'INR', timezone: 'GMT+7', isActive: true, createdBy: 'u1' },
  { id: 'd6', country: 'Thailand', city: 'Krabi', currency: 'INR', timezone: 'GMT+7', isActive: true, createdBy: 'u1' },
  { id: 'd7', country: 'Vietnam', city: 'Ha Noi', currency: 'INR', timezone: 'GMT+7', isActive: true, createdBy: 'u1' },
  { id: 'd8', country: 'Vietnam', city: 'Ha Long Bay', currency: 'INR', timezone: 'GMT+7', isActive: true, createdBy: 'u1' },
  { id: 'd9', country: 'Vietnam', city: 'Da Nang', currency: 'INR', timezone: 'GMT+7', isActive: true, createdBy: 'u1' },
  { id: 'd10', country: 'Vietnam', city: 'Ho Chi Minh City', currency: 'INR', timezone: 'GMT+7', isActive: true, createdBy: 'u1' }
];

const INITIAL_HOTELS: Hotel[] = [
  { id: 'h_del_taj', name: 'Taj Palace', destinationId: 'd11', category: 'Luxury', roomType: 'Superior Room', mealPlan: 'BB', cost: 12000, costType: 'Per Room', season: 'Peak', validFrom: '2023-01-01', validTo: '2025-12-31', isActive: true, createdBy: 'u1', currency: 'INR', description: 'Experience the grandeur of the Taj with world-class amenities.', imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=400' },
  { id: 'h_dxb_marina', name: 'Marina Byblos', destinationId: 'd1', category: '4 Star', roomType: 'Deluxe Room', mealPlan: 'BB', cost: 8500, costType: 'Per Room', season: 'Peak', validFrom: '2023-01-01', validTo: '2025-12-31', isActive: true, createdBy: 'u1', currency: 'INR', description: 'Located in Dubai Marina with easy access to JBR Beach.', imageUrl: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&q=80&w=400' },
  { id: 'h_dxb_atlantis', name: 'Atlantis The Palm', destinationId: 'd1', category: 'Luxury', roomType: 'Ocean King', mealPlan: 'HB', cost: 45000, costType: 'Per Room', season: 'Peak', validFrom: '2023-01-01', validTo: '2025-12-31', isActive: true, createdBy: 'u1', currency: 'INR', description: 'Iconic resort on the Palm Jumeirah.', imageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=400' },
  { id: 'h_hkt_grace', name: 'Phuket Graceland', destinationId: 'd2', category: '4 Star', roomType: 'Superior', mealPlan: 'BB', cost: 6000, costType: 'Per Room', season: 'Off-Peak', validFrom: '2023-01-01', validTo: '2025-12-31', isActive: true, createdBy: 'u1', currency: 'INR', description: 'Beachfront resort in Patong.', imageUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&q=80&w=400' }
];

const INITIAL_ACTIVITIES: Activity[] = [
    { id: 'act_dxb_safari', activityName: 'Desert Safari with BBQ Dinner', destinationId: 'd1', activityType: 'Adventure', costAdult: 2500, costChild: 2000, ticketIncluded: true, transferIncluded: true, isActive: true, createdBy: 'u1', currency: 'INR', duration: '6 Hours', season: 'All Year', description: 'Dune bashing, camel ride, henna painting, and buffet dinner.' },
    { id: 'act_dxb_burj', activityName: 'Burj Khalifa 124th Floor', destinationId: 'd1', activityType: 'City Tour', costAdult: 3500, costChild: 2800, ticketIncluded: true, transferIncluded: false, isActive: true, createdBy: 'u1', currency: 'INR', duration: '2 Hours', season: 'All Year', description: 'Non-prime hours entry ticket to At The Top.' },
    { id: 'act_hkt_phi', activityName: 'Phi Phi Island by Speedboat', destinationId: 'd2', activityType: 'Adventure', costAdult: 4000, costChild: 3000, ticketIncluded: true, transferIncluded: true, isActive: true, createdBy: 'u1', currency: 'INR', duration: 'Full Day', season: 'All Year', description: 'Visit Maya Bay, Monkey Beach with lunch included.' },
    { id: 'act_bkk_city', activityName: 'Bangkok City & Temple Tour', destinationId: 'd3', activityType: 'City Tour', costAdult: 1800, costChild: 1500, ticketIncluded: true, transferIncluded: true, isActive: true, createdBy: 'u1', currency: 'INR', duration: 'Half Day', season: 'All Year', description: 'Visit Golden Buddha and Marble Temple.' },
    { id: 'act_del_agra', activityName: 'Same Day Agra Tour', destinationId: 'd11', activityType: 'City Tour', costAdult: 6500, costChild: 6500, ticketIncluded: false, transferIncluded: true, isActive: true, createdBy: 'u1', currency: 'INR', duration: '12 Hours', season: 'All Year', description: 'Private car from Delhi to Taj Mahal and back.' }
];

const INITIAL_TRANSFERS: Transfer[] = [
    { id: 'tr_dxb_apt', transferName: 'DXB Airport to Hotel (PVT)', destinationId: 'd1', transferType: 'PVT', vehicleType: 'Sedan', maxPassengers: 3, cost: 2200, costBasis: 'Per Vehicle', nightSurcharge: 500, isActive: true, createdBy: 'u1', currency: 'INR', meetingPoint: 'Arrival Hall', season: 'All Year' },
    { id: 'tr_dxb_apt_van', transferName: 'DXB Airport to Hotel (Van)', destinationId: 'd1', transferType: 'PVT', vehicleType: 'HiAce Van', maxPassengers: 7, cost: 3500, costBasis: 'Per Vehicle', nightSurcharge: 500, isActive: true, createdBy: 'u1', currency: 'INR', meetingPoint: 'Arrival Hall', season: 'All Year' },
    { id: 'tr_hkt_apt', transferName: 'Phuket Airport to Patong', destinationId: 'd2', transferType: 'PVT', vehicleType: 'Sedan', maxPassengers: 3, cost: 1800, costBasis: 'Per Vehicle', nightSurcharge: 0, isActive: true, createdBy: 'u1', currency: 'INR', meetingPoint: 'Exit Gate 3', season: 'All Year' },
    { id: 'tr_del_apt', transferName: 'Delhi Airport to City Hotel', destinationId: 'd11', transferType: 'PVT', vehicleType: 'Sedan', maxPassengers: 3, cost: 1200, costBasis: 'Per Vehicle', nightSurcharge: 300, isActive: true, createdBy: 'u1', currency: 'INR', meetingPoint: 'Pillar 10', season: 'All Year' }
];

const INITIAL_VISAS: Visa[] = [
    { id: 'v_uae_30', country: 'UAE', visaType: 'Tourist Visa', processingTime: '2-3 Days', cost: 6500, documentsRequired: ['Passport', 'Photo'], isActive: true, createdBy: 'u1', validity: '30 Days', entryType: 'Single' },
    { id: 'v_thai_evisa', country: 'Thailand', visaType: 'E-Visa on Arrival', processingTime: '24 Hours', cost: 2500, documentsRequired: ['Passport', 'Ticket'], isActive: true, createdBy: 'u1', validity: '15 Days', entryType: 'Single' }
];

const INITIAL_PRICING_RULE: PricingRule = { id: 'pr_default', name: 'Default', markupType: 'Percentage', companyMarkup: 10, agentMarkup: 10, gstPercentage: 5, roundOff: 'Nearest 10', baseCurrency: 'INR', isActive: true };
const INITIAL_PACKAGES: FixedPackage[] = [];

// Local Storage Keys
const KEYS = {
  DESTINATIONS: 'iht_destinations',
  HOTELS: 'iht_hotels',
  ACTIVITIES: 'iht_activities',
  TRANSFERS: 'iht_transfers',
  VISAS: 'iht_visas',
  PRICING: 'iht_pricing_rules',
  PACKAGES: 'iht_fixed_packages',
  USERS: 'iht_users_db',
  TEMPLATES: 'iht_system_templates'
};

class AdminService {
  private isOffline = false;
  
  /**
   * Syncs all admin data from Firestore to LocalStorage.
   * Ensures app has data on load.
   */
  async syncAllFromCloud() {
      if (this.isOffline) return; // Circuit breaker

      console.log("🔄 Starting Cloud Sync...");
      try {
          await Promise.all([
              this.syncCollection('destinations', KEYS.DESTINATIONS),
              this.syncCollection('hotels', KEYS.HOTELS),
              this.syncCollection('activities', KEYS.ACTIVITIES),
              this.syncCollection('transfers', KEYS.TRANSFERS),
              this.syncCollection('visas', KEYS.VISAS),
              this.syncCollection('packages', KEYS.PACKAGES),
              this.syncCollection('users', KEYS.USERS),
              this.syncCollection('templates', KEYS.TEMPLATES)
          ]);
          console.log("✅ Cloud Sync Complete.");
      } catch (e: any) {
          this.handleSyncError(e);
      }
  }

  private handleSyncError(e: any) {
      if (e.code === 'permission-denied' || e.code === 'unavailable' || e.code === 'not-found' || e.message?.includes('permission-denied') || e.message?.includes('not-found')) {
          console.warn("⚠️ Backend unavailable (Offline Mode). Using local data.", e.message);
          this.isOffline = true;
      } else {
          console.warn("Sync Warning:", e);
      }
  }

  private async syncCollection(firestoreCol: string, localKey: string) {
      try {
          const q = query(collection(db, firestoreCol));
          const snapshot = await getDocs(q);
          const remoteData = snapshot.docs.map(doc => doc.data());
          
          if (remoteData.length > 0) {
              // Remote wins. Overwrite local to ensure consistency across devices.
              localStorage.setItem(localKey, JSON.stringify(remoteData));
          }
      } catch (e) {
          // Re-throw to trigger circuit breaker in parent
          throw e; 
      }
  }

  // Helper to save to BOTH Local and Cloud
  private async persist<T extends { id: string }>(key: string, collectionName: string, item: T) {
      // 1. Local Save (Immediate UI Update)
      const list = this.getData<T>(key, []);
      const index = list.findIndex(i => i.id === item.id);
      if (index >= 0) list[index] = item;
      else list.push(item);
      localStorage.setItem(key, JSON.stringify(list));

      // 2. Cloud Save (Persistence)
      if (!this.isOffline) {
          try {
              // Use Merge to protect against partial updates if schema evolves
              await setDoc(doc(db, collectionName, item.id), item, { merge: true });
          } catch (e: any) {
              this.handleSyncError(e);
          }
      }
  }

  private async remove(key: string, collectionName: string, id: string) {
      // 1. Local Delete
      const list = this.getData<any>(key, []).filter(i => i.id !== id);
      localStorage.setItem(key, JSON.stringify(list));

      // 2. Cloud Delete
      if (!this.isOffline) {
          try {
              await deleteDoc(doc(db, collectionName, id));
          } catch (e: any) {
              this.handleSyncError(e);
          }
      }
  }

  private getData<T extends { id: string }>(key: string, defaults: T[]): T[] {
    const stored = localStorage.getItem(key);
    if (!stored) return defaults;
    try {
        const storedData = JSON.parse(stored) as T[];
        // Only return defaults if local is explicitly empty AND defaults exist (bootstrap)
        return (storedData.length === 0 && defaults.length > 0) ? defaults : storedData;
    } catch (e) {
        return defaults;
    }
  }

  // --- DESTINATIONS ---
  getDestinations(): Destination[] { return this.getData<Destination>(KEYS.DESTINATIONS, INITIAL_DESTINATIONS); }
  saveDestination(dest: Destination) {
      if (!dest.id) dest.id = idGeneratorService.generateUniqueId(UserRole.ADMIN);
      this.persist(KEYS.DESTINATIONS, 'destinations', dest);
  }
  deleteDestination(id: string) { this.remove(KEYS.DESTINATIONS, 'destinations', id); }

  // --- HOTELS ---
  getHotels(): Hotel[] { return this.getData<Hotel>(KEYS.HOTELS, INITIAL_HOTELS); }
  saveHotel(hotel: Hotel) {
      if (!hotel.id) hotel.id = `h_${Date.now()}`;
      this.persist(KEYS.HOTELS, 'hotels', hotel);
  }
  deleteHotel(id: string) { this.remove(KEYS.HOTELS, 'hotels', id); }

  // --- ACTIVITIES ---
  getActivities(): Activity[] { return this.getData<Activity>(KEYS.ACTIVITIES, INITIAL_ACTIVITIES); }
  saveActivity(activity: Activity) {
      if (!activity.id) activity.id = `a_${Date.now()}`;
      this.persist(KEYS.ACTIVITIES, 'activities', activity);
  }
  deleteActivity(id: string) { this.remove(KEYS.ACTIVITIES, 'activities', id); }

  // --- TRANSFERS ---
  getTransfers(): Transfer[] { return this.getData<Transfer>(KEYS.TRANSFERS, INITIAL_TRANSFERS); }
  saveTransfer(transfer: Transfer) {
      if (!transfer.id) transfer.id = `t_${Date.now()}`;
      this.persist(KEYS.TRANSFERS, 'transfers', transfer);
  }
  deleteTransfer(id: string) { this.remove(KEYS.TRANSFERS, 'transfers', id); }

  // --- VISAS ---
  getVisas(): Visa[] { return this.getData<Visa>(KEYS.VISAS, INITIAL_VISAS); }
  saveVisa(visa: Visa) {
      if (!visa.id) visa.id = `v_${Date.now()}`;
      this.persist(KEYS.VISAS, 'visas', visa);
  }
  deleteVisa(id: string) { this.remove(KEYS.VISAS, 'visas', id); }

  // --- PACKAGES ---
  getFixedPackages(): FixedPackage[] { return this.getData<FixedPackage>(KEYS.PACKAGES, INITIAL_PACKAGES); }
  saveFixedPackage(pkg: FixedPackage) {
      if (!pkg.id) pkg.id = `pkg_${Date.now()}`;
      this.persist(KEYS.PACKAGES, 'packages', pkg);
  }
  deleteFixedPackage(id: string) { this.remove(KEYS.PACKAGES, 'packages', id); }

  // --- TEMPLATES ---
  getSystemTemplates(): ItineraryTemplate[] { return this.getData<ItineraryTemplate>(KEYS.TEMPLATES, INITIAL_TEMPLATES); }
  saveSystemTemplate(template: ItineraryTemplate) {
      if (!template.id) template.id = `tpl_${Date.now()}`;
      this.persist(KEYS.TEMPLATES, 'templates', template);
  }
  deleteSystemTemplate(id: string) { this.remove(KEYS.TEMPLATES, 'templates', id); }

  // --- PRICING ---
  getPricingRule(): PricingRule {
    const stored = localStorage.getItem(KEYS.PRICING);
    return stored ? JSON.parse(stored) : INITIAL_PRICING_RULE;
  }
  savePricingRule(rule: PricingRule) {
    localStorage.setItem(KEYS.PRICING, JSON.stringify(rule));
    // Persist pricing rule singleton to Cloud
    if (!this.isOffline) {
        setDoc(doc(db, 'settings', 'pricing_rule'), rule, { merge: true }).catch(e => this.handleSyncError(e));
    }
  }

  // --- USERS ---
  getUsers(): User[] { return this.getData<User>(KEYS.USERS, MOCK_USERS); }
  
  saveUser(user: Partial<User>) {
    const list = this.getUsers();
    
    // Merge logic for Local
    const index = list.findIndex(u => u.id === user.id);
    let userToSave: User;
    
    if (index >= 0) {
       userToSave = { ...list[index], ...user } as User;
       list[index] = userToSave;
    } else {
       userToSave = {
          id: user.id || `u_${Date.now()}`,
          uniqueId: user.uniqueId || idGeneratorService.generateUniqueId(user.role || UserRole.AGENT),
          name: user.name || 'New User',
          email: user.email || '',
          role: user.role || UserRole.AGENT,
          isVerified: true,
          status: 'ACTIVE',
          joinedAt: new Date().toISOString(),
          ...user
       } as User;
       list.push(userToSave);
    }
    
    localStorage.setItem(KEYS.USERS, JSON.stringify(list));
    
    if (!this.isOffline) {
        setDoc(doc(db, 'users', userToSave.id), userToSave, { merge: true })
            .catch(e => this.handleSyncError(e));
            
        if(userToSave.email) {
            setDoc(doc(db, 'user_roles', userToSave.email.toLowerCase()), {
                email: userToSave.email.toLowerCase(),
                role: userToSave.role
            }, { merge: true }).catch(e => console.warn("Role sync failed (likely offline)", e));
        }
    }
  }

  deleteUser(id: string) { this.remove(KEYS.USERS, 'users', id); }
}

export const adminService = new AdminService();
