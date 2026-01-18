export interface Pulse {
  readonly id: string;
  readonly userId: string;
  readonly type: PulseType;
  readonly timestamp: number;
  readonly intensity: number;
  readonly location: GeolocationCoordinates;
  readonly deviceFingerprint: string;
}

export enum PulseType {
  TAP = 'TAP',
  SWIRL = 'SWIRL', 
  SHATTER = 'SHATTER'
}

export interface GeolocationCoordinates {
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracy: number;
}