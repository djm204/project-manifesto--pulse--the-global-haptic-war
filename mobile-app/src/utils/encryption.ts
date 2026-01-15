import CryptoJS from 'crypto-js';

export class EncryptionUtils {
  private static readonly ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';

  static encrypt(data: string): string {
    try {
      return CryptoJS.AES.encrypt(data, this.ENCRYPTION_KEY).toString();
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Data encryption failed');
    }
  }

  static decrypt(encryptedData: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, this.ENCRYPTION_KEY);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Data decryption failed');
    }
  }

  static hash(data: string): string {
    return CryptoJS.SHA256(data).toString();
  }

  static generateSecureToken(): string {
    return CryptoJS.lib.WordArray.random(32).toString();
  }

  static hashWithSalt(data: string, salt?: string): string {
    const useSalt = salt || CryptoJS.lib.WordArray.random(16).toString();
    return CryptoJS.PBKDF2(data, useSalt, { keySize: 256/32, iterations: 10000 }).toString();
  }
}