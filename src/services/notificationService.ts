
import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from './firebase';
import { dbHelper } from './firestoreHelper';
import { User } from '../types';

class NotificationService {
  
  // Public VAPID Key from Firebase Console -> Project Settings -> Cloud Messaging
  // Using a placeholder for now, replace with actual key generated in console
  private vapidKey = "BKy...REPLACE_WITH_ACTUAL_VAPID_KEY_FROM_FIREBASE_CONSOLE...xyz"; 

  async requestPermission(user: User): Promise<string | null> {
    if (!messaging) return null;

    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        const token = await getToken(messaging, {
          vapidKey: this.vapidKey
        });

        if (token) {
          console.log("FCM Token generated:", token);
          // Save token to user profile
          await this.saveTokenToUser(user.id, token);
          return token;
        }
      } else {
        console.warn("Notification permission denied.");
      }
    } catch (error) {
      console.error("An error occurred while retrieving token. ", error);
    }
    return null;
  }

  async saveTokenToUser(userId: string, token: string) {
    // We update the user document with the FCM token.
    // Ideally, we store an array of tokens for multiple devices, but simple string for MVP.
    await dbHelper.save('users', { id: userId, fcmToken: token });
  }

  // Listen for messages when app is in foreground
  onMessageListener(callback: (payload: any) => void) {
    if (!messaging) return;
    
    return onMessage(messaging, (payload) => {
      console.log("Foreground Message received: ", payload);
      callback(payload);
    });
  }
}

export const notificationService = new NotificationService();
