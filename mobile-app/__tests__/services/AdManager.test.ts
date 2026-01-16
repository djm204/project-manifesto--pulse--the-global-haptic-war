import { AdManager } from '../../src/services/AdManager';
import { AdReward, AdError } from '../../src/types/ads';

// Mock AppLovin MAX SDK
jest.mock('react-native-applovin-max', () => ({
  AppLovinMAX: {
    showRewardedVideo: jest.fn(),
    loadRewardedVideo: jest.fn(),
    isRewardedVideoReady: jest.fn(),
    setRewardedVideoListener: jest.fn(),
  },
}));

describe('AdManager', () => {
  let adManager: AdManager;

  beforeEach(() => {
    adManager = new AdManager();
    jest.clearAllMocks();
  });

  describe('showRewardedAdForPowerUp', () => {
    it('should return power-up reward when ad is completed', async () => {
      const mockAdResult = { completed: true, reward: 'powerup' };
      (adManager as any).maxSdk.showRewardedVideo = jest.fn().mockResolvedValue(mockAdResult);

      const reward = await adManager.showRewardedAdForPowerUp();

      expect(reward).toEqual({
        powerMultiplier: 2.0,
        hapticIntensity: 'strong',
        scoreBonus: 1.5,
      });
    });

    it('should throw AdError when ad is not completed', async () => {
      const mockAdResult = { completed: false };
      (adManager as any).maxSdk.showRewardedVideo = jest.fn().mockResolvedValue(mockAdResult);

      await expect(adManager.showRewardedAdForPowerUp()).rejects.toThrow(AdError);
    });

    it('should include correct placement and user data', async () => {
      const mockUserId = 'user123';
      jest.spyOn(adManager as any, 'getCurrentUserId').mockReturnValue(mockUserId);
      jest.spyOn(adManager as any, 'getContextualSignals').mockReturnValue({ level: 5 });
      
      const mockAdResult = { completed: true };
      const showAdSpy = jest.spyOn((adManager as any).maxSdk, 'showRewardedVideo')
        .mockResolvedValue(mockAdResult);

      await adManager.showRewardedAdForPowerUp();

      expect(showAdSpy).toHaveBeenCalledWith({
        placement: 'pre_pulse_powerup',
        userId: mockUserId,
        contextualData: { level: 5 },
      });
    });
  });

  describe('loadRewardedAd', () => {
    it('should load rewarded ad successfully', async () => {
      (adManager as any).maxSdk.loadRewardedVideo = jest.fn().mockResolvedValue(true);

      const result = await adManager.loadRewardedAd();

      expect(result).toBe(true);
      expect((adManager as any).maxSdk.loadRewardedVideo).toHaveBeenCalled();
    });

    it('should handle ad loading failure', async () => {
      (adManager as any).maxSdk.loadRewardedVideo = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(adManager.loadRewardedAd()).rejects.toThrow('Network error');
    });
  });

  describe('isAdReady', () => {
    it('should return true when ad is ready', () => {
      (adManager as any).maxSdk.isRewardedVideoReady = jest.fn().mockReturnValue(true);

      const result = adManager.isAdReady();

      expect(result).toBe(true);
    });

    it('should return false when ad is not ready', () => {
      (adManager as any).maxSdk.isRewardedVideoReady = jest.fn().mockReturnValue(false);

      const result = adManager.isAdReady();

      expect(result).toBe(false);
    });
  });
});