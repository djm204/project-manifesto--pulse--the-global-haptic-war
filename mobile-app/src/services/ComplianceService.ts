import AsyncStorage from '@react-native-async-storage/async-storage';
import { SecurityService } from './SecurityService';

export interface ConsentData {
  analytics: boolean;
  advertising: boolean;
  personalization: boolean;
  timestamp: string;
  version: string;
}

export interface DataExportRequest {
  userId: string;
  requestType: 'access' | 'delete' | 'portability';
  timestamp: string;
}

export class ComplianceService {
  private static readonly CONSENT_KEY = 'user_consent_data';
  private static readonly CONSENT_VERSION = '1.0';

  static async getConsentData(): Promise<ConsentData | null> {
    try {
      const consentData = await AsyncStorage.getItem(this.CONSENT_KEY);
      return consentData ? JSON.parse(consentData) : null;
    } catch (error) {
      console.error('Error retrieving consent data:', error);
      return null;
    }
  }

  static async updateConsent(consent: Partial<ConsentData>): Promise<void> {
    try {
      const existingConsent = await this.getConsentData();
      const updatedConsent: ConsentData = {
        ...existingConsent,
        ...consent,
        timestamp: new Date().toISOString(),
        version: this.CONSENT_VERSION
      };

      await AsyncStorage.setItem(this.CONSENT_KEY, JSON.stringify(updatedConsent));
      await this.logConsentChange(updatedConsent);
    } catch (error) {
      console.error('Error updating consent:', error);
      throw error;
    }
  }

  static async handleDataSubjectRequest(request: DataExportRequest): Promise<any> {
    try {
      const encryptedRequest = SecurityService.encryptSensitiveData(JSON.stringify(request));
      
      // In production, this would call the backend API
      const response = await fetch('/api/compliance/data-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await SecurityService.getAuthToken()}`
        },
        body: JSON.stringify({ encryptedRequest })
      });

      if (!response.ok) {
        throw new Error('Data request failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Error handling data subject request:', error);
      throw error;
    }
  }

  static async deleteUserData(userId: string): Promise<void> {
    try {
      // Clear local data
      await AsyncStorage.multiRemove([
        this.CONSENT_KEY,
        'user_profile',
        'pulse_history',
        'analytics_data'
      ]);

      // Request server-side deletion
      await this.handleDataSubjectRequest({
        userId,
        requestType: 'delete',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error deleting user data:', error);
      throw error;
    }
  }

  private static async logConsentChange(consent: ConsentData): Promise<void> {
    try {
      const logEntry = {
        consent,
        deviceId: SecurityService.hashIdentifier(await SecurityService.getDeviceId()),
        timestamp: new Date().toISOString()
      };

      // Store locally and sync with server
      const logs = await AsyncStorage.getItem('consent_logs') || '[]';
      const parsedLogs = JSON.parse(logs);
      parsedLogs.push(logEntry);
      
      await AsyncStorage.setItem('consent_logs', JSON.stringify(parsedLogs));
    } catch (error) {
      console.error('Error logging consent change:', error);
    }
  }

  static async isConsentRequired(): Promise<boolean> {
    const consent = await this.getConsentData();
    return !consent || consent.version !== this.CONSENT_VERSION;
  }

  static async hasAnalyticsConsent(): Promise<boolean> {
    const consent = await this.getConsentData();
    return consent?.analytics ?? false;
  }

  static async hasAdvertisingConsent(): Promise<boolean> {
    const consent = await this.getConsentData();
    return consent?.advertising ?? false;
  }
}