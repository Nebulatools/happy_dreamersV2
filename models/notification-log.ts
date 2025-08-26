// Modelo para registro histórico de notificaciones enviadas

import mongoose, { Schema, Document, Types } from "mongoose"
import { NotificationType } from "./notification-settings"

// Estado de la notificación
export enum NotificationStatus {
  SCHEDULED = "scheduled",   // Programada
  SENT = "sent",             // Enviada exitosamente
  FAILED = "failed",         // Fallo en el envío
  CANCELLED = "cancelled",   // Cancelada
  DELIVERED = "delivered",   // Confirmada como recibida
  READ = "read"              // Leída por el usuario
}

// Canal de notificación
export enum NotificationChannel {
  PUSH = "push",
  EMAIL = "email",
  IN_APP = "in_app"
}

// Interfaz principal del documento
export interface INotificationLog extends Document {
  userId: Types.ObjectId
  childId: Types.ObjectId
  
  // Información de la notificación
  type: NotificationType
  channel: NotificationChannel
  status: NotificationStatus
  
  // Contenido
  title: string
  message: string
  data?: Record<string, any>
  
  // Horarios
  scheduledFor: Date
  sentAt?: Date
  deliveredAt?: Date
  readAt?: Date
  
  // Información del plan de sueño asociado
  sleepPlanId?: Types.ObjectId
  plannedEventType?: string // bedtime, nap, etc.
  plannedEventTime?: string // hora planeada del evento
  
  // Tracking
  attempts: number
  lastAttemptAt?: Date
  errorMessage?: string
  
  // Metadatos
  deviceInfo?: {
    platform?: string
    deviceId?: string
    appVersion?: string
  }
  
  createdAt: Date
  updatedAt: Date
}

// Schema de Mongoose
const NotificationLogSchema = new Schema<INotificationLog>({
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
  
  type: {
    type: String,
    enum: Object.values(NotificationType),
    required: true
  },
  channel: {
    type: String,
    enum: Object.values(NotificationChannel),
    required: true
  },
  status: {
    type: String,
    enum: Object.values(NotificationStatus),
    default: NotificationStatus.SCHEDULED,
    required: true
  },
  
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: Schema.Types.Mixed
  },
  
  scheduledFor: {
    type: Date,
    required: true
  },
  sentAt: Date,
  deliveredAt: Date,
  readAt: Date,
  
  sleepPlanId: {
    type: Schema.Types.ObjectId,
    ref: "SleepPlan"
  },
  plannedEventType: String,
  plannedEventTime: String,
  
  attempts: {
    type: Number,
    default: 0
  },
  lastAttemptAt: Date,
  errorMessage: String,
  
  deviceInfo: {
    platform: String,
    deviceId: String,
    appVersion: String
  }
}, {
  timestamps: true
})

// Índices para búsquedas eficientes
NotificationLogSchema.index({ userId: 1, status: 1 })
NotificationLogSchema.index({ childId: 1, createdAt: -1 })
NotificationLogSchema.index({ scheduledFor: 1, status: 1 })
NotificationLogSchema.index({ userId: 1, childId: 1, type: 1, createdAt: -1 })

// Método para marcar como enviada
NotificationLogSchema.methods.markAsSent = async function(): Promise<void> {
  this.status = NotificationStatus.SENT
  this.sentAt = new Date()
  this.attempts += 1
  this.lastAttemptAt = new Date()
  await this.save()
}

// Método para marcar como fallida
NotificationLogSchema.methods.markAsFailed = async function(error: string): Promise<void> {
  this.status = NotificationStatus.FAILED
  this.attempts += 1
  this.lastAttemptAt = new Date()
  this.errorMessage = error
  await this.save()
}

// Método para marcar como entregada
NotificationLogSchema.methods.markAsDelivered = async function(): Promise<void> {
  this.status = NotificationStatus.DELIVERED
  this.deliveredAt = new Date()
  await this.save()
}

// Método para marcar como leída
NotificationLogSchema.methods.markAsRead = async function(): Promise<void> {
  this.status = NotificationStatus.READ
  this.readAt = new Date()
  await this.save()
}

// Método estático para obtener notificaciones pendientes
NotificationLogSchema.statics.getPendingNotifications = async function() {
  const now = new Date()
  return this.find({
    status: NotificationStatus.SCHEDULED,
    scheduledFor: { $lte: now }
  }).populate("userId childId")
}

// Método estático para obtener estadísticas de notificaciones
NotificationLogSchema.statics.getStats = async function(
  userId: Types.ObjectId, 
  childId?: Types.ObjectId,
  dateFrom?: Date
) {
  const match: any = { userId }
  if (childId) match.childId = childId
  if (dateFrom) match.createdAt = { $gte: dateFrom }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$count" },
        stats: {
          $push: {
            status: "$_id",
            count: "$count"
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        total: 1,
        sent: {
          $ifNull: [
            {
              $arrayElemAt: [
                {
                  $map: {
                    input: {
                      $filter: {
                        input: "$stats",
                        cond: { $eq: ["$$this.status", NotificationStatus.SENT] }
                      }
                    },
                    as: "item",
                    in: "$$item.count"
                  }
                },
                0
              ]
            },
            0
          ]
        },
        delivered: {
          $ifNull: [
            {
              $arrayElemAt: [
                {
                  $map: {
                    input: {
                      $filter: {
                        input: "$stats",
                        cond: { $eq: ["$$this.status", NotificationStatus.DELIVERED] }
                      }
                    },
                    as: "item",
                    in: "$$item.count"
                  }
                },
                0
              ]
            },
            0
          ]
        },
        read: {
          $ifNull: [
            {
              $arrayElemAt: [
                {
                  $map: {
                    input: {
                      $filter: {
                        input: "$stats",
                        cond: { $eq: ["$$this.status", NotificationStatus.READ] }
                      }
                    },
                    as: "item",
                    in: "$$item.count"
                  }
                },
                0
              ]
            },
            0
          ]
        },
        failed: {
          $ifNull: [
            {
              $arrayElemAt: [
                {
                  $map: {
                    input: {
                      $filter: {
                        input: "$stats",
                        cond: { $eq: ["$$this.status", NotificationStatus.FAILED] }
                      }
                    },
                    as: "item",
                    in: "$$item.count"
                  }
                },
                0
              ]
            },
            0
          ]
        }
      }
    }
  ])
}

// Crear o obtener modelo
const NotificationLog = mongoose.models.NotificationLog || 
  mongoose.model<INotificationLog>("NotificationLog", NotificationLogSchema)

export default NotificationLog