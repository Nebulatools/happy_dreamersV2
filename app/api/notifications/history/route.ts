// API para historial de notificaciones

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

// GET: Obtener historial de notificaciones
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db()

    const { searchParams } = new URL(request.url)
    const childId = searchParams.get("childId")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")
    const status = searchParams.get("status")
    const type = searchParams.get("type")

    // Construir filtro de búsqueda
    const filter: any = {
      userId: session.user.id
    }

    if (childId) {
      // Verificar acceso al niño
      const child = await db.collection("children").findOne({
        _id: new ObjectId(childId)
      })
      
      if (!child) {
        return NextResponse.json(
          { error: "Niño no encontrado" },
          { status: 404 }
        )
      }

      const hasAccess = child.parentId === session.user.id ||
        child.sharedWith?.includes(session.user.id)

      if (!hasAccess && session.user.role !== "admin") {
        return NextResponse.json(
          { error: "No tienes acceso a este perfil" },
          { status: 403 }
        )
      }

      filter.childId = childId
    }

    if (status) {
      filter.status = status
    }

    if (type) {
      filter.type = type
    }

    // Obtener notificaciones con paginación
    const notifications = await db.collection("notificationlogs")
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .toArray()

    const total = await db.collection("notificationlogs").countDocuments(filter)

    // Obtener estadísticas básicas
    const stats = {
      total: 0,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0
    }

    if (childId) {
      const statsPipeline = [
        { $match: { childId: childId, userId: session.user.id } },
        { $group: {
          _id: "$status",
          count: { $sum: 1 }
        }}
      ]

      const statsResult = await db.collection("notificationlogs")
        .aggregate(statsPipeline)
        .toArray()

      statsResult.forEach(item => {
        if (item._id === "sent") stats.sent = item.count
        else if (item._id === "delivered") stats.delivered = item.count
        else if (item._id === "read") stats.read = item.count
        else if (item._id === "failed") stats.failed = item.count
        stats.total += item.count
      })
    }

    return NextResponse.json({
      success: true,
      notifications,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      stats
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

    const client = await clientPromise
    const db = client.db()

    const body = await request.json()
    const { notificationId, action } = body

    if (!notificationId || !action) {
      return NextResponse.json(
        { error: "Datos incompletos" },
        { status: 400 }
      )
    }

    // Buscar la notificación
    const notification = await db.collection("notificationlogs").findOne({
      _id: new ObjectId(notificationId),
      userId: session.user.id
    })

    if (!notification) {
      return NextResponse.json(
        { error: "Notificación no encontrada" },
        { status: 404 }
      )
    }

    // Ejecutar acción según el tipo
    let updateData: any = {}
    
    switch (action) {
      case "read":
        updateData = { 
          status: "read", 
          readAt: new Date(),
          updatedAt: new Date()
        }
        break
      case "delivered":
        updateData = { 
          status: "delivered", 
          deliveredAt: new Date(),
          updatedAt: new Date()
        }
        break
      default:
        return NextResponse.json(
          { error: "Acción no válida" },
          { status: 400 }
        )
    }

    // Actualizar la notificación
    await db.collection("notificationlogs").updateOne(
      { _id: new ObjectId(notificationId) },
      { $set: updateData }
    )

    return NextResponse.json({
      success: true,
      message: `Notificación marcada como ${action}`,
      notification: { ...notification, ...updateData }
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

    const client = await clientPromise
    const db = client.db()

    const { searchParams } = new URL(request.url)
    const childId = searchParams.get("childId")
    const olderThanDays = parseInt(searchParams.get("olderThanDays") || "30")

    // Calcular fecha límite
    const dateLimit = new Date()
    dateLimit.setDate(dateLimit.getDate() - olderThanDays)

    // Construir filtro
    const filter: any = {
      userId: session.user.id,
      createdAt: { $lt: dateLimit },
      status: { $in: ["read", "failed", "cancelled"] }
    }

    if (childId) {
      filter.childId = childId
    }

    // Eliminar notificaciones antiguas
    const result = await db.collection("notificationlogs").deleteMany(filter)

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