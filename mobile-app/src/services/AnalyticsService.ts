import { PrivacyService } from './PrivacyService';
import { SecurityService } from './SecurityService';

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp?: Date;
  userId?: string;
}

export interface UserProperties {
  userId: string;
  deviceType: string;
  appVersion: string;
  consentStatus: boolean;
}

export class AnalyticsService {
  private static instance: AnalyticsService;
  private privacyService: PrivacyService;
  private securityService: SecurityService;
  private eventQueue: AnalyticsEvent[] = [];
  private isInitialized = false;

  private constructor() {
    this.privacyService = PrivacyService.getInstance();
    this.securityService = SecurityService.getInstance();
  }

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  async initialize(): Promise<void> {
    try {
      const hasConsent = await this.privacyService.hasAnalyticsConsent();
      if (!hasConsent) {
        console.log('Analytics disabled - no user consent');
        return;
      }

      this.isInitialized = true;
      await this.flushEventQueue();
    } catch (error) {
      console.error('Failed to initialize analytics:', error);
    }
  }

  async trackEvent(event: AnalyticsEvent): Promise<void> {
    if (!this.isInitialized) {
      this.eventQueue.push(event);
      return;
    }

    const hasConsent = await this.privacyService.hasAnalyticsConsent();
    if (!hasConsent) {
      return;
    }

    try {
      const sanitizedEvent = this.sanitizeEvent(event);
      await this.sendEvent(sanitizedEvent);
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }

  async setUserProperties(properties: UserProperties): Promise<void> {
    const hasConsent = await this.privacyService.hasAnalyticsConsent();
    if (!hasConsent) {
      return;
    }

    try {
      const sanitizedProperties = this.sanitizeUserProperties(properties);
      await this.sendUserProperties(sanitizedProperties);
    } catch (error) {
      console.error('Failed to set user properties:', error);
    }
  }

  private sanitizeEvent(event: AnalyticsEvent): AnalyticsEvent {
    const sanitized: AnalyticsEvent = {
      name: event.name,
      timestamp: event.timestamp || new Date(),
    };

    if (event.properties) {
      sanitized.properties = this.removePII(event.properties);
    }

    return sanitized;
  }

  private sanitizeUserProperties(properties: UserProperties): Partial<UserProperties> {
    return {
      deviceType: properties.deviceType,
      appVersion: properties.appVersion,
      consentStatus: properties.consentStatus,
    };
  }

  private removePII(data: Record<string, any>): Record<string, any> {
    const piiFields = ['email', 'phone', 'name', 'address', 'ip'];
    const sanitized = { ...data };

    piiFields.forEach(field => {
      delete sanitized[field];
    });

    return sanitized;
  }

  private async sendEvent(event: AnalyticsEvent): Promise<void> {
    // Implementation would send to analytics service
    console.log('Sending analytics event:', event);
  }

  private async sendUserProperties(properties: Partial<UserProperties>): Promise<void> {
    // Implementation would send to analytics service
    console.log('Setting user properties:', properties);
  }

  private async flushEventQueue(): Promise<void> {
    const events = [...this.eventQueue];
    this.eventQueue = [];

    for (const event of events) {
      await this.trackEvent(event);
    }
  }

  async clearUserData(): Promise<void> {
    this.eventQueue = [];
    // Implementation would clear user data from analytics service
    console.log('Analytics user data cleared');
  }
}