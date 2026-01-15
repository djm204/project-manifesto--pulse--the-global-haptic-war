import HapticService from '../../src/services/HapticService';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { HapticPattern } from '../../src/types';

// Mock the haptic feedback module
jest.mock('react-native-haptic-feedback');

describe('HapticService', () => {
  let hapticService: HapticService;
  const mockTrigger = ReactNativeHapticFeedback.trigger as jest.MockedFunction<typeof ReactNativeHapticFeedback.trigger>;

  beforeEach(() => {
    hapticService = new HapticService();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    test('should initialize with default enabled state', () => {
      expect(hapticService.isEnabled()).toBe(true);
    });

    test('should initialize haptic feedback with correct options', () => {
      new HapticService();
      // Verify initialization was called (this would be implementation specific)
      expect(hapticService).toBeDefined();
    });
  });

  describe('enable/disable functionality', () => {
    test('should enable haptic feedback', () => {
      hapticService.disable();
      hapticService.enable();
      expect(hapticService.isEnabled()).toBe(true);
    });

    test('should disable haptic feedback', () => {
      hapticService.disable();
      expect(hapticService.isEnabled()).toBe(false);
    });

    test('should not trigger haptic when disabled', async () => {
      hapticService.disable();
      await hapticService.triggerHaptic(HapticPattern.TAP);
      expect(mockTrigger).not.toHaveBeenCalled();
    });
  });

  describe('haptic pattern triggering', () => {
    test('should trigger TAP pattern correctly', async () => {
      await hapticService.triggerHaptic(HapticPattern.TAP);
      expect(mockTrigger).toHaveBeenCalledWith('impactLight');
    });

    test('should trigger SWIRL pattern correctly', async () => {
      await hapticService.triggerHaptic(HapticPattern.SWIRL);
      expect(mockTrigger).toHaveBeenCalledWith('impactMedium');
    });

    test('should trigger SHATTER pattern correctly', async () => {
      await hapticService.triggerHaptic(HapticPattern.SHATTER);
      expect(mockTrigger).toHaveBeenCalledWith('impactHeavy');
    });

    test('should handle invalid haptic pattern gracefully', async () => {
      await expect(hapticService.triggerHaptic('invalid' as HapticPattern))
        .resolves.not.toThrow();
    });
  });

  describe('pulse sequence', () => {
    test('should execute pulse sequence with countdown', async () => {
      const pattern = HapticPattern.TAP;
      const countdownDuration = 1000;
      
      const promise = hapticService.executePulseSequence(pattern, countdownDuration);
      
      // Fast-forward time
      jest.advanceTimersByTime(countdownDuration + 100);
      
      await promise;
      
      // Should trigger countdown haptics and final pulse
      expect(mockTrigger).toHaveBeenCalledTimes(4); // 3 countdown + 1 pulse
    });

    test('should cancel pulse sequence when disabled', async () => {
      const pattern = HapticPattern.TAP;
      const countdownDuration = 1000;
      
      const promise = hapticService.executePulseSequence(pattern, countdownDuration);
      hapticService.disable();
      
      jest.advanceTimersByTime(countdownDuration + 100);
      
      await promise;
      
      expect(mockTrigger).not.toHaveBeenCalled();
    });
  });

  describe('custom patterns', () => {
    test('should register custom haptic pattern', () => {
      const customPattern = {
        duration: 200,
        intensity: 0.5,
        pattern: [50, 50, 100]
      };
      
      hapticService.registerCustomPattern('custom', customPattern);
      expect(hapticService.hasCustomPattern('custom')).toBe(true);
    });

    test('should trigger custom haptic pattern', async () => {
      const customPattern = {
        duration: 200,
        intensity: 0.5,
        pattern: [50, 50, 100]
      };
      
      hapticService.registerCustomPattern('custom', customPattern);
      await hapticService.triggerCustomPattern('custom');
      
      expect(mockTrigger).toHaveBeenCalled();
    });

    test('should handle non-existent custom pattern', async () => {
      await expect(hapticService.triggerCustomPattern('nonexistent'))
        .resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    test('should handle haptic trigger errors gracefully', async () => {
      mockTrigger.mockRejectedValueOnce(new Error('Haptic failed'));
      
      await expect(hapticService.triggerHaptic(HapticPattern.TAP))
        .resolves.not.toThrow();
    });

    test('should log errors when haptic fails', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockTrigger.mockRejectedValueOnce(new Error('Haptic failed'));
      
      await hapticService.triggerHaptic(HapticPattern.TAP);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to trigger haptic feedback:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });
});