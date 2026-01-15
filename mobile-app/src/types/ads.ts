export interface AdConfig {
  enabled: boolean;
  rewardedVideoId: string;
  interstitialId: string;
  bannerIds: string[];
  testMode: boolean;
}

export interface AdEvent {
  type: 'impression' | 'click' | 'reward' | 'close';
  adUnit: string;
  timestamp: number;
  revenue?: number;
  userId: string;
}

export interface RewardedAdResult {
  success: boolean;
  reward?: {
    type: string;
    amount: number;
  };
  error?: string;
}

export interface AdMediationConfig {
  appLovinSdkKey: string;
  testDeviceIds: string[];
  gdprRequired: boolean;
  ccpaRequired: boolean;
}