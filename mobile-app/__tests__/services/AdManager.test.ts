import { AdManager } from '../../src/services/AdManager';
import { AppLovinMAX } from '@applovin/react-native-max';
import { AdResult, UserSegment } from '../../src/types/ads';

// Mock AppLovin MAX SDK
jest.mock('@applovin/react-native-max', () => ({
  AppLovinMAX: {
    showRewardedAd: jest.fn(),
    preloadRewardedAd: jest.fn(),
    setTargetECPM: jest.fn(),
    isRewardedAdReady: jest.fn(),
    initialize: jest.fn(),
  },
}));

describe('AdManager', () => {
  let adManager: AdManager;
  let mockMaxSdk: jest.Mocked<typeof AppLovinMAX>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMaxSdk = AppLovinMAX as jest.Mocked<typeof AppLovinMAX>;
    adManager = new AdManager();
    (adManager as any).maxSdk = mockMaxSdk;
  });

  describe('showRewardedAd', () => {
    it('should show rewarded ad and return success result', async () => {
      const placement = 'pre-pulse-power';
      mockMaxSdk.isRewardedAdReady.mockReturnValue(true);
      mockMaxSdk.showRewardedAd.mockImplementation((placementId, callbacks) => {
        setTimeout(() => {
          callbacks.onAdDisplayed();
          callbacks.onAdCompleted();
        }, 100);
      });

      const result = await adManager.showRewardedAd(placement);

      expect(result.success).toBe(true);
      expect(result.reward).toBe('double_power');
      expect(mockMaxSdk.showRewardedAd).toHaveBeenCalledWith(placement, expect.any(Object));
    });

    it('should handle ad failure gracefully', async () => {
      const placement = 'pre-pulse-power';
      const errorMessage = 'Ad failed to load';
      mockMaxSdk.isRewardedAdReady.mockReturnValue(true);
      mockMaxSdk.showRewardedAd.mockImplementation((placementId, callbacks) => {
        setTimeout(() => callbacks.onAdFailed(new Error(errorMessage)), 100);
      });

      const result = await adManager.showRewardedAd(placement);

      expect(result.success).toBe(false);
      expect(result.error).toBe(errorMessage);
    });

    it('should preload ad before showing', async () => {
      const placement = 'pre-pulse-power';
      mockMaxSdk.isRewardedAdReady.mockReturnValue(false);
      const preloadSpy = jest.spyOn(adManager as any, 'preloadRewardedAd').mockResolvedValue(true);

      mockMaxSdk.showRewardedAd.mockImplementation((placementId, callbacks) => {
        setTimeout(() => callbacks.onAdCompleted(), 100);
      });

      await adManager.showRewardedAd(placement);

      expect(preloadSpy).toHaveBeenCalledWith(placement);
    });

    it('should return error when ad is not ready', async () => {
      const placement = 'pre-pulse-power';
      mockMaxSdk.isRewardedAdReady.mockReturnValue(false);
      jest.spyOn(adManager as any, 'preloadRewardedAd').mockResolvedValue(false);

      const result = await adManager.showRewardedAd(placement);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Ad not ready');
    });
  });

  describe('optimizeAdPlacement', () => {
    it('should calculate and set optimal ECPM', async () => {
      const userSegment: UserSegment = {
        tier: 'premium',
        region: 'US',
        ltv: 50.0,
        engagementScore: 0.8,
      };

      jest.spyOn(adManager as any, 'getUserSegment').mockResolvedValue(userSegment);
      jest.spyOn(adManager as any, 'calculateOptimalECPM').mockResolvedValue(2.5);

      await adManager.optimizeAdPlacement();

      expect(mockMaxSdk.setTargetECPM).toHaveBeenCalledWith(2.5);
    });

    it('should handle optimization failure gracefully', async () => {
      jest.spyOn(adManager as any, 'getUserSegment').mockRejectedValue(new Error('Segment error'));

      await expect(adManager.optimizeAdPlacement()).rejects.toThrow('Segment error');
    });
  });

  describe('calculateOptimalECPM', () => {
    it('should return higher ECPM for premium users', async () => {
      const premiumSegment: UserSegment = {
        tier: 'premium',
        region: 'US',
        ltv: 100.0,
        engagementScore: 0.9,
      };

      const result = await (adManager as any).calculateOptimalECPM(premiumSegment);

      expect(result).toBeGreaterThan(2.0);
    });

    it('should return lower ECPM for free users', async () => {
      const freeSegment: UserSegment = {
        tier: 'free',
        region: 'US',
        ltv: 5.0,
        engagementScore: 0.3,
      };

      const result = await (adManager as any).calculateOptimalECPM(freeSegment);

      expect(result).toBeLessThan(1.5);
    });

    it('should adjust ECPM based on region', async () => {
      const usSegment: UserSegment = {
        tier: 'standard',
        region: 'US',
        ltv: 25.0,
        engagementScore: 0.6,
      };

      const inSegment: UserSegment = {
        tier: 'standard',
        region: 'IN',
        ltv: 25.0,
        engagementScore: 0.6,
      };

      const usECPM = await (adManager as any).calculateOptimalECPM(usSegment);
      const inECPM = await (adManager as any).calculateOptimalECPM(inSegment);

      expect(usECPM).toBeGreaterThan(inECPM);
    });
  });

  describe('trackAdImpression', () => {
    it('should increment impression counter', () => {
      const placement = 'test-placement';
      
      (adManager as any).trackAdImpression(placement);
      (adManager as any).trackAdImpression(placement);

      const metrics = adManager.getAdMetrics();
      expect(metrics[placement]).toBe(2);
    });

    it('should track multiple placements separately', () => {
      (adManager as any).trackAdImpression('placement-1');
      (adManager as any).trackAdImpression('placement-2');
      (adManager as any).trackAdImpression('placement-1');

      const metrics = adManager.getAdMetrics();
      expect(metrics['placement-1']).toBe(2);
      expect(metrics['placement-2']).toBe(1);
    });
  });

  describe('getRewardForPlacement', () => {
    it('should return correct reward for pre-pulse placement', () => {
      const reward = (adManager as any).getRewardForPlacement('pre-pulse-power');
      expect(reward).toBe('double_power');
    });

    it('should return correct reward for post-pulse placement', () => {
      const reward = (adManager as any).getRewardForPlacement('post-pulse-bonus');
      expect(reward).toBe('bonus_points');
    });

    it('should return standard reward for unknown placement', () => {
      const reward = (adManager as any).getRewardForPlacement('unknown-placement');
      expect(reward).toBe('standard_reward');
    });
  });
});