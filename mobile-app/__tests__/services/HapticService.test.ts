import { HapticService } from '../../src/services/HapticService';
import HapticFeedback from 'react-native-haptic-feedback';

jest.mock('react-native-haptic-feedback');

describe('HapticService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('triggerPulseHaptic', () => {
    it('should trigger correct haptic pattern for tap interaction', async () => {
      const mockTrigger = jest.spyOn(HapticFeedback, 'trigger');
      
      await HapticService.triggerPulseHaptic('tap', 1.5);
      
      expect(mockTrigger).toHaveBeenCalledWith('impactMedium', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false
      });
    });

    it('should trigger heavy haptic for high intensity swirl', async () => {
      const mockTrigger = jest.spyOn(HapticFeedback, 'trigger');
      
      await HapticService.triggerPulseHaptic('swirl', 2.5);
      
      expect(mockTrigger).toHaveBeenCalledWith('impactHeavy', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false
      });
    });

    it('should trigger light haptic for low intensity shatter', async () => {
      const mockTrigger = jest.spyOn(HapticFeedback, 'trigger');
      
      await HapticService.triggerPulseHaptic('shatter', 0.5);
      
      expect(mockTrigger).toHaveBeenCalledWith('impactLight', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false
      });
    });

    it('should handle invalid interaction types gracefully', async () => {
      const mockTrigger = jest.spyOn(HapticFeedback, 'trigger');
      
      await HapticService.triggerPulseHaptic('invalid' as any, 1.0);
      
      expect(mockTrigger).toHaveBeenCalledWith('impactMedium', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false
      });
    });
  });

  describe('triggerSuccessHaptic', () => {
    it('should trigger success notification haptic', async () => {
      const mockTrigger = jest.spyOn(HapticFeedback, 'trigger');
      
      await HapticService.triggerSuccessHaptic();
      
      expect(mockTrigger).toHaveBeenCalledWith('notificationSuccess', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false
      });
    });
  });

  describe('triggerErrorHaptic', () => {
    it('should trigger error notification haptic', async () => {
      const mockTrigger = jest.spyOn(HapticFeedback, 'trigger');
      
      await HapticService.triggerErrorHaptic();
      
      expect(mockTrigger).toHaveBeenCalledWith('notificationError', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false
      });
    });
  });

  describe('isHapticSupported', () => {
    it('should return true on iOS devices', () => {
      jest.spyOn(require('react-native'), 'Platform', 'get').mockReturnValue({
        OS: 'ios'
      });
      
      const result = HapticService.isHapticSupported();
      
      expect(result).toBe(true);
    });

    it('should return false on unsupported platforms', () => {
      jest.spyOn(require('react-native'), 'Platform', 'get').mockReturnValue({
        OS: 'web'
      });
      
      const result = HapticService.isHapticSupported();
      
      expect(result).toBe(false);
    });
  });

  describe('setHapticEnabled', () => {
    it('should update haptic enabled state', async () => {
      await HapticService.setHapticEnabled(false);
      
      const mockTrigger = jest.spyOn(HapticFeedback, 'trigger');
      await HapticService.triggerPulseHaptic('tap', 1.0);
      
      expect(mockTrigger).not.toHaveBeenCalled();
    });

    it('should enable haptics when set to true', async () => {
      await HapticService.setHapticEnabled(true);
      
      const mockTrigger = jest.spyOn(HapticFeedback, 'trigger');
      await HapticService.triggerPulseHaptic('tap', 1.0);
      
      expect(mockTrigger).toHaveBeenCalled();
    });
  });
});