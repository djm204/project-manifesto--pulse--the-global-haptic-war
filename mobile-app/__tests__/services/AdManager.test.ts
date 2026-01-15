import { AdManager } from '../../src/services/AdManager';
import { AppLovinMAX } from 'react-native-applovin-max';

// Mock AppLovin MAX SDK
jest.mock('react-native-applovin-max', () => ({
  AppLovinMAX: {
    initialize: jest.fn(),
    isRewardedAdReady: jest.fn(),
    showRewardedAd: jest.fn(),
    isInterstitialAdReady: jest.fn(),
    showInterstitialAd: jest.fn(),
    loadRewardedAd: jest.fn(),
    loadInterstitialAd: jest.fn(),
    setRewardedAdListener: jest.fn(),
    setInterstitialAdListener: jest.fn(),
  }
}));

describe('AdManager', () => {
  let adManager: AdManager;
  let mockMaxSdk: jest.Mocked<typeof AppLovinMAX>;

  beforeEach(() => {
    jest.clearAllMocks();
    adManager = new AdManager();
    mockMaxSdk = AppLovinMAX as jest.Mocked<typeof AppLovinMAX>;
  });

  describe('initializeSDK', () => {
    it('should initialize MAX SDK successfully', async () => {
      mockMaxSdk.initialize.mockResolvedValue(true);

      await adManager.initializeSDK();

      expect(mockMaxSdk.initialize).toHaveBeenCalledWith('test-sdk-key');
      expect(mockMaxSdk.setRewardedAdListener).toHaveBeenCalled();
      expect(mockMaxSdk.setInterstitialAdListener).toHaveBeenCalled();
    });

    it('should handle initialization failure', async () => {
      mockMaxSdk.initialize.mockRejectedValue(new Error('Init failed'));

      await expect(adManager.initializeSDK()).rejects.toThrow('Init failed');
    });
  });

  describe('showRewardedAd', () => {
    it('should show rewarded ad when available', async () => {
      mockMaxSdk.isRewardedAdReady.mockResolvedValue(true);
      mockMaxSdk.showRewardedAd.mockResolvedValue(true);

      const result = await adManager.showRewardedAd('pre_pulse');

      expect(result).toBe(true);
      expect(mockMaxSdk.showRewardedAd).toHaveBeenCalledWith('pre_pulse');
    });

    it('should return false when ad not ready', async () => {
      mockMaxSdk.isRewardedAdReady.mockResolvedValue(false);

      const result = await adManager.showRewardedAd('pre_pulse');

      expect(result).toBe(false);
      expect(mockMaxSdk.showRewardedAd).not.toHaveBeenCalled();
    });

    it('should handle show ad failure', async () => {
      mockMaxSdk.isRewardedAdReady.mockResolvedValue(true);
      mockMaxSdk.showRewardedAd.mockRejectedValue(new Error('Show failed'));

      await expect(adManager.showRewardedAd('pre_pulse')).rejects.toThrow('Show failed');
    });
  });

  describe('showInterstitialAd', () => {
    it('should show interstitial ad when available', async () => {
      mockMaxSdk.isInterstitialAdReady.mockResolvedValue(true);
      mockMaxSdk.showInterstitialAd.mockResolvedValue(undefined);

      await adManager.showInterstitialAd();

      expect(mockMaxSdk.showInterstitialAd).toHaveBeenCalled();
    });

    it('should not show interstitial ad when not ready', async () => {
      mockMaxSdk.isInterstitialAdReady.mockResolvedValue(false);

      await adManager.showInterstitialAd();

      expect(mockMaxSdk.showInterstitialAd).not.toHaveBeenCalled();
    });
  });

  describe('loadAds', () => {
    it('should load both rewarded and interstitial ads', async () => {
      mockMaxSdk.loadRewardedAd.mockResolvedValue(undefined);
      mockMaxSdk.loadInterstitialAd.mockResolvedValue(undefined);

      await adManager.loadAds();

      expect(mockMaxSdk.loadRewardedAd).toHaveBeenCalled();
      expect(mockMaxSdk.loadInterstitialAd).toHaveBeenCalled();
    });
  });
});