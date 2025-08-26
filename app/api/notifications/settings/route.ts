// API para gestión de configuración de notificaciones

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import dbConnect from "@/lib/mongodb"
import NotificationSettings from "@/models/notification-settings"
import Child from "@/models/Child"
import { Types } from "mongoose"

// GET: Obtener configuración de notificaciones para un niño
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    await dbConnect()

    const { searchParams } = new URL(request.url)
    const childId = searchParams.get("childId")

    if (!childId) {
      return NextResponse.json(
        { error: "ID del niño requerido" },
        { status: 400 }
      )
    }

    // Verificar que el usuario tenga acceso al niño
    const child = await Child.findById(childId)
    if (!child) {
      return NextResponse.json(
        { error: "Niño no encontrado" },
        { status: 404 }
      )
    }

    // Verificar permisos (propietario o cuidador con acceso)
    const hasAccess = child.userId.toString() === session.user.id ||
      child.caregivers?.some(c => c.userId.toString() === session.user.id)

    if (!hasAccess) {
      return NextResponse.json(
        { error: "No tienes acceso a este perfil" },
        { status: 403 }
      )
    }

    // Buscar configuración existente o crear una nueva
    let settings = await NotificationSettings.findOne({
      userId: new Types.ObjectId(session.user.id),
      childId: new Types.ObjectId(childId)
    })

    // Si no existe, crear configuración por defecto
    if (!settings) {
      settings = await NotificationSettings.create({
        userId: new Types.ObjectId(session.user.id),
        childId: new Types.ObjectId(childId),
        globalEnabled: true,
        bedtime: {
          enabled: true,
          timing: 15
        },
        naptime: {
          enabled: true,
          timing: 15
        },
        wakeWindow: {
          enabled: false,
          timing: 10
        },
        routineStart: {
          enabled: true,
          timing: 30
        },
        pushEnabled: true,
        emailEnabled: false,
        inAppEnabled: true,
        pushTokens: [],
        quietHours: {
          enabled: false,
          start: "22:00",
          end: "07:00"
        }
      })
    }

    return NextResponse.json({
      success: true,
      settings
    })

  } catch (error) {
    console.error("Error obteniendo configuración de notificaciones:", error)
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

    await dbConnect()

    const body = await request.json()
    const { childId, ...updateData } = body

    if (!childId) {
      return NextResponse.json(
        { error: "ID del niño requerido" },
        { status: 400 }
      )
    }

    // Verificar que el usuario tenga acceso al niño
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

    // Actualizar configuración
    const settings = await NotificationSettings.findOneAndUpdate(
      {
        userId: new Types.ObjectId(session.user.id),
        childId: new Types.ObjectId(childId)
      },
      { $set: updateData },
      { 
        new: true, 
        upsert: true,
        runValidators: true
      }
    )

    return NextResponse.json({
      success: true,
      settings,
      message: "Configuración actualizada exitosamente"
    })

  } catch (error) {
    console.error("Error actualizando configuración de notificaciones:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// POST: Registrar token de push notification
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    await dbConnect()

    const body = await request.json()
    const { childId, token, platform } = body

    if (!childId || !token || !platform) {
      return NextResponse.json(
        { error: "Datos incompletos" },
        { status: 400 }
      )
    }

    // Verificar que el usuario tenga acceso al niño
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

    // Buscar configuración existente
    let settings = await NotificationSettings.findOne({
      userId: new Types.ObjectId(session.user.id),
      childId: new Types.ObjectId(childId)
    })

    if (!settings) {
      // Crear nueva configuración con el token
      settings = await NotificationSettings.create({
        userId: new Types.ObjectId(session.user.id),
        childId: new Types.ObjectId(childId),
        pushTokens: [{
          token,
          platform,
          addedAt: new Date()
        }]
      })
    } else {
      // Verificar si el token ya existe
      const tokenExists = settings.pushTokens.some(t => t.token === token)
      
      if (!tokenExists) {
        // Agregar nuevo token
        settings.pushTokens.push({
          token,
          platform,
          addedAt: new Date()
        })
        await settings.save()
      }
    }

    return NextResponse.json({
      success: true,
      message: "Token registrado exitosamente"
    })

  } catch (error) {
    console.error("Error registrando token de push notification:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// DELETE: Eliminar token de push notification
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    await dbConnect()

    const { searchParams } = new URL(request.url)
    const childId = searchParams.get("childId")
    const token = searchParams.get("token")

    if (!childId || !token) {
      return NextResponse.json(
        { error: "Datos incompletos" },
        { status: 400 }
      )
    }

    // Actualizar configuración eliminando el token
    const result = await NotificationSettings.findOneAndUpdate(
      {
        userId: new Types.ObjectId(session.user.id),
        childId: new Types.ObjectId(childId)
      },
      {
        $pull: {
          pushTokens: { token }
        }
      },
      { new: true }
    )

    if (!result) {
      return NextResponse.json(
        { error: "Configuración no encontrada" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Token eliminado exitosamente"
    })

  } catch (error) {
    console.error("Error eliminando token de push notification:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}