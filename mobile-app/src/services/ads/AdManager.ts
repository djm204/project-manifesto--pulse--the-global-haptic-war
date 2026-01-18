import { InputValidator } from '../security/InputValidator';
import { RewardedAdService } from './RewardedAdService';
import { InterstitialAdService } from './InterstitialAdService';

export interface AdConfig {
  unityAdsGameId: string;
  admobAppId: string;
  rtbEndpoint: string;
  testMode: boolean;
}

export interface AdLoadResult {
  success: boolean;
  loadTime: number;
  provider: 'unity' | 'admob' | 'rtb';
  error?: string;
}

export class AdManager {
  private rewardedAdService: RewardedAdService;
  private interstitialAdService: InterstitialAdService;
  private config: AdConfig;
  private isInitialized = false;

  constructor(config: AdConfig) {
    this.config = this.validateConfig(config);
    this.rewardedAdService = new RewardedAdService(this.config);
    this.interstitialAdService = new InterstitialAdService(this.config);
  }

  private validateConfig(config: AdConfig): AdConfig {
    if (!config.unityAdsGameId || !config.admobAppId || !config.rtbEndpoint) {
      throw new Error('Invalid ad configuration: missing required fields');
    }
    
    // Validate URLs
    try {
      new URL(config.rtbEndpoint);
    } catch {
      throw new Error('Invalid RTB endpoint URL');
    }

    return config;
  }

  async initialize(): Promise<void> {
    try {
      await Promise.all([
        this.rewardedAdService.initialize(),
        this.interstitialAdService.initialize()
      ]);
      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Ad Manager initialization failed: ${error}`);
    }
  }

  async preloadRewardedAd(): Promise<number> {
    if (!this.isInitialized) {
      throw new Error('AdManager not initialized');
    }

    const startTime = Date.now();
    
    try {
      await this.rewardedAdService.preload();
      const loadTime = Date.now() - startTime;
      
      if (loadTime > 5000) { // 5 second timeout
        throw new Error('Ad load timeout exceeded');
      }
      
      return loadTime;
    } catch (error) {
      throw new Error(`Failed to preload rewarded ad: ${error}`);
    }
  }

  async showRewardedAd(placement: string): Promise<boolean> {
    try {
      const validatedPlacement = InputValidator.validateAdPlacement(placement);
      return await this.rewardedAdService.show(validatedPlacement);
    } catch (error) {
      console.error('Failed to show rewarded ad:', error);
      return false;
    }
  }

  async showInterstitialAd(placement: string): Promise<boolean> {
    try {
      const validatedPlacement = InputValidator.validateAdPlacement(placement);
      return await this.interstitialAdService.show(validatedPlacement);
    } catch (error) {
      console.error('Failed to show interstitial ad:', error);
      return false;
    }
  }

  async loadAdWithFallback(adType: 'rewarded' | 'interstitial'): Promise<AdLoadResult> {
    const providers: Array<'unity' | 'admob' | 'rtb'> = ['unity', 'admob', 'rtb'];
    
    for (const provider of providers) {
      const startTime = Date.now();
      
      try {
        const success = await this.loadFromProvider(provider, adType);
        if (success) {
          return {
            success: true,
            loadTime: Date.now() - startTime,
            provider
          };
        }
      } catch (error) {
        console.warn(`Failed to load from ${provider}:`, error);
        continue;
      }
    }

    return {
      success: false,
      loadTime: 0,
      provider: 'unity',
      error: 'All ad providers failed'
    };
  }

  private async loadFromProvider(provider: string, adType: string): Promise<boolean> {
    // Implementation would depend on specific ad SDK integrations
    // This is a placeholder for the actual provider-specific logic
    return new Promise((resolve) => {
      setTimeout(() => resolve(Math.random() > 0.1), 100); // 90% success rate simulation
    });
  }

  getMetrics(): Record<string, number> {
    return {
      rewardedAdsLoaded: this.rewardedAdService.getLoadedCount(),
      interstitialAdsLoaded: this.interstitialAdService.getLoadedCount(),
      totalRevenue: this.calculateRevenue()
    };
  }

  private calculateRevenue(): number {
    // Placeholder for revenue calculation
    return 0;
  }
}