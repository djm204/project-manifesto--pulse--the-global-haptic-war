import { SecurityService } from '../../src/services/SecurityService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native-device-info');

describe('SecurityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateSecureToken', () => {
    it('should generate a secure token', () => {
      const token = SecurityService.generateSecureToken();
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(10);
    });

    it('should generate unique tokens', () => {
      const token1 = SecurityService.generateSecureToken();
      const token2 = SecurityService.generateSecureToken();
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('encryptSensitiveData', () => {
    it('should encrypt data successfully', () => {
      const testData = 'sensitive-test-data';
      
      const encrypted = SecurityService.encryptSensitiveData(testData);
      
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(testData);
      expect(typeof encrypted).toBe('string');
    });

    it('should produce different output for same input (due to salt)', () => {
      const testData = 'test-data';
      
      const encrypted1 = SecurityService.encryptSensitiveData(testData);
      const encrypted2 = SecurityService.encryptSensitiveData(testData);
      
      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe('decryptSensitiveData', () => {
    it('should decrypt data successfully', () => {
      const testData = 'sensitive-test-data';
      const encrypted = SecurityService.encryptSensitiveData(testData);
      
      const decrypted = SecurityService.decryptSensitiveData(encrypted);
      
      expect(decrypted).toBe(testData);
    });

    it('should throw error for invalid encrypted data', () => {
      expect(() => {
        SecurityService.decryptSensitiveData('invalid-encrypted-data');
      }).toThrow();
    });
  });

  describe('hashIdentifier', () => {
    it('should hash identifier consistently', () => {
      const identifier = 'test-identifier';
      
      const hash1 = SecurityService.hashIdentifier(identifier);
      const hash2 = SecurityService.hashIdentifier(identifier);
      
      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(identifier);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = SecurityService.hashIdentifier('input1');
      const hash2 = SecurityService.hashIdentifier('input2');
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('getDeviceId', () => {
    it('should return device ID from DeviceInfo', async () => {
      const mockDeviceId = 'test-device-id-123';
      (DeviceInfo.getUniqueId as jest.Mock).mockResolvedValue(mockDeviceId);
      
      const deviceId = await SecurityService.getDeviceId();
      
      expect(deviceId).toBe(mockDeviceId);
      expect(DeviceInfo.getUniqueId).toHaveBeenCalled();
    });

    it('should handle DeviceInfo errors gracefully', async () => {
      (DeviceInfo.getUniqueId as jest.Mock).mockRejectedValue(new Error('Device ID error'));
      
      await expect(SecurityService.getDeviceId()).rejects.toThrow('Device ID error');
    });
  });

  describe('validateAdInteraction', () => {
    const validInteraction = {
      timestamp: Date.now(),
      userAgent: 'test-user-agent',
      pattern: 'tap',
      duration: 1000,
      deviceId: 'test-device'
    };

    it('should validate correct ad interaction', () => {
      const result = SecurityService.validateAdInteraction(validInteraction);
      
      expect(result).toBe(true);
    });

    it('should reject interaction with future timestamp', () => {
      const futureInteraction = {
        ...validInteraction,
        timestamp: Date.now() + 10000
      };
      
      const result = SecurityService.validateAdInteraction(futureInteraction);
      
      expect(result).toBe(false);
    });

    it('should reject interaction with old timestamp', () => {
      const oldInteraction = {
        ...validInteraction,
        timestamp: Date.now() - 70000 // 70 seconds ago
      };
      
      const result = SecurityService.validateAdInteraction(oldInteraction);
      
      expect(result).toBe(false);
    });

    it('should reject interaction with invalid pattern', () => {
      const invalidInteraction = {
        ...validInteraction,
        pattern: 'invalid-pattern'
      };
      
      const result = SecurityService.validateAdInteraction(invalidInteraction);
      
      expect(result).toBe(false);
    });

    it('should reject interaction with suspicious duration', () => {
      const suspiciousInteraction = {
        ...validInteraction,
        duration: 50 // Too short
      };
      
      const result = SecurityService.validateAdInteraction(suspiciousInteraction);
      
      expect(result).toBe(false);
    });
  });

  describe('getAuthToken', () => {
    it('should retrieve auth token from storage', async () => {
      const mockToken = 'test-auth-token';
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(mockToken);
      
      const token = await SecurityService.getAuthToken();
      
      expect(token).toBe(mockToken);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('auth_token');
    });

    it('should return null when no token exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      
      const token = await SecurityService.getAuthToken();
      
      expect(token).toBeNull();
    });
  });

  describe('setAuthToken', () => {
    it('should store auth token securely', async () => {
      const testToken = 'test-token-123';
      
      await SecurityService.setAuthToken(testToken);
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('auth_token', testToken);
    });
  });

  describe('clearAuthToken', () => {
    it('should remove auth token from storage', async () => {
      await SecurityService.clearAuthToken();
      
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });
  });
});