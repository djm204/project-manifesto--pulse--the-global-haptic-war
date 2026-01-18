import { Pulse, PulseType } from '../../domain/entities/Pulse';
import { Location } from '../../../shared/types';

describe('Pulse Entity', () => {
  describe('Creation', () => {
    it('should create valid pulse with all properties', () => {
      const pulseData = {
        id: 'pulse-123',
        userId: 'user-456',
        type: PulseType.TAP,
        intensity: 75,
        location: { latitude: 40.7128, longitude: -74.0060 } as Location,
        timestamp: new Date()
      };
      
      const pulse = new Pulse(pulseData);
      
      expect(pulse.id).toBe('pulse-123');
      expect(pulse.userId).toBe('user-456');
      expect(pulse.type).toBe(PulseType.TAP);
      expect(pulse.intensity).toBe(75);
      expect(pulse.location).toEqual(pulseData.location);
    });

    it('should throw error for invalid intensity below 0', () => {
      expect(() => new Pulse({
        id: 'pulse-123',
        userId: 'user-456',
        type: PulseType.TAP,
        intensity: -5
      })).toThrow('Intensity must be between 0 and 100');
    });

    it('should throw error for invalid intensity above 100', () => {
      expect(() => new Pulse({
        id: 'pulse-123',
        userId: 'user-456',
        type: PulseType.SWIRL,
        intensity: 150
      })).toThrow('Intensity must be between 0 and 100');
    });
  });

  describe('isValidIntensity', () => {
    it('should return true for valid intensity', () => {
      const pulse = new Pulse({
        id: 'pulse-123',
        userId: 'user-456',
        type: PulseType.TAP,
        intensity: 50
      });
      
      expect(pulse.isValidIntensity()).toBe(true);
    });

    it('should return false for intensity at boundaries', () => {
      const pulse1 = new Pulse({
        id: 'pulse-123',
        userId: 'user-456',
        type: PulseType.TAP,
        intensity: 0
      });
      const pulse2 = new Pulse({
        id: 'pulse-124',
        userId: 'user-456',
        type: PulseType.TAP,
        intensity: 100
      });
      
      expect(pulse1.isValidIntensity()).toBe(true);
      expect(pulse2.isValidIntensity()).toBe(true);
    });
  });

  describe('calculateImpact', () => {
    it('should calculate correct impact for TAP type', () => {
      const pulse = new Pulse({
        id: 'pulse-123',
        userId: 'user-456',
        type: PulseType.TAP,
        intensity: 50
      });
      
      expect(pulse.calculateImpact()).toBe(50); // 50 * 1.0
    });

    it('should calculate correct impact for SWIRL type', () => {
      const pulse = new Pulse({
        id: 'pulse-123',
        userId: 'user-456',
        type: PulseType.SWIRL,
        intensity: 50
      });
      
      expect(pulse.calculateImpact()).toBe(75); // 50 * 1.5
    });

    it('should calculate correct impact for SHATTER type', () => {
      const pulse = new Pulse({
        id: 'pulse-123',
        userId: 'user-456',
        type: PulseType.SHATTER,
        intensity: 50
      });
      
      expect(pulse.calculateImpact()).toBe(100); // 50 * 2.0
    });
  });
});