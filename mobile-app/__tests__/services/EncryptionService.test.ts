import { EncryptionService } from '../../src/services/security/EncryptionService';

jest.mock('react-native-keychain', () => ({
  setInternetCredentials: jest.fn().mockResolvedValue(true),
  getInternetCredentials: jest.fn().mockResolvedValue({ password: 'mock-key' }),
  resetInternetCredentials: jest.fn().mockResolvedValue(true),
}));

jest.mock('crypto-js', () => ({
  AES: {
    encrypt: jest.fn().mockReturnValue({ toString: () => 'encrypted-data' }),
    decrypt: jest.fn().mockReturnValue({ toString: () => 'decrypted-data' }),
  },
  enc: {
    Utf8: 'utf8',
  },
  PBKDF2: jest.fn().mockReturnValue('hashed-data'),
}));

describe('EncryptionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateEncryptionKey', () => {
    it('should generate and store encryption key', async () => {
      const key = await EncryptionService.generateEncryptionKey();
      expect(key).toBeDefined();
      expect(key.length).toBeGreaterThan(0);
    });
  });

  describe('encryptSensitiveData', () => {
    it('should encrypt sensitive data', async () => {
      const data = 'sensitive-information';
      const encrypted = await EncryptionService.encryptSensitiveData(data);
      expect(encrypted).toBe('encrypted-data');
    });
  });

  describe('decryptSensitiveData', () => {
    it('should decrypt sensitive data', async () => {
      const encryptedData = 'encrypted-data';
      const decrypted = await EncryptionService.decryptSensitiveData(encryptedData);
      expect(decrypted).toBe('decrypted-data');
    });
  });

  describe('hashPII', () => {
    it('should hash PII data', () => {
      const piiData = 'user@example.com';
      const hashed = EncryptionService.hashPII(piiData);
      expect(hashed).toBe('hashed-data');
    });
  });
});