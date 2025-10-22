import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import { isObjectIdHex, toObjectId } from '@/src/domain/object-id'

// POST /api/dev/seed-min-events
// Only available in non-production environments. Requires authenticated session.
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ ok: false, error: 'not_available' }, { status: 404 })
  }
  const session = await getServerSession(authOptions as any)
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const childIdHex = String(body?.childId || '')
    const count = Math.min(Math.max(parseInt(String(body?.count ?? '10'), 10) || 10, 2), 200)
    if (!isObjectIdHex(childIdHex)) {
      return NextResponse.json({ ok: false, error: 'invalid_params', message: 'childId inválido' }, { status: 400 })
    }
    const childId = toObjectId(childIdHex)
    const parentId = toObjectId(session.user.id)
    const { db } = await connectToDatabase()

    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000
    const types = ['sleep', 'night_waking', 'nap', 'wake'] as const
    const docs: any[] = []
    for (let i = 0; i < count; i++) {
      const type = i % 3 === 0 ? 'night_waking' : i % 2 === 0 ? 'sleep' : 'nap'
      const t = new Date(now - (i + 1) * (3 * 60 * 60 * 1000)) // cada ~3h hacia atrás
      const start = new Date(t)
      const end = new Date(t.getTime() + (type === 'nap' ? 60 : 90) * 60 * 1000)
      const doc: any = {
        childId,
        parentId,
        type,
        startTime: start,
        endTime: end,
        notes: 'seeded',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      if (type === 'sleep') doc.sleepDelay = 10
      docs.push(doc)
    }

    const res = await db.collection('events').insertMany(docs)
    return NextResponse.json({ ok: true, inserted: res.insertedCount || docs.length, childId: childIdHex })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: 'internal_error', message: e?.message || 'Error' }, { status: 500 })
  }
}

