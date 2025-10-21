import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { isObjectIdHex, toObjectId } from '@/src/domain/object-id'

// GET /api/consultas/history?childId=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const childIdHex = searchParams.get('childId') || ''
    if (!isObjectIdHex(childIdHex)) {
      return NextResponse.json({ error: 'invalid_params', message: 'childId inválido' }, { status: 400 })
    }
    const childId = toObjectId(childIdHex)
    const { db } = await connectToDatabase()
    const consultations = await db
      .collection('consultation_reports')
      .find({ childId })
      .sort({ createdAt: -1 })
      .toArray()
    return NextResponse.json({ consultations })
  } catch (e: any) {
    return NextResponse.json({ error: 'internal_error', message: e?.message || 'Error' }, { status: 500 })
  }
}

