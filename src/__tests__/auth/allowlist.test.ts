import { allowListService } from '@/lib/auth/allowlist';

// Mock database connection
jest.mock('@/lib/database/connection', () => ({
  query: jest.fn(),
}));

const mockQuery = require('@/lib/database/connection').query;

describe('AllowList Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    allowListService.clearCache();
  });

  describe('isEmailAllowed', () => {
    it('should allow active user', async () => {
      const mockUser = {
        email: 'test@example.com',
        display_name: 'Test User',
        role: 'viewer',
        invited_by: 'admin@example.com',
        created_at: new Date(),
        updated_at: new Date(),
        active: true,
      };

      mockQuery.mockResolvedValue({
        rows: [mockUser],
      });

      const result = await allowListService.isEmailAllowed('test@example.com');

      expect(result.allowed).toBe(true);
      expect(result.user).toEqual(mockUser);
    });

    it('should deny inactive user', async () => {
      const mockUser = {
        email: 'test@example.com',
        display_name: 'Test User',
        role: 'viewer',
        invited_by: 'admin@example.com',
        created_at: new Date(),
        updated_at: new Date(),
        active: false,
      };

      mockQuery.mockResolvedValue({
        rows: [mockUser],
      });

      const result = await allowListService.isEmailAllowed('test@example.com');

      expect(result.allowed).toBe(false);
      expect(result.user).toEqual(mockUser);
    });

    it('should deny unknown user', async () => {
      mockQuery.mockResolvedValue({
        rows: [],
      });

      const result = await allowListService.isEmailAllowed('unknown@example.com');

      expect(result.allowed).toBe(false);
      expect(result.error).toBe('Email not found in allow list');
    });

    it('should normalize email case', async () => {
      const mockUser = {
        email: 'test@example.com',
        display_name: 'Test User',
        role: 'viewer',
        invited_by: 'admin@example.com',
        created_at: new Date(),
        updated_at: new Date(),
        active: true,
      };

      mockQuery.mockResolvedValue({
        rows: [mockUser],
      });

      const result = await allowListService.isEmailAllowed('TEST@EXAMPLE.COM');

      expect(result.allowed).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT email, display_name, role, invited_by, created_at, updated_at, active FROM auth_allowed_emails WHERE email = $1',
        ['test@example.com']
      );
    });
  });

  describe('addUser', () => {
    it('should add new user', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await allowListService.addUser(
        'new@example.com',
        'New User',
        'viewer',
        'admin@example.com'
      );

      expect(result.success).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO auth_allowed_emails'),
        ['new@example.com', 'New User', 'viewer', 'admin@example.com']
      );
    });

    it('should handle database error', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'));

      const result = await allowListService.addUser(
        'new@example.com',
        'New User',
        'viewer',
        'admin@example.com'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('removeUser', () => {
    it('should remove user', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await allowListService.removeUser('test@example.com');

      expect(result.success).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM auth_allowed_emails WHERE email = $1',
        ['test@example.com']
      );
    });
  });

  describe('toggleUserStatus', () => {
    it('should toggle user status', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ active: false }],
      });

      const result = await allowListService.toggleUserStatus('test@example.com');

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe(false);
      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE auth_allowed_emails SET active = NOT active, updated_at = now() WHERE email = $1 RETURNING active',
        ['test@example.com']
      );
    });

    it('should handle user not found', async () => {
      mockQuery.mockResolvedValue({
        rows: [],
      });

      const result = await allowListService.toggleUserStatus('unknown@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });
});
