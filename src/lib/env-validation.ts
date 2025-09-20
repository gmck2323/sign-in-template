interface EnvConfig {
  // Required environment variables
  DATABASE_URL: string;
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: string;
  CLERK_SECRET_KEY: string;
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: string;
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: string;
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: string;
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: string;
  NEXT_PUBLIC_APP_URL: string;
  NODE_ENV: string;
  SESSION_COOKIE_SECRET: string;
  ADMIN_EMAIL: string;
  
  // Optional environment variables
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  SLACK_WEBHOOK_URL?: string;
  RATE_LIMIT_WINDOW_MS?: string;
  RATE_LIMIT_MAX_REQUESTS?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required environment variables
  const requiredVars: (keyof EnvConfig)[] = [
    'DATABASE_URL',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
    'NEXT_PUBLIC_CLERK_SIGN_IN_URL',
    'NEXT_PUBLIC_CLERK_SIGN_UP_URL',
    'NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL',
    'NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL',
    'NEXT_PUBLIC_APP_URL',
    'NODE_ENV',
    'SESSION_COOKIE_SECRET',
    'ADMIN_EMAIL',
  ];
  
  // Check required variables
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  }
  
  // Validate specific formats
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgresql://')) {
    errors.push('DATABASE_URL must be a valid PostgreSQL connection string');
  }
  
  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith('pk_')) {
    errors.push('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must be a valid Clerk publishable key');
  }
  
  if (process.env.CLERK_SECRET_KEY && !process.env.CLERK_SECRET_KEY.startsWith('sk_')) {
    errors.push('CLERK_SECRET_KEY must be a valid Clerk secret key');
  }
  
  if (process.env.ADMIN_EMAIL && !isValidEmail(process.env.ADMIN_EMAIL)) {
    errors.push('ADMIN_EMAIL must be a valid email address');
  }
  
  if (process.env.NODE_ENV && !['development', 'staging', 'production'].includes(process.env.NODE_ENV)) {
    errors.push('NODE_ENV must be one of: development, staging, production');
  }
  
  // Check for warnings
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    warnings.push('Redis not configured - rate limiting will use fallback mode');
  }
  
  if (process.env.NODE_ENV === 'production' && process.env.SESSION_COOKIE_SECRET && process.env.SESSION_COOKIE_SECRET.length < 32) {
    warnings.push('SESSION_COOKIE_SECRET should be at least 32 characters in production');
  }
  
  if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://')) {
    warnings.push('NEXT_PUBLIC_APP_URL should use HTTPS in production');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function getValidatedEnv(): EnvConfig {
  const validation = validateEnvironment();
  
  if (!validation.isValid) {
    console.error('Environment validation failed:');
    validation.errors.forEach(error => console.error(`  ❌ ${error}`));
    throw new Error('Invalid environment configuration');
  }
  
  if (validation.warnings.length > 0) {
    console.warn('Environment validation warnings:');
    validation.warnings.forEach(warning => console.warn(`  ⚠️  ${warning}`));
  }
  
  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY!,
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL!,
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL!,
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL!,
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL!,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL!,
    NODE_ENV: process.env.NODE_ENV!,
    SESSION_COOKIE_SECRET: process.env.SESSION_COOKIE_SECRET!,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL!,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
    RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
    RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,
  };
}

// Validate environment on module load
if (typeof window === 'undefined') {
  // Only validate on server side
  try {
    validateEnvironment();
  } catch (error) {
    console.error('Environment validation failed on startup:', error);
    process.exit(1);
  }
}
