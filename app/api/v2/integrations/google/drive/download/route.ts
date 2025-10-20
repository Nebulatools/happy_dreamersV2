import { withApi } from '@/lib/api-middleware'
import { stdOk, stdError } from '@/lib/api-utils-v2'
import { z } from 'zod'

const ALLOWED = ['application/pdf', 'text/plain']

const querySchema = z.object({ fileId: z.string().min(1), mimeType: z.string().min(1) })

export const GET = withApi(async ({ query, requestId }) => {
  if (!ALLOWED.includes(query.mimeType)) return stdError('forbidden', 'File type not allowed', requestId, 403)
  // Stub: Metadata only to avoid leaking tokens
  return stdOk({ id: query.fileId, mimeType: query.mimeType, size: 0 }, requestId)
}, { auth: 'user', rateLimit: { limit: 30, windowMs: 60_000, key: 'gdrive_download' }, validate: { query: querySchema } })

