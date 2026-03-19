// API para obtener diagnostico completo de un nino
// Solo accesible por admins
// Corre con la minima data disponible (survey, eventos, plan)

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { differenceInDays } from "date-fns"
import { createLogger } from "@/lib/logger"
import { DiagnosticResult, Alert, StatusLevel } from "@/lib/diagnostic/types"
import { validateSchedule } from "@/lib/diagnostic/rules/schedule-rules"
import { validateMedicalIndicators } from "@/lib/diagnostic/rules/medical-rules"
import { validateNutrition } from "@/lib/diagnostic/rules/nutrition-rules"
import { validateEnvironmentalFactors } from "@/lib/diagnostic/rules/environmental-rules"
import { formatPlanForDiagnostic } from "@/lib/diagnostic/plan-formatter"
import { flattenSurveyData } from "@/lib/diagnostic/flatten-survey-data"

const logger = createLogger("API:admin:diagnostics")

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  const startTime = Date.now()

  try {
    // 1. Verificar autenticacion y permisos de admin
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { childId } = await params

    if (!childId || !ObjectId.isValid(childId)) {
      return NextResponse.json(
        { error: "childId invalido" },
        { status: 400 }
      )
    }

    logger.info("Iniciando diagnostico", {
      childId,
      adminId: session.user.id,
    })

    const { db } = await connectToDatabase()
    const childObjectId = new ObjectId(childId)

    // 2. Obtener datos del nino primero (necesitamos parentId para plan query)
    const child = await db.collection("children").findOne({
      _id: childObjectId,
    })

    if (!child) {
      return NextResponse.json(
        { error: "Nino no encontrado" },
        { status: 404 }
      )
    }

    // 3. Calcular edad en meses
    const birthDate = child.birthDate ? new Date(child.birthDate) : null
    const childAgeMonths = birthDate
      ? Math.floor(differenceInDays(new Date(), birthDate) / 30.44)
      : 0

    const parentId = child.parentId?.toString() || ""

    // P1: Paralelizar queries restantes con Promise.all
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    const [activePlan, events, chatMessages] = await Promise.all([
      // 4. Plan activo
      db.collection("child_plans").findOne(
        {
          childId: childObjectId,
          userId: new ObjectId(parentId),
          status: "active",
        },
        { sort: { planNumber: -1, createdAt: -1 } }
      ),
      // 5. Eventos recientes (7 dias)
      db.collection("events")
        .find({
          childId: childObjectId,
          startTime: { $gte: sevenDaysAgo.toISOString() },
        })
        .sort({ startTime: -1 })
        .toArray(),
      // 6. Chat messages (14 dias)
      db.collection("chatMessages")
        .find({
          childId: childObjectId,
          createdAt: { $gte: fourteenDaysAgo },
        })
        .sort({ createdAt: -1 })
        .toArray(),
    ])

    if (activePlan) {
      logger.info("Plan activo encontrado", {
        planId: activePlan._id.toString(),
        planNumber: activePlan.planNumber,
      })
    } else {
      logger.info("Sin plan activo, diagnostico con datos disponibles", { childId })
    }

    logger.info("Datos obtenidos", {
      eventCount: events.length,
      chatCount: chatMessages.length,
      desde: sevenDaysAgo.toISOString(),
    })

    const chatTexts = chatMessages
      .filter((msg) => msg.content && typeof msg.content === "string")
      .map((msg) => msg.content as string)

    // 7. Extraer notas de eventos para deteccion de keywords
    const eventNotes = events
      .filter((e) => e.notes && typeof e.notes === "string")
      .map((e) => e.notes as string)

    // 8. Aplanar surveyData y calcular nivel de datos disponible
    const surveyData = flattenSurveyData(child.surveyData || {})
    const hasSurvey = Object.keys(surveyData).length > 0
    const hasEvents = events.length > 0
    const hasPlan = !!activePlan

    // Minimo requerido: al menos survey O eventos
    if (!hasSurvey && !hasEvents) {
      return NextResponse.json(
        {
          error: "No hay datos para el diagnostico. Se requiere al menos la encuesta o eventos registrados.",
          code: "NO_DATA_AVAILABLE",
        },
        { status: 400 }
      )
    }

    // Calcular nivel de datos y fuentes faltantes
    const dataLevel = hasPlan ? "full" : hasEvents ? "survey_events" : "survey_only"
    const missingDataSources: string[] = []
    if (!hasSurvey) missingDataSources.push("Encuesta del nino")
    if (!hasEvents) missingDataSources.push("Eventos registrados (ultimos 7 dias)")
    if (!hasPlan) missingDataSources.push("Plan de sueno activo")

    logger.info("Nivel de datos", { dataLevel, missingDataSources })

    // 9. Ejecutar los 4 motores de validacion

    // G1: Horario (plan puede ser null, surveyData como fallback)
    const g1Result = validateSchedule({
      events,
      plan: activePlan || null,
      childAgeMonths,
      surveyData,
    })

    // G2: Medico (usa surveyData para indicadores)
    const g2Result = validateMedicalIndicators({
      surveyData,
      events,
    })

    // G3: Nutricion (usa surveyData para baseline nutricional)
    const g3Result = validateNutrition({
      events,
      childAgeMonths,
      surveyData,
    })

    // G4: Ambiental
    const g4Result = validateEnvironmentalFactors({
      surveyData,
      recentEventNotes: eventNotes,
      chatMessages: chatTexts,
    })

    // 9. Recolectar alertas de todos los grupos
    const alerts: Alert[] = []
    const now = new Date().toISOString()

    const collectAlerts = (
      groupId: "G1" | "G2" | "G3" | "G4",
      criteria: {
        id: string
        status: StatusLevel
        message: string
        sourceType: string
        sourceId?: string
        sourceField?: string
      }[]
    ) => {
      criteria
        .filter((c) => c.status === "alert" || c.status === "warning")
        .forEach((c) => {
          alerts.push({
            id: `${groupId}-${c.id}`,
            groupId,
            criterionId: c.id,
            message: c.message,
            severity: c.status,
            sourceType: c.sourceType as Alert["sourceType"],
            sourceId: c.sourceId,
            sourceField: c.sourceField,
            timestamp: now,
          })
        })
    }

    collectAlerts("G1", g1Result.criteria)
    collectAlerts("G2", g2Result.criteria)
    collectAlerts("G3", g3Result.criteria)
    collectAlerts("G4", g4Result.criteria)

    // 10. Calcular status general
    const statuses = [
      g1Result.status,
      g2Result.status,
      g3Result.status,
      g4Result.status,
    ]
    let overallStatus: StatusLevel = "ok"
    if (statuses.includes("alert")) {
      overallStatus = "alert"
    } else if (statuses.includes("warning")) {
      overallStatus = "warning"
    }

    // 11. Construir resultado final
    const childName = `${child.firstName || ""} ${child.lastName || ""}`.trim()

    // Fix 7: Extraer medicamentos y actividades de los eventos
    const medicationEvents = events.filter((e: Record<string, unknown>) => e.eventType === "medication")
    const activityEvents = events.filter((e: Record<string, unknown>) => e.eventType === "extra_activities")

    // Agrupar medicamentos por nombre
    const medicationMap = new Map<string, { count: number; lastDose: string; lastTime: string }>()
    for (const e of medicationEvents) {
      const name = (e.medicationName as string) || "Sin nombre"
      const existing = medicationMap.get(name) || { count: 0, lastDose: "", lastTime: "" }
      existing.count++
      existing.lastDose = (e.medicationDose as string) || existing.lastDose
      const eTime = (e.startTime as string) || ""
      existing.lastTime = eTime > existing.lastTime ? eTime : existing.lastTime
      medicationMap.set(name, existing)
    }
    const medicationSummary = medicationMap.size > 0
      ? Array.from(medicationMap.entries()).map(([name, data]) => ({
        name,
        count: data.count,
        lastDose: data.lastDose,
        lastTime: data.lastTime,
      }))
      : undefined

    // Agrupar actividades por descripcion
    const activityMap = new Map<string, { count: number; totalDuration: number }>()
    for (const e of activityEvents) {
      const desc = (e.activityDescription as string) || "Sin descripcion"
      const existing = activityMap.get(desc) || { count: 0, totalDuration: 0 }
      existing.count++
      existing.totalDuration += Number(e.activityDuration) || 0
      activityMap.set(desc, existing)
    }
    const activitySummary = activityMap.size > 0
      ? Array.from(activityMap.entries()).map(([description, data]) => ({
        description,
        count: data.count,
        avgDurationMin: data.count > 0 ? Math.round(data.totalDuration / data.count) : 0,
      }))
      : undefined

    const diagnosticResult: DiagnosticResult = {
      childId,
      childName,
      childAgeMonths,
      childBirthDate: child.birthDate || undefined,
      parentId,
      planId: activePlan?._id?.toString(),
      // B1: Usar ?? en vez de || para que planNumber 0 no se convierta en "1"
      planVersion: activePlan ? String(activePlan.planNumber ?? "sin plan") : undefined,
      evaluatedAt: now,
      // Fix 1: Conteo real de eventos (no criteria.length)
      recentEventsCount: events.length,
      // Fix 5: Fecha de creacion del plan
      planCreatedAt: activePlan?.createdAt ? new Date(activePlan.createdAt).toISOString() : undefined,
      // Fix 2: Resumen del plan para contexto AI
      planScheduleSummary: activePlan ? formatPlanForDiagnostic(activePlan) : undefined,
      groups: {
        G1: g1Result,
        G2: g2Result,
        G3: g3Result,
        G4: g4Result,
      },
      alerts,
      overallStatus,
      dataLevel,
      missingDataSources,
      freeTextData: {
        eventNotes,
        chatMessages: chatTexts,
      },
      // Fix 7: Medicamentos y actividades estructurados
      medicationSummary,
      activitySummary,
      // Survey completo para que el Pasante AI tenga acceso a TODOS los campos
      surveyData: hasSurvey ? surveyData : undefined,
    }

    const processingTime = Date.now() - startTime
    logger.info("Diagnostico completado", {
      childId,
      overallStatus,
      alertCount: alerts.length,
      processingTime,
    })

    return NextResponse.json(diagnosticResult)
  } catch (error) {
    const processingTime = Date.now() - startTime
    logger.error("Error en diagnostico", {
      error: error instanceof Error ? error.message : "Error desconocido",
      stack: error instanceof Error ? error.stack : undefined,
      processingTime,
    })

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
