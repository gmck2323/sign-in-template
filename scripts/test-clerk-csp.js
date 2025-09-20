#!/usr/bin/env node

/**
 * Clerk CSP Test Script
 * Tests if Clerk resources can be loaded with current CSP configuration
 */

const https = require('https');
const http = require('http');

const CLERK_DOMAINS = [
  'https://clerk.com',
  'https://clerk.dev', 
  'https://clerk.accounts.dev',
  'https://api.clerk.com'
];

const CLERK_RESOURCES = [
  'https://clerk.com/static/js/clerk.js',
  'https://clerk.dev/static/js/clerk.js',
  'https://clerk.accounts.dev/static/js/clerk.js'
];

async function testDomain(domain) {
  return new Promise((resolve) => {
    const url = new URL(domain);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: '/',
      method: 'HEAD',
      timeout: 5000
    };

    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.request(options, (res) => {
      resolve({
        domain,
        status: res.statusCode,
        headers: res.headers,
        success: res.statusCode >= 200 && res.statusCode < 400
      });
    });

    req.on('error', (err) => {
      resolve({
        domain,
        error: err.message,
        success: false
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        domain,
        error: 'Timeout',
        success: false
      });
    });

    req.setTimeout(5000);
    req.end();
  });
}

async function testClerkResources() {
  console.log('🔍 Testing Clerk Domain Connectivity...\n');

  const results = await Promise.all(CLERK_DOMAINS.map(testDomain));

  results.forEach(result => {
    if (result.success) {
      console.log(`✅ ${result.domain} - Status: ${result.status}`);
    } else {
      console.log(`❌ ${result.domain} - Error: ${result.error || 'Unknown error'}`);
    }
  });

  console.log('\n📋 CSP Configuration Check:');
  console.log('Make sure your CSP includes these domains:');
  CLERK_DOMAINS.forEach(domain => {
    console.log(`  - ${domain}`);
    console.log(`  - ${domain.replace('https://', 'https://*.')}`);
  });

  console.log('\n🔧 Required CSP Directives:');
  console.log('script-src: \'self\' \'unsafe-inline\' \'unsafe-eval\' https://clerk.com https://*.clerk.com https://clerk.dev https://*.clerk.dev https://clerk.accounts.dev https://*.clerk.accounts.dev');
  console.log('connect-src: \'self\' https://clerk.com https://*.clerk.com https://api.clerk.com https://clerk.dev https://*.clerk.dev https://clerk.accounts.dev https://*.clerk.accounts.dev wss://*.clerk.com wss://*.clerk.dev wss://*.clerk.accounts.dev');
  console.log('frame-src: \'self\' https://clerk.com https://*.clerk.com https://clerk.dev https://*.clerk.dev https://clerk.accounts.dev https://*.clerk.accounts.dev');
  console.log('style-src: \'self\' \'unsafe-inline\' https://clerk.com https://*.clerk.com https://clerk.dev https://*.clerk.dev https://clerk.accounts.dev https://*.clerk.accounts.dev');
  console.log('img-src: \'self\' data: https: blob: https://clerk.com https://*.clerk.com https://clerk.dev https://*.clerk.dev https://clerk.accounts.dev https://*.clerk.accounts.dev');

  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;

  console.log(`\n📊 Results: ${successCount}/${totalCount} domains accessible`);

  if (successCount === totalCount) {
    console.log('🎉 All Clerk domains are accessible!');
  } else {
    console.log('⚠️  Some Clerk domains are not accessible. Check your network connection and CSP configuration.');
  }
}

if (require.main === module) {
  testClerkResources().catch(console.error);
}

module.exports = { testClerkResources, testDomain };