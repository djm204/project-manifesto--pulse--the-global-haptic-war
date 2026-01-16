import CryptoJS from 'crypto-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PIIData, UserConsent, SanitizedUserData, UserData } from '../types/user';
import { validateEmail, validatePhoneNumber } from '../utils/validation';

export class SecurityService {
  private readonly encryptionKey: string;
  private readonly keyDerivationSalt: string;

  constructor() {
    this.encryptionKey = this.deriveEncryptionKey();
    this.keyDerivationSalt = 'global-pulse-salt-2024';
  }

  private deriveEncryptionKey(): string {
    const deviceId = this.getDeviceId();
    return CryptoJS.PBKDF2(deviceId, this.keyDerivationSalt, {
      keySize: 256/32,
      iterations: 10000
    }).toString();
  }

  private getDeviceId(): string {
    // In production, use actual device ID
    return process.env.DEVICE_ID || 'default-device-id';
  }

  async encryptPII(data: PIIData): Promise<string> {
    try {
      const jsonData = JSON.stringify(data);
      const iv = CryptoJS.lib.WordArray.random(16);
      
      const encrypted = CryptoJS.AES.encrypt(jsonData, this.encryptionKey, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      const result = {
        iv: iv.toString(),
        data: encrypted.toString()
      };

      return CryptoJS.enc.Base64.stringify(
        CryptoJS.enc.Utf8.parse(JSON.stringify(result))
      );
    } catch (error) {
      console.error('PII encryption failed:', error);
      throw new Error('Failed to encrypt sensitive data');
    }
  }

  async decryptPII(encryptedData: string): Promise<PIIData> {
    try {
      const decoded = JSON.parse(
        CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(encryptedData))
      );

      const decrypted = CryptoJS.AES.decrypt(decoded.data, this.encryptionKey, {
        iv: CryptoJS.enc.Hex.parse(decoded.iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
      return JSON.parse(decryptedText);
    } catch (error) {
      console.error('PII decryption failed:', error);
      throw new Error('Failed to decrypt sensitive data');
    }
  }

  async validateDataConsent(userId: string): Promise<boolean> {
    try {
      const consent = await this.getUserConsent(userId);
      return consent.analytics && consent.advertising && consent.dataProcessing;
    } catch (error) {
      console.error('Consent validation failed:', error);
      return false;
    }
  }

  async getUserConsent(userId: string): Promise<UserConsent> {
    const consentKey = `user_consent_${this.sanitizeUserId(userId)}`;
    const consentData = await AsyncStorage.getItem(consentKey);
    
    if (!consentData) {
      return {
        analytics: false,
        advertising: false,
        dataProcessing: false,
        timestamp: Date.now(),
        version: '1.0'
      };
    }

    return JSON.parse(consentData);
  }

  async updateConsent(userId: string, consent: Partial<UserConsent>): Promise<void> {
    const currentConsent = await this.getUserConsent(userId);
    const updatedConsent: UserConsent = {
      ...currentConsent,
      ...consent,
      timestamp: Date.now(),
      version: '1.0'
    };

    const consentKey = `user_consent_${this.sanitizeUserId(userId)}`;
    await AsyncStorage.setItem(consentKey, JSON.stringify(updatedConsent));
  }

  sanitizeUserData(userData: UserData): SanitizedUserData {
    const { email, phoneNumber, fullName, ...sanitized } = userData;
    
    return {
      ...sanitized,
      emailHash: email ? CryptoJS.SHA256(email.toLowerCase()).toString() : undefined,
      phoneHash: phoneNumber ? CryptoJS.SHA256(phoneNumber).toString() : undefined,
      displayName: fullName ? this.maskName(fullName) : undefined
    };
  }

  sanitizeUserId(userId: string): string {
    return userId.replace(/[^a-zA-Z0-9-_]/g, '');
  }

  private maskName(fullName: string): string {
    const parts = fullName.split(' ');
    if (parts.length === 1) {
      return parts[0].charAt(0) + '*'.repeat(Math.max(0, parts[0].length - 1));
    }
    
    return parts.map((part, index) => {
      if (index === 0) return part; // Keep first name
      return part.charAt(0) + '*'.repeat(Math.max(0, part.length - 1));
    }).join(' ');
  }

  async getAuthToken(): Promise<string | null> {
    return await AsyncStorage.getItem('auth_token');
  }

  async setAuthToken(token: string): Promise<void> {
    await AsyncStorage.setItem('auth_token', token);
  }

  async clearAuthData(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const authKeys = keys.filter(key => 
      key.startsWith('auth_') || 
      key.startsWith('user_consent_') ||
      key.startsWith('encrypted_')
    );
    
    await AsyncStorage.multiRemove(authKeys);
  }

  validatePIIData(data: PIIData): boolean {
    if (data.email && !validateEmail(data.email)) {
      return false;
    }
    
    if (data.phoneNumber && !validatePhoneNumber(data.phoneNumber)) {
      return false;
    }
    
    return true;
  }
}