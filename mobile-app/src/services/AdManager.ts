import { AppLovinMAX } from 'react-native-applovin-max';
import { Platform } from 'react-native';
import { SecurityService } from './SecurityService';

export interface AdReward {
  type: 'power_multiplier' | 'extra_pulse' | 'premium_access';
  value: number;
  duration: number;
  timestamp: number;
}

export interface AdPlacement {
  id: string;
  name: string;
  type: 'rewarded' | 'interstitial' | 'banner';
}

export class AdManager {
  private static instance: AdManager;
  private isInitialized: boolean = false;
  private adUnits: Record<string, string> = {};

  private constructor() {
    this.initializeAdUnits();
  }

  static getInstance(): AdManager {
    if (!AdManager.instance) {
      AdManager.instance = new AdManager();
    }
    return AdManager.instance;
  }

  private initializeAdUnits(): void {
    if (Platform.OS === 'ios') {
      this.adUnits = {
        rewarded: 'YOUR_IOS_REWARDED_AD_UNIT_ID',
        interstitial: 'YOUR_IOS_INTERSTITIAL_AD_UNIT_ID',
        banner: 'YOUR_IOS_BANNER_AD_UNIT_ID'
      };
    } else {
      this.adUnits = {
        rewarded: 'YOUR_ANDROID_REWARDED_AD_UNIT_ID',
        interstitial: 'YOUR_ANDROID_INTERSTITIAL_AD_UNIT_ID',
        banner: 'YOUR_ANDROID_BANNER_AD_UNIT_ID'
      };
    }
  }

  async initialize(): Promise<void> {
    try {
      const sdkKey = Platform.OS === 'ios' 
        ? 'YOUR_IOS_SDK_KEY'
        : 'YOUR_ANDROID_SDK_KEY';

      await AppLovinMAX.initialize(sdkKey);
      
      // Set privacy settings
      await this.setPrivacySettings();
      
      // Load ads
      await this.preloadAds();
      
      this.isInitialized = true;
      console.log('AdManager initialized successfully');
    } catch (error) {
      console.error('AdManager initialization failed:', error);
      throw new Error('Ad SDK initialization failed');
    }
  }

  private async setPrivacySettings(): Promise<void> {
    const hasConsent = await SecurityService.getUserConsent();
    const isAgeRestricted = await SecurityService.isUserAgeRestricted();
    
    AppLovinMAX.setHasUserConsent(hasConsent);
    AppLovinMAX.setIsAgeRestrictedUser(isAgeRestricted);
    AppLovinMAX.setDoNotSell(!hasConsent);
  }

  private async preloadAds(): Promise<void> {
    try {
      await Promise.all([
        AppLovinMAX.loadRewardedAd(this.adUnits.rewarded),
        AppLovinMAX.loadInterstitial(this.adUnits.interstitial)
      ]);
    } catch (error) {
      console.error('Failed to preload ads:', error);
    }
  }

  async showRewardedVideo(placement: string): Promise<AdReward> {
    if (!this.isInitialized) {
      throw new Error('AdManager not initialized');
    }

    try {
      const isReady = await AppLovinMAX.isRewardedAdReady(this.adUnits.rewarded);
      
      if (!isReady) {
        await AppLovinMAX.loadRewardedAd(this.adUnits.rewarded);
        throw new Error('No rewarded ad available');
      }

      const result = await AppLovinMAX.showRewardedAd(this.adUnits.rewarded);
      
      if (result.didRewardUser) {
        const reward: AdReward = {
          type: this.getRewardType(placement),
          value: this.getRewardValue(placement),
          duration: this.getRewardDuration(placement),
          timestamp: Date.now()
        };

        // Track ad completion
        this.trackAdCompletion('rewarded', placement, true);
        
        // Preload next ad
        AppLovinMAX.loadRewardedAd(this.adUnits.rewarded);
        
        return reward;
      } else {
        throw new Error('User did not complete ad');
      }
    } catch (error) {
      this.trackAdCompletion('rewarded', placement, false);
      console.error('Rewarded video error:', error);
      throw error;
    }
  }

  async showInterstitial(placement: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('AdManager not initialized');
    }

    try {
      const isReady = await AppLovinMAX.isInterstitialReady(this.adUnits.interstitial);
      
      if (isReady) {
        await AppLovinMAX.showInterstitial(this.adUnits.interstitial);
        this.trackAdCompletion('interstitial', placement, true);
        
        // Preload next ad
        AppLovinMAX.loadInterstitial(this.adUnits.interstitial);
      }
    } catch (error) {
      this.trackAdCompletion('interstitial', placement, false);
      console.error('Interstitial ad error:', error);
    }
  }

  private getRewardType(placement: string): AdReward['type'] {
    switch (placement) {
      case 'pre_pulse':
        return 'power_multiplier';
      case 'post_pulse':
        return 'extra_pulse';
      case 'premium_unlock':
        return 'premium_access';
      default:
        return 'power_multiplier';
    }
  }

  private getRewardValue(placement: string): number {
    switch (placement) {
      case 'pre_pulse':
        return 2.0; // 2x multiplier
      case 'post_pulse':
        return 1.0; // 1 extra pulse
      case 'premium_unlock':
        return 1.0; // Premium access
      default:
        return 1.5;
    }
  }

  private getRewardDuration(placement: string): number {
    switch (placement) {
      case 'pre_pulse':
        return 300000; // 5 minutes
      case 'post_pulse':
        return 0; // Instant
      case 'premium_unlock':
        return 86400000; // 24 hours
      default:
        return 300000;
    }
  }

  private trackAdCompletion(type: string, placement: string, success: boolean): void {
    // Analytics tracking would go here
    console.log(`Ad completion: ${type} - ${placement} - ${success ? 'success' : 'failed'}`);
  }

  async isRewardedAdReady(): Promise<boolean> {
    if (!this.isInitialized) return false;
    return AppLovinMAX.isRewardedAdReady(this.adUnits.rewarded);
  }

  async isInterstitialReady(): Promise<boolean> {
    if (!this.isInitialized) return false;
    return AppLovinMAX.isInterstitialReady(this.adUnits.interstitial);
  }
}