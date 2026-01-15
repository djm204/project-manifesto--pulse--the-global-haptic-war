import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import CryptoJS from 'crypto-js';
import { SECURITY_CONFIG } from '../utils/constants';

export interface SecurityCredentials {
  token: string;
  refreshToken: string;
  expiresAt: number;
}

export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

export class SecurityService {
  private static instance: SecurityService;
  private encryptionKey: string;

  private constructor() {
    this.encryptionKey = SECURITY_CONFIG.ENCRYPTION_KEY;
  }

  static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  async storeCredentials(credentials: SecurityCredentials): Promise<void> {
    try {
      const encryptedCredentials = this.encrypt(JSON.stringify(credentials));
      await Keychain.setInternetCredentials(
        SECURITY_CONFIG.KEYCHAIN_SERVICE,
        'user',
        encryptedCredentials
      );
    } catch (error) {
      throw new SecurityError('Failed to store credentials securely');
    }
  }

  async getCredentials(): Promise<SecurityCredentials | null> {
    try {
      const result = await Keychain.getInternetCredentials(SECURITY_CONFIG.KEYCHAIN_SERVICE);
      if (result && result.password) {
        const decryptedData = this.decrypt(result.password);
        return JSON.parse(decryptedData);
      }
      return null;
    } catch (error) {
      throw new SecurityError('Failed to retrieve credentials');
    }
  }

  async getValidatedToken(): Promise<string | null> {
    const credentials = await this.getCredentials();
    if (!credentials) return null;

    if (Date.now() >= credentials.expiresAt) {
      await this.clearCredentials();
      return null;
    }

    return credentials.token;
  }

  async clearCredentials(): Promise<void> {
    try {
      await Keychain.resetInternetCredentials(SECURITY_CONFIG.KEYCHAIN_SERVICE);
    } catch (error) {
      throw new SecurityError('Failed to clear credentials');
    }
  }

  encrypt(data: string): string {
    return CryptoJS.AES.encrypt(data, this.encryptionKey).toString();
  }

  decrypt(encryptedData: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  generateAnonymousUserId(): string {
    return CryptoJS.lib.WordArray.random(16).toString();
  }

  sanitizeInput(input: string): string {
    return input.replace(/[<>\"'%;()&+]/g, '');
  }

  validateInput(input: string, maxLength: number = 1000): boolean {
    if (!input || typeof input !== 'string') return false;
    if (input.length > maxLength) return false;
    
    // Check for potential XSS patterns
    const xssPatterns = [/<script/i, /javascript:/i, /on\w+=/i];
    return !xssPatterns.some(pattern => pattern.test(input));
  }
}