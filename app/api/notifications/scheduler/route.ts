// Endpoint para el cron job de notificaciones
// Este endpoint será llamado cada minuto por Vercel Cron o servicio externo

import { NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/mongoose"
import NotificationSettings from "@/models/notification-settings"
import NotificationLog from "@/models/notification-log"
import Child from "@/models/Child"
import { Types } from "mongoose"
import { NotificationType, NotificationStatus, NotificationChannel } from "@/models/notification-log"

// Verificar autorización para cron jobs
function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  // En desarrollo, permitir sin autenticación
  if (process.env.NODE_ENV === 'development') {
    return true
  }
  
  // En producción, verificar secret
  if (!cronSecret || !authHeader) {
    return false
  }
  
  return authHeader === `Bearer ${cronSecret}`
}

// GET: Ejecutar scheduler de notificaciones
export async function GET(request: NextRequest) {
  try {
    // Verificar autorización
    if (!verifyCronAuth(request)) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    await dbConnect()

    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`

    console.log(`[Scheduler] Ejecutando a las ${currentTime}`)

    // Estadísticas de ejecución
    const stats = {
      checked: 0,
      scheduled: 0,
      sent: 0,
      failed: 0,
      skipped: 0
    }

    // 1. Buscar todos los niños con configuraciones activas
    const activeSettings = await NotificationSettings.find({
      globalEnabled: true
    }).populate('childId')

    stats.checked = activeSettings.length

    for (const settings of activeSettings) {
      if (!settings.childId) continue

      const child = settings.childId as any
      
      // Verificar horario silencioso
      if (settings.quietHours?.enabled) {
        const quietStart = settings.quietHours.start.split(':').map(Number)
        const quietEnd = settings.quietHours.end.split(':').map(Number)
        const quietStartMinutes = quietStart[0] * 60 + quietStart[1]
        const quietEndMinutes = quietEnd[0] * 60 + quietEnd[1]
        const currentMinutes = currentHour * 60 + currentMinute

        // Si estamos en horario silencioso, saltar
        if (quietEndMinutes > quietStartMinutes) {
          // Horario normal (ej: 22:00 - 07:00 no cruza medianoche)
          if (currentMinutes >= quietStartMinutes && currentMinutes < quietEndMinutes) {
            stats.skipped++
            continue
          }
        } else {
          // Horario que cruza medianoche (ej: 22:00 - 07:00)
          if (currentMinutes >= quietStartMinutes || currentMinutes < quietEndMinutes) {
            stats.skipped++
            continue
          }
        }
      }

      // Obtener el plan del niño (placeholder por ahora)
      // TODO: Integrar con el modelo real de planes
      const sleepPlan = {
        bedtime: "20:00",
        naptimes: ["10:00", "14:00"],
        wakeTime: "07:00"
      }

      // Verificar cada tipo de notificación
      const notificationTypes = [
        { type: NotificationType.BEDTIME, time: sleepPlan.bedtime, settings: settings.bedtime },
        ...sleepPlan.naptimes.map(naptime => ({ 
          type: NotificationType.NAPTIME, 
          time: naptime, 
          settings: settings.naptime 
        }))
      ]

      if (settings.routineStart?.enabled) {
        // La rutina empieza 30 minutos antes de dormir
        const bedtimeMinutes = parseInt(sleepPlan.bedtime.split(':')[0]) * 60 + 
                               parseInt(sleepPlan.bedtime.split(':')[1])
        const routineMinutes = bedtimeMinutes - 30
        const routineHour = Math.floor(routineMinutes / 60)
        const routineMinute = routineMinutes % 60
        const routineTime = `${routineHour.toString().padStart(2, '0')}:${routineMinute.toString().padStart(2, '0')}`
        
        notificationTypes.push({
          type: NotificationType.ROUTINE_START,
          time: routineTime,
          settings: settings.routineStart
        })
      }

      // Verificar si alguna notificación debe enviarse ahora
      for (const notification of notificationTypes) {
        if (!notification.settings?.enabled) continue

        // Calcular hora de notificación con anticipación
        const [eventHour, eventMinute] = notification.time.split(':').map(Number)
        const eventTotalMinutes = eventHour * 60 + eventMinute
        const notifyMinutes = eventTotalMinutes - (notification.settings.timing || 15)
        
        let notifyHour = Math.floor(notifyMinutes / 60)
        let notifyMinute = notifyMinutes % 60
        
        // Manejar caso de día anterior
        if (notifyHour < 0) {
          notifyHour += 24
        }
        
        const notifyTime = `${notifyHour.toString().padStart(2, '0')}:${notifyMinute.toString().padStart(2, '0')}`

        // Si es la hora de notificar
        if (notifyTime === currentTime) {
          // Verificar si ya existe una notificación similar hoy
          const startOfDay = new Date(now)
          startOfDay.setHours(0, 0, 0, 0)
          
          const existingNotification = await NotificationLog.findOne({
            userId: settings.userId,
            childId: child._id,
            type: notification.type,
            createdAt: { $gte: startOfDay }
          })

          if (!existingNotification) {
            // Crear notificaciones para cada canal habilitado
            const channels = []
            if (settings.pushEnabled) channels.push(NotificationChannel.PUSH)
            if (settings.inAppEnabled) channels.push(NotificationChannel.IN_APP)
            if (settings.emailEnabled) channels.push(NotificationChannel.EMAIL)

            for (const channel of channels) {
              const newNotification = await NotificationLog.create({
                userId: settings.userId,
                childId: child._id,
                type: notification.type,
                channel,
                status: NotificationStatus.SCHEDULED,
                title: getNotificationTitle(notification.type),
                message: getNotificationMessage(notification.type, child.name, notification.time),
                scheduledFor: now,
                plannedEventType: notification.type,
                plannedEventTime: notification.time,
                attempts: 0
              })

              stats.scheduled++
              console.log(`[Scheduler] Notificación programada: ${notification.type} para ${child.name}`)
            }
          }
        }
      }
    }

    // 2. Procesar notificaciones pendientes de envío
    const pendingNotifications = await NotificationLog.find({
      status: { $in: [NotificationStatus.SCHEDULED, NotificationStatus.PENDING] },
      scheduledFor: { $lte: now },
      attempts: { $lt: 3 }
    }).limit(50) // Procesar máximo 50 por ejecución

    for (const notification of pendingNotifications) {
      try {
        // Simular envío según el canal
        switch (notification.channel) {
          case NotificationChannel.PUSH:
            // TODO: Implementar envío real con Web Push API
            await notification.markAsSent()
            stats.sent++
            break
            
          case NotificationChannel.IN_APP:
            // Las in-app se marcan como enviadas inmediatamente
            await notification.markAsSent()
            stats.sent++
            break
            
          case NotificationChannel.EMAIL:
            // TODO: Implementar envío de email
            // Por ahora marcar como fallida
            await notification.markAsFailed("Servicio de email no configurado")
            stats.failed++
            break
            
          default:
            await notification.markAsFailed("Canal no soportado")
            stats.failed++
        }
      } catch (error) {
        console.error(`[Scheduler] Error procesando notificación ${notification._id}:`, error)
        await notification.markAsFailed(error.message || "Error desconocido")
        stats.failed++
      }
    }

    // 3. Limpiar notificaciones antiguas (más de 30 días)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    await NotificationLog.deleteMany({
      createdAt: { $lt: thirtyDaysAgo },
      status: { $in: [NotificationStatus.READ, NotificationStatus.FAILED] }
    })

    console.log(`[Scheduler] Completado:`, stats)

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      stats
    })

  } catch (error) {
    console.error("[Scheduler] Error:", error)
    return NextResponse.json(
      { error: "Error ejecutando scheduler", details: error.message },
      { status: 500 }
    )
  }
}

// Funciones auxiliares
function getNotificationTitle(type: NotificationType): string {
  const titles = {
    [NotificationType.BEDTIME]: "🌙 Hora de dormir",
    [NotificationType.NAPTIME]: "☀️ Hora de siesta",
    [NotificationType.WAKE_WINDOW]: "⏰ Ventana de vigilia",
    [NotificationType.ROUTINE_START]: "🛁 Iniciar rutina de sueño"
  }
  return titles[type] || "Recordatorio de Happy Dreamers"
}

function getNotificationMessage(type: NotificationType, childName: string, eventTime: string): string {
  const messages = {
    [NotificationType.BEDTIME]: `Es hora de preparar a ${childName} para dormir (${eventTime})`,
    [NotificationType.NAPTIME]: `Hora de siesta para ${childName} (${eventTime})`,
    [NotificationType.WAKE_WINDOW]: `${childName} ha estado despierto por mucho tiempo`,
    [NotificationType.ROUTINE_START]: `Inicia la rutina de sueño de ${childName}`
  }
  return messages[type] || `Recordatorio para ${childName}`
}
