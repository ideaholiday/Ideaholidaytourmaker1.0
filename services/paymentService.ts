
import { Booking, User, PaymentMode, PaymentGateway } from '../types';
import { bookingService } from './bookingService';
import { auditLogService } from './auditLogService';

// Types for Razorpay (Mock)
interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  image?: string;
  order_id: string;
  handler: (response: any) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
}

class PaymentService {
  
  /**
   * Initializes the payment flow for a Booking.
   * 1. Calculates amount based on payment type (ADVANCE vs FULL vs BALANCE).
   * 2. Calls backend to create an Order (Mocked here).
   * 3. Opens Gateway (Razorpay).
   */
  async initiatePayment(
    booking: Booking, 
    type: 'ADVANCE' | 'FULL' | 'BALANCE',
    brandColor: string,
    onSuccess: (paymentId: string) => void,
    onFailure: (error: string) => void
  ) {
    try {
      // 1. Determine Amount
      let amountToPay = 0;
      const currency = booking.currency || 'INR';

      if (type === 'FULL') {
        amountToPay = booking.balanceAmount; // Remaining balance is full payment if paying now
      } else if (type === 'ADVANCE') {
        // Only if not already paid advance
        if (booking.paidAmount > 0) {
             throw new Error("Advance already paid. Please pay balance.");
        }
        amountToPay = booking.advanceAmount;
      } else if (type === 'BALANCE') {
        amountToPay = booking.balanceAmount;
      }

      if (amountToPay <= 0) {
          throw new Error("No pending balance to pay.");
      }

      // 2. Create Order (Simulated Backend Call)
      const order = await this.createPaymentOrder(booking.id, amountToPay, currency);

      // 3. Load Gateway (Razorpay Mock)
      // In a real app, we would load the script: https://checkout.razorpay.com/v1/checkout.js
      // Here we simulate the popup interaction.
      
      const options: RazorpayOptions = {
        key: "rzp_test_MOCK_KEY_123", // Use env variable in prod
        amount: order.amount, // Amount in subunits (paise)
        currency: order.currency,
        name: booking.agentName || "Idea Holiday Partner",
        description: `Payment for Trip #${booking.uniqueRefNo} (${type})`,
        order_id: order.id,
        image: "https://via.placeholder.com/150", // branding.logoUrl
        handler: async (response: any) => {
            // Success Callback from Gateway
            try {
                const paymentId = await this.verifyPayment(response, booking, amountToPay, type);
                onSuccess(paymentId);
            } catch (e: any) {
                onFailure(e.message);
            }
        },
        prefill: {
            name: "Client Name", // Would come from travelers[0]
            email: "client@example.com",
            contact: "9999999999"
        },
        theme: {
            color: brandColor || "#0ea5e9"
        }
      };

      // SIMULATE RAZORPAY OPENING
      console.log("[PaymentService] Opening Mock Gateway with options:", options);
      
      const userConfirmed = window.confirm(`[MOCK GATEWAY]\n\nPay ${currency} ${amountToPay} via Razorpay?\n\n(Click OK to Simulate Success, Cancel to Simulate Failure)`);
      
      if (userConfirmed) {
          // Simulate network delay for processing
          setTimeout(() => {
              options.handler({
                  razorpay_payment_id: `pay_${Date.now()}`,
                  razorpay_order_id: order.id,
                  razorpay_signature: "mock_signature_hash"
              });
          }, 1500);
      } else {
          onFailure("Payment cancelled by user.");
      }

    } catch (err: any) {
        console.error("Payment Init Failed", err);
        onFailure(err.message || "Could not initiate payment.");
    }
  }

  // --- BACKEND SIMULATION FUNCTIONS ---

  /**
   * Mocks the backend order creation (e.g. /api/create-order)
   */
  private async createPaymentOrder(bookingId: string, amount: number, currency: string) {
      console.log(`[Backend] Creating Order for Booking ${bookingId}: ${currency} ${amount}`);
      // Return Razorpay order structure
      return {
          id: `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          entity: "order",
          amount: amount * 100, // Convert to subunits (paise/cents)
          amount_paid: 0,
          amount_due: amount * 100,
          currency: currency,
          receipt: `rcpt_${bookingId.substring(0, 8)}`,
          status: "created",
          attempts: 0,
          created_at: Math.floor(Date.now() / 1000)
      };
  }

  /**
   * Mocks the backend verification (e.g. /api/verify-payment)
   * This updates the database if signature is valid.
   */
  private async verifyPayment(response: any, booking: Booking, amount: number, type: 'ADVANCE' | 'FULL' | 'BALANCE'): Promise<string> {
      console.log(`[Backend] Verifying Payment:`, response);
      
      // 1. Verify Signature (Mock: assume valid if we got here)
      if (!response.razorpay_signature) throw new Error("Invalid payment signature");

      // 2. Update Booking in DB
      // We use the existing 'System' user context for public payments
      const systemUser: User = { id: 'sys_payment_gateway', name: 'Online Gateway', role: 'ADMIN' as any, email: 'gateway@system.com', isVerified: true };
      
      bookingService.recordPayment(
          booking.id,
          amount,
          'ONLINE',
          `Gateway: ${response.razorpay_payment_id}`,
          systemUser
      );

      // Audit
      auditLogService.logAction({
          entityType: 'PAYMENT',
          entityId: response.razorpay_payment_id,
          action: 'ONLINE_PAYMENT_RECEIVED',
          description: `Received ${booking.currency} ${amount} (${type}) via Gateway.`,
          user: systemUser,
          newValue: { amount, type, gatewayId: response.razorpay_payment_id }
      });

      return response.razorpay_payment_id;
  }
}

export const paymentService = new PaymentService();
