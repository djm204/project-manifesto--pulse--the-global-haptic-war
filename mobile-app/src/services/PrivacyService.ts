import AsyncStorage from '@react-native-async-storage/async-storage';
import { SecurityService } from './SecurityService';

export interface ConsentData {
  advertising: boolean;
  analytics: boolean;
  personalization: boolean;
  timestamp: number;
  version: string;
}

export interface PrivacySettings {
  dataMinimization: boolean;
  anonymousMode: boolean;
  locationSharing: boolean;
  socialFeatures: boolean;
}

export class PrivacyService {
  private securityService: SecurityService;
  private readonly CONSENT_KEY = 'user_consent';
  private readonly SETTINGS_KEY = 'privacy_settings';
  private readonly CONSENT_VERSION = '1.0';

  constructor(securityService: SecurityService) {
    this.securityService = securityService;
  }

  async hasValidConsent(): Promise<boolean> {
    try {
      const consent = await this.getConsent();
      if (!consent) return false;

      // Check if consent is less than 1 year old
      const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);
      return consent.timestamp > oneYearAgo && consent.version === this.CONSENT_VERSION;
    } catch (error) {
      console.error('Error checking consent validity:', error);
      return false;
    }
  }

  async getConsent(): Promise<ConsentData | null> {
    try {
      const encryptedConsent = await AsyncStorage.getItem(this.CONSENT_KEY);
      if (!encryptedConsent) return null;

      const decryptedData = await this.securityService.decryptData(encryptedConsent);
      return JSON.parse(decryptedData);
    } catch (error) {
      console.error('Error getting consent:', error);
      return null;
    }
  }

  async setConsent(consent: Omit<ConsentData, 'timestamp' | 'version'>): Promise<void> {
    try {
      const consentData: ConsentData = {
        ...consent,
        timestamp: Date.now(),
        version: this.CONSENT_VERSION
      };

      const encryptedConsent = await this.securityService.encryptData(JSON.stringify(consentData));
      await AsyncStorage.setItem(this.CONSENT_KEY, encryptedConsent);
    } catch (error) {
      throw new Error(`Failed to save consent: ${error}`);
    }
  }

  async getPrivacySettings(): Promise<PrivacySettings> {
    try {
      const encryptedSettings = await AsyncStorage.getItem(this.SETTINGS_KEY);
      if (!encryptedSettings) {
        return this.getDefaultPrivacySettings();
      }

      const decryptedData = await this.securityService.decryptData(encryptedSettings);
      return JSON.parse(decryptedData);
    } catch (error) {
      console.error('Error getting privacy settings:', error);
      return this.getDefaultPrivacySettings();
    }
  }

  async setPrivacySettings(settings: PrivacySettings): Promise<void> {
    try {
      const encryptedSettings = await this.securityService.encryptData(JSON.stringify(settings));
      await AsyncStorage.setItem(this.SETTINGS_KEY, encryptedSettings);
    } catch (error) {
      throw new Error(`Failed to save privacy settings: ${error}`);
    }
  }

  private getDefaultPrivacySettings(): PrivacySettings {
    return {
      dataMinimization: true,
      anonymousMode: false,
      locationSharing: false,
      socialFeatures: true
    };
  }

  anonymizeUserId(userId: string): string {
    // Create a consistent hash of the user ID
    return this.securityService.hashData(userId).substring(0, 16);
  }

  async requestDataDeletion(): Promise<boolean> {
    try {
      const token = await this.securityService.getAuthToken();
      const response = await fetch(`${process.env.API_BASE_URL}/privacy/delete-data`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Clear local data
        await this.clearAllLocalData();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error requesting data deletion:', error);
      return false;
    }
  }

  async exportUserData(): Promise<any> {
    try {
      const token = await this.securityService.getAuthToken();
      const response = await fetch(`${process.env.API_BASE_URL}/privacy/export-data`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        return await response.json();
      }
      throw new Error('Failed to export data');
    } catch (error) {
      throw new Error(`Data export failed: ${error}`);
    }
  }

  private async clearAllLocalData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        this.CONSENT_KEY,
        this.SETTINGS_KEY,
        'user_data',
        'game_data',
        'auth_token'
      ]);
    } catch (error) {
      console.error('Error clearing local data:', error);
    }
  }

  shouldCollectAnalytics(): Promise<boolean> {
    return this.hasConsentForPurpose('analytics');
  }

  shouldShowPersonalizedAds(): Promise<boolean> {
    return this.hasConsentForPurpose('advertising');
  }

  private async hasConsentForPurpose(purpose: keyof ConsentData): Promise<boolean> {
    try {
      const consent = await this.getConsent();
      return consent ? consent[purpose] : false;
    } catch (error) {
      return false;
    }
  }
}