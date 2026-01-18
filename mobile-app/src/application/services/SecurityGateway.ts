import CryptoJS from 'crypto-js';
import { PulseInputSchema } from '../../utils/schemas/pulseSchemas';
import { ExecutePulseInput } from '../../domain/usecases/ExecutePulseUseCase';

export class SecurityGateway {
  private readonly encryptionKey: string;
  private readonly rateLimitMap = new Map<string, number[]>();
  private readonly fraudDetectionMap = new Map<string, FraudMetrics>();
  
  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || '';
    if (!this.encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
  }
  
  async validatePulseInput(input: any): Promise<ExecutePulseInput> {
    const { error, value } = PulseInputSchema.validate(input);
    
    if (error) {
      throw new SecurityError(`Invalid input: ${error.details[0].message}`);
    }
    
    // Additional security checks
    if (!this.isValidDeviceFingerprint(value.deviceFingerprint)) {
      throw new SecurityError('Invalid device fingerprint');
    }
    
    if (!this.isValidLocation(value.location)) {
      throw new SecurityError('Invalid location data');
    }
    
    return value;
  }
  
  async validateUser(userId: string): Promise<void> {
    if (!userId || typeof userId !== 'string' || userId.length < 10) {
      throw new SecurityError('Invalid user ID');
    }
    
    // Check if user is banned or suspended
    // This would typically check against a database
    if (await this.isUserBanned(userId)) {
      throw new SecurityError('User access denied');
    }
  }
  
  async checkRateLimit(userId: string): Promise<void> {
    const now = Date.now();
    const userRequests = this.rateLimitMap.get(userId) || [];
    
    // Remove requests older than 1 minute
    const recentRequests = userRequests.filter(timestamp => now - timestamp < 60000);
    
    if (recentRequests.length >= 10) { // Max 10 pulses per minute
      throw new SecurityError('Rate limit exceeded');
    }
    
    recentRequests.push(now);
    this.rateLimitMap.set(userId, recentRequests);
  }
  
  async checkAdFraud(userId: string): Promise<void> {
    const metrics = this.fraudDetectionMap.get(userId) || {
      adRequestsToday: 0,
      lastAdRequest: 0,
      suspiciousActivity: 0
    };
    
    const now = Date.now();
    const oneDayAgo = now - 86400000;
    
    // Reset daily counter
    if (metrics.lastAdRequest < oneDayAgo) {
      metrics.adRequestsToday = 0;
      metrics.suspiciousActivity = 0;
    }
    
    // Check for suspicious patterns
    if (metrics.adRequestsToday > 50) { // Max 50 ad requests per day
      throw new SecurityError('Daily ad limit exceeded');
    }
    
    if (now - metrics.lastAdRequest < 30000) { // Min 30 seconds between ads
      metrics.suspiciousActivity++;
      if (metrics.suspiciousActivity > 3) {
        throw new SecurityError('Suspicious ad request pattern detected');
      }
    }
    
    metrics.adRequestsToday++;
    metrics.lastAdRequest = now;
    this.fraudDetectionMap.set(userId, metrics);
  }
  
  encryptPII(data: string): string {
    return CryptoJS.AES.encrypt(data, this.encryptionKey).toString();
  }
  
  decryptPII(encryptedData: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
  
  hashSensitiveData(data: string): string {
    return CryptoJS.SHA256(data + this.encryptionKey).toString();
  }
  
  private isValidDeviceFingerprint(fingerprint: string): boolean {
    // Validate device fingerprint format and authenticity
    return fingerprint && 
           fingerprint.length >= 32 && 
           /^[a-f0-9]{32,}$/i.test(fingerprint);
  }
  
  private isValidLocation(location: any): boolean {
    return location &&
           typeof location.latitude === 'number' &&
           typeof location.longitude === 'number' &&
           location.latitude >= -90 && location.latitude <= 90 &&
           location.longitude >= -180 && location.longitude <= 180 &&
           typeof location.accuracy === 'number' &&
           location.accuracy > 0;
  }
  
  private async isUserBanned(userId: string): Promise<boolean> {
    // This would check against a database or cache
    // For now, return false (no bans)
    return false;
  }
}

interface FraudMetrics {
  adRequestsToday: number;
  lastAdRequest: number;
  suspiciousActivity: number;
}

export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}