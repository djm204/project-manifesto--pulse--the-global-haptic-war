import { AdConfig } from './AdManager';

export class RewardedAdService {
  private config: AdConfig;
  private loadedCount = 0;
  private isLoaded = false;

  constructor(config: AdConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      // Initialize Unity Ads and AdMob SDKs
      // This would contain actual SDK initialization code
      console.log('Initializing rewarded ad service');
    } catch (error) {
      throw new Error(`Rewarded ad service initialization failed: ${error}`);
    }
  }

  async preload(): Promise<void> {
    try {
      // Preload ad from primary provider
      this.isLoaded = true;
      this.loadedCount++;
    } catch (error) {
      throw new Error(`Failed to preload rewarded ad: ${error}`);
    }
  }

  async show(placement: string): Promise<boolean> {
    if (!this.isLoaded) {
      await this.preload();
    }

    try {
      // Show the ad
      this.isLoaded = false;
      
      // Preload next ad
      this.preload().catch(console.error);
      
      return true;
    } catch (error) {
      console.error('Failed to show rewarded ad:', error);
      return false;
    }
  }

  getLoadedCount(): number {
    return this.loadedCount;
  }

  isAdLoaded(): boolean {
    return this.isLoaded;
  }
}