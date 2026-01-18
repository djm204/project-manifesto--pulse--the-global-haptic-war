import { AdReward, AdProvider, RewardType } from '../../../src/domain/entities/AdReward';

describe('AdReward Entity', () => {
  const mockAdReward = {
    id: 'reward-123',
    userId: 'user-456',
    provider: AdProvider.APPLOVIN,
    rewardType: RewardType.PULSE_MULTIPLIER,
    amount: 2,
    timestamp: Date.now(),
    adId: 'ad-789'
  };

  it('should create a valid ad reward instance', () => {
    const reward = new AdReward(mockAdReward);
    
    expect(reward.id).toBe(mockAdReward.id);
    expect(reward.provider).toBe(AdProvider.APPLOVIN);
    expect(reward.rewardType).toBe(RewardType.PULSE_MULTIPLIER);
    expect(reward.amount).toBe(2);
  });

  it('should validate reward amount limits', () => {
    expect(() => new AdReward({ ...mockAdReward, amount: 0 }))
      .toThrow('Reward amount must be greater than 0');
    
    expect(() => new AdReward({ ...mockAdReward, amount: 1001 }))
      .toThrow('Reward amount exceeds maximum limit');
  });

  it('should validate provider enum', () => {
    expect(() => new AdReward({ ...mockAdReward, provider: 'INVALID' as AdProvider }))
      .toThrow('Invalid ad provider');
  });

  it('should calculate reward value based on type', () => {
    const multiplierReward = new AdReward({ ...mockAdReward, rewardType: RewardType.PULSE_MULTIPLIER });
    const pointsReward = new AdReward({ ...mockAdReward, rewardType: RewardType.BONUS_POINTS, amount: 100 });
    const powerReward = new AdReward({ ...mockAdReward, rewardType: RewardType.POWER_UP });

    expect(multiplierReward.getValue()).toBe(2);
    expect(pointsReward.getValue()).toBe(100);
    expect(powerReward.getValue()).toBe(1);
  });

  it('should validate required fields', () => {
    expect(() => new AdReward({ ...mockAdReward, userId: '' }))
      .toThrow('User ID is required');
    
    expect(() => new AdReward({ ...mockAdReward, adId: '' }))
      .toThrow('Ad ID is required');
  });
});