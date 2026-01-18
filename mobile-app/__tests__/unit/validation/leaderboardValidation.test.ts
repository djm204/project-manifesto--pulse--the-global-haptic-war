import Joi from 'joi';
import { LeaderboardValidationSchema, validateLeaderboardEntry, validateLeaderboardResponse } from '../../../src/utils/validation';
import { LeaderboardEntry, LeaderboardResponse } from '../../../src/types/leaderboard';

describe('Leaderboard Validation Schema Tests', () => {
  describe('LeaderboardEntry validation', () => {
    it('should validate valid leaderboard entry', () => {
      const validEntry: LeaderboardEntry = {
        userId: 'user123',
        username: 'testuser',
        score: 1500,
        rank: 1,
        country: 'US',
        lastActive: new Date().toISOString()
      };

      const { error } = LeaderboardValidationSchema.entry.validate(validEntry);
      expect(error).toBeUndefined();
    });

    it('should reject username with special characters', () => {
      const invalidEntry = {
        userId: 'user123',
        username: 'test<script>alert("xss")</script>',
        score: 1500,
        rank: 1,
        country: 'US',
        lastActive: new Date().toISOString()
      };

      const { error } = LeaderboardValidationSchema.entry.validate(invalidEntry);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('XSS patterns detected');
    });

    it('should reject negative scores', () => {
      const invalidEntry = {
        userId: 'user123',
        username: 'testuser',
        score: -100,
        rank: 1,
        country: 'US',
        lastActive: new Date().toISOString()
      };

      const { error } = LeaderboardValidationSchema.entry.validate(invalidEntry);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('score');
    });

    it('should reject invalid country codes', () => {
      const invalidEntry = {
        userId: 'user123',
        username: 'testuser',
        score: 1500,
        rank: 1,
        country: 'INVALID',
        lastActive: new Date().toISOString()
      };

      const { error } = LeaderboardValidationSchema.entry.validate(invalidEntry);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('country');
    });
  });

  describe('LeaderboardResponse validation', () => {
    it('should validate complete leaderboard response', () => {
      const validResponse: LeaderboardResponse = {
        entries: [
          {
            userId: 'user1',
            username: 'player1',
            score: 2000,
            rank: 1,
            country: 'US',
            lastActive: new Date().toISOString()
          },
          {
            userId: 'user2',
            username: 'player2',
            score: 1800,
            rank: 2,
            country: 'CA',
            lastActive: new Date().toISOString()
          }
        ],
        totalEntries: 2,
        lastUpdated: new Date().toISOString(),
        userRank: 5,
        userScore: 1200
      };

      const { error } = LeaderboardValidationSchema.response.validate(validResponse);
      expect(error).toBeUndefined();
    });

    it('should reject response with mismatched totalEntries', () => {
      const invalidResponse = {
        entries: [{
          userId: 'user1',
          username: 'player1',
          score: 2000,
          rank: 1,
          country: 'US',
          lastActive: new Date().toISOString()
        }],
        totalEntries: 5, // Mismatch with actual entries length
        lastUpdated: new Date().toISOString(),
        userRank: 1,
        userScore: 2000
      };

      const { error } = LeaderboardValidationSchema.response.validate(invalidResponse);
      expect(error).toBeDefined();
    });
  });

  describe('validateLeaderboardEntry function', () => {
    it('should return valid result for correct entry', () => {
      const validEntry: LeaderboardEntry = {
        userId: 'user123',
        username: 'testuser',
        score: 1500,
        rank: 1,
        country: 'US',
        lastActive: new Date().toISOString()
      };

      const result = validateLeaderboardEntry(validEntry);
      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(validEntry);
    });

    it('should return sanitized data', () => {
      const entryWithWhitespace = {
        userId: '  user123  ',
        username: '  testuser  ',
        score: 1500,
        rank: 1,
        country: 'US',
        lastActive: new Date().toISOString()
      };

      const result = validateLeaderboardEntry(entryWithWhitespace);
      expect(result.isValid).toBe(true);
      expect(result.data?.userId).toBe('user123');
      expect(result.data?.username).toBe('testuser');
    });
  });
});