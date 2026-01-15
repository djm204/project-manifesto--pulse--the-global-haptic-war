import Share from 'react-native-share';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SecurityService } from './SecurityService';
import { AnalyticsService } from './AnalyticsService';

export interface ShareContent {
  type: 'achievement' | 'ranking' | 'pulse_result';
  title: string;
  description: string;
  imageUrl?: string;
  videoUrl?: string;
  url: string;
}

export interface ShareOptions {
  platforms?: ('facebook' | 'twitter' | 'instagram' | 'tiktok')[];
  includeVideo?: boolean;
  customMessage?: string;
}

class SocialServiceClass {
  private readonly SHARE_CACHE_KEY = 'social_share_cache';
  private readonly MAX_CACHE_SIZE = 50;

  async generateShareContent(
    type: ShareContent['type'],
    data: any
  ): Promise<ShareContent> {
    try {
      const baseUrl = 'https://globalpulse.app/share';
      
      switch (type) {
        case 'achievement':
          return this.generateAchievementContent(data, baseUrl);
        case 'ranking':
          return this.generateRankingContent(data, baseUrl);
        case 'pulse_result':
          return this.generatePulseResultContent(data, baseUrl);
        default:
          throw new Error(`Unsupported share content type: ${type}`);
      }
    } catch (error) {
      console.error('Error generating share content:', error);
      throw error;
    }
  }

  private generateAchievementContent(data: any, baseUrl: string): ShareContent {
    return {
      type: 'achievement',
      title: `🏆 New Achievement Unlocked!`,
      description: `I just earned "${data.achievement}" in PULSE Global Haptic War! Join the synchronized haptic experience.`,
      imageUrl: `${baseUrl}/achievement/${data.achievementId}/image`,
      url: `${baseUrl}/achievement/${data.achievementId}`
    };
  }

  private generateRankingContent(data: any, baseUrl: string): ShareContent {
    const rank = data.globalRank;
    const emoji = rank <= 10 ? '🥇' : rank <= 100 ? '🥈' : '🥉';
    
    return {
      type: 'ranking',
      title: `${emoji} Global Rank #${rank}`,
      description: `I'm ranked #${rank} globally in PULSE Global Haptic War! Can you beat my score?`,
      imageUrl: `${baseUrl}/ranking/${data.userId}/image`,
      url: `${baseUrl}/ranking/${data.userId}`
    };
  }

  private generatePulseResultContent(data: any, baseUrl: string): ShareContent {
    return {
      type: 'pulse_result',
      title: `⚡ PULSE Result: ${data.score} points!`,
      description: `Just participated in a global synchronized pulse event! Score: ${data.score}. Join millions worldwide!`,
      videoUrl: data.videoClipUrl,
      url: `${baseUrl}/pulse/${data.eventId}`
    };
  }

  async shareContent(
    content: ShareContent,
    options: ShareOptions = {}
  ): Promise<boolean> {
    try {
      const shareOptions = {
        title: content.title,
        message: options.customMessage || content.description,
        url: content.url,
        ...(content.imageUrl && { url: content.imageUrl }),
        ...(content.videoUrl && options.includeVideo && { url: content.videoUrl })
      };

      const result = await Share.open(shareOptions);
      
      // Track successful share
      await AnalyticsService.trackEvent('content_shared', {
        content_type: content.type,
        platform: result.app || 'unknown',
        success: true
      });

      // Cache successful share for offline access
      await this.cacheShareContent(content);

      return true;
    } catch (error) {
      if (error.message !== 'User did not share') {
        console.error('Share failed:', error);
        await AnalyticsService.trackEvent('share_failed', {
          content_type: content.type,
          error: error.message
        });
      }
      return false;
    }
  }

  private async cacheShareContent(content: ShareContent): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.SHARE_CACHE_KEY);
      const cacheArray = cached ? JSON.parse(cached) : [];
      
      cacheArray.unshift({
        ...content,
        cachedAt: Date.now()
      });

      // Limit cache size
      if (cacheArray.length > this.MAX_CACHE_SIZE) {
        cacheArray.splice(this.MAX_CACHE_SIZE);
      }

      await AsyncStorage.setItem(this.SHARE_CACHE_KEY, JSON.stringify(cacheArray));
    } catch (error) {
      console.error('Failed to cache share content:', error);
    }
  }

  async getCachedShares(): Promise<ShareContent[]> {
    try {
      const cached = await AsyncStorage.getItem(this.SHARE_CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('Failed to get cached shares:', error);
      return [];
    }
  }

  async clearShareCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.SHARE_CACHE_KEY);
    } catch (error) {
      console.error('Failed to clear share cache:', error);
    }
  }
}

export const SocialService = new SocialServiceClass();