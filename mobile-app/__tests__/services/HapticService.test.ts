import { HapticService } from '../../src/services/HapticService';
import { PULSE_PATTERNS } from '../../src/utils/constants';

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

  describe('initialization', () => {
    it('should initialize with default settings', () => {
      expect(hapticService.isEnabled()).toBe(true);
    });

    it('should allow disabling haptics', () => {
      hapticService.setEnabled(false);
      expect(hapticService.isEnabled()).toBe(false);
    });
  });

  describe('pulse patterns', () => {
    it('should execute tap pattern correctly', async () => {
      const mockTrigger = require('react-native-haptic-feedback').trigger;
      
      await hapticService.executePulsePattern('tap', 0.8);
      
      expect(mockTrigger).toHaveBeenCalledWith(
        'impactMedium',
        { enableVibrateFallback: true, ignoreAndroidSystemSettings: false }
      );
    });

    it('should execute swirl pattern with multiple haptics', async () => {
      const mockTrigger = require('react-native-haptic-feedback').trigger;
      
      await hapticService.executePulsePattern('swirl', 1.0);
      
      expect(mockTrigger).toHaveBeenCalledTimes(3);
    });

    it('should execute shatter pattern with decreasing intensity', async () => {
      const mockTrigger = require('react-native-haptic-feedback').trigger;
      
      await hapticService.executePulsePattern('shatter', 0.6);
      
      expect(mockTrigger).toHaveBeenCalledTimes(5);
    });

    it('should not execute patterns when disabled', async () => {
      const mockTrigger = require('react-native-haptic-feedback').trigger;
      hapticService.setEnabled(false);
      
      await hapticService.executePulsePattern('tap', 1.0);
      
      expect(mockTrigger).not.toHaveBeenCalled();
    });
  });

  describe('intensity handling', () => {
    it('should clamp intensity to valid range', async () => {
      const mockTrigger = require('react-native-haptic-feedback').trigger;
      
      await hapticService.executePulsePattern('tap', 2.0); // Above max
      await hapticService.executePulsePattern('tap', -0.5); // Below min
      
      expect(mockTrigger).toHaveBeenCalledTimes(2);
    });

    it('should scale haptic type based on intensity', async () => {
      const mockTrigger = require('react-native-haptic-feedback').trigger;
      
      await hapticService.executePulsePattern('tap', 0.3); // Light
      await hapticService.executePulsePattern('tap', 0.7); // Medium
      await hapticService.executePulsePattern('tap', 1.0); // Heavy
      
      expect(mockTrigger).toHaveBeenNthCalledWith(1, 'impactLight', expect.any(Object));
      expect(mockTrigger).toHaveBeenNthCalledWith(2, 'impactMedium', expect.any(Object));
      expect(mockTrigger).toHaveBeenNthCalledWith(3, 'impactHeavy', expect.any(Object));
    });
  });

  describe('error handling', () => {
    it('should handle invalid pattern gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await hapticService.executePulsePattern('invalid' as any, 1.0);
      
      expect(consoleSpy).toHaveBeenCalledWith('Unknown pulse pattern: invalid');
      consoleSpy.mockRestore();
    });

    it('should handle haptic trigger errors', async () => {
      const mockTrigger = require('react-native-haptic-feedback').trigger;
      mockTrigger.mockRejectedValueOnce(new Error('Haptic failed'));
      
      await expect(hapticService.executePulsePattern('tap', 1.0)).resolves.not.toThrow();
    });
  });
});