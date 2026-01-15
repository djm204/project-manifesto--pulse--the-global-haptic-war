import { HapticService, HapticPattern, HapticIntensity } from '../../src/services/HapticService';
import HapticFeedback from 'react-native-haptic-feedback';
import { Platform, Vibration } from 'react-native';

jest.mock('react-native-haptic-feedback');
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  Vibration: { vibrate: jest.fn() }
}));

describe('HapticService', () => {
  let hapticService: HapticService;

  beforeEach(() => {
    hapticService = new HapticService();
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await expect(hapticService.initialize()).resolves.not.toThrow();
    });
  });

  describe('triggerPulseHaptic', () => {
    beforeEach(async () => {
      await hapticService.initialize();
    });

    it('should trigger light haptic feedback', async () => {
      await hapticService.triggerPulseHaptic(HapticIntensity.LIGHT, HapticPattern.PULSE);
      
      expect(HapticFeedback.trigger).toHaveBeenCalledWith(
        'impactLight',
        expect.any(Object)
      );
    });

    it('should trigger medium haptic feedback', async () => {
      await hapticService.triggerPulseHaptic(HapticIntensity.MEDIUM, HapticPattern.PULSE);
      
      expect(HapticFeedback.trigger).toHaveBeenCalledWith(
        'impactMedium',
        expect.any(Object)
      );
    });

    it('should trigger heavy haptic feedback', async () => {
      await hapticService.triggerPulseHaptic(HapticIntensity.HEAVY, HapticPattern.PULSE);
      
      expect(HapticFeedback.trigger).toHaveBeenCalledWith(
        'impactHeavy',
        expect.any(Object)
      );
    });

    it('should handle custom patterns', async () => {
      const customPattern = await hapticService.createCustomPattern(1000, 0.8);
      await hapticService.triggerPulseHaptic(HapticIntensity.MEDIUM, customPattern);
      
      expect(HapticFeedback.trigger).toHaveBeenCalled();
    });

    it('should fallback to vibration on Android', async () => {
      (Platform.OS as any) = 'android';
      
      await hapticService.triggerPulseHaptic(HapticIntensity.MEDIUM, HapticPattern.PULSE);
      
      expect(Vibration.vibrate).toHaveBeenCalledWith(500);
    });
  });

  describe('createCustomPattern', () => {
    it('should create valid custom pattern', async () => {
      const pattern = await hapticService.createCustomPattern(2000, 0.7);
      
      expect(pattern).toEqual({
        type: 'custom',
        duration: 2000,
        intensity: 0.7,
        intervals: expect.any(Array)
      });
    });

    it('should validate pattern parameters', async () => {
      await expect(
        hapticService.createCustomPattern(-1000, 0.5)
      ).rejects.toThrow('Duration must be positive');

      await expect(
        hapticService.createCustomPattern(1000, 1.5)
      ).rejects.toThrow('Intensity must be between 0 and 1');
    });
  });

  describe('triggerSuccessHaptic', () => {
    it('should trigger success haptic pattern', async () => {
      await hapticService.triggerSuccessHaptic();
      
      expect(HapticFeedback.trigger).toHaveBeenCalledWith(
        'notificationSuccess',
        expect.any(Object)
      );
    });
  });

  describe('triggerErrorHaptic', () => {
    it('should trigger error haptic pattern', async () => {
      await hapticService.triggerErrorHaptic();
      
      expect(HapticFeedback.trigger).toHaveBeenCalledWith(
        'notificationError',
        expect.any(Object)
      );
    });
  });

  describe('isHapticSupported', () => {
    it('should return true for iOS', () => {
      (Platform.OS as any) = 'ios';
      expect(hapticService.isHapticSupported()).toBe(true);
    });

    it('should return false for unsupported platforms', () => {
      (Platform.OS as any) = 'web';
      expect(hapticService.isHapticSupported()).toBe(false);
    });
  });

  describe('setHapticEnabled', () => {
    it('should enable/disable haptic feedback', () => {
      hapticService.setHapticEnabled(false);
      expect(hapticService.isHapticEnabled()).toBe(false);

      hapticService.setHapticEnabled(true);
      expect(hapticService.isHapticEnabled()).toBe(true);
    });
  });
});