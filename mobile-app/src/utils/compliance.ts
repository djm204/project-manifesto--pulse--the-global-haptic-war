import { UserConsent, ComplianceRegion, DataProcessingPurpose } from '../types/user';
import { SecurityService } from '../services/SecurityService';

export class ComplianceService {
  private readonly securityService: SecurityService;

  constructor(securityService: SecurityService) {
    this.securityService = securityService;
  }

  async checkGDPRCompliance(userId: string): Promise<boolean> {
    const consent = await this.securityService.getUserConsent(userId);
    const region = await this.getUserRegion(userId);
    
    if (region === 'EU') {
      return this.validateGDPRConsent(consent);
    }
    
    return true;
  }

  async checkCCPACompliance(userId: string): Promise<boolean> {
    const consent = await this.securityService.getUserConsent(userId);
    const region = await this.getUserRegion(userId);
    
    if (region === 'CA') {
      return this.validateCCPAConsent(consent);
    }
    
    return true;
  }

  async checkCOPPACompliance(userId: string): Promise<boolean> {
    const userAge = await this.getUserAge(userId);
    
    if (userAge < 13) {
      return await this.hasParentalConsent(userId);
    }
    
    return true;
  }

  private validateGDPRConsent(consent: UserConsent): boolean {
    // GDPR requires explicit consent for each purpose
    return consent.dataProcessing && 
           consent.analytics && 
           consent.timestamp > 0 &&
           this.isConsentRecent(consent.timestamp);
  }

  private validateCCPAConsent(consent: UserConsent): boolean {
    // CCPA allows opt-out rather than opt-in
    return !consent.hasOptedOut;
  }

  private isConsentRecent(timestamp: number): boolean {
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    return (Date.now() - timestamp) < oneYear;
  }

  private async getUserRegion(userId: string): Promise<ComplianceRegion> {
    // In production, determine from IP geolocation or user settings
    return 'US';
  }

  private async getUserAge(userId: string): Promise<number> {
    // In production, get from user profile
    return 18;
  }

  private async hasParentalConsent(userId: string): Promise<boolean> {
    // In production, check parental consent records
    return false;
  }

  async handleDataDeletionRequest(userId: string): Promise<void> {
    // GDPR Article 17 - Right to erasure
    try {
      await this.securityService.clearAuthData();
      // Additional cleanup would be handled by backend API
      console.log(`Data deletion request processed for user: ${userId}`);
    } catch (error) {
      console.error('Data deletion failed:', error);
      throw new Error('Failed to process data deletion request');
    }
  }

  async generateDataExport(userId: string): Promise<any> {
    // GDPR Article 20 - Right to data portability
    const consent = await this.securityService.getUserConsent(userId);
    
    return {
      userId: this.securityService.sanitizeUserId(userId),
      consent,
      exportTimestamp: new Date().toISOString(),
      dataTypes: ['pulse_history', 'leaderboard_stats', 'preferences']
    };
  }

  canProcessDataForPurpose(consent: UserConsent, purpose: DataProcessingPurpose): boolean {
    switch (purpose) {
      case 'analytics':
        return consent.analytics;
      case 'advertising':
        return consent.advertising;
      case 'core_functionality':
        return consent.dataProcessing;
      case 'personalization':
        return consent.analytics && consent.dataProcessing;
      default:
        return false;
    }
  }
}