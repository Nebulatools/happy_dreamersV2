// Servicio de programación y envío de notificaciones

import NotificationSettings from "@/models/notification-settings"
import NotificationLog from "@/models/notification-log"
import Child from "@/models/Child"
import dbConnect from "@/lib/mongodb"
import { Types } from "mongoose"
import { NotificationType, NotificationStatus, NotificationChannel } from "@/models/notification-log"

// Interfaz para un plan de sueño programado
interface ScheduledSleepEvent {
  childId: string
  userId: string
  type: NotificationType
  scheduledTime: Date
  childName: string
  planId?: string
}

// Clase principal del scheduler
export class NotificationScheduler {
  private static instance: NotificationScheduler
  private checkInterval: NodeJS.Timeout | null = null
  private isRunning: boolean = false

  private constructor() {}

  // Singleton pattern
  static getInstance(): NotificationScheduler {
    if (!NotificationScheduler.instance) {
      NotificationScheduler.instance = new NotificationScheduler()
    }
    return NotificationScheduler.instance
  }

  // Iniciar el scheduler
  async start() {
    if (this.isRunning) {
      console.log("Notification scheduler ya está en ejecución")
      return
    }

    this.isRunning = true
    console.log("Iniciando notification scheduler...")

    // Verificar notificaciones cada minuto
    this.checkInterval = setInterval(async () => {
      await this.checkAndSendNotifications()
    }, 60000) // 60 segundos

    // Ejecutar inmediatamente la primera vez
    await this.checkAndSendNotifications()
  }

