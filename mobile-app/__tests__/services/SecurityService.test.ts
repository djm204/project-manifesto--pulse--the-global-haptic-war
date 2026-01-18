import { SecurityService } from '../../src/services/SecurityService';
import CryptoJS from 'crypto-js';

describe('SecurityService', () => {
  let securityService: SecurityService;

  beforeEach(() => {
    securityService = SecurityService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = SecurityService.getInstance();
      const instance2 = SecurityService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('encrypt', () => {
    it('should encrypt data successfully', async () => {
      const testData = 'sensitive data';
      const encrypted = await securityService.encrypt(testData);
      
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(testData);
      expect(typeof encrypted).toBe('string');
    });

    it('should handle empty string encryption', async () => {
      const encrypted = await securityService.encrypt('');
      expect(encrypted).toBeDefined();
    });

    it('should handle special characters', async () => {
      const testData = 'test@#$%^&*()_+{}|:<>?[]\\;\'",./';
      const encrypted = await securityService.encrypt(testData);
      expect(encrypted).toBeDefined();
    });
  });

  describe('decrypt', () => {
    it('should decrypt data successfully', async () => {
      const testData = 'sensitive data';
      const encrypted = await securityService.encrypt(testData);
      const decrypted = await securityService.decrypt(encrypted);
      
      expect(decrypted).toBe(testData);
    });

    it('should handle invalid encrypted data', async () => {
      const result = await securityService.decrypt('invalid_data');
      expect(result).toBeNull();
    });

    it('should handle empty encrypted data', async () => {
      const result = await securityService.decrypt('');
      expect(result).toBeNull();
    });
  });

  describe('hash', () => {
    it('should generate consistent hash for same input', () => {
      const testData = 'test data';
      const hash1 = securityService.hash(testData);
      const hash2 = securityService.hash(testData);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA256 produces 64 char hex string
    });

    it('should generate different hashes for different inputs', () => {
      const hash1 = securityService.hash('data1');
      const hash2 = securityService.hash('data2');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', () => {
      const hash = securityService.hash('');
      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64);
    });
  });

  describe('generateNonce', () => {
    it('should generate nonce with default length', () => {
      const nonce = securityService.generateNonce();
      expect(nonce).toBeDefined();
      expect(typeof nonce).toBe('string');
      expect(nonce.length).toBeGreaterThan(0);
    });

    it('should generate nonce with custom length', () => {
      const nonce = securityService.generateNonce(32);
      expect(nonce).toBeDefined();
      expect(typeof nonce).toBe('string');
    });

    it('should generate different nonces', () => {
      const nonce1 = securityService.generateNonce();
      const nonce2 = securityService.generateNonce();
      expect(nonce1).not.toBe(nonce2);
    });
  });

  describe('sanitizeInput', () => {
    it('should remove script tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      const sanitized = securityService.sanitizeInput(input);
      expect(sanitized).toBe('Hello');
    });

    it('should handle multiple script tags', () => {
      const input = '<script>alert(1)</script>Test<script>alert(2)</script>';
      const sanitized = securityService.sanitizeInput(input);
      expect(sanitized).toBe('Test');
    });

    it('should preserve safe content', () => {
      const input = 'Hello World 123 @#$%';
      const sanitized = securityService.sanitizeInput(input);
      expect(sanitized).toBe(input);
    });

    it('should handle empty string', () => {
      const sanitized = securityService.sanitizeInput('');
      expect(sanitized).toBe('');
    });
  });

  describe('PII Protection', () => {
    it('should not log sensitive data in production', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const sensitiveData = 'user@email.com';
      
      securityService.encrypt(sensitiveData);
      
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining(sensitiveData)
      );
      
      consoleSpy.mockRestore();
    });
  });
});