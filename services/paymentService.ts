
import { Booking, User, PaymentMode, PaymentGateway } from '../types';
import { bookingService } from './bookingService';
import { auditLogService } from './auditLogService';
import { agentService } from './agentService';
import { dbHelper } from './firestoreHelper';
import { functions } from './firebase'; // Import functions instance
import { httpsCallable } from 'firebase/functions';

declare global {
  interface Window {
    Razorpay: any;
  }
}

// Types for Razorpay
interface RazorpayOptions {
  key: string;
  amount: number; // in subunits
  currency: string;
  name: string;
  description: string;
  image?: string;
  order_id?: string; // Made optional
  handler: (response: any) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

class PaymentService {
  
  private razorpayKey = "rzp_live_SAPwjiuTqQAC6H"; // LIVE KEY

  /**
   * Initializes the payment flow for a Booking.
   */
  async initiatePayment(
    booking: Booking, 
    type: 'ADVANCE' | 'FULL' | 'BALANCE',
    brandColor: string,
    onSuccess: (paymentId: string) => void,
    onFailure: (error: string) => void,
    overrideAmount?: number // Optional override (e.g. Net Cost)
  ) {
    try {
      // 1. Determine Amount
      let amountToPay = 0;
      const currency = booking.currency || 'INR';

      if (overrideAmount && overrideAmount > 0) {
          amountToPay = overrideAmount;
      } else {
          // Standard Logic
          if (type === 'FULL') {
            amountToPay = booking.balanceAmount; 
          } else if (type === 'ADVANCE') {
            if (booking.paidAmount > 0) throw new Error("Advance already paid. Please pay balance.");
            amountToPay = booking.advanceAmount;
          } else if (type === 'BALANCE') {
            amountToPay = booking.balanceAmount;
          }
      }

      if (amountToPay <= 0) throw new Error("No pending balance to pay.");

      // 2. Create Order (Internal Ref)
      const order = await this.createPaymentOrder(booking.id, amountToPay, currency);

      // 3. Open Gateway
      this.openRazorpay(
          order,
          booking.agentName || "Idea Holiday Partner",
          `Payment for Trip #${booking.uniqueRefNo} (${type})`,
          brandColor,
          {
             name: booking.agentName, 
             email: "client@example.com", // In a real app, pass actual email
             contact: "9999999999"
          },
          async (response) => {
              // Success Callback
              try {
                  const paymentId = await this.verifyPayment(response, booking, amountToPay, type);
                  onSuccess(paymentId);
              } catch (e: any) {
                  onFailure(e.message);
              }
          },
          onFailure
      );

    } catch (err: any) {
        console.error("Payment Init Failed", err);
        onFailure(err.message || "Could not initiate payment.");
    }
  }

  /**
   * Wallet Payment Processing (Internal Deduction)
   */
  async processWalletDeduction(
      user: User,
      booking: Booking,
      amount: number
  ): Promise<string> {
      // 1. Double check balance
      const currentBalance = user.walletBalance || 0;
      const creditLimit = user.creditLimit || 0;
      const available = currentBalance + creditLimit;

      if (available < amount) {
          throw new Error("Insufficient wallet balance.");
      }

      // 2. Deduct Logic
      // If user has wallet balance, consume that first. Then credit limit.
      let newBalance = currentBalance - amount;
      
      // Update User
      await agentService.updateAgentProfile(user.id, { 
          walletBalance: newBalance,
          updatedAt: new Date().toISOString()
      });

      // 3. Record Payment on Booking
      const paymentRef = `WALLET-${Date.now()}`;
      
      // Create system user context for the record
      const agentUser = { ...user }; // Clone user to use as recorder

      await bookingService.recordPayment(
          booking.id,
          amount,
          'WALLET', // New mode
          paymentRef,
          agentUser
      );

      // 4. Audit Log
      auditLogService.logAction({
          entityType: 'PAYMENT',
          entityId: paymentRef,
          action: 'WALLET_PAYMENT',
          description: `Paid ${amount} for booking ${booking.uniqueRefNo} via Wallet. New Balance: ${newBalance}`,
          user: user,
          newValue: { amount, method: 'WALLET', newBalance }
      });

      return paymentRef;
  }

  /**
   * Wallet Top Up Flow
   */
  async initiateWalletTopUp(
    user: User,
    amount: number,
    onSuccess: (newBalance: number) => void,
    onFailure: (error: string) => void
  ) {
      try {
          if (amount <= 0) throw new Error("Invalid amount.");

          // 1. Create Order
          const order = await this.createPaymentOrder(`wallet_${user.id}`, amount, 'INR');

          // 2. Open Gateway
          this.openRazorpay(
              order,
              user.companyName || user.name,
              "Wallet Top-up",
              "#0ea5e9", // Standard brand color
              {
                  name: user.name,
                  email: user.email,
                  contact: user.phone
              },
              async (response) => {
                  try {
                      // Call secure verification
                      await this.verifyWalletPayment(response, user, amount);
                      
                      // If verification passes, the Cloud Function confirms it's captured.
                      // Now we can safely add funds to DB.
                      // Note: Ideally, the Cloud Function should update the DB to prevent frontend manipulation,
                      // but for this architecture, we double-check here.
                      const updatedUser = await agentService.addWalletFunds(user.id, amount);
                      onSuccess(updatedUser.walletBalance || 0);
                  } catch (e: any) {
                      console.error("Wallet Top-up Verification Failed", e);
                      onFailure("Payment verification failed. Please contact support if amount was deducted.");
                  }
              },
              onFailure
          );

      } catch (err: any) {
          onFailure(err.message);
      }
  }