  // Detener el scheduler
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
    this.isRunning = false
    console.log("Notification scheduler detenido")
  }

  // Verificar y enviar notificaciones pendientes
  private async checkAndSendNotifications() {
    try {
      await dbConnect()

      // Obtener la hora actual
      const now = new Date()
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

      // Buscar todos los niños con planes de sueño activos
      const children = await Child.find({
        // Solo niños con planes activos
      }).populate("userId")

      for (const child of children) {
        // Verificar si el niño tiene plan de sueño
        const sleepPlan = await this.getChildSleepPlan(child._id)
        if (!sleepPlan) continue

        // Obtener configuraciones de notificación para este niño
        const notificationSettings = await NotificationSettings.find({
          childId: child._id,
          globalEnabled: true
        })

        for (const settings of notificationSettings) {
          // Verificar horario silencioso
          if (!settings.shouldNotifyNow()) continue

          // Verificar cada tipo de evento
          await this.checkBedtimeNotification(child, settings, sleepPlan, now)
          await this.checkNaptimeNotification(child, settings, sleepPlan, now)
          await this.checkRoutineStartNotification(child, settings, sleepPlan, now)
        }
      }

      // Procesar notificaciones programadas pendientes
      await this.processPendingNotifications()

    } catch (error) {
      console.error("Error en notification scheduler:", error)
    }
  }

  // Verificar notificación de hora de dormir
  private async checkBedtimeNotification(
    child: any,
    settings: any,
    sleepPlan: any,
    now: Date
  ) {
    if (!settings.bedtime.enabled) return

    const bedtime = sleepPlan.bedtime // Formato HH:mm
    if (!bedtime) return

    const notificationTime = this.calculateNotificationTime(bedtime, settings.bedtime.timing)
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

    if (notificationTime === currentTime) {
      // Verificar si ya se envió una notificación similar hoy
      const existingNotification = await this.checkExistingNotification(
        settings.userId,
        child._id,
        NotificationType.BEDTIME,
        now
      )

      if (!existingNotification) {
        await this.scheduleNotification({
          userId: settings.userId,
          childId: child._id,
          type: NotificationType.BEDTIME,
          scheduledFor: now,
          childName: child.name,
          settings,
          plannedEventTime: bedtime
        })
      }
    }
  }

  // Verificar notificación de siesta
  private async checkNaptimeNotification(
    child: any,
    settings: any,
    sleepPlan: any,
    now: Date
  ) {
    if (!settings.naptime.enabled) return

    // Los planes pueden tener múltiples siestas
    const naptimes = sleepPlan.naptimes || []
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

    for (const naptime of naptimes) {
      const notificationTime = this.calculateNotificationTime(naptime, settings.naptime.timing)

      if (notificationTime === currentTime) {
        const existingNotification = await this.checkExistingNotification(
          settings.userId,
          child._id,
          NotificationType.NAPTIME,
          now
        )

        if (!existingNotification) {
          await this.scheduleNotification({
            userId: settings.userId,
            childId: child._id,
            type: NotificationType.NAPTIME,
            scheduledFor: now,
            childName: child.name,
            settings,
            plannedEventTime: naptime
          })
        }
      }
    }
  }

  // Verificar notificación de inicio de rutina
  private async checkRoutineStartNotification(
    child: any,
    settings: any,
    sleepPlan: any,
    now: Date
  ) {
    if (!settings.routineStart.enabled) return

    const bedtime = sleepPlan.bedtime
    if (!bedtime) return

    // La rutina generalmente inicia 30-60 minutos antes de dormir
    const routineTime = this.calculateNotificationTime(bedtime, settings.routineStart.timing + 30)
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

    if (routineTime === currentTime) {
      const existingNotification = await this.checkExistingNotification(
        settings.userId,
        child._id,
        NotificationType.ROUTINE_START,
        now
      )

      if (!existingNotification) {
        await this.scheduleNotification({
          userId: settings.userId,
          childId: child._id,
          type: NotificationType.ROUTINE_START,
          scheduledFor: now,
          childName: child.name,
          settings,
          plannedEventTime: bedtime
        })
      }
    }
  }

  // Calcular hora de notificación con anticipación
  private calculateNotificationTime(eventTime: string, minutesBefore: number): string {
    const [hours, minutes] = eventTime.split(":").map(Number)
    const totalMinutes = hours * 60 + minutes - minutesBefore
    
    let adjustedHours = Math.floor(totalMinutes / 60)
    let adjustedMinutes = totalMinutes % 60

    // Manejar caso de día anterior
    if (adjustedHours < 0) {
      adjustedHours += 24
    }

    return `${adjustedHours.toString().padStart(2, '0')}:${adjustedMinutes.toString().padStart(2, '0')}`
  }

  // Verificar si ya existe una notificación similar hoy
  private async checkExistingNotification(
    userId: Types.ObjectId,
    childId: Types.ObjectId,
    type: NotificationType,
    date: Date
  ): Promise<boolean> {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const existing = await NotificationLog.findOne({
      userId,
      childId,
      type,
      scheduledFor: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    })

    return !!existing
  }

  // Programar una nueva notificación
  private async scheduleNotification(params: {
    userId: Types.ObjectId
    childId: Types.ObjectId
    type: NotificationType
    scheduledFor: Date
    childName: string
    settings: any
    plannedEventTime: string
  }) {
    const { userId, childId, type, scheduledFor, childName, settings, plannedEventTime } = params

    // Obtener mensaje de notificación
    const message = settings.getNotificationMessage(type, childName, plannedEventTime)
    
    // Determinar título según tipo
    const titles: Record<NotificationType, string> = {
      [NotificationType.BEDTIME]: "Hora de dormir",
      [NotificationType.NAPTIME]: "Hora de siesta",
      [NotificationType.WAKE_WINDOW]: "Ventana de vigilia",
      [NotificationType.ROUTINE_START]: "Iniciar rutina de sueño"
    }

    // Crear registro de notificación para cada canal habilitado
    const channels: NotificationChannel[] = []
    if (settings.pushEnabled) channels.push(NotificationChannel.PUSH)
    if (settings.inAppEnabled) channels.push(NotificationChannel.IN_APP)
    if (settings.emailEnabled) channels.push(NotificationChannel.EMAIL)

    for (const channel of channels) {
      await NotificationLog.create({
        userId,
        childId,
        type,
        channel,
        status: NotificationStatus.SCHEDULED,
        title: titles[type],
        message,
        scheduledFor,
        plannedEventType: type,
        plannedEventTime,
        attempts: 0
      })
    }
  }

  // Procesar notificaciones pendientes
  private async processPendingNotifications() {
    const pendingNotifications = await NotificationLog.getPendingNotifications()

    for (const notification of pendingNotifications) {
      try {
        await this.sendNotification(notification)
      } catch (error) {
        console.error(`Error enviando notificación ${notification._id}:`, error)
        await notification.markAsFailed(error.message || "Error desconocido")
      }
    }
  }

  // Enviar notificación según el canal
  private async sendNotification(notification: any) {
    switch (notification.channel) {
      case NotificationChannel.PUSH:
        await this.sendPushNotification(notification)
        break
      case NotificationChannel.IN_APP:
        await this.sendInAppNotification(notification)
        break
      case NotificationChannel.EMAIL:
        await this.sendEmailNotification(notification)
        break
      default:
        throw new Error(`Canal no soportado: ${notification.channel}`)
    }
  }

  // Enviar notificación push (implementación pendiente con service worker)
  private async sendPushNotification(notification: any) {
    // Por ahora solo simulamos el envío
    console.log(`Enviando push notification: ${notification.title}`)
    
    // Aquí se integraría con el service worker y Web Push API
    // Por ahora marcamos como enviada
    await notification.markAsSent()
  }

  // Enviar notificación in-app
  private async sendInAppNotification(notification: any) {
    // Las notificaciones in-app se muestran directamente en la UI
    // Solo las marcamos como enviadas
    console.log(`Notificación in-app creada: ${notification.title}`)
    await notification.markAsSent()
  }

  // Enviar notificación por email (implementación pendiente)
  private async sendEmailNotification(notification: any) {
    // Aquí se integraría con un servicio de email
    console.log(`Email notification pendiente: ${notification.title}`)
    
    // Por ahora marcamos como fallida hasta tener servicio de email
    await notification.markAsFailed("Servicio de email no configurado")
  }

  // Obtener plan de sueño del niño (placeholder - debe integrarse con el modelo real)
  private async getChildSleepPlan(childId: Types.ObjectId): Promise<any> {
    // TODO: Integrar con el modelo real de planes de sueño
    // Por ahora retornamos un plan de ejemplo
    return {
      bedtime: "20:00",
      naptimes: ["10:00", "14:00"],
      routineStart: "19:30"
    }
  }
}

// Exportar instancia singleton
export const notificationScheduler = NotificationScheduler.getInstance()