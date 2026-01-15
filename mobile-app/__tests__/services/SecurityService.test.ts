import { SecurityService } from '../../src/services/SecurityService';
import Keychain from 'react-native-keychain';
import { MMKV } from 'react-native-mmkv';
import DeviceInfo from 'react-native-device-info';

jest.mock('react-native-keychain');
jest.mock('react-native-mmkv');
jest.mock('react-native-device-info');

const mockMMKV = {
  set: jest.fn(),
  getString: jest.fn(),
  delete: jest.fn(),
};

(MMKV as jest.Mock).mockImplementation(() => mockMMKV);

describe('SecurityService', () => {
  let securityService: SecurityService;

  beforeEach(() => {
    jest.clearAllMocks();
    securityService = new SecurityService();
  });

  describe('initialize', () => {
    it('should initialize with existing encryption key', async () => {
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue({
        password: 'existing-key',
      });

      await expect(securityService.initialize()).resolves.not.toThrow();
    });

    it('should generate new encryption key when none exists', async () => {
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue(false);
      (Keychain.setInternetCredentials as jest.Mock).mockResolvedValue(true);

      await expect(securityService.initialize()).resolves.not.toThrow();
      expect(Keychain.setInternetCredentials).toHaveBeenCalledWith(
        'pulse-app',
        'encryption',
        expect.any(String)
      );
    });

    it('should throw error when keychain fails', async () => {
      (Keychain.getInternetCredentials as jest.Mock).mockRejectedValue(
        new Error('Keychain error')
      );

      await expect(securityService.initialize()).rejects.toThrow(
        'Encryption initialization failed'
      );
    });
  });

  describe('encryptData and decryptData', () => {
    beforeEach(async () => {
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue({
        password: 'test-encryption-key',
      });
      await securityService.initialize();
    });

    it('should encrypt and decrypt data successfully', async () => {
      const testData = { message: 'Hello World', number: 42 };

      const encrypted = await securityService.encryptData(testData);
      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toEqual(JSON.stringify(testData));

      const decrypted = await securityService.decryptData(encrypted);
      expect(decrypted).toEqual(testData);
    });

    it('should throw error when encrypting without initialization', async () => {
      const uninitializedService = new SecurityService();
      
      await expect(uninitializedService.encryptData({})).rejects.toThrow(
        'Encryption not initialized'
      );
    });

    it('should throw error when decrypting invalid data', async () => {
      await expect(securityService.decryptData('invalid-data')).rejects.toThrow(
        'Decryption failed'
      );
    });
  });

  describe('storeSecureData and getSecureData', () => {
    beforeEach(async () => {
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue({
        password: 'test-encryption-key',
      });
      await securityService.initialize();
    });

    it('should store and retrieve secure data', async () => {
      const testData = { sensitive: 'information' };
      const key = 'test-key';

      await securityService.storeSecureData(key, testData);
      expect(mockMMKV.set).toHaveBeenCalledWith(key, expect.any(String));

      mockMMKV.getString.mockReturnValue('encrypted-data');
      jest.spyOn(securityService, 'decryptData').mockResolvedValue(testData);

      const retrieved = await securityService.getSecureData(key);
      expect(retrieved).toEqual(testData);
    });

    it('should return null for non-existent key', async () => {
      mockMMKV.getString.mockReturnValue(undefined);

      const result = await securityService.getSecureData('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getDeviceId', () => {
    beforeEach(async () => {
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue({
        password: 'test-encryption-key',
      });
      await securityService.initialize();
    });

    it('should generate and store device ID when none exists', async () => {
      jest.spyOn(securityService, 'getSecureData').mockResolvedValue(null);
      jest.spyOn(securityService, 'storeSecureData').mockResolvedValue();
      (DeviceInfo.getUniqueId as jest.Mock).mockResolvedValue('device-123');

      const deviceId = await securityService.getDeviceId();

      expect(deviceId).toBe('device-123');
      expect(securityService.storeSecureData).toHaveBeenCalledWith('device_id', 'device-123');
    });

    it('should return existing device ID', async () => {
      jest.spyOn(securityService, 'getSecureData').mockResolvedValue('existing-device-id');

      const deviceId = await securityService.getDeviceId();
      expect(deviceId).toBe('existing-device-id');
    });
  });

  describe('auth token management', () => {
    beforeEach(async () => {
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue({
        password: 'test-encryption-key',
      });
      await securityService.initialize();
    });

    it('should set and get auth token', async () => {
      const token = 'jwt-token-123';
      jest.spyOn(securityService, 'storeSecureData').mockResolvedValue();
      jest.spyOn(securityService, 'getSecureData').mockResolvedValue(token);

      await securityService.setAuthToken(token);
      expect(securityService.storeSecureData).toHaveBeenCalledWith('auth_token', token);

      const retrieved = await securityService.getAuthToken();
      expect(retrieved).toBe(token);
    });

    it('should clear auth token', async () => {
      await securityService.clearAuthToken();
      expect(mockMMKV.delete).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('validateInput', () => {
    beforeEach(async () => {
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue({
        password: 'test-encryption-key',
      });
      await securityService.initialize();
    });

    it('should validate email correctly', async () => {
      expect(securityService.validateInput('test@example.com', 'email')).toBe(true);
      expect(securityService.validateInput('invalid-email', 'email')).toBe(false);
    });

    it('should validate password correctly', async () => {
      expect(securityService.validateInput('StrongPass123!', 'password')).toBe(true);
      expect(securityService.validateInput('weak', 'password')).toBe(false);
    });

    it('should validate username correctly', async () => {
      expect(securityService.validateInput('validUser123', 'username')).toBe(true);
      expect(securityService.validateInput('ab', 'username')).toBe(false);
    });
  });
});