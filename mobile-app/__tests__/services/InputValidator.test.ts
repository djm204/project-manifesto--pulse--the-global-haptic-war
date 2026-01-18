import { InputValidator } from '../../src/services/security/InputValidator';

describe('InputValidator', () => {
  describe('validatePulseScore', () => {
    it('should validate valid pulse scores', () => {
      expect(InputValidator.validatePulseScore(500)).toBe(500);
      expect(InputValidator.validatePulseScore(0)).toBe(0);
      expect(InputValidator.validatePulseScore(1000000)).toBe(1000000);
    });

    it('should throw error for invalid pulse scores', () => {
      expect(() => InputValidator.validatePulseScore(-1)).toThrow();
      expect(() => InputValidator.validatePulseScore(1000001)).toThrow();
      expect(() => InputValidator.validatePulseScore('invalid')).toThrow();
      expect(() => InputValidator.validatePulseScore(null)).toThrow();
    });
  });

  describe('validateUserId', () => {
    it('should validate valid user IDs', () => {
      const validId = 'user_123456789';
      expect(InputValidator.validateUserId(validId)).toBe(validId);
    });

    it('should throw error for invalid user IDs', () => {
      expect(() => InputValidator.validateUserId('')).toThrow();
      expect(() => InputValidator.validateUserId('a')).toThrow();
      expect(() => InputValidator.validateUserId('a'.repeat(101))).toThrow();
      expect(() => InputValidator.validateUserId('user@invalid')).toThrow();
    });
  });

  describe('validateUsername', () => {
    it('should validate valid usernames', () => {
      expect(InputValidator.validateUsername('player123')).toBe('player123');
      expect(InputValidator.validateUsername('user_name')).toBe('user_name');
    });

    it('should throw error for invalid usernames', () => {
      expect(() => InputValidator.validateUsername('ab')).toThrow();
      expect(() => InputValidator.validateUsername('a'.repeat(31))).toThrow();
      expect(() => InputValidator.validateUsername('user@name')).toThrow();
    });
  });

  describe('sanitizeUserInput', () => {
    it('should sanitize malicious input', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello';
      const sanitized = InputValidator.sanitizeUserInput(maliciousInput);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Hello');
    });

    it('should trim whitespace', () => {
      expect(InputValidator.sanitizeUserInput('  hello  ')).toBe('hello');
    });
  });

  describe('validateAdPlacement', () => {
    it('should validate valid ad placements', () => {
      expect(InputValidator.validateAdPlacement('rewarded_pulse')).toBe('rewarded_pulse');
      expect(InputValidator.validateAdPlacement('interstitial_game_over')).toBe('interstitial_game_over');
    });

    it('should throw error for invalid ad placements', () => {
      expect(() => InputValidator.validateAdPlacement('invalid_placement')).toThrow();
      expect(() => InputValidator.validateAdPlacement('')).toThrow();
    });
  });
});