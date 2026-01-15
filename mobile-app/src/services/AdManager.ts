import { Platform } from 'react-native';

interface AppLovinMAX {
  initialize(): Promise<boolean>;
  isRewardedAdReady(): Promise<boolean>;
  showRewardedAd(placement: string): Promise<boolean>;
  isInterstitialAdReady(): Promise<boolean>;
  showInterstitialAd(): Promise<void>;
  loadRewardedAd(): Promise<void>;
  loadInterstitialAd(): Promise<void>;
}

declare const AppLovinMAX: AppLovinMAX;

export class AdManager {
  private maxSdk: AppLovinMAX;
  private isInitialized: boolean = false;
  private adUnits = {
    rewarded: Platform.OS === 'ios' ? 'ios_rewarded_unit_id' : 'android_rewarded_unit_id',
    interstitial: Platform.OS === 'ios' ? 'ios_interstitial_unit_id' : 'android_interstitial_unit_id',
  };

  constructor() {
    this.maxSdk = AppLovinMAX;
  }

  async initializeSDK(): Promise<void> {
    try {
      const initialized = await this.maxSdk.initialize();
      if (initialized) {
        this.isInitialized = true;
        await this.setupAdUnits();
        console.log('AppLovin MAX SDK initialized successfully');
      } else {
        throw new Error('Failed to initialize AppLovin MAX SDK');
      }
    } catch (error) {
      console.error('AdManager initialization failed:', error);
      throw error;
    }
  }

  private async setupAdUnits(): Promise<void> {
    try {
      await Promise.all([
        this.maxSdk.loadRewardedAd(),
        this.maxSdk.loadInterstitialAd(),
      ]);
    } catch (error) {
      console.error('Failed to load ad units:', error);
    }
  }

  async showRewardedAd(placement: 'pre_pulse' | 'cooldown_bypass'): Promise<boolean> {
    if (!this.isInitialized) {
      console.warn('SDK not initialized');
      return false;
    }

    try {
      const adReady = await this.maxSdk.isRewardedAdReady();
      if (adReady) {
        const result = await this.maxSdk.showRewardedAd(placement);
        // Preload next ad
        this.maxSdk.loadRewardedAd().catch(console.error);
        return result;
      }
      return false;
    } catch (error) {
      console.error('Failed to show rewarded ad:', error);
      return false;
    }
  }

  async showInterstitialAd(): Promise<void> {
    if (!this.isInitialized) {
      console.warn('SDK not initialized');
      return;
    }

    try {
      const adReady = await this.maxSdk.isInterstitialAdReady();
      if (adReady) {
        await this.maxSdk.showInterstitialAd();
        // Preload next ad
        this.maxSdk.loadInterstitialAd().catch(console.error);
      }
    } catch (error) {
      console.error('Failed to show interstitial ad:', error);
    }
  }

  async preloadAds(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      await Promise.all([
        this.maxSdk.loadRewardedAd(),
        this.maxSdk.loadInterstitialAd(),
      ]);
    } catch (error) {
      console.error('Failed to preload ads:', error);
    }
  }
}