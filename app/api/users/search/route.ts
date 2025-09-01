// API para buscar usuarios por email
// Permite encontrar usuarios existentes para vincularlos como cuidadores

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"
import { createLogger } from "@/lib/logger"

const logger = createLogger("API:users:search")

export async function GET(request: NextRequest) {
  try {
    // Verificar sesión
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener parámetro de búsqueda
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email || email.length < 3) {
      return NextResponse.json({ users: [] })
    }

    // Conectar a la base de datos
    const client = await clientPromise
    const db = client.db()

    // Buscar usuarios por email (búsqueda parcial, case-insensitive)
    const users = await db.collection("users")
      .find({
        email: { $regex: email, $options: "i" },
        // Excluir el usuario actual de los resultados
        _id: { $ne: session.user.id }
      })
      .project({
        _id: 1,
        name: 1,
        email: 1,
        image: 1
      })
      .limit(10)
      .toArray()

    logger.info(`Búsqueda de usuarios: ${email}, encontrados: ${users.length}`)

    return NextResponse.json({ users })
  } catch (error) {
    logger.error("Error buscando usuarios:", error)
    return NextResponse.json(
      { error: "Error al buscar usuarios" },
      { status: 500 }
    )
  }
}