// API para archivar/desarchivar ninos (solo admin)
// PATCH /api/admin/children/archive
// Body: { childId: string, archived: boolean }

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { createLogger } from "@/lib/logger"

const logger = createLogger("API:admin:children:archive")

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Acceso denegado. Se requiere rol de administrador." },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { childId, archived } = body

    if (!childId || typeof archived !== "boolean") {
      return NextResponse.json(
        { error: "Se requiere childId (string) y archived (boolean)" },
        { status: 400 }
      )
    }

    if (!ObjectId.isValid(childId)) {
      return NextResponse.json(
        { error: "ID de nino invalido" },
        { status: 400 }
      )
    }

    const { db } = await connectToDatabase()

    const result = await db.collection("children").updateOne(
      { _id: new ObjectId(childId) },
      { $set: { archived, updatedAt: new Date() } }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Nino no encontrado" },
        { status: 404 }
      )
    }

    logger.info("Child archive status updated", {
      childId,
      archived,
      adminId: session.user.id,
    })

    return NextResponse.json({
      success: true,
      message: archived
        ? "Paciente archivado correctamente"
        : "Paciente restaurado correctamente",
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error("Error al archivar/desarchivar nino:", message)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
