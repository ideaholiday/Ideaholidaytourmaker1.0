
import { Quote, User, UserRole, Message, OperationalDetails, Visa, Booking } from '../types';
import { dbHelper } from './firestoreHelper';
import { auditLogService } from './auditLogService';
import { companyService } from './companyService';
import { bookingService } from './bookingService';

const COLLECTION = 'quotes';

class AgentService {
  
  async fetchQuotes(agentId: string): Promise<Quote[]> {
      return await dbHelper.getWhere<Quote>(COLLECTION, 'agentId', '==', agentId);
  }

  // Backwards compatibility for components not yet async
  getQuotes(agentId: string): Quote[] { 
      return []; 
  } 

  async createQuote(agent: User, destination: string, travelDate: string, pax: number, leadGuestName?: string): Promise<Quote> {
    const newQuote: Quote = {
      id: `q_${Date.now()}_${Math.random().toString(36).substr(2,5)}`,
      uniqueRefNo: `QT-${Math.floor(Math.random() * 10000)}`,
      version: 1,
      isLocked: false,
      destination,
      travelDate,
      paxCount: pax,
      leadGuestName,
      serviceDetails: 'Draft Itinerary',
      itinerary: [],
      currency: 'INR', 
      price: 0,
      cost: 0,
      markup: 0,
      agentId: agent.id,
      agentName: agent.name,
      status: 'DRAFT',
      messages: []
    };
    
    await dbHelper.save(COLLECTION, newQuote);
    return newQuote;
  }

