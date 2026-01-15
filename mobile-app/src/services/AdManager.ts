import { AppLovinMAX } from '@applovin/react-native-max';
import { AdResult, AdPlacement, UserSegment, ECPMData } from '../types/ads';
import { SecurityService } from './SecurityService';
import { validateInput } from '../utils/validation';

export class AdManager {
  private maxSdk: typeof AppLovinMAX;
  private securityService: SecurityService;
  private preloadedAds: Map<string, boolean> = new Map();
  private adMetrics: Map<string, number> = new Map();

  constructor() {
    this.maxSdk = AppLovinMAX;
    this.securityService = new SecurityService();
  }

  async initialize(): Promise<void> {
    try {
      const sdkKey = process.env.REACT_APP_APPLOVIN_SDK_KEY;
      if (!sdkKey) {
        throw new Error('AppLovin SDK key not configured');
      }

      await this.maxSdk.initialize(sdkKey);
      await this.setupAdUnits();
      await this.preloadInitialAds();
    } catch (error) {
      console.error('Ad Manager initialization failed:', error);
      throw error;
    }
  }

  async showRewardedAd(placement: string): Promise<AdResult> {
    try {
      validateInput(placement, 'string');
      
      if (!this.preloadedAds.get(placement)) {
        await this.preloadRewardedAd(placement);
      }

      const consentStatus = await this.securityService.getConsentStatus();
      if (!consentStatus.canShowPersonalizedAds) {
        await this.maxSdk.setHasUserConsent(false);
      }

      return new Promise((resolve) => {
        const startTime = Date.now();

        this.maxSdk.showRewardedAd(placement, {
          onAdDisplayed: () => {
            this.trackAdImpression(placement);
          },
          onAdCompleted: () => {
            const duration = Date.now() - startTime;
            this.trackAdCompletion(placement, duration);
            resolve({ 
              success: true, 
              reward: this.getRewardForPlacement(placement),
              duration 
            });
          },
          onAdFailed: (error: string) => {
            this.trackAdFailure(placement, error);
            resolve({ success: false, error });
          },
          onAdClosed: () => {
            // Preload next ad
            this.preloadRewardedAd(placement);
          }
        });
      });
    } catch (error) {
      console.error(`Failed to show rewarded ad for ${placement}:`, error);
      return { success: false, error: error.message };
    }
  }

  async showInterstitialAd(placement: string): Promise<AdResult> {
    try {
      validateInput(placement, 'string');
      
      const isReady = await this.maxSdk.isInterstitialReady(placement);
      if (!isReady) {
        return { success: false, error: 'Ad not ready' };
      }

      return new Promise((resolve) => {
        this.maxSdk.showInterstitialAd(placement, {
          onAdDisplayed: () => {
            this.trackAdImpression(placement);
          },
          onAdClosed: () => {
            resolve({ success: true });
            this.preloadInterstitialAd(placement);
          },
          onAdFailed: (error: string) => {
            this.trackAdFailure(placement, error);
            resolve({ success: false, error });
          }
        });
      });
    } catch (error) {
      console.error(`Failed to show interstitial ad for ${placement}:`, error);
      return { success: false, error: error.message };
    }
  }

  async optimizeAdPlacement(): Promise<void> {
    try {
      const userSegment = await this.getUserSegment();
      const optimalECPM = await this.calculateOptimalECPM(userSegment);
      
      await this.maxSdk.setTargetECPM(optimalECPM);
      
      // Update waterfall based on performance
      await this.updateWaterfallPriorities();
    } catch (error) {
      console.error('Ad placement optimization failed:', error);
    }
  }

  private async preloadRewardedAd(placement: string): Promise<void> {
    try {
      await this.maxSdk.loadRewardedAd(placement);
      this.preloadedAds.set(placement, true);
    } catch (error) {
      console.warn(`Failed to preload rewarded ad for ${placement}:`, error);
      this.preloadedAds.set(placement, false);
    }
  }

  private async preloadInterstitialAd(placement: string): Promise<void> {
    try {
      await this.maxSdk.loadInterstitialAd(placement);
    } catch (error) {
      console.warn(`Failed to preload interstitial ad for ${placement}:`, error);
    }
  }

  private async setupAdUnits(): Promise<void> {
    const adUnits = {
      'pre-pulse-power': process.env.REACT_APP_REWARDED_AD_UNIT_ID,
      'post-pulse-bonus': process.env.REACT_APP_REWARDED_AD_UNIT_ID_2,
      'pulse-intermission': process.env.REACT_APP_INTERSTITIAL_AD_UNIT_ID
    };

    for (const [placement, adUnitId] of Object.entries(adUnits)) {
      if (adUnitId) {
        await this.maxSdk.createRewardedAd(placement, adUnitId);
      }
    }
  }

  private async preloadInitialAds(): Promise<void> {
    const placements = ['pre-pulse-power', 'post-pulse-bonus'];
    
    await Promise.allSettled(
      placements.map(placement => this.preloadRewardedAd(placement))
    );
  }

  private async getUserSegment(): Promise<UserSegment> {
    const userId = await this.securityService.getUserId();
    // This would typically come from your analytics service
    return {
      userId,
      tier: 'premium',
      engagementLevel: 'high',
      adPreference: 'rewarded'
    };
  }

  private async calculateOptimalECPM(userSegment: UserSegment): Promise<number> {
    const baseECPM = 2.50;
    const multipliers = {
      premium: 1.5,
      standard: 1.0,
      basic: 0.8
    };

    return baseECPM * (multipliers[userSegment.tier] || 1.0);
  }

  private async updateWaterfallPriorities(): Promise<void> {
    const performanceData = this.getAdNetworkPerformance();
    
    // Sort networks by eCPM performance
    const sortedNetworks = Object.entries(performanceData)
      .sort(([, a], [, b]) => b.ecpm - a.ecpm)
      .map(([network]) => network);

    // Update waterfall order (implementation depends on MAX SDK capabilities)
    console.log('Updated waterfall order:', sortedNetworks);
  }

  private getAdNetworkPerformance(): Record<string, ECPMData> {
    // Mock data - in production, this would come from MAX dashboard API
    return {
      'Unity Ads': { ecpm: 3.20, fillRate: 0.85 },
      'Liftoff': { ecpm: 2.95, fillRate: 0.78 },
      'InMobi': { ecpm: 2.80, fillRate: 0.92 },
      'Google AdMob': { ecpm: 2.65, fillRate: 0.95 }
    };
  }

  private getRewardForPlacement(placement: string): string {
    const rewards = {
      'pre-pulse-power': 'double_power',
      'post-pulse-bonus': 'bonus_points',
      'pulse-intermission': 'extra_life'
    };

    return rewards[placement] || 'standard_reward';
  }

  private trackAdImpression(placement: string): void {
    const impressions = this.adMetrics.get(`${placement}_impressions`) || 0;
    this.adMetrics.set(`${placement}_impressions`, impressions + 1);
  }

  private trackAdCompletion(placement: string, duration: number): void {
    const completions = this.adMetrics.get(`${placement}_completions`) || 0;
    this.adMetrics.set(`${placement}_completions`, completions + 1);
    this.adMetrics.set(`${placement}_avg_duration`, duration);
  }

  private trackAdFailure(placement: string, error: string): void {
    const failures = this.adMetrics.get(`${placement}_failures`) || 0;
    this.adMetrics.set(`${placement}_failures`, failures + 1);
    console.warn(`Ad failure for ${placement}:`, error);
  }

  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.adMetrics);
  }
}