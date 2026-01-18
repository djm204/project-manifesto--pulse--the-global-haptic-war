import { EncryptionService } from '../../src/utils/encryption';
import crypto from 'crypto';

jest.mock('crypto');

describe('EncryptionService', () => {
  const mockKey = Buffer.from('test-key-32-bytes-long-for-aes256');
  const mockIv = Buffer.from('test-iv-16-bytes');
  const mockAuthTag = Buffer.from('test-auth-tag-16b');

  beforeEach(() => {
    jest.clearAllMocks();
    (crypto.scryptSync as jest.Mock).mockReturnValue(mockKey);
    (crypto.randomBytes as jest.Mock).mockReturnValue(mockIv);
  });

  describe('encryptPII', () => {
    it('should encrypt PII data successfully', () => {
      const mockCipher = {
        setAAD: jest.fn(),
        update: jest.fn().mockReturnValue('encrypted'),
        final: jest.fn().mockReturnValue('data'),
        getAuthTag: jest.fn().mockReturnValue(mockAuthTag)
      };
      (crypto.createCipher as jest.Mock).mockReturnValue(mockCipher);

      const result = EncryptionService.encryptPII('sensitive-data');

      expect(result).toEqual({
        encrypted: 'encrypteddata',
        iv: mockIv.toString('hex'),
        authTag: mockAuthTag.toString('hex')
      });
      expect(mockCipher.setAAD).toHaveBeenCalledWith(Buffer.from('pulse-app', 'utf8'));
    });

    it('should handle encryption errors', () => {
      (crypto.createCipher as jest.Mock).mockImplementation(() => {
        throw new Error('Encryption failed');
      });

      expect(() => EncryptionService.encryptPII('data')).toThrow('Encryption failed');
    });
  });

  describe('decryptPII', () => {
    it('should decrypt PII data successfully', () => {
      const mockDecipher = {
        setAAD: jest.fn(),
        setAuthTag: jest.fn(),
        update: jest.fn().mockReturnValue('decrypted'),
        final: jest.fn().mockReturnValue('data')
      };
      (crypto.createDecipher as jest.Mock).mockReturnValue(mockDecipher);

      const encryptedData = {
        encrypted: 'encrypted-data',
        iv: 'test-iv',
        authTag: 'test-auth-tag'
      };

      const result = EncryptionService.decryptPII(encryptedData);

      expect(result).toBe('decrypteddata');
      expect(mockDecipher.setAAD).toHaveBeenCalledWith(Buffer.from('pulse-app', 'utf8'));
    });

    it('should handle decryption errors', () => {
      (crypto.createDecipher as jest.Mock).mockImplementation(() => {
        throw new Error('Decryption failed');
      });

      const encryptedData = {
        encrypted: 'encrypted-data',
        iv: 'test-iv',
        authTag: 'test-auth-tag'
      };

      expect(() => EncryptionService.decryptPII(encryptedData)).toThrow('Decryption failed');
    });
  });
});