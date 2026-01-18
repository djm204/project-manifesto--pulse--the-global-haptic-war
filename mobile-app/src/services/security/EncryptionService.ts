import CryptoJS from 'crypto-js';
import { Platform } from 'react-native';
import * as Keychain from 'react-native-keychain';

export class EncryptionService {
  private static readonly ALGORITHM = 'AES';
  private static readonly KEY_SIZE = 256;
  
  static async getEncryptionKey(): Promise<string> {
    try {
      const credentials = await Keychain.getInternetCredentials('global-pulse-encryption');
      if (credentials) {
        return credentials.password;
      }
      
      // Generate new key if none exists
      const newKey = CryptoJS.lib.WordArray.random(32).toString();
      await Keychain.setInternetCredentials('global-pulse-encryption', 'encryption-key', newKey);
      return newKey;
    } catch (error) {
      throw new Error(`Failed to get encryption key: ${error}`);
    }
  }

  static async encryptSensitiveData(data: string): Promise<string> {
    try {
      const key = await this.getEncryptionKey();
      const encrypted = CryptoJS.AES.encrypt(data, key).toString();
      return encrypted;
    } catch (error) {
      throw new Error(`Encryption failed: ${error}`);
    }
  }

  static async decryptSensitiveData(encryptedData: string): Promise<string> {
    try {
      const key = await this.getEncryptionKey();
      const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      throw new Error(`Decryption failed: ${error}`);
    }
  }

  static hashPII(data: string): string {
    const salt = process.env.EXPO_PUBLIC_PII_SALT || 'default-salt';
    return CryptoJS.PBKDF2(data, salt, {
      keySize: 256/32,
      iterations: 10000
    }).toString();
  }
}