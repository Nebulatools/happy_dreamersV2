// API para gestión de planes personalizados de niños
// Maneja Plan 0 (basado en survey + stats + RAG) y Planes subsecuentes (basados en transcript analysis)

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { getMongoDBVectorStoreManager } from "@/lib/rag/vector-store-mongodb"
import { OpenAI } from "openai"
import { differenceInDays, format, subDays } from "date-fns"
import { processSleepStatistics } from "@/lib/sleep-calculations"
import { createLogger } from "@/lib/logger"
import { ChildPlan } from "@/types/models"
import { derivePlanPolicy } from "@/lib/plan-policies"

const logger = createLogger("API:consultas:plans:route")

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// ================================
// FUNCIONES UTILITARIAS PARA VERSIONES DE PLANES
// ================================

/**
 * Calcula la siguiente versión de plan basada en el tipo y la existencia de planes anteriores
 */
function calculateNextPlanVersion(existingPlans: any[], planType: "initial" | "event_based" | "transcript_refinement"): {
  planNumber: number
  planVersion: string
} {
  if (planType === "initial") {
    return { planNumber: 0, planVersion: "0" }
  }
  
  // Obtener el plan más reciente
  const latestPlan = existingPlans[0] // Ya están ordenados por planNumber desc
  
  if (planType === "event_based") {
    // Para planes basados en eventos: 1, 2, 3, etc.
    const nextNumber = latestPlan ? latestPlan.planNumber + 1 : 1
    return { 
      planNumber: nextNumber, 
      planVersion: nextNumber.toString() 
    }
  }
  
  if (planType === "transcript_refinement") {
    // Para refinamientos: solo si ya hay planes 1, 2, 3... (no se puede refinar Plan 0)
    if (!latestPlan) {
      throw new Error("No se puede crear un plan de refinamiento sin un plan base")
    }
    
    // Solo se puede refinar planes 1, 2, 3... NO el Plan 0
    if (latestPlan.planNumber === 0) {
      throw new Error("No se puede refinar el Plan 0. Primero debe generar el Plan 1")
    }
    
    const basePlanNumber = latestPlan.planNumber
    const refinementVersion = `${basePlanNumber}.1`
    
    return {
      planNumber: basePlanNumber, // Mismo número que el plan base
      planVersion: refinementVersion
    }
  }
  
  throw new Error(`Tipo de plan no válido: ${planType}`)
}

// ================================
// ENRIQUECIMIENTO DE ESTADÍSTICAS (NAPS / BEDTIME / FEEDING)
// ================================

function __minutesBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 60000)
}

function __avgMinutesFromDates(dates: Date[], nocturnal = false): number | null {
  if (!dates || dates.length === 0) return null
  const mins = dates.map((d) => {
    let m = d.getHours() * 60 + d.getMinutes()
    if (nocturnal && d.getHours() <= 6) m += 24 * 60
    return m
  })
  const avg = Math.round(mins.reduce((a, b) => a + b, 0) / mins.length)
  return avg % (24 * 60)
}

function __minutesToHHMM(mins: number | null): string | null {
  if (mins == null) return null
  const h = Math.floor(mins / 60) % 24
  const m = mins % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

function computeNapStatsFromEvents(events: any[]) {
  const naps = (events || []).filter(e => e?.eventType === 'nap' && e?.startTime && e?.endTime)
  if (!naps.length) return { count: 0, avgDuration: 0, typicalTime: null as string | null }
  const starts = naps.map((e: any) => new Date(e.startTime))
  const durations = naps.map((e: any) => __minutesBetween(new Date(e.startTime), new Date(e.endTime)))
  const avgDur = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
  const typicalMin = __avgMinutesFromDates(starts, false)
  return { count: naps.length, avgDuration: avgDur, typicalTime: __minutesToHHMM(typicalMin) }
}

function computeBedtimeAvgFromEvents(events: any[]) {
  const sleeps = (events || []).filter(e => e?.eventType === 'sleep' && e?.startTime)
  if (!sleeps.length) return { avgBedtime: null as string | null }
  const starts = sleeps.map((e: any) => new Date(e.startTime))
  const typicalMin = __avgMinutesFromDates(starts, true)
  return { avgBedtime: __minutesToHHMM(typicalMin) }
}

function computeFeedingTypicalTimesFromEvents(events: any[]) {
  const fed = (events || []).filter(e => e?.eventType === 'feeding' && e?.startTime)
  const buckets: any = {
    breakfast: { from: 6 * 60, to: 10 * 60, times: [] as Date[] },
    lunch: { from: 11 * 60, to: 14 * 60, times: [] as Date[] },
    snack: { from: 15 * 60, to: 17 * 60, times: [] as Date[] },
    dinner: { from: 18 * 60, to: 20 * 60 + 59, times: [] as Date[] },
  }
  for (const e of fed) {
    const d = new Date(e.startTime)
    const m = d.getHours() * 60 + d.getMinutes()
    for (const key of Object.keys(buckets)) {
      const b = buckets[key]
      if (m >= b.from && m <= b.to) { b.times.push(d); break }
    }
  }
  const result: any = {}
  for (const key of Object.keys(buckets)) {
    const arr: Date[] = buckets[key].times
    const avg = __avgMinutesFromDates(arr, false)
    result[key] = arr.length ? __minutesToHHMM(avg) : null
    result[key + 'Count'] = arr.length
  }
  return result
}

/**
 * Verifica si hay eventos disponibles después de una fecha específica
 */
async function hasEventsAfterDate(childId: string, afterDate: Date): Promise<{
  hasEvents: boolean
  eventCount: number
  eventTypes: string[]
}> {
  try {
    const { db } = await connectToDatabase()
    const now = new Date()

    logger.info("hasEventsAfterDate: Buscando eventos", {
      childId,
      afterDate: afterDate.toISOString(),
      now: now.toISOString()
    })

    // Preferir colección canónica 'events'
    const eventsCol = db.collection('events')
    const events = await eventsCol.find({
      childId: new ObjectId(childId),
      startTime: { $gt: afterDate.toISOString(), $lte: now.toISOString() }
    }, { projection: { eventType: 1, startTime: 1 } as any }).toArray()

    logger.info("hasEventsAfterDate: Eventos encontrados en colección", {
      count: events.length,
      eventDates: events.map((e: any) => e.startTime).slice(0, 5) // Primeros 5 para debug
    })

    if (events.length > 0) {
      const eventTypes = [...new Set(events.map((e: any) => e.eventType).filter(Boolean))]
      return { hasEvents: true, eventCount: events.length, eventTypes }
    }

    // Fallback: eventos embebidos en el documento del niño (compatibilidad)
    logger.info("hasEventsAfterDate: Buscando en child.events (fallback)")
    const child = await db.collection('children').findOne({ _id: new ObjectId(childId) })
    if (child?.events?.length) {
      const filtered = child.events.filter((event: any) => {
        if (!event?.startTime) return false
        const eventDate = new Date(event.startTime)
        return eventDate > afterDate && eventDate <= now
      })

      logger.info("hasEventsAfterDate: Eventos encontrados en child.events", {
        totalEvents: child.events.length,
        filteredCount: filtered.length,
        filteredDates: filtered.map((e: any) => e.startTime).slice(0, 5)
      })

      const eventTypes = [...new Set(filtered.map((e: any) => e.eventType))]
      return { hasEvents: filtered.length > 0, eventCount: filtered.length, eventTypes }
    }

    logger.info("hasEventsAfterDate: No se encontraron eventos nuevos")
    return { hasEvents: false, eventCount: 0, eventTypes: [] }
  } catch (error) {
    logger.error("Error verificando eventos después de fecha:", error)
    return { hasEvents: false, eventCount: 0, eventTypes: [] }
  }
}

/**
 * Verifica si existe un transcript de consulta disponible
 */
async function hasAvailableTranscript(childId: string, afterDate?: Date): Promise<{
  hasTranscript: boolean
  latestReportId?: string
}> {
  try {
    const { db } = await connectToDatabase()
    
    // Construir query - si se especifica afterDate, buscar transcripts después de esa fecha
    const query: any = { childId: new ObjectId(childId) }
    if (afterDate) {
      query.createdAt = { $gt: afterDate }
    }
    
    const latestReport = await db.collection("consultation_reports")
      .findOne(query, { sort: { createdAt: -1 } })
    
    return {
      hasTranscript: !!latestReport,
      latestReportId: latestReport?._id?.toString()
    }
  } catch (error) {
    logger.error("Error verificando transcript disponible:", error)
    return { hasTranscript: false }
  }
}

// GET: Obtener todos los planes de un niño
export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const url = new URL(req.url)
    const childId = url.searchParams.get("childId")
    const userId = url.searchParams.get("userId")

    if (!childId || !userId) {
      return NextResponse.json({ 
        error: "Faltan parámetros requeridos: childId, userId" 
      }, { status: 400 })
    }

    // Permitir acceso si es admin O si es el padre del niño
    const isAdmin = session.user.role === "admin"
    const isParent = session.user.id === userId
    
    if (!isAdmin && !isParent) {
      return NextResponse.json({ error: "No autorizado para ver estos planes" }, { status: 403 })
    }

    logger.info("Obteniendo planes del niño", {
      childId,
      userId,
      requesterId: session.user.id,
      isAdmin,
      isParent
    })

    const { db } = await connectToDatabase()
    
    // Obtener todos los planes del niño ordenados por planNumber
    const plans = await db.collection("child_plans")
      .find({ 
        childId: new ObjectId(childId),
        userId: new ObjectId(userId)
      })
      .sort({ planNumber: 1 })
      .toArray()

    logger.info("Planes obtenidos", {
      childId,
      totalPlanes: plans.length,
      planNumbers: plans.map(p => p.planNumber)
    })

    return NextResponse.json({
      success: true,
      plans,
      totalCount: plans.length
    })

  } catch (error) {
    logger.error("Error obteniendo planes:", error)
    return NextResponse.json({ 
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : "Error desconocido"
    }, { status: 500 })
  }
}

