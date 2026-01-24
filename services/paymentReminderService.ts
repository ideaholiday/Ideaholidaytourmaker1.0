
import { PaymentReminder, ReminderConfig, User } from '../types';
import { dbHelper } from './firestoreHelper';

const COLLECTION = 'payment_reminders';

class PaymentReminderService {
  
  // Config would usually be a single doc, simplified here
  getConfig(): ReminderConfig {
    return {
        enabled: true,
        firstReminderDays: 0,
        secondReminderDays: 2,
        finalReminderDays: 5,
        includeWhatsApp: false
    };
  }

  async getRemindersForBooking(bookingId: string): Promise<PaymentReminder[]> {
      return await dbHelper.getWhere<PaymentReminder>(COLLECTION, 'bookingId', '==', bookingId);
  }

  async sendReminder(booking: any, type: any, stage: any, user: User) {
      // Create Reminder Object
      const reminder: PaymentReminder = {
          id: `rem_${Date.now()}`,
          bookingId: booking.id,
          bookingRef: booking.uniqueRefNo,
          type,
          stage,
          channel: 'EMAIL',
          sentAt: new Date().toISOString(),
          recipientEmail: 'agent@email.com', // Mock
          amountDue: 100,
          status: 'SENT'
      };
      
      await dbHelper.save(COLLECTION, reminder);
  }

  async processAutomatedReminders(user: User): Promise<number> {
      // Mock logic for automation trigger
      return 0;
  }
  
  updateConfig(config: ReminderConfig) {
      // Save to Firestore 'settings/reminders'
  }
}

export const paymentReminderService = new PaymentReminderService();
