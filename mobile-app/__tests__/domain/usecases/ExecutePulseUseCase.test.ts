import { ExecutePulseUseCase } from '../../../src/domain/usecases/ExecutePulseUseCase';
import { IPulseRepository } from '../../../src/domain/repositories/IPulseRepository';
import { SecurityGateway } from '../../../src/application/services/SecurityGateway';
import { HapticService } from '../../../src/services/HapticService';
import { PulseType } from '../../../src/domain/entities/Pulse';

jest.mock('../../../src/application/services/SecurityGateway');
jest.mock('../../../src/services/HapticService');

describe('ExecutePulseUseCase', () => {
  let useCase: ExecutePulseUseCase;
  let mockPulseRepository: jest.Mocked<IPulseRepository>;
  let mockSecurityGateway: jest.Mocked<SecurityGateway>;
  let mockHapticService: jest.Mocked<HapticService>;

  beforeEach(() => {
    mockPulseRepository = {
      save: jest.fn(),
      findNearby: jest.fn(),
      findByUserId: jest.fn()
    };

    mockSecurityGateway = new SecurityGateway() as jest.Mocked<SecurityGateway>;
    mockHapticService = new HapticService() as jest.Mocked<HapticService>;

    useCase = new ExecutePulseUseCase(
      mockPulseRepository,
      mockSecurityGateway,
      mockHapticService
    );
  });

  it('should execute pulse successfully with valid input', async () => {
    const input = {
      userId: 'user-123',
      type: PulseType.TAP,
      intensity: 75,
      location: { latitude: 37.7749, longitude: -122.4194 },
      deviceFingerprint: 'device-456'
    };

    mockSecurityGateway.validateInput.mockResolvedValue(true);
    mockSecurityGateway.checkRateLimit.mockResolvedValue(true);
    mockPulseRepository.findNearby.mockResolvedValue([]);
    mockPulseRepository.save.mockResolvedValue();
    mockHapticService.triggerHaptic.mockResolvedValue();

    const result = await useCase.execute(input);

    expect(result.success).toBe(true);
    expect(result.pulseId).toBeDefined();
    expect(result.amplificationScore).toBe(0);
    expect(mockSecurityGateway.validateInput).toHaveBeenCalledWith(input);
    expect(mockHapticService.triggerHaptic).toHaveBeenCalled();
  });

  it('should reject invalid input', async () => {
    const input = {
      userId: '',
      type: PulseType.TAP,
      intensity: 75,
      location: { latitude: 37.7749, longitude: -122.4194 },
      deviceFingerprint: 'device-456'
    };

    mockSecurityGateway.validateInput.mockResolvedValue(false);

    const result = await useCase.execute(input);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input data');
    expect(mockPulseRepository.save).not.toHaveBeenCalled();
  });

  it('should handle rate limiting', async () => {
    const input = {
      userId: 'user-123',
      type: PulseType.TAP,
      intensity: 75,
      location: { latitude: 37.7749, longitude: -122.4194 },
      deviceFingerprint: 'device-456'
    };

    mockSecurityGateway.validateInput.mockResolvedValue(true);
    mockSecurityGateway.checkRateLimit.mockResolvedValue(false);

    const result = await useCase.execute(input);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Rate limit exceeded');
  });

  it('should calculate amplification score with nearby pulses', async () => {
    const input = {
      userId: 'user-123',
      type: PulseType.TAP,
      intensity: 50,
      location: { latitude: 37.7749, longitude: -122.4194 },
      deviceFingerprint: 'device-456'
    };

    const nearbyPulses = [
      { intensity: 60, timestamp: Date.now() - 1000 },
      { intensity: 40, timestamp: Date.now() - 2000 }
    ];

    mockSecurityGateway.validateInput.mockResolvedValue(true);
    mockSecurityGateway.checkRateLimit.mockResolvedValue(true);
    mockPulseRepository.findNearby.mockResolvedValue(nearbyPulses);
    mockPulseRepository.save.mockResolvedValue();
    mockHapticService.triggerHaptic.mockResolvedValue();

    const result = await useCase.execute(input);

    expect(result.success).toBe(true);
    expect(result.amplificationScore).toBe(100); // Min of (2 * 50, 100)
  });

  it('should handle repository errors gracefully', async () => {
    const input = {
      userId: 'user-123',
      type: PulseType.TAP,
      intensity: 75,
      location: { latitude: 37.7749, longitude: -122.4194 },
      deviceFingerprint: 'device-456'
    };

    mockSecurityGateway.validateInput.mockResolvedValue(true);
    mockSecurityGateway.checkRateLimit.mockResolvedValue(true);
    mockPulseRepository.findNearby.mockRejectedValue(new Error('Database error'));

    const result = await useCase.execute(input);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to execute pulse');
  });
});