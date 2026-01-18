import CryptoJS from 'crypto-js';
import { randomBytes } from 'crypto';

export interface EncryptedData {
  data: string;
  iv: string;
}

export class EncryptionService {
  private readonly secretKey: string;

  constructor() {
    this.secretKey = process.env.ENCRYPTION_KEY || this.generateKey();
    if (!process.env.ENCRYPTION_KEY) {
      console.warn('ENCRYPTION_KEY not set in environment variables');
    }
  }

  private generateKey(): string {
    return randomBytes(32).toString('hex');
  }

  async encrypt(plainText: string): Promise<EncryptedData> {
    try {
      const iv = randomBytes(16).toString('hex');
      const encrypted = CryptoJS.AES.encrypt(plainText, this.secretKey, {
        iv: CryptoJS.enc.Hex.parse(iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      return {
        data: encrypted.toString(),
        iv: iv
      };
    } catch (error) {
      throw new Error('Encryption failed');
    }
  }

  async decrypt(encryptedData: EncryptedData): Promise<string> {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData.data, this.secretKey, {
        iv: CryptoJS.enc.Hex.parse(encryptedData.iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      const plainText = decrypted.toString(CryptoJS.enc.Utf8);
      if (!plainText) {
        throw new Error('Decryption failed - invalid data or key');
      }

      return plainText;
    } catch (error) {
      throw new Error('Decryption failed');
    }
  }

  hashData(data: string): string {
    return CryptoJS.SHA256(data).toString();
  }

  generateSecureToken(): string {
    return randomBytes(32).toString('hex');
  }
}