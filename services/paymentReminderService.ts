
import { Booking, PaymentReminder, ReminderConfig, ReminderType, ReminderStage, User } from '../types';
import { bookingService } from './bookingService';
import { auditLogService } from './auditLogService';
import { generateReminderEmail } from '../utils/reminderTemplate';
import { profileService } from './profileService';

const STORAGE_KEY_REMINDERS = 'iht_payment_reminders';
const STORAGE_KEY_CONFIG = 'iht_reminder_config';

const DEFAULT_CONFIG: ReminderConfig = {
  enabled: true,
  firstReminderDays: 0, // Day booking is created/confirmed
  secondReminderDays: 2,
  finalReminderDays: 5,
  includeWhatsApp: false
};

class PaymentReminderService {
  private reminders: PaymentReminder[];
  private config: ReminderConfig;

  constructor() {
    const stored = localStorage.getItem(STORAGE_KEY_REMINDERS);
    const storedConfig = localStorage.getItem(STORAGE_KEY_CONFIG);
    this.reminders = stored ? JSON.parse(stored) : [];
    this.config = storedConfig ? JSON.parse(storedConfig) : DEFAULT_CONFIG;
  }

  private save() {
    localStorage.setItem(STORAGE_KEY_REMINDERS, JSON.stringify(this.reminders));
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(this.config));
  }

  getConfig(): ReminderConfig {
    return this.config;
  }

  updateConfig(config: ReminderConfig) {
    this.config = config;
    this.save();
  }

  getRemindersForBooking(bookingId: string): PaymentReminder[] {
    return this.reminders.filter(r => r.bookingId === bookingId).sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  }

  /**
   * Main Automation Loop (Simulated Cloud Function)
   * Optimized for bulk processing by batching writes.
   */
  async processAutomatedReminders(adminUser: User): Promise<number> {
    if (!this.config.enabled) return 0;

    const bookings = bookingService.getAllBookings();
    let sentCount = 0;
    const newReminders: PaymentReminder[] = [];

    // Filter in-memory to speed up loop
    const eligibleBookings = bookings.filter(b => 
        b.status !== 'CANCELLED' && 
        b.status !== 'REJECTED' && 
        b.status !== 'COMPLETED' && 
        b.paymentStatus !== 'PAID_IN_FULL' && 
        !b.remindersDisabled
    );

    for (const booking of eligibleBookings) {
        // Fast lookup since this.reminders is in memory
        const remindersSent = this.getRemindersForBooking(booking.id);
        const daysSinceCreation = Math.floor((Date.now() - new Date(booking.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        
        let type: ReminderType = 'ADVANCE';
        if (booking.paidAmount >= booking.advanceAmount) type = 'BALANCE';
        
        let stage: ReminderStage | null = null;

        // Logic Schedule
        // FIRST: T+0 (If creation day matches config)
        if (daysSinceCreation >= this.config.firstReminderDays && !remindersSent.some(r => r.stage === 'FIRST' && r.type === type)) {
            stage = 'FIRST';
        }
        // SECOND: T+2
        else if (daysSinceCreation >= this.config.secondReminderDays && !remindersSent.some(r => r.stage === 'SECOND' && r.type === type)) {
            stage = 'SECOND';
        }
        // FINAL: T+5
        else if (daysSinceCreation >= this.config.finalReminderDays && !remindersSent.some(r => r.stage === 'FINAL' && r.type === type)) {
            stage = 'FINAL';
        }

        if (stage) {
            // Generate object WITHOUT saving immediately
            const reminder = await this._createReminderObject(booking, type, stage, adminUser, true);
            newReminders.unshift(reminder);
            sentCount++;
        }
    }

    // Batch Save: Single Write Operation
    if (newReminders.length > 0) {
        this.reminders = [...newReminders, ...this.reminders];
        this.save();

        // Async log audits to prevent UI blocking
        setTimeout(() => {
            newReminders.forEach(r => {
                auditLogService.logAction({
                    entityType: 'PAYMENT_REMINDER',
                    entityId: r.id,
                    action: 'AUTO_REMINDER_SENT',
                    description: `Sent ${r.stage} ${r.type} reminder to ${r.recipientEmail}`,
                    user: adminUser,
                    newValue: r
                });
            });
        }, 10);
    }

    return sentCount;
  }

  /**
   * Send a specific reminder (Manual) - Saves immediately
   */
  async sendReminder(
      booking: Booking, 
      type: ReminderType, 
      stage: ReminderStage, 
      user: User
  ): Promise<void> {
      const reminder = await this._createReminderObject(booking, type, stage, user, false);
      
      this.reminders.unshift(reminder);
      this.save();

      auditLogService.logAction({
          entityType: 'PAYMENT_REMINDER',
          entityId: reminder.id,
          action: 'MANUAL_REMINDER_SENT',
          description: `Sent ${stage} ${type} reminder for Booking ${booking.uniqueRefNo}`,
          user: user,
          newValue: reminder
      });
  }

  // Helper: Core logic to generate reminder object (shared)
  private async _createReminderObject(booking: Booking, type: ReminderType, stage: ReminderStage, user: User, isAutomated: boolean): Promise<PaymentReminder> {
      const agent = profileService.getUser(booking.agentId);
      const recipientEmail = agent?.email || 'unknown@agent.com';
      
      const { subject } = generateReminderEmail(booking, type, stage);

      // Collapsed logging to reduce noise in bulk operations
      console.groupCollapsed(`📧 [MOCK EMAIL] Sending Payment Reminder`);
      console.log(`To: ${recipientEmail}`);
      console.log(`Subject: ${subject}`);
      console.log(`Type: ${type} | Stage: ${stage}`);
      console.groupEnd();

      return {
          id: `rem_${Date.now()}_${Math.random().toString(36).substr(2,5)}`,
          bookingId: booking.id,
          bookingRef: booking.uniqueRefNo,
          type,
          stage,
          channel: 'EMAIL',
          sentAt: new Date().toISOString(),
          recipientEmail,
          amountDue: type === 'ADVANCE' ? booking.advanceAmount - booking.paidAmount : booking.balanceAmount,
          status: 'SENT'
      };
  }

  toggleBookingReminders(bookingId: string, disabled: boolean) {
      const booking = bookingService.getBooking(bookingId);
      if (booking) {
          booking.remindersDisabled = disabled;
          // Note: This relies on booking object reference mutation. 
          // Ideally bookingService should expose an update method.
      }
  }
}

export const paymentReminderService = new PaymentReminderService();
