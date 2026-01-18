import bcrypt from 'bcrypt';

export class User {
  constructor(
    public readonly id: string,
    public readonly username: string,
    private hashedPassword: string,
    public readonly email: string,
    public readonly deviceId: string,
    public readonly createdAt: Date,
    public readonly attStatus: 'authorized' | 'denied' | 'not_determined' = 'not_determined'
  ) {
    this.validateUsername();
    this.validateEmail();
  }

  private validateUsername(): void {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(this.username)) {
      throw new Error('Username must be 3-20 characters, alphanumeric and underscore only');
    }
  }

  private validateEmail(): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      throw new Error('Invalid email format');
    }
  }

  async verifyPassword(plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, this.hashedPassword);
  }

  static async hashPassword(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, 12);
  }

  canTrackAds(): boolean {
    return this.attStatus === 'authorized';
  }
}