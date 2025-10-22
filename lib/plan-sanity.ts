import { connectToDatabase } from '@/lib/mongodb'
import { CONF } from '@/core-v3/config'

export class PlanSanityError extends Error {
  status = 422
  code: string
  details?: any
  constructor(code: string, message: string, details?: any) {
    super(message)
    this.code = code
    this.details = details
  }
}

function monthsBetween(a: Date, b: Date): number {
  const years = b.getUTCFullYear() - a.getUTCFullYear()
  const months = b.getUTCMonth() - a.getUTCMonth()
  const total = years * 12 + months
  return b.getUTCDate() < a.getUTCDate() ? total - 1 : total
}

export async function hasMinimumRecentEvents(
  childId: any,
  windowDays: number,
  minCount: number,
  minTypes: number,
): Promise<boolean> {
  const { db } = await connectToDatabase()
  const now = new Date()
  const from = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000)
  const match = { childId, startTime: { $gte: from, $lte: now } }
  const count = await db.collection('events').countDocuments(match)
  if (count < minCount) return false
  const rows = await db
    .collection('events')
    .aggregate<{ _id: string; count: number }>([
      { $match: match },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ])
    .toArray()
  const distinctTypes = rows.length
  return distinctTypes >= minTypes
}

export async function validAgeInMonths(childId: any): Promise<boolean> {
  const { db } = await connectToDatabase()
  const child = await db.collection('children').findOne({ _id: childId }, { projection: { birthdate: 1 } })
  const birthdate = (child as any)?.birthdate
  if (!(birthdate instanceof Date)) return false
  const age = monthsBetween(birthdate as Date, new Date())
  return Number.isFinite(age) && age >= 0
}

export async function consistentIdTypesAcrossCollections(childId: any): Promise<boolean> {
  const { db } = await connectToDatabase()
  const sampleEvents = await db
    .collection('events')
    .find({ childId }, { projection: { childId: 1 } })
    .limit(20)
    .toArray()
  const samplePlans = await db
    .collection('plans')
    .find({ childId }, { projection: { childId: 1 } })
    .limit(20)
    .toArray()
  const all = [...sampleEvents, ...samplePlans]
  // If there are no docs, treat as consistent (other gates will fail)
  return all.every((d) => {
    const v = (d as any)?.childId
    if (!v) return false
    // Accept ObjectId-like objects (avoid importing mongodb in tests)
    return typeof v === 'object'
  })
}

async function getEventStats(childId: any, windowDays: number) {
  const { db } = await connectToDatabase()
  const now = new Date()
  const from = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000)
  const match = { childId, startTime: { $gte: from, $lte: now } }
  const eventCount = await db.collection('events').countDocuments(match)
  const rows = await db
    .collection('events')
    .aggregate<{ _id: string; count: number }>([{ $match: match }, { $group: { _id: '$type', count: { $sum: 1 } } }])
    .toArray()
  const distinctTypes = rows.length
  return { eventCount, distinctTypes }
}

export async function checkPlanSanityOrThrow(childId: any, userId: string) {
  const windowDays = parseInt(process.env.HD_PLAN_DEFAULT_WINDOW_DAYS || '30', 10)
  const minCount = parseInt(process.env.HD_PLAN_MIN_EVENTS || '10', 10)
  const minTypes = parseInt(process.env.HD_PLAN_MIN_DISTINCT_TYPES || '2', 10)

  // Survey-only override
  try {
    const { db } = await connectToDatabase()
    const child = await db.collection('children').findOne({ _id: childId }, { projection: { surveyData: 1 } })
    const s: any = (child as any)?.surveyData
    const surveyComplete = !!(s?.completed === true || (s && Object.keys(s).length > 0 && s?.isPartial !== true))
    if (CONF.PLAN_ALLOW_SURVEY_ONLY && surveyComplete) {
      return { ok: true, mode: 'survey_only' } as const
    }
  } catch {}

  const { eventCount, distinctTypes } = await getEventStats(childId, windowDays)
  const okEvents = eventCount >= minCount && distinctTypes >= minTypes
  if (!okEvents) {
    const details = { eventCount, distinctTypes, required: { minEvents: minCount, minDistinctTypes: minTypes } }
    throw new PlanSanityError('insufficient_data', 'Faltan datos para generar el plan', details)
  }

  const okAge = await validAgeInMonths(childId)
  if (!okAge) throw new PlanSanityError('invalid_age', 'Invalid or missing child age')

  const okIds = await consistentIdTypesAcrossCollections(childId)
  if (!okIds) throw new PlanSanityError('inconsistent_ids', 'Inconsistent childId types across collections')

  return true
}
