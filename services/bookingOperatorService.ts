
import { Booking, User, UserRole, Message, DriverDetails } from '../types';
import { bookingService } from './bookingService';
import { auditLogService } from './auditLogService';
import { dbHelper } from './firestoreHelper';
import { notificationService } from './notificationService';

const COLLECTION = 'bookings';

class BookingOperatorService {

  // Assign Operator to a Booking
  async assignOperator(
    bookingId: string, 
    operatorId: string, 
    operatorName: string, 
    options: {
        priceMode: 'NET_COST' | 'FIXED_PRICE';
        price?: number;
        instructions?: string;
    },
    adminUser: User
  ) {
    const booking = await bookingService.getBooking(bookingId);
    if (!booking) throw new Error("Booking not found");

    const previousOperator = booking.operatorName || 'None';

    // Update fields locally
    booking.operatorId = operatorId;
    booking.operatorName = operatorName;
    booking.operatorStatus = 'ASSIGNED';
    booking.operatorAssignedBy = adminUser.id;
    booking.operatorAssignedAt = new Date().toISOString();
    booking.operatorInstruction = options.instructions;
    
    // Privacy Control
    if (options.priceMode === 'FIXED_PRICE') {
        booking.operatorPrice = options.price;
        booking.netCostVisibleToOperator = false;
    } else {
        booking.operatorPrice = undefined; // Clear fixed price
        booking.netCostVisibleToOperator = true; // Show system net cost
    }

    // Add System Message
    const msg: Message = {
        id: `sys_${Date.now()}`,
        senderId: adminUser.id,
        senderName: 'System',
        senderRole: UserRole.ADMIN,
        content: `Operator Assigned: ${operatorName}. Status: ASSIGNED.`,
        timestamp: new Date().toISOString(),
        isSystem: true
    };
    booking.comments.push(msg);
    booking.updatedAt = new Date().toISOString();

    // Persist DIRECTLY to avoid re-fetch overwrite race condition
    await dbHelper.save(COLLECTION, booking);

    // Audit Log
    auditLogService.logAction({
        entityType: 'OPERATOR_ASSIGNMENT',
        entityId: bookingId,
        action: 'OPERATOR_ASSIGNED_TO_BOOKING',
        description: `Booking assigned to ${operatorName} by ${adminUser.name}. Price Mode: ${options.priceMode}`,
        user: adminUser,
        previousValue: { operator: previousOperator },
        newValue: { operator: operatorName, status: 'ASSIGNED' }
    });

    // NOTIFY OPERATOR
    await notificationService.send(
        operatorId,
        `New Booking Assignment`,
        `You have been assigned booking ${booking.uniqueRefNo}. Please review and accept.`,
        'ALERT',
        `/booking/${booking.id}`
    );
  }

  // Operator Accepts Booking
  async acceptAssignment(bookingId: string, operatorUser: User) {
    const booking = await bookingService.getBooking(bookingId);
    if (!booking) throw new Error("Booking not found");
    if (booking.operatorId !== operatorUser.id) throw new Error("Unauthorized");

    booking.operatorStatus = 'ACCEPTED';
    
    // Auto-move booking to IN_PROGRESS if it was CONFIRMED (Optional, usually kept as Confirmed until travel date)
    // We keep it as CONFIRMED but mark the operator status
    
    // 1. Internal Log for Operator/Admin
    const opMsg: Message = {
        id: `sys_${Date.now()}`,
        senderId: operatorUser.id,
        senderName: 'System',
        senderRole: UserRole.ADMIN, // Appear as system
        content: `Operator ${operatorUser.name} ACCEPTED the assignment.`,
        timestamp: new Date().toISOString(),
        isSystem: true
    };
    booking.comments.push(opMsg);

    // 2. Friendly Notification for Agent (Privacy Wall Safe)
    const agentMsg: Message = {
        id: `sys_ag_${Date.now()}`,
        senderId: 'system',
        senderName: 'System',
        senderRole: UserRole.ADMIN,
        content: `✅ Ground Operation Team has confirmed receipt of this booking. All services are secured.`,
        timestamp: new Date().toISOString(),
        isSystem: true
    };
    booking.comments.push(agentMsg);

    booking.updatedAt = new Date().toISOString();
    
    // Persist directly
    await dbHelper.save(COLLECTION, booking);

    auditLogService.logAction({
        entityType: 'OPERATOR_ASSIGNMENT',
        entityId: bookingId,
        action: 'OPERATOR_ACCEPTED_BOOKING',
        description: `Operator ${operatorUser.name} accepted the booking execution.`,
        user: operatorUser,
        newValue: { operatorStatus: 'ACCEPTED' }
    });

    // NOTIFY ADMIN
    await notificationService.notifyAdmins(
        `Operator Accepted: ${booking.uniqueRefNo}`,
        `${operatorUser.name} has accepted the booking assignment.`,
        `/booking/${booking.id}`,
        'SUCCESS'
    );
  }

