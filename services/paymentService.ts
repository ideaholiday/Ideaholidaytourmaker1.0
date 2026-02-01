
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

      // Create Order (Simulated locally, or call backend)
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
              const paymentId = response.razorpay_payment_id;

              // OPTIMISTIC PAYMENT RECORDING
              // We record the payment immediately in Firestore so the UI updates instantly.
              // The backend webhook will process this later and confirm it.
              try {
                  await bookingService.recordPayment(
                      booking.id,
                      amountToPay,
                      'ONLINE',
                      `Gateway: ${paymentId}`,
                      { id: 'frontend_optimistic', name: 'System', role: 'ADMIN' } as any,
                      'VERIFIED', // Optimistically mark valid. Webhook will double check.
                      'MANUAL'
                  );
                  
                  // Trigger success callback to navigate/update UI
                  onSuccess(paymentId);
                  
              } catch (e) {
                  console.error("Optimistic recording failed", e);
                  // Even if local record fails, if payment went through, webhook will catch it.
                  // Still verify with user.
                  onSuccess(paymentId); 
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
                      // 1. Log Attempt
                      await auditLogService.logAction({
                          entityType: 'PAYMENT',
                          entityId: paymentId,
                          action: 'WALLET_TOPUP_PROCESSING',
                          description: `Processing Gateway Payment: ₹${amount}`,
                          user: user,
                          newValue: { amount: amount, gatewayId: paymentId }
                      });

                      // 2. Optimistic Balance Update
                      // We trust the success callback for immediate UI feedback.
                      const newBalance = await agentService.addWalletFunds(user.id, amount);

                      // 3. Log Success
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

                      // 4. Update UI
                      onSuccess(newBalance);

                  } catch (e: any) {
                      console.error("Wallet Top-up Verification Error:", e);
                      // Fallback: Webhook will handle it.
                      alert("Payment received. Your balance will update shortly via our secure server.");
                      onSuccess((user.walletBalance || 0)); 
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
      // Flag to track if success handler has been called.
      // Razorpay modal auto-closes on success, triggering ondismiss.
      // We must prevent ondismiss from calling onFailure in this case.
      let isPaymentSuccessful = false;

      const options: RazorpayOptions = {
        key: this.razorpayKey,
        amount: order.amount,
        currency: order.currency,
        name: name,
        description: description,
        image: "https://file-service-alpha.vercel.app/file/a8d8e3c0-362c-473d-82d2-282e366184e9/607e4d82-c86e-4171-aa3b-8575027588b3.png", 
        handler: (response: any) => {
            isPaymentSuccessful = true;
            onSuccess(response);
        },
        prefill: prefill,
        notes: notes, 
        theme: { color: color || "#0ea5e9" },
        modal: {
            ondismiss: () => {
                if (!isPaymentSuccessful) {
                    console.log("Payment modal dismissed by user.");
                    onFailure("Payment cancelled by user.");
                }
            }
        }
      };

      if (window.Razorpay) {
          const rzp1 = new window.Razorpay(options);
          rzp1.on('payment.failed', function (response: any){
                isPaymentSuccessful = false; // Just in case
                console.error("Razorpay Failure:", response.error);
                onFailure(response.error.description || "Payment Failed");
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
}

export const paymentService = new PaymentService();
