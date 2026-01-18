import { EncryptionService } from './EncryptionService';
import { InputValidator } from './InputValidator';

interface PIIData {
  userId: string;
  email?: string;
  deviceId: string;
  ipAddress?: string;
}

export class PIIHandler {
  private static readonly PII_FIELDS = ['email', 'ipAddress', 'deviceFingerprint'];

  static async processPIIData(data: PIIData): Promise<PIIData> {
    const processedData = { ...data };
    
    // Validate required fields
    processedData.userId = InputValidator.validateUserId(data.userId);
    
    // Hash sensitive PII
    if (data.email) {
      processedData.email = EncryptionService.hashPII(data.email);
    }
    
    if (data.ipAddress) {
      processedData.ipAddress = EncryptionService.hashPII(data.ipAddress);
    }

    return processedData;
  }

  static async encryptUserPreferences(preferences: Record<string, any>): Promise<string> {
    try {
      const sanitizedPrefs = this.sanitizePreferences(preferences);
      return await EncryptionService.encryptSensitiveData(JSON.stringify(sanitizedPrefs));
    } catch (error) {
      throw new Error(`Failed to encrypt preferences: ${error}`);
    }
  }

  static async decryptUserPreferences(encryptedPrefs: string): Promise<Record<string, any>> {
    try {
      const decrypted = await EncryptionService.decryptSensitiveData(encryptedPrefs);
      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error(`Failed to decrypt preferences: ${error}`);
    }
  }

  private static sanitizePreferences(preferences: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(preferences)) {
      if (typeof value === 'string') {
        sanitized[key] = InputValidator.sanitizeUserInput(value);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  static isGDPRCompliant(): boolean {
    // Check if user has given consent for data processing
    return true; // Implementation depends on consent management
  }
}