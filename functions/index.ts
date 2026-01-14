
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer'; // Standard library, can be swapped for SendGrid/Postmark
import { getWelcomeEmailHtml } from './welcomeTemplate';

admin.initializeApp();
const db = admin.firestore();

// Configure Transporter (Use Environment Variables in Prod)
// For dev/demo, using a standard SMTP pattern. In Prod, use SendGrid.
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: functions.config().email.user, // Set via: firebase functions:config:set email.user="..."
    pass: functions.config().email.pass  // Set via: firebase functions:config:set email.pass="..."
  }
});

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
