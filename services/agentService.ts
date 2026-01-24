
import { Quote, User } from '../types';
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
}

export const agentService = new AgentService();
