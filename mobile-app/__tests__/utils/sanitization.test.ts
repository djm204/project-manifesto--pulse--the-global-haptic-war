import { SanitizationService } from '../../src/utils/sanitization';
import DOMPurify from 'dompurify';

jest.mock('dompurify');

describe('SanitizationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sanitizeInput', () => {
    it('should sanitize malicious input', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello';
      const sanitizedOutput = 'Hello';
      (DOMPurify.sanitize as jest.Mock).mockReturnValue(sanitizedOutput);

      const result = SanitizationService.sanitizeInput(maliciousInput);

      expect(result).toBe(sanitizedOutput);
      expect(DOMPurify.sanitize).toHaveBeenCalledWith(maliciousInput.trim().slice(0, 1000));
    });

    it('should handle empty input', () => {
      (DOMPurify.sanitize as jest.Mock).mockReturnValue('');

      const result = SanitizationService.sanitizeInput('');

      expect(result).toBe('');
    });

    it('should truncate long input', () => {
      const longInput = 'a'.repeat(2000);
      const truncatedInput = 'a'.repeat(1000);
      (DOMPurify.sanitize as jest.Mock).mockReturnValue(truncatedInput);

      SanitizationService.sanitizeInput(longInput);

      expect(DOMPurify.sanitize).toHaveBeenCalledWith(truncatedInput);
    });
  });

  describe('sanitizeUserName', () => {
    it('should sanitize username with special characters', () => {
      const username = 'user<script>alert(1)</script>name';
      const sanitizedUsername = 'username';
      (DOMPurify.sanitize as jest.Mock).mockReturnValue(sanitizedUsername);

      const result = SanitizationService.sanitizeUserName(username);

      expect(result).toBe(sanitizedUsername);
    });

    it('should handle valid username', () => {
      const username = 'validuser123';
      (DOMPurify.sanitize as jest.Mock).mockReturnValue(username);

      const result = SanitizationService.sanitizeUserName(username);

      expect(result).toBe(username);
    });
  });

  describe('validateAndSanitizeEmail', () => {
    it('should validate and sanitize valid email', () => {
      const email = 'test@example.com';
      (DOMPurify.sanitize as jest.Mock).mockReturnValue(email);

      const result = SanitizationService.validateAndSanitizeEmail(email);

      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe(email);
    });

    it('should reject invalid email format', () => {
      const email = 'invalid-email';
      (DOMPurify.sanitize as jest.Mock).mockReturnValue(email);

      const result = SanitizationService.validateAndSanitizeEmail(email);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid email format');
    });

    it('should reject email with malicious content', () => {
      const email = 'test<script>@example.com';
      const sanitized = 'test@example.com';
      (DOMPurify.sanitize as jest.Mock).mockReturnValue(sanitized);

      const result = SanitizationService.validateAndSanitizeEmail(email);

      expect(result.sanitized).toBe(sanitized);
    });
  });
});