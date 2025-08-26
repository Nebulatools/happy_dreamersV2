// API para historial de notificaciones

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import dbConnect from "@/lib/mongodb"
import NotificationLog from "@/models/notification-log"
import Child from "@/models/Child"
import { Types } from "mongoose"

// GET: Obtener historial de notificaciones
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    await dbConnect()

    const { searchParams } = new URL(request.url)
    const childId = searchParams.get("childId")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")
    const status = searchParams.get("status")
    const type = searchParams.get("type")

    // Construir filtro de búsqueda
    const filter: any = {
      userId: new Types.ObjectId(session.user.id)
    }

    if (childId) {
      // Verificar acceso al niño
      const child = await Child.findById(childId)
      if (!child) {
        return NextResponse.json(
          { error: "Niño no encontrado" },
          { status: 404 }
        )
      }

      const hasAccess = child.userId.toString() === session.user.id ||
        child.caregivers?.some(c => c.userId.toString() === session.user.id)

      if (!hasAccess) {
        return NextResponse.json(
          { error: "No tienes acceso a este perfil" },
          { status: 403 }
        )
      }

      filter.childId = new Types.ObjectId(childId)
    }

    if (status) {
      filter.status = status
    }

    if (type) {
      filter.type = type
    }

    // Obtener notificaciones con paginación
    const [notifications, total] = await Promise.all([
      NotificationLog
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .populate("childId", "name")
        .lean(),
      NotificationLog.countDocuments(filter)
    ])

    // Obtener estadísticas
    const stats = await NotificationLog.getStats(
      new Types.ObjectId(session.user.id),
      childId ? new Types.ObjectId(childId) : undefined,
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Últimos 30 días
    )

    return NextResponse.json({
      success: true,
      notifications,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      stats: stats[0] || {
        total: 0,
        sent: 0,
        delivered: 0,
        read: 0,
        failed: 0
      }
    })

  } catch (error) {
    console.error("Error obteniendo historial de notificaciones:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// POST: Marcar notificación como leída
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    await dbConnect()

    const body = await request.json()
    const { notificationId, action } = body

    if (!notificationId || !action) {
      return NextResponse.json(
        { error: "Datos incompletos" },
        { status: 400 }
      )
    }

    // Buscar la notificación
    const notification = await NotificationLog.findOne({
      _id: new Types.ObjectId(notificationId),
      userId: new Types.ObjectId(session.user.id)
    })

    if (!notification) {
      return NextResponse.json(
        { error: "Notificación no encontrada" },
        { status: 404 }
      )
    }

    // Ejecutar acción según el tipo
    switch (action) {
      case "read":
        await notification.markAsRead()
        break
      case "delivered":
        await notification.markAsDelivered()
        break
      default:
        return NextResponse.json(
          { error: "Acción no válida" },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      message: `Notificación marcada como ${action}`,
      notification
    })

  } catch (error) {
    console.error("Error actualizando notificación:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// DELETE: Eliminar notificaciones antiguas
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    await dbConnect()

    const { searchParams } = new URL(request.url)
    const childId = searchParams.get("childId")
    const olderThanDays = parseInt(searchParams.get("olderThanDays") || "30")

    // Calcular fecha límite
    const dateLimit = new Date()
    dateLimit.setDate(dateLimit.getDate() - olderThanDays)

    // Construir filtro
    const filter: any = {
      userId: new Types.ObjectId(session.user.id),
      createdAt: { $lt: dateLimit },
      status: { $in: ["read", "failed", "cancelled"] }
    }

    if (childId) {
      filter.childId = new Types.ObjectId(childId)
    }

    // Eliminar notificaciones antiguas
    const result = await NotificationLog.deleteMany(filter)

    return NextResponse.json({
      success: true,
      message: `${result.deletedCount} notificaciones eliminadas`,
      deletedCount: result.deletedCount
    })

  } catch (error) {
    console.error("Error eliminando notificaciones antiguas:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}