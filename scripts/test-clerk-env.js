#!/usr/bin/env node

/**
 * Clerk Environment Variables Test
 * Verifies that all required Clerk environment variables are set
 */

require('dotenv').config();

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'NEXT_PUBLIC_CLERK_SIGN_IN_URL',
  'NEXT_PUBLIC_CLERK_SIGN_UP_URL',
  'NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL',
  'NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL'
];

const OPTIONAL_ENV_VARS = [
  'NEXT_PUBLIC_APP_URL',
  'NODE_ENV'
];

function testEnvironmentVariables() {
  console.log('🔍 Testing Clerk Environment Variables...\n');

  let allRequired = true;
  let allOptional = true;

  console.log('Required Variables:');
  REQUIRED_ENV_VARS.forEach(varName => {
    const value = process.env[varName];
    if (value && value.trim() !== '') {
      console.log(`✅ ${varName}: ${value.substring(0, 20)}${value.length > 20 ? '...' : ''}`);
    } else {
      console.log(`❌ ${varName}: Not set or empty`);
      allRequired = false;
    }
  });

  console.log('\nOptional Variables:');
  OPTIONAL_ENV_VARS.forEach(varName => {
    const value = process.env[varName];
    if (value && value.trim() !== '') {
      console.log(`✅ ${varName}: ${value}`);
    } else {
      console.log(`⚠️  ${varName}: Not set (optional)`);
      allOptional = false;
    }
  });

  console.log('\n📊 Results:');
  if (allRequired) {
    console.log('🎉 All required Clerk environment variables are set!');
  } else {
    console.log('❌ Some required Clerk environment variables are missing.');
    console.log('   Please check your .env.local file and ensure all required variables are set.');
  }

  if (!allOptional) {
    console.log('⚠️  Some optional environment variables are not set.');
    console.log('   These are not required but may improve functionality.');
  }

  // Test specific Clerk key formats
  console.log('\n🔑 Clerk Key Validation:');
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (publishableKey) {
    if (publishableKey.startsWith('pk_test_') || publishableKey.startsWith('pk_live_')) {
      console.log('✅ Publishable key format looks correct');
    } else {
      console.log('⚠️  Publishable key format may be incorrect (should start with pk_test_ or pk_live_)');
    }
  }

  if (secretKey) {
    if (secretKey.startsWith('sk_test_') || secretKey.startsWith('sk_live_')) {
      console.log('✅ Secret key format looks correct');
    } else {
      console.log('⚠️  Secret key format may be incorrect (should start with sk_test_ or sk_live_)');
    }
  }

  return allRequired;
}

if (require.main === module) {
  const success = testEnvironmentVariables();
  process.exit(success ? 0 : 1);
}

module.exports = { testEnvironmentVariables };
