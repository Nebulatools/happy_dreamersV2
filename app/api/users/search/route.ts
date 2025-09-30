// API para buscar usuarios por email (para vincular como cuidadores)
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { createLogger } from "@/lib/logger"

const logger = createLogger("API:users:search")

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const emailRaw = searchParams.get("email") || ""
    const email = emailRaw.trim()
    if (email.length < 3) {
      return NextResponse.json({ users: [] })
    }

    const { db } = await connectToDatabase()
    const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

    const users = await db.collection("users")
      .find({
        email: { $regex: escaped, $options: "i" },
        ...(session.user.id ? { _id: { $ne: new ObjectId(session.user.id) } } : {})
      })
      .project({ _id: 1, name: 1, email: 1, image: 1 })
      .limit(10)
      .toArray()

    logger.info(`User search '${email}' → ${users.length}`)
    return NextResponse.json({ users })
  } catch (error) {
    logger.error("Error buscando usuarios:", error)
    return NextResponse.json({ error: "Error al buscar usuarios" }, { status: 500 })
  }
}

