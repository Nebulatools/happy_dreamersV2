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
import * as Sentry from "@sentry/nextjs"
import * as fs from "fs"
import * as path from "path"

const logger = createLogger("API:consultas:plans:route")

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// ================================
// CONFIGURACIÓN DE FUENTE RAG
// ================================
// Para cambiar entre RAG_SUMMARY.md (archivo estático) y RAG vectorial (MongoDB):
// - 'summary': Usa docs/RAG_SUMMARY.md (recomendado para garantizar horarios ideales)
// - 'vector': Usa MongoDB vector search (escalable pero requiere queries precisas)
const RAG_SOURCE: "summary" | "vector" = "summary"

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
      planVersion: nextNumber.toString(), 
    }
  }
  
  if (planType === "transcript_refinement") {
    // Para refinamientos: requiere al menos un plan base (incluye Plan 0)
    if (!latestPlan) {
      throw new Error("No se puede crear un plan de refinamiento sin un plan base")
    }
    
    const basePlanNumber = latestPlan.planNumber
    const refinementVersion = `${basePlanNumber}.1`
    
    return {
      planNumber: basePlanNumber, // Mismo número que el plan base
      planVersion: refinementVersion,
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
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
}

function computeNapStatsFromEvents(events: any[]) {
  const naps = (events || []).filter(e => e?.eventType === "nap" && e?.startTime && e?.endTime)
  if (!naps.length) return { count: 0, avgDuration: 0, typicalTime: null as string | null }
  const starts = naps.map((e: any) => new Date(e.startTime))
  const durations = naps.map((e: any) => __minutesBetween(new Date(e.startTime), new Date(e.endTime)))
  const avgDur = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
  const typicalMin = __avgMinutesFromDates(starts, false)
  return { count: naps.length, avgDuration: avgDur, typicalTime: __minutesToHHMM(typicalMin) }
}

function computeBedtimeAvgFromEvents(events: any[]) {
  const sleeps = (events || []).filter(e => e?.eventType === "sleep" && e?.startTime)
  if (!sleeps.length) return { avgBedtime: null as string | null }
  const starts = sleeps.map((e: any) => new Date(e.startTime))
  const typicalMin = __avgMinutesFromDates(starts, true)
  return { avgBedtime: __minutesToHHMM(typicalMin) }
}

function computeFeedingTypicalTimesFromEvents(events: any[]) {
  const fed = (events || []).filter(e => e?.eventType === "feeding" && e?.startTime)
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
    result[key + "Count"] = arr.length
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

    // Convertir afterDate a ISO string para comparación consistente
    const afterDateISO = afterDate.toISOString()
    const nowISO = now.toISOString()

    logger.info("hasEventsAfterDate: Buscando eventos", {
      childId,
      afterDate: afterDateISO,
      now: nowISO,
    })

    // Preferir colección canónica 'events'
    const eventsCol = db.collection("events")

    // CORRECCIÓN: Todos los eventos fueron migrados a childId como ObjectId
    // Por eso debemos buscar usando ObjectId
    const events = await eventsCol.find({
      childId: new ObjectId(childId),  // ✅ Usar ObjectId después de la migración
      startTime: {
        $gt: afterDateISO,  // Mayor que (no igual) la fecha del plan
        $lte: nowISO,         // Menor o igual a ahora
      },
    }, { projection: { eventType: 1, startTime: 1, _id: 1 } as any }).toArray()

    logger.info("hasEventsAfterDate: Eventos encontrados", {
      count: events.length,
      eventDates: events.map((e: any) => e.startTime).slice(0, 5),
      firstEventDate: events.length > 0 ? events[0].startTime : null,
      afterDateForComparison: afterDateISO,
      allEventDetails: events.map((e: any) => ({
        id: e._id?.toString(),
        type: e.eventType,
        startTime: e.startTime,
      })),
    })

    const eventTypes = [...new Set(events.map((e: any) => e.eventType).filter(Boolean))]

    // Añadir detalles de eventos para debug
    const eventDetails = events.map((e: any) => ({
      _id: e._id?.toString() || "sin-id",
      eventType: e.eventType || "desconocido",
      startTime: e.startTime,
      formattedDate: e.startTime ? new Date(e.startTime).toLocaleString("es-ES", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }) : "sin-fecha",
    }))

    return {
      hasEvents: events.length > 0,
      eventCount: events.length,
      eventTypes,
      eventDetails,
    }
  } catch (error) {
    logger.error("Error verificando eventos después de fecha:", error)
    Sentry.captureException(error)
    return { hasEvents: false, eventCount: 0, eventTypes: [], eventDetails: [] }
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
      latestReportId: latestReport?._id?.toString(),
    }
  } catch (error) {
    logger.error("Error verificando transcript disponible:", error)
    Sentry.captureException(error)
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
        error: "Faltan parámetros requeridos: childId, userId", 
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
      isParent,
    })

    const { db } = await connectToDatabase()
    
    // Obtener todos los planes del niño ordenados por planNumber
    const plans = await db.collection("child_plans")
      .find({ 
        childId: new ObjectId(childId),
        userId: new ObjectId(userId),
      })
      .sort({ planNumber: 1 })
      .toArray()

    logger.info("Planes obtenidos", {
      childId,
      totalPlanes: plans.length,
      planNumbers: plans.map(p => p.planNumber),
    })

    return NextResponse.json({
      success: true,
      plans,
      totalCount: plans.length,
    })

  } catch (error) {
    logger.error("Error obteniendo planes:", error)
    Sentry.captureException(error)
    return NextResponse.json({
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : "Error desconocido",
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
        error: "Faltan parámetros requeridos: userId, childId, planType", 
      }, { status: 400 })
    }

    // Validar tipos de plan permitidos
    const validPlanTypes = ["initial", "event_based", "transcript_refinement"]
    if (!validPlanTypes.includes(planType)) {
      return NextResponse.json({ 
        error: `Tipo de plan no válido. Tipos permitidos: ${validPlanTypes.join(", ")}`, 
      }, { status: 400 })
    }

    if (planType === "transcript_refinement" && !reportId) {
      return NextResponse.json({ 
        error: "Para planes de refinamiento con transcript se requiere el reportId del análisis", 
      }, { status: 400 })
    }

    logger.info("Iniciando generación de plan", {
      userId,
      childId,
      planType,
      reportId,
      adminId: session.user.id,
    })

    const { db } = await connectToDatabase()

    // Verificar planes existentes
    const existingPlans = await db.collection("child_plans")
      .find({ 
        childId: new ObjectId(childId),
        userId: new ObjectId(userId),
      })
      .sort({ planNumber: -1 })
      .toArray()

    // Calcular la siguiente versión de plan
    const { planNumber, planVersion } = calculateNextPlanVersion(existingPlans, planType)

    // VALIDACIONES ESPECÍFICAS POR TIPO DE PLAN
    if (planType === "initial" && existingPlans.length > 0) {
      return NextResponse.json({ 
        error: "Ya existe un plan inicial para este niño", 
      }, { status: 400 })
    }

    if (planType === "event_based" && existingPlans.length === 0) {
      return NextResponse.json({ 
        error: "Debe existir un plan inicial antes de crear planes basados en eventos", 
      }, { status: 400 })
    }

    if (planType === "transcript_refinement" && existingPlans.length === 0) {
      return NextResponse.json({ 
        error: "Debe existir al menos un plan base antes de crear un refinamiento", 
      }, { status: 400 })
    }

    // Validar que hay eventos disponibles para planes basados en eventos
    if (planType === "event_based") {
      const latestByCreatedAt = [...existingPlans].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
      const eventsCheck = await hasEventsAfterDate(childId, new Date(latestByCreatedAt.createdAt))
      
      if (!eventsCheck.hasEvents) {
        return NextResponse.json({ 
          error: "No hay eventos registrados después del último plan para generar uno nuevo", 
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
          error: "No hay transcript de consulta nuevo disponible para generar un refinamiento", 
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

    // NO marcar planes anteriores como superseded cuando se crea un borrador
    // Los planes solo se marcan como superseded cuando el nuevo plan se ACTIVA (mediante endpoint PATCH)
    // Esto permite que el usuario siga viendo su plan activo mientras el admin prepara el borrador

    // Guardar el nuevo plan como BORRADOR
    const result = await db.collection("child_plans").insertOne({
      ...generatedPlan,
      planNumber,
      planVersion,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: "borrador",
    })

    const totalProcessingTime = Date.now() - startTime

    logger.info("Plan generado exitosamente", {
      planId: result.insertedId,
      planNumber,
      planVersion,
      planType,
      childId,
      processingTime: totalProcessingTime,
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
        status: "borrador",
      },
      metadata: {
        processingTime: totalProcessingTime,
        planNumber,
        planVersion,
        totalPlans: existingPlans.length + 1,
      },
    })

  } catch (error) {
    const totalProcessingTime = Date.now() - startTime
    logger.error("Error generando plan", {
      error: error instanceof Error ? error.message : "Error desconocido",
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: totalProcessingTime,
    })
    Sentry.captureException(error)

    return NextResponse.json({
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : "Error desconocido",
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
        error: "Faltan parámetros requeridos: userId, childId, planType", 
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
        userId: new ObjectId(userId),
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
          lastPlanCreatedAt: latestByCreatedAt.createdAt,
          lastPlanCreatedAtISO: new Date(latestByCreatedAt.createdAt).toISOString(),
          allPlansVersions: existingPlans.map((p: any) => ({
            version: p.planVersion,
            createdAt: p.createdAt,
            createdAtISO: new Date(p.createdAt).toISOString(),
          })),
        })

        const eventsCheck = await hasEventsAfterDate(childId, new Date(latestByCreatedAt.createdAt))

        logger.info("PUT Validación: Resultado de verificación de eventos", {
          hasEvents: eventsCheck.hasEvents,
          eventCount: eventsCheck.eventCount,
          eventTypes: eventsCheck.eventTypes,
          searchedAfterDate: new Date(latestByCreatedAt.createdAt).toISOString(),
          eventDetails: eventsCheck.eventDetails || [],
        })

        console.log("🔍 DEBUG PUT - Eventos encontrados después del plan:", {
          planCreatedAt: new Date(latestByCreatedAt.createdAt).toLocaleString("es-ES"),
          planCreatedAtISO: new Date(latestByCreatedAt.createdAt).toISOString(),
          eventCount: eventsCheck.eventCount,
          eventos: (eventsCheck.eventDetails || []).map((e: any) => ({
            tipo: e.eventType,
            hora: e.startTime,
            horaFormateada: e.formattedDate,
          })),
        })

        canGenerate = eventsCheck.hasEvents
        reason = canGenerate
          ? `${eventsCheck.eventCount} eventos disponibles desde el último plan`
          : "No hay eventos registrados después del último plan"

        additionalInfo = {
          eventsAvailable: eventsCheck.eventCount,
          eventTypes: eventsCheck.eventTypes,
          eventDetails: eventsCheck.eventDetails || [],
          lastPlanDate: latestByCreatedAt.createdAt,
          lastPlanVersion: latestByCreatedAt.planVersion,
          searchedAfterDateISO: new Date(latestByCreatedAt.createdAt).toISOString(),
        }
      }

    } else if (planType === "transcript_refinement") {
      let transcriptCheck: any = null
      if (existingPlans.length === 0) {
        canGenerate = false
        reason = "Debe existir al menos un plan base antes de crear un refinamiento"
      } else {
        // Verificar si ya existe un plan de refinamiento para el plan actual
        const currentPlanNumber = existingPlans[0].planNumber
        const existingRefinement = existingPlans.find(plan => 
          plan.planNumber === currentPlanNumber && plan.planVersion.includes(".1")
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
          latestReportId: transcriptCheck?.latestReportId || null,
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
      additionalInfo,
    })

  } catch (error) {
    logger.error("Error validando posibilidad de generar plan:", error)
    Sentry.captureException(error)
    return NextResponse.json({
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : "Error desconocido",
    }, { status: 500 })
  }
}

