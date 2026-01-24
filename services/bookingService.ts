
import { Booking, BookingStatus, Quote, User, Message, UserRole, PaymentEntry, PaymentMode, Traveler } from '../types';
import { agentService } from './agentService';
import { dbHelper } from './firestoreHelper';
import { companyService } from './companyService';

const COLLECTION = 'bookings';

class BookingService {
  private cache: Booking[] = [];

  // Used by AuthContext to preload data
  async syncAllBookings() {
      this.cache = await dbHelper.getAll<Booking>(COLLECTION);
  }

  // Sync access for UI components (Relies on syncAllBookings being called)
  getAllBookings(): Booking[] { return this.cache; }
  
  getBooking(id: string): Booking | undefined {
    return this.cache.find(b => b.id === id);
  }

  getBookingsForAgent(agentId: string): Booking[] {
    return this.cache.filter(b => b.agentId === agentId);
  }

  getBookingsForOperator(operatorId: string): Booking[] {
    return this.cache.filter(b => b.operatorId === operatorId && b.status !== 'REQUESTED' && b.status !== 'REJECTED');
  }

  // --- CRUD ---

  async createBookingFromQuote(quote: Quote, user: User, travelers?: Traveler[]): Promise<Booking> {
    const totalAmount = quote.sellingPrice || quote.price || 0;
    const advanceAmount = Math.ceil(totalAmount * 0.30);
    const defaultCompany = companyService.getDefaultCompany();

    const newBooking: Booking = {
      id: `bk_${Date.now()}_${Math.random().toString(36).substr(2,4)}`,
      quoteId: quote.id,
      uniqueRefNo: quote.uniqueRefNo,
      status: 'REQUESTED',
      
      destination: quote.destination,
      travelDate: quote.travelDate,
      paxCount: quote.paxCount,
      travelers: travelers || quote.travelers || [],
      itinerary: quote.itinerary, 
      
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
      
      companyId: defaultCompany.id,

      comments: [{
          id: `msg_${Date.now()}`,
          senderId: user.id,
          senderName: user.name === 'Client' ? 'Client' : 'System',
          senderRole: user.role === UserRole.AGENT ? UserRole.AGENT : UserRole.ADMIN,
          content: `Booking Created.`,
          timestamp: new Date().toISOString(),
          isSystem: true
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await dbHelper.save(COLLECTION, newBooking);
    
    // Update Quote status
    await agentService.updateQuote({ ...quote, status: 'BOOKED' });

    // Refresh cache
    await this.syncAllBookings();
    
    return newBooking;
  }

  async requestPublicBooking(quote: Quote, travelers: Traveler[]): Promise<Booking> {
      const clientUser: User = { id: 'public_client', name: 'Client', email: 'client@web.com', role: UserRole.AGENT, isVerified: true };
      return this.createBookingFromQuote(quote, clientUser, travelers);
  }

  // --- UPDATES ---

  async updateStatus(bookingId: string, status: BookingStatus, user: User, reason?: string) {
    const booking = this.getBooking(bookingId);
    if (!booking) return;

    const updated = {
        ...booking,
        status,
        updatedAt: new Date().toISOString(),
        comments: [...booking.comments, {
            id: `sys_${Date.now()}`,
            senderId: user.id,
            senderName: 'System',
            senderRole: UserRole.ADMIN,
            content: `Status updated to ${status}. ${reason || ''}`,
            timestamp: new Date().toISOString(),
            isSystem: true
        }]
    };

    await dbHelper.save(COLLECTION, updated);
    await this.syncAllBookings();
  }

  async recordPayment(bookingId: string, amount: number, mode: PaymentMode, reference: string, user: User) {
      const booking = this.getBooking(bookingId);
      if (!booking) return;

      const type = (booking.paidAmount === 0 && amount < booking.totalAmount) ? 'ADVANCE' : 'FULL';
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
          companyId
      };

      const newPaid = booking.paidAmount + amount;
      let newStatus = booking.paymentStatus;
      
      if (newPaid >= booking.totalAmount) newStatus = 'PAID_IN_FULL';
      else if (newPaid > 0) newStatus = 'PARTIALLY_PAID';

      const updated = {
          ...booking,
          payments: [...booking.payments, entry],
          paidAmount: newPaid,
          balanceAmount: booking.totalAmount - newPaid,
          paymentStatus: newStatus
      };

      await dbHelper.save(COLLECTION, updated);
      await this.syncAllBookings();
  }

  async requestCancellation(bookingId: string, reason: string, user: User) {
    const booking = this.getBooking(bookingId);
    if (!booking) return;

    const updated = {
        ...booking,
        status: 'CANCELLATION_REQUESTED' as BookingStatus,
        updatedAt: new Date().toISOString(),
        cancellation: {
            requestedBy: user.id,
            requestedAt: new Date().toISOString(),
            reason: reason,
            refundStatus: 'PENDING' as any
        }
    };

    await dbHelper.save(COLLECTION, updated);
    await this.syncAllBookings();
  }

  async addComment(bookingId: string, message: Message) {
    const booking = this.getBooking(bookingId);
    if (!booking) return;
    
    const updated = { ...booking, comments: [...booking.comments, message] };
    await dbHelper.save(COLLECTION, updated);
    await this.syncAllBookings();
  }
}

export const bookingService = new BookingService();
