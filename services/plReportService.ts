import { PLSummary, PLTransaction } from '../types';
import { gstService } from './gstService';
import { bookingService } from './bookingService';
import { UserRole } from '../types';

export interface MonthlyTrend {
  month: string;
  revenue: number;
  cost: number;
  profit: number;
}

export interface PLReportData {
  summary: PLSummary;
  transactions: PLTransaction[];
  trends: MonthlyTrend[];
  byDestination: { name: string; profit: number }[];
}

class PLReportService {

  /**
   * Generates P&L Report.
   */
  async generateReport(
    role: UserRole,
    userId: string,
    dateFrom: string, 
    dateTo: string, 
    filters: { agentId?: string; destination?: string } = {}
  ): Promise<PLReportData> {
    
    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);
    endDate.setDate(endDate.getDate() + 1); // Inclusive end date

    const transactions: PLTransaction[] = [];
    const monthlyData: Record<string, MonthlyTrend> = {};
    const destData: Record<string, number> = {};

    let totalRevenue = 0;
    let totalCost = 0;
    let totalRefunds = 0;

    // 1. Get Base Data (Invoices are the source of truth for confirmed sales)
    const allRecords = await gstService.getAllRecords();
    let invoices = allRecords.filter(inv => {
        const d = new Date(inv.invoiceDate);
        return d >= startDate && d < endDate;
    });

    // Filter by Agent if applicable
    if (role === UserRole.AGENT) {
        const agentBookings = await bookingService.getBookingsForAgent(userId);
        const agentBookingIds = agentBookings.map(b => b.id);
        invoices = invoices.filter(inv => agentBookingIds.includes(inv.bookingId));
    } else if (role === UserRole.ADMIN && filters.agentId) {
        const agentBookings = await bookingService.getBookingsForAgent(filters.agentId);
        const agentBookingIds = agentBookings.map(b => b.id);
        invoices = invoices.filter(inv => agentBookingIds.includes(inv.bookingId));
    }

    const allCNs = await gstService.getAllCreditNotes();

    for (const inv of invoices) {
        const booking = await bookingService.getBooking(inv.bookingId);
        if (!booking) continue;

        // Apply Destination Filter
        if (filters.destination && !booking.destination.includes(filters.destination)) continue;

        // --- CALCULATION CORE ---
        let revenue = 0;
        let cost = 0;

        if (role === UserRole.AGENT) {
            // Agent Perspective
            revenue = booking.sellingPrice; // What Client Pays
            cost = inv.totalInvoiceAmount; 
        } else {
            // Admin Perspective
            revenue = inv.taxableAmount; // Net Sales (Excl GST collected)
            cost = booking.netCost; // Net Cost to Suppliers
        }

        // --- CREDIT NOTE REVERSAL ---
        const creditNote = allCNs.find(cn => cn.originalInvoiceId === inv.id);
        let status: 'CONFIRMED' | 'REFUNDED' | 'CANCELLED' = 'CONFIRMED';

        if (creditNote) {
            status = 'REFUNDED';
            if (role === UserRole.AGENT) {
                const clientRefund = booking.cancellation?.refundAmount || 0;
                revenue -= clientRefund;
                
                // Platform Refund to Agent
                cost -= creditNote.totalRefundAmount;
                totalRefunds += clientRefund;
            } else {
                // Admin Perspective
                revenue -= creditNote.refundTaxableAmount;
                cost = 0; // Usually supplier isn't paid if cancelled, or penalty logic applies
                totalRefunds += creditNote.totalRefundAmount;
            }
        }

        const grossProfit = revenue - cost;

        // --- AGGREGATION ---
        
        // 1. Transaction List
        transactions.push({
            id: inv.id,
            date: inv.invoiceDate,
            referenceRef: inv.bookingRef,
            agentName: booking.agentName,
            income: revenue,
            cogs: cost,
            grossProfit: grossProfit,
            status: status,
            type: 'INVOICE'
        });

        // 2. Summary
        totalRevenue += revenue;
        totalCost += cost;

        // 3. Monthly Trend
        const monthKey = new Date(inv.invoiceDate).toLocaleString('default', { month: 'short', year: '2-digit' });
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { month: monthKey, revenue: 0, cost: 0, profit: 0 };
        }
        monthlyData[monthKey].revenue += revenue;
        monthlyData[monthKey].cost += cost;
        monthlyData[monthKey].profit += grossProfit;

        // 4. Destination Breakdown
        if (grossProfit > 0) {
            const dest = booking.destination.split(',')[0].trim(); // City only
            destData[dest] = (destData[dest] || 0) + grossProfit;
        }
    }

    // Formatting Output
    const trends = Object.values(monthlyData).sort((a, b) => {
        // Simple alphanumeric sort or map back to date
        return 0; 
    });

    const byDestination = Object.entries(destData)
        .map(([name, profit]) => ({ name, profit }))
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 5); // Top 5

    const netMarginPercent = totalRevenue > 0 ? (totalRevenue - totalCost) / totalRevenue * 100 : 0;

    return {
        summary: {
            totalRevenue,
            totalCost,
            grossProfit: totalRevenue - totalCost,
            netMarginPercent,
            totalBookings: transactions.length,
            refundedRevenue: totalRefunds
        },
        transactions: transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        trends,
        byDestination
    };
  }
}

export const plReportService = new PLReportService();