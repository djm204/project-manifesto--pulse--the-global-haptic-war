import AsyncStorage from '@react-native-async-storage/async-storage';
import { SecurityService } from './SecurityService';
import { validateInput } from '../utils/validation';

export interface SessionData {
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: number;
  deviceId: string;
}

class SessionService {
  private static readonly SESSION_KEY = '@global_pulse_session';
  private static readonly REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes

  static async createSession(sessionData: SessionData): Promise<void> {
    try {
      if (!validateInput.sessionData(sessionData)) {
        throw new Error('Invalid session data');
      }

      const encryptedSession = await SecurityService.encryptSensitiveData(sessionData);
      await AsyncStorage.setItem(this.SESSION_KEY, JSON.stringify(encryptedSession));
    } catch (error) {
      console.error('Failed to create session:', error);
      throw new Error('Session creation failed');
    }
  }

  static async getSession(): Promise<SessionData | null> {
    try {
      const encryptedSession = await AsyncStorage.getItem(this.SESSION_KEY);
      if (!encryptedSession) return null;

      const parsedSession = JSON.parse(encryptedSession);
      const sessionData = await SecurityService.decryptSensitiveData(parsedSession);
      
      if (!this.isSessionValid(sessionData)) {
        await this.clearSession();
        return null;
      }

      return sessionData;
    } catch (error) {
      console.error('Failed to get session:', error);
      await this.clearSession();
      return null;
    }
  }

  static async refreshSession(): Promise<boolean> {
    try {
      const session = await this.getSession();
      if (!session) return false;

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.refreshToken}`,
        },
        body: JSON.stringify({
          deviceId: session.deviceId,
        }),
      });

      if (!response.ok) {
        await this.clearSession();
        return false;
      }

      const newTokens = await response.json();
      const updatedSession: SessionData = {
        ...session,
        token: newTokens.token,
        refreshToken: newTokens.refreshToken,
        expiresAt: Date.now() + newTokens.expiresIn * 1000,
      };

      await this.createSession(updatedSession);
      return true;
    } catch (error) {
      console.error('Session refresh failed:', error);
      await this.clearSession();
      return false;
    }
  }

  static async clearSession(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.SESSION_KEY);
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }

  static isSessionValid(session: SessionData): boolean {
    if (!session || !session.token || !session.expiresAt) return false;
    return Date.now() < session.expiresAt;
  }

  static shouldRefreshSession(session: SessionData): boolean {
    if (!session || !session.expiresAt) return false;
    return Date.now() > (session.expiresAt - this.REFRESH_THRESHOLD);
  }

  static async validateAndRefreshIfNeeded(): Promise<SessionData | null> {
    const session = await this.getSession();
    if (!session) return null;

    if (this.shouldRefreshSession(session)) {
      const refreshed = await this.refreshSession();
      if (!refreshed) return null;
      return await this.getSession();
    }

    return session;
  }
}

export { SessionService };