// POST: Generar nuevo plan (Plan 0, Plan N, o Plan N.1)
export async function POST(req: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Verificar autenticación y permisos de admin
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { userId, childId, planType, reportId } = await req.json()

    if (!userId || !childId || !planType) {
      return NextResponse.json({ 
        error: "Faltan parámetros requeridos: userId, childId, planType" 
      }, { status: 400 })
    }

    // Validar tipos de plan permitidos
    const validPlanTypes = ["initial", "event_based", "transcript_refinement"]
    if (!validPlanTypes.includes(planType)) {
      return NextResponse.json({ 
        error: `Tipo de plan no válido. Tipos permitidos: ${validPlanTypes.join(", ")}` 
      }, { status: 400 })
    }

    if (planType === "transcript_refinement" && !reportId) {
      return NextResponse.json({ 
        error: "Para planes de refinamiento con transcript se requiere el reportId del análisis" 
      }, { status: 400 })
    }

    logger.info("Iniciando generación de plan", {
      userId,
      childId,
      planType,
      reportId,
      adminId: session.user.id
    })

    const { db } = await connectToDatabase()

    // Verificar planes existentes
    const existingPlans = await db.collection("child_plans")
      .find({ 
        childId: new ObjectId(childId),
        userId: new ObjectId(userId)
      })
      .sort({ planNumber: -1 })
      .toArray()

    // Calcular la siguiente versión de plan
    const { planNumber, planVersion } = calculateNextPlanVersion(existingPlans, planType)

    // VALIDACIONES ESPECÍFICAS POR TIPO DE PLAN
    if (planType === "initial" && existingPlans.length > 0) {
      return NextResponse.json({ 
        error: "Ya existe un plan inicial para este niño" 
      }, { status: 400 })
    }

    if (planType === "event_based" && existingPlans.length === 0) {
      return NextResponse.json({ 
        error: "Debe existir un plan inicial antes de crear planes basados en eventos" 
      }, { status: 400 })
    }

    if (planType === "transcript_refinement" && existingPlans.length === 0) {
      return NextResponse.json({ 
        error: "Debe existir al menos un plan base antes de crear un refinamiento" 
      }, { status: 400 })
    }

    // Validar que hay eventos disponibles para planes basados en eventos
    if (planType === "event_based") {
      const latestByCreatedAt = [...existingPlans].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
      const eventsCheck = await hasEventsAfterDate(childId, new Date(latestByCreatedAt.createdAt))
      
      if (!eventsCheck.hasEvents) {
        return NextResponse.json({ 
          error: "No hay eventos registrados después del último plan para generar uno nuevo" 
        }, { status: 400 })
      }
    }

    // Validar que hay transcript disponible para refinamientos
    if (planType === "transcript_refinement") {
      // Para refinamientos, verificar transcripts DESPUÉS del último plan
      const lastPlanDate = existingPlans.length > 0 ? new Date(existingPlans[0].createdAt) : null
      const transcriptCheck = await hasAvailableTranscript(childId, lastPlanDate)
      
      if (!transcriptCheck.hasTranscript && !reportId) {
        return NextResponse.json({ 
          error: "No hay transcript de consulta nuevo disponible para generar un refinamiento" 
        }, { status: 400 })
      }
    }

    let generatedPlan: ChildPlan

    if (planType === "initial") {
      // Generar Plan 0 basado en survey + stats + RAG
      generatedPlan = await generateInitialPlan(userId, childId, session.user.id)
    } else if (planType === "event_based") {
      // Generar Plan N basado en eventos + plan anterior + RAG
      // Base para todo: el plan más reciente (incluye refinamientos)
      const baseLatest = [...existingPlans].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]

      generatedPlan = await generateEventBasedPlan(
        userId,
        childId,
        baseLatest,            // schedule base
        planNumber,
        planVersion,
        session.user.id,
        new Date(baseLatest.createdAt) // eventos desde el ÚLTIMO plan (ej: 1.1 → 2)
      )
    } else if (planType === "transcript_refinement") {
      // Generar Plan N.1 basado en plan N + transcript
      const basePlan = existingPlans[0]
      generatedPlan = await generateTranscriptRefinementPlan(
        userId, 
        childId, 
        basePlan,
        reportId,
        planNumber,
        planVersion,
        session.user.id
      )
    }

    // Marcar planes anteriores como superseded (excepto refinamientos)
    if (existingPlans.length > 0 && planType !== "transcript_refinement") {
      await db.collection("child_plans").updateMany(
        { 
          childId: new ObjectId(childId),
          userId: new ObjectId(userId),
          planNumber: { $lt: planNumber }
        },
        { 
          $set: { 
            status: "superseded",
            updatedAt: new Date()
          } 
        }
      )
    }

    // Guardar el nuevo plan
    const result = await db.collection("child_plans").insertOne({
      ...generatedPlan,
      planNumber,
      planVersion,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: "active"
    })

    const totalProcessingTime = Date.now() - startTime

    logger.info("Plan generado exitosamente", {
      planId: result.insertedId,
      planNumber,
      planVersion,
      planType,
      childId,
      processingTime: totalProcessingTime
    })

    return NextResponse.json({
      success: true,
      planId: result.insertedId,
      plan: {
        ...generatedPlan,
        _id: result.insertedId,
        planNumber,
        planVersion,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "active"
      },
      metadata: {
        processingTime: totalProcessingTime,
        planNumber,
        planVersion,
        totalPlans: existingPlans.length + 1
      }
    })

  } catch (error) {
    const totalProcessingTime = Date.now() - startTime
    logger.error("Error generando plan", {
      error: error instanceof Error ? error.message : "Error desconocido",
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: totalProcessingTime
    })
    
    return NextResponse.json({ 
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : "Error desconocido"
    }, { status: 500 })
  }
}

