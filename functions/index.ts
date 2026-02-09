
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import * as crypto from 'crypto';
import { getWelcomeEmailHtml } from './welcomeTemplate';
import { generateEmailContent } from './aiEmailService';
import { sendGmail } from './gmailService';

admin.initializeApp();
const db = admin.firestore();

// --- CONFIGURATION ---
const RAZORPAY_KEY_ID = "rzp_live_SAPwjiuTqQAC6H";
const WEBHOOK_SECRET = "idea_holiday_secret_key_123";

// Helper for Nodemailer Fallback
const sendSmtpEmail = async (to: string, subject: string, html: string): Promise<boolean> => {
    const user = functions.config().email?.user;
    const pass = functions.config().email?.pass;

    if (!user || !pass) {
        console.warn("SMTP config missing. Skipping fallback.");
        return false;
    }
    
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user, pass }
        });

        await transporter.sendMail({
            from: `"Idea Holiday" <${user}>`,
            to,
            subject,
            html
        });
        return true;
    } catch (e) {
        console.error("SMTP Error:", e);
        return false;
    }
};

// --- EMAIL AUTOMATION FUNCTION ---
export const sendBookingEmail = functions.https.onCall(async (data, context) => {
    // 1. Auth Check
    if (!context.auth) {
        return { success: false, message: 'User must be logged in.' };
    }

    const { bookingId, type } = data; 
    
    if (!bookingId) {
        return { success: false, message: 'Booking ID is required' };
    }

    try {
        const bookingSnap = await db.collection('bookings').doc(bookingId).get();
        if (!bookingSnap.exists) return { success: false, message: "Booking not found" };
        
        const booking = bookingSnap.data();
        
        // 2. Fetch Agent Email
        const agentSnap = await db.collection('users').doc(booking?.agentId).get();
        const agent = agentSnap.data();
        const targetEmail = agent?.email;

        if (!targetEmail) return { success: false, message: "Agent email not found" };

        // 3. Generate Content via AI (with fallback inside service)
        console.log(`Generating AI content for ${type} (Ref: ${booking?.uniqueRefNo})...`);
        const { subject, email_body_html } = await generateEmailContent(type, {
            ...booking,
            agentName: agent?.name,
            companyName: agent?.companyName
        });

        // 4. Send Email (Strategy: Gmail API -> SMTP -> Log Only)
        let sent = false;
        let method = 'NONE';

        // Try Gmail API
        sent = await sendGmail(targetEmail, subject, email_body_html);
        if (sent) method = 'GMAIL_API';

        // Try SMTP Fallback if Gmail API failed
        if (!sent) {
            console.log("Attempting SMTP fallback...");
            sent = await sendSmtpEmail(targetEmail, subject, email_body_html);
            if (sent) method = 'SMTP_FALLBACK';
        }

        // 5. Log to Audit (Crucial for debugging if sending fails)
        await db.collection('audit_logs').add({
            entityType: 'EMAIL',
            entityId: bookingId,
            action: sent ? 'EMAIL_SENT' : 'EMAIL_FAILED',
            description: `Attempted ${type} to ${targetEmail}. Method: ${method}. Success: ${sent}`,
            performedById: context.auth.uid,
            timestamp: new Date().toISOString(),
            metadata: { method, subject }
        });

        if (sent) {
            return { success: true, message: `Email sent successfully via ${method}` };
        } else {
            // Return success: false but do not throw HttpsError to prevent "Internal" crash on client
            return { 
                success: false, 
                message: "Email configuration missing or invalid. Action logged in system." 
            };
        }

    } catch (error: any) {
        console.error("Email Automation Critical Error:", error);
        // Return structured error instead of throwing
        return { success: false, message: `System Error: ${error.message}` };
    }
});

// --- RAZORPAY WEBHOOK ---
export const razorpayWebhook = functions.https.onRequest(async (req: any, res: any) => {
  const signature = req.headers['x-razorpay-signature'];
  const body = req.rawBody; 

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

// --- HELPERS ---
async function handleBookingPayment(bookingId: string, paymentId: string, amount: number, method: string) {
  const bookingRef = db.collection('bookings').doc(bookingId);
  
  await db.runTransaction(async (transaction) => {
    const bookingSnap = await transaction.get(bookingRef);
    if (!bookingSnap.exists) return;
    const booking = bookingSnap.data();
    
    const newPaid = (booking?.paidAmount || 0) + amount;
    let newStatus = booking?.paymentStatus;
    if (newPaid >= ((booking?.totalAmount || 0) - 0.5)) newStatus = 'PAID_IN_FULL';
    else if (newPaid > 0) newStatus = 'PARTIALLY_PAID';

    const paymentEntry = {
        id: `pay_${Date.now()}`,
        type: 'BALANCE',
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

export const verifyRazorpayPayment = functions.https.onCall(async (data, context) => {
    return { success: true };
});

export const sendWelcomeEmail = functions.firestore.document('users/{userId}').onUpdate(async (change, context) => {
    return null;
});
