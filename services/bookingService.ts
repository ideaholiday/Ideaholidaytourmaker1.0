
import { Booking, BookingStatus, Quote, User, Message, UserRole, PaymentEntry, PaymentMode, Traveler } from '../types';
import { agentService } from './agentService';
import { dbHelper } from './firestoreHelper';
import { companyService } from './companyService';

const COLLECTION = 'bookings';

class BookingService {
  private bookingsCache: Booking[] = [];

  async syncAllBookings() {
      this.bookingsCache = await dbHelper.getAll<Booking>(COLLECTION);
  }

  getAllBookingsSync() { return this.bookingsCache; }
  getBookingSync(id: string) { return this.bookingsCache.find(b => b.id === id) || null; }

  async getAllBookings(): Promise<Booking[]> { 
      const bookings = await dbHelper.getAll<Booking>(COLLECTION); 
      this.bookingsCache = bookings;
      return bookings;
  }
  
  async getBooking(id: string): Promise<Booking | null> {
    // Prefer cache if fresh logic existed, but for now simple fetch
    const booking = await dbHelper.getById<Booking>(COLLECTION, id);
    if(booking) {
        // Update cache
        const idx = this.bookingsCache.findIndex(b => b.id === id);
        if(idx !== -1) this.bookingsCache[idx] = booking;
        else this.bookingsCache.push(booking);
    }
    return booking;
  }

  async getBookingsForAgent(agentId: string): Promise<Booking[]> {
    return await dbHelper.getWhere<Booking>(COLLECTION, 'agentId', '==', agentId);
  }

  async getBookingsForOperator(operatorId: string): Promise<Booking[]> {
    const all = await this.getAllBookings();
    // FIX: Allow REQUESTED bookings to be seen if assigned to this operator
    return all.filter(b => b.operatorId === operatorId && b.status !== 'REJECTED');
  }

  async createBookingFromQuote(quote: Quote, user: User, travelers?: Traveler[]): Promise<Booking> {
    // 1. Validation
    if (!quote.id) throw new Error("Invalid Quote ID");
    if (quote.status === 'BOOKED') throw new Error("This quote has already been booked.");

    const totalAmount = quote.sellingPrice || quote.price || 0;
    const advanceAmount = Math.ceil(totalAmount * 0.30);
    const defaultCompany = await companyService.getDefaultCompany();

    // 2. Create Booking Object
    const newBooking: Booking = {
      id: `bk_${Date.now()}_${Math.random().toString(36).substr(2,4)}`,
      quoteId: quote.id,
      uniqueRefNo: `BK-${quote.uniqueRefNo.replace('QT-', '')}`, // Transform QT ref to BK ref
      status: 'REQUESTED',
      
      destination: quote.destination || 'Unknown',
      travelDate: quote.travelDate || new Date().toISOString(),
      paxCount: quote.paxCount || 0,
      travelers: travelers || quote.travelers || [],
      itinerary: quote.itinerary || [], 
      
      netCost: quote.price || 0,
      sellingPrice: totalAmount,
      currency: quote.currency || 'INR',
      
      paymentStatus: 'PENDING',
      totalAmount: totalAmount,
      advanceAmount: advanceAmount,
      paidAmount: 0,
      balanceAmount: totalAmount,
      payments: [],

      agentId: quote.agentId || '',
      agentName: quote.agentName || 'Unknown Agent',
      // FIX: Ensure undefined becomes null for Firestore
      staffId: quote.staffId || null, 
      
      // FIX: Ensure undefined becomes null for Firestore
      operatorId: quote.operatorId || null,
      operatorName: quote.operatorName || null,
      
      companyId: defaultCompany.id,

      comments: [{
          id: `msg_${Date.now()}`,
          senderId: user.id,
          senderName: user.name === 'Client' ? 'Client' : 'System',
          senderRole: user.role === UserRole.AGENT ? UserRole.AGENT : UserRole.ADMIN,
          content: `Booking Created based on Quote #${quote.uniqueRefNo}. Waiting for Admin approval.`,
          timestamp: new Date().toISOString(),
          isSystem: true
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 3. Save Booking
    await dbHelper.save(COLLECTION, newBooking);
    
    // 4. Lock & Update Quote Status (Prevents double booking and edits)
    await agentService.updateQuote({ 
        ...quote, 
        status: 'BOOKED',
        isLocked: true 
    });

    // 5. Update Cache
    this.syncAllBookings();

    return newBooking;
  }

  async requestPublicBooking(quote: Quote, travelers: Traveler[]): Promise<Booking> {
      const clientUser: User = { id: 'public_client', name: 'Client', email: 'client@web.com', role: UserRole.AGENT, isVerified: true };
      return this.createBookingFromQuote(quote, clientUser, travelers);
  }

  async updateStatus(bookingId: string, status: BookingStatus, user: User, reason?: string) {
    const booking = await this.getBooking(bookingId);
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
    this.syncAllBookings();
  }

  async recordPayment(bookingId: string, amount: number, mode: PaymentMode, reference: string, user: User) {
      const booking = await this.getBooking(bookingId);
      if (!booking) return;

      const type = (booking.paidAmount === 0 && amount < booking.totalAmount) ? 'ADVANCE' : 'FULL';
      const companyId = booking.companyId || (await companyService.getDefaultCompany()).id;
      const receiptNumber = await companyService.generateNextReceiptNumber(companyId);

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
      this.syncAllBookings();
  }

  async requestCancellation(bookingId: string, reason: string, user: User) {
    const booking = await this.getBooking(bookingId);
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
    this.syncAllBookings();
  }

  async addComment(bookingId: string, message: Message) {
    const booking = await this.getBooking(bookingId);
    if (!booking) return;
    
    const updated = { ...booking, comments: [...booking.comments, message] };
    await dbHelper.save(COLLECTION, updated);
    this.syncAllBookings();
  }
}

export const bookingService = new BookingService();