// PUT: Validar si es posible generar un tipo específico de plan
export async function PUT(req: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { userId, childId, planType } = await req.json()

    if (!userId || !childId || !planType) {
      return NextResponse.json({ 
        error: "Faltan parámetros requeridos: userId, childId, planType" 
      }, { status: 400 })
    }

    // Permitir acceso si es admin O si es el padre del niño
    const isAdmin = session.user.role === "admin"
    const isParent = session.user.id === userId
    
    if (!isAdmin && !isParent) {
      return NextResponse.json({ error: "No autorizado para validar estos planes" }, { status: 403 })
    }

    const { db } = await connectToDatabase()

    // Obtener planes existentes
    const existingPlans = await db.collection("child_plans")
      .find({ 
        childId: new ObjectId(childId),
        userId: new ObjectId(userId)
      })
      .sort({ planNumber: -1 })
      .toArray()

    let canGenerate = false
    let reason = ""
    let additionalInfo = {}

    if (planType === "initial") {
      canGenerate = existingPlans.length === 0
      reason = canGenerate ? "No hay planes existentes" : "Ya existe un plan inicial"
      
    } else if (planType === "event_based") {
      if (existingPlans.length === 0) {
        canGenerate = false
        reason = "Debe existir un plan inicial antes de crear planes basados en eventos"
      } else {
        // Usar SIEMPRE el último plan generado (incluye refinamientos) como frontera del rango de eventos
        const latestByCreatedAt = [...existingPlans].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]

        logger.info("PUT Validación: Verificando eventos para plan basado en eventos", {
          childId,
          lastPlanVersion: latestByCreatedAt.planVersion,
          lastPlanCreatedAt: latestByCreatedAt.createdAt
        })

        const eventsCheck = await hasEventsAfterDate(childId, new Date(latestByCreatedAt.createdAt))

        logger.info("PUT Validación: Resultado de verificación de eventos", {
          hasEvents: eventsCheck.hasEvents,
          eventCount: eventsCheck.eventCount,
          eventTypes: eventsCheck.eventTypes
        })

        canGenerate = eventsCheck.hasEvents
        reason = canGenerate
          ? `${eventsCheck.eventCount} eventos disponibles desde el último plan`
          : "No hay eventos registrados después del último plan"

        additionalInfo = {
          eventsAvailable: eventsCheck.eventCount,
          eventTypes: eventsCheck.eventTypes,
          lastPlanDate: latestByCreatedAt.createdAt,
          lastPlanVersion: latestByCreatedAt.planVersion
        }
      }

    } else if (planType === "transcript_refinement") {
      let transcriptCheck: any = null
      if (existingPlans.length === 0) {
        canGenerate = false
        reason = "Debe existir al menos un plan base antes de crear un refinamiento"
      } else if (existingPlans[0].planNumber === 0) {
        // No se puede refinar Plan 0, primero debe haber Plan 1
        canGenerate = false
        reason = "No se puede refinar el Plan 0. Primero genere el Plan 1"
      } else {
        // Verificar si ya existe un plan de refinamiento para el plan actual
        const currentPlanNumber = existingPlans[0].planNumber
        const existingRefinement = existingPlans.find(plan => 
          plan.planNumber === currentPlanNumber && plan.planVersion.includes('.1')
        )
        
        if (existingRefinement) {
          canGenerate = false
          reason = `Ya existe un Plan ${existingRefinement.planVersion} de refinamiento`
        } else {
          // Para refinamientos, verificar transcripts DESPUÉS del último plan
          const lastPlanDate = new Date(existingPlans[0].createdAt)
          transcriptCheck = await hasAvailableTranscript(childId, lastPlanDate)
          
          canGenerate = transcriptCheck.hasTranscript
          reason = canGenerate
            ? "Transcript de consulta nuevo disponible"
            : "No hay transcript de consulta nuevo disponible"
        }
        
        additionalInfo = {
          hasTranscript: true, // Si llegamos aquí, asumimos que hay transcript
          basePlanVersion: existingPlans[0].planVersion,
          hasRefinement: !!existingRefinement,
          latestReportId: transcriptCheck?.latestReportId || null
        }
      }
    } else {
      canGenerate = false
      reason = `Tipo de plan no válido: ${planType}`
    }

    return NextResponse.json({
      success: true,
      canGenerate,
      reason,
      planType,
      nextVersion: canGenerate ? calculateNextPlanVersion(existingPlans, planType).planVersion : null,
      additionalInfo
    })

  } catch (error) {
    logger.error("Error validando posibilidad de generar plan:", error)
    return NextResponse.json({ 
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : "Error desconocido"
    }, { status: 500 })
  }
}

