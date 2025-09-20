import { query } from '../database/connection';

export type AuditEvent = 
  | 'login_allow'
  | 'login_deny'
  | 'api_allow'
  | 'api_deny'
  | 'admin_add_user'
  | 'admin_remove_user'
  | 'admin_toggle_user'
  | 'session_created'
  | 'session_expired'
  | 'session_invalidated';

export interface AuditLogEntry {
  id?: number;
  email: string | null;
  event: AuditEvent;
  path: string | null;
  ip: string | null;
  user_agent: string | null;
  ts?: Date;
  details?: Record<string, any>;
}

export interface AuditLogQuery {
  email?: string;
  event?: AuditEvent;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

class AuditLogger {
  async logEvent(entry: Omit<AuditLogEntry, 'id' | 'ts'>): Promise<{ success: boolean; error?: string }> {
    try {
      await query(
        'INSERT INTO auth_audit_log (email, event, path, ip, user_agent, details) VALUES ($1, $2, $3, $4, $5, $6)',
        [
          entry.email,
          entry.event,
          entry.path,
          entry.ip,
          entry.user_agent,
          entry.details ? JSON.stringify(entry.details) : null,
        ]
      );

      return { success: true };
    } catch (error) {
      console.error('Audit logging error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Database error' 
      };
    }
  }

  async logAuthEvent(
    email: string | null,
    event: 'login_allow' | 'login_deny' | 'api_allow' | 'api_deny',
    path: string | null,
    ip: string | null,
    userAgent: string | null,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      email,
      event,
      path,
      ip,
      user_agent: userAgent,
      details,
    });
  }

  async logAdminEvent(
    email: string | null,
    event: 'admin_add_user' | 'admin_remove_user' | 'admin_toggle_user',
    path: string | null,
    ip: string | null,
    userAgent: string | null,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      email,
      event,
      path,
      ip,
      user_agent: userAgent,
      details,
    });
  }

  async getAuditLogs(queryParams: AuditLogQuery = {}): Promise<{ logs: AuditLogEntry[]; total: number; error?: string }> {
    try {
      const conditions: string[] = [];
      const params: any[] = [];
      let paramCount = 0;

      if (queryParams.email) {
        paramCount++;
        conditions.push(`email = $${paramCount}`);
        params.push(queryParams.email);
      }

      if (queryParams.event) {
        paramCount++;
        conditions.push(`event = $${paramCount}`);
        params.push(queryParams.event);
      }

      if (queryParams.startDate) {
        paramCount++;
        conditions.push(`ts >= $${paramCount}`);
        params.push(queryParams.startDate);
      }

      if (queryParams.endDate) {
        paramCount++;
        conditions.push(`ts <= $${paramCount}`);
        params.push(queryParams.endDate);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countResult = await query(
        `SELECT COUNT(*) as total FROM auth_audit_log ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].total);

      // Get logs with pagination
      const limit = queryParams.limit || 100;
      const offset = queryParams.offset || 0;
      
      paramCount++;
      const limitParam = `$${paramCount}`;
      params.push(limit);
      
      paramCount++;
      const offsetParam = `$${paramCount}`;
      params.push(offset);

      const result = await query(
        `SELECT id, email, event, path, ip, user_agent, ts, details FROM auth_audit_log ${whereClause} ORDER BY ts DESC LIMIT ${limitParam} OFFSET ${offsetParam}`,
        params
      );

      const logs = result.rows.map((row: any) => ({
        id: row.id,
        email: row.email,
        event: row.event,
        path: row.path,
        ip: row.ip,
        user_agent: row.user_agent,
        ts: row.ts,
        details: row.details ? JSON.parse(row.details) : null,
      })) as AuditLogEntry[];

      return { logs, total };
    } catch (error) {
      console.error('Get audit logs error:', error);
      return { 
        logs: [], 
        total: 0,
        error: error instanceof Error ? error.message : 'Database error' 
      };
    }
  }

  async getAuditStats(days: number = 7): Promise<{ stats: Record<string, any>; error?: string }> {
    try {
      const result = await query(
        `SELECT 
          event,
          COUNT(*) as count,
          COUNT(DISTINCT email) as unique_emails,
          COUNT(DISTINCT ip) as unique_ips
        FROM auth_audit_log 
        WHERE ts >= NOW() - INTERVAL '${days} days'
        GROUP BY event
        ORDER BY count DESC`,
        []
      );

      const stats = {
        total_events: result.rows.reduce((sum: number, row: any) => sum + parseInt(row.count), 0),
        events_by_type: result.rows.reduce((acc: Record<string, any>, row: any) => {
          acc[row.event] = {
            count: parseInt(row.count),
            unique_emails: parseInt(row.unique_emails),
            unique_ips: parseInt(row.unique_ips),
          };
          return acc;
        }, {} as Record<string, any>),
        period_days: days,
      };

      return { stats };
    } catch (error) {
      console.error('Get audit stats error:', error);
      return { 
        stats: {},
        error: error instanceof Error ? error.message : 'Database error' 
      };
    }
  }

  async getRecentDenials(hours: number = 24): Promise<{ denials: AuditLogEntry[]; error?: string }> {
    try {
      const result = await query(
        `SELECT id, email, event, path, ip, user_agent, ts, details 
         FROM auth_audit_log 
         WHERE event IN ('login_deny', 'api_deny') 
         AND ts >= NOW() - INTERVAL '${hours} hours'
         ORDER BY ts DESC
         LIMIT 50`,
        []
      );

      const denials = result.rows.map((row: any) => ({
        id: row.id,
        email: row.email,
        event: row.event,
        path: row.path,
        ip: row.ip,
        user_agent: row.user_agent,
        ts: row.ts,
        details: row.details ? JSON.parse(row.details) : null,
      })) as AuditLogEntry[];

      return { denials };
    } catch (error) {
      console.error('Get recent denials error:', error);
      return { 
        denials: [],
        error: error instanceof Error ? error.message : 'Database error' 
      };
    }
  }
}

// Singleton instance
const auditLogger = new AuditLogger();

export { auditLogger };
export default auditLogger;
