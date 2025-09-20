# Secure Sign-In Template - Solution Design

## 1) Objectives & Non-Goals

### Objectives

- Only pre-approved users (by email) can sign in and access any page/API.
- Easy to manage the allow list (no code deploy required for edits, ideally).
- Works across multiple apps/domains (shared auth).
- Low friction for invited users (SSO or passwordless magic links).
- Enforce access both at the edge (UI) and backend (API).

### Non-Goals

- Full enterprise IAM (RBAC/ABAC) beyond a simple allow list (v1).
- Public self-registration or social signups.
- Complex user provisioning (SCIM, etc.) in v1.

## 2) High-Level Architecture

```
+-----------------------------+         +-------------------------+
|  Browser (User)             |  OIDC   |  Managed IdP (Auth0/    |
|  - hits https://app.domain  +-------->+  Clerk/Stytch/Supabase) |
|  - gets redirected to IdP   |  JWT    |  - Hosted login UI      |
+--------------+--------------+         |  - Passwordless/SSO     |
               |                        +-----------+-------------+
               |                                    |
               v                                    v
        +------+---------------------------+   +----+---------------------+
        |  Web App (Render)                |   |  Allow-List Store       |
        |  - Next.js/Express/Koa           |   |  (DB table or KV)       |
        |  - Middleware checks JWT +       |   |  - emails, status       |
        |    email ∈ allow_list            |   |  - roles (optional)     |
        +------+---------------------------+   +----+---------------------+
               |
               v
        +------+---------------------------+
        |  Backend APIs (Render)           |
        |  - Same JWT + allow-list check   |
        |  - Fine-grained route guards     |
        +----------------------------------+
```

### Notes for Render.com

- Apps (web + APIs) deployed as separate services.
- Environment variables for IdP secrets, JWT audience/issuer.
- Use a shared database (Render Managed PostgreSQL) for the allow list + audit logs.
- Optional: private service for admin panel, accessible only to admins on the allow list.

## 3) Key Requirements

- **AuthN**: OIDC-compliant IdP issues tokens (JWT) after login.
- **Allow-list enforcement**: block any identity whose primary email is not on the allow list.
- **Defense in depth**: enforce in UI middleware and every API.
- **Auditability**: log sign-in attempts (allowed/denied) with timestamp/IP/user agent.
- **Revocation**: removals from allow list take effect immediately (deny future requests).
- **Multi-app**: single IdP tenant and shared allow list so invites apply across apps.
- **Local dev**: bypass with a signed developer cookie or local stub IdP (flag-gated).

## 4) Implementation Options

### Option A — Managed IdP (Recommended)

Use Auth0 / Clerk / Stytch / Supabase Auth as the identity layer:

- Passwordless email magic links or SSO (Google/Microsoft).
- Post-login rule/hook or application logic checks email against allow list.

**Pros**: fastest to ship, battle-tested, MFA available, good logs.

**Cons**: monthly cost; vendor lock-in considerations.

### Option B — DIY Passwordless (Advanced later)

Run your own email magic links (e.g., NextAuth + JWT + SMTP provider).

- Store one-time tokens + sessions in DB; verify email ∈ allow list.

**Pros**: full control, low recurring cost.

**Cons**: more security surface area to own (rate limiting, token theft, etc.).

**Render Compatibility**: Both options work well on Render. Use environment variables and a managed Postgres for state.

## 5) Data Model (Postgres)

```sql
-- allow_list of identities
CREATE TABLE auth_allowed_emails (
  email              CITEXT PRIMARY KEY,
  display_name       TEXT,
  role               TEXT DEFAULT 'viewer',        -- optional: 'admin','qa'
  invited_by         TEXT,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now(),
  active             BOOLEAN DEFAULT TRUE
);

-- audit trail for compliance & debugging
CREATE TABLE auth_audit_log (
  id                 BIGSERIAL PRIMARY KEY,
  email              CITEXT,
  event              TEXT CHECK (event IN ('login_allow','login_deny','api_allow','api_deny')),
  path               TEXT,
  ip                 INET,
  user_agent         TEXT,
  ts                 TIMESTAMPTZ DEFAULT now(),
  details            JSONB
);
```

## 6) Request Flow

1. Unauthenticated request → app middleware detects no valid session/JWT.
2. Redirect to IdP login (passwordless or SSO).
3. After successful login, receive ID token (JWT).
4. App verifies token signature, issuer, audience.
5. Extract email claim and query `auth_allowed_emails`:
   - If `active = true` → create session (cookie) and proceed.
   - Else → show "Not invited" screen and log `login_deny`.
6. For every API request, validate session/JWT again and re-check allow list (fast cached).
7. All auth events are logged to `auth_audit_log`.

## 7) Enforcement (UI + API)

### UI Middleware (Next.js example)

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import { verifyJwt } from './lib/jwt';
import { isEmailAllowed } from './lib/allowlist';

const PUBLIC_PATHS = ['/auth/callback', '/auth/login', '/_next', '/health'];

