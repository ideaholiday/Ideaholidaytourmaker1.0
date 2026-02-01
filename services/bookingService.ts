
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
    const booking = await dbHelper.getById<Booking>(COLLECTION, id);
    if(booking) {
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
    return all.filter(b => b.operatorId === operatorId && b.status !== 'REJECTED');
  }

  async createBookingFromQuote(quote: Quote, user: User, travelers?: Traveler[]): Promise<Booking> {
    // B2B LOGIC: Total Payable by Agent is the NET COST (quote.price).
    // Selling Price is stored for Agent's reference/Client View.
    const totalAmount = quote.price || 0; 
    const sellingPrice = quote.sellingPrice || totalAmount; 
    
    // Advance logic based on Net Cost
    const advanceAmount = Math.ceil(totalAmount * 0.30);
    
    const defaultCompany = await companyService.getDefaultCompany();

    const newBooking: Booking = {
      id: `bk_${Date.now()}_${Math.random().toString(36).substr(2,4)}`,
      quoteId: quote.id || '',
      uniqueRefNo: quote.uniqueRefNo || 'REF-ERR',
      status: 'REQUESTED',
      
      destination: quote.destination || 'Unknown',
      travelDate: quote.travelDate || new Date().toISOString(),
      paxCount: quote.paxCount || 0,
      travelers: travelers || quote.travelers || [],
      itinerary: quote.itinerary || [], 
      
      netCost: quote.price || 0,
      sellingPrice: sellingPrice,
      currency: quote.currency || 'INR',
      
      paymentStatus: 'PENDING',
      totalAmount: totalAmount, // Agent owes Net Cost
      advanceAmount: advanceAmount,
      paidAmount: 0,
      balanceAmount: totalAmount,
      payments: [],

      agentId: quote.agentId || '',
      agentName: quote.agentName || 'Unknown Agent',
      staffId: quote.staffId || null, 
      
      operatorId: quote.operatorId || null,
      operatorName: quote.operatorName || null,
      
      companyId: defaultCompany.id,
      publicNote: quote.publicNote, // Inherit any existing note

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
    
    await agentService.updateQuote({ ...quote, status: 'BOOKED' });
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

  async updateBooking(booking: Booking) {
      await dbHelper.save(COLLECTION, { ...booking, updatedAt: new Date().toISOString() });
      this.syncAllBookings();
  }

  async recordPayment(
      bookingId: string, 
      amount: number, 
      mode: PaymentMode, 
      reference: string, 
      user: User,
      verificationStatus: 'VERIFIED' | 'FAILED_VERIFY' | 'PENDING' = 'VERIFIED',
      source: 'WEBHOOK' | 'MANUAL' | 'SYSTEM' = 'MANUAL'
  ) {
      const booking = await this.getBooking(bookingId);
      if (!booking) return;

      // Duplicate Check: If we already have this reference (likely from webhook or retry), stop.
      // Exception: If prev attempt failed verification, allow retry (not implemented here for simplicity)
      if (booking.payments.some(p => p.reference === reference)) {
          console.warn("Duplicate payment attempt detected", reference);
          return;
      }

      const type = (booking.paidAmount === 0 && amount < booking.totalAmount) ? 'ADVANCE' : 'FULL';
      const companyId = booking.companyId || (await companyService.getDefaultCompany()).id;
      const receiptNumber = await companyService.generateNextReceiptNumber(companyId);

      const entry: PaymentEntry = {
          id: `pay_${Date.now()}_${Math.random().toString(36).substr(2,4)}`,
          type,
          amount,
          date: new Date().toISOString(),
          mode,
          reference,
          receiptNumber,
          recordedBy: user.id,
          companyId,
          verificationStatus, 
          source
      };

      const newPaid = booking.paidAmount + amount;
      
      // Strict Floating Point Safety
      const total = booking.totalAmount;
      const paid = Math.round(newPaid * 100) / 100;
      
      let newStatus = booking.paymentStatus;
      
      // Update Status based on Agent's Payable Amount (Net Cost)
      // Allow tiny rounding diff (0.5)
      if (paid >= (total - 0.5)) { 
          newStatus = 'PAID_IN_FULL';
      } else if (paid > 0) {
          newStatus = 'PARTIALLY_PAID';
      }

      const updated = {
          ...booking,
          payments: [...booking.payments, entry],
          paidAmount: paid,
          balanceAmount: Math.max(0, total - paid),
          paymentStatus: newStatus,
          updatedAt: new Date().toISOString()
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
