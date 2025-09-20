-- Initial schema for secure sign-in template
-- This migration creates the core tables for email-based allow list authentication

-- Enable CITEXT extension for case-insensitive email comparison
CREATE EXTENSION IF NOT EXISTS "citext";

-- Allow list of identities
CREATE TABLE auth_allowed_emails (
  email              CITEXT PRIMARY KEY,
  display_name       TEXT,
  role               TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer', 'qa')),
  invited_by         TEXT,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now(),
  active             BOOLEAN DEFAULT TRUE
);

-- Audit trail for compliance & debugging
CREATE TABLE auth_audit_log (
  id                 BIGSERIAL PRIMARY KEY,
  email              CITEXT,
  event              TEXT CHECK (event IN ('login_allow','login_deny','api_allow','api_deny','admin_add_user','admin_remove_user','admin_toggle_user')),
  path               TEXT,
  ip                 INET,
  user_agent         TEXT,
  ts                 TIMESTAMPTZ DEFAULT now(),
  details            JSONB
);

-- User sessions for tracking active sessions
CREATE TABLE auth_sessions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email              CITEXT NOT NULL,
  session_token      TEXT UNIQUE NOT NULL,
  created_at         TIMESTAMPTZ DEFAULT now(),
  expires_at         TIMESTAMPTZ NOT NULL,
  last_accessed      TIMESTAMPTZ DEFAULT now(),
  ip_address         INET,
  user_agent         TEXT,
  active             BOOLEAN DEFAULT TRUE
);

-- Indexes for performance
CREATE INDEX idx_auth_allowed_emails_email ON auth_allowed_emails(email);
CREATE INDEX idx_auth_allowed_emails_active ON auth_allowed_emails(active) WHERE active = true;
CREATE INDEX idx_auth_audit_log_email ON auth_audit_log(email);
CREATE INDEX idx_auth_audit_log_event ON auth_audit_log(event);
CREATE INDEX idx_auth_audit_log_ts ON auth_audit_log(ts);
CREATE INDEX idx_auth_sessions_email ON auth_sessions(email);
CREATE INDEX idx_auth_sessions_token ON auth_sessions(session_token);
CREATE INDEX idx_auth_sessions_expires ON auth_sessions(expires_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_auth_allowed_emails_updated_at 
    BEFORE UPDATE ON auth_allowed_emails 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial admin user (replace with actual admin email)
INSERT INTO auth_allowed_emails (email, display_name, role, invited_by, active) 
VALUES ('admin@example.com', 'System Administrator', 'admin', 'system', true)
ON CONFLICT (email) DO NOTHING;