export async function middleware(req: Request) {
  const url = new URL(req.url);
  if (PUBLIC_PATHS.some(p => url.pathname.startsWith(p))) return NextResponse.next();

  const token = req.headers.get('Authorization')?.replace('Bearer ', '') 
              || req.headers.get('Cookie')?.match(/session=([^;]+)/)?.[1];

  if (!token) return NextResponse.redirect(new URL('/auth/login', url.origin));

  const claims = await verifyJwt(token); // checks iss/aud/exp/signature
  if (!claims?.email) return NextResponse.redirect(new URL('/auth/login', url.origin));

  const ok = await isEmailAllowed(claims.email);
  if (!ok) return NextResponse.redirect(new URL('/not-invited', url.origin));

  return NextResponse.next();
}
```

### API Guard (Express example)

```typescript
// authGuard.ts
import { verifyJwt } from './jwt';
import { isEmailAllowed } from './allowlist';

export function authGuard() {
  return async (req, res, next) => {
    try {
      const token = (req.headers.authorization || '').replace('Bearer ', '');
      const claims = await verifyJwt(token);
      if (!claims?.email) return res.status(401).json({ error: 'Unauthorized' });

      if (!(await isEmailAllowed(claims.email))) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      req.user = claims;
      next();
    } catch (e) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  };
}
```

## 8) Admin & Operations

### Admin Panel (small internal UI)

- Search/add/remove emails; toggle active.
- Optional roles for future (admin/qa).
- Protect with the same allow-list (admin role required).

### Immediate Revocation

On change, invalidate sessions: store a `session_version` in user sessions and bump a global version to force re-auth, or keep sessions short.

### Audit Logs & Monitoring

- Track deny/allow counts; send Slack webhook if repeated deny attempts from same IP.
- Daily/weekly report of active users.

## 9) Security Considerations

- **JWT verification**: pin issuer, audience; rotate signing keys (IdP handles this).
- **Short session TTL** + silent refresh; secure, HTTP-only, SameSite cookies.
- **Rate limiting** on login and API endpoints (e.g., IP + email).
- **Transport security**: HTTPS only; HSTS; CSP for the app.
- **Email normalization**: compare using lowercased canonical emails.
- **PII minimization**: store only what's needed (email, display name).
- **Secrets**: Render environment variables; never commit secrets to repo.

## 10) Render.com Deployment Plan

### Services

- **app-web** (Next.js) — public web service.
- **app-api** (Node/Express) — public or private, depending on architecture.
- **admin-web** — optional internal panel (could be protected by the same allow list).
- **postgres** — Render Managed PostgreSQL for allow list + audit logs.

### Environment Variables (examples)

- `IDP_ISSUER`, `IDP_CLIENT_ID`, `IDP_CLIENT_SECRET`
- `JWT_AUDIENCE`, `JWT_DOMAIN`
- `DATABASE_URL`
- `SESSION_COOKIE_SECRET`
- `ALLOWED_REDIRECT_URLS`

### Networking

- If splitting UI/API, configure CORS to only allow the app domain.
- Prefer same top-level domain with subpaths or subdomains.

### CI/CD

- On push to main, deploy to staging; promote to prod after checks.
- Seed allow list in staging separately.

## 11) UX Details

### Not-Invited Screen

- Friendly message + contact link to request access.
- If using passwordless: show "Check your email" messaging after request.

### Magic Link (if used)

- Single-use links; short expiration; invalidate after first consumption.
- Inform user when their email is not invited (don't leak which emails are valid).

## 12) Future Enhancements

- Domain allow (e.g., @yourcompany.com) + explicit deny list.
- Roles/Scopes for per-app or per-route access.
- MFA via IdP.
- IP allow-listing for extra hardening.
- Just-in-time invites (approve from Slack command).
- SAML if later integrating with enterprise IdPs.

## 13) Testing Strategy

- Unit tests for JWT verification, email normalization, allow-list checks.
- Integration tests: login → callback → middleware pass/deny → API deny.
- Security tests: token replay, expired tokens, malformed JWTs, rate limits.
- Load tests on middleware path to ensure minimal latency.

## 14) Cutover / Rollout

1. Deploy to staging with a small set of invited users.
2. Verify audit logs and denial flows.
3. Pen-test basic auth flows; check rate limits.
4. Promote to production and invite the full QA list.

## 15) Quick "Getting Started" Checklist

1. Choose IdP (Auth0/Clerk/Stytch/Supabase Auth).
2. Create IdP app: set callback/logout URLs to your Render domain(s).
3. Provision Render Postgres; run schema migrations.
4. Implement UI middleware + API guard.
5. Build a minimal admin page to manage allow list.
6. Configure env vars in Render.
7. Add audit logging + Slack notifications.
8. Test end-to-end on staging; then launch.

## 16) FAQ

**Q: Can I use a managed IdP while hosting on Render?**
A: Yes. IdP is independent of hosting. You'll configure OIDC callbacks to your Render app URLs and verify tokens server-side.

**Q: Is allow-list stored in env vars enough?**
A: For very small teams, maybe—but DB-backed allow lists + admin UI avoid redeploys and give you audit logs.

**Q: Why check both in the UI and API?**
A: Defense in depth. Clients can be bypassed; APIs must enforce authorization themselves.
