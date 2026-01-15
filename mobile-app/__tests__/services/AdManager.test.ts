import { AdManager } from '../../src/services/AdManager';
import { AnalyticsService } from '../../src/services/AnalyticsService';

// Mock AppLovin MAX
jest.mock('applovin-max-react-native', () => ({
  initialize: jest.fn(),
  loadRewardedAd: jest.fn(),
  showRewardedAd: jest.fn(),
  loadInterstitialAd: jest.fn(),
  showInterstitialAd: jest.fn(),
  isRewardedAdReady: jest.fn(),
  isInterstitialAdReady: jest.fn(),
  setRewardedAdListener: jest.fn(),
  setInterstitialAdListener: jest.fn(),
}));

// Mock AnalyticsService
jest.mock('../../src/services/AnalyticsService');

describe('AdManager', () => {
  let adManager: AdManager;
  let mockAnalytics: jest.Mocked<AnalyticsService>;

  beforeEach(() => {
    mockAnalytics = new AnalyticsService() as jest.Mocked<AnalyticsService>;
    adManager = new AdManager();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize AppLovin MAX SDK', async () => {
      const mockInitialize = require('applovin-max-react-native').initialize;
      mockInitialize.mockResolvedValueOnce(true);

      await adManager.initialize();

      expect(mockInitialize).toHaveBeenCalledWith('test-sdk-key');
    });

    it('should handle initialization failure', async () => {
      const mockInitialize = require('applovin-max-react-native').initialize;
      mockInitialize.mockRejectedValueOnce(new Error('Init failed'));

      await expect(adManager.initialize()).rejects.toThrow('Init failed');
    });
  });

  describe('rewarded ads', () => {
    beforeEach(async () => {
      const mockInitialize = require('applovin-max-react-native').initialize;
      mockInitialize.mockResolvedValueOnce(true);
      await adManager.initialize();
    });

    it('should load rewarded ad successfully', async () => {
      const mockLoad = require('applovin-max-react-native').loadRewardedAd;
      mockLoad.mockResolvedValueOnce(true);

      const result = await adManager.loadRewardedAd();

      expect(result).toBe(true);
      expect(mockLoad).toHaveBeenCalledWith('rewarded-ad-unit-id');
    });

    it('should show rewarded ad when ready', async () => {
      const mockIsReady = require('applovin-max-react-native').isRewardedAdReady;
      const mockShow = require('applovin-max-react-native').showRewardedAd;
      
      mockIsReady.mockReturnValueOnce(true);
      mockShow.mockResolvedValueOnce({ reward: 100 });

      const result = await adManager.showRewardedAd();

      expect(result).toEqual({ reward: 100 });
      expect(mockShow).toHaveBeenCalledWith('rewarded-ad-unit-id');
    });

    it('should not show rewarded ad when not ready', async () => {
      const mockIsReady = require('applovin-max-react-native').isRewardedAdReady;
      mockIsReady.mockReturnValueOnce(false);

      const result = await adManager.showRewardedAd();

      expect(result).toBeNull();
    });

    it('should track ad events', async () => {
      const mockLoad = require('applovin-max-react-native').loadRewardedAd;
      mockLoad.mockResolvedValueOnce(true);

      await adManager.loadRewardedAd();

      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith('ad_loaded', {
        adType: 'rewarded',
        adUnitId: 'rewarded-ad-unit-id',
      });
    });
  });

  describe('interstitial ads', () => {
    beforeEach(async () => {
      const mockInitialize = require('applovin-max-react-native').initialize;
      mockInitialize.mockResolvedValueOnce(true);
      await adManager.initialize();
    });

    it('should load interstitial ad successfully', async () => {
      const mockLoad = require('applovin-max-react-native').loadInterstitialAd;
      mockLoad.mockResolvedValueOnce(true);

      const result = await adManager.loadInterstitialAd();

      expect(result).toBe(true);
      expect(mockLoad).toHaveBeenCalledWith('interstitial-ad-unit-id');
    });

    it('should show interstitial ad with frequency cap', async () => {
      const mockIsReady = require('applovin-max-react-native').isInterstitialAdReady;
      const mockShow = require('applovin-max-react-native').showInterstitialAd;
      
      mockIsReady.mockReturnValue(true);
      mockShow.mockResolvedValue(true);

      // First show should work
      let result = await adManager.showInterstitialAd();
      expect(result).toBe(true);

      // Immediate second show should be blocked by frequency cap
      result = await adManager.showInterstitialAd();
      expect(result).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle ad load failures gracefully', async () => {
      const mockLoad = require('applovin-max-react-native').loadRewardedAd;
      mockLoad.mockRejectedValueOnce(new Error('Load failed'));

      const result = await adManager.loadRewardedAd();

      expect(result).toBe(false);
      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith('ad_load_failed', {
        adType: 'rewarded',
        error: 'Load failed',
      });
    });

    it('should handle ad show failures gracefully', async () => {
      const mockIsReady = require('applovin-max-react-native').isRewardedAdReady;
      const mockShow = require('applovin-max-react-native').showRewardedAd;
      
      mockIsReady.mockReturnValueOnce(true);
      mockShow.mockRejectedValueOnce(new Error('Show failed'));

      const result = await adManager.showRewardedAd();

      expect(result).toBeNull();
    });
  });

  describe('ad listeners', () => {
    it('should set up rewarded ad listeners', async () => {
      const mockSetListener = require('applovin-max-react-native').setRewardedAdListener;
      
      await adManager.initialize();

      expect(mockSetListener).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle rewarded ad completion', async () => {
      const mockSetListener = require('applovin-max-react-native').setRewardedAdListener;
      let adListener: any;
      
      mockSetListener.mockImplementationOnce((listener) => {
        adListener = listener;
      });

      await adManager.initialize();

      // Simulate ad completion
      adListener({
        type: 'onRewardedAdReceivedReward',
        adUnitId: 'rewarded-ad-unit-id',
        reward: { amount: 100, label: 'coins' },
      });

      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith('ad_reward_received', {
        adUnitId: 'rewarded-ad-unit-id',
        rewardAmount: 100,
        rewardLabel: 'coins',
      });
    });
  });
});