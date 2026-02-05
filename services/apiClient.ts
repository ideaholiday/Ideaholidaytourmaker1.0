
import { BRANDING } from '../constants';
import { adminService } from './adminService';
import { currencyService } from './currencyService';
import { inventoryService } from './inventoryService'; // Import Inventory Service

const MOCK_COOKIE_NAME = 'iht_secure_session';

class ApiClient {
  
  private triggerUnauthorized() {
    window.dispatchEvent(new Event('auth:unauthorized'));
  }

  private hasValidSession(): boolean {
    return !!localStorage.getItem(MOCK_COOKIE_NAME);
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    await new Promise(resolve => setTimeout(resolve, 50));

    const publicEndpoints = [
        '/auth/login', 
        '/auth/forgot-password', 
        '/auth/signup', 
        '/public/',
        'auth/' 
    ];
    
    const lowerEndpoint = endpoint.toLowerCase();
    const isPublic = publicEndpoints.some(p => lowerEndpoint.includes(p.toLowerCase()));

    if (!isPublic && !this.hasValidSession()) {
      console.warn(`[API] 401 Unauthorized access to ${endpoint}`);
      this.triggerUnauthorized();
      throw new Error("401 Unauthorized");
    }

    // --- Backend Pricing Engine Simulation ---
    if (endpoint.includes('/builder/calculate')) {
       const body = options.body ? JSON.parse(options.body as string) : {};
       
       let supplierCostTotal = 0; // Raw Partner Net (INR)
       let manualCostTotal = 0; // Manual items (INR)
       const currency = 'INR'; // Base Calculation Currency forced to INR

       if (body.days && Array.isArray(body.days)) {
           body.days.forEach((day: any) => {
               day.services?.forEach((svc: any) => {
                   const qty = Number(svc.quantity) || 1;
                   const nights = Number(svc.nights) || 1;
                   
                   let itemCost = 0;

                   if (svc.inventory_id) {
                       // SYSTEM ITEM: Strict Lookup from "Database" to simulate backend truth
                       const dbPrice = this.getItemPrice(svc.inventory_id, svc.type);
                       
                       if (dbPrice > 0) {
                           itemCost = dbPrice;
                           supplierCostTotal += (itemCost * qty * nights);
                       } else {
                           // Fallback if ID not found (e.g. newly added in session or cache miss)
                           // In a real app, this would be a DB query.
                           itemCost = Number(svc.cost) || 0;
                           supplierCostTotal += (itemCost * qty * nights);
                       }
                   } else {
                       // MANUAL ITEM: Trust Agent Input
                       itemCost = Number(svc.cost) || 0;
                       manualCostTotal += (itemCost * qty * nights);
                   }
               });
           });
       }

       // --- PRICING ALGORITHM (INR) ---
       
       // FETCH DYNAMIC RULES FROM DB (Simulated)
       const rules = adminService.getPricingRuleSync();

       // 1. Platform Margin (Admin Profit / Global Markup)
       // Applied ONLY to System Inventory (Supplier/Operator/Partner Cost)
       const platformMarginPercent = (rules.companyMarkup || 0) / 100; 
       const platformMarginValue = supplierCostTotal * platformMarginPercent;

       // 2. Platform Net Cost (B2B Price for Agent)
       // This is what the Agent owes the platform.
       const platformNetCost = supplierCostTotal + platformMarginValue + manualCostTotal;

       // 3. Agent Markup (Agent Profit)
       // Applied on top of the B2B Price
       // Use overridden markup from request if present, else default from rules
       const agentMarkupPercent = body.markup !== undefined ? Number(body.markup) / 100 : ((rules.agentMarkup || 0) / 100); 
       const agentMarkupValue = platformNetCost * agentMarkupPercent;

       // 4. Tax (GST)
       // Applied on Subtotal (Net + Agent Markup)
       const taxPercent = (rules.gstPercentage || 0) / 100;
       const subtotal = platformNetCost + agentMarkupValue;
       const taxAmount = subtotal * taxPercent;

       // 5. Final Selling Price (Client Price)
       const finalSellingPrice = subtotal + taxAmount;

       // 6. Output
       return Promise.resolve({
           currency: 'INR',
           
           // Detailed Breakdown
           supplier_cost: Number(supplierCostTotal.toFixed(2)),       
           platform_margin: Number(platformMarginValue.toFixed(2)),   
           
           net_cost: Number(platformNetCost.toFixed(2)),              // AGENT B2B PRICE
           
           agent_markup: Number(agentMarkupValue.toFixed(2)),         // Agent Profit
           tax: Number(taxAmount.toFixed(2)),                         // GST
           selling_price: Math.ceil(finalSellingPrice),               // Final Client Price
           
           breakdown: {
               supplier_base: supplierCostTotal,
               margin_base: platformMarginValue,
               manual_total: manualCostTotal,
               markup_base: agentMarkupValue,
               tax_base: taxAmount
           }
       } as any);
    }

    if (endpoint.includes('/builder/save')) {
        return Promise.resolve({
            id: `itin_${Date.now()}`,
            version: 1,
            reference: 'MOCK-REF-' + Math.floor(Math.random() * 1000),
            message: 'Itinerary saved successfully.'
        } as any);
    }
    
    if (endpoint.includes('/auth/login')) return Promise.resolve({} as any);
    if (endpoint.includes('/auth/signup')) return Promise.resolve({} as any);

    return Promise.resolve({} as T); 
  }

  // Helper to simulate DB Lookup across both Admin and Partner/Operator tables
  private getItemPrice(id: string, type: string): number {
      // 1. Check Admin Inventory
      const hotels = adminService.getHotelsSync();
      const activities = adminService.getActivitiesSync();
      const transfers = adminService.getTransfersSync();

      if (type === 'HOTEL') {
          const h = hotels.find(x => x.id === id);
          if (h) return h.cost;
      }
      if (type === 'ACTIVITY') {
          const a = activities.find(x => x.id === id);
          if (a) return a.costAdult; // Defaulting to adult for base calc
      }
      if (type === 'TRANSFER') {
          const t = transfers.find(x => x.id === id);
          if (t) return t.cost;
      }

      // 2. Check Partner/Operator Inventory
      const partnerItems = inventoryService.getAllItemsSync();
      const item = partnerItems.find(i => i.id === id);
      
      if (item) {
          if (type === 'ACTIVITY') return item.costAdult || item.costPrice || 0;
          return item.costPrice || 0;
      }

      return 0;
  }

  setSession(token: string) {
    localStorage.setItem(MOCK_COOKIE_NAME, token);
  }

  clearSession() {
    localStorage.removeItem(MOCK_COOKIE_NAME);
  }
}

export const apiClient = new ApiClient();
