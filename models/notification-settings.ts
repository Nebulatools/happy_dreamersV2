// Modelo para configuración de notificaciones de sueño

import mongoose, { Schema, Document, Types } from "mongoose"

// Tipos de notificaciones disponibles
export enum NotificationType {
  BEDTIME = "bedtime",           // Hora de dormir
  NAPTIME = "naptime",           // Hora de siesta
  WAKE_WINDOW = "wake_window",   // Ventana de vigilia
  ROUTINE_START = "routine_start" // Inicio de rutina
}

// Configuración de tiempo de anticipación
export enum NotificationTiming {
  FIVE_MIN = 5,
  TEN_MIN = 10,
  FIFTEEN_MIN = 15,
  THIRTY_MIN = 30
}

// Interfaz para configuración de notificaciones por tipo
interface INotificationTypeSettings {
  enabled: boolean
  timing: NotificationTiming
  customMessage?: string
}

// Interfaz principal del documento
export interface INotificationSettings extends Document {
  userId: Types.ObjectId
  childId: Types.ObjectId
  globalEnabled: boolean
  
  // Configuración por tipo de notificación
  bedtime: INotificationTypeSettings
  naptime: INotificationTypeSettings
  wakeWindow: INotificationTypeSettings
  routineStart: INotificationTypeSettings
  
  // Configuración de canales
  pushEnabled: boolean
  emailEnabled: boolean
  inAppEnabled: boolean
  
  // Push notification tokens
  pushTokens: {
    token: string
    platform: "web" | "ios" | "android"
    addedAt: Date
  }[]
  
  // Horario silencioso (no notificar entre estas horas)
  quietHours: {
    enabled: boolean
    start: string // formato HH:mm
    end: string   // formato HH:mm
  }
  
  // Metadatos
  createdAt: Date
  updatedAt: Date
  lastNotificationAt?: Date
}

// Schema de Mongoose
const NotificationSettingsSchema = new Schema<INotificationSettings>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  childId: {
    type: Schema.Types.ObjectId,
    ref: "Child",
    required: true
  },
  globalEnabled: {
    type: Boolean,
    default: true
  },
  
  // Configuración de notificación para hora de dormir
  bedtime: {
    enabled: { type: Boolean, default: true },
    timing: { 
      type: Number, 
      enum: [5, 10, 15, 30],
      default: NotificationTiming.FIFTEEN_MIN 
    },
    customMessage: { type: String }
  },
  
  // Configuración de notificación para siesta
  naptime: {
    enabled: { type: Boolean, default: true },
    timing: { 
      type: Number, 
      enum: [5, 10, 15, 30],
      default: NotificationTiming.FIFTEEN_MIN 
    },
    customMessage: { type: String }
  },
  
  // Configuración de notificación para ventana de vigilia
  wakeWindow: {
    enabled: { type: Boolean, default: false },
    timing: { 
      type: Number, 
      enum: [5, 10, 15, 30],
      default: NotificationTiming.TEN_MIN 
    },
    customMessage: { type: String }
  },
  
  // Configuración de notificación para inicio de rutina
  routineStart: {
    enabled: { type: Boolean, default: true },
    timing: { 
      type: Number, 
      enum: [5, 10, 15, 30],
      default: NotificationTiming.THIRTY_MIN 
    },
    customMessage: { type: String }
  },
  
  // Canales habilitados
  pushEnabled: { type: Boolean, default: true },
  emailEnabled: { type: Boolean, default: false },
  inAppEnabled: { type: Boolean, default: true },
  
  // Tokens para push notifications
  pushTokens: [{
    token: { type: String, required: true },
    platform: { 
      type: String, 
      enum: ["web", "ios", "android"],
      required: true 
    },
    addedAt: { type: Date, default: Date.now }
  }],
  
  // Horario silencioso
  quietHours: {
    enabled: { type: Boolean, default: false },
    start: { type: String, default: "22:00" },
    end: { type: String, default: "07:00" }
  },
  
  lastNotificationAt: { type: Date }
}, {
  timestamps: true
})

// Índices para búsquedas eficientes
NotificationSettingsSchema.index({ userId: 1, childId: 1 }, { unique: true })
NotificationSettingsSchema.index({ userId: 1 })
NotificationSettingsSchema.index({ childId: 1 })
NotificationSettingsSchema.index({ "pushTokens.token": 1 })

// Método para verificar si debe enviar notificación en este momento
NotificationSettingsSchema.methods.shouldNotifyNow = function(): boolean {
  if (!this.globalEnabled) return false
  
  if (this.quietHours.enabled) {
    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    
    const { start, end } = this.quietHours
    
    // Manejar caso donde el período silencioso cruza medianoche
    if (start > end) {
      return currentTime < start && currentTime > end
    } else {
      return currentTime < start || currentTime > end
    }
  }
  
  return true
}

// Método para obtener mensaje de notificación
NotificationSettingsSchema.methods.getNotificationMessage = function(
  type: NotificationType,
  childName: string,
  scheduledTime: string
): string {
  const typeSettings = this[type]
  
  if (typeSettings.customMessage) {
    return typeSettings.customMessage
      .replace("{childName}", childName)
      .replace("{time}", scheduledTime)
  }
  
  // Mensajes por defecto en español
  const defaultMessages: Record<NotificationType, string> = {
    [NotificationType.BEDTIME]: `Es hora de preparar a ${childName} para dormir (${scheduledTime})`,
    [NotificationType.NAPTIME]: `Hora de siesta para ${childName} en ${typeSettings.timing} minutos`,
    [NotificationType.WAKE_WINDOW]: `${childName} ha estado despierto por mucho tiempo, considera una siesta`,
    [NotificationType.ROUTINE_START]: `Inicia la rutina de sueño de ${childName} (${scheduledTime})`
  }
  
  return defaultMessages[type]
}

// Crear o obtener modelo
const NotificationSettings = mongoose.models.NotificationSettings || 
  mongoose.model<INotificationSettings>("NotificationSettings", NotificationSettingsSchema)

export default NotificationSettings