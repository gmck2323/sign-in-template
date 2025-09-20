// CSP Debug Utility
// Use this to help debug CSP violations in development

export interface CSPViolation {
  blockedURI: string;
  violatedDirective: string;
  originalPolicy: string;
  sourceFile?: string;
  lineNumber?: number;
  columnNumber?: number;
}

export function setupCSPViolationReporting() {
  if (typeof window === 'undefined') return;

  // Listen for CSP violations
  document.addEventListener('securitypolicyviolation', (event) => {
    const violation: CSPViolation = {
      blockedURI: event.blockedURI,
      violatedDirective: event.violatedDirective,
      originalPolicy: event.originalPolicy,
      sourceFile: event.sourceFile,
      lineNumber: event.lineNumber,
      columnNumber: event.columnNumber,
    };

    console.group('🚨 CSP Violation Detected');
    console.error('Blocked URI:', violation.blockedURI);
    console.error('Violated Directive:', violation.violatedDirective);
    console.error('Source File:', violation.sourceFile);
    console.error('Line:', violation.lineNumber, 'Column:', violation.columnNumber);
    console.error('Original Policy:', violation.originalPolicy);
    console.groupEnd();

    // Send to your logging service in production
    if (process.env.NODE_ENV === 'production') {
      // Example: send to your analytics/logging service
      // analytics.track('csp_violation', violation);
    }
  });
}

export function checkClerkResources() {
  if (typeof window === 'undefined') return;

  const clerkDomains = [
    'https://clerk.com',
    'https://*.clerk.com',
    'https://clerk.dev',
    'https://*.clerk.dev',
    'https://clerk.accounts.dev',
    'https://*.clerk.accounts.dev',
    'https://api.clerk.com',
  ];

  console.group('🔍 Clerk Resource Check');
  console.log('Checking if Clerk resources can be loaded...');

  // Check if Clerk scripts are loaded
  const clerkScripts = document.querySelectorAll('script[src*="clerk"]');
  console.log('Clerk scripts found:', clerkScripts.length);

  // Check for Clerk iframes
  const clerkFrames = document.querySelectorAll('iframe[src*="clerk"]');
  console.log('Clerk iframes found:', clerkFrames.length);

  // Check for Clerk styles
  const clerkStyles = document.querySelectorAll('link[href*="clerk"], style[data-clerk]');
  console.log('Clerk styles found:', clerkStyles.length);

  console.groupEnd();
}

export function logCSPHeaders() {
  if (typeof window === 'undefined') return;

  console.group('📋 Current CSP Headers');
  
  // Get CSP header from meta tag
  const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (cspMeta) {
    console.log('CSP Meta Tag:', cspMeta.getAttribute('content'));
  }

  // Get CSP header from response headers (if available)
  fetch(window.location.href, { method: 'HEAD' })
    .then(response => {
      const cspHeader = response.headers.get('Content-Security-Policy');
      if (cspHeader) {
        console.log('CSP Response Header:', cspHeader);
      }
    })
    .catch(err => console.log('Could not fetch CSP headers:', err));

  console.groupEnd();
}

// Development helper to temporarily disable CSP for testing
export function createCSPBypassScript() {
  if (process.env.NODE_ENV !== 'development') return;

  const script = document.createElement('script');
  script.textContent = `
    console.warn('⚠️ CSP Bypass script loaded - DO NOT USE IN PRODUCTION');
    // This script can help identify what resources are being blocked
    // Remove this after debugging
  `;
  document.head.appendChild(script);
}
