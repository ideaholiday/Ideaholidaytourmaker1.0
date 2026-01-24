
import { Quote, User } from '../types';
import { dbHelper } from './firestoreHelper';
import { auditLogService } from './auditLogService';

const COLLECTION = 'quotes';

class AgentService {
  
  // --- READ ---
  
  async fetchQuotes(agentId: string): Promise<Quote[]> {
      // Firestore Index: quotes where agentId == X
      return await dbHelper.getWhere<Quote>(COLLECTION, 'agentId', '==', agentId);
  }

  // Sync access not possible with Firestore (async), components must wait for promise.
  // We keep this signature but it returns empty until fetched, or components need refactor.
  // For safety in this refactor, we rely on components handling the async fetch in their useEffect.
  getQuotes(agentId: string): Quote[] { return []; } 

  // --- WRITE ---

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

  // --- OPERATOR ---
  async getOperatorAssignments(operatorId: string): Promise<Quote[]> {
      return await dbHelper.getWhere<Quote>(COLLECTION, 'operatorId', '==', operatorId);
  }

  async getBookedHistory(agentId: string): Promise<Quote[]> {
      // In Firestore, we'd do a compound query, but here we can filter client side or do simple where
      const all = await this.fetchQuotes(agentId);
      return all.filter(q => q.status === 'BOOKED' || q.status === 'CONFIRMED');
  }
  
  // Stats calculation needs to fetch all quotes for the agent
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

  // Revisions/Duplications
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
