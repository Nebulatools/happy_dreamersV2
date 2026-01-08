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
      horaRegresoTrabajo?: string
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
    otrosResidentes?: string // Quiénes más viven en la casa
    contactoPrincipal?: "mama" | "papa" // Contacto principal para seguimiento
    comoSupiste?: string // Cómo supiste de los servicios
    librosConsultados?: string // Libros sobre sueño infantil consultados
    metodosContra?: string // Métodos de entrenamiento en contra
    otroAsesor?: boolean // ¿Ha contratado otro asesor?
    otroAsesorDetalle?: string // Detalles del otro asesor (condicional)
    quienAtiende?: string // Quién atiende al niño en la noche

    // Campos legacy (mantener por compatibilidad):
    otrosEnCasa?: string
    telefonoSeguimiento?: string
    emailObservaciones?: string
    comoConocioServicios?: string
    metodosEnContra?: string
    asesorAnterior?: string
    quienSeLevaantaNoche?: string
    quienSeLevantaNoche?: string
  }
  
  // HISTORIAL DEL NIÑO
  historial: {
    // Información básica
    nombreHijo?: string // Nombre del hijo (puede ser diferente al registrado)
    nombre?: string // Legacy
    fechaNacimiento?: string
    genero?: string // Género del hijo
    pesoHijo?: number // Peso del hijo
    peso?: number // Legacy
    percentilPeso?: number

    // Información prenatal
    embarazoPlaneado?: boolean
    problemasEmbarazo?: boolean
    problemasEmbarazoDetalle?: string // Detalles de problemas en el embarazo
    problemasEmbarazoDescripcion?: string // Legacy
    condicionesEmbarazo?: string[] // Condiciones durante el embarazo
    condicionesEmbarazoOtro?: string // Otras condiciones (campo condicional)
    padecimientosEmbarazo?: string[] // Legacy

    // Información del parto
    tipoParto?: "Vaginal" | "Cesárea" | "Vaginal después de Cesárea" | string
    semanasNacimiento?: number // Semanas de gestación al nacer
    nacioTermino?: boolean // ¿Nació a término?
    nacioPlazo?: boolean // Legacy
    complicacionesParto?: boolean
    complicacionesPartoDescripcion?: string

    // Problemas al nacer
    problemasHijo?: boolean // ¿Tuvo problemas el hijo?
    problemasNacer?: boolean // ¿Problemas al nacer?
    problemasAlNacer?: boolean // Legacy
    problemasNacerDetalle?: string // Detalles de problemas al nacer
    problemasAlNacerDescripcion?: string // Legacy

    // Información del pediatra
    pediatra?: string // Nombre del pediatra
    pediatraTelefono?: string // Teléfono del pediatra
    pediatraEmail?: string // Email del pediatra
    pediatraDescarto?: boolean // ¿Pediatra descartó problemas?
    pediatraDescartaProblemas?: boolean // Legacy
    pediatraConfirma?: boolean // ¿Pediatra confirma capacidad de dormir?
    pediatraConfirmaDetalle?: string // Detalles de confirmación (condicional)
    pediatraConfirmaCapacidadDormir?: boolean // Legacy

    // Tratamiento médico
    tratamientoMedico?: boolean
    tratamientoMedicoDetalle?: string
    tratamientoMedicoDescripcion?: string // Legacy
  }
  
  // DESARROLLO Y SALUD
  desarrolloSalud: {
    // Hitos del desarrollo
    rodarMeses?: number // Edad en meses cuando empezó a rodar
    edadRodar?: number // Legacy
    sentarseMeses?: number // Edad en meses cuando empezó a sentarse
    edadSentarse?: number // Legacy
    gatearMeses?: number // Edad en meses cuando empezó a gatear
    edadGatear?: number // Legacy
    pararseMeses?: number // Edad en meses cuando empezó a pararse
    edadPararse?: number // Legacy
    caminarMeses?: number // Edad en meses cuando empezó a caminar
    edadCaminar?: number // Legacy

    // Alimentación
    usoVaso?: "Vaso" | "Biberón" | "Ambas" | string
    alimentacion?:
      | "Fórmula"
      | "Leche materna"
      | "Leche materna exclusiva"
      | "Leche materna y fórmula"
      | "Leche entera de vaca"
      | "Ninguna"
      | string
    alimentacionOtro?: string // Otro tipo de alimentación (condicional)
    alimentacionIntroduccion?: string // Cuándo se introdujo la fórmula/leche
    comeSolidos?: boolean

    // Características y hábitos
    hijoUtiliza?: string[] | string // Características del hijo (vaso, biberón, ambas, etc.)
    caracteristicas?: string[] // Legacy
    nombreObjetoSeguridad?: string // Nombre del objeto de seguridad
    planDejarDedo?: string // Plan para dejar de chuparse el dedo
    planDejarChupon?: string // Plan para dejar el chupón

    // Problemas de salud
    problemasHijo?: string[] // Problemas o situaciones del hijo
    situacionesHijo?: string[] // Situaciones específicas
    problemasMedicosDetalle?: string // Detalle de problemas médicos o del desarrollo
    descripcionInquieto?: string // Detalle cuando es muy inquieto para dormir
    reflujoColicosDetalle?: string // Detalle cuando tiene reflujo y/o cólicos
    pesadillasDetalle?: string // Detalle sobre las pesadillas
    alergiaAlimenticiaDetalle?: string // Detalles de alergia alimenticia (condicional)
    alergiaAmbientalDetalle?: string // Detalles de alergia ambiental (condicional)
    infeccionesOidoDetalle?: string // Detalles de infecciones de oído (condicional)
    dificultadRespirarDetalle?: string // Detalles de dificultad para respirar (condicional)
  }
  
  // ACTIVIDAD FÍSICA
  actividadFisica: {
    // Uso de pantallas
    vePantallas?: boolean
    pantallasDetalle?: string // Detalles sobre el uso de pantallas (condicional)
    pantallasTiempo?: string // Legacy

    // Actividades físicas
    practicaActividad?: boolean
    actividadesLista?: string | { nombre: string; duracionMinutos?: number }[] | string[] // Lista de actividades con duración
    actividades?: string // Legacy
    actividadesDespierto?: string // Actividades cuando está despierto

    // Irritabilidad y comportamiento
    signosIrritabilidad?: boolean
    irritabilidadDetalle?: string // Detalles de irritabilidad (condicional)
    situacionesSufridas?: string[] // "Alergias", "Infecciones de oído frecuentes", etc.
  }
  
  // RUTINA Y HÁBITOS DE SUEÑO
  rutinaHabitos: {
    // Día típico y cuidado
    diaTipico?: string // Descripción detallada del día típico
    diaTypico?: string // Legacy (typo)
    vaKinder?: boolean // ¿Va a kínder/guardería?
    vaGuarderia?: boolean // Legacy
    kinderDetalle?: string // Detalles del kínder (condicional)
    quienCuida?: string // Quién pasa tiempo con el niño
    quienPasaTiempo?: string // Legacy
    quienCuidaNoche?: string // Quién cuida al niño en la noche

    // Rutina de dormir
    rutinaDormir?: string // Rutina antes de acostarse
    rutinaAntesAcostarse?: string // Legacy
    horaEspecificaDormir?: boolean
    horaDormir?: string // Hora específica de dormir
    horaAcostarBebe?: string // Hora de acostar al bebé
    tiempoDormir?: string // Tiempo que le toma conciliar el sueño
    duermeSolo?: boolean // ¿Se queda dormido solo?
    comoLograDormir?: string // Cómo lo logran dormir cuando no se duerme solo
    seQuedaDormirSolo?: boolean // Legacy
    teQuedasHastaDuerma?: boolean // ¿Te quedas hasta que duerma?
    seQuedaHastaConciliar?: boolean // Legacy

    // Entorno del cuarto
    oscuridadCuarto?: string // Nivel de oscuridad del cuarto ("lamparita", "puerta-abierta", etc.)
    colorLamparita?: string // ⭐ Color de la lamparita (condicional cuando oscuridadCuarto="lamparita")
    ruidoBlanco?: boolean // ¿Usan ruido blanco?
    usaRuidoBlanco?: boolean // Legacy
    temperaturaCuarto?: string // Temperatura del cuarto
    tipoPiyama?: string // Tipo de pijama que usa
    tipoPijama?: string // Variante de escritura
    usaSaco?: boolean // ¿Usa saco para dormir?
    usaSacoDormir?: boolean // Legacy

    // Lugar donde duerme
    dondeDuerme?: string | "Cama en su cuarto" | "Cama en su cuarto con alguno de los padres" |
                   "Cuna/corral en su cuarto" | "Cuna/corral en cuarto de papás" |
                   "Cama de papás" | "Primero en su cuna/corral y luego a cama de papás" |
                   "Primero en su cama y luego a cama de papás"
    dondeDuermeNoche?: string // Legacy
    dondeDuermeSalida?: string // Dónde duerme cuando los padres salen
    dondeVurmePadresSalen?: string // Legacy (typo)
    comparteHabitacion?: boolean // ¿Comparte habitación?
    comparteHabitacionCon?: string // Con quién comparte (condicional)
    conQuienComparte?: string // Legacy

    // Siestas
    tomaSiestas?: boolean // ¿Toma siestas?
    haceSiestas?: boolean // Legacy
    numeroSiestas?: number // Número de siestas al día
    duracionTotalSiestas?: string // Duración total de siestas
    dondeSiestas?: string // Dónde toma las siestas
    horaDespertar?: string // Hora de despertar

    // Despertares nocturnos
    despiertaNoche?: boolean // ¿Se despierta en la noche?
    despiertaEnNoche?: boolean // Legacy
    vecesDespierta?: number // Veces que se despierta en la noche
    desdeCuandoDespierta?: string // Desde cuándo se despierta
    queHacesDespierta?: string // Qué haces cuando se despierta
    tiempoDespierto?: string // Tiempo que está despierto

    // Comportamiento
    intentaSalirCama?: boolean
    sacaDesCamaNohe?: boolean
    lloraAlDejarSolo?: boolean
    golpeaCabeza?: boolean
    miendoOscuridad?: boolean
    padresMiedoOscuridad?: boolean
    temperamento?: string
    reaccionDejarSolo?: string
    metodosRelajarse?: string

    // Preocupaciones y problemas
    desdeCuandoProblema?: string // Desde cuándo tiene el problema
    principalPreocupacion?: string // Principal preocupación de los padres

    // Otros hijos y viajes
    otrosHijosProblemas?: boolean
    dondeViermesViaja?: string // Dónde duerme cuando viaja (typo - debería ser "dondeDuermeViaja")
    dondeDuermeViaja?: string
    duermeMejorViaja?: "Mejor" | "Peor" | "No aplica" | string

    // Objetivos y disposición
    padresDispuestos?: boolean
    objetivoPadres?: string // Objetivos de los padres
    objetivosPadres?: string // Legacy
    infoAdicional?: string // Información adicional
    informacionAdicional?: string // Legacy
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

// Evento general (usado en calendario y admin)
export interface Event {
  _id: string
  childId: string
  parentId?: string
  eventType: "sleep" | "nap" | "wake" | "night_waking" | "feeding" | "night_feeding" | "medication" | "extra_activities" | string
  emotionalState?: string
  startTime: string
  endTime?: string
  notes?: string
  duration?: number // en minutos
  sleepDelay?: number // tiempo para dormirse en minutos
  // Campos de alimentacion
  feedingType?: "breast" | "bottle" | "solids"
  feedingDuration?: number
  feedingAmount?: string
  // Campos de medicamento
  medicationName?: string
  medicationDose?: string
  // Campos de actividad extra
  activityType?: string
  createdAt?: Date
  updatedAt?: Date
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
