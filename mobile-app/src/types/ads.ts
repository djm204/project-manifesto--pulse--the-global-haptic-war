export interface AdConfig {
  enabled: boolean;
  networks: AdNetwork[];
  placements: AdPlacement[];
  frequency: AdFrequency;
}

export interface AdNetwork {
  id: string;
  name: string;
  priority: number;
  enabled: boolean;
  config: Record<string, any>;
}

export interface AdPlacement {
  id: string;
  type: AdType;
  position: AdPosition;
  timing: AdTiming;
  rewards?: AdReward[];
}

export interface AdReward {
  type: string;
  amount: number;
  description: string;
}

export interface AdFrequency {
  rewardedVideo: number; // minutes between rewarded videos
  interstitial: number; // pulses between interstitials
  banner: boolean; // show banner ads
}

export enum AdType {
  REWARDED_VIDEO = 'rewarded_video',
  INTERSTITIAL = 'interstitial',
  BANNER = 'banner',
  PLAYABLE = 'playable'
}

export enum AdPosition {
  PRE_PULSE = 'pre_pulse',
  POST_PULSE = 'post_pulse',
  MAIN_MENU = 'main_menu',
  LEADERBOARD = 'leaderboard'
}

export enum AdTiming {
  IMMEDIATE = 'immediate',
  DELAYED = 'delayed',
  ON_DEMAND = 'on_demand'
}

export interface AdMetrics {
  impressions: number;
  clicks: number;
  completions: number;
  revenue: number;
  ecpm: number;
  fillRate: number;
}