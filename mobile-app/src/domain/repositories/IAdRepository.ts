import { AdReward } from '../entities/AdReward';

export interface IAdRepository {
  saveReward(reward: AdReward): Promise<void>;
  getUserRewards(userId: string): Promise<AdReward[]>;
  getRewardStats(userId: string): Promise<RewardStats>;
}

export interface RewardStats {
  totalRewards: number;
  totalValue: number;
  lastRewardDate: Date | null;
}