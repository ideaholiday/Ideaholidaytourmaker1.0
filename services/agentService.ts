
import { Quote, User, UserRole, PricingBreakdown, Message } from '../types';
import { INITIAL_QUOTES } from '../constants';
import { calculateQuotePrice } from '../utils/pricingEngine';
import { adminService } from './adminService';
import { currencyService } from './currencyService';
import { auditLogService } from './auditLogService';

// Mock Storage Key
const STORAGE_KEY_QUOTES = 'iht_agent_quotes';

class AgentService {
  private quotes: Quote[];

  constructor() {
    const stored = localStorage.getItem(STORAGE_KEY_QUOTES);
    
    if (stored) {
        const storedQuotes = JSON.parse(stored) as Quote[];
        // Merge defaults if needed, ensure basic version info exists on legacy items
        const newDefaults = INITIAL_QUOTES.filter(q => !storedQuotes.some(sq => sq.id === q.id)).map(q => ({
            ...q,
            version: 1,
            isLocked: q.status === 'APPROVED' || q.status === 'CONFIRMED' || q.status === 'BOOKED'
        }));
        
        this.quotes = [...storedQuotes, ...newDefaults].map(q => ({
            ...q,
            // Migration: Add version if missing
            version: q.version || 1,
            isLocked: q.isLocked !== undefined ? q.isLocked : (q.status === 'APPROVED' || q.status === 'CONFIRMED' || q.status === 'BOOKED')
        }));
    } else {
        this.quotes = INITIAL_QUOTES.map(q => ({
            ...q,
            version: 1,
            isLocked: false
        }));
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
      uniqueRefNo: `IHT-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
      version: 1,
      isLocked: false,
      destination,
      travelDate,
      paxCount: pax,
      leadGuestName,
      serviceDetails: 'Standard B2B Package (Pending Customization)',
      itinerary: [],
      currency: 'INR', // Default changed to INR
      price: 0,
      cost: 0, // Hidden from agent view in UI, but exists in DB
      markup: 0,
      agentId: agent.id,
      agentName: agent.name,
      staffId: 'u2', // Auto-assign default staff
      staffName: 'Staff Sarah', // Mock
      status: 'DRAFT',
      messages: []
    };

    this.quotes.unshift(newQuote);
    this.save();
    return newQuote;
  }

  /**
   * Versioning Support: Clone Quote for Revision
   * Used when an Agent edits an APPROVED/LOCKED quote.
   */
  createRevision(originalId: string, agent: User): Quote | null {
    const original = this.quotes.find(q => q.id === originalId);
    if (!original || original.agentId !== agent.id) return null;

    // Only allow creating revision if original is LOCKED/APPROVED
    if (!original.isLocked) {
        throw new Error("Cannot create revision of an editable quote. Edit directly.");
    }

    const newVersion = original.version + 1;
    const newQuote: Quote = {
        ...JSON.parse(JSON.stringify(original)), // Deep copy
        id: `q_${Date.now()}_v${newVersion}`, // New ID for DB
        // Keep uniqueRefNo SAME to track lineage? Or append suffix?
        // Usually systems keep RefNo same but track version internally. 
        // For simple UI here, let's keep refNo but handle uniqueness in list by ID
        uniqueRefNo: original.uniqueRefNo, 
        version: newVersion,
        isLocked: false, // Unlocked for editing
        status: 'DRAFT', // Reset status
        previousVersionId: original.id,
        messages: [] // Clear chat for fresh start? Or keep history? Let's clear.
    };

    this.quotes.unshift(newQuote);
    this.save();
    return newQuote;
  }

  // Duplicate Quote (Copy as New)
  duplicateQuote(originalId: string, agentId: string): Quote | null {
    const original = this.quotes.find(q => q.id === originalId);
    if (!original || original.agentId !== agentId) return null;

    const newQuote: Quote = {
      ...JSON.parse(JSON.stringify(original)),
      id: `q_${Date.now()}`,
      uniqueRefNo: `IHT-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
      version: 1,
      isLocked: false,
      status: 'DRAFT',
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
      if (this.quotes[index].isLocked && quote.status !== 'BOOKED' && quote.status !== 'CANCELLED') {
           // Prevent editing locked quotes unless changing to terminal state
           // But here we rely on UI to call createRevision first.
           console.warn("Attempting to update locked quote directly");
      }
      this.quotes[index] = quote;
      this.save();
    }
  }

  // --- WORKFLOW TRANSITIONS ---

  submitQuote(quoteId: string, user: User) {
      const quote = this.quotes.find(q => q.id === quoteId);
      if (!quote) throw new Error("Quote not found");
      
      if (quote.status !== 'DRAFT') throw new Error("Only draft quotes can be submitted.");

      quote.status = 'SUBMITTED';
      
      // Add System Message
      const msg: Message = {
          id: `sys_${Date.now()}`,
          senderId: user.id,
          senderName: 'System',
          senderRole: user.role,
          content: `Quote submitted for approval. Version: ${quote.version}`,
          timestamp: new Date().toISOString(),
          isSystem: true
      };
      quote.messages.push(msg);
      
      this.save();
      
      auditLogService.logAction({
          entityType: 'QUOTE',
          entityId: quote.id,
          action: 'QUOTE_SUBMITTED',
          description: `Agent submitted quote ${quote.uniqueRefNo} v${quote.version} for approval.`,
          user: user,
          newValue: { status: 'SUBMITTED' }
      });
  }

  approveQuote(quoteId: string, user: User) {
      const quote = this.quotes.find(q => q.id === quoteId);
      if (!quote) throw new Error("Quote not found");

      if (quote.status !== 'SUBMITTED') throw new Error("Quote must be submitted before approval.");

      quote.status = 'APPROVED';
      quote.isLocked = true; // LOCK IT
      
      // SNAPSHOT LOGIC: Ensure itinerary items have cost snapshots frozen
      // (This usually happens during save, but double check here or in backend)
      // In this frontend mock, we assume the itinerary array already holds the data.
      
      const msg: Message = {
          id: `sys_${Date.now()}`,
          senderId: user.id,
          senderName: 'System',
          senderRole: UserRole.ADMIN,
          content: `✅ Quote APPROVED by Admin. PDF Generated & Sent via WhatsApp.`,
          timestamp: new Date().toISOString(),
          isSystem: true
      };
      quote.messages.push(msg);

      this.save();

      // Trigger "WhatsApp" simulation
      console.log(`[WhatsApp Mock] Sending PDF for Quote ${quote.uniqueRefNo} to Agent ${quote.agentName}`);
      
      auditLogService.logAction({
          entityType: 'QUOTE',
          entityId: quote.id,
          action: 'QUOTE_APPROVED',
          description: `Quote ${quote.uniqueRefNo} v${quote.version} approved and locked.`,
          user: user,
          newValue: { status: 'APPROVED', isLocked: true }
      });
  }

  rejectQuote(quoteId: string, reason: string, user: User) {
      const quote = this.quotes.find(q => q.id === quoteId);
      if (!quote) return;
      
      quote.status = 'DRAFT'; // Send back to Draft
      const msg: Message = {
          id: `sys_${Date.now()}`,
          senderId: user.id,
          senderName: 'System',
          senderRole: UserRole.ADMIN,
          content: `❌ Quote Rejected. Reason: ${reason}. Please revise and resubmit.`,
          timestamp: new Date().toISOString(),
          isSystem: true
      };
      quote.messages.push(msg);
      this.save();
  }
}

export const agentService = new AgentService();
