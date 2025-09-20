# Deployment Guide

This guide covers deploying the Secure Sign-In Template to Render.com.

## Prerequisites

- GitHub repository with the code
- Render.com account
- Identity Provider account (Auth0, Clerk, Stytch, or Supabase Auth)

## Render.com Deployment

### 1. Create Database

1. Go to your Render dashboard
2. Click "New +" → "PostgreSQL"
3. Name it `secure-signin-db`
4. Choose the free plan
5. Select your preferred region
6. Click "Create Database"
7. Note the connection string

### 2. Deploy Web Service

1. Go to your Render dashboard
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `secure-signin-web`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`

### 3. Configure Environment Variables

Set these environment variables in your Render service:

#### Required Variables
```bash
NODE_ENV=production
DATABASE_URL=postgresql://... (from your database)
IDP_ISSUER=https://your-domain.auth0.com
IDP_CLIENT_ID=your_client_id
IDP_CLIENT_SECRET=your_client_secret
JWT_AUDIENCE=your_api_identifier
NEXT_PUBLIC_APP_URL=https://your-app.onrender.com
SESSION_COOKIE_SECRET=your_secure_random_string
```

#### Optional Variables
```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 4. Run Database Migrations

After deployment, run the database migrations:

1. Go to your service's shell
2. Run: `npm run db:migrate`
3. (Optional) Seed with initial data: `npm run db:seed`

### 5. Configure Identity Provider

#### Auth0 Setup
1. Go to Auth0 Dashboard → Applications
2. Create a new "Single Page Application"
3. Set these URLs:
   - **Allowed Callback URLs**: `https://your-app.onrender.com/auth/callback`
   - **Allowed Logout URLs**: `https://your-app.onrender.com`
   - **Allowed Web Origins**: `https://your-app.onrender.com`
4. Go to APIs and create a new API
5. Note the **Identifier** (this is your JWT_AUDIENCE)
6. Copy the **Domain** (this is your IDP_ISSUER)

#### Clerk Setup
1. Go to Clerk Dashboard → Applications
2. Create a new application
3. Go to "Paths" and set:
   - **Sign-in URL**: `/auth/login`
   - **Sign-up URL**: `/auth/login`
   - **After sign-in URL**: `/dashboard`
   - **After sign-up URL**: `/dashboard`
4. Go to "API Keys" and copy:
   - **Publishable Key** (IDP_CLIENT_ID)
   - **Secret Key** (IDP_CLIENT_SECRET)
5. Note your **Frontend API** URL (IDP_ISSUER)

#### Supabase Auth Setup
1. Go to Supabase Dashboard → Project Settings
2. Go to "API" section
3. Copy:
   - **Project URL** (IDP_ISSUER)
   - **anon public** key (IDP_CLIENT_ID)
   - **service_role** key (IDP_CLIENT_SECRET)
4. Go to "Authentication" → "URL Configuration"
5. Add to **Redirect URLs**: `https://your-app.onrender.com/auth/callback`

### 6. Test Deployment

1. Visit your app URL: `https://your-app.onrender.com`
2. You should be redirected to the login page
3. Try logging in with a test user
4. Check the admin panel at `/admin`

### 7. Add Initial Users

1. Go to `/admin` (you'll need to be logged in as admin)
2. Add users to the allow list
3. Or use the API to add users programmatically

## Environment-Specific Configuration

### Development
```bash
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/secure_signin_dev
NEXT_PUBLIC_APP_URL=http://localhost:3000
JWT_MOCK_SECRET=mock-secret-for-development
```

### Staging
```bash
NODE_ENV=staging
DATABASE_URL=postgresql://staging-db-url
NEXT_PUBLIC_APP_URL=https://staging-app.onrender.com
# Use staging IdP credentials
```

### Production
```bash
NODE_ENV=production
DATABASE_URL=postgresql://production-db-url
NEXT_PUBLIC_APP_URL=https://your-app.onrender.com
# Use production IdP credentials
```

## Security Checklist

- [ ] HTTPS is enabled (automatic on Render)
- [ ] Environment variables are set securely
- [ ] Database is not publicly accessible
- [ ] JWT secrets are strong and unique
- [ ] IdP is configured with correct callback URLs
- [ ] Rate limiting is configured
- [ ] Audit logging is working
- [ ] Admin users are properly configured

## Monitoring

### Health Checks
- **Endpoint**: `/api/health`
- **Expected Response**: `{"status": "healthy", ...}`

### Logs
- View logs in Render dashboard
- Check for authentication errors
- Monitor audit logs in admin panel

### Database
- Monitor database performance
- Check for failed queries
- Review audit log table size

## Troubleshooting

### Common Issues

1. **"Database connection failed"**
   - Check DATABASE_URL is correct
   - Ensure database is running
   - Verify SSL settings

2. **"JWT verification failed"**
   - Check IDP_ISSUER and JWT_AUDIENCE
   - Verify IdP configuration
   - Check token expiration

3. **"Email not in allow list"**
   - Add user via admin panel
   - Check user is active
   - Verify email normalization

4. **"CORS errors"**
   - Check NEXT_PUBLIC_APP_URL
   - Verify IdP callback URLs
   - Check middleware configuration

### Debug Mode

Set `NODE_ENV=development` to enable:
- Detailed error messages
- Mock JWT tokens
- Additional logging

## Scaling

### Database
- Upgrade to paid PostgreSQL plan
- Configure connection pooling
- Set up read replicas

### Application
- Upgrade to paid web service plan
- Configure auto-scaling
- Set up CDN

### Monitoring
- Set up external monitoring
- Configure alerting
- Implement log aggregation

## Backup and Recovery

### Database Backups
- Render provides automatic backups
- Configure backup retention
- Test restore procedures

### Application Backups
- Code is in Git repository
- Environment variables are in Render
- Configuration is in code

## Maintenance

### Regular Tasks
- Update dependencies
- Review audit logs
- Check security advisories
- Monitor performance

### Updates
- Deploy from main branch
- Run database migrations
- Test in staging first
- Monitor after deployment
