import * as Haptics from 'expo-haptics';
import { HapticFeedbackTypes } from 'react-native-haptic-feedback';
import RNHapticFeedback from 'react-native-haptic-feedback';

export interface HapticPattern {
  type: 'impact' | 'notification' | 'selection' | 'custom';
  intensity?: 'light' | 'medium' | 'heavy';
  duration?: number;
  pattern?: number[];
}

class HapticService {
  private isEnabled: boolean = true;
  private currentPattern: HapticPattern | null = null;

  async initialize(): Promise<void> {
    try {
      // Check if haptics are supported
      const isSupported = await this.isHapticsSupported();
      if (!isSupported) {
        console.warn('Haptics not supported on this device');
        this.isEnabled = false;
      }
    } catch (error) {
      console.error('Failed to initialize haptic service:', error);
      this.isEnabled = false;
    }
  }

  private async isHapticsSupported(): Promise<boolean> {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return true;
    } catch {
      return false;
    }
  }

  async triggerPulse(pattern: HapticPattern): Promise<void> {
    if (!this.isEnabled) return;

    try {
      this.currentPattern = pattern;

      switch (pattern.type) {
        case 'impact':
          await this.triggerImpact(pattern.intensity || 'medium');
          break;
        case 'notification':
          await this.triggerNotification();
          break;
        case 'selection':
          await this.triggerSelection();
          break;
        case 'custom':
          await this.triggerCustomPattern(pattern);
          break;
        default:
          throw new Error(`Unknown haptic pattern type: ${pattern.type}`);
      }
    } catch (error) {
      console.error('Failed to trigger haptic feedback:', error);
    }
  }

  private async triggerImpact(intensity: 'light' | 'medium' | 'heavy'): Promise<void> {
    const intensityMap = {
      light: Haptics.ImpactFeedbackStyle.Light,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      heavy: Haptics.ImpactFeedbackStyle.Heavy,
    };

    await Haptics.impactAsync(intensityMap[intensity]);
  }

  private async triggerNotification(): Promise<void> {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  private async triggerSelection(): Promise<void> {
    await Haptics.selectionAsync();
  }

  private async triggerCustomPattern(pattern: HapticPattern): Promise<void> {
    if (!pattern.pattern || pattern.pattern.length === 0) {
      throw new Error('Custom pattern requires pattern array');
    }

    // Use react-native-haptic-feedback for custom patterns
    const options = {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    };

    RNHapticFeedback.trigger(HapticFeedbackTypes.impactMedium, options);
  }

  async stopHaptics(): Promise<void> {
    this.currentPattern = null;
    // Note: Expo Haptics doesn't have a stop method, haptics are brief
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  isHapticEnabled(): boolean {
    return this.isEnabled;
  }

  getCurrentPattern(): HapticPattern | null {
    return this.currentPattern;
  }
}

export default new HapticService();