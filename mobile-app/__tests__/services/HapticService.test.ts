import { HapticService } from '../../src/services/HapticService';
import * as Haptics from 'expo-haptics';
import RNHapticFeedback from 'react-native-haptic-feedback';

// Mock external dependencies
jest.mock('expo-haptics');
jest.mock('react-native-haptic-feedback');

describe('HapticService', () => {
  let hapticService: HapticService;
  
  beforeEach(() => {
    hapticService = new HapticService();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default settings', () => {
      expect(hapticService.isEnabled).toBe(true);
      expect(hapticService.currentPattern).toBe('medium');
    });

    it('should enable haptic feedback', async () => {
      const result = await hapticService.enable();
      expect(result).toBe(true);
      expect(hapticService.isEnabled).toBe(true);
    });

    it('should disable haptic feedback', async () => {
      const result = await hapticService.disable();
      expect(result).toBe(false);
      expect(hapticService.isEnabled).toBe(false);
    });
  });

  describe('haptic patterns', () => {
    it('should trigger light haptic feedback', async () => {
      await hapticService.triggerLight();
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('should trigger medium haptic feedback', async () => {
      await hapticService.triggerMedium();
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });

    it('should trigger heavy haptic feedback', async () => {
      await hapticService.triggerHeavy();
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Heavy);
    });

    it('should trigger success haptic feedback', async () => {
      await hapticService.triggerSuccess();
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
    });

    it('should trigger error haptic feedback', async () => {
      await hapticService.triggerError();
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Error);
    });

    it('should not trigger haptic when disabled', async () => {
      await hapticService.disable();
      await hapticService.triggerMedium();
      expect(Haptics.impactAsync).not.toHaveBeenCalled();
    });
  });

  describe('custom patterns', () => {
    it('should trigger pulse pattern', async () => {
      await hapticService.triggerPulsePattern();
      expect(RNHapticFeedback.trigger).toHaveBeenCalledTimes(3);
    });

    it('should trigger countdown pattern', async () => {
      const mockCallback = jest.fn();
      await hapticService.triggerCountdownPattern(mockCallback);
      
      // Wait for pattern completion
      await new Promise(resolve => setTimeout(resolve, 3100));
      expect(mockCallback).toHaveBeenCalledTimes(3);
    });

    it('should handle pattern interruption', async () => {
      const pattern = hapticService.triggerCountdownPattern();
      hapticService.stopPattern();
      await pattern;
      
      expect(hapticService.currentPattern).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle haptic unavailable gracefully', async () => {
      (Haptics.impactAsync as jest.Mock).mockRejectedValue(new Error('Haptic not available'));
      
      const result = await hapticService.triggerMedium();
      expect(result).toBe(false);
    });

    it('should validate pattern parameters', () => {
      expect(() => hapticService.setIntensity(-1)).toThrow('Intensity must be between 0 and 1');
      expect(() => hapticService.setIntensity(2)).toThrow('Intensity must be between 0 and 1');
    });
  });
});