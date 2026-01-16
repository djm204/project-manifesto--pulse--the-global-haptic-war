import { HapticService } from '../../src/services/HapticService';
import { Vibration } from 'react-native';
import HapticFeedback from 'react-native-haptic-feedback';

jest.mock('react-native-haptic-feedback');
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Vibration: {
    vibrate: jest.fn(),
    cancel: jest.fn(),
  },
  Platform: {
    OS: 'ios',
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
      expect(hapticService).toBeDefined();
      expect(hapticService.isEnabled()).toBe(true);
    });
  });

  describe('pulse patterns', () => {
    it('should execute tap pattern correctly', async () => {
      await hapticService.playPulsePattern('tap');
      
      expect(HapticFeedback.trigger).toHaveBeenCalledWith(
        'impactMedium',
        expect.any(Object)
      );
    });

    it('should execute swirl pattern with multiple vibrations', async () => {
      await hapticService.playPulsePattern('swirl');
      
      expect(HapticFeedback.trigger).toHaveBeenCalledTimes(3);
    });

    it('should execute shatter pattern with intense vibration', async () => {
      await hapticService.playPulsePattern('shatter');
      
      expect(HapticFeedback.trigger).toHaveBeenCalledWith(
        'impactHeavy',
        expect.any(Object)
      );
    });

    it('should handle invalid pattern gracefully', async () => {
      await hapticService.playPulsePattern('invalid' as any);
      
      expect(HapticFeedback.trigger).not.toHaveBeenCalled();
    });
  });

  describe('settings management', () => {
    it('should enable and disable haptics', () => {
      hapticService.setEnabled(false);
      expect(hapticService.isEnabled()).toBe(false);
      
      hapticService.setEnabled(true);
      expect(hapticService.isEnabled()).toBe(true);
    });

    it('should not play patterns when disabled', async () => {
      hapticService.setEnabled(false);
      await hapticService.playPulsePattern('tap');
      
      expect(HapticFeedback.trigger).not.toHaveBeenCalled();
    });

    it('should adjust intensity levels', () => {
      hapticService.setIntensity(0.5);
      expect(hapticService.getIntensity()).toBe(0.5);
    });

    it('should clamp intensity values', () => {
      hapticService.setIntensity(-1);
      expect(hapticService.getIntensity()).toBe(0);
      
      hapticService.setIntensity(2);
      expect(hapticService.getIntensity()).toBe(1);
    });
  });

  describe('custom patterns', () => {
    it('should register custom pattern', () => {
      const customPattern = {
        name: 'custom',
        vibrations: [100, 50, 100],
        intensity: 'medium' as const,
      };
      
      hapticService.registerCustomPattern(customPattern);
      expect(hapticService.hasPattern('custom')).toBe(true);
    });

    it('should play custom pattern', async () => {
      const customPattern = {
        name: 'custom',
        vibrations: [100],
        intensity: 'light' as const,
      };
      
      hapticService.registerCustomPattern(customPattern);
      await hapticService.playPulsePattern('custom');
      
      expect(HapticFeedback.trigger).toHaveBeenCalledWith(
        'impactLight',
        expect.any(Object)
      );
    });
  });

  describe('error handling', () => {
    it('should handle haptic feedback errors gracefully', async () => {
      (HapticFeedback.trigger as jest.Mock).mockRejectedValueOnce(
        new Error('Haptic not supported')
      );
      
      await expect(
        hapticService.playPulsePattern('tap')
      ).resolves.not.toThrow();
    });

    it('should fallback to vibration on iOS < 10', async () => {
      jest.doMock('react-native', () => ({
        Platform: { OS: 'ios', Version: '9.0' },
        Vibration: { vibrate: jest.fn() },
      }));
      
      await hapticService.playPulsePattern('tap');
      expect(Vibration.vibrate).toHaveBeenCalled();
    });
  });
});