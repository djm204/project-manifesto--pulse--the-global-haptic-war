import { Platform, Alert } from 'react-native';
import PushNotification from 'react-native-push-notification';
import { SecurityService } from './SecurityService';
import { ApiService } from './ApiService';

export interface NotificationConfig {
  title: string;
  message: string;
  data?: any;
  scheduledTime?: Date;
  sound?: boolean;
  vibration?: boolean;
}

export class NotificationService {
  private securityService: SecurityService;
  private apiService: ApiService;
  private isInitialized: boolean = false;

  constructor() {
    this.securityService = new SecurityService();
    this.apiService = new ApiService();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.requestPermissions();
      this.configurePushNotifications();
      await this.registerForRemoteNotifications();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize NotificationService:', error);
      throw new Error('NotificationService initialization failed');
    }
  }

  private async requestPermissions(): Promise<boolean> {
    return new Promise((resolve) => {
      PushNotification.requestPermissions().then(
        (result) => {
          resolve(result.alert || result.badge || result.sound);
        }
      );
    });
  }

  private configurePushNotifications(): void {
    PushNotification.configure({
      onRegister: async (token) => {
        console.log('Device registered for notifications:', token);
        await this.sendTokenToServer(token.token);
      },

      onNotification: (notification) => {
        console.log('Notification received:', notification);
        this.handleNotification(notification);
      },

      onAction: (notification) => {
        console.log('Notification action:', notification.action);
      },

      onRegistrationError: (err) => {
        console.error('Notification registration error:', err.message);
      },

      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },

      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
    });
  }

  private async registerForRemoteNotifications(): Promise<void> {
    if (Platform.OS === 'ios') {
      PushNotification.registerForRemoteNotifications();
    }
  }

  private async sendTokenToServer(token: string): Promise<void> {
    try {
      const encryptedToken = await this.securityService.encryptPII(token);
      await this.apiService.post('/notifications/register', {
        deviceToken: encryptedToken,
        platform: Platform.OS
      });
    } catch (error) {
      console.error('Failed to register device token:', error);
    }
  }

  private handleNotification(notification: any): void {
    if (notification.userInteraction) {
      // User tapped on notification
      this.handleNotificationTap(notification);
    } else {
      // Notification received while app is active
      this.showInAppNotification(notification);
    }
  }

  private handleNotificationTap(notification: any): void {
    // Navigate to appropriate screen based on notification data
    const { type, data } = notification.data || {};
    
    switch (type) {
      case 'pulse_starting':
        // Navigate to pulse screen
        break;
      case 'leaderboard_update':
        // Navigate to leaderboard
        break;
      case 'achievement':
        // Show achievement modal
        break;
      default:
        break;
    }
  }

  private showInAppNotification(notification: any): void {
    Alert.alert(
      notification.title || 'Global Pulse',
      notification.message || notification.body,
      [
        { text: 'Dismiss', style: 'cancel' },
        { text: 'View', onPress: () => this.handleNotificationTap(notification) }
      ]
    );
  }

  async scheduleLocalNotification(config: NotificationConfig): Promise<void> {
    PushNotification.localNotificationSchedule({
      title: config.title,
      message: config.message,
      date: config.scheduledTime || new Date(Date.now() + 1000),
      playSound: config.sound !== false,
      vibrate: config.vibration !== false,
      userInfo: config.data || {},
    });
  }

  async schedulePulseReminder(pulseTime: Date): Promise<void> {
    const reminderTime = new Date(pulseTime.getTime() - 5 * 60 * 1000); // 5 minutes before
    
    await this.scheduleLocalNotification({
      title: 'Global Pulse Starting Soon!',
      message: 'Join millions worldwide in 5 minutes for the next pulse event.',
      scheduledTime: reminderTime,
      data: { type: 'pulse_reminder' }
    });
  }

  async cancelAllNotifications(): Promise<void> {
    PushNotification.cancelAllLocalNotifications();
  }

  async cancelNotification(id: string): Promise<void> {
    PushNotification.cancelLocalNotification(id);
  }

  async sendPulseNotification(participants: number): Promise<void> {
    await this.scheduleLocalNotification({
      title: 'Global Pulse Active!',
      message: `${participants.toLocaleString()} people are pulsing right now!`,
      data: { type: 'pulse_active', participants }
    });
  }
}