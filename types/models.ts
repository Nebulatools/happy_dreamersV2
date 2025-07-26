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

// Datos del cuestionario completo de sueño infantil
export interface SurveyData {
  completedAt?: Date
  
  // INFORMACIÓN FAMILIAR
  informacionFamiliar: {
    // Sobre Papá
    papa: {
      nombre: string
      edad?: number
      ocupacion: string
      direccion: string
      ciudad?: string
      telefono?: string
      email: string
      trabajaFueraCasa: boolean
      tieneAlergias: boolean
      alergias?: string
    }
    
    // Sobre Mamá
    mama: {
      nombre: string
      edad?: number
      ocupacion: string
      mismaDireccionPapa: boolean
      direccion?: string
      ciudad: string
      telefono: string
      email: string
      trabajaFueraCasa?: boolean
      puedeDormirConHijo: boolean
      apetito: string
      pensamientosNegativos: boolean
      tieneAlergias: boolean
      alergias?: string
    }
  }
  
  // DINÁMICA FAMILIAR
  dinamicaFamiliar: {
    cantidadHijos: number
    hijosInfo: Array<{
      nombre: string
      fechaNacimiento: string
      edad: number
      esElQueNecesitaAyuda: boolean
    }>
    otrosEnCasa: string
    telefonoSeguimiento: string
    emailObservaciones: string
    comoConocioServicios: string
    librosConsultados?: string
    metodosEnContra?: string
    asesorAnterior?: string
    quienSeLevaantaNoche: string
  }
  
  // HISTORIAL DEL NIÑO
  historial: {
    // Información básica
    nombre: string
    fechaNacimiento: string
    peso: number
    percentilPeso?: number
    
    // Información prenatal
    embarazoPlaneado: boolean
    problemasEmbarazo: boolean
    problemasEmbarazoDescripcion?: string
    padecimientosEmbarazo: string[] // "Anemia", "Infecciones", "Ninguna"
    tipoParto: "Vaginal" | "Cesárea" | "Vaginal después de Cesárea"
    complicacionesParto: boolean
    complicacionesPartoDescripcion?: string
    nacioPlazo: boolean
    problemasAlNacer: boolean
    problemasAlNacerDescripcion?: string
    pediatra?: string
    pediatraDescartaProblemas: boolean
    pediatraConfirmaCapacidadDormir: boolean
    tratamientoMedico: boolean
    tratamientoMedicoDescripcion?: string
  }
  
  // DESARROLLO Y SALUD
  desarrolloSalud: {
    edadRodar?: number
    edadSentarse?: number
    edadGatear?: number
    edadPararse?: number
    edadCaminar?: number
    usoVaso?: "Vaso" | "Biberón"
    alimentacion?: "Fórmula" | "Leche materna exclusiva" | "Leche materna y fórmula" | "Ninguna"
    comeSolidos?: boolean
    caracteristicas: string[] // Array de características como "Se chupa el dedo", "Usa chupón", etc.
  }
  
  // ACTIVIDAD FÍSICA
  actividadFisica: {
    vePantallas: boolean
    pantallasTiempo?: string
    practicaActividad: boolean
    actividades?: string
    actividadesDespierto?: string
    signosIrritabilidad: boolean
    situacionesSufridas?: string[] // "Alergias", "Infecciones de oído frecuentes", etc.
  }
  
  // RUTINA Y HÁBITOS DE SUEÑO
  rutinaHabitos: {
    diaTypico: string // Descripción detallada del día típico
    vaGuarderia: boolean
    quienPasaTiempo: string
    quienCuidaNoche?: string
    dondeVurmePadresSalen?: string
    rutinaAntesAcostarse: string
    horaEspecificaDormir: boolean
    horaDormir?: string
    seQuedaDormirSolo: boolean
    oscuridadCuarto: string[] // "Lamparita prendida", "Puerta abierta", etc.
    usaRuidoBlanco: boolean
    temperaturaCuarto?: string
    tipoPiyama: string
    usaSacoDormir: boolean
    seQuedaHastaConciliar: boolean
    
    dondeDuermeNoche: "Cama en su cuarto" | "Cama en su cuarto con alguno de los padres" | 
                     "Cuna/corral en su cuarto" | "Cuna/corral en cuarto de papás" | 
                     "Cama de papás" | "Primero en su cuna/corral y luego a cama de papás" | 
                     "Primero en su cama y luego a cama de papás"
    
    comparteHabitacion: boolean
    conQuienComparte?: string
    intentaSalirCama: boolean
    sacaDesCamaNohe: boolean
    lloraAlDejarSolo: boolean
    golpeaCabeza: boolean
    despiertaEnNoche: boolean
    miendoOscuridad: boolean
    padresMiedoOscuridad: boolean
    temperamento: string
    reaccionDejarSolo: string
    metodosRelajarse: string
    haceSiestas: boolean
    
    otrosHijosProblemas?: boolean
    dondeViermesViaja?: string
    duermeMejorViaja?: "Mejor" | "Peor" | "No aplica"
    padresDispuestos: boolean
    objetivosPadres: string
    informacionAdicional?: string
  }
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