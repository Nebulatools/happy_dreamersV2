import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { grantAccess } from "@/lib/db/user-child-access"
import { createLogger } from "@/lib/logger"

const logger = createLogger("API:ChildAccess:link")

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const childId = params.id
    const body = await request.json().catch(() => ({}))
    const { userId, role = "caregiver", relationshipType, relationshipDescription, expiresAt } = body || {}
    if (!userId) {
      return NextResponse.json({ error: "userId es requerido" }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const user = await db.collection("users").findOne({ _id: new ObjectId(userId) })
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    const result = await grantAccess(
      session.user.id,
      childId,
      user.email,
      role,
      relationshipType,
      relationshipDescription,
      expiresAt ? new Date(expiresAt) : undefined,
      (session.user as any).role === "admin"
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json({ success: true, message: "Usuario vinculado exitosamente" })
  } catch (error) {
    logger.error("Error vinculando usuario existente:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

