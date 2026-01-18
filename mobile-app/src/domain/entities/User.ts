export interface User {
  readonly id: string;
  readonly encryptedEmail: string;
  readonly username: string;
  readonly level: number;
  readonly totalPulses: number;
  readonly createdAt: Date;
  readonly lastActiveAt: Date;
  readonly preferences: UserPreferences;
}

export interface UserPreferences {
  readonly hapticIntensity: number;
  readonly soundEnabled: boolean;
  readonly privacyLevel: PrivacyLevel;
}

export enum PrivacyLevel {
  PRIVATE = 'PRIVATE',
  FRIENDS = 'FRIENDS',
  PUBLIC = 'PUBLIC'
}