// API de prueba para simular notificaciones

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import dbConnect from "@/lib/mongodb"
import NotificationLog from "@/models/notification-log"
import NotificationSettings from "@/models/notification-settings"
import { Types } from "mongoose"
import { NotificationType, NotificationStatus, NotificationChannel } from "@/models/notification-log"

// POST: Crear notificación de prueba
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    await dbConnect()

    const body = await request.json()
    const { childId, type = "bedtime", delaySeconds = 5 } = body

    if (!childId) {
      return NextResponse.json(
        { error: "ID del niño requerido" },
        { status: 400 }
      )
    }

    // Obtener configuración de notificaciones
    const settings = await NotificationSettings.findOne({
      userId: new Types.ObjectId(session.user.id),
      childId: new Types.ObjectId(childId)
    })

    if (!settings || !settings.globalEnabled) {
      return NextResponse.json(
        { error: "Las notificaciones no están habilitadas para este niño" },
        { status: 400 }
      )
    }

    // Crear fecha de prueba (en X segundos desde ahora)
    const scheduledFor = new Date(Date.now() + (delaySeconds * 1000))

    // Determinar título y mensaje según tipo
    const messages = {
      bedtime: {
        title: "🌙 Hora de dormir",
        message: `Notificación de prueba: Es hora de preparar al niño para dormir (en ${delaySeconds} segundos)`
      },
      naptime: {
        title: "☀️ Hora de siesta",
        message: `Notificación de prueba: Hora de siesta programada (en ${delaySeconds} segundos)`
      },
      routine_start: {
        title: "🛁 Iniciar rutina",
        message: `Notificación de prueba: Es momento de comenzar la rutina de sueño (en ${delaySeconds} segundos)`
      },
      wake_window: {
        title: "⏰ Ventana de vigilia",
        message: `Notificación de prueba: El niño ha estado despierto por mucho tiempo (en ${delaySeconds} segundos)`
      }
    }

    const notificationData = messages[type] || messages.bedtime

    // Crear notificaciones para cada canal habilitado
    const createdNotifications = []

    if (settings.pushEnabled) {
      const pushNotification = await NotificationLog.create({
        userId: new Types.ObjectId(session.user.id),
        childId: new Types.ObjectId(childId),
        type: type as NotificationType,
        channel: NotificationChannel.PUSH,
        status: NotificationStatus.SCHEDULED,
        title: notificationData.title,
        message: notificationData.message,
        scheduledFor,
        data: { isTest: true },
        attempts: 0
      })
      createdNotifications.push(pushNotification)

      // Simular envío después del delay
      setTimeout(async () => {
        try {
          // Aquí iría el código real de push notification
          // Por ahora solo actualizamos el estado
          await pushNotification.markAsSent()
          
          // Si tienes el service worker configurado, puedes descomentar:
          // if ('serviceWorker' in navigator && 'PushManager' in window) {
          //   const registration = await navigator.serviceWorker.ready
          //   registration.showNotification(notificationData.title, {
          //     body: notificationData.message,
          //     icon: '/icon-192x192.png',
          //     badge: '/icon-72x72.png',
          //     vibrate: [200, 100, 200]
          //   })
          // }
        } catch (error) {
          console.error("Error enviando notificación de prueba:", error)
        }
      }, delaySeconds * 1000)
    }

    if (settings.inAppEnabled) {
      const inAppNotification = await NotificationLog.create({
        userId: new Types.ObjectId(session.user.id),
        childId: new Types.ObjectId(childId),
        type: type as NotificationType,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT, // Las in-app se marcan como enviadas inmediatamente
        title: notificationData.title,
        message: notificationData.message,
        scheduledFor,
        sentAt: scheduledFor,
        data: { isTest: true },
        attempts: 1
      })
      createdNotifications.push(inAppNotification)
    }

    // Mostrar notificación del navegador si está habilitado
    if (settings.pushEnabled && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        setTimeout(() => {
          new Notification(notificationData.title, {
            body: notificationData.message,
            icon: '/logo.png'
          })
        }, delaySeconds * 1000)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Notificación de prueba creada. Se enviará en ${delaySeconds} segundos`,
      notifications: createdNotifications.map(n => ({
        id: n._id,
        type: n.type,
        channel: n.channel,
        scheduledFor: n.scheduledFor
      }))
    })

  } catch (error) {
    console.error("Error creando notificación de prueba:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// GET: Obtener estado del sistema de notificaciones
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    await dbConnect()

    // Obtener todas las configuraciones del usuario
    const settings = await NotificationSettings.find({
      userId: new Types.ObjectId(session.user.id)
    }).populate("childId", "name")

    // Obtener estadísticas de notificaciones recientes
    const stats = await NotificationLog.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(session.user.id),
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Últimas 24 horas
        }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ])

    // Verificar soporte del navegador
    const browserSupport = {
      notificationAPI: typeof window !== 'undefined' && 'Notification' in window,
      serviceWorker: typeof window !== 'undefined' && 'serviceWorker' in navigator,
      pushManager: typeof window !== 'undefined' && 'PushManager' in window,
      permission: typeof window !== 'undefined' && 'Notification' in window ? 
        Notification.permission : 'unknown'
    }

    return NextResponse.json({
      success: true,
      settings: settings.map(s => ({
        childName: s.childId?.name || "Desconocido",
        enabled: s.globalEnabled,
        channels: {
          push: s.pushEnabled,
          inApp: s.inAppEnabled,
          email: s.emailEnabled
        },
        events: {
          bedtime: s.bedtime.enabled,
          naptime: s.naptime.enabled,
          routine: s.routineStart.enabled,
          wakeWindow: s.wakeWindow.enabled
        }
      })),
      recentStats: stats.reduce((acc, stat) => {
        acc[stat._id] = stat.count
        return acc
      }, {}),
      browserSupport,
      message: "Sistema de notificaciones activo"
    })

  } catch (error) {
    console.error("Error obteniendo estado del sistema:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}