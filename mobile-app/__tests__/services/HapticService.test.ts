import { HapticService } from '../../src/services/HapticService';
import { HapticIntensity, PulsePattern } from '../../src/types/pulse';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

jest.mock('react-native-haptic-feedback');

describe('HapticService', () => {
  let hapticService: HapticService;
  const mockTrigger = ReactNativeHapticFeedback.trigger as jest.Mock;

  beforeEach(() => {
    hapticService = new HapticService();
    jest.clearAllMocks();
  });

  describe('executePulse', () => {
    it('should execute light tap pulse', async () => {
      await hapticService.executePulse(HapticIntensity.Light, PulsePattern.Tap);
      
      expect(mockTrigger).toHaveBeenCalledWith('impactLight', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    });

    it('should execute medium swirl pulse', async () => {
      await hapticService.executePulse(HapticIntensity.Medium, PulsePattern.Swirl);
      
      expect(mockTrigger).toHaveBeenCalledWith('impactMedium', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    });

    it('should execute heavy shatter pulse', async () => {
      await hapticService.executePulse(HapticIntensity.Heavy, PulsePattern.Shatter);
      
      expect(mockTrigger).toHaveBeenCalledWith('impactHeavy', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    });

    it('should handle haptic failure gracefully', async () => {
      mockTrigger.mockRejectedValueOnce(new Error('Haptic failed'));
      
      await expect(
        hapticService.executePulse(HapticIntensity.Light, PulsePattern.Tap)
      ).resolves.not.toThrow();
    });
  });

  describe('isHapticAvailable', () => {
    it('should return availability status', () => {
      const available = hapticService.isHapticAvailable();
      expect(typeof available).toBe('boolean');
    });
  });

  describe('generatePattern', () => {
    it('should generate correct pattern for tap', () => {
      const pattern = hapticService.generatePattern(PulsePattern.Tap, HapticIntensity.Light);
      expect(pattern.type).toBe('impactLight');
      expect(pattern.duration).toBe(100);
    });

    it('should generate correct pattern for swirl', () => {
      const pattern = hapticService.generatePattern(PulsePattern.Swirl, HapticIntensity.Medium);
      expect(pattern.type).toBe('impactMedium');
      expect(pattern.duration).toBe(300);
    });

    it('should generate correct pattern for shatter', () => {
      const pattern = hapticService.generatePattern(PulsePattern.Shatter, HapticIntensity.Heavy);
      expect(pattern.type).toBe('impactHeavy');
      expect(pattern.duration).toBe(500);
    });
  });
});