  // Operator Declines Booking
  async declineAssignment(bookingId: string, reason: string, operatorUser: User) {
    const booking = await bookingService.getBooking(bookingId);
    if (!booking) throw new Error("Booking not found");
    if (booking.operatorId !== operatorUser.id) throw new Error("Unauthorized");

    booking.operatorStatus = 'DECLINED';
    booking.operatorDeclineReason = reason;

    const msg: Message = {
        id: `sys_${Date.now()}`,
        senderId: operatorUser.id,
        senderName: 'System',
        senderRole: UserRole.ADMIN,
        content: `⚠️ Operator ${operatorUser.name} DECLINED the assignment. Reason: ${reason}`,
        timestamp: new Date().toISOString(),
        isSystem: true
    };
    booking.comments.push(msg);
    booking.updatedAt = new Date().toISOString();

    // Persist directly
    await dbHelper.save(COLLECTION, booking);

    auditLogService.logAction({
        entityType: 'OPERATOR_ASSIGNMENT',
        entityId: bookingId,
        action: 'OPERATOR_DECLINED_BOOKING',
        description: `Operator ${operatorUser.name} declined booking. Reason: ${reason}`,
        user: operatorUser,
        newValue: { operatorStatus: 'DECLINED', reason }
    });

    // NOTIFY ADMIN
    await notificationService.notifyAdmins(
        `Operator Declined: ${booking.uniqueRefNo}`,
        `${operatorUser.name} declined assignment. Reason: ${reason}`,
        `/booking/${booking.id}`,
        'WARNING'
    );
  }

  // Update Driver Details
  async updateDriverDetails(bookingId: string, details: DriverDetails, user: User) {
    const booking = await bookingService.getBooking(bookingId);
    if (!booking) throw new Error("Booking not found");
    if (booking.operatorId !== user.id) throw new Error("Unauthorized");

    booking.driverDetails = details;
    
    const msg: Message = {
        id: `sys_${Date.now()}`,
        senderId: user.id,
        senderName: 'System',
        senderRole: UserRole.ADMIN,
        content: `Driver Updated: ${details.name} (${details.vehicleModel}).`,
        timestamp: new Date().toISOString(),
        isSystem: true
    };
    booking.comments.push(msg);
    booking.updatedAt = new Date().toISOString();
    
    // Saving directly ensures persistence
    await dbHelper.save(COLLECTION, booking);

    auditLogService.logAction({
        entityType: 'BOOKING',
        entityId: bookingId,
        action: 'DRIVER_UPDATED',
        description: `Driver updated by ${user.name}`,
        user: user,
        newValue: details
    });

    // NOTIFY AGENT
    await notificationService.send(
        booking.agentId,
        `Driver Assigned: ${booking.uniqueRefNo}`,
        `Driver details updated for your trip. Check booking for details.`,
        'INFO',
        `/booking/${booking.id}`
    );
  }
}

export const bookingOperatorService = new BookingOperatorService();
