
import { Booking, ReminderType, ReminderStage } from '../types';
import { BRANDING } from '../constants';

export const generateReminderEmail = (booking: Booking, type: ReminderType, stage: ReminderStage) => {
  const paymentLink = `${window.location.origin}/#/payment/${booking.id}`;
  const amountDue = type === 'ADVANCE' ? booking.advanceAmount - booking.paidAmount : booking.balanceAmount;
  
  let subject = '';
  let toneText = '';
  let color = '#0ea5e9'; // Blue

  if (stage === 'FIRST') {
      subject = `Action Required: Payment Pending for ${booking.destination} (${booking.uniqueRefNo})`;
      toneText = `We hope you are excited about your upcoming trip to <strong>${booking.destination}</strong>. This is a gentle reminder regarding a pending payment.`;
  } else if (stage === 'SECOND') {
      subject = `Reminder: Payment Due for Booking #${booking.uniqueRefNo}`;
      toneText = `We noticed that the payment for your booking to <strong>${booking.destination}</strong> is still pending. Please clear the dues to avoid any service interruption.`;
      color = '#f59e0b'; // Amber
  } else {
      subject = `URGENT: Final Reminder for Booking #${booking.uniqueRefNo}`;
      toneText = `This is a final reminder to settle the outstanding amount for your booking. Please make the payment immediately to secure your reservations.`;
      color = '#ef4444'; // Red
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; }
        .header { background-color: ${color}; padding: 30px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
        .content { padding: 40px 30px; }
        .amount-box { background-color: #f1f5f9; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0; border: 1px solid #cbd5e1; }
        .amount-label { font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 1px; }
        .amount-value { font-size: 32px; color: ${color}; font-weight: 700; margin-top: 5px; }
        .details-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
        .details-table td { padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
        .details-table td:last-child { text-align: right; font-weight: 600; color: #1e293b; }
        .btn { display: block; width: 100%; background-color: #0f172a; color: #ffffff; padding: 16px; text-decoration: none; border-radius: 8px; font-weight: 700; text-align: center; margin-top: 10px; font-size: 16px; }
        .btn:hover { background-color: #1e293b; }
        .footer { background-color: #f8fafc; padding: 30px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        .footer a { color: #64748b; text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Payment Reminder</h1>
        </div>
        <div class="content">
          <p>Dear Customer,</p>
          <p>${toneText}</p>
          
          <div class="amount-box">
            <div class="amount-label">Total Amount Due</div>
            <div class="amount-value">${booking.currency} ${amountDue.toLocaleString()}</div>
          </div>

          <table class="details-table">
            <tr>
              <td>Booking Reference</td>
              <td>${booking.uniqueRefNo}</td>
            </tr>
            <tr>
              <td>Destination</td>
              <td>${booking.destination}</td>
            </tr>
            <tr>
              <td>Travel Date</td>
              <td>${new Date(booking.travelDate).toLocaleDateString()}</td>
            </tr>
            <tr>
              <td>Total Booking Value</td>
              <td>${booking.currency} ${booking.totalAmount.toLocaleString()}</td>
            </tr>
            <tr>
              <td>Already Paid</td>
              <td>${booking.currency} ${booking.paidAmount.toLocaleString()}</td>
            </tr>
          </table>

          <a href="${paymentLink}" class="btn">Pay Now Securely</a>

          <p style="font-size: 13px; color: #64748b; margin-top: 25px; text-align: center;">
            If you have already made this payment, please ignore this email or contact your agent.
          </p>
        </div>
        <div class="footer">
          <p><strong>${BRANDING.name}</strong><br>B2B Travel Technology Partner</p>
          <p><a href="mailto:${BRANDING.email}">${BRANDING.email}</a> | ${BRANDING.supportPhone}</p>
          <p>&copy; ${new Date().getFullYear()} ${BRANDING.legalName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
};
