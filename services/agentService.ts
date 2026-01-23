
import { Quote, User } from '../types';
import { INITIAL_QUOTES } from '../constants';
import { apiClient } from './apiClient';
import { auditLogService } from './auditLogService';
import { db } from './firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, query, where } from 'firebase/firestore';

const STORAGE_KEY_QUOTES = 'iht_agent_quotes';

class AgentService {
  private quotes: Quote[];
  private isOffline = false;

  constructor() {
    const stored = localStorage.getItem(STORAGE_KEY_QUOTES);
    this.quotes = stored ? JSON.parse(stored) : INITIAL_QUOTES;
  }

  private saveLocal() {
    localStorage.setItem(STORAGE_KEY_QUOTES, JSON.stringify(this.quotes));
  }

  /**
   * Syncs quotes from Cloud for the specific Agent.
   */
  async fetchQuotes(agentId: string): Promise<Quote[]> {
      if (this.isOffline) return this.quotes.filter(q => q.agentId === agentId);

      try {
        const q = query(collection(db, 'quotes'), where('agentId', '==', agentId));
        const snapshot = await getDocs(q);
        const remoteQuotes = snapshot.docs.map(d => d.data() as Quote);
        
        if (remoteQuotes.length > 0) {
            // Merge with local: Remote wins conflicts
            const localMap = new Map(this.quotes.map(i => [i.id, i]));
            remoteQuotes.forEach(rq => localMap.set(rq.id, rq));
            this.quotes = Array.from(localMap.values());
            this.saveLocal();
        }
        return this.quotes.filter(q => q.agentId === agentId);
      } catch (e: any) {
          if (e.code === 'permission-denied' || e.code === 'unavailable' || e.code === 'not-found') {
              this.isOffline = true;
          } else {
              console.warn("Cloud Sync Error (Quotes):", e);
          }
          return this.quotes.filter(q => q.agentId === agentId);
      }
  }

  // --- ACTIONS ---

  createQuote(agent: User, destination: string, travelDate: string, pax: number, leadGuestName?: string): Quote {
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
    
    this.quotes.unshift(newQuote);
    this.saveLocal();
    this.syncToCloud(newQuote);
    
    return newQuote;
  }
  
  updateQuote(quote: Quote) {
    const index = this.quotes.findIndex(q => q.id === quote.id);
    if (index !== -1) {
      this.quotes[index] = quote;
      this.saveLocal();
      this.syncToCloud(quote);
    }
  }

  async deleteQuote(quoteId: string) {
    const index = this.quotes.findIndex(q => q.id === quoteId);
    if (index !== -1) {
        if (this.quotes[index].status === 'BOOKED') throw new Error("Cannot delete booked quote.");
        this.quotes.splice(index, 1);
        this.saveLocal();
        
        if (!this.isOffline) {
            try {
                await deleteDoc(doc(db, 'quotes', quoteId));
            } catch (e: any) { console.error("Cloud delete failed", e); }
        }
    }
  }

  async bookQuote(quoteId: string, user: User) {
    const quote = this.quotes.find(q => q.id === quoteId);
    if (!quote) throw new Error("Quote not found");
    
    quote.status = 'BOOKED';
    quote.isLocked = true;
    this.saveLocal();
    this.syncToCloud(quote);

    auditLogService.logAction({
        entityType: 'QUOTE',
        entityId: quote.id,
        action: 'QUOTE_BOOKED',
        description: `Agent ${user.name} booked Quote ${quote.uniqueRefNo}`,
        user: user,
        newValue: { status: 'BOOKED' }
    });
  }

  // --- HELPERS ---

  private async syncToCloud(quote: Quote) {
      if (this.isOffline) return;
      try {
          await setDoc(doc(db, 'quotes', quote.id), quote, { merge: true });
      } catch (e: any) {
          if (e.code === 'permission-denied' || e.code === 'unavailable' || e.code === 'not-found') {
              this.isOffline = true;
          } else {
              console.error("Cloud save failed for quote", quote.id, e);
          }
      }
  }

  // Fetch all quotes assigned to an operator (Cross-User)
  async getOperatorAssignments(operatorId: string): Promise<Quote[]> {
      if (this.isOffline) {
          return this.quotes.filter(q => q.operatorId === operatorId);
      }

      try {
        const q = query(collection(db, 'quotes'), where('operatorId', '==', operatorId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data() as Quote);
      } catch (e) {
          return this.quotes.filter(q => q.operatorId === operatorId);
      }
  }

  getQuotes(agentId: string): Quote[] {
    return this.quotes.filter(q => q.agentId === agentId && q.status !== 'BOOKED');
  }

  getBookedHistory(agentId: string): Quote[] {
      return this.quotes.filter(q => q.agentId === agentId && (q.status === 'BOOKED' || q.status === 'CONFIRMED'));
  }
  
  // Method to fetch booked history from cloud
  async fetchHistory(agentId: string): Promise<Quote[]> {
       // Re-use fetchQuotes as it pulls all for agent, then filter locally
       await this.fetchQuotes(agentId);
       return this.getBookedHistory(agentId);
  }

  getStats(agentId: string) {
    const myQuotes = this.quotes.filter(q => q.agentId === agentId);
    const confirmed = myQuotes.filter(q => q.status === 'BOOKED' || q.status === 'CONFIRMED');
    
    return {
      totalQuotes: myQuotes.length,
      activeQuotes: myQuotes.filter(q => q.status !== 'CANCELLED').length,
      confirmedQuotes: confirmed.length,
      totalRevenue: confirmed.reduce((sum, q) => sum + (q.sellingPrice || q.price || 0), 0),
      conversionRate: myQuotes.length > 0 ? Math.round((confirmed.length / myQuotes.length) * 100) : 0
    };
  }

  // Mock methods for compatibility
  createRevision(originalId: string, agent: User): Quote | null {
      const original = this.quotes.find(q => q.id === originalId);
      if (!original) return null;
      const copy = { ...original, id: `rev_${Date.now()}`, version: original.version + 1, isLocked: false };
      this.quotes.unshift(copy);
      this.saveLocal();
      this.syncToCloud(copy);
      return copy;
  }
  
  duplicateQuote(originalId: string, agentId: string): Quote | null {
      const original = this.quotes.find(q => q.id === originalId);
      if (!original) return null;
      const copy = { ...original, id: `copy_${Date.now()}`, uniqueRefNo: `COPY-${Date.now()}`, status: 'DRAFT' as const, isLocked: false };
      this.quotes.unshift(copy);
      this.saveLocal();
      this.syncToCloud(copy);
      return copy;
  }
}

export const agentService = new AgentService();
