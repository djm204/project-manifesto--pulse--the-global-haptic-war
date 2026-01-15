import { SocialService } from '../../src/services/SocialService';
import { AnalyticsService } from '../../src/services/AnalyticsService';
import Share from 'react-native-share';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('react-native-share');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../src/services/AnalyticsService');

describe('SocialService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateShareContent', () => {
    it('should generate achievement share content', async () => {
      const data = { achievement: 'First Pulse', achievementId: '123' };
      
      const content = await SocialService.generateShareContent('achievement', data);
      
      expect(content).toEqual({
        type: 'achievement',
        title: '🏆 New Achievement Unlocked!',
        description: 'I just earned "First Pulse" in PULSE Global Haptic War! Join the synchronized haptic experience.',
        imageUrl: 'https://globalpulse.app/share/achievement/123/image',
        url: 'https://globalpulse.app/share/achievement/123'
      });
    });

    it('should generate ranking share content with correct emoji', async () => {
      const data = { globalRank: 5, userId: 'user123' };
      
      const content = await SocialService.generateShareContent('ranking', data);
      
      expect(content).toEqual({
        type: 'ranking',
        title: '🥇 Global Rank #5',
        description: 'I\'m ranked #5 globally in PULSE Global Haptic War! Can you beat my score?',
        imageUrl: 'https://globalpulse.app/share/ranking/user123/image',
        url: 'https://globalpulse.app/share/ranking/user123'
      });
    });

    it('should generate pulse result share content', async () => {
      const data = { score: 1500, eventId: 'event123', videoClipUrl: 'video.mp4' };
      
      const content = await SocialService.generateShareContent('pulse_result', data);
      
      expect(content).toEqual({
        type: 'pulse_result',
        title: '⚡ PULSE Result: 1500 points!',
        description: 'Just participated in a global synchronized pulse event! Score: 1500. Join millions worldwide!',
        videoUrl: 'video.mp4',
        url: 'https://globalpulse.app/share/pulse/event123'
      });
    });

    it('should throw error for unsupported content type', async () => {
      await expect(
        SocialService.generateShareContent('invalid' as any, {})
      ).rejects.toThrow('Unsupported share content type: invalid');
    });
  });

  describe('shareContent', () => {
    const mockContent = {
      type: 'achievement' as const,
      title: 'Test Achievement',
      description: 'Test description',
      url: 'https://test.com'
    };

    it('should share content successfully', async () => {
      (Share.open as jest.Mock).mockResolvedValue({ app: 'twitter' });
      
      const result = await SocialService.shareContent(mockContent);
      
      expect(result).toBe(true);
      expect(Share.open).toHaveBeenCalledWith({
        title: 'Test Achievement',
        message: 'Test description',
        url: 'https://test.com'
      });
      expect(AnalyticsService.trackEvent).toHaveBeenCalledWith('content_shared', {
        content_type: 'achievement',
        platform: 'twitter',
        success: true
      });
    });

    it('should handle user cancellation gracefully', async () => {
      (Share.open as jest.Mock).mockRejectedValue(new Error('User did not share'));
      
      const result = await SocialService.shareContent(mockContent);
      
      expect(result).toBe(false);
      expect(AnalyticsService.trackEvent).not.toHaveBeenCalledWith('share_failed', expect.any(Object));
    });

    it('should track share failures', async () => {
      (Share.open as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      const result = await SocialService.shareContent(mockContent);
      
      expect(result).toBe(false);
      expect(AnalyticsService.trackEvent).toHaveBeenCalledWith('share_failed', {
        content_type: 'achievement',
        error: 'Network error'
      });
    });

    it('should include custom message when provided', async () => {
      (Share.open as jest.Mock).mockResolvedValue({ app: 'facebook' });
      
      await SocialService.shareContent(mockContent, { customMessage: 'Custom message' });
      
      expect(Share.open).toHaveBeenCalledWith({
        title: 'Test Achievement',
        message: 'Custom message',
        url: 'https://test.com'
      });
    });
  });

  describe('getCachedShares', () => {
    it('should return cached shares', async () => {
      const cachedData = [{ type: 'achievement', title: 'Test', cachedAt: Date.now() }];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cachedData));
      
      const result = await SocialService.getCachedShares();
      
      expect(result).toEqual(cachedData);
    });

    it('should return empty array when no cache exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      
      const result = await SocialService.getCachedShares();
      
      expect(result).toEqual([]);
    });

    it('should handle cache read errors', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));
      
      const result = await SocialService.getCachedShares();
      
      expect(result).toEqual([]);
    });
  });

  describe('clearShareCache', () => {
    it('should clear share cache successfully', async () => {
      await SocialService.clearShareCache();
      
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('social_share_cache');
    });

    it('should handle cache clear errors', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValue(new Error('Storage error'));
      
      await expect(SocialService.clearShareCache()).resolves.not.toThrow();
    });
  });
});