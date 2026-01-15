import { HapticService } from '../../src/services/HapticService';
import { HapticFeedback } from 'react-native-haptic-feedback';

// Mock react-native-haptic-feedback
jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
  HapticFeedbackTypes: {
    impactLight: 'impactLight',
    impactMedium: 'impactMedium',
    impactHeavy: 'impactHeavy',
    selection: 'selection',
  },
}));

describe('HapticService', () => {
  let hapticService: HapticService;

  beforeEach(() => {
    hapticService = new HapticService();
    jest.clearAllMocks();
  });

  describe('triggerPulse', () => {
    it('should trigger light haptic for tap pattern', async () => {
      await hapticService.triggerPulse('tap', 0.5);
      
      expect(HapticFeedback.trigger).toHaveBeenCalledWith('impactLight', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    });

    it('should trigger heavy haptic for shatter pattern with high intensity', async () => {
      await hapticService.triggerPulse('shatter', 0.9);
      
      expect(HapticFeedback.trigger).toHaveBeenCalledWith('impactHeavy', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    });

    it('should handle invalid pattern gracefully', async () => {
      await hapticService.triggerPulse('invalid' as any, 0.5);
      
      expect(HapticFeedback.trigger).toHaveBeenCalledWith('impactMedium', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    });

    it('should clamp intensity values', async () => {
      await hapticService.triggerPulse('tap', 2.0);
      
      expect(HapticFeedback.trigger).toHaveBeenCalledWith('impactMedium', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    });
  });

  describe('triggerSequence', () => {
    it('should trigger sequence of haptic patterns', async () => {
      const sequence = [
        { pattern: 'tap' as const, intensity: 0.3, delay: 100 },
        { pattern: 'swirl' as const, intensity: 0.7, delay: 200 },
      ];

      await hapticService.triggerSequence(sequence);

      expect(HapticFeedback.trigger).toHaveBeenCalledTimes(2);
    });

    it('should handle empty sequence', async () => {
      await hapticService.triggerSequence([]);
      
      expect(HapticFeedback.trigger).not.toHaveBeenCalled();
    });
  });

  describe('isSupported', () => {
    it('should return haptic support status', () => {
      const isSupported = hapticService.isSupported();
      
      expect(typeof isSupported).toBe('boolean');
    });
  });
});