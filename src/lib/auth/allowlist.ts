import { query } from '../database/connection';

export interface AllowedUser {
  email: string;
  display_name: string | null;
  role: 'admin' | 'viewer' | 'qa';
  invited_by: string | null;
  created_at: Date;
  updated_at: Date;
  active: boolean;
}

export interface AllowListResult {
  allowed: boolean;
  user?: AllowedUser;
  error?: string;
}

class AllowListService {
  private cache = new Map<string, { user: AllowedUser; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  async isEmailAllowed(email: string): Promise<AllowListResult> {
    try {
      // Normalize email
      const normalizedEmail = this.normalizeEmail(email);
      
      // Check cache first
      const cached = this.cache.get(normalizedEmail);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return {
          allowed: cached.user.active,
          user: cached.user,
        };
      }

      // Query database
      const result = await query(
        'SELECT email, display_name, role, invited_by, created_at, updated_at, active FROM auth_allowed_emails WHERE email = $1',
        [normalizedEmail]
      );

      if (result.rows.length === 0) {
        return { allowed: false, error: 'Email not found in allow list' };
      }

      const user = result.rows[0] as AllowedUser;
      
      // Update cache
      this.cache.set(normalizedEmail, {
        user,
        timestamp: Date.now(),
      });

      return {
        allowed: user.active,
        user,
      };
    } catch (error) {
      console.error('Allow list check error:', error);
      return { 
        allowed: false, 
        error: error instanceof Error ? error.message : 'Database error' 
      };
    }
  }

  async addUser(email: string, displayName: string, role: 'admin' | 'viewer' | 'qa' = 'viewer', invitedBy: string): Promise<{ success: boolean; error?: string }> {
    try {
      const normalizedEmail = this.normalizeEmail(email);
      
      await query(
        'INSERT INTO auth_allowed_emails (email, display_name, role, invited_by) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO UPDATE SET display_name = $2, role = $3, invited_by = $4, updated_at = now()',
        [normalizedEmail, displayName, role, invitedBy]
      );

      // Invalidate cache
      this.cache.delete(normalizedEmail);

      return { success: true };
    } catch (error) {
      console.error('Add user error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Database error' 
      };
    }
  }

  async removeUser(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const normalizedEmail = this.normalizeEmail(email);
      
      await query(
        'DELETE FROM auth_allowed_emails WHERE email = $1',
        [normalizedEmail]
      );

      // Invalidate cache
      this.cache.delete(normalizedEmail);

      return { success: true };
    } catch (error) {
      console.error('Remove user error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Database error' 
      };
    }
  }

  async toggleUserStatus(email: string): Promise<{ success: boolean; error?: string; newStatus?: boolean }> {
    try {
      const normalizedEmail = this.normalizeEmail(email);
      
      const result = await query(
        'UPDATE auth_allowed_emails SET active = NOT active, updated_at = now() WHERE email = $1 RETURNING active',
        [normalizedEmail]
      );

      if (result.rows.length === 0) {
        return { success: false, error: 'User not found' };
      }

      const newStatus = result.rows[0].active;
      
      // Invalidate cache
      this.cache.delete(normalizedEmail);

      return { success: true, newStatus };
    } catch (error) {
      console.error('Toggle user status error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Database error' 
      };
    }
  }

  async getAllUsers(): Promise<{ users: AllowedUser[]; error?: string }> {
    try {
      const result = await query(
        'SELECT email, display_name, role, invited_by, created_at, updated_at, active FROM auth_allowed_emails ORDER BY created_at DESC'
      );

      return { users: result.rows as AllowedUser[] };
    } catch (error) {
      console.error('Get all users error:', error);
      return { 
        users: [], 
        error: error instanceof Error ? error.message : 'Database error' 
      };
    }
  }

  async searchUsers(searchTerm: string): Promise<{ users: AllowedUser[]; error?: string }> {
    try {
      const result = await query(
        'SELECT email, display_name, role, invited_by, created_at, updated_at, active FROM auth_allowed_emails WHERE email ILIKE $1 OR display_name ILIKE $1 ORDER BY created_at DESC',
        [`%${searchTerm}%`]
      );

      return { users: result.rows as AllowedUser[] };
    } catch (error) {
      console.error('Search users error:', error);
      return { 
        users: [], 
        error: error instanceof Error ? error.message : 'Database error' 
      };
    }
  }

  private normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  // Clear cache (useful for testing or when you know data has changed)
  clearCache(): void {
    this.cache.clear();
  }

  // Clear cache for specific email
  clearCacheForEmail(email: string): void {
    this.cache.delete(this.normalizeEmail(email));
  }
}

// Singleton instance
const allowListService = new AllowListService();

export { allowListService };
export default allowListService;
