import { AdManager } from '../../src/services/AdManager';
import { AdReward, AdType } from '../../src/types/ads';

// Mock AppLovin MAX SDK
const mockAppLovinMAX = {
  initialize: jest.fn(),
  loadRewardedAd: jest.fn(),
  showRewardedAd: jest.fn(),
  loadInterstitialAd: jest.fn(),
  showInterstitialAd: jest.fn(),
  isRewardedAdReady: jest.fn(),
  isInterstitialAdReady: jest.fn(),
};

jest.mock('react-native-applovin-max', () => mockAppLovinMAX);

describe('AdManager', () => {
  let adManager: AdManager;

  beforeEach(() => {
    jest.clearAllMocks();
    adManager = new AdManager();
  });

  describe('initialization', () => {
    it('should initialize AppLovin MAX SDK', async () => {
      mockAppLovinMAX.initialize.mockResolvedValue(true);

      await adManager.initialize('test-sdk-key');

      expect(mockAppLovinMAX.initialize).toHaveBeenCalledWith('test-sdk-key');
    });

    it('should handle initialization failure', async () => {
      mockAppLovinMAX.initialize.mockRejectedValue(new Error('Init failed'));

      await expect(adManager.initialize('invalid-key')).rejects.toThrow('Init failed');
    });
  });

  describe('showRewardedVideo', () => {
    it('should resolve with reward when ad completes successfully', async () => {
      const mockReward: AdReward = { type: 'power-up', value: 2, currency: 'pulse-coins' };
      mockAppLovinMAX.isRewardedAdReady.mockReturnValue(true);
      mockAppLovinMAX.showRewardedAd.mockImplementation((callbacks) => {
        setTimeout(() => callbacks.onReward(mockReward), 100);
        return Promise.resolve();
      });

      const result = await adManager.showRewardedVideo();

      expect(result).toEqual(mockReward);
      expect(mockAppLovinMAX.showRewardedAd).toHaveBeenCalled();
    });

    it('should reject when ad is not ready', async () => {
      mockAppLovinMAX.isRewardedAdReady.mockReturnValue(false);

      await expect(adManager.showRewardedVideo()).rejects.toThrow('Rewarded ad not ready');
    });

    it('should handle ad display errors', async () => {
      mockAppLovinMAX.isRewardedAdReady.mockReturnValue(true);
      mockAppLovinMAX.showRewardedAd.mockImplementation((callbacks) => {
        setTimeout(() => callbacks.onError({ code: 'AD_DISPLAY_FAILED', message: 'Display failed' }), 100);
        return Promise.resolve();
      });

      await expect(adManager.showRewardedVideo()).rejects.toThrow('Display failed');
    });

    it('should track ad interactions', async () => {
      const mockReward: AdReward = { type: 'power-up', value: 1, currency: 'pulse-coins' };
      const trackSpy = jest.spyOn(adManager as any, 'trackAdInteraction');
      mockAppLovinMAX.isRewardedAdReady.mockReturnValue(true);
      mockAppLovinMAX.showRewardedAd.mockImplementation((callbacks) => {
        callbacks.onReward(mockReward);
        callbacks.onClose();
        return Promise.resolve();
      });

      await adManager.showRewardedVideo();

      expect(trackSpy).toHaveBeenCalledWith('rewarded_complete', expect.any(Object));
      expect(trackSpy).toHaveBeenCalledWith('rewarded_close');
    });
  });

  describe('showInterstitial', () => {
    it('should show interstitial ad successfully', async () => {
      mockAppLovinMAX.isInterstitialAdReady.mockReturnValue(true);
      mockAppLovinMAX.showInterstitialAd.mockResolvedValue(undefined);

      await expect(adManager.showInterstitial('post-pulse-playable')).resolves.toBeUndefined();
      expect(mockAppLovinMAX.showInterstitialAd).toHaveBeenCalledWith('post-pulse-playable');
    });

    it('should handle interstitial not ready', async () => {
      mockAppLovinMAX.isInterstitialAdReady.mockReturnValue(false);

      await expect(adManager.showInterstitial('test-ad')).rejects.toThrow('Interstitial ad not ready');
    });
  });

  describe('preloadAds', () => {
    it('should preload rewarded and interstitial ads', async () => {
      mockAppLovinMAX.loadRewardedAd.mockResolvedValue(true);
      mockAppLovinMAX.loadInterstitialAd.mockResolvedValue(true);

      await adManager.preloadAds();

      expect(mockAppLovinMAX.loadRewardedAd).toHaveBeenCalledWith('pulse-power-up');
      expect(mockAppLovinMAX.loadInterstitialAd).toHaveBeenCalledWith('post-pulse-playable');
    });

    it('should handle preload failures gracefully', async () => {
      mockAppLovinMAX.loadRewardedAd.mockRejectedValue(new Error('Load failed'));
      mockAppLovinMAX.loadInterstitialAd.mockResolvedValue(true);

      await expect(adManager.preloadAds()).resolves.toBeUndefined();
      expect(mockAppLovinMAX.loadInterstitialAd).toHaveBeenCalled();
    });
  });

  describe('getAdAvailability', () => {
    it('should return correct availability status', () => {
      mockAppLovinMAX.isRewardedAdReady.mockReturnValue(true);
      mockAppLovinMAX.isInterstitialAdReady.mockReturnValue(false);

      const availability = adManager.getAdAvailability();

      expect(availability).toEqual({
        rewarded: true,
        interstitial: false
      });
    });
  });
});