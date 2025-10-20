import { withApi } from '@/lib/api-middleware'
import { stdOk } from '@/lib/api-utils-v2'
import { snapshot } from '@/core-v3/observability/metrics'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = withApi(async ({ requestId, req }) => {
  const url = new URL(req.url)
  if (url.searchParams.get('metrics') === '1') {
    return stdOk({ status: 'ok', metrics: snapshot() }, requestId)
  }
  return stdOk({ status: 'ok', time: new Date().toISOString() }, requestId)
}, { auth: 'public', rateLimit: { limit: 30, windowMs: 60_000, key: 'v2_health' } })
