import { withApi } from '@/lib/api-middleware'
import { stdOk, stdError } from '@/lib/api-utils-v2'
import { z } from 'zod'

const ALLOWED = ['application/pdf', 'text/plain']

const querySchema = z.object({ types: z.string().optional() })

export const GET = withApi(async ({ query, requestId }) => {
  const allow = query.types ? String(query.types).split(',').map((s) => s.trim()).filter(Boolean) : ALLOWED
  const filtered = allow.filter((t) => ALLOWED.includes(t))
  if (!filtered.length) return stdError('invalid_query', 'No allowed types', requestId, 400)
  // Stub: return consistent metadata shape (id, name, mimeType)
  const items = filtered.map((t, idx) => ({ id: `file_${idx + 1}`, name: `Sample ${idx + 1}`, mimeType: t }))
  return stdOk({ items }, requestId)
}, { auth: 'user', rateLimit: { limit: 30, windowMs: 60_000, key: 'gdrive_list' }, validate: { query: querySchema } })

