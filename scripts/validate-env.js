#!/usr/bin/env node

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Import the validation function
const { validateEnvironment } = require('../src/lib/env-validation.ts');

console.log('🔍 Validating environment configuration...\n');

const result = validateEnvironment();

if (result.isValid) {
  console.log('✅ Environment validation passed!');
  
  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    result.warnings.forEach(warning => console.log(`   ${warning}`));
  }
  
  console.log('\n🚀 Ready to start the application!');
  process.exit(0);
} else {
  console.log('❌ Environment validation failed:');
  result.errors.forEach(error => console.log(`   ${error}`));
  
  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    result.warnings.forEach(warning => console.log(`   ${warning}`));
  }
  
  console.log('\n💡 Please check your .env file and ensure all required variables are set.');
  console.log('   See env.example for reference.');
  process.exit(1);
}
