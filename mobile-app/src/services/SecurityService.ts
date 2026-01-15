import CryptoJS from 'crypto-js';
import Keychain from 'react-native-keychain';
import EncryptedStorage from 'react-native-encrypted-storage';
import { validateInput } from '../utils/validation';

export class SecurityService {
  private static instance: SecurityService;
  private encryptionKey: string | null = null;

  private constructor() {}

  public static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  /**
   * Initialize security service with device-specific encryption key
   */
  public async initialize(): Promise<void> {
    try {
      const credentials = await Keychain.getInternetCredentials('global-pulse-key');
      
      if (credentials) {
        this.encryptionKey = credentials.password;
      } else {
        // Generate new encryption key
        this.encryptionKey = CryptoJS.lib.WordArray.random(256/8).toString();
        await Keychain.setInternetCredentials(
          'global-pulse-key',
          'encryption-key',
          this.encryptionKey
        );
      }
    } catch (error) {
      throw new Error(`Failed to initialize security service: ${error}`);
    }
  }

  /**
   * Encrypt sensitive data using AES-256
   */
  public encrypt(data: string): string {
    if (!this.encryptionKey) {
      throw new Error('Security service not initialized');
    }

    if (!validateInput.isString(data)) {
      throw new Error('Invalid data type for encryption');
    }

    try {
      const encrypted = CryptoJS.AES.encrypt(data, this.encryptionKey).toString();
      return encrypted;
    } catch (error) {
      throw new Error(`Encryption failed: ${error}`);
    }
  }

  /**
   * Decrypt sensitive data
   */
  public decrypt(encryptedData: string): string {
    if (!this.encryptionKey) {
      throw new Error('Security service not initialized');
    }

    if (!validateInput.isString(encryptedData)) {
      throw new Error('Invalid encrypted data');
    }

    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      throw new Error(`Decryption failed: ${error}`);
    }
  }

  /**
   * Store sensitive data securely
   */
  public async storeSecure(key: string, value: string): Promise<void> {
    if (!validateInput.isString(key) || !validateInput.isString(value)) {
      throw new Error('Invalid key or value for secure storage');
    }

    try {
      const encryptedValue = this.encrypt(value);
      await EncryptedStorage.setItem(key, encryptedValue);
    } catch (error) {
      throw new Error(`Failed to store secure data: ${error}`);
    }
  }

  /**
   * Retrieve sensitive data securely
   */
  public async getSecure(key: string): Promise<string | null> {
    if (!validateInput.isString(key)) {
      throw new Error('Invalid key for secure retrieval');
    }

    try {
      const encryptedValue = await EncryptedStorage.getItem(key);
      if (!encryptedValue) {
        return null;
      }
      return this.decrypt(encryptedValue);
    } catch (error) {
      throw new Error(`Failed to retrieve secure data: ${error}`);
    }
  }

  /**
   * Remove sensitive data securely
   */
  public async removeSecure(key: string): Promise<void> {
    if (!validateInput.isString(key)) {
      throw new Error('Invalid key for secure removal');
    }

    try {
      await EncryptedStorage.removeItem(key);
    } catch (error) {
      throw new Error(`Failed to remove secure data: ${error}`);
    }
  }

  /**
   * Hash data using SHA-256
   */
  public hash(data: string): string {
    if (!validateInput.isString(data)) {
      throw new Error('Invalid data for hashing');
    }

    return CryptoJS.SHA256(data).toString();
  }

  /**
   * Generate secure random string
   */
  public generateSecureRandom(length: number = 32): string {
    if (!validateInput.isPositiveInteger(length)) {
      throw new Error('Invalid length for random generation');
    }

    return CryptoJS.lib.WordArray.random(length).toString();
  }

  /**
   * Sanitize input to prevent injection attacks
   */
  public sanitizeInput(input: string): string {
    if (!validateInput.isString(input)) {
      return '';
    }

    return input
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/['"]/g, '') // Remove quotes
      .replace(/[;&|`$]/g, '') // Remove command injection chars
      .trim();
  }

  /**
   * Clear all security data (for logout/reset)
   */
  public async clearAll(): Promise<void> {
    try {
      await Keychain.resetInternetCredentials('global-pulse-key');
      await EncryptedStorage.clear();
      this.encryptionKey = null;
    } catch (error) {
      throw new Error(`Failed to clear security data: ${error}`);
    }
  }
}