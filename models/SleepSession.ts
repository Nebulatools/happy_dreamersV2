// Modelo Mongoose para SleepSession
// Basado en la interfaz SleepSession de lib/utils/sleep-sessions.ts

import mongoose, { Schema, Document, Types } from 'mongoose'

// Interface para un evento básico
interface IEvent {
  _id: string
  childId: string
  eventType: string
  emotionalState?: string
  startTime: string
  endTime?: string
  notes?: string
  duration?: number
}

// Interfaz del documento SleepSession para Mongoose
export interface ISleepSession extends Document {
  _id: Types.ObjectId
  childId: Types.ObjectId
  userId: Types.ObjectId // Para control de acceso
  type: 'sleep-session'
  startTime: Date
  endTime?: Date
  originalStartTime: Date
  originalEndTime?: Date
  nightWakings: IEvent[]
  originalEvent: IEvent
  isContinuationFromPrevious: boolean
  continuesNextDay: boolean
  duration?: number // Duración en minutos
  quality?: 1 | 2 | 3 | 4 | 5 // Calidad del sueño
  interruptions?: Array<{
    time: Date
    type: string
    duration?: number
    notes?: string
  }>
  createdAt: Date
  updatedAt: Date
}

// Esquema para eventos anidados
const EventSchema = new Schema({
  _id: { type: String, required: true },
  childId: { type: String, required: true },
  eventType: { type: String, required: true },
  emotionalState: { type: String },
  startTime: { type: String, required: true },
  endTime: { type: String },
  notes: { type: String },
  duration: { type: Number }
}, { _id: false })

// Definir esquema Mongoose para SleepSession
const SleepSessionSchema = new Schema<ISleepSession>({
  childId: {
    type: Schema.Types.ObjectId,
    ref: 'Child',
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    default: 'sleep-session',
    enum: ['sleep-session']
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date
  },
  originalStartTime: {
    type: Date,
    required: true
  },
  originalEndTime: {
    type: Date
  },
  nightWakings: {
    type: [EventSchema],
    default: []
  },
  originalEvent: {
    type: EventSchema,
    required: true
  },
  isContinuationFromPrevious: {
    type: Boolean,
    default: false
  },
  continuesNextDay: {
    type: Boolean,
    default: false
  },
  duration: {
    type: Number, // Duración en minutos
    min: 0
  },
  quality: {
    type: Number,
    min: 1,
    max: 5
  },
  interruptions: [{
    time: { type: Date, required: true },
    type: { type: String, required: true },
    duration: { type: Number },
    notes: { type: String }
  }]
}, {
  timestamps: true
})

// Índices para mejorar las consultas
SleepSessionSchema.index({ childId: 1, startTime: -1 })
SleepSessionSchema.index({ userId: 1 })
SleepSessionSchema.index({ startTime: 1 })

// Método virtual para calcular duración si no está establecida
SleepSessionSchema.virtual('calculatedDuration').get(function(this: ISleepSession) {
  if (this.duration) return this.duration
  if (this.endTime) {
    return Math.round((this.endTime.getTime() - this.startTime.getTime()) / (1000 * 60))
  }
  return null
})

// Middleware para calcular duración automáticamente
SleepSessionSchema.pre('save', function(next) {
  if (this.endTime && !this.duration) {
    this.duration = Math.round(
      (this.endTime.getTime() - this.startTime.getTime()) / (1000 * 60)
    )
  }
  next()
})

// Configurar JSON transform para incluir virtuals
SleepSessionSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v
    return ret
  }
})

// Métodos estáticos útiles
SleepSessionSchema.statics.findByChildAndDateRange = function(
  childId: string, 
  startDate: Date, 
  endDate: Date
) {
  return this.find({
    childId,
    startTime: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ startTime: 1 })
}

SleepSessionSchema.statics.findByUserAndDateRange = function(
  userId: string, 
  startDate: Date, 
  endDate: Date
) {
  return this.find({
    userId,
    startTime: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ startTime: 1 })
}

// Crear y exportar el modelo
const SleepSession = mongoose.models.SleepSession || mongoose.model<ISleepSession>('SleepSession', SleepSessionSchema)

export default SleepSession