
import { Destination, Hotel, PricingRule, Transfer, Activity, Visa, FixedPackage, User, ItineraryTemplate } from '../types';
import { dbHelper } from './firestoreHelper';
import { idGeneratorService } from './idGenerator';
// Import existing constants for seeding
import { INITIAL_TEMPLATES } from '../data/itineraryTemplates';

// We define initial data inside here to seed if Firestore is empty
// This ensures a smooth migration from local to cloud
const INITIAL_DESTINATIONS: Destination[] = [
  { id: 'd11', country: 'India', city: 'Delhi', currency: 'INR', timezone: 'GMT+5:30', isActive: true },
  { id: 'd1', country: 'UAE', city: 'Dubai', currency: 'INR', timezone: 'GMT+4', isActive: true },
  { id: 'd2', country: 'Thailand', city: 'Phuket', currency: 'INR', timezone: 'GMT+7', isActive: true },
];
// ... (Add more defaults if needed for seeding)

const COLLECTIONS = {
    DESTINATIONS: 'destinations',
    HOTELS: 'hotels',
    ACTIVITIES: 'activities',
    TRANSFERS: 'transfers',
    VISAS: 'visas',
    PACKAGES: 'fixed_packages',
    TEMPLATES: 'system_templates',
    USERS: 'users',
    SETTINGS: 'system_settings' // For Pricing Rules
};

class AdminService {
  
  // Local Cache to avoid reading Firestore on every render
  // In a larger app, use React Query or Redux. Here we use simple singleton cache.
  private cache: any = {};

  /**
   * Called on App Start.
   * Checks if Firestore has data. If not, uploads defaults.
   */
  async syncAllFromCloud() {
      const dests = await this.getDestinations(true); // Force fetch
      if (dests.length === 0) {
          console.log("🔥 Seed: Uploading Master Data to Firestore...");
          await dbHelper.batchSave(COLLECTIONS.DESTINATIONS, INITIAL_DESTINATIONS);
          await dbHelper.batchSave(COLLECTIONS.TEMPLATES, INITIAL_TEMPLATES);
          // Pricing Rule Seed
          await dbHelper.save(COLLECTIONS.SETTINGS, { 
             id: 'pricing_rule', 
             name: 'Default', 
             markupType: 'Percentage', 
             companyMarkup: 10, 
             agentMarkup: 10, 
             gstPercentage: 5, 
             roundOff: 'Nearest 10', 
             baseCurrency: 'INR', 
             isActive: true 
          });
      }
  }

  // --- DESTINATIONS ---
  async getDestinations(force = false): Promise<Destination[]> {
     if (!force && this.cache.destinations) return this.cache.destinations;
     const data = await dbHelper.getAll<Destination>(COLLECTIONS.DESTINATIONS);
     this.cache.destinations = data;
     return data;
  }
  // Sync wrapper for UI components that expect sync return
  getDestinationsSync(): Destination[] { return this.cache.destinations || []; }

  async saveDestination(dest: Destination) {
      if (!dest.id) dest.id = idGeneratorService.generateUniqueId('ADMIN' as any);
      await dbHelper.save(COLLECTIONS.DESTINATIONS, dest);
      this.getDestinations(true); // Refresh cache
  }
  async deleteDestination(id: string) { await dbHelper.delete(COLLECTIONS.DESTINATIONS, id); this.getDestinations(true); }

  // --- HOTELS ---
  getHotels(): Hotel[] { return this.cache.hotels || []; } // Sync accessor
  async fetchHotels() { this.cache.hotels = await dbHelper.getAll<Hotel>(COLLECTIONS.HOTELS); }

  async saveHotel(hotel: Hotel) {
      if (!hotel.id) hotel.id = `h_${Date.now()}`;
      await dbHelper.save(COLLECTIONS.HOTELS, hotel);
      this.fetchHotels();
  }
  async deleteHotel(id: string) { await dbHelper.delete(COLLECTIONS.HOTELS, id); this.fetchHotels(); }

  // --- ACTIVITIES ---
  getActivities(): Activity[] { return this.cache.activities || []; }
  async fetchActivities() { this.cache.activities = await dbHelper.getAll<Activity>(COLLECTIONS.ACTIVITIES); }

