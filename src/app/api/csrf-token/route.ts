import { NextRequest } from 'next/server';
import { generateCSRFTokenEndpoint } from '@/lib/csrf-protection';
import { withRateLimit } from '@/lib/middleware/rate-limit';
import { withRequestLimits, requestLimitConfigs } from '@/lib/middleware/request-limits';

async function csrfTokenHandler(request: NextRequest) {
  return await generateCSRFTokenEndpoint(request);
}

export const GET = withRequestLimits(requestLimitConfigs.api)(
  withRateLimit({ type: 'api' })(csrfTokenHandler)
);
