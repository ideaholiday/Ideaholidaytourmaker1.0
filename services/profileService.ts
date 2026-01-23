
import { User, UserRole, UserStatus } from '../types';
import { adminService } from './adminService'; // To reuse User CRUD
import { agentService } from './agentService';
import { bookingService } from './bookingService';
import { auditLogService } from './auditLogService';
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

class ProfileService {
  
  // --- RETRIEVAL ---
  getAllAgents(): User[] {
    return adminService.getUsers().filter(u => u.role === UserRole.AGENT);
  }

  getAllOperators(): User[] {
    return adminService.getUsers().filter(u => u.role === UserRole.OPERATOR);
  }

  getAllStaff(): User[] {
    return adminService.getUsers().filter(u => u.role === UserRole.STAFF);
  }

  getUser(userId: string): User | undefined {
    return adminService.getUsers().find(u => u.id === userId);
  }

  /**
   * Async fetch for Public/Clean sessions.
   * Checks local cache first, then Firestore.
   */
  async fetchUser(userId: string): Promise<User | undefined> {
      // 1. Try Local
      const local = this.getUser(userId);
      if (local) return local;

      // 2. Try Firestore
      try {
          const docRef = doc(db, 'users', userId);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
              const userData = snap.data() as User;
              // Optional: Cache this user back to local adminService to avoid refetch
              adminService.saveUser(userData);
              return userData;
          }
      } catch (e) {
          console.error("Profile Fetch Error:", e);
      }
      return undefined;
  }

  // --- UPDATES ---
  updateUserStatus(userId: string, status: UserStatus) {
    const user = this.getUser(userId);
    if (user) {
      const oldStatus = user.status;
      adminService.saveUser({ ...user, status });

      // AUDIT LOG
      const adminUser: User = { id: 'admin_sys', name: 'Admin', role: UserRole.ADMIN, email: '', isVerified: true };
      
      auditLogService.logAction({
        entityType: 'USER',
        entityId: userId,
        action: 'USER_STATUS_CHANGE',
        description: `User ${user.name} status changed from ${oldStatus} to ${status}.`,
        user: adminUser, 
        previousValue: oldStatus,
        newValue: status
      });
    }
  }

  updateCreditLimit(userId: string, limit: number) {
    const user = this.getUser(userId);
    if (user) {
      const oldLimit = user.creditLimit;
      adminService.saveUser({ ...user, creditLimit: limit });

      const adminUser: User = { id: 'admin_sys', name: 'Admin', role: UserRole.ADMIN, email: '', isVerified: true };
      auditLogService.logAction({
        entityType: 'USER',
        entityId: userId,
        action: 'CREDIT_LIMIT_CHANGE',
        description: `User ${user.name} credit limit updated to ${limit}.`,
        user: adminUser,
        previousValue: oldLimit,
        newValue: limit
      });
    }
  }

  updateProfileDetails(userId: string, details: Partial<User>) {
    const user = this.getUser(userId);
    if (user) {
      adminService.saveUser({ ...user, ...details });
    }
  }

  // --- STATISTICS ---
  
  getAgentStats(agentId: string) {
    const quotes = agentService.getQuotes(agentId);
    const bookings = bookingService.getBookingsForAgent(agentId);
    
    const activeQuotes = quotes.filter(q => q.status === 'PENDING' || q.status === 'BOOKED');
    const confirmedBookings = bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'IN_PROGRESS' || b.status === 'COMPLETED');
    const cancelledBookings = bookings.filter(b => b.status.includes('CANCEL'));
    
    // Total Business Value: Sum of Booking Selling Prices
    const totalBusinessValue = bookings.reduce((sum, b) => sum + (b.status !== 'REJECTED' && !b.status.includes('CANCEL') ? b.sellingPrice : 0), 0);

    return {
      totalQuotes: quotes.length,
      activeQuotes: activeQuotes.length,
      confirmedBookings: confirmedBookings.length,
      cancelledBookings: cancelledBookings.length,
      totalBusinessValue
    };
  }

  async getOperatorStats(operatorId: string) {
    const assignments = await agentService.getOperatorAssignments(operatorId); // These are Quotes with operatorId
    const bookings = bookingService.getBookingsForOperator(operatorId);

    const pending = assignments.filter(q => q.operatorStatus === 'PENDING' || q.operatorStatus === 'ASSIGNED');
    const accepted = assignments.filter(q => q.operatorStatus === 'ACCEPTED');
    const declined = assignments.filter(q => q.operatorStatus === 'DECLINED');
    const completed = bookings.filter(b => b.status === 'COMPLETED');

    return {
      totalAssigned: assignments.length,
      pendingAction: pending.length,
      acceptedJobs: accepted.length,
      declinedJobs: declined.length,
      completedJobs: completed.length
    };
  }

  getAdminDashboardStats() {
    const users = adminService.getUsers();
    const agents = users.filter(u => u.role === UserRole.AGENT).length;
    const operators = users.filter(u => u.role === UserRole.OPERATOR).length;
    const bookings = bookingService.getAllBookings();
    
    const activeBookings = bookings.filter(b => ['CONFIRMED', 'IN_PROGRESS'].includes(b.status));
    const pendingPayments = bookings.reduce((sum, b) => sum + b.balanceAmount, 0);
    const totalRevenue = bookings.reduce((sum, b) => sum + b.sellingPrice, 0); // Very rough estimate

    return {
      totalAgents: agents,
      totalOperators: operators,
      activeBookings: activeBookings.length,
      totalRevenue,
      pendingPayments
    };
  }
}

export const profileService = new ProfileService();
