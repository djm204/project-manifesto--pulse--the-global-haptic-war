import { PIIHandler } from '../../src/services/security/PIIHandler';
import { EncryptionService } from '../../src/services/security/EncryptionService';
import { InputValidator } from '../../src/services/security/InputValidator';

jest.mock('../../src/services/security/EncryptionService');
jest.mock('../../src/services/security/InputValidator');

describe('PIIHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processUserData', () => {
    it('should process user data safely', async () => {
      const userData = { email: 'user@example.com', name: 'John Doe' };
      (InputValidator.sanitizeUserInput as jest.Mock).mockReturnValue('John Doe');
      
      const processed = await PIIHandler.processUserData(userData);
      expect(processed).toBeDefined();
      expect(InputValidator.sanitizeUserInput).toHaveBeenCalledWith('John Doe');
    });
  });

  describe('encryptUserPreferences', () => {
    it('should encrypt user preferences', async () => {
      const preferences = { theme: 'dark', notifications: true };
      (InputValidator.sanitizeUserInput as jest.Mock).mockReturnValue('dark');
      (EncryptionService.encryptSensitiveData as jest.Mock).mockResolvedValue('encrypted-prefs');
      
      const encrypted = await PIIHandler.encryptUserPreferences(preferences);
      expect(encrypted).toBe('encrypted-prefs');
    });
  });

  describe('decryptUserPreferences', () => {
    it('should decrypt user preferences', async () => {
      const encryptedPrefs = 'encrypted-prefs';
      (EncryptionService.decryptSensitiveData as jest.Mock).mockResolvedValue('{"theme":"dark"}');
      
      const decrypted = await PIIHandler.decryptUserPreferences(encryptedPrefs);
      expect(decrypted).toEqual({ theme: 'dark' });
    });
  });

  describe('sanitizeAnalyticsData', () => {
    it('should sanitize analytics data', () => {
      const analyticsData = { event: 'pulse_completed', userId: 'user123' };
      (InputValidator.sanitizeUserInput as jest.Mock).mockReturnValue('pulse_completed');
      
      const sanitized = PIIHandler.sanitizeAnalyticsData(analyticsData);
      expect(sanitized).toBeDefined();
      expect(InputValidator.sanitizeUserInput).toHaveBeenCalled();
    });
  });

  describe('hasUserConsent', () => {
    it('should check user consent', async () => {
      const hasConsent = await PIIHandler.hasUserConsent('analytics');
      expect(typeof hasConsent).toBe('boolean');
    });
  });
});