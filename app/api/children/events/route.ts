import { NextRequest, NextResponse } from 'next/server'
import { isObjectIdHex, toObjectId } from '@/src/domain/object-id'
import { connectToDatabase } from '@/lib/mongodb'

// GET /api/children/events?childId=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const childIdHex = searchParams.get('childId') || ''
    if (!isObjectIdHex(childIdHex)) {
      return NextResponse.json({ error: 'invalid_params', message: 'childId inválido' }, { status: 400 })
    }
    const childId = toObjectId(childIdHex)
    const { db } = await connectToDatabase()
    const events = await db
      .collection('events')
      .find({ childId })
      .sort({ startTime: -1 })
      .toArray()
    return NextResponse.json({ events })
  } catch (e: any) {
    return NextResponse.json({ error: 'internal_error', message: e?.message || 'Error' }, { status: 500 })
  }
}

export function POST() {
  return NextResponse.json({ error: 'not_implemented' }, { status: 405 })
}
export function PATCH() {
  return NextResponse.json({ error: 'not_implemented' }, { status: 405 })
}

