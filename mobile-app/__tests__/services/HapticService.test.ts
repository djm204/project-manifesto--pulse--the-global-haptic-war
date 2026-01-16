import { HapticService } from '../../src/services/HapticService';
import { HapticIntensity } from '../../src/types/haptic';

// Mock React Native Haptic Feedback
jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
  HapticFeedbackTypes: {
    selection: 'selection',
    impactLight: 'impactLight',
    impactMedium: 'impactMedium',
    impactHeavy: 'impactHeavy',
    notificationSuccess: 'notificationSuccess',
  },
}));

import HapticFeedback from 'react-native-haptic-feedback';

describe('HapticService', () => {
  let hapticService: HapticService;

  beforeEach(() => {
    hapticService = new HapticService();
    jest.clearAllMocks();
  });

  describe('triggerPulseFeedback', () => {
    it('should trigger light haptic for light intensity', async () => {
      await hapticService.triggerPulseFeedback('light');

      expect(HapticFeedback.trigger).toHaveBeenCalledWith('impactLight', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    });

    it('should trigger medium haptic for medium intensity', async () => {
      await hapticService.triggerPulseFeedback('medium');

      expect(HapticFeedback.trigger).toHaveBeenCalledWith('impactMedium', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    });

    it('should trigger heavy haptic for strong intensity', async () => {
      await hapticService.triggerPulseFeedback('strong');

      expect(HapticFeedback.trigger).toHaveBeenCalledWith('impactHeavy', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    });

    it('should handle haptic feedback errors gracefully', async () => {
      const mockError = new Error('Haptic not available');
      (HapticFeedback.trigger as jest.Mock).mockRejectedValue(mockError);

      // Should not throw error
      await expect(hapticService.triggerPulseFeedback('medium')).resolves.toBeUndefined();
    });
  });

  describe('triggerSuccessFeedback', () => {
    it('should trigger success notification haptic', async () => {
      await hapticService.triggerSuccessFeedback();

      expect(HapticFeedback.trigger).toHaveBeenCalledWith('notificationSuccess', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    });
  });

  describe('isHapticAvailable', () => {
    it('should return true when haptic is available', () => {
      jest.spyOn(hapticService as any, 'checkHapticSupport').mockReturnValue(true);

      const result = hapticService.isHapticAvailable();

      expect(result).toBe(true);
    });

    it('should return false when haptic is not available', () => {
      jest.spyOn(hapticService as any, 'checkHapticSupport').mockReturnValue(false);

      const result = hapticService.isHapticAvailable();

      expect(result).toBe(false);
    });
  });
});