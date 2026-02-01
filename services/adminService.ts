
import { Destination, Hotel, PricingRule, Transfer, Activity, Visa, FixedPackage, User, ItineraryTemplate, SystemNotification } from '../types';
import { dbHelper } from './firestoreHelper';
import { idGeneratorService } from './idGenerator';

const COLLECTIONS = {
    DESTINATIONS: 'destinations',
    HOTELS: 'hotels',
    ACTIVITIES: 'activities',
    TRANSFERS: 'transfers',
    VISAS: 'visas',
    PACKAGES: 'fixed_packages',
    TEMPLATES: 'system_templates',
    USERS: 'users',
    SETTINGS: 'system_settings',
    NOTIFICATIONS: 'system_notifications'
};

class AdminService {
  private cache: {
      destinations: Destination[];
      hotels: Hotel[];
      activities: Activity[];
      transfers: Transfer[];
      visas: Visa[];
      packages: FixedPackage[];
      templates: ItineraryTemplate[];
      users: User[];
      pricingRule: PricingRule | null;
      notifications: SystemNotification[];
  } = { destinations: [], hotels: [], activities: [], transfers: [], visas: [], packages: [], templates: [], users: [], pricingRule: null, notifications: [] };

  async syncAllFromCloud() {
      const [d, h, a, t, v, p, tp, u, pr, n] = await Promise.all([
          dbHelper.getAll<Destination>(COLLECTIONS.DESTINATIONS),
          dbHelper.getAll<Hotel>(COLLECTIONS.HOTELS),
          dbHelper.getAll<Activity>(COLLECTIONS.ACTIVITIES),
          dbHelper.getAll<Transfer>(COLLECTIONS.TRANSFERS),
          dbHelper.getAll<Visa>(COLLECTIONS.VISAS),
          dbHelper.getAll<FixedPackage>(COLLECTIONS.PACKAGES),
          dbHelper.getAll<ItineraryTemplate>(COLLECTIONS.TEMPLATES),
          dbHelper.getAll<User>(COLLECTIONS.USERS),
          dbHelper.getById<PricingRule>(COLLECTIONS.SETTINGS, 'pricing_rule'),
          dbHelper.getAll<SystemNotification>(COLLECTIONS.NOTIFICATIONS)
      ]);
      this.cache.destinations = d;
      this.cache.hotels = h;
      this.cache.activities = a;
      this.cache.transfers = t;
      this.cache.visas = v;
      this.cache.packages = p;
      this.cache.templates = tp;
      this.cache.users = u;
      this.cache.pricingRule = pr || { id:'pricing_rule', name:'Default', markupType:'Percentage', companyMarkup:10, agentMarkup:10, gstPercentage:5, roundOff:'Nearest 10', isActive:true };
      this.cache.notifications = n;
  }

  // --- SYNC ACCESSORS (From Cache) ---
  getDestinationsSync(): Destination[] { return this.cache.destinations; }
  getHotelsSync(): Hotel[] { return this.cache.hotels; }
  getActivitiesSync(): Activity[] { return this.cache.activities; }
  getTransfersSync(): Transfer[] { return this.cache.transfers; }
  getVisasSync(): Visa[] { return this.cache.visas; }
  getFixedPackagesSync(): FixedPackage[] { return this.cache.packages; }
  getSystemTemplatesSync(): ItineraryTemplate[] { return this.cache.templates; }
  getUsersSync(): User[] { return this.cache.users; }
  getPricingRuleSync(): PricingRule { return this.cache.pricingRule!; }
  getNotificationsSync(): SystemNotification[] { return this.cache.notifications; }

  // --- DESTINATIONS ---
  async getDestinations(): Promise<Destination[]> {
     const data = await dbHelper.getAll<Destination>(COLLECTIONS.DESTINATIONS);
     this.cache.destinations = data;
     return data;
  }
  
  async saveDestination(dest: Destination) {
      if (!dest.id) dest.id = await idGeneratorService.generateUniqueId('ADMIN');
      await dbHelper.save(COLLECTIONS.DESTINATIONS, dest);
      this.syncAllFromCloud(); // Background update
  }
  
  async deleteDestination(id: string) { 
      await dbHelper.delete(COLLECTIONS.DESTINATIONS, id); 
      this.syncAllFromCloud();
  }

  // --- HOTELS ---
  async getHotels(): Promise<Hotel[]> { 
      const data = await dbHelper.getAll<Hotel>(COLLECTIONS.HOTELS);
      this.cache.hotels = data;
      return data;
  }

  async saveHotel(hotel: Hotel) {
      if (!hotel.id) hotel.id = `h_${Date.now()}`;
      await dbHelper.save(COLLECTIONS.HOTELS, hotel);
      this.syncAllFromCloud();
  }
  async deleteHotel(id: string) { await dbHelper.delete(COLLECTIONS.HOTELS, id); this.syncAllFromCloud(); }

  // --- ACTIVITIES ---
  async getActivities(): Promise<Activity[]> { 
      const data = await dbHelper.getAll<Activity>(COLLECTIONS.ACTIVITIES);
      this.cache.activities = data;
      return data;
  }

