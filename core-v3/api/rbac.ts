import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

type Role = 'admin' | 'parent'

export async function requireRole(req: Request, allowed: Role[]) {
  if (process.env.NODE_ENV === 'test') {
    const role = (req.headers.get('x-test-role') || 'parent') as Role
    const userId = req.headers.get('x-test-user-id') || 'test-user'
    if (!allowed.includes(role)) {
      return NextResponse.json({ error: 'forbidden', message: 'insufficient role' }, { status: 403 })
    }
    return { userId, role }
  }

  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const role = (session.user?.role || 'parent') as Role
  if (!allowed.includes(role)) {
    return NextResponse.json({ error: 'forbidden', message: 'insufficient role' }, { status: 403 })
  }
  return { userId: session.user.id, role }
}

