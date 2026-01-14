
import { Booking, User, UserRole, Message } from '../types';
import { bookingService } from './bookingService';
import { auditLogService } from './auditLogService';

class BookingOperatorService {

  // Assign Operator to a Booking
  assignOperator(
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
    const booking = bookingService.getBooking(bookingId);
    if (!booking) throw new Error("Booking not found");

    const previousOperator = booking.operatorName || 'None';

    // Update fields
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

    // Persist via BookingService (it saves the array ref)
    // Note: bookingService.save() is private, but modifying the object works if we trigger a save.
    // We can use a public method on bookingService or assume reference mutation + internal save mechanism.
    // For this architecture, we'll re-save via bookingService's update mechanism logic (simulated by triggering a status update or just accessing the array if shared).
    // Better way: Call a method on bookingService to force save.
    // We will assume `bookingService` uses the shared array reference.
    // To be safe, let's call a method that triggers save.
    bookingService.updateStatus(booking.id, booking.status, adminUser, 'Operator Assigned');

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
  }

  // Operator Accepts Booking
  acceptAssignment(bookingId: string, operatorUser: User) {
    const booking = bookingService.getBooking(bookingId);
    if (!booking) throw new Error("Booking not found");
    if (booking.operatorId !== operatorUser.id) throw new Error("Unauthorized");

    booking.operatorStatus = 'ACCEPTED';
    
    // Auto-move booking to IN_PROGRESS if it was CONFIRMED
    if (booking.status === 'CONFIRMED') {
        booking.status = 'IN_PROGRESS';
    }

    const msg: Message = {
        id: `sys_${Date.now()}`,
        senderId: operatorUser.id,
        senderName: 'System',
        senderRole: UserRole.ADMIN, // Appear as system
        content: `Operator ${operatorUser.name} ACCEPTED the assignment. Booking is now IN PROGRESS.`,
        timestamp: new Date().toISOString(),
        isSystem: true
    };
    booking.comments.push(msg);
    
    bookingService.updateStatus(booking.id, booking.status, operatorUser, 'Operator Accepted');

    auditLogService.logAction({
        entityType: 'OPERATOR_ASSIGNMENT',
        entityId: bookingId,
        action: 'OPERATOR_ACCEPTED_BOOKING',
        description: `Operator ${operatorUser.name} accepted the booking execution.`,
        user: operatorUser,
        newValue: { operatorStatus: 'ACCEPTED' }
    });
  }

  // Operator Declines Booking
  declineAssignment(bookingId: string, reason: string, operatorUser: User) {
    const booking = bookingService.getBooking(bookingId);
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

    // Persist
    bookingService.updateStatus(booking.id, booking.status, operatorUser, 'Operator Declined');

    auditLogService.logAction({
        entityType: 'OPERATOR_ASSIGNMENT',
        entityId: bookingId,
        action: 'OPERATOR_DECLINED_BOOKING',
        description: `Operator ${operatorUser.name} declined booking. Reason: ${reason}`,
        user: operatorUser,
        newValue: { operatorStatus: 'DECLINED', reason }
    });
  }
}

export const bookingOperatorService = new BookingOperatorService();
