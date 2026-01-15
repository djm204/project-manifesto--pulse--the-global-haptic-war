import SecurityService from '../../src/services/SecurityService';
import Keychain from 'react-native-keychain';
import EncryptedStorage from 'react-native-encrypted-storage';

jest.mock('react-native-keychain');
jest.mock('react-native-encrypted-storage');
jest.mock('crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mocked-hash-value'),
  })),
  createCipher: jest.fn(() => ({
    update: jest.fn(() => 'encrypted-part'),
    final: jest.fn(() => '-final'),
  })),
  createDecipher: jest.fn(() => ({
    update: jest.fn(() => 'decrypted-part'),
    final: jest.fn(() => '-final'),
  })),
}));

describe('SecurityService', () => {
  let securityService: SecurityService;
  const mockKeychain = Keychain as jest.Mocked<typeof Keychain>;
  const mockEncryptedStorage = EncryptedStorage as jest.Mocked<typeof EncryptedStorage>;

  beforeEach(async () => {
    jest.clearAllMocks();
    securityService = SecurityService.getInstance();
  });

  describe('initialization', () => {
    it('should initialize with existing encryption key', async () => {
      mockKeychain.getInternetCredentials.mockResolvedValue({
        username: 'key',
        password: 'existing-key',
        service: 'pulse_encryption',
        storage: 'keychain',
      });

      await securityService.initialize();
      
      expect(mockKeychain.getInternetCredentials).toHaveBeenCalledWith('pulse_encryption');
    });

    it('should generate new encryption key if none exists', async () => {
      mockKeychain.getInternetCredentials.mockResolvedValue(false);
      mockKeychain.setInternetCredentials.mockResolvedValue({ service: 'pulse_encryption' });

      await securityService.initialize();
      
      expect(mockKeychain.setInternetCredentials).toHaveBeenCalledWith(
        'pulse_encryption',
        'key',
        expect.any(String)
      );
    });

    it('should throw error if initialization fails', async () => {
      mockKeychain.getInternetCredentials.mockRejectedValue(new Error('Keychain error'));

      await expect(securityService.initialize()).rejects.toThrow('Security initialization failed');
    });
  });

  describe('data encryption', () => {
    beforeEach(async () => {
      mockKeychain.getInternetCredentials.mockResolvedValue({
        username: 'key',
        password: 'test-key',
        service: 'pulse_encryption',
        storage: 'keychain',
      });
      await securityService.initialize();
    });

    it('should encrypt data successfully', async () => {
      const testData = 'sensitive data';
      const result = await securityService.encryptData(testData);
      
      expect(result).toBe('encrypted-part-final');
    });

    it('should decrypt data successfully', async () => {
      const encryptedData = 'encrypted-data';
      const result = await securityService.decryptData(encryptedData);
      
      expect(result).toBe('decrypted-part-final');
    });

    it('should throw error when encrypting without initialization', async () => {
      const uninitializedService = new (SecurityService as any)();
      
      await expect(uninitializedService.encryptData('data')).rejects.toThrow('Encryption key not initialized');
    });
  });

  describe('secure storage', () => {
    beforeEach(async () => {
      mockKeychain.getInternetCredentials.mockResolvedValue({
        username: 'key',
        password: 'test-key',
        service: 'pulse_encryption',
        storage: 'keychain',
      });
      await securityService.initialize();
    });

    it('should store data securely', async () => {
      const key = 'test-key';
      const value = 'test-value';
      
      await securityService.storeSecurely(key, value);
      
      expect(mockEncryptedStorage.setItem).toHaveBeenCalledWith(key, 'encrypted-part-final');
    });

    it('should retrieve data securely', async () => {
      const key = 'test-key';
      mockEncryptedStorage.getItem.mockResolvedValue('encrypted-value');
      
      const result = await securityService.retrieveSecurely(key);
      
      expect(result).toBe('decrypted-part-final');
      expect(mockEncryptedStorage.getItem).toHaveBeenCalledWith(key);
    });

    it('should return null for non-existent keys', async () => {
      mockEncryptedStorage.getItem.mockResolvedValue(null);
      
      const result = await securityService.retrieveSecurely('non-existent');
      
      expect(result).toBeNull();
    });
  });

  describe('device fingerprinting', () => {
    it('should generate consistent device fingerprint', () => {
      const fingerprint1 = securityService.generateDeviceFingerprint();
      const fingerprint2 = securityService.generateDeviceFingerprint();
      
      expect(fingerprint1).toBe(fingerprint2);
      expect(fingerprint1).toHaveLength(32);
    });
  });

  describe('input validation', () => {
    it('should validate email addresses correctly', () => {
      expect(securityService.validateInput('test@example.com', 'email')).toBe(true);
      expect(securityService.validateInput('invalid-email', 'email')).toBe(false);
      expect(securityService.validateInput('', 'email')).toBe(false);
    });

    it('should validate usernames correctly', () => {
      expect(securityService.validateInput('validuser123', 'username')).toBe(true);
      expect(securityService.validateInput('user_name', 'username')).toBe(true);
      expect(securityService.validateInput('ab', 'username')).toBe(false); // too short
      expect(securityService.validateInput('user@name', 'username')).toBe(false); // invalid char
    });

    it('should validate general input correctly', () => {
      expect(securityService.validateInput('Valid input 123', 'general')).toBe(true);
      expect(securityService.validateInput('Input-with_dots.', 'general')).toBe(true);
      expect(securityService.validateInput('', 'general')).toBe(false);
    });
  });

  describe('input sanitization', () => {
    it('should remove dangerous characters', () => {
      const maliciousInput = '<script>alert("xss")</script>';
      const sanitized = securityService.sanitizeInput(maliciousInput);
      
      expect(sanitized).toBe('scriptalert(xss)/script');
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
    });

    it('should trim whitespace', () => {
      const input = '  spaced input  ';
      const sanitized = securityService.sanitizeInput(input);
      
      expect(sanitized).toBe('spaced input');
    });

    it('should limit input length', () => {
      const longInput = 'a'.repeat(2000);
      const sanitized = securityService.sanitizeInput(longInput);
      
      expect(sanitized).toHaveLength(1000);
    });
  });
});