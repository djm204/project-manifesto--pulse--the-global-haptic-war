import { AdManager } from '../../src/services/AdManager';
import { AppLovinMAX } from 'applovin-max-react-native';

// Mock AppLovin MAX SDK
jest.mock('applovin-max-react-native', () => ({
  initialize: jest.fn(),
  showRewardedAd: jest.fn(),
  showInterstitialAd: jest.fn(),
  loadRewardedAd: jest.fn(),
  loadInterstitialAd: jest.fn(),
  isRewardedAdReady: jest.fn(),
  isInterstitialAdReady: jest.fn(),
  setRewardedAdListener: jest.fn(),
  setInterstitialAdListener: jest.fn(),
}));

describe('AdManager', () => {
  let adManager: AdManager;
  const mockRewardedAdUnitId = 'test-rewarded-ad-unit';
  const mockInterstitialAdUnitId = 'test-interstitial-ad-unit';

  beforeEach(() => {
    adManager = new AdManager(mockRewardedAdUnitId, mockInterstitialAdUnitId);
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize AppLovin MAX SDK', async () => {
      (AppLovinMAX.initialize as jest.Mock).mockResolvedValue(true);

      await adManager.initialize();

      expect(AppLovinMAX.initialize).toHaveBeenCalled();
      expect(AppLovinMAX.setRewardedAdListener).toHaveBeenCalled();
      expect(AppLovinMAX.setInterstitialAdListener).toHaveBeenCalled();
    });

    it('should handle initialization failure', async () => {
      (AppLovinMAX.initialize as jest.Mock).mockRejectedValue(new Error('Init failed'));

      await expect(adManager.initialize()).rejects.toThrow('Init failed');
    });
  });

  describe('showRewardedAd', () => {
    it('should show rewarded ad when ready', async () => {
      (AppLovinMAX.isRewardedAdReady as jest.Mock).mockReturnValue(true);
      (AppLovinMAX.showRewardedAd as jest.Mock).mockResolvedValue(true);

      const result = await adManager.showRewardedAd();

      expect(AppLovinMAX.showRewardedAd).toHaveBeenCalledWith(mockRewardedAdUnitId);
      expect(result).toBe(true);
    });

    it('should return false when ad not ready', async () => {
      (AppLovinMAX.isRewardedAdReady as jest.Mock).mockReturnValue(false);

      const result = await adManager.showRewardedAd();

      expect(AppLovinMAX.showRewardedAd).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe('loadRewardedAd', () => {
    it('should load rewarded ad', async () => {
      (AppLovinMAX.loadRewardedAd as jest.Mock).mockResolvedValue(true);

      await adManager.loadRewardedAd();

      expect(AppLovinMAX.loadRewardedAd).toHaveBeenCalledWith(mockRewardedAdUnitId);
    });

    it('should handle load failure', async () => {
      (AppLovinMAX.loadRewardedAd as jest.Mock).mockRejectedValue(new Error('Load failed'));

      await expect(adManager.loadRewardedAd()).rejects.toThrow('Load failed');
    });
  });

  describe('showInterstitialAd', () => {
    it('should show interstitial ad when ready', async () => {
      (AppLovinMAX.isInterstitialAdReady as jest.Mock).mockReturnValue(true);
      (AppLovinMAX.showInterstitialAd as jest.Mock).mockResolvedValue(true);

      const result = await adManager.showInterstitialAd();

      expect(AppLovinMAX.showInterstitialAd).toHaveBeenCalledWith(mockInterstitialAdUnitId);
      expect(result).toBe(true);
    });

    it('should return false when ad not ready', async () => {
      (AppLovinMAX.isInterstitialAdReady as jest.Mock).mockReturnValue(false);

      const result = await adManager.showInterstitialAd();

      expect(AppLovinMAX.showInterstitialAd).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe('getAdRevenue', () => {
    it('should return accumulated revenue', () => {
      const revenue = adManager.getAdRevenue();
      
      expect(typeof revenue).toBe('number');
      expect(revenue).toBeGreaterThanOrEqual(0);
    });
  });
});