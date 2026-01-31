import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer'; // Standard library, can be swapped for SendGrid/Postmark
import { getWelcomeEmailHtml } from './welcomeTemplate';
import { Buffer } from 'buffer';

admin.initializeApp();
const db = admin.firestore();

// --- RAZORPAY LIVE CREDENTIALS ---
// In a production environment, these should be set via: 
// firebase functions:config:set razorpay.key_id="..." razorpay.secret="..."
const RAZORPAY_KEY_ID = "rzp_live_SAPwjiuTqQAC6H";
const RAZORPAY_KEY_SECRET = "Joq1q45SoxsRACwun6yN36dA";

// Configure Transporter (Use Environment Variables in Prod)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: functions.config().email?.user || 'demo@gmail.com', 
    pass: functions.config().email?.pass || 'demo_pass'  
  }
});

// --- WELCOME EMAIL TRIGGER ---
export const sendWelcomeEmail = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // TRIGGER CONDITION:
    // 1. Email was NOT verified before
    // 2. Email IS verified now
    // 3. Welcome email has NOT been sent yet
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

        // MARK AS SENT to prevent duplicates
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

// --- PAYMENT VERIFICATION FUNCTION ---
export const verifyRazorpayPayment = functions.https.onCall(async (data, context) => {
    // 1. Security Check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }

    const { paymentId, expectedAmount, currency } = data;

    if (!paymentId || !expectedAmount) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing payment ID or amount.');
    }

    try {
        // 2. Fetch Payment Details from Razorpay
        // We use Basic Auth with Key ID and Secret
        const authHeader = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
        
        const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${authHeader}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error('Razorpay API Error:', errBody);
            throw new functions.https.HttpsError('internal', 'Failed to fetch payment details from gateway.');
        }

        const paymentData = await response.json();

        // 3. Verify Status
        // Status can be 'authorized' or 'captured'
        if (paymentData.status !== 'authorized' && paymentData.status !== 'captured') {
            throw new functions.https.HttpsError('failed-precondition', `Payment status is ${paymentData.status}, expected authorized or captured.`);
        }

        // 4. Verify Amount
        // Razorpay returns amount in subunits (paise). 
        // We expect `expectedAmount` from client to be in main units (Rupees), so we multiply by 100.
        // Or if client sends subunits, adjust accordingly. 
        // Standard: Client sends 1000 (Rupees). Razorpay has 100000 (Paise).
        const amountInSubunits = Math.round(expectedAmount * 100);
        
        if (paymentData.amount !== amountInSubunits) {
             console.warn(`Amount Mismatch: Expected ${amountInSubunits}, Got ${paymentData.amount}`);
             // Allow tiny rounding diff if necessary, but exact match is safer
             if (Math.abs(paymentData.amount - amountInSubunits) > 100) { // Tolerate 1 rupee diff
                 throw new functions.https.HttpsError('invalid-argument', 'Payment amount mismatch.');
             }
        }

        // 5. Capture Payment (if not already captured)
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
                console.error('Capture Failed:', await captureResp.text());
                throw new functions.https.HttpsError('internal', 'Payment authorized but capture failed.');
            }
        }

        // 6. Success
        return { success: true, paymentId: paymentData.id, amount: paymentData.amount / 100 };

    } catch (error) {
        console.error("Verification Logic Error:", error);
        throw new functions.https.HttpsError('internal', 'Payment verification process failed.');
    }
});