// Función para generar Plan 0 (inicial) basado en survey + stats + RAG
async function generateInitialPlan(userId: string, childId: string, adminId: string): Promise<ChildPlan> {
  logger.info("Generando plan inicial", { userId, childId })

  const { db } = await connectToDatabase()
  
  // 1. Obtener datos del niño. Para flujos de administrador, permitir por _id
  //    y usar el parentId real del niño como owner del plan.
  const child = await db.collection("children").findOne({
    _id: new ObjectId(childId),
  })

  if (!child) {
    throw new Error("No se encontró información del niño")
  }

  // Asegurar userId consistente con el dueño real del niño
  const effectiveUserId = child.parentId?.toString?.() || userId

  // 2. Calcular estadísticas del niño
  const events = await db.collection("events").find({
    childId: new ObjectId(childId),
  }).sort({ startTime: -1 }).toArray()

  // Usar TODA la historia de eventos para Plan 0 (no limitar a 30 días)
  const stats = processSleepStatistics(events)
  
  const birthDate = child.birthDate ? new Date(child.birthDate) : null
  const ageInMonths = birthDate ? Math.floor(differenceInDays(new Date(), birthDate) / 30.44) : null

  // 3. Buscar información relevante en RAG
  const ragContext = await searchRAGForPlan(ageInMonths)
  
  // 4. Enriquecer estadísticas (siestas/bedtime/feeding) para reflejar patrones reales
  const napStats = computeNapStatsFromEvents(events)
  const bedtimeStats = computeBedtimeAvgFromEvents(events)
  const feedingStats = computeFeedingTypicalTimesFromEvents(events)

  // 5. Generar plan con IA (incluir políticas de ajuste seguras)
  const policies = derivePlanPolicy({ ageInMonths, events })
  const aiPlan = await generatePlanWithAI({
    planType: "initial",
    childData: {
      ...child,
      ageInMonths,
      stats,
      events
    },
    ragContext,
    surveyData: child.surveyData,
    policies,
    enrichedStats: { napStats, bedtimeStats, feedingStats }
  })

  return {
    childId: new ObjectId(childId),
    userId: new ObjectId(effectiveUserId),
    planNumber: 0,
    planVersion: "0",
    planType: "initial",
    title: `Plan Inicial para ${child.firstName}`,
    schedule: aiPlan.schedule,
    objectives: aiPlan.objectives,
    recommendations: aiPlan.recommendations,
    basedOn: "survey_stats_rag",
    sourceData: {
      surveyDataUsed: !!child.surveyData,
      childStatsUsed: true,
      ragSources: ragContext.map(r => r.source),
      ageInMonths: ageInMonths || 0,
      totalEvents: events.length
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: new ObjectId(adminId),
    status: "active"
  }
}

// Función para generar Plan N basado en eventos + plan anterior + RAG
async function generateEventBasedPlan(
  userId: string,
  childId: string,
  basePlan: any,
  planNumber: number,
  planVersion: string,
  adminId: string,
  eventsFromDateOverride?: Date
): Promise<ChildPlan> {
  logger.info("Generando plan basado en eventos", { 
    userId, 
    childId, 
    basePlanVersion: basePlan.planVersion,
    newPlanVersion: planVersion 
  })

  const { db } = await connectToDatabase()
  
  // 1. Obtener datos del niño. En flujo admin, basta con _id.
  const child = await db.collection("children").findOne({
    _id: new ObjectId(childId),
  })

  if (!child) {
    throw new Error("No se encontró información del niño")
  }

  // Owner efectivo para el plan (padre real del niño)
  const effectiveUserId = child.parentId?.toString?.() || userId

  // 2. Obtener eventos desde el último plan de PROGRESIÓN (o desde el basePlan si no se especifica override)
  const eventsFromDate = eventsFromDateOverride ? new Date(eventsFromDateOverride) : new Date(basePlan.createdAt)
  const eventsToDate = new Date()

  logger.info("generateEventBasedPlan: Buscando eventos para plan", {
    childId,
    eventsFromDate: eventsFromDate.toISOString(),
    eventsToDate: eventsToDate.toISOString(),
    basePlanVersion: basePlan.planVersion,
    basePlanCreatedAt: basePlan.createdAt
  })

  let newEvents: any[] = []
  try {
    const eventsCol = db.collection("events")
    newEvents = await eventsCol.find({
      childId: new ObjectId(childId),
      startTime: { $gt: eventsFromDate.toISOString(), $lte: eventsToDate.toISOString() }
    }).sort({ startTime: 1 }).toArray()

    logger.info("generateEventBasedPlan: Eventos encontrados", {
      count: newEvents.length,
      eventDates: newEvents.map((e: any) => e.startTime).slice(0, 5)
    })
  } catch (e) {
    logger.warn("generateEventBasedPlan: Error en query MongoDB, usando fallback", { error: e })
    const allEvents = child.events || []
    newEvents = allEvents.filter((event: any) => {
      if (!event.startTime) return false
      const eventDate = new Date(event.startTime)
      return eventDate > eventsFromDate && eventDate <= eventsToDate
    })

    logger.info("generateEventBasedPlan: Eventos encontrados (fallback)", {
      totalEvents: allEvents.length,
      filteredCount: newEvents.length
    })
  }

  if (newEvents.length === 0) {
    logger.error("generateEventBasedPlan: No hay eventos nuevos", {
      eventsFromDate: eventsFromDate.toISOString(),
      eventsToDate: eventsToDate.toISOString(),
      childId
    })
    throw new Error("No hay eventos nuevos para analizar")
  }

  // 3. Calcular estadísticas de los nuevos eventos
  const stats = processSleepStatistics(newEvents, eventsFromDate)
  
  const birthDate = child.birthDate ? new Date(child.birthDate) : null
  const ageInMonths = birthDate ? Math.floor(differenceInDays(new Date(), birthDate) / 30.44) : null

  // 4. Buscar información relevante en RAG (para mantener metodología fresca)
  const ragContext = await searchRAGForPlan(ageInMonths)
  const policies = derivePlanPolicy({ ageInMonths, events: newEvents })
  
  // Enriquecer estadísticas del período para prompt
  const napStats = computeNapStatsFromEvents(newEvents)
  const bedtimeStats = computeBedtimeAvgFromEvents(newEvents)
  const feedingStats = computeFeedingTypicalTimesFromEvents(newEvents)
  
  // 5. Generar plan con IA basado en progresión de eventos
  const aiPlan = await generatePlanWithAI({
    planType: "event_based",
    childData: {
      ...child,
      ageInMonths,
      stats,
      events: newEvents
    },
    ragContext,
    previousPlan: basePlan,
    policies,
    eventAnalysis: {
      eventsAnalyzed: newEvents.length,
      eventTypes: [...new Set(newEvents.map((e: any) => e.eventType))],
      dateRange: { from: eventsFromDate, to: eventsToDate },
      basePlanVersion: basePlan.planVersion
    },
    enrichedStats: { napStats, bedtimeStats, feedingStats }
  })

  return {
    childId: new ObjectId(childId),
    userId: new ObjectId(effectiveUserId),
    planNumber,
    planVersion,
    planType: "event_based",
    title: `Plan ${planVersion} para ${child.firstName} (Progresión por Eventos)`,
    schedule: aiPlan.schedule,
    objectives: aiPlan.objectives,
    recommendations: aiPlan.recommendations,
    basedOn: "events_stats_rag",
    basedOnPlan: {
      planId: basePlan._id,
      planVersion: basePlan.planVersion
    },
    eventsDateRange: {
      fromDate: eventsFromDate,
      toDate: eventsToDate,
      totalEventsAnalyzed: newEvents.length
    },
    eventAnalysis: {
      eventsAnalyzed: newEvents.length,
      eventTypes: [...new Set(newEvents.map((e: any) => e.eventType))],
      progressFromPrevious: aiPlan.progressAnalysis || "Análisis de progresión basado en eventos recientes",
      ragSources: ragContext.map(r => r.source),
      basePlanVersion: basePlan.planVersion
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: new ObjectId(adminId),
    status: "active"
  }
}

// Función para generar Plan N.1 basado en plan N + transcript (refinamiento)
async function generateTranscriptRefinementPlan(
  userId: string, 
  childId: string, 
  basePlan: any,
  reportId: string, 
  planNumber: number,
  planVersion: string,
  adminId: string
): Promise<ChildPlan> {
  logger.info("Generando plan de refinamiento con transcript", { 
    userId, 
    childId, 
    basePlanVersion: basePlan.planVersion,
    newPlanVersion: planVersion,
    reportId
  })

  const { db } = await connectToDatabase()
  
  // 1. Obtener el reporte de análisis completo
  const consultationReport = await db.collection("consultation_reports").findOne({
    _id: new ObjectId(reportId),
    childId: new ObjectId(childId)
  })

  if (!consultationReport) {
    throw new Error("No se encontró el reporte de análisis")
  }

  // 2. Obtener datos básicos del niño
  const child = await db.collection("children").findOne({
    _id: new ObjectId(childId)
  })

  if (!child) {
    throw new Error("No se encontró información del niño")
  }

  // 3. Extraer cambios específicos de horarios del transcript
  const scheduleChanges = await extractScheduleChangesFromTranscript(
    consultationReport.transcript,
    child.firstName
  )

  // 4. Generar plan refinado basado en transcript
  const aiPlan = await generatePlanWithAI({
    planType: "transcript_refinement",
    childData: child,
    previousPlan: basePlan,
    transcriptAnalysis: {
      analysis: consultationReport.analysis,
      recommendations: consultationReport.recommendations,
      transcript: consultationReport.transcript
    },
    scheduleChanges
  })

  return {
    childId: new ObjectId(childId),
    userId: new ObjectId(userId),
    planNumber,
    planVersion,
    planType: "transcript_refinement",
    title: `Plan ${planVersion} para ${child.firstName} (Refinamiento con Consulta)`,
    schedule: aiPlan.schedule,
    objectives: aiPlan.objectives,
    recommendations: aiPlan.recommendations,
    basedOn: "transcript_refinement",
    basedOnPlan: {
      planId: basePlan._id,
      planVersion: basePlan.planVersion
    },
    transcriptAnalysis: {
      reportId: new ObjectId(reportId),
      improvements: aiPlan.improvements || [],
      adjustments: aiPlan.adjustments || [],
      basePlanVersion: basePlan.planVersion
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: new ObjectId(adminId),
    status: "active"
  }
}

// FUNCIÓN LEGACY - mantenida para compatibilidad (NO SE USA EN NUEVO FLUJO)
async function generateTranscriptBasedPlan(
  userId: string, 
  childId: string, 
  reportId: string, 
  planNumber: number,
  previousPlanNumber: number,
  adminId: string
): Promise<ChildPlan> {
  logger.info("Generando plan basado en reporte de análisis", { 
    userId, 
    childId, 
    reportId,
    planNumber 
  })

  const { db } = await connectToDatabase()
  
  // 1. Obtener el reporte de análisis completo
  const consultationReport = await db.collection("consultation_reports").findOne({
    _id: new ObjectId(reportId),
    childId: new ObjectId(childId)
  })

  if (!consultationReport) {
    throw new Error("No se encontró el reporte de análisis")
  }

  // 2. Obtener el plan anterior
  const previousPlan = await db.collection("child_plans").findOne({
    childId: new ObjectId(childId),
    userId: new ObjectId(userId),
    planNumber: previousPlanNumber
  })

  if (!previousPlan) {
    throw new Error("No se encontró el plan anterior")
  }

  // 3. Obtener datos básicos del niño
  const child = await db.collection("children").findOne({
    _id: new ObjectId(childId)
  })

  if (!child) {
    throw new Error("No se encontró información del niño")
  }

  // 4. Extraer cambios específicos de horarios del transcript
  const scheduleChanges = await extractScheduleChangesFromTranscript(
    consultationReport.transcript,
    child.firstName
  )

  // 5. Generar nuevo plan enfocado en cambios del análisis
  const aiPlan = await generatePlanWithAI({
    planType: "transcript_based",
    childData: child,
    previousPlan,
    transcriptAnalysis: {
      analysis: consultationReport.analysis,
      recommendations: consultationReport.recommendations,
      transcript: consultationReport.transcript
    },
    scheduleChanges
  })

  // (sin normalización adicional)

  return {
    childId: new ObjectId(childId),
    userId: new ObjectId(userId),
    planNumber,
    planType: "transcript_based",
    title: `Plan ${planNumber} para ${child.firstName} (Actualización)`,
    schedule: aiPlan.schedule,
    objectives: aiPlan.objectives,
    recommendations: aiPlan.recommendations,
    basedOn: "transcript_analysis",
    transcriptAnalysis: {
      reportId: new ObjectId(reportId),
      improvements: aiPlan.improvements || [],
      adjustments: aiPlan.adjustments || [],
      previousPlanNumber
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: new ObjectId(adminId),
    status: "active"
  }
}

// Función para extraer cambios específicos de horarios del transcript analizando toda la conversación
async function extractScheduleChangesFromTranscript(transcript: string, childName: string) {
  const systemPrompt = `Eres un especialista en análisis de transcripts médicos pediátricos.

ANALIZA TODA LA CONVERSACIÓN para extraer horarios ACORDADOS y VIABLES entre médico y padres.

INSTRUCCIONES CRÍTICAS:
1. Analiza la conversación COMPLETA entre padres y médico
2. Extrae los horarios FINALES acordados, no solo recomendaciones iniciales
3. Considera limitaciones prácticas mencionadas por los padres
4. Prioriza ACUERDOS REALISTAS sobre recomendaciones rígidas
5. Si hay negociación, extrae el RESULTADO FINAL

BUSCA Y EXTRAE HORARIOS ACORDADOS PARA:
1. Hora de despertar acordada en la conversación
2. Hora de dormir/acostarse acordada
3. Horarios de comidas VIABLES (desayuno, almuerzo, merienda, cena)
4. Horarios de siestas realistas
5. Límites de tiempo de pantalla factibles
6. Cualquier otro horario acordado

EJEMPLO DE ANÁLISIS CORRECTO:
- Doctor dice "desayuno a las 8:15 AM" y padres no objetan → extraer "08:15"
- Doctor dice "8:15 AM" pero padre dice "imposible" → buscar el compromiso acordado
- Si no hay horario específico acordado → devolver null

Si NO se acuerda un horario específico en la conversación, devuelve null para ese campo.

FORMATO DE RESPUESTA OBLIGATORIO (JSON únicamente):
{
  "wakeTime": "07:00" o null,
  "bedtime": "20:00" o null,
  "breakfast": "08:15" o null,
  "lunch": "12:00" o null,
  "snack": "16:00" o null,
  "dinner": "19:30" o null,
  "napTime": "14:00" o null,
  "napDuration": 90 o null,
  "screenTimeLimit": 90 o null,
  "screenTimeCutoff": "18:30" o null,
  "otherChanges": ["cualquier otro cambio de horario acordado en la conversación"]
}`

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Analiza TODA la conversación del siguiente transcript para ${childName} y extrae los horarios FINALES acordados entre médico y padres (no solo recomendaciones iniciales):

${transcript}

Enfócate en los ACUERDOS REALISTAS alcanzados en la conversación completa.`,
        },
      ],
      max_tokens: 1000,
      temperature: 0.3, // Temperatura baja para mayor precisión
    })

    const responseContent = completion.choices[0]?.message?.content || ""
    
    try {
      return JSON.parse(responseContent)
    } catch (parseError) {
      logger.error("Error parseando extracción de horarios:", parseError)
      return null
    }
  } catch (error) {
    logger.error("Error en extracción de horarios:", error)
    return null
  }
}

// Función para análisis ligero del transcript (solo para planes actualizados)
async function analyzeLightTranscript(transcript: string, childName: string) {
  const systemPrompt = `Eres la Dra. Mariana, especialista en pediatría y desarrollo infantil.

Analiza ÚNICAMENTE este transcript de consulta para identificar:
1. Problemas o preocupaciones mencionados
2. Cambios necesarios en rutinas o horarios
3. Recomendaciones específicas para ajustar el plan actual

NO necesitas hacer análisis completo, solo enfócate en lo que CAMBIÓ o necesita AJUSTARSE según la consulta.

FORMATO DE RESPUESTA OBLIGATORIO (JSON únicamente):
{
  "analysis": "Breve análisis de los puntos clave del transcript enfocado en cambios necesarios",
  "recommendations": "Recomendaciones específicas para ajustar el plan actual basadas solo en esta consulta"
}`

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Transcript de consulta para ${childName}:\n\n${transcript}`,
        },
      ],
      max_tokens: 800,
      temperature: 0.7,
    })

    const responseContent = completion.choices[0]?.message?.content || ""
    
    try {
      return JSON.parse(responseContent)
    } catch (parseError) {
      logger.error("Error parseando análisis ligero:", parseError)
      return {
        analysis: responseContent,
        recommendations: "Ver análisis para recomendaciones específicas."
      }
    }
  } catch (error) {
    logger.error("Error en análisis ligero de transcript:", error)
    throw new Error("Error al procesar el análisis del transcript")
  }
}

