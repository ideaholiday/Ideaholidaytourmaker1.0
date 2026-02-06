
import { UserNotification, UserRole, User } from '../types';
import { dbHelper } from './firestoreHelper';
import { adminService } from './adminService';

const COLLECTION = 'user_notifications';

class NotificationService {
  
  async getNotifications(userId: string): Promise<UserNotification[]> {
    const alerts = await dbHelper.getWhere<UserNotification>(COLLECTION, 'recipientId', '==', userId);
    // Sort descending
    return alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getUnreadCount(userId: string): Promise<number> {
    const alerts = await this.getNotifications(userId);
    return alerts.filter(n => !n.isRead).length;
  }

  async markAsRead(notificationId: string): Promise<void> {
    await dbHelper.save(COLLECTION, { id: notificationId, isRead: true });
  }

  async markAllAsRead(userId: string): Promise<void> {
    const alerts = await this.getNotifications(userId);
    const unread = alerts.filter(n => !n.isRead);
    
    // Batch update simulation
    await Promise.all(unread.map(n => 
        dbHelper.save(COLLECTION, { id: n.id, isRead: true })
    ));
  }

  async deleteNotification(notificationId: string): Promise<void> {
      await dbHelper.delete(COLLECTION, notificationId);
  }

  async clearAllRead(userId: string): Promise<void> {
      const alerts = await this.getNotifications(userId);
      const read = alerts.filter(n => n.isRead);
      
      // Batch delete simulation
      await Promise.all(read.map(n => 
          dbHelper.delete(COLLECTION, n.id)
      ));
  }

  async send(
    recipientId: string | string[], 
    title: string, 
    message: string, 
    type: 'BOOKING' | 'PAYMENT' | 'ALERT' | 'SUCCESS' | 'WARNING' | 'INFO', 
    link?: string
  ) {
    const recipients = Array.isArray(recipientId) ? recipientId : [recipientId];
    
    for (const uid of recipients) {
        if (!uid) continue;
        
        const notification: UserNotification = {
            id: `notif_${Date.now()}_${Math.random().toString(36).substr(2,4)}`,
            recipientId: uid,
            title,
            message,
            type,
            link,
            isRead: false,
            createdAt: new Date().toISOString()
        };
        
        await dbHelper.save(COLLECTION, notification);
    }
  }

  // --- HELPERS FOR TARGETING ROLES ---

  async notifyAdmins(title: string, message: string, link?: string, type: 'BOOKING' | 'PAYMENT' | 'ALERT' | 'SUCCESS' | 'WARNING' | 'INFO' = 'ALERT') {
      const allUsers = await adminService.getUsers();
      const adminIds = allUsers.filter(u => u.role === UserRole.ADMIN || u.role === UserRole.STAFF).map(u => u.id);
      await this.send(adminIds, title, message, type, link);
  }
}

export const notificationService = new NotificationService();
