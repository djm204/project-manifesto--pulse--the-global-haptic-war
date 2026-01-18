import Joi from 'joi';
import { PulseValidationSchema, validatePulseData, validatePulseSession } from '../../../src/utils/validation';
import { PulseData, PulseSession } from '../../../src/types/pulse';

describe('Pulse Validation Schema Tests', () => {
  describe('PulseValidationSchema', () => {
    it('should validate valid pulse data', () => {
      const validData: PulseData = {
        userId: 'user123',
        timestamp: Date.now(),
        accuracy: 95.5,
        deviceId: '550e8400-e29b-41d4-a716-446655440000',
        sessionId: 'session123'
      };

      const { error } = PulseValidationSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject invalid userId format', () => {
      const invalidData = {
        userId: 'user@123!',
        timestamp: Date.now(),
        accuracy: 95.5,
        deviceId: '550e8400-e29b-41d4-a716-446655440000',
        sessionId: 'session123'
      };

      const { error } = PulseValidationSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('XSS patterns detected');
    });

    it('should reject SQL injection attempts in userId', () => {
      const maliciousData = {
        userId: "'; DROP TABLE users; --",
        timestamp: Date.now(),
        accuracy: 95.5,
        deviceId: '550e8400-e29b-41d4-a716-446655440000',
        sessionId: 'session123'
      };

      const { error } = PulseValidationSchema.validate(maliciousData);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('SQL injection patterns detected');
    });

    it('should reject invalid deviceId format', () => {
      const invalidData = {
        userId: 'user123',
        timestamp: Date.now(),
        accuracy: 95.5,
        deviceId: 'invalid-device-id',
        sessionId: 'session123'
      };

      const { error } = PulseValidationSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('deviceId');
    });

    it('should reject accuracy outside valid range', () => {
      const invalidData = {
        userId: 'user123',
        timestamp: Date.now(),
        accuracy: 150.5,
        deviceId: '550e8400-e29b-41d4-a716-446655440000',
        sessionId: 'session123'
      };

      const { error } = PulseValidationSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('accuracy');
    });

    it('should reject future timestamps', () => {
      const futureData = {
        userId: 'user123',
        timestamp: Date.now() + 86400000, // 1 day in future
        accuracy: 95.5,
        deviceId: '550e8400-e29b-41d4-a716-446655440000',
        sessionId: 'session123'
      };

      const { error } = PulseValidationSchema.validate(futureData);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('timestamp');
    });
  });

  describe('validatePulseData function', () => {
    it('should return valid result for correct data', () => {
      const validData: PulseData = {
        userId: 'user123',
        timestamp: Date.now(),
        accuracy: 95.5,
        deviceId: '550e8400-e29b-41d4-a716-446655440000',
        sessionId: 'session123'
      };

      const result = validatePulseData(validData);
      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should return invalid result with errors for malformed data', () => {
      const invalidData = {
        userId: '',
        timestamp: 'invalid',
        accuracy: -50,
        deviceId: 'bad-id',
        sessionId: ''
      };

      const result = validatePulseData(invalidData as any);
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  describe('validatePulseSession function', () => {
    it('should validate complete pulse session', () => {
      const validSession: PulseSession = {
        sessionId: 'session123',
        userId: 'user123',
        startTime: Date.now() - 1000,
        endTime: Date.now(),
        pulses: [
          {
            userId: 'user123',
            timestamp: Date.now() - 500,
            accuracy: 95.5,
            deviceId: '550e8400-e29b-41d4-a716-446655440000',
            sessionId: 'session123'
          }
        ],
        averageAccuracy: 95.5,
        totalPulses: 1
      };

      const result = validatePulseSession(validSession);
      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(validSession);
    });

    it('should reject session with endTime before startTime', () => {
      const invalidSession: PulseSession = {
        sessionId: 'session123',
        userId: 'user123',
        startTime: Date.now(),
        endTime: Date.now() - 1000,
        pulses: [],
        averageAccuracy: 0,
        totalPulses: 0
      };

      const result = validatePulseSession(invalidSession);
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });
});