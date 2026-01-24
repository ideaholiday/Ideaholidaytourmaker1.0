
import { Quote, User, UserRole, Message } from '../types';
import { dbHelper } from './firestoreHelper';
import { auditLogService } from './auditLogService';

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
