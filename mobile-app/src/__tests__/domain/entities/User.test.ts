import { User } from '../../domain/entities/User';
import bcrypt from 'bcrypt';

describe('User Entity', () => {
  describe('Creation', () => {
    it('should create user with valid data', () => {
      const userData = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        hashedPassword: 'hashedpass123',
        attStatus: 'authorized' as const,
        createdAt: new Date()
      };
      
      const user = new User(userData);
      
      expect(user.id).toBe('user-123');
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.attStatus).toBe('authorized');
    });
  });

  describe('validatePassword', () => {
    it('should return true for correct password', async () => {
      const plainPassword = 'testpassword123';
      const hashedPassword = await bcrypt.hash(plainPassword, 12);
      
      const user = new User({
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        hashedPassword,
        attStatus: 'authorized'
      });
      
      const isValid = await user.validatePassword(plainPassword);
      expect(isValid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 12);
      
      const user = new User({
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        hashedPassword,
        attStatus: 'authorized'
      });
      
      const isValid = await user.validatePassword('wrongpassword');
      expect(isValid).toBe(false);
    });
  });

  describe('hashPassword', () => {
    it('should hash password correctly', async () => {
      const plainPassword = 'testpassword123';
      const hashedPassword = await User.hashPassword(plainPassword);
      
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword.length).toBeGreaterThan(20);
      expect(hashedPassword).not.toBe(plainPassword);
      
      const isValid = await bcrypt.compare(plainPassword, hashedPassword);
      expect(isValid).toBe(true);
    });
  });

  describe('hasTrackingPermission', () => {
    it('should return true for authorized ATT status', () => {
      const user = new User({
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        hashedPassword: 'hash',
        attStatus: 'authorized'
      });
      
      expect(user.hasTrackingPermission()).toBe(true);
    });

    it('should return false for denied ATT status', () => {
      const user = new User({
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        hashedPassword: 'hash',
        attStatus: 'denied'
      });
      
      expect(user.hasTrackingPermission()).toBe(false);
    });
  });
});