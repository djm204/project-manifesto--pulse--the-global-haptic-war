import { AdManager } from '../../src/services/ads/AdManager';
import { RewardedAdService } from '../../src/services/ads/RewardedAdService';
import { InterstitialAdService } from '../../src/services/ads/InterstitialAdService';

jest.mock('../../src/services/ads/RewardedAdService');
jest.mock('../../src/services/ads/InterstitialAdService');

describe('AdManager', () => {
  let adManager: AdManager;
  let mockRewardedAdService: jest.Mocked<RewardedAdService>;
  let mockInterstitialAdService: jest.Mocked<InterstitialAdService>;

  beforeEach(() => {
    mockRewardedAdService = new RewardedAdService({}) as jest.Mocked<RewardedAdService>;
    mockInterstitialAdService = new InterstitialAdService({}) as jest.Mocked<InterstitialAdService>;
    adManager = new AdManager();
    (adManager as any).rewardedAdService = mockRewardedAdService;
    (adManager as any).interstitialAdService = mockInterstitialAdService;
  });

  describe('initialize', () => {
    it('should initialize ad services', async () => {
      const config = { unityGameId: 'test-id', adMobAppId: 'test-admob-id' };
      const result = await adManager.initialize(config);
      expect(result).toBeDefined();
    });
  });

  describe('preloadRewardedAd', () => {
    it('should preload rewarded ad with low latency', async () => {
      mockRewardedAdService.preload.mockResolvedValue(true);
      
      const startTime = Date.now();
      const loadTime = await adManager.preloadRewardedAd('rewarded_pulse');
      const endTime = Date.now();
      
      expect(loadTime).toBeLessThan(100);
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should handle ad load failures', async () => {
      mockRewardedAdService.preload.mockResolvedValue(false);
      
      const loadTime = await adManager.preloadRewardedAd('rewarded_pulse');
      expect(loadTime).toBeGreaterThan(0);
    });
  });

  describe('showRewardedAd', () => {
    it('should show rewarded ad and return reward', async () => {
      mockRewardedAdService.show.mockResolvedValue({
        success: true,
        reward: { type: 'coins', amount: 100 }
      });

      const result = await adManager.showRewardedAd('rewarded_pulse');
      expect(result.success).toBe(true);
      expect(result.reward).toBeDefined();
    });

    it('should handle invalid placement', async () => {
      const result = await adManager.showRewardedAd('invalid_placement' as any);
      expect(result.success).toBe(false);
    });
  });

  describe('showInterstitialAd', () => {
    it('should show interstitial ad', async () => {
      mockInterstitialAdService.show.mockResolvedValue({ success: true });

      const result = await adManager.showInterstitialAd('interstitial_game_over');
      expect(result.success).toBe(true);
    });

    it('should handle show failures', async () => {
      mockInterstitialAdService.show.mockResolvedValue({ success: false });

      const result = await adManager.showInterstitialAd('interstitial_game_over');
      expect(result.success).toBe(false);
    });
  });

  describe('getAdMetrics', () => {
    it('should return ad performance metrics', () => {
      const metrics = adManager.getAdMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.totalImpressions).toBeDefined();
      expect(metrics.totalRevenue).toBeDefined();
      expect(metrics.fillRate).toBeDefined();
    });
  });

  describe('updateWaterfall', () => {
    it('should update ad waterfall configuration', () => {
      const newWaterfall = [
        { network: 'unity', priority: 1 },
        { network: 'admob', priority: 2 }
      ];
      
      const result = adManager.updateWaterfall(newWaterfall);
      expect(result.success).toBe(true);
    });
  });

  describe('handleAdError', () => {
    it('should handle ad errors gracefully', () => {
      const error = new Error('Ad failed to load');
      const result = adManager.handleAdError(error, 'rewarded_pulse');
      
      expect(result.handled).toBe(true);
      expect(result.fallbackAvailable).toBeDefined();
    });
  });

  describe('getLoadLatency', () => {
    it('should return current ad load latency', () => {
      const latency = adManager.getLoadLatency();
      expect(typeof latency).toBe('number');
      expect(latency).toBeGreaterThanOrEqual(0);
    });
  });
});