// PATCH: Aplicar plan (cambiar de "borrador" a "active" y marcar anteriores como "superseded")
export async function PATCH(req: NextRequest) {
  try {
    // Verificar autenticación y permisos de admin
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { planId, childId, userId } = await req.json()

    if (!planId || !childId || !userId) {
      return NextResponse.json({
        error: "Faltan parámetros requeridos: planId, childId, userId",
      }, { status: 400 })
    }

    logger.info("Aplicando plan (borrador → activo)", {
      planId,
      childId,
      userId,
      adminId: session.user.id,
    })

    const { db } = await connectToDatabase()

    // 1. Obtener el plan que se va a activar
    const planToActivate = await db.collection("child_plans").findOne({
      _id: new ObjectId(planId),
      childId: new ObjectId(childId),
      userId: new ObjectId(userId),
      status: "borrador",
    })

    if (!planToActivate) {
      return NextResponse.json({
        error: "Plan no encontrado o ya está activo",
      }, { status: 404 })
    }

    // 2. Marcar todos los planes anteriores (con planNumber menor) como superseded
    const updatePreviousResult = await db.collection("child_plans").updateMany(
      {
        childId: new ObjectId(childId),
        userId: new ObjectId(userId),
        planNumber: { $lt: planToActivate.planNumber },
        status: { $ne: "superseded" }, // Solo actualizar si no están ya superseded
      },
      {
        $set: {
          status: "superseded",
          updatedAt: new Date(),
        },
      }
    )

    // 3. Activar el plan actual (borrador → active)
    const updateCurrentResult = await db.collection("child_plans").updateOne(
      { _id: new ObjectId(planId) },
      {
        $set: {
          status: "active",
          activatedAt: new Date(),
          activatedBy: new ObjectId(session.user.id),
          updatedAt: new Date(),
        },
      }
    )

    if (updateCurrentResult.modifiedCount === 0) {
      return NextResponse.json({
        error: "No se pudo activar el plan",
      }, { status: 500 })
    }

    logger.info("Plan aplicado exitosamente", {
      planId,
      planNumber: planToActivate.planNumber,
      planVersion: planToActivate.planVersion,
      previousPlansSuperseded: updatePreviousResult.modifiedCount,
      childId,
    })

    return NextResponse.json({
      success: true,
      message: "Plan aplicado exitosamente",
      planId,
      planNumber: planToActivate.planNumber,
      planVersion: planToActivate.planVersion,
      previousPlansSuperseded: updatePreviousResult.modifiedCount,
    })

  } catch (error) {
    logger.error("Error aplicando plan:", error)
    Sentry.captureException(error)
    return NextResponse.json({
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : "Error desconocido",
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
  // CORRECCIÓN: Todos los eventos fueron migrados a childId como ObjectId
  const events = await db.collection("events").find({
    childId: new ObjectId(childId),  // ✅ Usar ObjectId después de la migración
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
      events,
    },
    ragContext,
    surveyData: child.surveyData,
    policies,
    enrichedStats: { napStats, bedtimeStats, feedingStats },
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
      totalEvents: events.length,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: new ObjectId(adminId),
    status: "borrador",
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
    newPlanVersion: planVersion, 
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
    basePlanCreatedAt: basePlan.createdAt,
  })

  let newEvents: any[] = []
  const eventsCol = db.collection("events")
  // CORRECCIÓN: Todos los eventos fueron migrados a childId como ObjectId
  newEvents = await eventsCol.find({
    childId: new ObjectId(childId),  // ✅ Usar ObjectId después de la migración
    startTime: { $gt: eventsFromDate.toISOString(), $lte: eventsToDate.toISOString() },
  }).sort({ startTime: 1 }).toArray()

  logger.info("generateEventBasedPlan: Eventos encontrados", {
    count: newEvents.length,
    eventDates: newEvents.map((e: any) => e.startTime).slice(0, 5),
  })

  if (newEvents.length === 0) {
    logger.error("generateEventBasedPlan: No hay eventos nuevos", {
      eventsFromDate: eventsFromDate.toISOString(),
      eventsToDate: eventsToDate.toISOString(),
      childId,
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
      events: newEvents,
    },
    ragContext,
    previousPlan: basePlan,
    policies,
    eventAnalysis: {
      eventsAnalyzed: newEvents.length,
      eventTypes: [...new Set(newEvents.map((e: any) => e.eventType))],
      dateRange: { from: eventsFromDate, to: eventsToDate },
      basePlanVersion: basePlan.planVersion,
    },
    enrichedStats: { napStats, bedtimeStats, feedingStats },
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
      planVersion: basePlan.planVersion,
    },
    eventsDateRange: {
      fromDate: eventsFromDate,
      toDate: eventsToDate,
      totalEventsAnalyzed: newEvents.length,
    },
    eventAnalysis: {
      eventsAnalyzed: newEvents.length,
      eventTypes: [...new Set(newEvents.map((e: any) => e.eventType))],
      progressFromPrevious: aiPlan.progressAnalysis || "Análisis de progresión basado en eventos recientes",
      ragSources: ragContext.map(r => r.source),
      basePlanVersion: basePlan.planVersion,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: new ObjectId(adminId),
    status: "borrador",
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
    reportId,
  })

  const { db } = await connectToDatabase()
  
  // 1. Obtener el reporte de análisis completo
  const consultationReport = await db.collection("consultation_reports").findOne({
    _id: new ObjectId(reportId),
    childId: new ObjectId(childId),
  })

  if (!consultationReport) {
    throw new Error("No se encontró el reporte de análisis")
  }

  // 2. Obtener datos básicos del niño
  const child = await db.collection("children").findOne({
    _id: new ObjectId(childId),
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
      transcript: consultationReport.transcript,
    },
    scheduleChanges,
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
      planVersion: basePlan.planVersion,
    },
    transcriptAnalysis: {
      reportId: new ObjectId(reportId),
      improvements: aiPlan.improvements || [],
      adjustments: aiPlan.adjustments || [],
      basePlanVersion: basePlan.planVersion,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: new ObjectId(adminId),
    status: "borrador",
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
    planNumber, 
  })

  const { db } = await connectToDatabase()
  
  // 1. Obtener el reporte de análisis completo
  const consultationReport = await db.collection("consultation_reports").findOne({
    _id: new ObjectId(reportId),
    childId: new ObjectId(childId),
  })

  if (!consultationReport) {
    throw new Error("No se encontró el reporte de análisis")
  }

  // 2. Obtener el plan anterior
  const previousPlan = await db.collection("child_plans").findOne({
    childId: new ObjectId(childId),
    userId: new ObjectId(userId),
    planNumber: previousPlanNumber,
  })

  if (!previousPlan) {
    throw new Error("No se encontró el plan anterior")
  }

  // 3. Obtener datos básicos del niño
  const child = await db.collection("children").findOne({
    _id: new ObjectId(childId),
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
      transcript: consultationReport.transcript,
    },
    scheduleChanges,
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
      previousPlanNumber,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: new ObjectId(adminId),
    status: "borrador",
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
- La coach del sueño dice "desayuno a las 8:15 AM" y padres no objetan → extraer "08:15"
- La coach del sueño dice "8:15 AM" pero el padre dice "imposible" → buscar el compromiso acordado
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
      Sentry.captureException(parseError)
      return null
    }
  } catch (error) {
    logger.error("Error en extracción de horarios:", error)
    Sentry.captureException(error)
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
      Sentry.captureException(parseError)
      return {
        analysis: responseContent,
        recommendations: "Ver análisis para recomendaciones específicas.",
      }
    }
  } catch (error) {
    logger.error("Error en análisis ligero de transcript:", error)
    throw new Error("Error al procesar el análisis del transcript")
  }
}

