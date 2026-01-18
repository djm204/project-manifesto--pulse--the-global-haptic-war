export class AdSession {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly adProvider: string,
    public readonly adType: 'rewarded' | 'interstitial',
    public readonly startedAt: Date,
    public completedAt?: Date,
    public readonly rewardAmount?: number
  ) {
    this.validateProvider();
    this.validateReward();
  }

  private validateProvider(): void {
    const validProviders = ['applovin', 'admob', 'unity'];
    if (!validProviders.includes(this.adProvider.toLowerCase())) {
      throw new Error('Invalid ad provider');
    }
  }

  private validateReward(): void {
    if (this.adType === 'rewarded' && (!this.rewardAmount || this.rewardAmount <= 0)) {
      throw new Error('Rewarded ads must have a positive reward amount');
    }
  }

  complete(): AdSession {
    if (this.completedAt) {
      throw new Error('Ad session already completed');
    }
    return new AdSession(
      this.id,
      this.userId,
      this.adProvider,
      this.adType,
      this.startedAt,
      new Date(),
      this.rewardAmount
    );
  }

  getDuration(): number {
    if (!this.completedAt) return 0;
    return this.completedAt.getTime() - this.startedAt.getTime();
  }

  isCompleted(): boolean {
    return !!this.completedAt;
  }
}