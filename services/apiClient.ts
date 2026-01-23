
import { BRANDING } from '../constants';
import { adminService } from './adminService';
import { currencyService } from './currencyService';

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
                   
                   if (svc.inventory_id) {
                       // SYSTEM ITEM: Strict Lookup from "Database" (AdminService)
                       const adminPrice = this.getAdminItemPrice(svc.inventory_id, svc.type);
                       // We ignore stored currency and assume INR because we forced migration
                       const priceInBase = adminPrice; 
                       
                       supplierCostTotal += (priceInBase * qty * nights);
                   } else {
                       // MANUAL ITEM: Trust Agent Input
                       const manualCost = Number(svc.cost) || 0;
                       // Assume input is INR
                       manualCostTotal += (manualCost * qty * nights);
                   }
               });
           });
       }

       // --- PRICING ALGORITHM (INR) ---
       
       // 1. Platform Margin (Admin Profit)
       // Applied ONLY to System Inventory (Supplier Cost)
       const platformMarginPercent = 0.10; // 10%
       const platformMarginValue = supplierCostTotal * platformMarginPercent;

       // 2. Platform Net Cost (B2B Price for Agent)
       // This is what the Agent owes the platform.
       const platformNetCost = supplierCostTotal + platformMarginValue + manualCostTotal;

       // 3. Agent Markup (Agent Profit)
       // Applied on top of the B2B Price
       // Use overridden markup from request if present, else default
       const agentMarkupPercent = body.markup !== undefined ? Number(body.markup) / 100 : 0.10; 
       const agentMarkupValue = platformNetCost * agentMarkupPercent;

       // 4. Tax (GST)
       // Applied on Subtotal (Net + Agent Markup)
       const taxPercent = 0.05; // 5%
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

  // Helper to simulate DB Lookup
  private getAdminItemPrice(id: string, type: string): number {
      const hotels = adminService.getHotels();
      const activities = adminService.getActivities();
      const transfers = adminService.getTransfers();

      if (type === 'HOTEL') {
          const h = hotels.find(x => x.id === id);
          return h ? h.cost : 0;
      }
      if (type === 'ACTIVITY') {
          const a = activities.find(x => x.id === id);
          return a ? a.costAdult : 0; 
      }
      if (type === 'TRANSFER') {
          const t = transfers.find(x => x.id === id);
          return t ? t.cost : 0;
      }
      return 0;
  }

  private getAdminItemCurrency(id: string, type: string): string {
      return 'INR'; // Enforced
  }

  setSession(token: string) {
    localStorage.setItem(MOCK_COOKIE_NAME, token);
  }

  clearSession() {
    localStorage.removeItem(MOCK_COOKIE_NAME);
  }
}

export const apiClient = new ApiClient();