  private openRazorpay(
      order: any, 
      name: string, 
      description: string, 
      color: string, 
      prefill: any, 
      onSuccess: (res: any) => void, 
      onFailure: (err: string) => void
  ) {
      const options: RazorpayOptions = {
        key: this.razorpayKey,
        amount: order.amount,
        currency: order.currency,
        name: name,
        description: description,
        // order_id: order.id, // DISABLED: Client-side checkout requires no Order ID to avoid auth errors
        image: "https://file-service-alpha.vercel.app/file/a8d8e3c0-362c-473d-82d2-282e366184e9/607e4d82-c86e-4171-aa3b-8575027588b3.png", 
        handler: onSuccess,
        prefill: prefill,
        theme: { color: color || "#0ea5e9" },
        modal: {
            ondismiss: () => onFailure("Payment cancelled by user.")
        }
      };

      if (window.Razorpay) {
          const rzp1 = new window.Razorpay(options);
          rzp1.on('payment.failed', function (response: any){
                onFailure(response.error.description);
          });
          rzp1.open();
      } else {
          // Fallback if script didn't load (Dev mode simulation)
          console.warn("Razorpay SDK not found. Simulating payment flow.");
          const confirmed = confirm(`[MOCK GATEWAY] Pay ${order.currency} ${order.amount / 100}?`);
          if (confirmed) {
               setTimeout(() => {
                  onSuccess({
                      razorpay_payment_id: `pay_mock_${Date.now()}`,
                      razorpay_order_id: order.id,
                      razorpay_signature: "mock_signature"
                  });
               }, 1500);
          } else {
              onFailure("Payment cancelled.");
          }
      }
  }

  // --- BACKEND SIMULATION ---

  private async createPaymentOrder(refId: string, amount: number, currency: string) {
      // Logic for internal order ref only
      return {
          id: `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          entity: "order",
          amount: amount * 100, 
          amount_paid: 0,
          amount_due: amount * 100,
          currency: currency,
          receipt: `rcpt_${refId.substring(0, 8)}`,
          status: "created",
          created_at: Math.floor(Date.now() / 1000)
      };
  }

  private async verifyPayment(response: any, booking: Booking, amount: number, type: 'ADVANCE' | 'FULL' | 'BALANCE'): Promise<string> {
      // Call Cloud Function to verify
      const verifyFn = httpsCallable(functions, 'verifyRazorpayPayment');
      
      const result = await verifyFn({
          paymentId: response.razorpay_payment_id,
          expectedAmount: amount,
          currency: booking.currency
      });

      const data = result.data as any;
      if (!data.success) throw new Error("Payment verification failed on server.");

      // Record in DB if verified
      const systemUser: User = { id: 'sys_payment_gateway', name: 'Online Gateway', role: 'ADMIN' as any, email: 'gateway@system.com', isVerified: true };
      
      await bookingService.recordPayment(
          booking.id,
          amount,
          'ONLINE',
          `Gateway: ${response.razorpay_payment_id}`,
          systemUser
      );

      auditLogService.logAction({
          entityType: 'PAYMENT',
          entityId: response.razorpay_payment_id,
          action: 'ONLINE_PAYMENT_RECEIVED',
          description: `Received ${booking.currency} ${amount} (${type}) via Gateway. Verified.`,
          user: systemUser,
          newValue: { amount, type, gatewayId: response.razorpay_payment_id }
      });

      return response.razorpay_payment_id;
  }

  private async verifyWalletPayment(response: any, user: User, amount: number) {
      // Call Cloud Function to verify
      const verifyFn = httpsCallable(functions, 'verifyRazorpayPayment');
      
      const result = await verifyFn({
          paymentId: response.razorpay_payment_id,
          expectedAmount: amount,
          currency: 'INR'
      });

      const data = result.data as any;
      if (!data.success) throw new Error("Payment verification failed on server.");
      
      // Log the specific wallet transaction
      auditLogService.logAction({
          entityType: 'PAYMENT',
          entityId: response.razorpay_payment_id,
          action: 'WALLET_TOPUP',
          description: `Wallet top-up of INR ${amount} by ${user.name}. Verified.`,
          user: user,
          newValue: { amount, gatewayId: response.razorpay_payment_id }
      });
  }
}

export const paymentService = new PaymentService();
