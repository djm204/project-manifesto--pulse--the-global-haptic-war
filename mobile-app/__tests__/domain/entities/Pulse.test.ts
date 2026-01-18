import { Pulse, PulseType } from '../../../src/domain/entities/Pulse';

describe('Pulse Entity', () => {
  const mockPulse = {
    id: 'pulse-123',
    userId: 'user-456',
    type: PulseType.TAP,
    intensity: 75,
    location: { latitude: 37.7749, longitude: -122.4194 },
    timestamp: Date.now(),
    hapticPattern: 'medium'
  };

  it('should create a valid pulse instance', () => {
    const pulse = new Pulse(mockPulse);
    
    expect(pulse.id).toBe(mockPulse.id);
    expect(pulse.userId).toBe(mockPulse.userId);
    expect(pulse.type).toBe(PulseType.TAP);
    expect(pulse.intensity).toBe(75);
    expect(pulse.location).toEqual(mockPulse.location);
  });

  it('should validate pulse intensity range', () => {
    expect(() => new Pulse({ ...mockPulse, intensity: -1 }))
      .toThrow('Pulse intensity must be between 0 and 100');
    
    expect(() => new Pulse({ ...mockPulse, intensity: 101 }))
      .toThrow('Pulse intensity must be between 0 and 100');
  });

  it('should validate pulse type enum', () => {
    expect(() => new Pulse({ ...mockPulse, type: 'INVALID' as PulseType }))
      .toThrow('Invalid pulse type');
  });

  it('should calculate haptic pattern based on intensity', () => {
    const lightPulse = new Pulse({ ...mockPulse, intensity: 20 });
    const mediumPulse = new Pulse({ ...mockPulse, intensity: 60 });
    const heavyPulse = new Pulse({ ...mockPulse, intensity: 90 });

    expect(lightPulse.hapticPattern).toBe('light');
    expect(mediumPulse.hapticPattern).toBe('medium');
    expect(heavyPulse.hapticPattern).toBe('heavy');
  });

  it('should validate required fields', () => {
    expect(() => new Pulse({ ...mockPulse, userId: '' }))
      .toThrow('User ID is required');
    
    expect(() => new Pulse({ ...mockPulse, location: null }))
      .toThrow('Location is required');
  });
});