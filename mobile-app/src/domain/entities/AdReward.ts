export interface AdReward {
  readonly id: string;
  readonly userId: string;
  readonly adProvider: AdProvider;
  readonly rewardType: RewardType;
  readonly amount: number;
  readonly timestamp: Date;
  readonly adId: string;
}

export enum AdProvider {
  APPLOVIN = 'APPLOVIN',
  UNITY = 'UNITY',
  ADMOB = 'ADMOB',
  INMOBI = 'INMOBI'
}

export enum RewardType {
  PULSE_MULTIPLIER = 'PULSE_MULTIPLIER',
  BONUS_POINTS = 'BONUS_POINTS',
  UNLOCK_FEATURE = 'UNLOCK_FEATURE'
}