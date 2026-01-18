import { 
  validateEmail, 
  validateUsername, 
  validateScore, 
  sanitizeInput,
  validatePIIData 
} from '../../src/utils/validation';

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.email+tag@domain.co.uk')).toBe(true);
      expect(validateEmail('user123@test-domain.org')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
      expect(validateEmail('user@domain')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });

    it('should handle null and undefined inputs', () => {
      expect(validateEmail(null as any)).toBe(false);
      expect(validateEmail(undefined as any)).toBe(false);
    });
  });

  describe('validateUsername', () => {
    it('should validate correct usernames', () => {
      expect(validateUsername('user123')).toBe(true);
      expect(validateUsername('test_user')).toBe(true);
      expect(validateUsername('User-Name')).toBe(true);
      expect(validateUsername('a')).toBe(true); // minimum length
    });

    it('should reject invalid usernames', () => {
      expect(validateUsername('')).toBe(false);
      expect(validateUsername('ab')).toBe(false); // too short
      expect(validateUsername('a'.repeat(31))).toBe(false); // too long
      expect(validateUsername('user@name')).toBe(false); // invalid characters
      expect(validateUsername('user name')).toBe(false); // spaces
    });
  });

  describe('validateScore', () => {
    it('should validate valid scores', () => {
      expect(validateScore(0)).toBe(true);
      expect(validateScore(100)).toBe(true);
      expect(validateScore(999999)).toBe(true);
    });

    it('should reject invalid scores', () => {
      expect(validateScore(-1)).toBe(false);
      expect(validateScore(1000000)).toBe(false); // exceeds max
      expect(validateScore(NaN)).toBe(false);
      expect(validateScore(Infinity)).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('should remove dangerous HTML tags', () => {
      expect(sanitizeInput('<script>alert("xss")</script>hello')).toBe('hello');
      expect(sanitizeInput('<img src="x" onerror="alert(1)">')).toBe('');
      expect(sanitizeInput('normal text')).toBe('normal text');
    });

    it('should handle SQL injection attempts', () => {
      expect(sanitizeInput("'; DROP TABLE users; --")).toBe("'; DROP TABLE users; --");
      expect(sanitizeInput('1 OR 1=1')).toBe('1 OR 1=1');
    });

    it('should trim whitespace', () => {
      expect(sanitizeInput('  hello world  ')).toBe('hello world');
    });
  });

  describe('validatePIIData', () => {
    it('should validate proper PII data structure', () => {
      const validPII = {
        email: 'user@example.com',
        username: 'testuser',
        deviceId: 'device123',
      };
      expect(validatePIIData(validPII)).toBe(true);
    });

    it('should reject PII data with invalid fields', () => {
      const invalidPII = {
        email: 'invalid-email',
        username: '',
        deviceId: 'device123',
      };
      expect(validatePIIData(invalidPII)).toBe(false);
    });

    it('should reject PII data with missing required fields', () => {
      const incompletePII = {
        email: 'user@example.com',
      };
      expect(validatePIIData(incompletePII)).toBe(false);
    });
  });
});