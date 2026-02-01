
import { Booking, User, PaymentMode, PaymentGateway } from '../types';
import { bookingService } from './bookingService';
import { auditLogService } from './auditLogService';
import { agentService } from './agentService';
import { dbHelper } from './firestoreHelper';
import { functions } from './firebase'; 
import { httpsCallable } from 'firebase/functions';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number; 
  currency: string;
  name: string;
  description: string;
  image?: string;
  order_id?: string; 
  handler: (response: any) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: { [key: string]: string }; 
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

class PaymentService {
  
  private razorpayKey = "rzp_live_SAPwjiuTqQAC6H"; // LIVE KEY

  async initiatePayment(
    booking: Booking, 
    type: 'ADVANCE' | 'FULL' | 'BALANCE',
    brandColor: string,
    onSuccess: (paymentId: string) => void,
    onFailure: (error: string) => void,
    overrideAmount?: number 
  ) {
    try {
      let amountToPay = 0;
      const currency = booking.currency || 'INR';

      if (overrideAmount && overrideAmount > 0) {
          amountToPay = overrideAmount;
      } else {
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

      const order = await this.createPaymentOrder(booking.id, amountToPay, currency);

      this.openRazorpay(
          order,
          booking.agentName || "Idea Holiday Partner",
          `Payment for Trip #${booking.uniqueRefNo} (${type})`,
          brandColor,
          {
             name: booking.agentName, 
             email: "client@example.com", 
             contact: "9999999999"
          },
          // META DATA FOR WEBHOOK
          {
              paymentType: 'BOOKING',
              bookingId: booking.id,
              refNo: booking.uniqueRefNo
          },
          async (response) => {
              // 1. Optimistic Success Callback to UI
              onSuccess(response.razorpay_payment_id);
              
              // 2. Background Backend Verification
              try {
                  await this.verifyPayment(response, booking, amountToPay, type);
                  console.log("Backend verification successful.");
              } catch (e: any) {
                  console.warn("Backend verification failed (Optimistic Flow). Relying on Webhook.", e);
                  
                  // 3. Fallback Record: Save as FAILED_VERIFY so admin sees the attempt
                  await bookingService.recordPayment(
                      booking.id,
                      amountToPay,
                      'ONLINE',
                      `Gateway: ${response.razorpay_payment_id}`,
                      { id: 'sys_fallback', name: 'System', role: 'ADMIN' } as any,
                      'FAILED_VERIFY' // Status indicating webhook needs to fix this
                  );
              }
          },
          onFailure
      );

    } catch (err: any) {
        console.error("Payment Init Failed", err);
        onFailure(err.message || "Could not initiate payment.");
    }
  }

  async initiateWalletTopUp(
    user: User,
    amount: number,
    onSuccess: (newBalance: number) => void,
    onFailure: (error: string) => void
  ) {
      try {
          if (amount <= 0) throw new Error("Invalid amount.");

          const order = await this.createPaymentOrder(`wallet_${user.id}`, amount, 'INR');

          this.openRazorpay(
              order,
              user.companyName || user.name,
              "Wallet Top-up",
              "#0ea5e9", 
              {
                  name: user.name,
                  email: user.email,
                  contact: user.phone
              },
              {
                  paymentType: 'WALLET',
                  userId: user.id
              },
              async (response) => {
                  const paymentId = response.razorpay_payment_id;
                  
                  try {
                      // 1. Log Attempt immediately (Processing State)
                      // This ensures a record exists even if verification crashes
                      await auditLogService.logAction({
                          entityType: 'PAYMENT',
                          entityId: paymentId,
                          action: 'WALLET_TOPUP_PROCESSING',
                          description: `Processing Gateway Payment: ₹${amount}`,
                          user: user,
                          newValue: { amount: amount, gatewayId: paymentId }
                      });

                      // 2. Verify with Server
                      await this.verifyWalletPayment(response, user, amount);
                      
                      // 3. Update DB Balance (Source of Truth)
                      const newBalance = await agentService.addWalletFunds(user.id, amount);

                      // 4. Log Success (Updates the previous log logic effectively by adding new entry)
                      await auditLogService.logAction({
                          entityType: 'PAYMENT',
                          entityId: paymentId,
                          action: 'WALLET_TOPUP',
                          description: `Wallet Top-up Successful`,
                          user: user,
                          newValue: { 
                              amount: amount, 
                              newBalance: newBalance,
                              verified: true
                          }
                      });

                      // 5. Update UI
                      onSuccess(newBalance);

                  } catch (e: any) {
                      console.error("Wallet Top-up Verification Error:", e);
                      
                      // 6. Log Failure for Admin Review
                      await auditLogService.logAction({
                          entityType: 'PAYMENT',
                          entityId: paymentId,
                          action: 'WALLET_TOPUP_FAILED',
                          description: `Payment Verification Failed. ID: ${paymentId}`,
                          user: user,
                          newValue: { amount: amount, error: e.message }
                      });

                      // Fallback: We show success to user because money was deducted, 
                      // but we don't update DB balance here to prevent fraud.
                      // The Webhook is the final safety net to add funds if verification failed.
                      alert("Payment received at gateway but system verification timed out.\n\nYour balance will update automatically in a few minutes via our secure webhook.");
                      onSuccess((user.walletBalance || 0)); // Don't show fake balance, wait for webhook
                  }
              },
              onFailure
          );

      } catch (err: any) {
          onFailure(err.message);
      }
  }

  async processWalletDeduction(agent: User, booking: Booking, amount: number) {
      const available = (agent.walletBalance || 0) + (agent.creditLimit || 0);
      if (available < amount) {
          throw new Error("Insufficient wallet balance or credit limit.");
      }

      const newBalance = await agentService.addWalletFunds(agent.id, -amount);

      await bookingService.recordPayment(
          booking.id,
          amount,
          'WALLET',
          `Wallet Deduct: ${booking.uniqueRefNo}`,
          agent,
          'VERIFIED' // Wallet deductions are always verified internal actions
      );

      await auditLogService.logAction({
          entityType: 'PAYMENT',
          entityId: `wallet_pay_${Date.now()}`,
          action: 'WALLET_PAYMENT',
          description: `Booking Payment via Wallet for ${booking.uniqueRefNo}`,
          user: agent,
          newValue: { amount: -amount, newBalance: newBalance, bookingId: booking.id }
      });
  }

  // --- INTERNAL ---

  private openRazorpay(
      order: any, 
      name: string, 
      description: string, 
      color: string, 
      prefill: any, 
      notes: { [key: string]: string },
      onSuccess: (res: any) => void, 
      onFailure: (err: string) => void
  ) {
      const options: RazorpayOptions = {
        key: this.razorpayKey,
        amount: order.amount,
        currency: order.currency,
        name: name,
        description: description,
        image: "https://file-service-alpha.vercel.app/file/a8d8e3c0-362c-473d-82d2-282e366184e9/607e4d82-c86e-4171-aa3b-8575027588b3.png", 
        handler: onSuccess,
        prefill: prefill,
        notes: notes, 
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
          console.warn("Razorpay SDK not found.");
          onFailure("Payment Gateway not loaded.");
      }
  }

  private async createPaymentOrder(refId: string, amount: number, currency: string) {
      // Mock order creation - In prod, this calls backend to get razorpay order_id
      return {
          id: `order_mock_${Date.now()}`, 
          entity: "order",
          amount: amount * 100, 
          currency: currency
      };
  }

  private async verifyPayment(response: any, booking: Booking, amount: number, type: string): Promise<string> {
      const paymentId = response.razorpay_payment_id;
      const verifyFn = httpsCallable(functions, 'verifyRazorpayPayment');
      
      const result = await verifyFn({
          paymentId: paymentId,
          expectedAmount: amount,
          currency: booking.currency
      });

      const data = result.data as any;
      if (!data.success) throw new Error("Payment verification declined by server.");

      // Record in DB with Verified status
      await bookingService.recordPayment(
          booking.id,
          amount,
          'ONLINE',
          `Gateway: ${paymentId}`,
          { id: 'sys_payment', name: 'Online Gateway', role: 'ADMIN' } as any,
          'VERIFIED',
          'MANUAL' // Source is manual/frontend
      );

      return paymentId;
  }

  private async verifyWalletPayment(response: any, user: User, amount: number) {
      const paymentId = response.razorpay_payment_id;
      const verifyFn = httpsCallable(functions, 'verifyRazorpayPayment');
      
      const result = await verifyFn({
          paymentId: paymentId,
          expectedAmount: amount,
          currency: 'INR'
      });
      
      const data = result.data as any;
      if (!data.success) throw new Error("Server declined.");
  }
}

export const paymentService = new PaymentService();
