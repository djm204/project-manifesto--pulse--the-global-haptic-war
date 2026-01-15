import { SecurityService, SecurityError } from '../../src/services/SecurityService';
import * as Keychain from 'react-native-keychain';
import CryptoJS from 'crypto-js';

// Mock CryptoJS
jest.mock('crypto-js', () => ({
  AES: {
    encrypt: jest.fn(() => ({ toString: () => 'encrypted_data' })),
    decrypt: jest.fn(() => ({ toString: () => 'decrypted_data' })),
  },
  enc: {
    Utf8: 'utf8',
  },
  lib: {
    WordArray: {
      random: jest.fn(() => ({ toString: () => 'random_string' })),
    },
  },
}));

describe('SecurityService', () => {
  let securityService: SecurityService;

  beforeEach(() => {
    securityService = SecurityService.getInstance();
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = SecurityService.getInstance();
      const instance2 = SecurityService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('storeCredentials', () => {
    it('should store credentials securely', async () => {
      const credentials = {
        token: 'test_token',
        refreshToken: 'test_refresh_token',
        expiresAt: Date.now() + 3600000,
      };

      await securityService.storeCredentials(credentials);

      expect(Keychain.setInternetCredentials).toHaveBeenCalledWith(
        expect.any(String),
        'user',
        'encrypted_data'
      );
    });

    it('should throw SecurityError when storage fails', async () => {
      (Keychain.setInternetCredentials as jest.Mock).mockRejectedValue(new Error('Storage failed'));

      const credentials = {
        token: 'test_token',
        refreshToken: 'test_refresh_token',
        expiresAt: Date.now() + 3600000,
      };

      await expect(securityService.storeCredentials(credentials)).rejects.toThrow(SecurityError);
    });
  });

  describe('getCredentials', () => {
    it('should retrieve and decrypt credentials', async () => {
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue({
        username: 'user',
        password: 'encrypted_data',
      });

      (CryptoJS.AES.decrypt as jest.Mock).mockReturnValue({
        toString: () => JSON.stringify({
          token: 'test_token',
          refreshToken: 'test_refresh_token',
          expiresAt: Date.now() + 3600000,
        }),
      });

      const credentials = await securityService.getCredentials();

      expect(credentials).toEqual({
        token: 'test_token',
        refreshToken: 'test_refresh_token',
        expiresAt: expect.any(Number),
      });
    });

    it('should return null when no credentials found', async () => {
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue(false);

      const credentials = await securityService.getCredentials();

      expect(credentials).toBeNull();
    });

    it('should throw SecurityError when retrieval fails', async () => {
      (Keychain.getInternetCredentials as jest.Mock).mockRejectedValue(new Error('Retrieval failed'));

      await expect(securityService.getCredentials()).rejects.toThrow(SecurityError);
    });
  });

  describe('getValidatedToken', () => {
    it('should return valid token when not expired', async () => {
      const futureTime = Date.now() + 3600000;
      jest.spyOn(securityService, 'getCredentials').mockResolvedValue({
        token: 'valid_token',
        refreshToken: 'refresh_token',
        expiresAt: futureTime,
      });

      const token = await securityService.getValidatedToken();

      expect(token).toBe('valid_token');
    });

    it('should return null and clear credentials when expired', async () => {
      const pastTime = Date.now() - 3600000;
      jest.spyOn(securityService, 'getCredentials').mockResolvedValue({
        token: 'expired_token',
        refreshToken: 'refresh_token',
        expiresAt: pastTime,
      });
      jest.spyOn(securityService, 'clearCredentials').mockResolvedValue();

      const token = await securityService.getValidatedToken();

      expect(token).toBeNull();
      expect(securityService.clearCredentials).toHaveBeenCalled();
    });

    it('should return null when no credentials exist', async () => {
      jest.spyOn(securityService, 'getCredentials').mockResolvedValue(null);

      const token = await securityService.getValidatedToken();

      expect(token).toBeNull();
    });
  });

  describe('clearCredentials', () => {
    it('should clear credentials from keychain', async () => {
      await securityService.clearCredentials();

      expect(Keychain.resetInternetCredentials).toHaveBeenCalled();
    });

    it('should throw SecurityError when clearing fails', async () => {
      (Keychain.resetInternetCredentials as jest.Mock).mockRejectedValue(new Error('Clear failed'));

      await expect(securityService.clearCredentials()).rejects.toThrow(SecurityError);
    });
  });

  describe('encrypt', () => {
    it('should encrypt data', () => {
      const data = 'test_data';
      const result = securityService.encrypt(data);

      expect(CryptoJS.AES.encrypt).toHaveBeenCalledWith(data, expect.any(String));
      expect(result).toBe('encrypted_data');
    });
  });

  describe('decrypt', () => {
    it('should decrypt data', () => {
      const encryptedData = 'encrypted_data';
      const result = securityService.decrypt(encryptedData);

      expect(CryptoJS.AES.decrypt).toHaveBeenCalledWith(encryptedData, expect.any(String));
      expect(result).toBe('decrypted_data');
    });
  });

  describe('generateAnonymousUserId', () => {
    it('should generate anonymous user ID', () => {
      const userId = securityService.generateAnonymousUserId();

      expect(CryptoJS.lib.WordArray.random).toHaveBeenCalledWith(16);
      expect(userId).toBe('random_string');
    });
  });

  describe('sanitizeInput', () => {
    it('should remove dangerous characters', () => {
      const input = '<script>alert("xss")</script>';
      const result = securityService.sanitizeInput(input);

      expect(result).toBe('scriptalert("xss")/script');
    });

    it('should handle empty input', () => {
      const result = securityService.sanitizeInput('');
      expect(result).toBe('');
    });
  });

  describe('validateInput', () => {
    it('should validate safe input', () => {
      const input = 'This is a safe input';
      const result = securityService.validateInput(input);

      expect(result).toBe(true);
    });

    it('should reject input with XSS patterns', () => {
      const inputs = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        'onclick=alert("xss")',
      ];

      inputs.forEach(input => {
        const result = securityService.validateInput(input);
        expect(result).toBe(false);
      });
    });

    it('should reject input exceeding max length', () => {
      const longInput = 'a'.repeat(1001);
      const result = securityService.validateInput(longInput);

      expect(result).toBe(false);
    });

    it('should reject non-string input', () => {
      const result = securityService.validateInput(null as any);
      expect(result).toBe(false);
    });
  });
});