// Función para buscar información relevante en RAG para planes
async function searchRAGForPlan(ageInMonths: number | null) {
  try {
    const vectorStore = getMongoDBVectorStoreManager()
    
    const searchQueries = [
      `rutina de sueño para niños de ${ageInMonths} meses`,
      "horarios de comida infantil",
      "siestas apropiadas por edad",
      "rutinas de acostarse"
    ]

    let allResults: any[] = []
    
    for (const query of searchQueries) {
      const results = await vectorStore.searchSimilar(query, 2)
      allResults = [...allResults, ...results]
    }

    const uniqueResults = allResults.filter((item, index, arr) => 
      index === arr.findIndex(t => t.metadata?.source === item.metadata?.source)
    ).slice(0, 6)

    return uniqueResults.map(doc => ({
      source: doc.metadata?.source || "documento",
      content: doc.pageContent,
    }))
  } catch (error) {
    logger.error("Error en búsqueda RAG para plan:", error)
    return []
  }
}

// Función principal para generar plan con IA
async function generatePlanWithAI({
  planType,
  childData,
  ragContext,
  surveyData,
  previousPlan,
  transcriptAnalysis,
  scheduleChanges,
  eventAnalysis,
  enrichedStats
}: {
  planType: "initial" | "event_based" | "transcript_refinement"
  childData: any
  ragContext?: any[]
  surveyData?: any
  previousPlan?: any
  transcriptAnalysis?: any
  scheduleChanges?: any
  eventAnalysis?: any
  enrichedStats?: any
}) {
  let systemPrompt = ""

  if (planType === "initial") {
    systemPrompt = `Eres la Dra. Mariana, especialista en pediatría y desarrollo infantil. 

CRÍTICO: Tu respuesta DEBE ser únicamente un objeto JSON válido, sin texto adicional.

Genera un PLAN DETALLADO Y ESTRUCTURADO para ${childData.firstName} (${childData.ageInMonths} meses).

INFORMACIÓN DEL NIÑO:
- Edad: ${childData.ageInMonths} meses
- Eventos de sueño registrados: ${childData.events?.length || 0}
- Sueño nocturno (promedio): ${childData.stats?.avgSleepDurationMinutes || 0} minutos
- Hora promedio de despertar: ${Math.floor((childData.stats?.avgWakeTimeMinutes || 0) / 60)}:${((childData.stats?.avgWakeTimeMinutes || 0) % 60).toString().padStart(2, "0")}
${enrichedStats ? `- Hora media de acostarse observada: ${enrichedStats?.bedtimeStats?.avgBedtime || 'N/A'}
- Siestas: total=${enrichedStats?.napStats?.count || 0}, hora típica=${enrichedStats?.napStats?.typicalTime || 'N/A'}, duración prom=${enrichedStats?.napStats?.avgDuration || 0} min
- Comidas típicas (si existen eventos): desayuno=${enrichedStats?.feedingStats?.breakfast || 'N/A'} (n=${enrichedStats?.feedingStats?.breakfastCount || 0}), almuerzo=${enrichedStats?.feedingStats?.lunch || 'N/A'} (n=${enrichedStats?.feedingStats?.lunchCount || 0}), merienda=${enrichedStats?.feedingStats?.snack || 'N/A'} (n=${enrichedStats?.feedingStats?.snackCount || 0}), cena=${enrichedStats?.feedingStats?.dinner || 'N/A'} (n=${enrichedStats?.feedingStats?.dinnerCount || 0})` : ''}

${surveyData ? `
DATOS DEL CUESTIONARIO:
- Rutina antes de acostarse: ${surveyData.rutinaHabitos?.rutinaAntesAcostarse}
- Hora específica de dormir: ${surveyData.rutinaHabitos?.horaDormir}
- Hace siestas: ${surveyData.rutinaHabitos?.haceSiestas ? 'Sí' : 'No'}
- Donde duerme: ${surveyData.rutinaHabitos?.dondeDuermeNoche}
` : ''}

${ragContext ? `
CONOCIMIENTO ESPECIALIZADO:
${ragContext.map(doc => `Fuente: ${doc.source}\nContenido: ${doc.content}`).join("\n\n---\n\n")}
` : ''}

INSTRUCCIONES:
1. Crea un plan DETALLADO con horarios específicos
2. Incluye horarios para: dormir, despertar, comidas y siestas (NO incluir actividades)
3. Adapta las recomendaciones a la edad del niño
4. Proporciona objetivos claros y medibles
5. Incluye recomendaciones específicas para los padres
6. Si hubo siestas registradas en el histórico, DEBES incluir al menos 1 siesta en un horario cercano a la hora típica observada (${enrichedStats?.napStats?.typicalTime || '14:00'}) y duración aproximada (${Math.max(60, Math.min(120, enrichedStats?.napStats?.avgDuration || 90))} min)
7. Para comidas, si no hubo eventos en una categoría (n=0), no inventes el horario; puedes omitirla o marcarla como opcional

FORMATO DE RESPUESTA OBLIGATORIO (JSON únicamente):
{
  "schedule": {
    "bedtime": "20:00",
    "wakeTime": "07:00",
    "meals": [
      {"time": "07:30", "type": "desayuno", "description": "Descripción del desayuno"},
      {"time": "12:00", "type": "almuerzo", "description": "Descripción del almuerzo"},
      {"time": "16:00", "type": "merienda", "description": "Descripción de la merienda"},
      {"time": "19:00", "type": "cena", "description": "Descripción de la cena"}
    ],
    "activities": [],
    "naps": [
      {"time": "14:00", "duration": 60, "description": "Siesta de la tarde"}
    ]
  },
  "objectives": [
    "Objetivo 1 específico y medible",
    "Objetivo 2 específico y medible"
  ],
  "recommendations": [
    "Recomendación 1 específica",
    "Recomendación 2 específica"
  ]
}`
  } else if (planType === "event_based") {
    systemPrompt = `Eres la Dra. Mariana, especialista en pediatría y desarrollo infantil.

CRÍTICO: Tu respuesta DEBE ser únicamente un objeto JSON válido, sin texto adicional.

GENERA PLAN DE PROGRESIÓN basado en EVENTOS REALES registrados para ${childData.firstName}.

PLAN ANTERIOR (COMO BASE):
${JSON.stringify(previousPlan?.schedule, null, 2)}

ANÁLISIS DE EVENTOS RECIENTES (${eventAnalysis?.eventsAnalyzed || 0} eventos):
- Tipos de eventos: ${eventAnalysis?.eventTypes?.join(", ") || "No especificado"}
- Período analizado: ${eventAnalysis?.dateRange?.from || "No especificado"} a ${eventAnalysis?.dateRange?.to || "No especificado"}
- Sueño nocturno (promedio): ${childData.stats?.avgSleepDurationMinutes || 0} minutos
- Hora promedio de despertar: ${Math.floor((childData.stats?.avgWakeTimeMinutes || 0) / 60)}:${((childData.stats?.avgWakeTimeMinutes || 0) % 60).toString().padStart(2, "0")}
${enrichedStats ? `- Siestas (período): total=${enrichedStats?.napStats?.count || 0}, hora típica=${enrichedStats?.napStats?.typicalTime || 'N/A'}, duración prom=${enrichedStats?.napStats?.avgDuration || 0} min
- Hora media de acostarse (período): ${enrichedStats?.bedtimeStats?.avgBedtime || 'N/A'}
- Comidas típicas (período): desayuno=${enrichedStats?.feedingStats?.breakfast || 'N/A'} (n=${enrichedStats?.feedingStats?.breakfastCount || 0}), almuerzo=${enrichedStats?.feedingStats?.lunch || 'N/A'} (n=${enrichedStats?.feedingStats?.lunchCount || 0}), merienda=${enrichedStats?.feedingStats?.snack || 'N/A'} (n=${enrichedStats?.feedingStats?.snackCount || 0}), cena=${enrichedStats?.feedingStats?.dinner || 'N/A'} (n=${enrichedStats?.feedingStats?.dinnerCount || 0})` : ''}

${ragContext ? `
CONOCIMIENTO ESPECIALIZADO ACTUALIZADO:
${ragContext.map(doc => `Fuente: ${doc.source}\nContenido: ${doc.content}`).join("\n\n---\n\n")}
` : ''}

INSTRUCCIONES PARA PROGRESIÓN:
1. 🎯 PRIORIDAD: Utiliza el PLAN ANTERIOR como base sólida
2. 📊 AJUSTA según los PATRONES REALES observados en los eventos
3. ✨ EVOLUCIONA el plan manteniendo coherencia con el anterior
4. 📈 IDENTIFICA mejoras basadas en el comportamiento real del niño
5. 🔧 OPTIMIZA horarios según los datos reales registrados
6. Si el período contiene siestas (conteo>0), DEBES incluir al menos 1 siesta con hora cercana a ${enrichedStats?.napStats?.typicalTime || '14:00'} y duración ~${Math.max(60, Math.min(120, enrichedStats?.napStats?.avgDuration || 90))} min
7. Para comidas, no inventes categorías sin eventos; puedes omitirlas o marcarlas como opcionales

FORMATO DE RESPUESTA OBLIGATORIO (JSON únicamente):
{
  "schedule": {
    "bedtime": "20:00",
    "wakeTime": "07:00", 
    "meals": [...],
    "activities": [],
    "naps": [...]
  },
  "objectives": [
    "Objetivo basado en progresión real observada"
  ],
  "recommendations": [
    "Recomendación basada en patrones de eventos reales"
  ],
  "progressAnalysis": "Análisis de cómo el niño ha progresado desde el plan anterior"
}`
  } else if (planType === "transcript_refinement") {
    systemPrompt = `Eres la Dra. Mariana, especialista en pediatría y desarrollo infantil.

CRÍTICO: Tu respuesta DEBE ser únicamente un objeto JSON válido, sin texto adicional.

REFINA EL PLAN EXISTENTE para ${childData.firstName} basándote en la consulta médica más reciente.

PLAN BASE (A REFINAR):
${JSON.stringify(previousPlan?.schedule, null, 2)}

ANÁLISIS DE LA CONSULTA MÉDICA:
Análisis: ${transcriptAnalysis?.analysis || "No disponible"}
Recomendaciones: ${transcriptAnalysis?.recommendations || "No disponible"}

${scheduleChanges ? `
CAMBIOS ESPECÍFICOS DE HORARIOS EXTRAÍDOS DEL TRANSCRIPT:
${JSON.stringify(scheduleChanges, null, 2)}

⚠️ IMPORTANTE: Estos horarios específicos tienen PRIORIDAD sobre el plan anterior. Si se especifica un horario aquí, ÚSALO en lugar del horario del plan anterior.
` : ''}

TRANSCRIPT DE LA CONSULTA (COMPLETO):
${transcriptAnalysis?.transcript || "No disponible"}

INSTRUCCIONES PARA REFINAMIENTO:
1. 🎯 PRIORIDAD MÁXIMA: Aplica todos los cambios específicos de horarios extraídos del transcript
2. Si hay conflicto entre plan base y horarios extraídos, USA LOS HORARIOS EXTRAÍDOS
3. Mantén la coherencia general del plan base, pero aplica refinamientos específicos
4. Enfócate en los problemas identificados y cambios solicitados en la consulta
5. Conserva elementos que funcionan del plan base

FORMATO DE RESPUESTA OBLIGATORIO (JSON únicamente):
{
  "schedule": {
    "bedtime": "20:00",
    "wakeTime": "07:00",
    "meals": [
      {
        "time": "07:30",
        "type": "desayuno",
        "description": "Descripción del desayuno"
      }
    ],
    "activities": [
      {
        "time": "08:00",
        "activity": "jugar",
        "duration": 60,
        "description": "Descripción de la actividad"
      }
    ],
    "naps": [
      {
        "time": "14:00",
        "duration": 90,
        "description": "Siesta vespertina"
      }
    ]
  },
  "objectives": [
    "Objetivo refinado basado en la consulta médica"
  ],
  "recommendations": [
    "Recomendación específica basada en el análisis de la consulta"
  ],
  "improvements": [
    "Mejora identificada en la consulta"
  ],
  "adjustments": [
    "Ajuste realizado al plan base"
  ]
}`
  } else {
    // Fallback para compatibilidad (no debería llegar aquí en el nuevo flujo)
    systemPrompt = `Eres la Dra. Mariana, especialista en pediatría y desarrollo infantil.

ACTUALIZA EL PLAN EXISTENTE para ${childData.firstName} basándote en el análisis proporcionado.

PLAN ANTERIOR:
${JSON.stringify(previousPlan.schedule, null, 2)}

ANÁLISIS DE LA ÚLTIMA SESIÓN:
Análisis: ${transcriptAnalysis.analysis}
Recomendaciones: ${transcriptAnalysis.recommendations}

${scheduleChanges ? `
CAMBIOS ESPECÍFICOS DE HORARIOS EXTRAÍDOS DEL TRANSCRIPT:
${JSON.stringify(scheduleChanges, null, 2)}

⚠️ IMPORTANTE: Estos horarios específicos tienen PRIORIDAD sobre el plan anterior. Si se especifica un horario aquí, ÚSALO en lugar del horario del plan anterior.
` : ''}

TRANSCRIPT DE LA SESIÓN (COMPLETO):
${transcriptAnalysis.transcript}

INSTRUCCIONES:
1. 🎯 PRIORIDAD MÁXIMA: Aplica todos los cambios específicos de horarios extraídos del transcript
2. Si hay conflicto entre plan anterior y horarios extraídos, USA LOS HORARIOS EXTRAÍDOS
3. Revisa el plan anterior como base, pero actualiza con los cambios específicos
4. Mantén la estructura general pero aplica mejoras específicas de la sesión
5. Enfócate en los problemas identificados y cambios solicitados en la consulta
6. Si un horario no está en los cambios extraídos, mantén el del plan anterior

FORMATO DE RESPUESTA OBLIGATORIO (JSON únicamente):
{
  "schedule": {
    "bedtime": "20:00",
    "wakeTime": "07:00",
    "meals": [...],
    "activities": [],
    "naps": [...]
  },
  "objectives": [
    "Objetivo actualizado basado en la sesión"
  ],
  "recommendations": [
    "Recomendación específica basada en el análisis"
  ],
  "improvements": [
    "Mejora identificada en la sesión"
  ],
  "adjustments": [
    "Ajuste realizado al plan anterior"
  ]
}`
  }

  try {
    // Inyectar políticas de ajuste como mensaje de sistema adicional (seguro si falla)
    let policyText = ""
    try {
      const ageM = typeof childData?.ageInMonths === 'number' ? childData.ageInMonths : (childData?.birthDate ? Math.floor(differenceInDays(new Date(), new Date(childData.birthDate)) / 30.44) : null)
      const p = derivePlanPolicy({ ageInMonths: ageM, events: childData?.events || [] })
      const napLine = p.napTransition.isTransitionWindow
        ? `Transición 2→1 siestas (15–18 meses): cambios de ${Math.max(10, Math.min(15, p.napTransition.recommendedStepMinutes))} min cada 3–4 días.`
        : `Ajustes generales: puedes mover bloques de ${p.napTransition.recommendedStepMinutes} min si el niño lo tolera.`
      const nightLine = p.nightWeaning.isActive
        ? `Destete nocturno activo: mover toma ${p.nightWeaning.shiftEarlierMinutesPerStep} min más temprano y aumentar ~${p.nightWeaning.increaseBottleOzPerStep} oz cada ${p.nightWeaning.stepEveryDays} días.`
        : `Si no hay tomas nocturnas recientes, no incluir destete.`
      policyText = `POLÍTICAS Y LÍMITES DE AJUSTE (OBLIGATORIO RESPETAR):\n- ${napLine}\n- ${nightLine}`
    } catch (_) {}
    const __messages: any[] = [
      { role: "system", content: systemPrompt }
    ]
    if (policyText) {
      __messages.push({ role: "system", content: policyText })
    }
    __messages.push({ role: "user", content: `Genera el plan detallado siguiendo exactamente el formato JSON especificado.` })
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: __messages,
      max_tokens: 2000,
      temperature: 0.7,
    })

    let responseContent = completion.choices[0]?.message?.content || ""
    
    // Limpiar la respuesta para asegurar JSON válido
    responseContent = responseContent.trim()
    
    // Si la respuesta no empieza con {, intentar extraer el JSON
    if (!responseContent.startsWith('{')) {
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        responseContent = jsonMatch[0]
      }
    }
    
    try {
      return JSON.parse(responseContent)
    } catch (parseError) {
      logger.error("Error parseando respuesta de IA:", {
        parseError: parseError.message,
        responseContent: responseContent.substring(0, 500) + "...",
        fullLength: responseContent.length
      })
      
      // Intentar generar un plan básico como fallback
      logger.warn("Generando plan fallback debido a error de parsing")
      return {
        schedule: {
          bedtime: "20:30",
          wakeTime: "07:00",
          meals: [
            { time: "07:30", type: "desayuno", description: "Desayuno nutritivo" },
            { time: "12:00", type: "almuerzo", description: "Almuerzo balanceado" },
            { time: "16:00", type: "merienda", description: "Merienda ligera" },
            { time: "19:00", type: "cena", description: "Cena temprana" }
          ],
          activities: [
            { time: "08:00", activity: "jugar", duration: 60, description: "Tiempo de juego" },
            { time: "17:00", activity: "ejercicio", duration: 30, description: "Actividad física" }
          ],
          naps: [
            { time: "14:00", duration: 90, description: "Siesta vespertina" }
          ]
        },
        objectives: ["Establecer rutina de sueño consistente", "Mejorar calidad del descanso"],
        recommendations: ["Mantener horarios fijos", "Crear ambiente propicio para dormir"],
        improvements: ["Plan refinado basado en consulta médica"],
        adjustments: ["Horarios ajustados según recomendaciones"]
      }
    }
  } catch (error) {
    logger.error("Error generando plan con IA:", error)
    // Fallback robusto cuando la IA o la red fallan: devolver un plan básico válido
    logger.warn("Generando plan fallback debido a error en IA/red")
    return {
      schedule: {
        bedtime: "20:30",
        wakeTime: "07:00",
        meals: [
          { time: "07:30", type: "desayuno", description: "Desayuno nutritivo" },
          { time: "12:00", type: "almuerzo", description: "Almuerzo balanceado" },
          { time: "16:00", type: "merienda", description: "Merienda ligera" },
          { time: "19:00", type: "cena", description: "Cena temprana" }
        ],
        activities: [
          { time: "18:30", activity: "rutina", duration: 30, description: "Rutina relajante antes de dormir" }
        ],
        naps: [
          { time: "14:00", duration: 90, description: "Siesta vespertina" }
        ]
      },
      objectives: [
        "Establecer rutina de sueño consistente",
        "Mejorar calidad del descanso"
      ],
      recommendations: [
        "Mantener horarios fijos",
        "Ambiente oscuro y tranquilo por la noche"
      ],
      improvements: ["Plan generado con fallback por indisponibilidad de IA"],
      adjustments: ["Ajustes estándar basados en edad"]
    }
  }
}
