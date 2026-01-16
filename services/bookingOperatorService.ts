
import { Booking, User, UserRole, Message, DriverDetails } from '../types';
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

  // Update Driver Details
  updateDriverDetails(bookingId: string, details: DriverDetails, user: User) {
    const booking = bookingService.getBooking(bookingId);
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
    
    // Saving via comment addition to ensure persistence
    bookingService.addComment(bookingId, msg);

    auditLogService.logAction({
        entityType: 'BOOKING',
        entityId: bookingId,
        action: 'DRIVER_UPDATED',
        description: `Driver updated by ${user.name}`,
        user: user,
        newValue: details
    });
  }
}

export const bookingOperatorService = new BookingOperatorService();
