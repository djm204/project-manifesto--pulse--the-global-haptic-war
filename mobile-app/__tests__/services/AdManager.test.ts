import { AdManager } from '../../src/services/AdManager';
import { AppLovinMAX } from 'react-native-applovin-max';
import { Platform } from 'react-native';

// Mock dependencies
jest.mock('react-native-applovin-max');
jest.mock('react-native');

describe('AdManager', () => {
  let adManager: AdManager;
  const mockAppLovinMAX = AppLovinMAX as jest.Mocked<typeof AppLovinMAX>;

  beforeEach(() => {
    adManager = new AdManager();
    jest.clearAllMocks();
    
    // Setup default mocks
    mockAppLovinMAX.initialize.mockResolvedValue(undefined);
    mockAppLovinMAX.isInitialized.mockReturnValue(true);
    mockAppLovinMAX.loadRewardedAd.mockResolvedValue(undefined);
    mockAppLovinMAX.loadInterstitial.mockResolvedValue(undefined);
    mockAppLovinMAX.isRewardedAdReady.mockReturnValue(true);
    mockAppLovinMAX.isInterstitialReady.mockReturnValue(true);
  });

  describe('initialization', () => {
    it('should initialize AppLovin MAX SDK successfully', async () => {
      await adManager.initialize('test-sdk-key');
      
      expect(mockAppLovinMAX.initialize).toHaveBeenCalledWith('test-sdk-key');
      expect(adManager.isInitialized).toBe(true);
    });

    it('should handle initialization failure', async () => {
      mockAppLovinMAX.initialize.mockRejectedValue(new Error('Init failed'));
      
      await expect(adManager.initialize('invalid-key')).rejects.toThrow('Init failed');
      expect(adManager.isInitialized).toBe(false);
    });

    it('should set up ad event listeners', async () => {
      await adManager.initialize('test-sdk-key');
      
      expect(mockAppLovinMAX.addEventListener).toHaveBeenCalledWith('OnRewardedAdLoadedEvent', expect.any(Function));
      expect(mockAppLovinMAX.addEventListener).toHaveBeenCalledWith('OnRewardedAdFailedToLoadEvent', expect.any(Function));
    });
  });

  describe('rewarded ads', () => {
    beforeEach(async () => {
      await adManager.initialize('test-sdk-key');
    });

    it('should load rewarded ad successfully', async () => {
      await adManager.loadRewardedAd('rewarded-unit-id');
      
      expect(mockAppLovinMAX.loadRewardedAd).toHaveBeenCalledWith('rewarded-unit-id');
      expect(adManager.rewardedAdLoaded).toBe(true);
    });

    it('should show rewarded ad when ready', async () => {
      await adManager.loadRewardedAd('rewarded-unit-id');
      mockAppLovinMAX.showRewardedAd.mockResolvedValue({ reward: 100 });
      
      const result = await adManager.showRewardedAd('rewarded-unit-id');
      
      expect(mockAppLovinMAX.showRewardedAd).toHaveBeenCalledWith('rewarded-unit-id');
      expect(result).toEqual({ reward: 100 });
    });

    it('should handle rewarded ad not ready', async () => {
      mockAppLovinMAX.isRewardedAdReady.mockReturnValue(false);
      
      await expect(adManager.showRewardedAd('rewarded-unit-id')).rejects.toThrow('Rewarded ad not ready');
    });

    it('should preload multiple rewarded ads', async () => {
      const unitIds = ['unit1', 'unit2', 'unit3'];
      
      await adManager.preloadRewardedAds(unitIds);
      
      unitIds.forEach(unitId => {
        expect(mockAppLovinMAX.loadRewardedAd).toHaveBeenCalledWith(unitId);
      });
    });
  });

  describe('interstitial ads', () => {
    beforeEach(async () => {
      await adManager.initialize('test-sdk-key');
    });

    it('should load interstitial ad successfully', async () => {
      await adManager.loadInterstitialAd('interstitial-unit-id');
      
      expect(mockAppLovinMAX.loadInterstitial).toHaveBeenCalledWith('interstitial-unit-id');
      expect(adManager.interstitialAdLoaded).toBe(true);
    });

    it('should show interstitial ad when ready', async () => {
      await adManager.loadInterstitialAd('interstitial-unit-id');
      
      const result = await adManager.showInterstitialAd('interstitial-unit-id');
      
      expect(mockAppLovinMAX.showInterstitial).toHaveBeenCalledWith('interstitial-unit-id');
      expect(result).toBe(true);
    });

    it('should handle interstitial ad not ready', async () => {
      mockAppLovinMAX.isInterstitialReady.mockReturnValue(false);
      
      await expect(adManager.showInterstitialAd('interstitial-unit-id')).rejects.toThrow('Interstitial ad not ready');
    });
  });

  describe('ad performance tracking', () => {
    beforeEach(async () => {
      await adManager.initialize('test-sdk-key');
    });

    it('should track ad load times', async () => {
      const startTime = Date.now();
      await adManager.loadRewardedAd('rewarded-unit-id');
      
      const metrics = adManager.getAdMetrics();
      expect(metrics.loadTime).toBeGreaterThan(0);
      expect(metrics.loadTime).toBeLessThan(5000); // Should load within 5 seconds
    });

    it('should track ad revenue', async () => {
      await adManager.loadRewardedAd('rewarded-unit-id');
      mockAppLovinMAX.showRewardedAd.mockResolvedValue({ 
        reward: 100,
        revenue: 0.05
      });
      
      await adManager.showRewardedAd('rewarded-unit-id');
      
      const metrics = adManager.getAdMetrics();
      expect(metrics.totalRevenue).toBe(0.05);
      expect(metrics.adCount).toBe(1);
    });

    it('should calculate eCPM correctly', async () => {
      // Simulate multiple ad views
      for (let i = 0; i < 10; i++) {
        await adManager.loadRewardedAd('rewarded-unit-id');
        mockAppLovinMAX.showRewardedAd.mockResolvedValue({ 
          reward: 100,
          revenue: 0.05
        });
        await adManager.showRewardedAd('rewarded-unit-id');
      }
      
      const metrics = adManager.getAdMetrics();
      expect(metrics.eCPM).toBe(50); // $0.50 per 1000 impressions
    });
  });

  describe('error handling and retry logic', () => {
    beforeEach(async () => {
      await adManager.initialize('test-sdk-key');
    });

    it('should retry failed ad loads', async () => {
      mockAppLovinMAX.loadRewardedAd
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(undefined);
      
      await adManager.loadRewardedAdWithRetry('rewarded-unit-id', 2);
      
      expect(mockAppLovinMAX.loadRewardedAd).toHaveBeenCalledTimes(2);
    });

    it('should respect maximum retry attempts', async () => {
      mockAppLovinMAX.loadRewardedAd.mockRejectedValue(new Error('Network error'));
      
      await expect(adManager.loadRewardedAdWithRetry('rewarded-unit-id', 3))
        .rejects.toThrow('Network error');
      
      expect(mockAppLovinMAX.loadRewardedAd).toHaveBeenCalledTimes(3);
    });

    it('should handle SDK not initialized', async () => {
      const uninitializedManager = new AdManager();
      
      await expect(uninitializedManager.loadRewardedAd('unit-id'))
        .rejects.toThrow('AdManager not initialized');
    });
  });

  describe('GDPR and privacy compliance', () => {
    it('should set GDPR consent', async () => {
      await adManager.setGDPRConsent(true);
      
      expect(mockAppLovinMAX.setHasUserConsent).toHaveBeenCalledWith(true);
    });

    it('should set age restricted user flag', async () => {
      await adManager.setAgeRestrictedUser(true);
      
      expect(mockAppLovinMAX.setIsAgeRestrictedUser).toHaveBeenCalledWith(true);
    });

    it('should handle ATT permission on iOS', async () => {
      (Platform as any).OS = 'ios';
      
      await adManager.requestTrackingPermission();
      
      expect(mockAppLovinMAX.requestTrackingAuthorization).toHaveBeenCalled();
    });
  });
});