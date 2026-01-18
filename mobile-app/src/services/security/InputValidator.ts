import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

export class InputValidator {
  private static readonly PULSE_SCORE_SCHEMA = z.number().min(0).max(1000000);
  private static readonly USER_ID_SCHEMA = z.string().uuid();
  private static readonly USERNAME_SCHEMA = z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/);

  static validatePulseScore(score: unknown): number {
    try {
      return this.PULSE_SCORE_SCHEMA.parse(score);
    } catch (error) {
      throw new Error(`Invalid pulse score: ${error}`);
    }
  }

  static validateUserId(userId: unknown): string {
    try {
      return this.USER_ID_SCHEMA.parse(userId);
    } catch (error) {
      throw new Error(`Invalid user ID format: ${error}`);
    }
  }

  static validateUsername(username: unknown): string {
    try {
      return this.USERNAME_SCHEMA.parse(username);
    } catch (error) {
      throw new Error(`Invalid username: ${error}`);
    }
  }

  static sanitizeUserInput(input: string): string {
    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }
    return DOMPurify.sanitize(input.trim());
  }

  static validateAdPlacement(placement: unknown): string {
    const validPlacements = ['rewarded', 'interstitial', 'banner'];
    if (typeof placement !== 'string' || !validPlacements.includes(placement)) {
      throw new Error('Invalid ad placement');
    }
    return placement;
  }
}