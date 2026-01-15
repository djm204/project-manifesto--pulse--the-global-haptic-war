import { HapticService } from '../../src/services/HapticService';
import { Platform, Vibration } from 'react-native';
import HapticFeedback from 'react-native-haptic-feedback';

// Mock dependencies
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
  Vibration: {
    vibrate: jest.fn(),
  },
}));

jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
}));

describe('HapticService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('triggerPulse', () => {
    it('should trigger iOS haptic feedback when platform is iOS', () => {
      (Platform.OS as any) = 'ios';
      
      HapticService.triggerPulse(1.0);
      
      expect(HapticFeedback.trigger).toHaveBeenCalledWith('impactHeavy', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    });

    it('should trigger Android vibration when platform is Android', () => {
      (Platform.OS as any) = 'android';
      
      HapticService.triggerPulse(1.0);
      
      expect(Vibration.vibrate).toHaveBeenCalledWith([0, 200, 100, 200], false);
    });

    it('should handle default intensity parameter', () => {
      (Platform.OS as any) = 'ios';
      
      HapticService.triggerPulse();
      
      expect(HapticFeedback.trigger).toHaveBeenCalled();
    });
  });

  describe('triggerGoldenPulse', () => {
    it('should trigger enhanced vibration pattern', () => {
      HapticService.triggerGoldenPulse();
      
      expect(Vibration.vibrate).toHaveBeenCalledWith([0, 100, 50, 200, 50, 300], false);
    });
  });

  describe('triggerSuccessFeedback', () => {
    it('should trigger success haptic on iOS', () => {
      (Platform.OS as any) = 'ios';
      
      HapticService.triggerSuccessFeedback();
      
      expect(HapticFeedback.trigger).toHaveBeenCalledWith('notificationSuccess');
    });

    it('should trigger success vibration on Android', () => {
      (Platform.OS as any) = 'android';
      
      HapticService.triggerSuccessFeedback();
      
      expect(Vibration.vibrate).toHaveBeenCalledWith([0, 100], false);
    });
  });

  describe('triggerErrorFeedback', () => {
    it('should trigger error haptic on iOS', () => {
      (Platform.OS as any) = 'ios';
      
      HapticService.triggerErrorFeedback();
      
      expect(HapticFeedback.trigger).toHaveBeenCalledWith('notificationError');
    });

    it('should trigger error vibration on Android', () => {
      (Platform.OS as any) = 'android';
      
      HapticService.triggerErrorFeedback();
      
      expect(Vibration.vibrate).toHaveBeenCalledWith([0, 500], false);
    });
  });
});