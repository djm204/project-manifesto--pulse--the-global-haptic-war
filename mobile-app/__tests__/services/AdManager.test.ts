import { AdManager } from '../../src/services/AdManager';
import { AnalyticsService } from '../../src/services/AnalyticsService';

jest.mock('../../src/services/AnalyticsService');
jest.mock('react-native-applovin-max', () => ({
  AppLovinMAX: {
    initialize: jest.fn(),
    isRewardedAdReady: jest.fn(),
    loadRewardedAd: jest.fn(),
    showRewardedAd: jest.fn(),
    setRewardedAdListener: jest.fn(),
  },
}));

describe('AdManager', () => {
  let adManager: AdManager;
  let mockAnalytics: jest.Mocked<AnalyticsService>;

  beforeEach(() => {
    mockAnalytics = new AnalyticsService() as jest.Mocked<AnalyticsService>;
    adManager = new AdManager();
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize AppLovin MAX SDK', async () => {
      const { AppLovinMAX } = require('react-native-applovin-max');
      AppLovinMAX.initialize.mockResolvedValue(true);

      await adManager.initialize();

      expect(AppLovinMAX.initialize).toHaveBeenCalledWith(expect.any(String));
    });

    it('should handle initialization failure', async () => {
      const { AppLovinMAX } = require('react-native-applovin-max');
      AppLovinMAX.initialize.mockRejectedValue(new Error('Init failed'));

      await expect(adManager.initialize()).rejects.toThrow('Init failed');
    });
  });

  describe('showRewardedAd', () => {
    it('should show rewarded ad when ready', async () => {
      const { AppLovinMAX } = require('react-native-applovin-max');
      AppLovinMAX.isRewardedAdReady.mockReturnValue(true);
      AppLovinMAX.showRewardedAd.mockResolvedValue({ reward: { type: 'coins', amount: 100 } });

      const result = await adManager.showRewardedAd('cooldown_bypass');

      expect(AppLovinMAX.showRewardedAd).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should load ad if not ready', async () => {
      const { AppLovinMAX } = require('react-native-applovin-max');
      AppLovinMAX.isRewardedAdReady.mockReturnValue(false);
      AppLovinMAX.loadRewardedAd.mockResolvedValue(true);

      await adManager.showRewardedAd('golden_pulse');

      expect(AppLovinMAX.loadRewardedAd).toHaveBeenCalled();
    });

    it('should handle ad show failure', async () => {
      const { AppLovinMAX } = require('react-native-applovin-max');
      AppLovinMAX.isRewardedAdReady.mockReturnValue(true);
      AppLovinMAX.showRewardedAd.mockRejectedValue(new Error('Ad failed'));

      const result = await adManager.showRewardedAd('extra_attempts');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Ad failed');
    });
  });

  describe('preloadAds', () => {
    it('should preload multiple ad units', async () => {
      const { AppLovinMAX } = require('react-native-applovin-max');
      AppLovinMAX.loadRewardedAd.mockResolvedValue(true);

      await adManager.preloadAds();

      expect(AppLovinMAX.loadRewardedAd).toHaveBeenCalledTimes(3);
    });
  });

  describe('getRewardForAdType', () => {
    it('should return correct reward for cooldown bypass', () => {
      const reward = adManager.getRewardForAdType('cooldown_bypass');
      expect(reward).toEqual({ type: 'cooldown_bypass', amount: 1 });
    });

    it('should return correct reward for golden pulse', () => {
      const reward = adManager.getRewardForAdType('golden_pulse');
      expect(reward).toEqual({ type: 'golden_pulse', amount: 1 });
    });

    it('should return unknown reward for invalid type', () => {
      const reward = adManager.getRewardForAdType('invalid' as any);
      expect(reward).toEqual({ type: 'unknown', amount: 0 });
    });
  });
});