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

const logger = createLogger("API:admin:diagnostics")

// Aplanar surveyData: los datos se guardan anidados por seccion
// (ej: surveyData.desarrolloSalud.reflujoColicos) pero los motores
// de validacion acceden de forma plana (ej: surveyData.reflujoColicos).
// Esta funcion merge todas las secciones y agrega mappings especiales.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function flattenSurveyData(raw: Record<string, any>): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flat: Record<string, any> = {}

  // Secciones del survey wizard
  const sections = [
    "informacionFamiliar",
    "dinamicaFamiliar",
    "historial",
    "desarrolloSalud",
    "actividadFisica",
    "rutinaHabitos",
  ]

  for (const section of sections) {
    if (raw[section] && typeof raw[section] === "object" && !Array.isArray(raw[section])) {
      Object.assign(flat, raw[section])
    }
  }

  // Mappings especiales para G4 (nombres de campo distintos al form)
  // roomTemperature <- temperaturaCuarto
  if (flat.temperaturaCuarto !== undefined) {
    const parsed = parseFloat(flat.temperaturaCuarto)
    if (!isNaN(parsed)) flat.roomTemperature = parsed
  }

  // sleepingArrangement <- dondeDuerme (puede ser string o array)
  if (flat.dondeDuerme !== undefined) {
    flat.sleepingArrangement = Array.isArray(flat.dondeDuerme)
      ? flat.dondeDuerme.join(", ")
      : flat.dondeDuerme
  }

  // sharesRoom <- comparteHabitacion
  if (flat.comparteHabitacion !== undefined) {
    flat.sharesRoom = flat.comparteHabitacion
  }

  // recentChanges <- principalPreocupacion (texto libre)
  if (flat.principalPreocupacion !== undefined) {
    flat.recentChanges = flat.principalPreocupacion
  }

  // postpartumDepression <- informacionFamiliar.mama.pensamientosNegativos
  if (raw.informacionFamiliar?.mama?.pensamientosNegativos !== undefined) {
    flat.postpartumDepression = raw.informacionFamiliar.mama.pensamientosNegativos
  }

  // alergiasPadres <- papa.tieneAlergias OR mama.tieneAlergias
  const papaAlergias = raw.informacionFamiliar?.papa?.tieneAlergias
  const mamaAlergias = raw.informacionFamiliar?.mama?.tieneAlergias
  if (papaAlergias || mamaAlergias) {
    flat.alergiasPadres = true
  }

  // maternalSleep <- informacionFamiliar.mama.puedeDormir
  if (raw.informacionFamiliar?.mama?.puedeDormir !== undefined) {
    flat.maternalSleep = raw.informacionFamiliar.mama.puedeDormir
  }

  // nighttimeSupport <- dinamicaFamiliar.quienAtiende
  if (flat.quienAtiende !== undefined) {
    flat.nighttimeSupport = flat.quienAtiende
  }

  // householdMembers <- dinamicaFamiliar.otrosResidentes
  if (flat.otrosResidentes !== undefined) {
    flat.householdMembers = flat.otrosResidentes
  }

  return flat
}

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

    // 2. Obtener datos del nino
    const child = await db.collection("children").findOne({
      _id: new ObjectId(childId),
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

    // 4. Verificar plan activo (prerequisito)
    const parentId = child.parentId?.toString() || ""
    const activePlan = await db.collection("child_plans").findOne(
      {
        childId: new ObjectId(childId),
        userId: new ObjectId(parentId),
        status: "active",
      },
      {
        sort: { planNumber: -1, createdAt: -1 },
      }
    )

    if (activePlan) {
      logger.info("Plan activo encontrado", {
        planId: activePlan._id.toString(),
        planNumber: activePlan.planNumber,
      })
    } else {
      logger.info("Sin plan activo, diagnostico con datos disponibles", { childId })
    }

    // 5. Obtener eventos recientes (ultimos 7 dias)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const events = await db
      .collection("events")
      .find({
        childId: new ObjectId(childId),
        startTime: { $gte: sevenDaysAgo.toISOString() },
      })
      .sort({ startTime: -1 })
      .toArray()

    logger.info("Eventos obtenidos", {
      count: events.length,
      desde: sevenDaysAgo.toISOString(),
    })

    // 6. Obtener mensajes de chat recientes (ultimos 14 dias)
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    const chatMessages = await db
      .collection("chatMessages")
      .find({
        childId: new ObjectId(childId),
        createdAt: { $gte: fourteenDaysAgo },
      })
      .sort({ createdAt: -1 })
      .toArray()

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

    const diagnosticResult: DiagnosticResult = {
      childId,
      childName,
      childAgeMonths,
      childBirthDate: child.birthDate || undefined,
      parentId,
      planId: activePlan?._id?.toString(),
      planVersion: activePlan ? String(activePlan.planNumber || "1") : undefined,
      evaluatedAt: now,
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
