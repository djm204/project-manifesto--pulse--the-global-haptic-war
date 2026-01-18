import { AdConfig } from './AdManager';

export class InterstitialAdService {
  private config: AdConfig;
  private loadedCount = 0;
  private isLoaded = false;
  private lastShownTime = 0;
  private readonly MIN_INTERVAL = 30000; // 30 seconds between interstitials

  constructor(config: AdConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      // Initialize interstitial ad providers
      console.log('Initializing interstitial ad service');
    } catch (error) {
      throw new Error(`Interstitial ad service initialization failed: ${error}`);
    }
  }

  async preload(): Promise<void> {
    try {
      this.isLoaded = true;
      this.loadedCount++;
    } catch (error) {
      throw new Error(`Failed to preload interstitial ad: ${error}`);
    }
  }

  async show(placement: string): Promise<boolean> {
    const now = Date.now();
    
    // Respect minimum interval between ads
    if (now - this.lastShownTime < this.MIN_INTERVAL) {
      return false;
    }

    if (!this.isLoaded) {
      await this.preload();
    }

    try {
      this.isLoaded = false;
      this.lastShownTime = now;
      
      // Preload next ad
      this.preload().catch(console.error);
      
      return true;
    } catch (error) {
      console.error('Failed to show interstitial ad:', error);
      return false;
    }
  }

  getLoadedCount(): number {
    return this.loadedCount;
  }

  canShowAd(): boolean {
    const now = Date.now();
    return this.isLoaded && (now - this.lastShownTime >= this.MIN_INTERVAL);
  }
}