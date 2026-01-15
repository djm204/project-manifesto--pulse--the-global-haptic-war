import EncryptedStorage from 'react-native-encrypted-storage';
import Keychain from 'react-native-keychain';
import { createHash, createCipher, createDecipher } from 'crypto';

export class SecurityService {
  private static instance: SecurityService;
  private encryptionKey: string | null = null;

  static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  async initialize(): Promise<void> {
    await this.generateOrRetrieveEncryptionKey();
  }

  private async generateOrRetrieveEncryptionKey(): Promise<void> {
    try {
      const credentials = await Keychain.getInternetCredentials('pulse_encryption');
      if (credentials) {
        this.encryptionKey = credentials.password;
      } else {
        this.encryptionKey = this.generateSecureKey();
        await Keychain.setInternetCredentials(
          'pulse_encryption',
          'key',
          this.encryptionKey
        );
      }
    } catch (error) {
      console.error('Failed to initialize encryption key:', error);
      throw new Error('Security initialization failed');
    }
  }

  private generateSecureKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async encryptData(data: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    try {
      const cipher = createCipher('aes-256-gcm', this.encryptionKey);
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return encrypted;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  async decryptData(encryptedData: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    try {
      const decipher = createDecipher('aes-256-gcm', this.encryptionKey);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  async storeSecurely(key: string, value: string): Promise<void> {
    try {
      const encryptedValue = await this.encryptData(value);
      await EncryptedStorage.setItem(key, encryptedValue);
    } catch (error) {
      console.error('Secure storage failed:', error);
      throw new Error('Failed to store data securely');
    }
  }

  async retrieveSecurely(key: string): Promise<string | null> {
    try {
      const encryptedValue = await EncryptedStorage.getItem(key);
      if (!encryptedValue) return null;
      return await this.decryptData(encryptedValue);
    } catch (error) {
      console.error('Secure retrieval failed:', error);
      return null;
    }
  }

  generateDeviceFingerprint(): string {
    const components = [
      new Date().getTimezoneOffset().toString(),
      navigator.userAgent || 'unknown',
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset().toString()
    ];
    
    return createHash('sha256')
      .update(components.join('|'))
      .digest('hex')
      .substring(0, 32);
  }

  validateInput(input: string, type: 'email' | 'username' | 'general'): boolean {
    const patterns = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      username: /^[a-zA-Z0-9_]{3,20}$/,
      general: /^[a-zA-Z0-9\s._-]{1,100}$/
    };

    return patterns[type].test(input);
  }

  sanitizeInput(input: string): string {
    return input
      .replace(/[<>'"&]/g, '')
      .trim()
      .substring(0, 1000);
  }
}

export default SecurityService.getInstance();