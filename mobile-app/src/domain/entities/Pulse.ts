import { PulseType, Location } from '../../shared/types';

export class Pulse {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly type: PulseType,
    public readonly intensity: number,
    public readonly location: Location | null,
    public readonly timestamp: Date,
    public readonly sessionId?: string
  ) {
    this.validateIntensity();
    this.validateTimestamp();
  }

  private validateIntensity(): void {
    if (this.intensity < 0 || this.intensity > 100) {
      throw new Error('Intensity must be between 0 and 100');
    }
  }

  private validateTimestamp(): void {
    if (this.timestamp > new Date()) {
      throw new Error('Timestamp cannot be in the future');
    }
  }

  isValidIntensity(): boolean {
    return this.intensity >= 0 && this.intensity <= 100;
  }

  calculateGlobalImpact(): number {
    return this.intensity * this.getTypeMultiplier();
  }

  private getTypeMultiplier(): number {
    switch (this.type) {
      case PulseType.TAP: return 1.0;
      case PulseType.SWIRL: return 1.5;
      case PulseType.SHATTER: return 2.0;
      default: return 1.0;
    }
  }
}