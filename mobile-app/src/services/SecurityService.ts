import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { AsyncStorage } from '@react-native-async-storage/async-storage';
import { InputValidator } from '../utils/validation';
import { EncryptionService } from '../utils/encryption';
import { AuthenticationError, ValidationError } from '../types/errors';

interface UserPayload {
  userId: string;
  username: string;
  permissions: string[];
  exp: number;
}

interface PulseData {
  userId: string;
  score: number;
  timestamp: number;
  deviceId: string;
}

export class SecurityService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
  private static readonly TOKEN_KEY = 'pulse_auth_token';
  private static readonly SALT_ROUNDS = 12;

  static async validateJWT(token: string): Promise<UserPayload> {
    if (!token || typeof token !== 'string') {
      throw new AuthenticationError('Token is required');
    }

    try {
      const payload = jwt.verify(token, this.JWT_SECRET) as UserPayload;
      
      // Check token expiration
      if (payload.exp < Date.now() / 1000) {
        throw new AuthenticationError('Token expired');
      }

      // Validate user permissions
      await this.validateUserPermissions(payload.userId);
      
      return payload;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid token signature');
      }
      throw error;
    }
  }

  static async validateUserPermissions(userId: string): Promise<void> {
    // Validate userId format
    if (!InputValidator.isValidUUID(userId)) {
      throw new ValidationError('Invalid user ID format');
    }

    // Check if user is active and has required permissions
    // This would typically involve a database call
    const userStatus = await this.getUserStatus(userId);
    if (!userStatus.isActive) {
      throw new AuthenticationError('User account is inactive');
    }
  }

  static validatePulseData(data: any): PulseData {
    if (!data || typeof data !== 'object') {
      throw new ValidationError('Invalid pulse data format');
    }

    const { userId, score, timestamp, deviceId } = data;

    // Validate userId
    if (!InputValidator.isValidUUID(userId)) {
      throw new ValidationError('Invalid user ID');
    }

    // Validate score
    const validatedScore = InputValidator.validatePulseScore(score);
    if (!validatedScore.isValid) {
      throw new ValidationError('Invalid pulse score');
    }

    // Validate timestamp (must be within last 5 minutes)
    const now = Date.now();
    if (!timestamp || timestamp > now || (now - timestamp) > 300000) {
      throw new ValidationError('Invalid timestamp');
    }

    // Validate device ID
    if (!InputValidator.isValidDeviceId(deviceId)) {
      throw new ValidationError('Invalid device ID');
    }

    return {
      userId: InputValidator.sanitizeString(userId),
      score: validatedScore.sanitized,
      timestamp,
      deviceId: InputValidator.sanitizeString(deviceId)
    };
  }

  static async hashPassword(password: string): Promise<string> {
    if (!password || password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }

    const salt = await bcrypt.genSalt(this.SALT_ROUNDS);
    return bcrypt.hash(password, salt);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      return false;
    }
  }

  static async storeToken(token: string): Promise<void> {
    try {
      const encryptedToken = await EncryptionService.encryptPII(token);
      await AsyncStorage.setItem(this.TOKEN_KEY, JSON.stringify(encryptedToken));
    } catch (error) {
      throw new Error('Failed to store authentication token');
    }
  }

  static async getStoredToken(): Promise<string> {
    try {
      const encryptedData = await AsyncStorage.getItem(this.TOKEN_KEY);
      if (!encryptedData) {
        throw new AuthenticationError('No stored token found');
      }

      const parsedData = JSON.parse(encryptedData);
      return await EncryptionService.decryptPII(parsedData);
    } catch (error) {
      throw new AuthenticationError('Failed to retrieve stored token');
    }
  }

  static async clearStoredToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.TOKEN_KEY);
    } catch (error) {
      console.error('Failed to clear stored token:', error);
    }
  }

  static generateCSRFToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static validateCSRFToken(token: string, storedToken: string): boolean {
    if (!token || !storedToken) {
      return false;
    }
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(storedToken));
  }

  private static async getUserStatus(userId: string): Promise<{ isActive: boolean }> {
    // Mock implementation - would be replaced with actual API call
    return { isActive: true };
  }

  static async auditSecurityEvent(event: string, userId: string, metadata: any = {}): Promise<void> {
    const auditLog = {
      event,
      userId,
      timestamp: new Date().toISOString(),
      metadata,
      ip: metadata.ip || 'unknown',
      userAgent: metadata.userAgent || 'unknown'
    };

    // In production, this would send to a security monitoring service
    console.log('Security audit:', auditLog);
  }
}