
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import * as crypto from 'crypto';
import { getWelcomeEmailHtml } from './welcomeTemplate';
import { Buffer } from 'buffer';

admin.initializeApp();
const db = admin.firestore();

// --- CONFIGURATION ---
const RAZORPAY_KEY_ID = "rzp_live_SAPwjiuTqQAC6H";
const RAZORPAY_KEY_SECRET = "Joq1q45SoxsRACwun6yN36dA";
const WEBHOOK_SECRET = "idea_holiday_secret_key_123";

// Configure Transporter (Use Environment Variables in Prod)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: functions.config().email?.user || 'demo@gmail.com', 
    pass: functions.config().email?.pass || 'demo_pass'  
  }
});

// --- RAZORPAY WEBHOOK ---
// Uses rawBody for signature verification to avoid JSON parsing mismatches
export const razorpayWebhook = functions.https.onRequest(async (req: any, res: any) => {
  const signature = req.headers['x-razorpay-signature'];
  
  // Firebase Functions parses body automatically, but we need the raw buffer for signature verification
  // req.rawBody is available in Firebase Cloud Functions if configured, else construct manually
  const body = req.rawBody;

  if (!signature || !body) {
    res.status(400).send('Missing signature or body');
    return;
  }

  // 1. Verify Signature
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  if (signature !== expectedSignature) {
    console.error("Invalid Webhook Signature");
    res.status(400).send('Invalid signature');
    return;
  }

  // 2. Process Event
  const event = req.body.event;
  const payload = req.body.payload.payment.entity;
  
  console.log(`Received Webhook: ${event}`, payload.id);

  if (event === 'payment.captured') {
    const notes = payload.notes || {};
    const amount = payload.amount / 100; // Convert to main unit
    const paymentId = payload.id;

    try {
      if (notes.paymentType === 'BOOKING' && notes.bookingId) {
        await handleBookingPayment(notes.bookingId, paymentId, amount, payload.method);
      } else if (notes.paymentType === 'WALLET' && notes.userId) {
        await handleWalletTopup(notes.userId, paymentId, amount);
      } else {
        console.warn('Unknown Payment Type or missing metadata', notes);
      }
    } catch (err) {
      console.error("Error processing webhook data:", err);
      res.status(500).send('Internal Error');
      return;
    }
  }

  res.json({ status: 'ok' });
});

// --- HELPERS ---

async function handleBookingPayment(bookingId: string, paymentId: string, amount: number, method: string) {
  const bookingRef = db.collection('bookings').doc(bookingId);
  
  await db.runTransaction(async (transaction) => {
    const bookingSnap = await transaction.get(bookingRef);

    if (!bookingSnap.exists) {
        console.warn(`Booking ${bookingId} not found for payment ${paymentId}`);
        return;
    }

    const booking = bookingSnap.data();
    const payments = booking?.payments || [];
    
    // Check if payment already exists (via Optimistic update)
    // The frontend creates a reference like "Gateway: pay_123..."
    const existingIndex = payments.findIndex((p: any) => p.reference && p.reference.includes(paymentId));
    
    if (existingIndex > -1) {
        // Payment exists! Update it to verified if not already.
        // This handles the "Success but Verify" flow.
        const currentPay = payments[existingIndex];
        
        if (currentPay.verificationStatus !== 'VERIFIED') {
             console.log(`Updating existing payment ${paymentId} to VERIFIED`);
             
             // Create modified array to update just this item
             const updatedPayments = [...payments];
             updatedPayments[existingIndex] = {
                 ...currentPay,
                 verificationStatus: 'VERIFIED',
                 source: 'RAZORPAY_WEBHOOK_VERIFIED'
             };
             
             transaction.update(bookingRef, { payments: updatedPayments });
        } else {
             console.log(`Payment ${paymentId} already verified. Skipping.`);
        }
        return;
    }

    console.log(`Creating NEW payment record via Webhook for ${paymentId}`);
    
    const newPaid = (booking?.paidAmount || 0) + amount;
    let newStatus = booking?.paymentStatus;
    // Allow tiny rounding buffer
    if (newPaid >= ((booking?.totalAmount || 0) - 0.5)) newStatus = 'PAID_IN_FULL';
    else if (newPaid > 0) newStatus = 'PARTIALLY_PAID';

    const paymentEntry = {
        id: `pay_${Date.now()}`,
        type: (booking?.paidAmount === 0) ? 'ADVANCE' : 'BALANCE',
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
  });
}

async function handleWalletTopup(userId: string, paymentId: string, amount: number) {
  const userRef = db.collection('users').doc(userId);
  
  // Idempotency check using audit logs
  const existingLogs = await db.collection('audit_logs')
        .where('entityId', '==', paymentId)
        .where('action', '==', 'WALLET_TOPUP')
        .get();
        
  if (!existingLogs.empty) {
      console.log(`Wallet Topup ${paymentId} already processed.`);
      return;
  }

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

// --- WELCOME EMAIL TRIGGER ---
export const sendWelcomeEmail = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.emailVerified === false && after.emailVerified === true && !after.welcomeEmailSent) {
      const email = after.email;
      const name = after.displayName || 'Partner';
      const dashboardUrl = 'https://b2b.ideaholiday.com/#/login';

      const mailOptions = {
        from: '"Idea Holiday Partner Network" <noreply@ideaholiday.com>',
        to: email,
        subject: 'Welcome to Idea Holiday Partner Network 🎉',
        html: getWelcomeEmailHtml(name, dashboardUrl)
      };

      try {
        await transporter.sendMail(mailOptions);
        return change.after.ref.update({
          welcomeEmailSent: true,
          welcomeEmailSentAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (error) {
        console.error('Error sending welcome email:', error);
        return null;
      }
    }
    return null;
  });

// --- CLIENT-SIDE VERIFICATION HELPER ---
export const verifyRazorpayPayment = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }

    const { paymentId, expectedAmount } = data;

    if (!paymentId || !expectedAmount) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing payment ID or amount.');
    }

    try {
        const authHeader = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
        
        const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${authHeader}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new functions.https.HttpsError('internal', 'Gateway Error');

        const paymentData = await response.json();

        if (paymentData.status !== 'authorized' && paymentData.status !== 'captured') {
            throw new functions.https.HttpsError('failed-precondition', `Invalid Status: ${paymentData.status}`);
        }

        if (paymentData.status === 'authorized') {
             const captureResp = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/capture`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${authHeader}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ amount: paymentData.amount, currency: paymentData.currency })
            });
            if (!captureResp.ok) throw new functions.https.HttpsError('internal', 'Capture Failed');
        }

        return { success: true, paymentId: paymentData.id, amount: paymentData.amount / 100 };

    } catch (error: any) {
        console.error("Verification Logic Error:", error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
