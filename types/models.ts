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
  parentId: ObjectId | string // Dueño principal del perfil del niño
  sharedWith?: string[] // Array de IDs de usuarios con acceso compartido
  surveyData?: SurveyData
  sleepProfile?: SleepProfile
  createdAt: Date
  updatedAt: Date
}

// Datos del cuestionario completo de sueño infantil
export interface SurveyData {
  // Estado general
  completed?: boolean
  completedAt?: Date
  lastUpdated?: Date
  
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
      pensamientosNegativosDetalle?: string
      tieneAlergias: boolean
      alergias?: string
    }

    primaryCaregiver?: "father" | "mother" | "caregiver" | ""
  }
  
  // DINÁMICA FAMILIAR
  dinamicaFamiliar: {
    cantidadHijos?: number
    hijosInfo?: Array<{
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

// Modelo de Invitación Pendiente
export interface PendingInvitation {
  _id: ObjectId | string
  email: string // Email del usuario invitado
  childId: ObjectId | string // Niño al que tendrá acceso
  invitedBy: ObjectId | string // Usuario que envió la invitación
  invitedByName: string // Nombre del que invita para el email
  childName: string // Nombre del niño para el email
  role: "viewer" | "editor" | "caregiver" // Rol asignado
  permissions: {
    canViewEvents: boolean
    canCreateEvents: boolean
    canEditEvents: boolean
    canViewReports: boolean
    canEditProfile: boolean
    canViewPlan: boolean
  }
  relationshipType?: "parent" | "grandparent" | "babysitter" | "family" | "professional" | "other"
  relationshipDescription?: string
  invitationToken: string // Token único para aceptar
  expiresAt: Date // Fecha de expiración de la invitación
  status: "pending" | "accepted" | "expired" | "cancelled"
  acceptedAt?: Date
  acceptedBy?: ObjectId | string // ID del usuario que aceptó
  createdAt: Date
  updatedAt: Date
}

// Modelo de Acceso Compartido a Niño
export interface UserChildAccess {
  _id: ObjectId | string
  userId: ObjectId | string // Usuario que tiene acceso
  childId: ObjectId | string // Niño al que tiene acceso
  grantedBy: ObjectId | string // Usuario que otorgó el acceso (parentId)
  role: "viewer" | "editor" | "caregiver" // Nivel de permisos
  permissions: {
    canViewEvents: boolean
    canCreateEvents: boolean
    canEditEvents: boolean
    canViewReports: boolean
    canEditProfile: boolean
    canViewPlan: boolean
  }
  relationshipType?: "parent" | "grandparent" | "babysitter" | "family" | "professional" | "other"
  relationshipDescription?: string // Descripción personalizada (ej: "Tía María")
  invitationToken?: string // Token para aceptar invitación
  invitationStatus: "pending" | "accepted" | "rejected" | "expired"
  invitationSentAt?: Date
  acceptedAt?: Date
  expiresAt?: Date // Acceso temporal opcional
  createdAt: Date
  updatedAt: Date
}

// Plan personalizado para el niño
export interface ChildPlan {
  _id: ObjectId | string
  childId: ObjectId | string
  userId: ObjectId | string
  planNumber: number // 0, 1, 2, 3...
  planVersion: string // "0", "1", "1.1", "2", "2.1", etc.
  planType: "initial" | "event_based" | "transcript_refinement"
  
  // Horarios estructurados del plan
  schedule: {
    bedtime: string      // "20:00"
    wakeTime: string     // "07:00" 
    meals: Array<{
      id?: string
      time: string       // "12:00"
      type: string       // "almuerzo", "cena", "desayuno", "merienda"
      description: string
    }>
    activities?: Array<{
      id?: string
      time: string       // "17:00"
      activity: string   // "jugar", "leer", "ejercicio"
      duration: number   // minutos
      description: string
    }>
    naps?: Array<{
      id?: string
      time: string       // "14:00"
      duration: number   // minutos
      description?: string
    }>
    timelineOrder?: string[] // orden manual para la vista del timeline
  }
  
  // Detalles del plan
  title: string          // "Plan Inicial para [Nombre]"
  objectives: string[]   // Objetivos principales del plan

  // Rutina de Sueño (Punto 45)
  sleepRoutine?: ({
    suggestedBedtime?: string     // "20:00"
    suggestedWakeTime?: string    // "07:00"
    numberOfNaps?: number         // 2
    napDuration?: string          // "60-90 minutos"
    wakeWindows?: string          // "2-3 horas entre siestas"
    notes?: string                // Texto libre mostrado al usuario
  }) | null

  recommendations: string[] // Recomendaciones específicas
  basedOn: "survey_stats_rag" | "events_stats_rag" | "transcript_refinement"
  
  // Referencia al plan base (para evolución progresiva)
  basedOnPlan?: {
    planId: ObjectId | string
    planVersion: string
  }
  
  // Rango de eventos considerados para planes basados en eventos
  eventsDateRange?: {
    fromDate: Date
    toDate: Date
    totalEventsAnalyzed: number
  }
  
  // Metadata para Plan 0 (basado en survey + stats + RAG)
  sourceData?: {
    surveyDataUsed: boolean
    childStatsUsed: boolean
    ragSources: string[]  // Fuentes del knowledge base utilizadas
    ageInMonths: number
    totalEvents: number
  }
  
  // Metadata para Planes basados en eventos (1, 2, 3...)
  eventAnalysis?: {
    eventsAnalyzed: number
    eventTypes: string[]
    progressFromPrevious: string
    ragSources: string[]
    basePlanVersion: string
  }
  
  // Metadata para Planes de refinamiento (.1, .2, etc.)
  transcriptAnalysis?: {
    reportId: ObjectId | string  // ID del reporte de análisis usado
    improvements: string[]       // Mejoras identificadas
    adjustments: string[]        // Ajustes sugeridos
    basePlanVersion: string      // Plan base que se refinó (ej: "1", "2")
  }
  
  // Información de auditoría
  createdAt: Date
  updatedAt: Date
  createdBy: ObjectId | string // admin ID que creó el plan
  status: "borrador" | "activo" | "completado" | "superseded" | "archived" // Estado del plan
}
