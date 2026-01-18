import { EncryptionService, EncryptedData } from './EncryptionService';

export interface PIIData {
  email: string;
  deviceId: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  ipAddress?: string;
}

export interface EncryptedPII {
  email: EncryptedData;
  deviceId: EncryptedData;
  location?: EncryptedData;
  ipAddress?: EncryptedData;
}

export class PIIHandler {
  private encryptionService: EncryptionService;

  constructor() {
    this.encryptionService = new EncryptionService();
  }

  async encryptPII(pii: PIIData): Promise<EncryptedPII> {
    try {
      const encrypted: EncryptedPII = {
        email: await this.encryptionService.encrypt(pii.email),
        deviceId: await this.encryptionService.encrypt(pii.deviceId)
      };

      if (pii.location) {
        encrypted.location = await this.encryptionService.encrypt(
          JSON.stringify(pii.location)
        );
      }

      if (pii.ipAddress) {
        encrypted.ipAddress = await this.encryptionService.encrypt(pii.ipAddress);
      }

      return encrypted;
    } catch (error) {
      throw new Error('PII encryption failed');
    }
  }

  async decryptPII(encryptedPII: EncryptedPII): Promise<PIIData> {
    try {
      const pii: PIIData = {
        email: await this.encryptionService.decrypt(encryptedPII.email),
        deviceId: await this.encryptionService.decrypt(encryptedPII.deviceId)
      };

      if (encryptedPII.location) {
        const locationStr = await this.encryptionService.decrypt(encryptedPII.location);
        pii.location = JSON.parse(locationStr);
      }

      if (encryptedPII.ipAddress) {
        pii.ipAddress = await this.encryptionService.decrypt(encryptedPII.ipAddress);
      }

      return pii;
    } catch (error) {
      throw new Error('PII decryption failed');
    }
  }

  anonymizeEmail(email: string): string {
    const [username, domain] = email.split('@');
    const anonymizedUsername = username.substring(0, 2) + '*'.repeat(username.length - 2);
    return `${anonymizedUsername}@${domain}`;
  }

  anonymizeDeviceId(deviceId: string): string {
    return deviceId.substring(0, 8) + '*'.repeat(deviceId.length - 8);
  }

  async deleteUserPII(userId: string): Promise<void> {
    // GDPR compliance - this would interact with your repository
    // to remove or anonymize user PII while keeping aggregated data
    console.log(`Anonymizing PII for user: ${userId}`);
  }

  isValidForProcessing(consentStatus: string): boolean {
    return consentStatus === 'granted' || consentStatus === 'legitimate_interest';
  }
}