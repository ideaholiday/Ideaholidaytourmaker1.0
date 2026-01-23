
import { Booking, BookingStatus, Quote, User, Message, UserRole, PaymentEntry, PaymentMode, CancellationType, RefundStatus, Traveler } from '../types';
import { agentService } from './agentService';
import { auditLogService } from './auditLogService';
import { gstService } from './gstService';
import { companyService } from './companyService';
import { db } from './firebase';
import { collection, getDocs, doc, setDoc, query, where } from 'firebase/firestore';

const STORAGE_KEY_BOOKINGS = 'iht_bookings_db';

class BookingService {
  private bookings: Booking[];

  constructor() {
    const stored = localStorage.getItem(STORAGE_KEY_BOOKINGS);
    this.bookings = stored ? JSON.parse(stored) : [];
  }

  private saveLocal() {
    localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(this.bookings));
  }
  
  private async syncToCloud(booking: Booking) {
      try {
          await setDoc(doc(db, 'bookings', booking.id), booking, { merge: true });
      } catch (e) {
          console.error("Cloud save failed for booking", booking.id, e);
      }
  }

  /**
   * Syncs bookings from Cloud.
   * Call this on dashboard load.
   */
  async syncAllBookings() {
      try {
          const snapshot = await getDocs(collection(db, 'bookings'));
          const remoteBookings = snapshot.docs.map(d => d.data() as Booking);
          
          if (remoteBookings.length > 0) {
             this.bookings = remoteBookings; // Replace local with authoritative cloud data
             this.saveLocal();
          }
      } catch (e) { console.warn("Booking Sync Failed", e); }
  }

  // --- CRUD ---

  createBookingFromQuote(quote: Quote, user: User, travelers?: Traveler[]): Booking {
    const totalAmount = quote.sellingPrice || quote.price || 0;
    const advanceAmount = Math.ceil(totalAmount * 0.30);
    const defaultCompany = companyService.getDefaultCompany();

    const itinerarySnapshot = JSON.parse(JSON.stringify(quote.itinerary || []));
    const travelersSnapshot = travelers 
        ? JSON.parse(JSON.stringify(travelers)) 
        : JSON.parse(JSON.stringify(quote.travelers || []));

    const newBooking: Booking = {
      id: `bk_${Date.now()}_${Math.random().toString(36).substr(2,4)}`,
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

      comments: [{
          id: `msg_${Date.now()}`,
          senderId: user.id,
          senderName: user.name === 'Client' ? 'Client (Public)' : 'System',
          senderRole: user.role === UserRole.AGENT ? UserRole.AGENT : UserRole.ADMIN,
          content: `Booking Created.`,
          timestamp: new Date().toISOString(),
          isSystem: true
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.bookings.unshift(newBooking);
    this.saveLocal();
    this.syncToCloud(newBooking);
    
    quote.status = 'BOOKED';
    agentService.updateQuote(quote);

    return newBooking;
  }

  requestPublicBooking(quote: Quote, travelers: Traveler[]): Booking {
      const clientUser: User = { id: 'public_client', name: 'Client', email: 'client@web.com', role: UserRole.AGENT, isVerified: true };
      return this.createBookingFromQuote(quote, clientUser, travelers);
  }

  getBooking(id: string): Booking | undefined {
    return this.bookings.find(b => b.id === id);
  }

  getBookingsForAgent(agentId: string): Booking[] {
    return this.bookings.filter(b => b.agentId === agentId);
  }

  getBookingsForOperator(operatorId: string): Booking[] {
    // Also try to fetch fresh from cloud if list is empty locally
    return this.bookings.filter(b => b.operatorId === operatorId && b.status !== 'REQUESTED' && b.status !== 'REJECTED');
  }

  getAllBookings(): Booking[] {
    return this.bookings;
  }

  // --- STATUS MANAGEMENT ---

  updateStatus(bookingId: string, status: BookingStatus, user: User, reason?: string) {
    const booking = this.getBooking(bookingId);
    if (!booking) return;

    booking.status = status;
    booking.updatedAt = new Date().toISOString();

    this.addComment(bookingId, {
      id: `sys_${Date.now()}`,
      senderId: user.id,
      senderName: 'System',
      senderRole: UserRole.ADMIN,
      content: `Status updated to ${status}. ${reason || ''}`,
      timestamp: new Date().toISOString(),
      isSystem: true
    });

    this.saveLocal();
    this.syncToCloud(booking);
  }

  // --- PAYMENT ---

  recordPayment(bookingId: string, amount: number, mode: PaymentMode, reference: string, user: User) {
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

      booking.payments.push(entry);
      booking.paidAmount += amount;
      booking.balanceAmount = booking.totalAmount - booking.paidAmount;
      
      if (booking.paidAmount >= booking.totalAmount) booking.paymentStatus = 'PAID_IN_FULL';
      else if (booking.paidAmount > 0) booking.paymentStatus = 'PARTIALLY_PAID';

      this.saveLocal();
      this.syncToCloud(booking);
  }

  // --- CANCELLATION ---

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

    this.saveLocal();
    this.syncToCloud(booking);
  }

  addComment(bookingId: string, message: Message) {
    const booking = this.getBooking(bookingId);
    if (!booking) return;
    booking.comments.push(message);
    this.saveLocal();
    this.syncToCloud(booking);
  }
}

export const bookingService = new BookingService();
