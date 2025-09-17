import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { getInvitationsForEmail } from "@/lib/db/invitations"
import { ObjectId } from "mongodb"
import { createLogger } from "@/lib/logger"

const logger = createLogger("api/notifications/count")

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email || !session.user.id) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      )
    }

    const { db } = await connectToDatabase()

    // Contar invitaciones pendientes del usuario (por email)
    const pendingInvites = await getInvitationsForEmail(session.user.email)
    const invitationsCount = pendingInvites.length

    // Contar notificaciones in-app no leídas (sent/delivered)
    const unreadNotifications = await db.collection("notificationlogs").countDocuments({
      userId: new ObjectId(session.user.id),
      status: { $in: ["sent", "delivered"] }
    })

    const totalCount = invitationsCount + unreadNotifications

    return NextResponse.json({ success: true, count: totalCount })

  } catch (error) {
    logger.error("Error fetching notification count", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