  // --- NEW: DIRECT VISA REQUEST ---
  async createVisaRequest(agent: User, visa: Visa, travelDate: string, pax: number, guestName: string): Promise<Booking> {
      const defaultCompany = await companyService.getDefaultCompany();
      const totalAmount = visa.cost * pax;
      const advanceAmount = totalAmount; // Visas usually prepaid

      const newBooking: Booking = {
          id: `visa_req_${Date.now()}`,
          quoteId: 'DIRECT_VISA', // No quote linked
          uniqueRefNo: `VISA-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
          status: 'REQUESTED', // Triggers Admin Alert

          destination: visa.country,
          travelDate: travelDate,
          paxCount: pax,
          travelers: [{ firstName: guestName, lastName: '', title: 'Mr', type: 'ADULT' }], // Placeholder traveler
          
          itinerary: [{
              day: 1,
              title: `Visa Processing - ${visa.country}`,
              description: `Direct application request for ${visa.visaType}.`,
              services: [{
                  id: `svc_visa_${Date.now()}`,
                  type: 'VISA',
                  name: `${visa.country} - ${visa.visaType}`,
                  cost: visa.cost,
                  price: visa.cost, // Net = Selling for base request, agent markup added later if needed
                  currency: 'INR',
                  quantity: pax,
                  duration_nights: 1,
                  meta: { processingTime: visa.processingTime, entryType: visa.entryType }
              }]
          }],

          netCost: totalAmount,
          sellingPrice: totalAmount,
          currency: 'INR',

          paymentStatus: 'PENDING',
          totalAmount: totalAmount,
          advanceAmount: advanceAmount,
          paidAmount: 0,
          balanceAmount: totalAmount,
          payments: [],

          agentId: agent.id,
          agentName: agent.name,
          staffId: null,
          operatorId: null,
          operatorName: null,
          companyId: defaultCompany.id,

          comments: [{
              id: `msg_${Date.now()}`,
              senderId: agent.id,
              senderName: agent.name,
              senderRole: UserRole.AGENT,
              content: `New Visa Application Request for ${visa.country}. Please process.`,
              timestamp: new Date().toISOString(),
              isSystem: true
          }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
      };

      await dbHelper.save('bookings', newBooking);
      bookingService.syncAllBookings(); // Update global cache for notifications

      return newBooking;
  }
  
  async updateQuote(quote: Quote) {
    await dbHelper.save(COLLECTION, quote);
  }

  async deleteQuote(quoteId: string) {
    const quote = await dbHelper.getById<Quote>(COLLECTION, quoteId);
    if (quote && quote.status === 'BOOKED') {
        throw new Error("Cannot delete booked quote.");
    }
    await dbHelper.delete(COLLECTION, quoteId);
  }

  async bookQuote(quoteId: string, user: User) {
    await dbHelper.save(COLLECTION, { id: quoteId, status: 'BOOKED', isLocked: true });

    auditLogService.logAction({
        entityType: 'QUOTE',
        entityId: quoteId,
        action: 'QUOTE_BOOKED',
        description: `Quote booked by ${user.name}`,
        user: user,
        newValue: { status: 'BOOKED' }
    });
  }

  async assignOperator(
      quoteId: string, 
      operatorId: string, 
      operatorName: string, 
      options: { priceMode: 'NET_COST' | 'FIXED_PRICE'; price?: number; instructions?: string },
      adminUser: User
  ) {
      const quote = await dbHelper.getById<Quote>(COLLECTION, quoteId);
      if (!quote) throw new Error("Quote not found");

      const updates: Partial<Quote> = {
          operatorId,
          operatorName,
          operatorStatus: 'ASSIGNED',
          operatorDeclineReason: undefined // Clear any previous decline
      };

      if (options.priceMode === 'FIXED_PRICE') {
          updates.operatorPrice = options.price;
          updates.netCostVisibleToOperator = false;
      } else {
          updates.operatorPrice = undefined;
          updates.netCostVisibleToOperator = true;
      }

      // Add System Notification Message
      const msg: Message = {
          id: `sys_${Date.now()}`,
          senderId: adminUser.id,
          senderName: 'System',
          senderRole: UserRole.ADMIN,
          content: `Operator Assigned: ${operatorName}. Mode: ${options.priceMode}`,
          timestamp: new Date().toISOString(),
          isSystem: true
      };

      const messages = quote.messages || [];
      messages.push(msg);
      updates.messages = messages;

      await dbHelper.save(COLLECTION, { id: quoteId, ...updates });

      auditLogService.logAction({
          entityType: 'OPERATOR_ASSIGNMENT',
          entityId: quoteId,
          action: 'OPERATOR_ASSIGNED_TO_QUOTE',
          description: `Quote assigned to ${operatorName} by ${adminUser.name}`,
          user: adminUser
      });
  }
  
  async updateOperationalDetails(quoteId: string, details: OperationalDetails) {
      // Merging existing details with new updates
      const quote = await dbHelper.getById<Quote>(COLLECTION, quoteId);
      if (!quote) throw new Error("Quote not found");
      
      const updatedDetails = {
          ...quote.operationalDetails,
          ...details
      };
      
      await dbHelper.save(COLLECTION, { id: quoteId, operationalDetails: updatedDetails });
  }

  async getOperatorAssignments(operatorId: string): Promise<Quote[]> {
      return await dbHelper.getWhere<Quote>(COLLECTION, 'operatorId', '==', operatorId);
  }

  async getBookedHistory(agentId: string): Promise<Quote[]> {
      const all = await this.fetchQuotes(agentId);
      return all.filter(q => q.status === 'BOOKED' || q.status === 'CONFIRMED');
  }
  
  async getStats(agentId: string) {
    const myQuotes = await this.fetchQuotes(agentId);
    const confirmed = myQuotes.filter(q => q.status === 'BOOKED' || q.status === 'CONFIRMED');
    
    return {
      totalQuotes: myQuotes.length,
      activeQuotes: myQuotes.filter(q => q.status !== 'CANCELLED').length,
      confirmedQuotes: confirmed.length,
      totalRevenue: confirmed.reduce((sum, q) => sum + (q.sellingPrice || q.price || 0), 0),
      conversionRate: myQuotes.length > 0 ? Math.round((confirmed.length / myQuotes.length) * 100) : 0
    };
  }

  async createRevision(originalId: string, agent: User): Promise<Quote | null> {
      const original = await dbHelper.getById<Quote>(COLLECTION, originalId);
      if (!original) return null;
      
      const copy = { ...original, id: `rev_${Date.now()}`, version: original.version + 1, isLocked: false };
      await dbHelper.save(COLLECTION, copy);
      return copy;
  }
  
  async duplicateQuote(originalId: string, agentId: string): Promise<Quote | null> {
      const original = await dbHelper.getById<Quote>(COLLECTION, originalId);
      if (!original) return null;
      
      const copy = { ...original, id: `copy_${Date.now()}`, uniqueRefNo: `COPY-${Date.now()}`, status: 'DRAFT' as const, isLocked: false };
      await dbHelper.save(COLLECTION, copy);
      return copy;
  }

  async updateAgentProfile(agentId: string, updates: Partial<User>) {
      await dbHelper.save('users', { id: agentId, ...updates });
  }
}

export const agentService = new AgentService();
