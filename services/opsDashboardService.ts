
import { OperatorInventoryItem, Hotel, SystemAlert, ExpiringRate, OpsStats } from '../types';
import { inventoryService } from './inventoryService';
import { adminService } from './adminService';
import { contractService } from './contractService';
import { bookingService } from './bookingService';

class OpsDashboardService {

  // --- OVERVIEW STATS ---
  getOverviewStats(): OpsStats {
    const allInventory = inventoryService.getAllItemsSync();
    // Use Sync
    const allHotels = adminService.getHotelsSync(); 
    const expiring = this.getExpiringRates();
    
    return {
      pendingInventory: allInventory.filter(i => i.status === 'PENDING_APPROVAL').length,
      // For Admin-created hotels, usually active by default, but let's assume workflow support
      pendingHotels: allHotels.filter(h => h.status === 'PENDING_APPROVAL').length,
      expiringRates: expiring.length,
      rejectedItems: allInventory.filter(i => i.status === 'REJECTED').length
    };
  }

  // --- PENDING ITEMS ---
  getPendingInventory(): OperatorInventoryItem[] {
    return inventoryService.getAllItemsSync().filter(i => i.status === 'PENDING_APPROVAL');
  }

  getPendingHotels(): Hotel[] {
    // Assuming adminService.getHotels can return pending items if workflow enabled
    return adminService.getHotelsSync().filter(h => h.status === 'PENDING_APPROVAL');
  }

  // --- EXPIRING RATES LOGIC ---
  getExpiringRates(thresholdDays: number = 30): ExpiringRate[] {
    const hotels = adminService.getHotelsSync();
    const today = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(today.getDate() + thresholdDays);

    const expiring: ExpiringRate[] = [];

    hotels.forEach(h => {
        if (!h.validTo) return;
        const validTo = new Date(h.validTo);
        
        // Check if validTo is within the next X days and not already expired
        if (validTo >= today && validTo <= thresholdDate) {
            const daysLeft = Math.ceil((validTo.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            
            expiring.push({
                id: h.id,
                type: 'HOTEL_RATE',
                name: h.name,
                details: `${h.roomType} (${h.mealPlan})`,
                validTo: h.validTo,
                daysRemaining: daysLeft,
                supplierName: h.operatorName || 'System'
            });
        }
    });

    return expiring.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }

  // --- REJECTED / INACTIVE ---
  getRejectedItems(): OperatorInventoryItem[] {
      return inventoryService.getAllItemsSync().filter(i => i.status === 'REJECTED');
  }

  // --- ALERTS GENERATION ---
  getSystemAlerts(): SystemAlert[] {
      const alerts: SystemAlert[] = [];
      const stats = this.getOverviewStats();
      const today = new Date();
      
      // 0. New Booking Requests (Highest Priority)
      const bookings = bookingService.getAllBookingsSync();
      const pendingBookings = bookings.filter(b => b.status === 'REQUESTED');
      
      if (pendingBookings.length > 0) {
          alerts.push({
              id: 'alert_new_bookings',
              type: 'CRITICAL',
              title: 'New Booking Requests',
              description: `${pendingBookings.length} bookings waiting for confirmation. Action immediately.`,
              actionLink: '/admin/bookings?status=REQUESTED',
              createdAt: today.toISOString()
          });
      }

      // 1. Pending Approval Bottleneck
      if (stats.pendingInventory > 10) {
          alerts.push({
              id: 'alert_pending_high',
              type: 'WARNING',
              title: 'High Pending Approvals',
              description: `${stats.pendingInventory} inventory items waiting for review.`,
              actionLink: '/admin/approvals',
              createdAt: today.toISOString()
          });
      }

      // 2. Critical Expiry
      const criticalExpiry = this.getExpiringRates(7);
      if (criticalExpiry.length > 0) {
          alerts.push({
              id: 'alert_expiry_crit',
              type: 'CRITICAL',
              title: 'Rates Expiring Soon',
              description: `${criticalExpiry.length} hotel rates expire in < 7 days. Revenue risk.`,
              actionLink: '/admin/ops-dashboard', // Self link to scroll
              createdAt: today.toISOString()
          });
      }

      // 3. Rejected Cleanup
      if (stats.rejectedItems > 20) {
          alerts.push({
              id: 'alert_cleanup',
              type: 'INFO',
              title: 'Inventory Cleanup Needed',
              description: `${stats.rejectedItems} rejected items cluttering the database.`,
              createdAt: today.toISOString()
          });
      }

      return alerts;
  }
}

export const opsDashboardService = new OpsDashboardService();
