import { withApi } from '@/lib/api-middleware'
import { stdOk, stdError } from '@/lib/api-utils-v2'
import { z } from 'zod'
import { zObjectIdString } from '@/src/domain/object-id'
import { getDb } from '@/core-v3/infra/db'

const bodySchema = z.object({
  sessionId: zObjectIdString(z),
  reportId: zObjectIdString(z).optional(),
})

export const POST = withApi(async ({ body, requestId }) => {
  const db = await getDb()
  const now = new Date()
  // Lookup session
  const session = await db.collection('zoom_sessions').findOne({ _id: body.sessionId })
  if (!session) return stdError('not_found', 'Session not found', requestId, 404)
  // Create report if missing
  let reportId = body.reportId
  if (!reportId) {
    const res = await db.collection('consultation_reports').insertOne({
      childId: session.childId,
      userId: session.userId,
      summary: 'Transcript processed',
      createdAt: now,
      updatedAt: now,
    })
    reportId = res.insertedId as any
  }
  // Link session -> report and mark status
  await db.collection('zoom_sessions').updateOne({ _id: body.sessionId }, { $set: { status: 'transcript_processed', reportId, updatedAt: now } })
  return stdOk({ sessionId: String(body.sessionId), reportId: String(reportId) }, requestId)
}, { auth: 'user', validate: { body: bodySchema }, rateLimit: { limit: 10, windowMs: 60_000, key: 'zoom_reprocess' } })

