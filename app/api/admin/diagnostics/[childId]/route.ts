// API para obtener diagnostico completo de un nino
// Solo accesible por admins, requiere plan activo

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

    if (!activePlan) {
      return NextResponse.json(
        {
          error: "Este nino no tiene un plan activo",
          code: "NO_ACTIVE_PLAN",
        },
        { status: 400 }
      )
    }

    logger.info("Plan activo encontrado", {
      planId: activePlan._id.toString(),
      planNumber: activePlan.planNumber,
    })

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

    // 8. Ejecutar los 4 motores de validacion
    const surveyData = child.surveyData || {}

    // G1: Horario
    const g1Result = validateSchedule({
      events,
      plan: activePlan,
      childAgeMonths,
    })

    // G2: Medico
    const g2Result = validateMedicalIndicators({
      surveyData,
      events,
    })

    // G3: Nutricion
    const g3Result = validateNutrition({
      events,
      childAgeMonths,
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
      planId: activePlan._id.toString(),
      planVersion: String(activePlan.planNumber || "1"),
      evaluatedAt: now,
      groups: {
        G1: g1Result,
        G2: g2Result,
        G3: g3Result,
        G4: g4Result,
      },
      alerts,
      overallStatus,
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
