import { AdManager } from '../../src/services/AdManager';
import { AdPlacement, AdReward } from '../../src/types/ads';

// Mock AppLovin MAX SDK
const mockMAX = {
  initialize: jest.fn(),
  showRewardedAd: jest.fn(),
  showInterstitial: jest.fn(),
  loadRewardedAd: jest.fn(),
  isRewardedAdReady: jest.fn(),
  setRewardedAdListener: jest.fn(),
};

jest.mock('react-native-applovin-max', () => mockMAX);

describe('AdManager', () => {
  let adManager: AdManager;

  beforeEach(() => {
    adManager = new AdManager();
    jest.clearAllMocks();
  });

  describe('initializeAds', () => {
    it('should initialize AppLovin MAX SDK', async () => {
      mockMAX.initialize.mockResolvedValue(true);
      
      await adManager.initializeAds();
      
      expect(mockMAX.initialize).toHaveBeenCalledWith(expect.any(String));
    });

    it('should handle initialization failure', async () => {
      mockMAX.initialize.mockRejectedValue(new Error('SDK init failed'));
      
      await expect(adManager.initializeAds()).rejects.toThrow('SDK init failed');
    });
  });

  describe('showRewardedAd', () => {
    it('should show rewarded ad and return reward', async () => {
      const mockReward: AdReward = {
        amount: 100,
        currency: 'coins',
        placement: AdPlacement.PRE_PULSE,
      };

      mockMAX.showRewardedAd.mockImplementation((placement, callbacks) => {
        setTimeout(() => callbacks.onReward(mockReward), 100);
        return Promise.resolve();
      });

      const reward = await adManager.showRewardedAd(AdPlacement.PRE_PULSE);
      
      expect(reward).toEqual(mockReward);
      expect(mockMAX.showRewardedAd).toHaveBeenCalledWith(
        AdPlacement.PRE_PULSE,
        expect.objectContaining({
          onReward: expect.any(Function),
          onError: expect.any(Function),
        })
      );
    });

    it('should handle ad show failure', async () => {
      const error = new Error('Ad failed to show');
      mockMAX.showRewardedAd.mockImplementation((placement, callbacks) => {
        setTimeout(() => callbacks.onError(error), 100);
        return Promise.resolve();
      });

      await expect(
        adManager.showRewardedAd(AdPlacement.PRE_PULSE)
      ).rejects.toThrow('Ad failed to show');
    });
  });

  describe('preloadAds', () => {
    it('should preload ads for all placements', async () => {
      mockMAX.loadRewardedAd.mockResolvedValue(true);
      
      await adManager.preloadAds();
      
      expect(mockMAX.loadRewardedAd).toHaveBeenCalledTimes(3); // PRE_PULSE, POST_PULSE, LEADERBOARD
    });
  });

  describe('isAdReady', () => {
    it('should return ad readiness status', () => {
      mockMAX.isRewardedAdReady.mockReturnValue(true);
      
      const isReady = adManager.isAdReady(AdPlacement.PRE_PULSE);
      
      expect(isReady).toBe(true);
      expect(mockMAX.isRewardedAdReady).toHaveBeenCalledWith(AdPlacement.PRE_PULSE);
    });
  });
});