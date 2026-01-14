
import { Booking, BookingStatus, Quote, User, Message, UserRole, PaymentEntry, PaymentMode, CancellationType, RefundStatus, Traveler } from '../types';
import { agentService } from './agentService';
import { auditLogService } from './auditLogService';
import { gstService } from './gstService';
import { companyService } from './companyService';

const STORAGE_KEY_BOOKINGS = 'iht_bookings_db';

class BookingService {
  private bookings: Booking[];

  constructor() {
    const stored = localStorage.getItem(STORAGE_KEY_BOOKINGS);
    this.bookings = stored ? JSON.parse(stored) : [];
  }

  private save() {
    localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(this.bookings));
  }

  // --- CRUD ---

  createBookingFromQuote(quote: Quote, user: User, travelers?: Traveler[]): Booking {
    const totalAmount = quote.sellingPrice || quote.price || 0;
    const advanceAmount = Math.ceil(totalAmount * 0.30); // Default 30% Advance
    
    // Assign default company for now.
    const defaultCompany = companyService.getDefaultCompany();

    // 1. CREATE SNAPSHOT (Deep Copy)
    const itinerarySnapshot = JSON.parse(JSON.stringify(quote.itinerary || []));
    const travelersSnapshot = travelers 
        ? JSON.parse(JSON.stringify(travelers)) 
        : JSON.parse(JSON.stringify(quote.travelers || []));

    const newBooking: Booking = {
      id: `bk_${Date.now()}`,
      quoteId: quote.id,
      uniqueRefNo: quote.uniqueRefNo,
      status: 'REQUESTED',
      
      destination: quote.destination,
      travelDate: quote.travelDate,
      paxCount: quote.paxCount,
      travelers: travelersSnapshot,
      itinerary: itinerarySnapshot, 
      
      netCost: quote.price || 0,
      sellingPrice: totalAmount,
      currency: quote.currency,
      
      paymentStatus: 'PENDING',
      totalAmount: totalAmount,
      advanceAmount: advanceAmount,
      paidAmount: 0,
      balanceAmount: totalAmount,
      payments: [],

      agentId: quote.agentId,
      agentName: quote.agentName,
      staffId: quote.staffId,
      
      operatorId: undefined, 
      operatorName: undefined,
      
      companyId: defaultCompany.id,

      comments: [
        {
          id: `msg_${Date.now()}`,
          senderId: user.id,
          senderName: user.name === 'Client' ? 'Client (Public)' : 'System',
          senderRole: user.role === UserRole.AGENT ? UserRole.AGENT : UserRole.ADMIN,
          content: `Booking Created from Quote #${quote.uniqueRefNo}. Snapshot locked. Status: REQUESTED.`,
          timestamp: new Date().toISOString(),
          isSystem: true
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.bookings.unshift(newBooking);
    this.save();
    
    // 2. LOCK THE QUOTE
    quote.status = 'BOOKED';
    agentService.updateQuote(quote);

    auditLogService.logAction({
      entityType: 'BOOKING',
      entityId: newBooking.id,
      action: 'BOOKING_REQUESTED',
      description: `New booking created via ${user.name}. Value: ${newBooking.currency} ${totalAmount}.`,
      user: user,
      newValue: { status: 'REQUESTED', totalAmount }
    });

    return newBooking;
  }

  // NEW: Handle Public Client Requests
  requestPublicBooking(quote: Quote, travelers: Traveler[]): Booking {
      // Mock a 'Client' user for the context of this operation
      const clientUser: User = {
          id: 'public_client',
          name: 'Client',
          email: 'client@web.com',
          role: UserRole.AGENT, // Treated as agent-initiated for permissions
          isVerified: true
      };
      
      return this.createBookingFromQuote(quote, clientUser, travelers);
  }

  getBooking(id: string): Booking | undefined {
    return this.bookings.find(b => b.id === id);
  }

  getBookingsForAgent(agentId: string): Booking[] {
    return this.bookings.filter(b => b.agentId === agentId);
  }

  getBookingsForOperator(operatorId: string): Booking[] {
    return this.bookings.filter(b => b.operatorId === operatorId && b.status !== 'REQUESTED' && b.status !== 'REJECTED');
  }

  getAllBookings(): Booking[] {
    return this.bookings;
  }

  // --- STATUS MANAGEMENT ---

  updateStatus(bookingId: string, status: BookingStatus, user: User, reason?: string) {
    const booking = this.getBooking(bookingId);
    if (!booking) return;

    const previousStatus = booking.status;
    booking.status = status;
    booking.updatedAt = new Date().toISOString();

    let statusMsg = `Status updated to ${status}.`;
    if (status === 'IN_PROGRESS') statusMsg = "🚀 Service Started. Trip is now In Progress.";
    if (status === 'COMPLETED') statusMsg = "🏁 Service Completed. Trip marked as finished.";
    if (reason) statusMsg += ` Note: ${reason}`;
    
    this.addComment(bookingId, {
      id: `sys_${Date.now()}`,
      senderId: user.id,
      senderName: 'System',
      senderRole: user.role === UserRole.OPERATOR ? UserRole.ADMIN : user.role,
      content: statusMsg,
      timestamp: new Date().toISOString(),
      isSystem: true
    });

    this.save();

    if (status === 'CONFIRMED' && previousStatus !== 'CONFIRMED') {
        const inv = gstService.generateInvoice(booking);
        if (inv) {
            this.addComment(bookingId, {
                id: `sys_inv_${Date.now()}`,
                senderId: 'system',
                senderName: 'System',
                senderRole: UserRole.ADMIN,
                content: `Tax Invoice Generated: ${inv.invoiceNumber}`,
                timestamp: new Date().toISOString(),
                isSystem: true
            });
        }
    }

    auditLogService.logAction({
      entityType: 'BOOKING',
      entityId: bookingId,
      action: 'STATUS_CHANGE',
      description: `Status: ${previousStatus} -> ${status}.`,
      user: user,
      previousValue: { status: previousStatus },
      newValue: { status: status }
    });
  }

  // --- PAYMENT MANAGEMENT ---

  recordPayment(bookingId: string, amount: number, mode: PaymentMode, reference: string, user: User) {
      const booking = this.getBooking(bookingId);
      if (!booking) return;

      const type = (booking.paidAmount === 0 && amount < booking.totalAmount) 
          ? 'ADVANCE' 
          : (amount + booking.paidAmount >= booking.totalAmount ? 'FULL' : 'BALANCE');

      // Generate Receipt Number
      const companyId = booking.companyId || companyService.getDefaultCompany().id;
      const receiptNumber = companyService.generateNextReceiptNumber(companyId);

      const entry: PaymentEntry = {
          id: `pay_${Date.now()}`,
          type,
          amount,
          date: new Date().toISOString(),
          mode,
          reference,
          receiptNumber,
          recordedBy: user.id,
          companyId: companyId
      };

      booking.payments.push(entry);
      booking.paidAmount += amount;
      booking.balanceAmount = booking.totalAmount - booking.paidAmount;

      if (booking.paidAmount >= booking.totalAmount) {
          booking.paymentStatus = 'PAID_IN_FULL';
      } else if (booking.paidAmount >= booking.advanceAmount) {
          booking.paymentStatus = 'ADVANCE_PAID';
      } else if (booking.paidAmount > 0) {
          booking.paymentStatus = 'PARTIALLY_PAID';
      }

      this.addComment(bookingId, {
          id: `sys_${Date.now()}`,
          senderId: user.id,
          senderName: 'System',
          senderRole: UserRole.ADMIN,
          content: `Payment Received: ${booking.currency} ${amount.toLocaleString()} (${type}). Receipt #${receiptNumber}`,
          timestamp: new Date().toISOString(),
          isSystem: true
      });

      this.save();
  }

  // --- CANCELLATION LOGIC ---

  requestCancellation(bookingId: string, reason: string, user: User) {
    const booking = this.getBooking(bookingId);
    if (!booking) return;

    booking.status = 'CANCELLATION_REQUESTED';
    booking.cancellation = {
      requestedBy: user.id,
      requestedAt: new Date().toISOString(),
      reason: reason,
      refundStatus: 'PENDING'
    };
    booking.updatedAt = new Date().toISOString();

    this.addComment(bookingId, {
      id: `sys_${Date.now()}`,
      senderId: user.id,
      senderName: 'System',
      senderRole: UserRole.ADMIN,
      content: `⚠️ Cancellation Requested. Reason: ${reason}`,
      timestamp: new Date().toISOString(),
      isSystem: true
    });

    this.save();
  }

  processCancellation(
    bookingId: string, 
    type: CancellationType, 
    penaltyAmount: number, 
    refundAmount: number, 
    adminNote: string,
    user: User
  ) {
    const booking = this.getBooking(bookingId);
    if (!booking) return;

    const refundStatus: RefundStatus = refundAmount > 0 ? 'PROCESSED' : 'NOT_APPLICABLE';
    const finalStatus: BookingStatus = refundAmount > 0 ? 'CANCELLED_WITH_REFUND' : 'CANCELLED_NO_REFUND';

    if (booking.cancellation) {
      booking.cancellation.processedBy = user.id;
      booking.cancellation.processedAt = new Date().toISOString();
      booking.cancellation.type = type;
      booking.cancellation.penaltyAmount = penaltyAmount;
      booking.cancellation.refundAmount = refundAmount;
      booking.cancellation.refundStatus = refundStatus;
      booking.cancellation.adminNote = adminNote;
    }

    booking.status = finalStatus;
    
    if (refundAmount > 0) {
      booking.paymentStatus = 'REFUNDED';
      booking.payments.push({
        id: `ref_${Date.now()}`,
        type: 'REFUND',
        amount: -refundAmount,
        date: new Date().toISOString(),
        mode: 'ONLINE',
        reference: 'Cancellation Refund',
        recordedBy: user.id,
        companyId: booking.companyId
      });
    }

    this.addComment(bookingId, {
      id: `sys_${Date.now()}`,
      senderId: user.id,
      senderName: 'System',
      senderRole: UserRole.ADMIN,
      content: `🚫 Booking Cancelled. Status: ${finalStatus}`,
      timestamp: new Date().toISOString(),
      isSystem: true
    });

    this.save();

    const cn = gstService.generateCreditNote(booking, refundAmount);
    if (cn) {
        this.addComment(bookingId, {
            id: `sys_cn_${Date.now()}`,
            senderId: 'system',
            senderName: 'System',
            senderRole: UserRole.ADMIN,
            content: `GST Credit Note Generated: ${cn.creditNoteNumber}`,
            timestamp: new Date().toISOString(),
            isSystem: true
        });
    }
  }

  addComment(bookingId: string, message: Message) {
    const booking = this.getBooking(bookingId);
    if (!booking) return;
    booking.comments.push(message);
    this.save();
  }
}

export const bookingService = new BookingService();
