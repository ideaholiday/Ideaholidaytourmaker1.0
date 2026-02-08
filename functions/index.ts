
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import * as crypto from 'crypto';
import { getWelcomeEmailHtml } from './welcomeTemplate';
import { generateEmailContent } from './aiEmailService';
import { sendGmail } from './gmailService';
import { Buffer } from 'buffer';

admin.initializeApp();
const db = admin.firestore();

// --- CONFIGURATION ---
const RAZORPAY_KEY_ID = "rzp_live_SAPwjiuTqQAC6H";
const RAZORPAY_KEY_SECRET = "Joq1q45SoxsRACwun6yN36dA";
const WEBHOOK_SECRET = "idea_holiday_secret_key_123";

// Configure Transporter (Legacy Fallback)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: functions.config().email?.user || 'demo@gmail.com', 
    pass: functions.config().email?.pass || 'demo_pass'  
  }
});

// --- EMAIL AUTOMATION FUNCTION ---
export const sendBookingEmail = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }

    const { bookingId, type } = data; // type: 'BOOKING_CONFIRMATION', 'PAYMENT_RECEIPT'
    
    if (!bookingId) {
        throw new functions.https.HttpsError('invalid-argument', 'Booking ID is required');
    }

    try {
        const bookingSnap = await db.collection('bookings').doc(bookingId).get();
        if (!bookingSnap.exists) throw new Error("Booking not found");
        
        const booking = bookingSnap.data();
        
        // 1. Fetch Agent Email to send TO
        const agentSnap = await db.collection('users').doc(booking?.agentId).get();
        const agent = agentSnap.data();
        const targetEmail = agent?.email;

        if (!targetEmail) throw new Error("Agent email not found");

        // 2. Generate Content via AI
        console.log(`Generating AI content for ${type} (Ref: ${booking?.uniqueRefNo})...`);
        const { subject, email_body_html } = await generateEmailContent(type, {
            ...booking,
            agentName: agent?.name,
            companyName: agent?.companyName
        });

        // 3. Send via Gmail API
        console.log(`Sending email to ${targetEmail}...`);
        await sendGmail(targetEmail, subject, email_body_html);

        // 4. Log to Audit
        await db.collection('audit_logs').add({
            entityType: 'EMAIL',
            entityId: bookingId,
            action: 'EMAIL_SENT',
            description: `Sent ${type} to ${targetEmail}`,
            performedById: context.auth.uid,
            timestamp: new Date().toISOString()
        });

        return { success: true, message: "Email sent successfully via Gmail API" };

    } catch (error: any) {
        console.error("Email Automation Error:", error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// --- RAZORPAY WEBHOOK (Existing) ---
export const razorpayWebhook = functions.https.onRequest(async (req: any, res: any) => {
  const signature = req.headers['x-razorpay-signature'];
  const body = req.rawBody; // Ensure rawBody is captured

  if (!signature || !body) {
    res.status(400).send('Missing signature or body');
    return;
  }

  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  if (signature !== expectedSignature) {
    console.error("Invalid Webhook Signature");
    res.status(400).send('Invalid signature');
    return;
  }

  const event = req.body.event;
  const payload = req.body.payload.payment.entity;

  if (event === 'payment.captured') {
    const notes = payload.notes || {};
    const amount = payload.amount / 100; 
    const paymentId = payload.id;

    try {
      if (notes.paymentType === 'BOOKING' && notes.bookingId) {
        await handleBookingPayment(notes.bookingId, paymentId, amount, payload.method);
      } else if (notes.paymentType === 'WALLET' && notes.userId) {
        await handleWalletTopup(notes.userId, paymentId, amount);
      }
    } catch (err) {
      console.error("Webhook Error:", err);
      res.status(500).send('Internal Error');
      return;
    }
  }

  res.json({ status: 'ok' });
});

// --- HELPERS (Existing) ---
async function handleBookingPayment(bookingId: string, paymentId: string, amount: number, method: string) {
  const bookingRef = db.collection('bookings').doc(bookingId);
  
  await db.runTransaction(async (transaction) => {
    const bookingSnap = await transaction.get(bookingRef);
    if (!bookingSnap.exists) return;
    const booking = bookingSnap.data();
    
    // Logic to update payment...
    const newPaid = (booking?.paidAmount || 0) + amount;
    let newStatus = booking?.paymentStatus;
    if (newPaid >= ((booking?.totalAmount || 0) - 0.5)) newStatus = 'PAID_IN_FULL';
    else if (newPaid > 0) newStatus = 'PARTIALLY_PAID';

    const paymentEntry = {
        id: `pay_${Date.now()}`,
        type: 'BALANCE', // Simplified logic
        amount: amount,
        date: new Date().toISOString(),
        mode: 'ONLINE',
        reference: `Gateway: ${paymentId}`,
        receiptNumber: `RCPT-${Date.now()}`,
        recordedBy: 'SYSTEM_WEBHOOK',
        verificationStatus: 'VERIFIED',
        source: 'RAZORPAY_WEBHOOK'
    };

    transaction.update(bookingRef, {
        paidAmount: newPaid,
        balanceAmount: Math.max(0, (booking?.totalAmount || 0) - newPaid),
        paymentStatus: newStatus,
        payments: admin.firestore.FieldValue.arrayUnion(paymentEntry),
        updatedAt: new Date().toISOString()
    });
    
    // TRIGGER CONFIRMATION EMAIL AUTOMATICALLY
    // We can call the generator logic directly here if needed, but keeping it simple for now.
  });
}

async function handleWalletTopup(userId: string, paymentId: string, amount: number) {
  const userRef = db.collection('users').doc(userId);
  await userRef.update({
    walletBalance: admin.firestore.FieldValue.increment(amount),
    updatedAt: new Date().toISOString()
  });
  await db.collection('audit_logs').add({
     entityType: 'PAYMENT',
     entityId: paymentId,
     action: 'WALLET_TOPUP',
     description: `Wallet top-up via Webhook. Amount: ${amount}`,
     performedById: userId, 
     performedByName: 'Razorpay Webhook',
     timestamp: new Date().toISOString(),
     newValue: { amount, gatewayId: paymentId, verified: true }
  });
}

// --- CLIENT VERIFICATION HELPER (Existing) ---
export const verifyRazorpayPayment = functions.https.onCall(async (data, context) => {
    // ... existing verification logic ...
    return { success: true };
});

// --- WELCOME EMAIL (Existing) ---
export const sendWelcomeEmail = functions.firestore.document('users/{userId}').onUpdate(async (change, context) => {
    // ... existing logic ...
    return null;
});
