import { HapticService } from '../../src/services/HapticService';
import { Platform } from 'react-native';
import { HapticFeedback } from 'react-native-haptic-feedback';
import { Vibration } from 'react-native';

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  Vibration: {
    vibrate: jest.fn(),
    cancel: jest.fn(),
  },
}));

jest.mock('react-native-haptic-feedback', () => ({
  HapticFeedback: {
    trigger: jest.fn(),
  },
}));

describe('HapticService', () => {
  let hapticService: HapticService;

  beforeEach(() => {
    jest.clearAllMocks();
    hapticService = new HapticService();
  });

  describe('iOS Platform', () => {
    beforeEach(() => {
      (Platform as any).OS = 'ios';
    });

    it('should trigger light haptic feedback on iOS', async () => {
      await hapticService.triggerPulse('light', 100);

      expect(HapticFeedback.trigger).toHaveBeenCalledWith('impactLight', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    });

    it('should trigger medium haptic feedback on iOS', async () => {
      await hapticService.triggerPulse('medium', 200);

      expect(HapticFeedback.trigger).toHaveBeenCalledWith('impactMedium', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    });

    it('should trigger heavy haptic feedback on iOS', async () => {
      await hapticService.triggerPulse('heavy', 300);

      expect(HapticFeedback.trigger).toHaveBeenCalledWith('impactHeavy', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    });
  });

  describe('Android Platform', () => {
    beforeEach(() => {
      (Platform as any).OS = 'android';
    });

    it('should trigger light vibration on Android', async () => {
      await hapticService.triggerPulse('light', 100);

      expect(Vibration.vibrate).toHaveBeenCalledWith(100);
    });

    it('should trigger medium vibration on Android', async () => {
      await hapticService.triggerPulse('medium', 200);

      expect(Vibration.vibrate).toHaveBeenCalledWith(200);
    });

    it('should trigger heavy vibration on Android', async () => {
      await hapticService.triggerPulse('heavy', 300);

      expect(Vibration.vibrate).toHaveBeenCalledWith(300);
    });

    it('should trigger pattern vibration for long duration', async () => {
      await hapticService.triggerPulse('heavy', 1000);

      expect(Vibration.vibrate).toHaveBeenCalledWith([0, 200, 100, 200, 100, 200, 100, 200]);
    });
  });

  describe('triggerGlobalPulse', () => {
    it('should trigger synchronized pulse sequence', async () => {
      (Platform as any).OS = 'ios';
      
      await hapticService.triggerGlobalPulse();

      expect(HapticFeedback.trigger).toHaveBeenCalledTimes(3);
    });
  });

  describe('stopHaptic', () => {
    it('should cancel vibration on Android', () => {
      (Platform as any).OS = 'android';
      
      hapticService.stopHaptic();

      expect(Vibration.cancel).toHaveBeenCalled();
    });
  });
});