// Tipos y modelos para Happy Dreamers
// Definiciones de TypeScript para entidades del dominio

import { ObjectId } from "mongodb"

// Modelo de Usuario
export interface User {
  _id: ObjectId | string
  email: string
  name: string
  password?: string // No incluir en respuestas
  role: "parent" | "admin" | "professional"
  image?: string
  emailVerified?: Date
  createdAt: Date
  updatedAt: Date
}

// Modelo de Niño
export interface Child {
  _id: ObjectId | string
  firstName: string
  lastName: string
  birthDate: string // ISO string
  parentId: ObjectId | string
  surveyData?: SurveyData
  sleepProfile?: SleepProfile
  createdAt: Date
  updatedAt: Date
}

// Datos del cuestionario inicial
export interface SurveyData {
  completedAt: Date
  edad: number
  tieneMigracion: boolean
  problemasSalud: string[]
  sintomas: string[]
  habitosSueno: {
    horaDormir: string
    horaDespertar: string
    siestas: boolean
    duracionSiestas?: number
  }
  entornoSueno: {
    comparteHabitacion: boolean
    tieneRutina: boolean
    usaPantallas: boolean
    actividadesAntesDormir: string[]
  }
  preocupaciones: string
}

// Perfil de sueño del niño
export interface SleepProfile {
  promedioHorasSueno: number
  calidadSueno: "buena" | "regular" | "mala"
  despertaresNocturnos: number
  dificultadParaDormir: boolean
  ronquidos: boolean
  pesadillas: boolean
  ultimaActualizacion: Date
}

// Evento de sueño
export interface SleepEvent {
  _id: ObjectId | string
  childId: ObjectId | string
  userId: ObjectId | string
  type: SleepEventType
  date: Date
  time: string
  duration?: number // en minutos
  quality?: 1 | 2 | 3 | 4 | 5
  notes?: string
  symptoms?: string[]
  mood?: "feliz" | "tranquilo" | "irritable" | "cansado"
  createdAt: Date
  updatedAt: Date
}

// Tipos de eventos de sueño
export enum SleepEventType {
  BEDTIME = "bedtime",
  WAKE_UP = "wake_up",
  NAP_START = "nap_start",
  NAP_END = "nap_end",
  NIGHT_WAKING = "night_waking",
  NIGHTMARE = "nightmare",
  SLEEP_WALKING = "sleep_walking",
  OTHER = "other"
}

// Mensaje del chat con el asistente
export interface ChatMessage {
  _id: ObjectId | string
  userId: ObjectId | string
  childId?: ObjectId | string
  sessionId: string
  role: "user" | "assistant" | "system"
  content: string
  metadata?: {
    tokens?: number
    model?: string
    context?: any
  }
  createdAt: Date
}

// Sesión de chat
export interface ChatSession {
  _id: ObjectId | string
  userId: ObjectId | string
  childId?: ObjectId | string
  title: string
  lastMessage?: Date
  messageCount: number
  status: "active" | "archived"
  createdAt: Date
  updatedAt: Date
}

// Recomendación del asistente
export interface Recommendation {
  _id: ObjectId | string
  childId: ObjectId | string
  userId: ObjectId | string
  type: "routine" | "environment" | "health" | "behavior"
  title: string
  description: string
  priority: "high" | "medium" | "low"
  status: "pending" | "in_progress" | "completed" | "dismissed"
  dueDate?: Date
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

// Estadísticas de sueño
export interface SleepStatistics {
  childId: ObjectId | string
  period: "week" | "month" | "year"
  startDate: Date
  endDate: Date
  averageSleepHours: number
  averageBedtime: string
  averageWakeTime: string
  nightWakings: number
  sleepQuality: number // 1-5
  consistency: number // 0-100%
  trends: {
    sleepDuration: "improving" | "stable" | "declining"
    sleepQuality: "improving" | "stable" | "declining"
    consistency: "improving" | "stable" | "declining"
  }
}