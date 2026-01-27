
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import { getWelcomeEmailHtml } from './welcomeTemplate';

admin.initializeApp();
const db = admin.firestore();
const fcm = admin.messaging();

// Configure Transporter (Use Environment Variables in Prod)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: functions.config().email.user, 
    pass: functions.config().email.pass
  }
});

// --- EMAIL: Welcome Email Trigger ---
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

// --- PUSH NOTIFICATION: Booking Status Update ---
export const sendBookingNotification = functions.firestore
  .document('bookings/{bookingId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const bookingId = context.params.bookingId;

    // Only trigger if Status changed or Operator changed
    const statusChanged = before.status !== after.status;
    const operatorAssigned = !before.operatorId && after.operatorId;

    if (!statusChanged && !operatorAssigned) return null;

    let targetUserId = null;
    let title = '';
    let body = '';

    // 1. Notify Agent if status changed
    if (statusChanged) {
        targetUserId = after.agentId;
        title = `Booking Update: ${after.uniqueRefNo}`;
        body = `Status changed to ${after.status.replace(/_/g, ' ')}. Destination: ${after.destination}`;
    }

    // 2. Notify Operator if Assigned
    if (operatorAssigned) {
        targetUserId = after.operatorId;
        title = `New Assignment: ${after.uniqueRefNo}`;
        body = `You have been assigned a new booking for ${after.destination}. Please review.`;
    }

    // 3. Notify Operator if Status Changed (e.g. Cancelled)
    if (statusChanged && after.operatorId) {
         // This overrides the Agent notification in this simple logic block. 
         // In prod, you'd send two messages or loop. 
         // Here we prioritize the Operator for operational alerts if they are involved.
         if (after.status.includes('CANCEL')) {
             targetUserId = after.operatorId;
             title = `Booking Cancelled: ${after.uniqueRefNo}`;
             body = `Booking for ${after.destination} has been cancelled.`;
         }
    }

    if (!targetUserId) return null;

    // Fetch Target User's FCM Token
    try {
        const userDoc = await db.collection('users').doc(targetUserId).get();
        const userData = userDoc.data();
        
        if (userData && userData.fcmToken) {
            const message = {
                notification: {
                    title: title,
                    body: body
                },
                token: userData.fcmToken,
                data: {
                    bookingId: bookingId,
                    type: 'BOOKING_UPDATE'
                }
            };

            await fcm.send(message);
            console.log(`Notification sent to user ${targetUserId}`);
        } else {
            console.log(`No FCM token found for user ${targetUserId}`);
        }
    } catch (error) {
        console.error('Error sending notification:', error);
    }
    
    return null;
  });
