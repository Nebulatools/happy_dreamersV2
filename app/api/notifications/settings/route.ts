// API para gestión de configuración de notificaciones

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

// GET: Obtener configuración de notificaciones para un niño
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

    if (!childId) {
      return NextResponse.json(
        { error: "ID del niño requerido" },
        { status: 400 }
      )
    }

    // Verificar que el usuario tenga acceso al niño
    const child = await db.collection("children").findOne({
      _id: new ObjectId(childId)
    })
    
    if (!child) {
      return NextResponse.json(
        { error: "Niño no encontrado" },
        { status: 404 }
      )
    }

    // Verificar permisos (propietario o compartido)
    const hasAccess = child.parentId?.toString?.() === session.user.id ||
      (Array.isArray(child.sharedWith) && child.sharedWith.some((id: any) => id?.toString?.() === session.user.id)) ||
      session.user.role === "admin"

    if (!hasAccess) {
      return NextResponse.json(
        { error: "No tienes acceso a este perfil" },
        { status: 403 }
      )
    }

    // Buscar configuración de notificaciones existente
    let settings = await db.collection("notificationsettings").findOne({
      childId: new ObjectId(childId),
      userId: new ObjectId(session.user.id)
    })

    // Si no existe, crear configuración por defecto
    if (!settings) {
      settings = {
        childId: childId,
        userId: session.user.id,
        globalEnabled: true,
        bedtime: { enabled: true, timing: 15 },
        naptime: { enabled: true, timing: 15 },
        wakeWindow: { enabled: false, timing: 10 },
        routineStart: { enabled: true, timing: 30 },
        pushEnabled: true,
        emailEnabled: false,
        inAppEnabled: true,
        quietHours: { enabled: false, start: "22:00", end: "07:00" }
      }
    }

    return NextResponse.json({
      success: true,
      settings
    })

  } catch (error) {
    console.error("Error obteniendo configuración:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// PUT: Actualizar configuración de notificaciones
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db()

    const body = await request.json()
    const { childId, ...settingsData } = body

    if (!childId) {
      return NextResponse.json(
        { error: "ID del niño requerido" },
        { status: 400 }
      )
    }

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

    const hasAccess = child.parentId?.toString?.() === session.user.id ||
      (Array.isArray(child.sharedWith) && child.sharedWith.some((id: any) => id?.toString?.() === session.user.id)) ||
      session.user.role === "admin"

    if (!hasAccess) {
      return NextResponse.json(
        { error: "No tienes acceso a este perfil" },
        { status: 403 }
      )
    }

    // Actualizar o crear configuración
    const result = await db.collection("notificationsettings").updateOne(
      { childId: new ObjectId(childId), userId: new ObjectId(session.user.id) },
      {
        $set: {
          ...settingsData,
          childId: new ObjectId(childId),
          userId: new ObjectId(session.user.id),
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    )

    return NextResponse.json({
      success: true,
      message: "Configuración actualizada exitosamente",
      updated: result.modifiedCount > 0 || result.upsertedCount > 0
    })

  } catch (error) {
    console.error("Error actualizando configuración:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// POST: Registrar token de notificaciones push
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db()

    const body = await request.json()
    const { childId, token, platform } = body

    if (!childId || !token || !platform) {
      return NextResponse.json(
        { error: "Datos incompletos" },
        { status: 400 }
      )
    }

    // Guardar token de push notification
    await db.collection("pushnotificationtokens").updateOne(
      { userId: new ObjectId(session.user.id), childId: new ObjectId(childId), platform: platform },
      {
        $set: {
          token: token,
          platform: platform,
          updatedAt: new Date(),
          active: true
        },
        $setOnInsert: {
          userId: new ObjectId(session.user.id),
          childId: new ObjectId(childId),
          createdAt: new Date()
        }
      },
      { upsert: true }
    )

    return NextResponse.json({
      success: true,
      message: "Token registrado exitosamente"
    })

  } catch (error) {
    console.error("Error registrando token:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
