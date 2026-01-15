import { HapticService } from '../../src/services/HapticService';
import { PulsePattern } from '../../src/types/pulse';
import * as Haptics from 'expo-haptics';

jest.mock('expo-haptics');

describe('HapticService', () => {
  let hapticService: HapticService;

  beforeEach(() => {
    hapticService = new HapticService();
    jest.clearAllMocks();
  });

  describe('triggerHaptic', () => {
    it('should trigger tap pattern correctly', async () => {
      const mockTrigger = jest.spyOn(Haptics, 'impactAsync');
      
      await hapticService.triggerHaptic(PulsePattern.TAP);
      
      expect(mockTrigger).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });

    it('should trigger swirl pattern correctly', async () => {
      const mockTrigger = jest.spyOn(Haptics, 'selectionAsync');
      
      await hapticService.triggerHaptic(PulsePattern.SWIRL);
      
      expect(mockTrigger).toHaveBeenCalledTimes(3);
    });

    it('should trigger shatter pattern correctly', async () => {
      const mockTrigger = jest.spyOn(Haptics, 'impactAsync');
      
      await hapticService.triggerHaptic(PulsePattern.SHATTER);
      
      expect(mockTrigger).toHaveBeenCalledTimes(5);
      expect(mockTrigger).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Heavy);
    });

    it('should handle haptic errors gracefully', async () => {
      const mockTrigger = jest.spyOn(Haptics, 'impactAsync').mockRejectedValue(new Error('Haptic error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await hapticService.triggerHaptic(PulsePattern.TAP);
      
      expect(consoleSpy).toHaveBeenCalledWith('Haptic feedback error:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('isHapticSupported', () => {
    it('should return true when haptics are supported', () => {
      expect(hapticService.isHapticSupported()).toBe(true);
    });
  });

  describe('setHapticEnabled', () => {
    it('should enable haptics', () => {
      hapticService.setHapticEnabled(true);
      expect(hapticService.isEnabled()).toBe(true);
    });

    it('should disable haptics', () => {
      hapticService.setHapticEnabled(false);
      expect(hapticService.isEnabled()).toBe(false);
    });
  });

  describe('triggerGoldenPulseHaptic', () => {
    it('should trigger enhanced haptic for golden pulse', async () => {
      const mockTrigger = jest.spyOn(Haptics, 'notificationAsync');
      
      await hapticService.triggerGoldenPulseHaptic();
      
      expect(mockTrigger).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
    });
  });
});