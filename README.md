# Secure Sign-In Template

A secure email-based allow list authentication template built with Next.js, TypeScript, and PostgreSQL. This template implements defense-in-depth authentication with comprehensive audit logging and admin management capabilities, leveraging Clerk for robust authentication handling.

## Features

- **Email-based allow list**: Only pre-approved users can access the application
- **Clerk integration**: Modern authentication with Clerk's managed service
- **Defense in depth**: Authentication enforced at both UI middleware and API levels
- **Multi-app support**: Shared authentication across multiple applications/domains
- **Comprehensive audit logging**: Track all authentication events for compliance
- **Immediate revocation**: Changes to allow list take effect immediately
- **Admin panel**: Manage users and view audit logs without code deployments
- **Security first**: Rate limiting, secure cookies, and comprehensive security features

## Quick Start

### 1. Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- A Clerk account (sign up at [clerk.com](https://clerk.com))

### 2. Installation

```bash
# Clone the repository
git clone <repository-url>
cd secure-sign-in-template

# Install dependencies
npm install

# Copy environment variables
cp env.example .env.local

# Configure your environment variables (see Configuration section)
```

### 3. Database Setup

```bash
# Run database migrations
npm run db:migrate

# (Optional) Seed with initial admin user
npm run db:seed
```

### 4. Development

```bash
# Start the development server
npm run dev
```

Visit `http://localhost:3000` to see the application.

## Configuration

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/secure_signin

# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth/login
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
SESSION_COOKIE_SECRET=your_session_secret_here
```

### Clerk Setup

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Create a new application
3. Go to "API Keys" and copy:
   - **Publishable Key** (NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
   - **Secret Key** (CLERK_SECRET_KEY)
4. Go to "Paths" and set:
   - **Sign-in URL**: `/auth/login`
   - **Sign-up URL**: `/auth/login`
   - **After sign-in URL**: `/dashboard`
   - **After sign-up URL**: `/dashboard`
5. Configure authentication settings as needed

## Architecture

### Database Schema

The application uses two main tables:

- `auth_allowed_emails`: Stores the allow list with user roles
- `auth_audit_log`: Tracks all authentication events for compliance

### Authentication Flow

1. User visits protected page
2. Clerk middleware checks for valid session
3. If no session, redirect to Clerk login
4. After Clerk login, check allow list
5. Create session if allowed, deny if not
6. All events logged to audit trail

### Security Features

- Clerk-managed authentication and JWT verification
- Case-insensitive email comparison
- Secure HTTP-only cookies
- Rate limiting on auth endpoints
- CSRF protection with state parameters
- Comprehensive audit logging
- Defense in depth (UI + API enforcement)

## API Endpoints

### User Management
- `GET /api/user/profile` - Get current user profile

### Admin (Admin role required)
- `GET /api/admin/users` - List all users
- `POST /api/admin/users` - Add new user
- `DELETE /api/admin/users/[email]` - Remove user
- `PATCH /api/admin/users/[email]/toggle` - Toggle user status
- `GET /api/admin/audit` - Get audit logs

### Health Check
- `GET /api/health` - Application health status

## Admin Panel

Access the admin panel at `/admin` (admin role required) to:

- View and manage the allow list
- Add/remove users
- Toggle user active status
- View audit logs and statistics
- Search and filter users

## Deployment

### Render.com

1. Connect your GitHub repository to Render
2. Create a PostgreSQL database
3. Set environment variables in Render dashboard
4. Deploy the web service

### Environment Variables for Production

```bash
DATABASE_URL=postgresql://...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth/login
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
NEXT_PUBLIC_APP_URL=https://your-app.onrender.com
NODE_ENV=production
SESSION_COOKIE_SECRET=your_secure_session_secret
```

## Development

### Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed database with initial data
npm run test         # Run tests
```

### Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- auth.test.ts
```

## Security Considerations

- Never commit `.env.local` or `.env` files
- Use strong, unique secrets for production
- Monitor audit logs for suspicious activity
- Implement rate limiting in production
- Use HTTPS in production
- Keep dependencies updated

## Troubleshooting

### Common Issues

1. **"Email not in allow list"** - Add the user's email to the allow list via admin panel
2. **Clerk authentication failed** - Check Clerk configuration and API keys
3. **Database connection failed** - Verify DATABASE_URL is correct
4. **CORS errors** - Ensure NEXT_PUBLIC_APP_URL matches your domain

### Debug Mode

Set `NODE_ENV=development` to enable:
- Detailed error messages
- Additional logging
- Development-specific Clerk features

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the audit logs
3. Open an issue on GitHub
4. Contact your administrator