// ================================
// FUNCIONES DE LECTURA DE RAG
// ================================

/**
 * Carga contenido RAG desde el archivo RAG_SUMMARY.md
 * Prioriza Document 4 (HD Horarios de sueño.pdf) que contiene horarios ideales por edad
 */
async function loadRAGFromSummary(ageInMonths: number | null): Promise<Array<{source: string, content: string}>> {
  try {
    // Ruta al archivo RAG_SUMMARY_OPTIMIZED.md
    const ragFilePath = path.join(process.cwd(), "docs", "RAG_SUMMARY_OPTIMIZED.md")

    logger.info(`📚 Leyendo RAG desde archivo: ${ragFilePath}`)

    // Leer el archivo
    const fileContent = fs.readFileSync(ragFilePath, "utf-8")

    const documents: Array<{source: string, content: string}> = []

    const ragData = JSON.parse(fileContent)
    const schedules = Array.isArray(ragData.schedules) ? ragData.schedules : []

    const matchesAgeSpec = (spec: any, months: number | null): boolean => {
      if (months === null || spec === undefined || spec === null) return false
      if (typeof spec === "number") {
        return months === spec
      }
      const specStr = String(spec).trim()
      if (specStr.includes("+")) {
        const base = parseInt(specStr)
        return !isNaN(base) && months >= base
      }
      if (specStr.includes("-")) {
        const [startStr, endStr] = specStr.split("-")
        const start = parseInt(startStr)
        const end = parseInt(endStr)
        if (!isNaN(start) && !isNaN(end)) {
          return months >= start && months <= end
        }
        if (!isNaN(start) && isNaN(end)) {
          return months >= start
        }
      }
      const parsed = parseInt(specStr)
      return !isNaN(parsed) && months === parsed
    }

    const targetSchedule = (() => {
      if (schedules.length === 0) return null
      if (ageInMonths === null) return schedules[0]
      const found = schedules.find((schedule: any) => matchesAgeSpec(schedule.ageMonths, ageInMonths))
      return found || schedules[0]
    })()

    if (targetSchedule) {
      const scheduleLabel = targetSchedule.ageLabel || `${targetSchedule.ageMonths} meses`
      const characteristics = targetSchedule.characteristics || {}
      const target = targetSchedule.targetSchedule || {}
      const tips: string[] = Array.isArray(targetSchedule.tips) ? targetSchedule.tips : []

      const characteristicsText = Object.entries(characteristics)
        .map(([key, value]) => `- ${key.replace(/([A-Z])/g, " $1").replace(/^\w/, ch => ch.toUpperCase())}: ${value}`)
        .join("\n")

      const napsText = Array.isArray(target.naps) && target.naps.length > 0
        ? target.naps.map((nap: any) =>
          `- Siesta ${nap.napNumber}: ${nap.time} (${nap.duration}${nap.optional ? ", opcional" : ""})`
        ).join("\n")
        : target.quietTime
          ? `- Tiempo tranquilo (sin siesta): ${target.quietTime}`
          : ""

      const tipsText = tips.length > 0
        ? `\nRecomendaciones prácticas:\n${tips.map(tip => `- ${tip}`).join("\n")}`
        : ""

      const formattedContent = [
        `HORARIOS OBJETIVO PARA ${scheduleLabel.toUpperCase()}`,
        "",
        characteristicsText ? `Características clave:\n${characteristicsText}` : "",
        "Horarios objetivo:",
        `- Hora de despertar: ${target.wakeTime || "N/D"}`,
        `- Hora de dormir: ${target.bedtime || "N/D"}`,
        target.nightSleepDuration ? `- Duración sueño nocturno: ${target.nightSleepDuration}` : "",
        napsText ? `\nSiestas recomendadas:\n${napsText}` : "",
        target.totalNapTime ? `\nTiempo total de siestas: ${target.totalNapTime}` : "",
        target.awakeWindows
          ? `Ventanas despierto: ${Array.isArray(target.awakeWindows) ? target.awakeWindows.join(" → ") : target.awakeWindows}`
          : "",
        target.nightFeedings ? `Tomas nocturnas esperadas: ${target.nightFeedings}` : "",
        targetSchedule.notes ? `\nNotas específicas: ${targetSchedule.notes}` : "",
        tipsText,
      ].filter(Boolean).join("\n\n")

      documents.push({
        source: `Horarios ideales - ${scheduleLabel}`,
        content: formattedContent.trim(),
      })

      logger.info(`✅ RAG cargado exitosamente para ${scheduleLabel}`)
    } else {
      logger.warn("⚠️ No se encontró un horario objetivo en el RAG")
    }

    if (ragData.generalRules) {
      const rulesEntries = Object.entries(ragData.generalRules)
        .map(([key, value]) => `- ${key.replace(/([A-Z])/g, " $1").replace(/^\w/, ch => ch.toUpperCase())}: ${value}`)
        .join("\n")

      if (rulesEntries) {
        documents.push({
          source: "Reglas generales de ajuste",
          content: `Principios para ajustar horarios:\n${rulesEntries}`,
        })
      }
    }

    if (ragData.sleepCues?.signs) {
      const cuesContent = [
        ragData.sleepCues.description ? `Descripción: ${ragData.sleepCues.description}` : "",
        Array.isArray(ragData.sleepCues.signs) ? `Señales clave:\n${ragData.sleepCues.signs.map((cue: string) => `- ${cue}`).join("\n")}` : "",
        ragData.sleepCues.importance ? `Importancia: ${ragData.sleepCues.importance}` : "",
      ].filter(Boolean).join("\n\n")

      if (cuesContent) {
        documents.push({
          source: "Señales universales de sueño",
          content: cuesContent,
        })
      }
    }

    if (ragData.progressivePlanAdjustment) {
      const planAdjustment = ragData.progressivePlanAdjustment
      const plansDetail = planAdjustment.plans
        ? Object.entries(planAdjustment.plans).map(([planKey, details]: [string, any]) => {
          const items = Object.entries(details)
            .map(([detailKey, detailValue]) => `  - ${detailKey.replace(/([A-Z])/g, " $1").replace(/^\w/, ch => ch.toUpperCase())}: ${detailValue}`)
            .join("\n")
          return `• ${planKey.toUpperCase()}:\n${items}`
        }).join("\n")
        : ""

      const adjustmentContent = [
        planAdjustment.description || "Reglas para ajuste progresivo de horarios",
        "",
        plansDetail ? `Planes:\n${plansDetail}` : "",
        planAdjustment.steps ? `Pasos recomendados: ${planAdjustment.steps}` : "",
        planAdjustment.example
          ? `\nEjemplo:\n- Datos reales: ${planAdjustment.example.realData}\n- Plan 0: ${planAdjustment.example.plan0}\n- Plan 1: ${planAdjustment.example.plan1}\n- Plan 2: ${planAdjustment.example.plan2}`
          : "",
      ].filter(Boolean).join("\n")

      if (adjustmentContent.trim().length > 0) {
        documents.push({
          source: "Ajuste progresivo de planes",
          content: adjustmentContent.trim(),
        })
      }
    }

    logger.info(`📊 Total documentos RAG: ${documents.length}`)
    return documents

  } catch (error) {
    logger.error("❌ Error leyendo RAG_SUMMARY_OPTIMIZED.md:", error)
    Sentry.captureException(error)
    // Retornar array vacío en caso de error (fallback silencioso)
    return []
  }
}

