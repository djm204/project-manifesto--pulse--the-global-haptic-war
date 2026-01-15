import { AnalyticsService } from '../../src/services/AnalyticsService';
import { SecurityService } from '../../src/services/SecurityService';

jest.mock('../../src/services/SecurityService');

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  let mockSecurityService: jest.Mocked<SecurityService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSecurityService = new SecurityService() as jest.Mocked<SecurityService>;
    analyticsService = new AnalyticsService();
    (analyticsService as any).securityService = mockSecurityService;
  });

  describe('trackEvent', () => {
    it('should track pulse participation event with anonymized data', async () => {
      mockSecurityService.generateAnonymousId.mockReturnValue('anon_123');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await analyticsService.trackEvent('pulse_participated', {
        userId: 'user_123',
        timestamp: Date.now(),
        intensity: 'medium'
      });

      expect(mockSecurityService.generateAnonymousId).toHaveBeenCalledWith('user_123');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Analytics Event:',
        expect.objectContaining({
          event: 'pulse_participated',
          anonymousId: 'anon_123',
          properties: expect.objectContaining({
            intensity: 'medium'
          })
        })
      );

      consoleSpy.mockRestore();
    });

    it('should not track PII in analytics events', async () => {
      mockSecurityService.generateAnonymousId.mockReturnValue('anon_456');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await analyticsService.trackEvent('ad_viewed', {
        userId: 'user_456',
        email: 'user@example.com', // PII that should be filtered
        placement: 'pre_pulse'
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Analytics Event:',
        expect.objectContaining({
          properties: expect.not.objectContaining({
            email: expect.anything(),
            userId: expect.anything()
          })
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('trackUserSession', () => {
    it('should track session start with anonymized user ID', async () => {
      mockSecurityService.generateAnonymousId.mockReturnValue('anon_789');
      const trackEventSpy = jest.spyOn(analyticsService, 'trackEvent');

      await analyticsService.trackUserSession('user_789', 'session_start');

      expect(trackEventSpy).toHaveBeenCalledWith('session_start', {
        userId: 'user_789',
        timestamp: expect.any(Number)
      });
    });
  });

  describe('trackAdInteraction', () => {
    it('should track ad completion with revenue data', async () => {
      const trackEventSpy = jest.spyOn(analyticsService, 'trackEvent');

      await analyticsService.trackAdInteraction('user_101', 'completed', 'rewarded', 0.05);

      expect(trackEventSpy).toHaveBeenCalledWith('ad_interaction', {
        userId: 'user_101',
        action: 'completed',
        adType: 'rewarded',
        revenue: 0.05,
        timestamp: expect.any(Number)
      });
    });
  });

  describe('filterPII', () => {
    it('should remove PII fields from data', () => {
      const data = {
        userId: 'user_123',
        email: 'user@example.com',
        phone: '+1234567890',
        name: 'John Doe',
        validField: 'keep_this'
      };

      const filtered = (analyticsService as any).filterPII(data);

      expect(filtered).toEqual({
        validField: 'keep_this'
      });
    });
  });
});