  async saveActivity(activity: Activity) {
      if (!activity.id) activity.id = `a_${Date.now()}`;
      await dbHelper.save(COLLECTIONS.ACTIVITIES, activity);
      this.syncAllFromCloud();
  }
  async deleteActivity(id: string) { await dbHelper.delete(COLLECTIONS.ACTIVITIES, id); this.syncAllFromCloud(); }

  // --- TRANSFERS ---
  async getTransfers(): Promise<Transfer[]> { 
      const data = await dbHelper.getAll<Transfer>(COLLECTIONS.TRANSFERS);
      this.cache.transfers = data;
      return data;
  }

  async saveTransfer(transfer: Transfer) {
      if (!transfer.id) transfer.id = `t_${Date.now()}`;
      await dbHelper.save(COLLECTIONS.TRANSFERS, transfer);
      this.syncAllFromCloud();
  }
  async deleteTransfer(id: string) { await dbHelper.delete(COLLECTIONS.TRANSFERS, id); this.syncAllFromCloud(); }

  // --- VISAS ---
  async getVisas(): Promise<Visa[]> { 
      const data = await dbHelper.getAll<Visa>(COLLECTIONS.VISAS);
      this.cache.visas = data;
      return data;
  }
  async saveVisa(visa: Visa) {
      if (!visa.id) visa.id = `v_${Date.now()}`;
      await dbHelper.save(COLLECTIONS.VISAS, visa);
      this.syncAllFromCloud();
  }
  async deleteVisa(id: string) { await dbHelper.delete(COLLECTIONS.VISAS, id); this.syncAllFromCloud(); }

  // --- PACKAGES ---
  async getFixedPackages(): Promise<FixedPackage[]> { 
      const data = await dbHelper.getAll<FixedPackage>(COLLECTIONS.PACKAGES);
      this.cache.packages = data;
      return data;
  }
  async saveFixedPackage(pkg: FixedPackage) {
      if (!pkg.id) pkg.id = `pkg_${Date.now()}`;
      await dbHelper.save(COLLECTIONS.PACKAGES, pkg);
      this.syncAllFromCloud();
  }
  async deleteFixedPackage(id: string) { await dbHelper.delete(COLLECTIONS.PACKAGES, id); this.syncAllFromCloud(); }

  // --- TEMPLATES ---
  async getSystemTemplates(): Promise<ItineraryTemplate[]> { 
      const data = await dbHelper.getAll<ItineraryTemplate>(COLLECTIONS.TEMPLATES);
      this.cache.templates = data;
      return data;
  }
  async saveSystemTemplate(template: ItineraryTemplate) {
      if (!template.id) template.id = `tpl_${Date.now()}`;
      await dbHelper.save(COLLECTIONS.TEMPLATES, template);
      this.syncAllFromCloud();
  }
  async deleteSystemTemplate(id: string) { await dbHelper.delete(COLLECTIONS.TEMPLATES, id); this.syncAllFromCloud(); }

  // --- SETTINGS (Pricing) ---
  async getPricingRule(): Promise<PricingRule> { 
      const rule = await dbHelper.getById<PricingRule>(COLLECTIONS.SETTINGS, 'pricing_rule');
      const finalRule = rule || { id:'pricing_rule', name:'Default', markupType:'Percentage', companyMarkup:10, agentMarkup:10, gstPercentage:5, roundOff:'Nearest 10', isActive:true };
      this.cache.pricingRule = finalRule;
      return finalRule;
  }
  async savePricingRule(rule: PricingRule) {
      await dbHelper.save(COLLECTIONS.SETTINGS, rule);
      this.syncAllFromCloud();
  }

  // --- USERS ---
  async getUsers(): Promise<User[]> { 
      const data = await dbHelper.getAll<User>(COLLECTIONS.USERS);
      this.cache.users = data;
      return data;
  }

  async saveUser(user: Partial<User>) {
      if (!user.id) throw new Error("User ID required");
      // @ts-ignore
      await dbHelper.save(COLLECTIONs.USERS, user);
      this.syncAllFromCloud();
  }
  async deleteUser(id: string) { await dbHelper.delete(COLLECTIONS.USERS, id); this.syncAllFromCloud(); }

  // --- SYSTEM NOTIFICATIONS ---
  async getActiveNotifications(): Promise<SystemNotification[]> {
      const all = await dbHelper.getAll<SystemNotification>(COLLECTIONS.NOTIFICATIONS);
      this.cache.notifications = all;
      return all.filter(n => n.isActive);
  }

  async saveNotification(notif: Partial<SystemNotification>) {
      if (!notif.id) {
          notif.id = `msg_${Date.now()}`;
          notif.createdAt = new Date().toISOString();
      }
      // @ts-ignore
      await dbHelper.save(COLCTIONS.NOTIFICATIONS, notif);
      // Refresh cache in background
      const all = await dbHelper.getAll<SystemNotification>(COLLECTIONS.NOTIFICATIONS);
      this.cache.notifications = all;
  }

  async deleteNotification(id: string) {
      await dbHelper.delete(COLLECTIONS.NOTIFICATIONS, id);
      const all = await dbHelper.getAll<SystemNotification>(COLLECTIONS.NOTIFICATIONS);
      this.cache.notifications = all;
  }
}

export const adminService = new AdminService();
