import { randomBytes } from 'crypto';
export class SessionUtils {
  static readonly COOKIE_MAX_AGE = 10 * 60 * 1000; 
  static readonly COOKIE_NAME = 'session_id';
  static generateSessionId(): string {
    return randomBytes(32).toString('hex');
  }
  static getExpirationTime(): number {
    return Date.now() + this.COOKIE_MAX_AGE;
  }
  static isSessionExpired(expiresAt: number): boolean {
    return Date.now() > expiresAt;
  }
}