/**
 * Función para buscar información relevante en RAG para planes
 * Usa RAG_SOURCE para determinar si buscar en RAG_SUMMARY.md o en vector search
 */
async function searchRAGForPlan(ageInMonths: number | null) {
  try {
    // ✅ SWITCH: Elegir fuente RAG según configuración
    if (RAG_SOURCE === "summary") {
      logger.info("🗂️  Usando RAG_SUMMARY.md como fuente (Document 4 priorizado)")
      return await loadRAGFromSummary(ageInMonths)
    }

    // 🔍 VECTOR SEARCH: Búsqueda semántica en MongoDB
    logger.info("🔍 Usando búsqueda vectorial como fuente")

    const vectorStore = getMongoDBVectorStoreManager()

    const searchQueries = [
      `horarios ideales para niños de ${ageInMonths} meses`,  // 🎯 PRIORIDAD: encontrar documento 4 (HD Horarios de sueño)
      `rutina de sueño para niños de ${ageInMonths} meses`,
      "horarios de comida infantil",
      "siestas apropiadas por edad",
      "transición de siestas según edad",  // Para capturar info de transiciones
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
    Sentry.captureException(error)
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
  enrichedStats,
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
- Hora promedio de despertar: ${String(Math.floor((childData.stats?.avgWakeTimeMinutes || 0) / 60)).padStart(2, "0")}:${((childData.stats?.avgWakeTimeMinutes || 0) % 60).toString().padStart(2, "0")} (formato 24h)
${enrichedStats ? `- Hora media de acostarse observada: ${enrichedStats?.bedtimeStats?.avgBedtime || "N/A"}
- Siestas: total=${enrichedStats?.napStats?.count || 0}, hora típica=${enrichedStats?.napStats?.typicalTime || "N/A"}, duración prom=${enrichedStats?.napStats?.avgDuration || 0} min
- Comidas típicas (si existen eventos): desayuno=${enrichedStats?.feedingStats?.breakfast || "N/A"} (n=${enrichedStats?.feedingStats?.breakfastCount || 0}), almuerzo=${enrichedStats?.feedingStats?.lunch || "N/A"} (n=${enrichedStats?.feedingStats?.lunchCount || 0}), merienda=${enrichedStats?.feedingStats?.snack || "N/A"} (n=${enrichedStats?.feedingStats?.snackCount || 0}), cena=${enrichedStats?.feedingStats?.dinner || "N/A"} (n=${enrichedStats?.feedingStats?.dinnerCount || 0})` : ""}

${surveyData ? `
DATOS DEL CUESTIONARIO:
- Rutina antes de acostarse: ${surveyData.rutinaHabitos?.rutinaAntesAcostarse}
- Hora específica de dormir: ${surveyData.rutinaHabitos?.horaDormir}
- Hace siestas: ${surveyData.rutinaHabitos?.haceSiestas ? "Sí" : "No"}
- Donde duerme: ${surveyData.rutinaHabitos?.dondeDuermeNoche}
` : ""}

${ragContext ? `
🎯 OBJETIVO IDEAL (hacia donde queremos llegar progresivamente):
El siguiente contenido muestra los HORARIOS IDEALES y MEJORES PRÁCTICAS según la edad del niño.
Este es el OBJETIVO FINAL hacia donde queremos llevar al niño de forma GRADUAL (no de golpe).

${ragContext.map(doc => `Fuente: ${doc.source}\nContenido: ${doc.content}`).join("\n\n---\n\n")}

⚠️ IMPORTANTE: Estos son horarios IDEALES. En el Plan 0, usa los registros actuales como punto de partida
y da el PRIMER PASO suave hacia estos objetivos ideales.
` : ""}

VOCABULARIO DE ALIMENTACION:
- Usa terminos variados segun el momento del dia: "Desayuno", "Almuerzo/Comida", "Merienda/Colacion/Snack", "Cena".
- Para referirte a la ingesta en general, alterna entre "alimento", "ingesta", "comida", "alimentacion". Evita repetir la palabra "comida" mas de 2 veces en el mismo bloque de recomendaciones.
- NO des recomendaciones nutricionales especificas ni nombres de alimentos concretos. NO somos nutriologos. En su lugar, sugiere COMBINACIONES GENERALES de grupos alimenticios adaptadas a la edad (ej: "Proteina + cereal + fruta", "Proteina + verdura + grasa saludable", "Cereal + fruta + lacteo").
- NO usar: "Avena con platano", "Pure de pollo con arroz", "Papilla de verduras" (demasiado especifico).
- NO usar: "Comida balanceada", "Comida nutritiva", "Desayuno nutritivo" (demasiado generico).
- SI usar: "Proteina + cereal + fruta", "Proteina + verdura + grasa", "Lacteo + cereal + fruta" (combinacion de grupos).

INSTRUCCIONES:
1. Crea un plan DETALLADO con horarios específicos
2. Incluye horarios para: dormir, despertar, comidas y siestas (NO incluir actividades)
3. ⚠️ CRÍTICO: TODOS LOS HORARIOS DEBEN ESTAR EN FORMATO 24 HORAS (00:00-23:59)
   - ✅ CORRECTO: "07:00" (7 AM), "13:30" (1:30 PM), "19:00" (7 PM), "20:30" (8:30 PM)
   - ❌ INCORRECTO: "7:00 AM", "1:30 PM", "7 PM", "8:30pm"
   - La hora de despertar (wakeTime) es en la MAÑANA (06:00-09:00), NO en la noche
4. ⚠️ CRÍTICO: NO puede haber DOS EVENTOS DIFERENTES a la MISMA HORA (ej: no puede haber "desayuno a las 08:00" y "jugar a las 08:00")
5. 🕐 USA HORARIOS EN INTERVALOS DE 15 MINUTOS (COMO LO HARÍA UN HUMANO):
   - ⚠️ CRÍTICO: TODOS los horarios DEBEN estar en intervalos de 15 minutos
   - ✅ Minutos PERMITIDOS: :00, :15, :30, :45 únicamente
   - ❌ Minutos PROHIBIDOS: :01, :02, :03, :05, :07, :10, :12, :17, :20, :23, :25, :27, :33, :35, :37, :40, :42, :47, :50, :52, :55, :57
   - ✅ Ejemplos CORRECTOS: 7:00, 7:15, 7:30, 7:45, 8:00, 8:15, 8:30, 8:45, 12:00, 12:15, 14:00, 14:30, 19:00, 19:45, 20:00
   - ❌ Ejemplos INCORRECTOS: 7:05, 7:10, 8:25, 12:10, 14:20, 19:35
   - Si las estadísticas del niño son (por ejemplo) 7:05 AM, redondea a 7:00 AM o 7:15 AM (el más cercano)
   - SIGUE el RAG para determinar los horarios apropiados, pero SIEMPRE en intervalos de 15 minutos
6. 📊 ESTRATEGIA PROGRESIVA (Plan 0):
   - USA los registros actuales (estadísticas del niño) como PUNTO DE PARTIDA
   - Identifica la diferencia entre estadísticas actuales y horarios ideales del RAG
   - Da el PRIMER PASO SUAVE (NO saltar directamente al ideal)
   - Ejemplo: Si el niño se duerme a las 22:00 y el ideal es 20:00, propón 21:00 para Plan 0 (no 20:00)
   - Los planes 1, 2, 3... irán acercándose progresivamente al ideal
7. Adapta las recomendaciones a la edad del niño
8. Proporciona objetivos claros y medibles basados en el PRIMER PASO hacia el ideal
9. Incluye recomendaciones específicas para los padres sobre cómo implementar este primer ajuste
10. Si hubo siestas registradas en el histórico, DEBES incluir al menos 1 siesta en un horario cercano a la hora típica observada (${enrichedStats?.napStats?.typicalTime || "14:00"}) y duración aproximada (${Math.max(60, Math.min(120, enrichedStats?.napStats?.avgDuration || 90))} min)
11. Para comidas, si no hubo eventos en una categoría (n=0), no inventes el horario; puedes omitirla o marcarla como opcional

FORMATO DE RESPUESTA OBLIGATORIO (JSON únicamente):
{
  "schedule": {
    "bedtime": "20:00",
    "wakeTime": "07:00",
    "meals": [
      {"time": "07:30", "type": "desayuno", "description": "Cereal + fruta + lacteo"},
      {"time": "12:00", "type": "almuerzo", "description": "Proteina + verdura + cereal"},
      {"time": "16:00", "type": "merienda", "description": "Fruta + lacteo"},
      {"time": "19:00", "type": "cena", "description": "Proteina + verdura + grasa saludable"}
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
- Hora promedio de despertar: ${String(Math.floor((childData.stats?.avgWakeTimeMinutes || 0) / 60)).padStart(2, "0")}:${((childData.stats?.avgWakeTimeMinutes || 0) % 60).toString().padStart(2, "0")} (formato 24h)
${enrichedStats ? `- Siestas (período): total=${enrichedStats?.napStats?.count || 0}, hora típica=${enrichedStats?.napStats?.typicalTime || "N/A"}, duración prom=${enrichedStats?.napStats?.avgDuration || 0} min
- Hora media de acostarse (período): ${enrichedStats?.bedtimeStats?.avgBedtime || "N/A"}
- Comidas típicas (período): desayuno=${enrichedStats?.feedingStats?.breakfast || "N/A"} (n=${enrichedStats?.feedingStats?.breakfastCount || 0}), almuerzo=${enrichedStats?.feedingStats?.lunch || "N/A"} (n=${enrichedStats?.feedingStats?.lunchCount || 0}), merienda=${enrichedStats?.feedingStats?.snack || "N/A"} (n=${enrichedStats?.feedingStats?.snackCount || 0}), cena=${enrichedStats?.feedingStats?.dinner || "N/A"} (n=${enrichedStats?.feedingStats?.dinnerCount || 0})` : ""}

${ragContext ? `
🎯 OBJETIVO IDEAL (hacia donde continuamos avanzando):
El siguiente contenido muestra los HORARIOS IDEALES y MEJORES PRÁCTICAS según la edad del niño.
Este es el OBJETIVO FINAL hacia donde seguimos avanzando progresivamente desde el plan anterior.

${ragContext.map(doc => `Fuente: ${doc.source}\nContenido: ${doc.content}`).join("\n\n---\n\n")}

⚠️ IMPORTANTE: Usa el plan anterior como base y da el SIGUIENTE PASO progresivo hacia estos horarios ideales.
NO saltes directamente al ideal si el plan anterior está lejos. Avanza gradualmente.
` : ""}

VOCABULARIO DE ALIMENTACION:
- Usa terminos variados segun el momento del dia: "Desayuno", "Almuerzo/Comida", "Merienda/Colacion/Snack", "Cena".
- Para referirte a la ingesta en general, alterna entre "alimento", "ingesta", "comida", "alimentacion". Evita repetir la palabra "comida" mas de 2 veces en el mismo bloque de recomendaciones.
- NO des recomendaciones nutricionales especificas ni nombres de alimentos concretos. NO somos nutriologos. En su lugar, sugiere COMBINACIONES GENERALES de grupos alimenticios adaptadas a la edad (ej: "Proteina + cereal + fruta", "Proteina + verdura + grasa saludable", "Cereal + fruta + lacteo").
- NO usar: "Avena con platano", "Pure de pollo con arroz", "Papilla de verduras" (demasiado especifico).
- NO usar: "Comida balanceada", "Comida nutritiva", "Desayuno nutritivo" (demasiado generico).
- SI usar: "Proteina + cereal + fruta", "Proteina + verdura + grasa", "Lacteo + cereal + fruta" (combinacion de grupos).

INSTRUCCIONES PARA PROGRESIÓN:
1. 🎯 PRIORIDAD: Utiliza el PLAN ANTERIOR como base sólida
2. 📊 AJUSTA según los PATRONES REALES observados en los eventos
3. ⚠️ CRÍTICO: TODOS LOS HORARIOS DEBEN ESTAR EN FORMATO 24 HORAS (00:00-23:59)
   - ✅ CORRECTO: "07:00" (7 AM), "13:30" (1:30 PM), "19:00" (7 PM), "20:30" (8:30 PM)
   - ❌ INCORRECTO: "7:00 AM", "1:30 PM", "7 PM", "8:30pm"
   - La hora de despertar (wakeTime) es en la MAÑANA (06:00-09:00), NO en la noche
4. ⚠️ CRÍTICO: NO puede haber DOS EVENTOS DIFERENTES a la MISMA HORA (ej: no puede haber "almuerzo a las 12:00" y "siesta a las 12:00")
5. 🕐 USA HORARIOS EN INTERVALOS DE 15 MINUTOS (COMO LO HARÍA UN HUMANO):
   - ⚠️ CRÍTICO: TODOS los horarios DEBEN estar en intervalos de 15 minutos
   - ✅ Minutos PERMITIDOS: :00, :15, :30, :45 únicamente
   - ❌ Minutos PROHIBIDOS: :01, :02, :03, :05, :07, :10, :12, :17, :20, :23, :25, :27, :33, :35, :37, :40, :42, :47, :50, :52, :55, :57
   - ✅ Ejemplos CORRECTOS: 7:00, 7:15, 7:30, 7:45, 8:00, 8:15, 8:30, 8:45, 12:00, 12:15, 14:00, 14:30, 19:00, 19:45, 20:00
   - ❌ Ejemplos INCORRECTOS: 7:05, 7:10, 8:25, 12:10, 14:20, 19:35
   - Si las estadísticas del niño son (por ejemplo) 7:05 AM, redondea a 7:00 AM o 7:15 AM (el más cercano)
   - SIGUE el RAG para determinar los horarios apropiados, pero SIEMPRE en intervalos de 15 minutos
6. 📈 ESTRATEGIA PROGRESIVA (Plan N):
   - CONTINÚA avanzando desde el plan anterior hacia el objetivo ideal del RAG
   - Evalúa qué tan lejos está el plan anterior del objetivo ideal
   - Da el SIGUIENTE PASO PROGRESIVO (no saltes directamente al ideal)
   - Ejemplo: Si Plan 0 propuso 21:00 y el ideal es 20:00, ahora propón 20:30 o 20:00 según tolerancia observada
   - Usa los eventos reales para validar si el niño está tolerando bien los ajustes
7. ✨ EVOLUCIONA el plan manteniendo coherencia con el anterior
8. 🔧 OPTIMIZA horarios según los datos reales registrados y el siguiente paso hacia el ideal
9. Si el período contiene siestas (conteo>0), DEBES incluir al menos 1 siesta con hora cercana a ${enrichedStats?.napStats?.typicalTime || "14:00"} y duración ~${Math.max(60, Math.min(120, enrichedStats?.napStats?.avgDuration || 90))} min
10. Para comidas, no inventes categorías sin eventos; puedes omitirlas o marcarlas como opcionales

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
` : ""}

TRANSCRIPT DE LA CONSULTA (COMPLETO):
${transcriptAnalysis?.transcript || "No disponible"}

VOCABULARIO DE ALIMENTACION:
- Usa terminos variados segun el momento del dia: "Desayuno", "Almuerzo/Comida", "Merienda/Colacion/Snack", "Cena".
- Para referirte a la ingesta en general, alterna entre "alimento", "ingesta", "comida", "alimentacion". Evita repetir la palabra "comida" mas de 2 veces en el mismo bloque de recomendaciones.
- NO des recomendaciones nutricionales especificas ni nombres de alimentos concretos. NO somos nutriologos. En su lugar, sugiere COMBINACIONES GENERALES de grupos alimenticios adaptadas a la edad (ej: "Proteina + cereal + fruta", "Proteina + verdura + grasa saludable", "Cereal + fruta + lacteo").
- NO usar: "Avena con platano", "Pure de pollo con arroz", "Papilla de verduras" (demasiado especifico).
- NO usar: "Comida balanceada", "Comida nutritiva", "Desayuno nutritivo" (demasiado generico).
- SI usar: "Proteina + cereal + fruta", "Proteina + verdura + grasa", "Lacteo + cereal + fruta" (combinacion de grupos).

INSTRUCCIONES PARA REFINAMIENTO:
1. 🎯 PRIORIDAD MÁXIMA: Aplica todos los cambios específicos de horarios extraídos del transcript
2. ⚠️ CRÍTICO: NO puede haber DOS EVENTOS DIFERENTES a la MISMA HORA (ej: no puede haber "cena a las 19:00" y "baño a las 19:00")
3. Si hay conflicto entre plan base y horarios extraídos, USA LOS HORARIOS EXTRAÍDOS
4. Mantén la coherencia general del plan base, pero aplica refinamientos específicos
5. Enfócate en los problemas identificados y cambios solicitados en la consulta
6. Conserva elementos que funcionan del plan base
7. ⛔ NO generar actividades de "Acostado", "Acostarse", "Ir a la cama" o "Rutina de sueño" - el campo "bedtime" ya cubre la hora de dormir
8. ⛔ NO incluir actividades en el plan - solo incluir: despertar (wakeTime), siestas (naps), comidas (meals) y dormir (bedtime)

FORMATO DE RESPUESTA OBLIGATORIO (JSON únicamente):
{
  "schedule": {
    "bedtime": "20:00",
    "wakeTime": "07:00",
    "meals": [
      {
        "time": "07:30",
        "type": "desayuno",
        "description": "Cereal + fruta + lacteo"
      }
    ],
    "activities": [],
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
` : ""}

TRANSCRIPT DE LA SESIÓN (COMPLETO):
${transcriptAnalysis.transcript}

INSTRUCCIONES:
1. 🎯 PRIORIDAD MÁXIMA: Aplica todos los cambios específicos de horarios extraídos del transcript
2. Si hay conflicto entre plan anterior y horarios extraídos, USA LOS HORARIOS EXTRAÍDOS
3. Revisa el plan anterior como base, pero actualiza con los cambios específicos
4. Mantén la estructura general pero aplica mejoras específicas de la sesión
5. Enfócate en los problemas identificados y cambios solicitados en la consulta
6. Si un horario no está en los cambios extraídos, mantén el del plan anterior
7. ⛔ NO generar actividades de "Acostado", "Acostarse", "Ir a la cama" o "Rutina de sueño" - el campo "bedtime" ya cubre la hora de dormir
8. ⛔ NO incluir actividades en el plan - solo incluir: despertar (wakeTime), siestas (naps), comidas (meals) y dormir (bedtime)

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
      const ageM = typeof childData?.ageInMonths === "number" ? childData.ageInMonths : (childData?.birthDate ? Math.floor(differenceInDays(new Date(), new Date(childData.birthDate)) / 30.44) : null)
      const p = derivePlanPolicy({ ageInMonths: ageM, events: childData?.events || [] })
      const napLine = p.napTransition.isTransitionWindow
        ? `Transición 2→1 siestas (15–18 meses): cambios de ${Math.max(10, Math.min(15, p.napTransition.recommendedStepMinutes))} min cada 3–4 días.`
        : `Ajustes generales: puedes mover bloques de ${p.napTransition.recommendedStepMinutes} min si el niño lo tolera.`
      const nightLine = p.nightWeaning.isActive
        ? `Destete nocturno activo: mover toma ${p.nightWeaning.shiftEarlierMinutesPerStep} min más temprano y aumentar ~${p.nightWeaning.increaseBottleOzPerStep} oz cada ${p.nightWeaning.stepEveryDays} días.`
        : "Si no hay tomas nocturnas recientes, no incluir destete."
      policyText = `POLÍTICAS Y LÍMITES DE AJUSTE (OBLIGATORIO RESPETAR):\n- ${napLine}\n- ${nightLine}`
    } catch (_e) { Sentry.captureException(_e) }
    const __messages: any[] = [
      { role: "system", content: systemPrompt },
    ]
    if (policyText) {
      __messages.push({ role: "system", content: policyText })
    }
    __messages.push({ role: "user", content: "Genera el plan detallado siguiendo exactamente el formato JSON especificado." })
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: __messages,
      max_tokens: 2000,
      temperature: 0.3, // Baja temperature para mayor consistencia y evitar horarios duplicados
    })

    let responseContent = completion.choices[0]?.message?.content || ""
    
    // Limpiar la respuesta para asegurar JSON válido
    responseContent = responseContent.trim()
    
    // Si la respuesta no empieza con {, intentar extraer el JSON
    if (!responseContent.startsWith("{")) {
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
        fullLength: responseContent.length,
      })
      Sentry.captureException(parseError)

      // Intentar generar un plan básico como fallback
      logger.warn("Generando plan fallback debido a error de parsing")
      return {
        schedule: {
          bedtime: "20:30",
          wakeTime: "07:00",
          meals: [
            { time: "07:30", type: "desayuno", description: "Cereal + fruta + lacteo" },
            { time: "12:00", type: "almuerzo", description: "Proteina + verdura + cereal" },
            { time: "16:00", type: "merienda", description: "Fruta + lacteo o cereal" },
            { time: "19:00", type: "cena", description: "Proteina + verdura + grasa saludable" },
          ],
          activities: [
            { time: "08:00", activity: "jugar", duration: 60, description: "Tiempo de juego" },
            { time: "17:00", activity: "ejercicio", duration: 30, description: "Actividad física" },
          ],
          naps: [
            { time: "14:00", duration: 90, description: "Siesta vespertina" },
          ],
        },
        objectives: ["Establecer rutina de sueño consistente", "Mejorar calidad del descanso"],
        recommendations: ["Mantener horarios fijos", "Crear ambiente propicio para dormir"],
        improvements: ["Plan refinado basado en consulta médica"],
        adjustments: ["Horarios ajustados según recomendaciones"],
      }
    }
  } catch (error) {
    logger.error("Error generando plan con IA:", error)
    Sentry.captureException(error)
    // Fallback robusto cuando la IA o la red fallan: devolver un plan básico válido
    logger.warn("Generando plan fallback debido a error en IA/red")
    return {
      schedule: {
        bedtime: "20:30",
        wakeTime: "07:00",
        meals: [
          { time: "07:30", type: "desayuno", description: "Cereal + fruta + lacteo" },
          { time: "12:00", type: "almuerzo", description: "Proteina + verdura + cereal" },
          { time: "16:00", type: "merienda", description: "Fruta + lacteo o cereal" },
          { time: "19:00", type: "cena", description: "Proteina + verdura + grasa saludable" },
        ],
        activities: [
          { time: "18:30", activity: "rutina", duration: 30, description: "Rutina relajante antes de dormir" },
        ],
        naps: [
          { time: "14:00", duration: 90, description: "Siesta vespertina" },
        ],
      },
      objectives: [
        "Establecer rutina de sueño consistente",
        "Mejorar calidad del descanso",
      ],
      recommendations: [
        "Mantener horarios fijos",
        "Ambiente oscuro y tranquilo por la noche",
      ],
      improvements: ["Plan generado con fallback por indisponibilidad de IA"],
      adjustments: ["Ajustes estándar basados en edad"],
    }
  }
}
