import { AdReward, AdProvider, RewardType } from '../entities/AdReward';
import { IAdRepository } from '../repositories/IAdRepository';
import { AdMediationManager } from '../../application/services/AdMediationManager';
import { SecurityGateway } from '../../application/services/SecurityGateway';

export class LoadRewardedAdUseCase {
  constructor(
    private adRepository: IAdRepository,
    private adMediationManager: AdMediationManager,
    private securityGateway: SecurityGateway
  ) {}

  async execute(input: LoadRewardedAdInput): Promise<LoadRewardedAdOutput> {
    // Validate user and check fraud prevention
    await this.securityGateway.validateUser(input.userId);
    await this.securityGateway.checkAdFraud(input.userId);
    
    try {
      // Load ad with fallback strategy
      const adResult = await this.adMediationManager.loadRewardedAd({
        userId: input.userId,
        placement: input.placement,
        timeout: 100 // 100ms timeout for RTB
      });
      
      if (!adResult.success) {
        return {
          success: false,
          error: 'No ads available',
          fallbackReward: null
        };
      }
      
      // Show ad and wait for completion
      const showResult = await this.adMediationManager.showRewardedAd(adResult.adId);
      
      if (showResult.completed) {
        // Create reward
        const reward: AdReward = {
          id: require('crypto').randomUUID(),
          userId: input.userId,
          adProvider: adResult.provider,
          rewardType: input.rewardType,
          amount: this.calculateRewardAmount(input.rewardType),
          timestamp: new Date(),
          adId: adResult.adId
        };
        
        await this.adRepository.saveReward(reward);
        
        return {
          success: true,
          reward,
          error: null,
          fallbackReward: null
        };
      }
      
      return {
        success: false,
        error: 'Ad not completed',
        fallbackReward: null
      };
      
    } catch (error) {
      // Provide fallback reward for critical user experience
      const fallbackReward = await this.provideFallbackReward(input);
      
      return {
        success: false,
        error: error.message,
        fallbackReward
      };
    }
  }
  
  private calculateRewardAmount(rewardType: RewardType): number {
    switch (rewardType) {
      case RewardType.PULSE_MULTIPLIER:
        return 2;
      case RewardType.BONUS_POINTS:
        return 100;
      case RewardType.UNLOCK_FEATURE:
        return 1;
      default:
        return 0;
    }
  }
  
  private async provideFallbackReward(input: LoadRewardedAdInput): Promise<AdReward | null> {
    // Provide limited fallback rewards to maintain user experience
    const rewardStats = await this.adRepository.getRewardStats(input.userId);
    
    if (rewardStats.totalRewards < 3) { // Max 3 fallback rewards per user
      return {
        id: require('crypto').randomUUID(),
        userId: input.userId,
        adProvider: AdProvider.APPLOVIN, // Default provider
        rewardType: input.rewardType,
        amount: Math.floor(this.calculateRewardAmount(input.rewardType) * 0.5), // 50% of normal reward
        timestamp: new Date(),
        adId: 'fallback-' + Date.now()
      };
    }
    
    return null;
  }
}

export interface LoadRewardedAdInput {
  userId: string;
  placement: string;
  rewardType: RewardType;
}

export interface LoadRewardedAdOutput {
  success: boolean;
  reward?: AdReward;
  error: string | null;
  fallbackReward: AdReward | null;
}