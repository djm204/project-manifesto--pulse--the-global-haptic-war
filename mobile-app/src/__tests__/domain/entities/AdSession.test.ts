import { AdSession, AdProvider } from '../../domain/entities/AdSession';

describe('AdSession Entity', () => {
  describe('Creation', () => {
    it('should create ad session with valid data', () => {
      const sessionData = {
        id: 'session-123',
        userId: 'user-456',
        provider: AdProvider.APPLOVIN_MAX,
        adType: 'rewarded' as const,
        startedAt: new Date(),
        rewardAmount: 100
      };
      
      const session = AdSession.create(sessionData);
      
      expect(session.id).toBe('session-123');
      expect(session.userId).toBe('user-456');
      expect(session.provider).toBe(AdProvider.APPLOVIN_MAX);
      expect(session.adType).toBe('rewarded');
      expect(session.rewardAmount).toBe(100);
    });

    it('should create session with default reward amount', () => {
      const sessionData = {
        id: 'session-123',
        userId: 'user-456',
        provider: AdProvider.ADMOB,
        adType: 'interstitial' as const,
        startedAt: new Date()
      };
      
      const session = AdSession.create(sessionData);
      
      expect(session.rewardAmount).toBe(0);
    });
  });

  describe('complete', () => {
    it('should complete session successfully', () => {
      const session = AdSession.create({
        id: 'session-123',
        userId: 'user-456',
        provider: AdProvider.UNITY_ADS,
        adType: 'rewarded',
        startedAt: new Date(),
        rewardAmount: 50
      });
      
      session.complete();
      
      expect(session.isCompleted()).toBe(true);
      expect(session.completedAt).toBeDefined();
    });

    it('should throw error if already completed', () => {
      const session = AdSession.create({
        id: 'session-123',
        userId: 'user-456',
        provider: AdProvider.APPLOVIN_MAX,
        adType: 'rewarded',
        startedAt: new Date(),
        rewardAmount: 75
      });
      
      session.complete();
      
      expect(() => session.complete()).toThrow('Session already completed');
    });
  });

  describe('getDuration', () => {
    it('should calculate duration for completed session', () => {
      const startTime = new Date('2024-01-01T10:00:00Z');
      const session = AdSession.create({
        id: 'session-123',
        userId: 'user-456',
        provider: AdProvider.ADMOB,
        adType: 'rewarded',
        startedAt: startTime,
        rewardAmount: 25
      });
      
      // Mock completion time
      const endTime = new Date('2024-01-01T10:00:30Z'); // 30 seconds later
      session.complete();
      (session as any).completedAt = endTime;
      
      expect(session.getDuration()).toBe(30000); // 30 seconds in milliseconds
    });

    it('should return 0 for incomplete session', () => {
      const session = AdSession.create({
        id: 'session-123',
        userId: 'user-456',
        provider: AdProvider.UNITY_ADS,
        adType: 'interstitial',
        startedAt: new Date()
      });
      
      expect(session.getDuration()).toBe(0);
    });
  });

  describe('isCompleted', () => {
    it('should return false for new session', () => {
      const session = AdSession.create({
        id: 'session-123',
        userId: 'user-456',
        provider: AdProvider.APPLOVIN_MAX,
        adType: 'rewarded',
        startedAt: new Date(),
        rewardAmount: 100
      });
      
      expect(session.isCompleted()).toBe(false);
    });

    it('should return true for completed session', () => {
      const session = AdSession.create({
        id: 'session-123',
        userId: 'user-456',
        provider: AdProvider.ADMOB,
        adType: 'rewarded',
        startedAt: new Date(),
        rewardAmount: 50
      });
      
      session.complete();
      
      expect(session.isCompleted()).toBe(true);
    });
  });
});