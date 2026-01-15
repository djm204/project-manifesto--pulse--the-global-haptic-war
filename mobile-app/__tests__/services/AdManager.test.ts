import { AdManager } from '../../src/services/AdManager';
import { AppLovinMAX } from 'react-native-applovin-max';
import { SecurityService } from '../../src/services/SecurityService';

// Mock dependencies
jest.mock('react-native-applovin-max', () => ({
  initialize: jest.fn(),
  isRewardedAdReady: jest.fn(),
  showRewardedAd: jest.fn(),
  isInterstitialReady: jest.fn(),
  showInterstitial: jest.fn(),
  setBannerPlacement: jest.fn(),
  showBanner: jest.fn(),
  hideBanner: jest.fn(),
}));

jest.mock('../../src/services/SecurityService');

describe('AdManager', () => {
  let adManager: AdManager;

  beforeEach(() => {
    adManager = AdManager.getInstance();
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = AdManager.getInstance();
      const instance2 = AdManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should initialize AppLovin MAX SDK', async () => {
      const mockSdkKey = 'test-sdk-key';
      (AppLovinMAX.initialize as jest.Mock).mockResolvedValue(true);
      
      await adManager.initialize(mockSdkKey);
      
      expect(AppLovinMAX.initialize).toHaveBeenCalledWith(mockSdkKey);
      expect(adManager.isInitialized()).toBe(true);
    });

    it('should handle initialization failure', async () => {
      (AppLovinMAX.initialize as jest.Mock).mockRejectedValue(new Error('Init failed'));
      
      await expect(adManager.initialize('invalid-key')).rejects.toThrow('Init failed');
      expect(adManager.isInitialized()).toBe(false);
    });
  });

  describe('showRewardedVideo', () => {
    beforeEach(async () => {
      await adManager.initialize('test-key');
    });

    it('should show rewarded video and return reward', async () => {
      (AppLovinMAX.isRewardedAdReady as jest.Mock).mockResolvedValue(true);
      (AppLovinMAX.showRewardedAd as jest.Mock).mockResolvedValue({
        reward: { type: 'power_multiplier', amount: 2.0 }
      });

      const reward = await adManager.showRewardedVideo('pre_pulse');

      expect(reward).toEqual({
        type: 'power_multiplier',
        value: 2.0,
        duration: 300000
      });
    });

    it('should throw error when no ad is available', async () => {
      (AppLovinMAX.isRewardedAdReady as jest.Mock).mockResolvedValue(false);

      await expect(adManager.showRewardedVideo('pre_pulse')).rejects.toThrow('No rewarded ad available');
    });

    it('should handle ad show failure', async () => {
      (AppLovinMAX.isRewardedAdReady as jest.Mock).mockResolvedValue(true);
      (AppLovinMAX.showRewardedAd as jest.Mock).mockRejectedValue(new Error('Ad failed'));

      await expect(adManager.showRewardedVideo('pre_pulse')).rejects.toThrow('Ad failed');
    });
  });

  describe('showInterstitial', () => {
    beforeEach(async () => {
      await adManager.initialize('test-key');
    });

    it('should show interstitial when ready', async () => {
      (AppLovinMAX.isInterstitialReady as jest.Mock).mockResolvedValue(true);
      (AppLovinMAX.showInterstitial as jest.Mock).mockResolvedValue(true);

      await adManager.showInterstitial('post_pulse');

      expect(AppLovinMAX.showInterstitial).toHaveBeenCalledWith('post_pulse');
    });

    it('should not show interstitial when not ready', async () => {
      (AppLovinMAX.isInterstitialReady as jest.Mock).mockResolvedValue(false);

      await adManager.showInterstitial('post_pulse');

      expect(AppLovinMAX.showInterstitial).not.toHaveBeenCalled();
    });
  });

  describe('getRewardType', () => {
    it('should return correct reward type for pre_pulse placement', () => {
      expect(adManager.getRewardType('pre_pulse')).toBe('power_multiplier');
    });

    it('should return correct reward type for bonus_pulse placement', () => {
      expect(adManager.getRewardType('bonus_pulse')).toBe('extra_pulse');
    });

    it('should return default reward type for unknown placement', () => {
      expect(adManager.getRewardType('unknown')).toBe('power_multiplier');
    });
  });

  describe('isRewardedAdReady', () => {
    it('should return ad ready status', async () => {
      (AppLovinMAX.isRewardedAdReady as jest.Mock).mockResolvedValue(true);

      const isReady = await adManager.isRewardedAdReady();

      expect(isReady).toBe(true);
    });
  });

  describe('isInterstitialReady', () => {
    it('should return interstitial ready status', async () => {
      (AppLovinMAX.isInterstitialReady as jest.Mock).mockResolvedValue(false);

      const isReady = await adManager.isInterstitialReady();

      expect(isReady).toBe(false);
    });
  });
});