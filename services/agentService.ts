
import { Quote, User, UserRole, PricingBreakdown } from '../types';
import { INITIAL_QUOTES } from '../constants';
import { calculateQuotePrice } from '../utils/pricingEngine';

// Mock Storage Key
const STORAGE_KEY_QUOTES = 'iht_agent_quotes';

class AgentService {
  private quotes: Quote[];

  constructor() {
    const stored = localStorage.getItem(STORAGE_KEY_QUOTES);
    
    // Safety Logic: Merge stored quotes with Initial Mock Quotes
    // If we have stored data, use it. If code introduces NEW initial quotes (rare), we can merge them here.
    // For quotes, typically we just load stored, but to be consistent with adminService:
    if (stored) {
        const storedQuotes = JSON.parse(stored) as Quote[];
        const storedIds = new Set(storedQuotes.map(q => q.id));
        const newDefaults = INITIAL_QUOTES.filter(q => !storedIds.has(q.id));
        this.quotes = [...storedQuotes, ...newDefaults];
    } else {
        this.quotes = [...INITIAL_QUOTES];
    }
  }

  private save() {
    localStorage.setItem(STORAGE_KEY_QUOTES, JSON.stringify(this.quotes));
  }

  // Get all quotes for specific agent
  getQuotes(agentId: string): Quote[] {
    return this.quotes.filter(q => q.agentId === agentId).sort((a, b) => 
      new Date(b.messages[0]?.timestamp || b.travelDate).getTime() - new Date(a.messages[0]?.timestamp || a.travelDate).getTime()
    );
  }

  // Get Assignments for Operator
  getOperatorAssignments(operatorId: string): Quote[] {
    return this.quotes.filter(q => q.operatorId === operatorId).sort((a, b) => 
      new Date(a.travelDate).getTime() - new Date(b.travelDate).getTime()
    );
  }

  // Get Agent KPIs
  getStats(agentId: string) {
    const myQuotes = this.getQuotes(agentId);
    const active = myQuotes.filter(q => q.status !== 'CANCELLED');
    const confirmed = myQuotes.filter(q => q.status === 'CONFIRMED');
    
    // Calculate total revenue (Selling Price only)
    // Priority: Selling Price (Client Cost) > Price (B2B Cost) > 0
    const totalRevenue = confirmed.reduce((sum, q) => sum + (q.sellingPrice || q.price || 0), 0);

    return {
      totalQuotes: myQuotes.length,
      activeQuotes: active.length,
      confirmedQuotes: confirmed.length,
      totalRevenue,
      conversionRate: myQuotes.length > 0 ? Math.round((confirmed.length / myQuotes.length) * 100) : 0
    };
  }

  // Create new Quote
  createQuote(agent: User, destination: string, travelDate: string, pax: number, leadGuestName?: string): Quote {
    const newQuote: Quote = {
      id: `q_${Date.now()}`,
      uniqueRefNo: `IHT-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`,
      destination,
      travelDate,
      paxCount: pax,
      leadGuestName,
      serviceDetails: 'Standard B2B Package (Pending Customization)',
      itinerary: [],
      currency: 'USD', // Default
      price: 0,
      cost: 0, // Hidden from agent view in UI, but exists in DB
      markup: 0,
      agentId: agent.id,
      agentName: agent.name,
      staffId: 'u2', // Auto-assign default staff
      staffName: 'Staff Sarah', // Mock
      status: 'PENDING',
      messages: []
    };

    this.quotes.unshift(newQuote);
    this.save();
    return newQuote;
  }

  // Duplicate Quote
  duplicateQuote(originalId: string, agentId: string): Quote | null {
    const original = this.quotes.find(q => q.id === originalId);
    if (!original || original.agentId !== agentId) return null;

    const newQuote: Quote = {
      ...original,
      id: `q_${Date.now()}`,
      uniqueRefNo: `IHT-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`,
      status: 'PENDING',
      travelDate: '', // Reset date
      messages: [] // Reset chat
    };

    this.quotes.unshift(newQuote);
    this.save();
    return newQuote;
  }

  // Update Quote status or details
  updateQuote(quote: Quote) {
    const index = this.quotes.findIndex(q => q.id === quote.id);
    if (index !== -1) {
      this.quotes[index] = quote;
      this.save();
    }
  }
}

export const agentService = new AgentService();
