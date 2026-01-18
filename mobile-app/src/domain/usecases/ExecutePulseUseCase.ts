import { Pulse, PulseType } from '../entities/Pulse';
import { IPulseRepository } from '../repositories/IPulseRepository';
import { SecurityGateway } from '../../application/services/SecurityGateway';
import { HapticService } from '../../services/HapticService';

export class ExecutePulseUseCase {
  constructor(
    private pulseRepository: IPulseRepository,
    private securityGateway: SecurityGateway,
    private hapticService: HapticService
  ) {}

  async execute(input: ExecutePulseInput): Promise<ExecutePulseOutput> {
    // Validate input
    const validatedInput = await this.securityGateway.validatePulseInput(input);
    
    // Check rate limiting
    await this.securityGateway.checkRateLimit(validatedInput.userId);
    
    // Create pulse entity
    const pulse: Pulse = {
      id: this.generateSecureId(),
      userId: validatedInput.userId,
      type: validatedInput.type,
      timestamp: Date.now(),
      intensity: validatedInput.intensity,
      location: validatedInput.location,
      deviceFingerprint: validatedInput.deviceFingerprint
    };
    
    // Execute haptic feedback
    await this.hapticService.executeHaptic(pulse.type, pulse.intensity);
    
    // Save pulse
    await this.pulseRepository.save(pulse);
    
    return {
      pulseId: pulse.id,
      success: true,
      globalImpact: await this.calculateGlobalImpact(pulse)
    };
  }
  
  private generateSecureId(): string {
    return require('crypto').randomUUID();
  }
  
  private async calculateGlobalImpact(pulse: Pulse): Promise<number> {
    // Calculate impact based on nearby pulses and timing
    const nearbyPulses = await this.pulseRepository.findNearby(
      pulse.location.latitude,
      pulse.location.longitude,
      1000 // 1km radius
    );
    
    return Math.min(nearbyPulses.length * pulse.intensity, 100);
  }
}

export interface ExecutePulseInput {
  userId: string;
  type: PulseType;
  intensity: number;
  location: GeolocationCoordinates;
  deviceFingerprint: string;
}

export interface ExecutePulseOutput {
  pulseId: string;
  success: boolean;
  globalImpact: number;
}