  async saveActivity(activity: Activity) {
      if (!activity.id) activity.id = `a_${Date.now()}`;
      await dbHelper.save(COLLECTIONS.ACTIVITIES, activity);
      this.fetchActivities();
  }
  async deleteActivity(id: string) { await dbHelper.delete(COLLECTIONS.ACTIVITIES, id); this.fetchActivities(); }

  // --- TRANSFERS ---
  getTransfers(): Transfer[] { return this.cache.transfers || []; }
  async fetchTransfers() { this.cache.transfers = await dbHelper.getAll<Transfer>(COLLECTIONS.TRANSFERS); }

  async saveTransfer(transfer: Transfer) {
      if (!transfer.id) transfer.id = `t_${Date.now()}`;
      await dbHelper.save(COLLECTIONS.TRANSFERS, transfer);
      this.fetchTransfers();
  }
  async deleteTransfer(id: string) { await dbHelper.delete(COLLECTIONS.TRANSFERS, id); this.fetchTransfers(); }

  // --- VISAS ---
  getVisas(): Visa[] { return this.cache.visas || []; }
  async fetchVisas() { this.cache.visas = await dbHelper.getAll<Visa>(COLLECTIONS.VISAS); }

  async saveVisa(visa: Visa) {
      if (!visa.id) visa.id = `v_${Date.now()}`;
      await dbHelper.save(COLLECTIONS.VISAS, visa);
      this.fetchVisas();
  }
  async deleteVisa(id: string) { await dbHelper.delete(COLLECTIONS.VISAS, id); this.fetchVisas(); }

  // --- PACKAGES ---
  getFixedPackages(): FixedPackage[] { return this.cache.packages || []; }
  async fetchPackages() { this.cache.packages = await dbHelper.getAll<FixedPackage>(COLLECTIONS.PACKAGES); }

  async saveFixedPackage(pkg: FixedPackage) {
      if (!pkg.id) pkg.id = `pkg_${Date.now()}`;
      await dbHelper.save(COLLECTIONS.PACKAGES, pkg);
      this.fetchPackages();
  }
  async deleteFixedPackage(id: string) { await dbHelper.delete(COLLECTIONS.PACKAGES, id); this.fetchPackages(); }

  // --- TEMPLATES ---
  getSystemTemplates(): ItineraryTemplate[] { return this.cache.templates || []; }
  async fetchTemplates() { this.cache.templates = await dbHelper.getAll<ItineraryTemplate>(COLLECTIONS.TEMPLATES); }

  async saveSystemTemplate(template: ItineraryTemplate) {
      if (!template.id) template.id = `tpl_${Date.now()}`;
      await dbHelper.save(COLLECTIONS.TEMPLATES, template);
      this.fetchTemplates();
  }
  async deleteSystemTemplate(id: string) { await dbHelper.delete(COLLECTIONS.TEMPLATES, id); this.fetchTemplates(); }

  // --- SETTINGS (Pricing) ---
  getPricingRule(): PricingRule { return this.cache.pricingRule || { id:'pricing_rule', name:'Default', markupType:'Percentage', companyMarkup:10, agentMarkup:10, gstPercentage:5, roundOff:'Nearest 10', isActive:true }; }
  async fetchPricingRule() { 
      const rule = await dbHelper.getById<PricingRule>(COLLECTIONS.SETTINGS, 'pricing_rule');
      if(rule) this.cache.pricingRule = rule;
  }
  async savePricingRule(rule: PricingRule) {
      await dbHelper.save(COLLECTIONS.SETTINGS, rule);
      this.fetchPricingRule();
  }

  // --- USERS ---
  getUsers(): User[] { return this.cache.users || []; }
  async fetchUsers() { this.cache.users = await dbHelper.getAll<User>(COLLECTIONS.USERS); }

  async saveUser(user: Partial<User>) {
      // Merging happens in dbHelper.save
      if (!user.id) throw new Error("User ID required");
      // @ts-ignore
      await dbHelper.save(COLLECTIONS.USERS, user);
      this.fetchUsers();
  }
  async deleteUser(id: string) { await dbHelper.delete(COLLECTIONS.USERS, id); this.fetchUsers(); }
}

export const adminService = new AdminService();
