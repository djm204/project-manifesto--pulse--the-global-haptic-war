import { AppLovinMAX } from 'react-native-applovin-max';
import { Platform } from 'react-native';

export interface AdConfig {
  sdkKey: string;
  rewardedAdUnitId: string;
  interstitialAdUnitId: string;
  bannerAdUnitId: string;
}

export interface AdReward {
  type: 'rewarded_video' | 'interstitial';
  amount: number;
  currency: string;
  adId: string;
}

class AdManager {
  private isInitialized: boolean = false;
  private config: AdConfig;
  private rewardedAdLoaded: boolean = false;
  private interstitialAdLoaded: boolean = false;

  constructor() {
    this.config = {
      sdkKey: Platform.select({
        ios: process.env.EXPO_PUBLIC_APPLOVIN_SDK_KEY_IOS || '',
        android: process.env.EXPO_PUBLIC_APPLOVIN_SDK_KEY_ANDROID || '',
      }) || '',
      rewardedAdUnitId: Platform.select({
        ios: process.env.EXPO_PUBLIC_REWARDED_AD_UNIT_ID_IOS || '',
        android: process.env.EXPO_PUBLIC_REWARDED_AD_UNIT_ID_ANDROID || '',
      }) || '',
      interstitialAdUnitId: Platform.select({
        ios: process.env.EXPO_PUBLIC_INTERSTITIAL_AD_UNIT_ID_IOS || '',
        android: process.env.EXPO_PUBLIC_INTERSTITIAL_AD_UNIT_ID_ANDROID || '',
      }) || '',
      bannerAdUnitId: Platform.select({
        ios: process.env.EXPO_PUBLIC_BANNER_AD_UNIT_ID_IOS || '',
        android: process.env.EXPO_PUBLIC_BANNER_AD_UNIT_ID_ANDROID || '',
      }) || '',
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await AppLovinMAX.initialize(this.config.sdkKey);
      
      // Set up ad event listeners
      this.setupEventListeners();
      
      // Preload ads
      await this.preloadAds();
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize AdManager:', error);
      throw error;
    }
  }

  private setupEventListeners(): void {
    // Rewarded ad events
    AppLovinMAX.addEventListener('OnRewardedAdLoadedEvent', () => {
      this.rewardedAdLoaded = true;
    });

    AppLovinMAX.addEventListener('OnRewardedAdLoadFailedEvent', (error) => {
      console.error('Rewarded ad failed to load:', error);
      this.rewardedAdLoaded = false;
    });

    AppLovinMAX.addEventListener('OnRewardedAdDisplayedEvent', () => {
      console.log('Rewarded ad displayed');
    });

    AppLovinMAX.addEventListener('OnRewardedAdHiddenEvent', () => {
      console.log('Rewarded ad hidden');
      this.rewardedAdLoaded = false;
      this.loadRewardedAd(); // Preload next ad
    });

    // Interstitial ad events
    AppLovinMAX.addEventListener('OnInterstitialLoadedEvent', () => {
      this.interstitialAdLoaded = true;
    });

    AppLovinMAX.addEventListener('OnInterstitialLoadFailedEvent', (error) => {
      console.error('Interstitial ad failed to load:', error);
      this.interstitialAdLoaded = false;
    });

    AppLovinMAX.addEventListener('OnInterstitialHiddenEvent', () => {
      this.interstitialAdLoaded = false;
      this.loadInterstitialAd(); // Preload next ad
    });
  }

  private async preloadAds(): Promise<void> {
    await Promise.all([
      this.loadRewardedAd(),
      this.loadInterstitialAd(),
    ]);
  }

  async loadRewardedAd(): Promise<void> {
    try {
      await AppLovinMAX.loadRewardedAd(this.config.rewardedAdUnitId);
    } catch (error) {
      console.error('Failed to load rewarded ad:', error);
    }
  }

  async loadInterstitialAd(): Promise<void> {
    try {
      await AppLovinMAX.loadInterstitial(this.config.interstitialAdUnitId);
    } catch (error) {
      console.error('Failed to load interstitial ad:', error);
    }
  }

  async showRewardedAd(): Promise<AdReward | null> {
    if (!this.isInitialized || !this.rewardedAdLoaded) {
      throw new Error('Rewarded ad not ready');
    }

    return new Promise((resolve, reject) => {
      const rewardListener = (reward: any) => {
        AppLovinMAX.removeEventListener('OnRewardedAdReceivedRewardEvent', rewardListener);
        resolve({
          type: 'rewarded_video',
          amount: reward.amount || 100,
          currency: reward.label || 'coins',
          adId: `reward_${Date.now()}`,
        });
      };

      const errorListener = (error: any) => {
        AppLovinMAX.removeEventListener('OnRewardedAdFailedToDisplayEvent', errorListener);
        reject(new Error(`Failed to show rewarded ad: ${error.message}`));
      };

      AppLovinMAX.addEventListener('OnRewardedAdReceivedRewardEvent', rewardListener);
      AppLovinMAX.addEventListener('OnRewardedAdFailedToDisplayEvent', errorListener);

      AppLovinMAX.showRewardedAd(this.config.rewardedAdUnitId);
    });
  }

  async showInterstitialAd(): Promise<void> {
    if (!this.isInitialized || !this.interstitialAdLoaded) {
      throw new Error('Interstitial ad not ready');
    }

    await AppLovinMAX.showInterstitial(this.config.interstitialAdUnitId);
  }

  isRewardedAdReady(): boolean {
    return this.isInitialized && this.rewardedAdLoaded;
  }

  isInterstitialAdReady(): boolean {
    return this.isInitialized && this.interstitialAdLoaded;
  }
}

export default new AdManager();