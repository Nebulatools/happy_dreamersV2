import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"

import { createLogger } from "@/lib/logger"

const logger = createLogger("API:admin:users:route")


// GET /api/admin/users - obtener todos los usuarios (solo para admins)
export async function GET(req: NextRequest) {
  try {
    // Verificar la sesión del usuario
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    
    // Verificar si el usuario es admin
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado. Se requiere rol de administrador." }, { status: 403 })
    }
    
    // Conectar a la base de datos
    const client = await clientPromise
    const db = client.db()
    
    // Obtener la lista de usuarios
    const users = await db.collection("users")
      .find({})
      .project({ 
        password: 0,  // Excluir el password por seguridad
        hashedPassword: 0,  // Excluir el hashedPassword por seguridad
      })
      .toArray()
    
    return NextResponse.json(users)
  } catch (error: any) {
    logger.error("Error al obtener usuarios:", error.message)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
} 