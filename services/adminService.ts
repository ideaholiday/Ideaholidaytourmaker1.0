
import { Destination, Hotel, PricingRule, Transfer, Activity, Visa, FixedPackage, User, UserRole, ItineraryTemplate } from '../types';
import { MOCK_USERS } from '../constants';
import { INITIAL_TEMPLATES } from '../data/itineraryTemplates';
import { idGeneratorService } from './idGenerator';
import { db } from './firebase'; 
import { doc, setDoc, deleteDoc, getDocs, collection, query, writeBatch } from 'firebase/firestore'; 

// --- INITIAL DATA CONSTANTS (Preserved) ---
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
  { id: 'a_dxb_safari', activityName: 'Desert Safari', destinationId: 'd1', activityType: 'Adventure', costAdult: 3500, costChild: 2500, ticketIncluded: true, transferIncluded: true, isActive: true, createdBy: 'u1', currency: 'INR', description: 'Dune bashing with BBQ dinner', duration: '6 Hours', startTime: '15:00', season: 'All Year', validFrom: '2023-01-01', validTo: '2025-12-31' },
  { id: 'a_dxb_burj', activityName: 'Burj Khalifa At The Top', destinationId: 'd1', activityType: 'City Tour', costAdult: 4500, costChild: 3500, ticketIncluded: true, transferIncluded: false, isActive: true, createdBy: 'u1', currency: 'INR', description: 'Level 124/125 access', duration: '2 Hours', startTime: 'Flexible', season: 'All Year', validFrom: '2023-01-01', validTo: '2025-12-31' }
];

const INITIAL_TRANSFERS: Transfer[] = [
  { id: 't_dxb_apt', transferName: 'DXB Airport Transfer', destinationId: 'd1', transferType: 'PVT', vehicleType: 'Sedan', maxPassengers: 3, cost: 2500, costBasis: 'Per Vehicle', nightSurcharge: 500, isActive: true, createdBy: 'u1', currency: 'INR', description: 'Airport to Hotel', season: 'All Year', validFrom: '2023-01-01', validTo: '2025-12-31' }
];

const INITIAL_VISAS: Visa[] = [
    { id: 'v_uae_30', country: 'UAE', visaType: 'Tourist 30 Days', processingTime: '2-3 Days', cost: 7000, documentsRequired: ['Passport', 'Photo'], isActive: true, createdBy: 'u1' }
];

