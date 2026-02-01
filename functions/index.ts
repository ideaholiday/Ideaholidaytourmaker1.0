
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer'; // Standard library, can be swapped for SendGrid/Postmark
import * as crypto from 'crypto'; // Native Node.js crypto
import { getWelcomeEmailHtml } from './welcomeTemplate';
import { Buffer } from 'buffer';

admin.initializeApp();
const db = admin.firestore();

// --- CONFIGURATION ---
const RAZORPAY_KEY_ID = "rzp_live_SAPwjiuTqQAC6H";
const RAZORPAY_KEY_SECRET = "Joq1q45SoxsRACwun6yN36dA";
const WEBHOOK_SECRET = "idea_holiday_secret_key_123"; // Must match Razorpay Dashboard

// Configure Transporter (Use Environment Variables in Prod)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: functions.config().email?.user || 'demo@gmail.com', 
    pass: functions.config().email?.pass || 'demo_pass'  
  }
});

// --- RAZORPAY WEBHOOK ---
export const razorpayWebhook = functions.https.onRequest(async (req, res) => {
  const signature = req.get('x-razorpay-signature');
  const body = JSON.stringify(req.body);

  if (!signature) {
    res.status(400).send('Missing signature');
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
  
  // Use transaction to ensure atomic read-write and strict idempotency
  await db.runTransaction(async (transaction) => {
    const bookingSnap = await transaction.get(bookingRef);

    if (!bookingSnap.exists) {
        console.warn(`Booking ${bookingId} not found for payment ${paymentId}`);
        return;
    }

    const booking = bookingSnap.data();
    const payments = booking?.payments || [];
    
    // Check if payment ID already exists in array
    // We check substring because reference might be "Gateway: pay_123..."
    const existingIndex = payments.findIndex((p: any) => p.reference && p.reference.includes(paymentId));
    
    if (existingIndex > -1) {
        // Payment Exists: Update Verification Status if needed
        if (payments[existingIndex].verificationStatus !== 'VERIFIED') {
             console.log(`Updating existing payment ${paymentId} to VERIFIED`);
             payments[existingIndex].verificationStatus = 'VERIFIED';
             payments[existingIndex].source = 'RAZORPAY_WEBHOOK';
             
             transaction.update(bookingRef, { payments: payments });
        } else {
            console.log(`Payment ${paymentId} already verified. Skipping.`);
        }
        return;
    }

    // Payment NOT found: Create New Entry (Frontend failed to record)
    console.log(`Creating missing payment record for ${paymentId}`);
    
    const newPaid = (booking?.paidAmount || 0) + amount;
    let newStatus = booking?.paymentStatus;
    if (newPaid >= (booking?.totalAmount || 0)) newStatus = 'PAID_IN_FULL';
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
        balanceAmount: (booking?.totalAmount || 0) - newPaid,
        paymentStatus: newStatus,
        payments: admin.firestore.FieldValue.arrayUnion(paymentEntry),
        updatedAt: new Date().toISOString()
    });
  });
}

async function handleWalletTopup(userId: string, paymentId: string, amount: number) {
  const userRef = db.collection('users').doc(userId);
  
  // Check if log exists to prevent double credit
  const existingLogs = await db.collection('audit_logs')
        .where('entityId', '==', paymentId)
        .where('action', '==', 'WALLET_TOPUP')
        .get();
        
  if (!existingLogs.empty) {
      console.log(`Wallet topup ${paymentId} already processed.`);
      return;
  }

  // Add funds using increment
  await userRef.update({
    walletBalance: admin.firestore.FieldValue.increment(amount),
    updatedAt: new Date().toISOString()
  });

  // Log Audit (IMPORTANT: performedById is the USER ID so it shows in their history)
  await db.collection('audit_logs').add({
     entityType: 'PAYMENT',
     entityId: paymentId,
     action: 'WALLET_TOPUP',
     description: `Wallet top-up via Webhook. Amount: ${amount}`,
     performedById: userId, // CRITICAL FIX: Attribute to user for history filtering
     performedByName: 'Razorpay Webhook',
     timestamp: new Date().toISOString(),
     newValue: { amount, gatewayId: paymentId, verified: true }
  });

  console.log(`Wallet for user ${userId} topped up via Webhook.`);
}

// --- WELCOME EMAIL TRIGGER ---
export const sendWelcomeEmail = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (
      before.emailVerified === false && 
      after.emailVerified === true && 
      !after.welcomeEmailSent
    ) {
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
        console.log(`Welcome email sent to ${email}`);
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

// --- CLIENT-SIDE VERIFICATION HELPER (FALLBACK) ---
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

        if (!response.ok) {
            throw new functions.https.HttpsError('internal', 'Failed to fetch payment details from gateway.');
        }

        const paymentData = await response.json();

        if (paymentData.status !== 'authorized' && paymentData.status !== 'captured') {
            throw new functions.https.HttpsError('failed-precondition', `Payment status is ${paymentData.status}.`);
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
            
            if (!captureResp.ok) {
                throw new functions.https.HttpsError('internal', 'Payment authorized but capture failed.');
            }
        }

        return { success: true, paymentId: paymentData.id, amount: paymentData.amount / 100 };

    } catch (error) {
        console.error("Verification Logic Error:", error);
        throw new functions.https.HttpsError('internal', 'Payment verification process failed.');
    }
});