const INITIAL_PACKAGES: FixedPackage[] = []; 
const INITIAL_PRICING_RULE: PricingRule = { id: 'pr_default', name: 'Default', markupType: 'Percentage', companyMarkup: 10, agentMarkup: 10, gstPercentage: 5, roundOff: 'Nearest 10', baseCurrency: 'INR', isActive: true };

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
  
  /**
   * Robust Sync:
   * 1. Checks Cloud. 
   * 2. If Cloud Empty -> Seeds Initial Data -> Downloads back to Local.
   * 3. If Cloud Has Data -> Downloads to Local.
   */
  async syncAllFromCloud() {
      console.log("🔄 Starting Robust Cloud Sync...");
      try {
        await Promise.all([
            this.syncOrSeed('destinations', KEYS.DESTINATIONS, INITIAL_DESTINATIONS),
            this.syncOrSeed('hotels', KEYS.HOTELS, INITIAL_HOTELS),
            this.syncOrSeed('activities', KEYS.ACTIVITIES, INITIAL_ACTIVITIES),
            this.syncOrSeed('transfers', KEYS.TRANSFERS, INITIAL_TRANSFERS),
            this.syncOrSeed('visas', KEYS.VISAS, INITIAL_VISAS),
            this.syncOrSeed('templates', KEYS.TEMPLATES, INITIAL_TEMPLATES),
            this.syncOrSeed('users', KEYS.USERS, MOCK_USERS),
            this.syncCollection('packages', KEYS.PACKAGES) // Packages usually start empty
        ]);
        console.log("✅ Cloud Sync Complete.");
      } catch (e) {
          console.error("Sync Failed", e);
      }
  }

  private async syncOrSeed(firestoreCol: string, localKey: string, seedData: any[]) {
      try {
          const q = query(collection(db, firestoreCol));
          const snapshot = await getDocs(q);
          
          if (snapshot.empty && seedData.length > 0) {
              console.log(`☁️ Seeding ${firestoreCol} to Cloud...`);
              const batch = writeBatch(db);
              seedData.forEach(item => {
                  const ref = doc(db, firestoreCol, item.id);
                  batch.set(ref, item);
              });
              await batch.commit();
              // After seeding, set local
              localStorage.setItem(localKey, JSON.stringify(seedData));
          } else if (!snapshot.empty) {
              const remoteData = snapshot.docs.map(doc => doc.data());
              localStorage.setItem(localKey, JSON.stringify(remoteData));
          } else {
              // Both empty, ensure local is cleared or set to empty array
              localStorage.setItem(localKey, JSON.stringify([]));
          }
      } catch (e) {
          console.warn(`Failed to sync/seed ${firestoreCol}`, e);
          // Fallback to local defaults if offline/error to prevent blank screen
          if (!localStorage.getItem(localKey)) {
             localStorage.setItem(localKey, JSON.stringify(seedData));
          }
      }
  }

  private async syncCollection(firestoreCol: string, localKey: string) {
      try {
          const q = query(collection(db, firestoreCol));
          const snapshot = await getDocs(q);
          const remoteData = snapshot.docs.map(doc => doc.data());
          localStorage.setItem(localKey, JSON.stringify(remoteData));
      } catch (e) {
          console.warn(`Failed to sync ${firestoreCol}`, e);
      }
  }

  // Helper to save to BOTH Local and Cloud
  private async persist<T extends { id: string }>(key: string, collectionName: string, item: T) {
      // 1. Local Save
      const list = this.getData<T>(key, []);
      const index = list.findIndex(i => i.id === item.id);
      if (index >= 0) list[index] = item;
      else list.push(item);
      localStorage.setItem(key, JSON.stringify(list));

      // 2. Cloud Save
      try {
          await setDoc(doc(db, collectionName, item.id), item, { merge: true });
      } catch (e) {
          console.error(`Cloud save failed for ${collectionName}`, e);
      }
  }

  private async remove(key: string, collectionName: string, id: string) {
      const list = this.getData<any>(key, []).filter(i => i.id !== id);
      localStorage.setItem(key, JSON.stringify(list));
      try {
          await deleteDoc(doc(db, collectionName, id));
      } catch (e) { console.error(`Cloud delete failed`, e); }
  }

  private getData<T extends { id: string }>(key: string, defaults: T[]): T[] {
    const stored = localStorage.getItem(key);
    if (!stored) return defaults;
    try {
        const storedData = JSON.parse(stored) as T[];
        return storedData;
    } catch (e) {
        return defaults;
    }
  }

  // --- GETTERS (Now purely local read, relying on Sync to have populated it) ---
  getDestinations(): Destination[] { return this.getData<Destination>(KEYS.DESTINATIONS, INITIAL_DESTINATIONS); }
  getHotels(): Hotel[] { return this.getData<Hotel>(KEYS.HOTELS, INITIAL_HOTELS); }
  getActivities(): Activity[] { return this.getData<Activity>(KEYS.ACTIVITIES, INITIAL_ACTIVITIES); }
  getTransfers(): Transfer[] { return this.getData<Transfer>(KEYS.TRANSFERS, INITIAL_TRANSFERS); }
  getVisas(): Visa[] { return this.getData<Visa>(KEYS.VISAS, INITIAL_VISAS); }
  getFixedPackages(): FixedPackage[] { return this.getData<FixedPackage>(KEYS.PACKAGES, INITIAL_PACKAGES); }
  getSystemTemplates(): ItineraryTemplate[] { return this.getData<ItineraryTemplate>(KEYS.TEMPLATES, INITIAL_TEMPLATES); }
  getUsers(): User[] { return this.getData<User>(KEYS.USERS, MOCK_USERS); }

  // --- SETTERS ---
  saveDestination(dest: Destination) {
      if (!dest.id) dest.id = idGeneratorService.generateUniqueId(UserRole.ADMIN);
      this.persist(KEYS.DESTINATIONS, 'destinations', dest);
  }
  deleteDestination(id: string) { this.remove(KEYS.DESTINATIONS, 'destinations', id); }

  saveHotel(hotel: Hotel) {
      if (!hotel.id) hotel.id = `h_${Date.now()}`;
      this.persist(KEYS.HOTELS, 'hotels', hotel);
  }
  deleteHotel(id: string) { this.remove(KEYS.HOTELS, 'hotels', id); }

  saveActivity(activity: Activity) {
      if (!activity.id) activity.id = `a_${Date.now()}`;
      this.persist(KEYS.ACTIVITIES, 'activities', activity);
  }
  deleteActivity(id: string) { this.remove(KEYS.ACTIVITIES, 'activities', id); }

  saveTransfer(transfer: Transfer) {
      if (!transfer.id) transfer.id = `t_${Date.now()}`;
      this.persist(KEYS.TRANSFERS, 'transfers', transfer);
  }
  deleteTransfer(id: string) { this.remove(KEYS.TRANSFERS, 'transfers', id); }

  saveVisa(visa: Visa) {
      if (!visa.id) visa.id = `v_${Date.now()}`;
      this.persist(KEYS.VISAS, 'visas', visa);
  }
  deleteVisa(id: string) { this.remove(KEYS.VISAS, 'visas', id); }

  saveFixedPackage(pkg: FixedPackage) {
      if (!pkg.id) pkg.id = `pkg_${Date.now()}`;
      this.persist(KEYS.PACKAGES, 'packages', pkg);
  }
  deleteFixedPackage(id: string) { this.remove(KEYS.PACKAGES, 'packages', id); }

  saveSystemTemplate(template: ItineraryTemplate) {
      if (!template.id) template.id = `tpl_${Date.now()}`;
      this.persist(KEYS.TEMPLATES, 'templates', template);
  }
  deleteSystemTemplate(id: string) { this.remove(KEYS.TEMPLATES, 'templates', id); }

  getPricingRule(): PricingRule {
    const stored = localStorage.getItem(KEYS.PRICING);
    return stored ? JSON.parse(stored) : INITIAL_PRICING_RULE;
  }
  savePricingRule(rule: PricingRule) {
    localStorage.setItem(KEYS.PRICING, JSON.stringify(rule));
    // Persist single doc for pricing
    setDoc(doc(db, 'settings', 'pricing'), rule, { merge: true });
  }

  saveUser(user: Partial<User>) {
    const list = this.getUsers();
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
    
    // Cloud First, then Local to ensure consistency
    setDoc(doc(db, 'users', userToSave.id), userToSave, { merge: true }).then(() => {
        localStorage.setItem(KEYS.USERS, JSON.stringify(list));
    }).catch(console.error);

    if(userToSave.email) {
         setDoc(doc(db, 'user_roles', userToSave.email.toLowerCase()), {
             email: userToSave.email.toLowerCase(),
             role: userToSave.role
         }, { merge: true });
    }
  }

  deleteUser(id: string) { this.remove(KEYS.USERS, 'users', id); }
}

export const adminService = new AdminService();
