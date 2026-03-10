import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { triageChild } from "@/lib/diagnostic/triage"
import { computePatientStatus, type PatientStatus } from "@/lib/patient-status"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 })
    }

    // Verificar que sea admin
    if (session.user.role !== "admin") {
      return NextResponse.json({ message: "Acceso denegado" }, { status: 403 })
    }

    const { db } = await connectToDatabase()

    const today = new Date()
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    // 1. Obtener todos los niños
    const allChildren = await db.collection("children").find({}).toArray()

    // 2. Obtener todos los cuestionarios para obtener el contacto principal
    const allSurveys = await db.collection("surveys").find({}).toArray()

    // Crear mapa de childId -> contacto principal (apellido)
    const surveyMap = new Map()
    allSurveys.forEach(survey => {
      const childId = survey.childId?.toString()
      const contactoPrincipal = survey.responses?.contactoPrincipal || "mama"
      const apellido = contactoPrincipal === "mama"
        ? survey.responses?.apellidoMama || ""
        : survey.responses?.apellidoPapa || ""

      if (childId) {
        surveyMap.set(childId, apellido)
      }
    })

    // 3. Obtener todos los planes activos
    const activePlans = await db.collection("child_plans").find({
      status: "active",
    }).toArray()

    // Crear un Set de childIds que tienen planes activos
    const childrenWithPlans = new Set(
      activePlans.map(plan => plan.childId?.toString()).filter(Boolean)
    )

    // 4. Obtener eventos recientes (últimos 7 días) - solo necesitamos childIds
    const recentEvents = await db.collection("events").find({
      startTime: { $gte: sevenDaysAgo },
    }, {
      projection: { childId: 1 },
    }).toArray()

    // Crear un Set de childIds con actividad reciente
    const childrenWithActivity = new Set(
      recentEvents.map(event => event.childId?.toString()).filter(Boolean)
    )

    // 4b. Obtener la fecha del ultimo evento de cada nino (para computar status)
    const latestEventByChild = await db.collection("events").aggregate([
      { $sort: { startTime: -1 } },
      { $group: { _id: "$childId", lastEventDate: { $first: "$startTime" } } },
    ]).toArray()

    // Mapa de childId -> fecha del ultimo evento
    const lastEventMap = new Map<string, Date>()
    latestEventByChild.forEach(item => {
      const childIdStr = item._id?.toString()
      if (childIdStr && item.lastEventDate) {
        const d = typeof item.lastEventDate === "string"
          ? new Date(item.lastEventDate)
          : item.lastEventDate
        lastEventMap.set(childIdStr, d)
      }
    })

    // 5. Obtener usuarios nuevos en los últimos 30 días
    const newUsersList = await db.collection("users").find({
      createdAt: { $gte: thirtyDaysAgo },
    }, {
      projection: { _id: 1, name: 1, email: 1, createdAt: 1 },
    }).sort({ createdAt: -1 }).toArray()

    const newUsersThisMonth = newUsersList.length

    // 6. Obtener niños nuevos en los últimos 30 días
    const newChildrenList = await db.collection("children").find({
      createdAt: { $gte: thirtyDaysAgo },
    }, {
      projection: { _id: 1, firstName: 1, lastName: 1, createdAt: 1 },
    }).sort({ createdAt: -1 }).toArray()

    const newChildrenThisMonth = newChildrenList.length

    // 7. Calcular metricas agregadas + status computado
    let activeToday = 0
    const statusCounts = { active: 0, inactive: 0, archived: 0 }
    const childMetrics = allChildren.map(child => {
      const childIdStr = child._id.toString()
      const hasPlan = childrenWithPlans.has(childIdStr)
      const hasActivity = childrenWithActivity.has(childIdStr)
      const isActive = hasPlan || hasActivity
      const lastEventDate = lastEventMap.get(childIdStr) || null

      // Computar status derivado
      const status: PatientStatus = computePatientStatus({
        archived: child.archived === true,
        hasActivePlan: hasPlan,
        lastEventDate,
        childCreatedAt: child.createdAt ? new Date(child.createdAt) : new Date(0),
      })

      statusCounts[status]++

      // activeToday solo cuenta no-archivados
      if (isActive && status !== "archived") {
        activeToday++
      }

      const apellidoContacto = surveyMap.get(childIdStr) || child.lastName || ""

      return {
        childId: childIdStr,
        childName: `${child.firstName} ${child.lastName}`,
        apellidoContacto,
        parentId: child.parentId?.toString(),
        isActive,
        hasPlan,
        hasRecentActivity: hasActivity,
        status,
        lastEventDate: lastEventDate?.toISOString() || null,
      }
    })

    // 8. Triage diagnostico: correr G2+G4 sobre surveyData de cada nino
    interface ChildAlertItem {
      childId: string
      childName: string
      severity: "critical" | "warning"
      diagnosis: string
      lastUpdate: string
      parentName: string
    }
    const childAlerts: ChildAlertItem[] = []
    let alertCritical = 0
    let alertWarning = 0
    let alertOk = 0

    for (const child of allChildren) {
      const triage = triageChild(child.surveyData || {})
      const childIdStr = child._id.toString()
      if (triage.severity === "critical") {
        alertCritical++
        childAlerts.push({
          childId: childIdStr,
          childName: `${child.firstName} ${child.lastName}`,
          severity: "critical",
          diagnosis: triage.diagnosis,
          lastUpdate: new Date().toISOString(),
          parentName: `Fam. ${surveyMap.get(childIdStr) || child.lastName || ""}`,
        })
      } else if (triage.severity === "warning") {
        alertWarning++
        childAlerts.push({
          childId: childIdStr,
          childName: `${child.firstName} ${child.lastName}`,
          severity: "warning",
          diagnosis: triage.diagnosis,
          lastUpdate: new Date().toISOString(),
          parentName: `Fam. ${surveyMap.get(childIdStr) || child.lastName || ""}`,
        })
      } else {
        alertOk++
      }
    }

    // 9. Obtener niños con actividad reciente (últimas 48 horas) para tab "Actividad Reciente"
    const fortyEightHoursAgo = new Date(today.getTime() - 48 * 60 * 60 * 1000)
    const recentDetailedEvents = await db.collection("events").find({
      startTime: { $gte: fortyEightHoursAgo },
    }, {
      projection: { childId: 1, eventType: 1, startTime: 1 },
    }).sort({ startTime: -1 }).toArray()

    // Agrupar por childId, tomar solo el evento más reciente por niño
    const recentByChild = new Map<string, { eventType: string; startTime: string }>()
    recentDetailedEvents.forEach(event => {
      const childIdStr = event.childId?.toString()
      if (childIdStr && !recentByChild.has(childIdStr)) {
        recentByChild.set(childIdStr, {
          eventType: event.eventType,
          startTime: typeof event.startTime === "string" ? event.startTime : new Date(event.startTime).toISOString(),
        })
      }
    })

    // Construir lista de actividad reciente (máximo 10)
    const recentActivityChildren = Array.from(recentByChild.entries())
      .slice(0, 10)
      .map(([childIdStr, lastEvent]) => {
        const child = allChildren.find(c => c._id.toString() === childIdStr)
        if (!child) return null
        return {
          childId: childIdStr,
          childName: `${child.firstName} ${child.lastName}`,
          apellidoContacto: surveyMap.get(childIdStr) || child.lastName || "",
          lastEventType: lastEvent.eventType,
          lastEventTime: lastEvent.startTime,
        }
      })
      .filter(Boolean)

    // Ordenar por nombre del nino (A-Z)
    childMetrics.sort((a, b) => {
      return a.childName.toLowerCase().localeCompare(b.childName.toLowerCase(), "es")
    })

    return NextResponse.json({
      totalChildren: allChildren.length - statusCounts.archived,
      activeToday,
      statusCounts,
      childMetrics,
      recentActivityChildren,
      childAlerts,
      alerts: { critical: alertCritical, warning: alertWarning, ok: alertOk },
      newUsersThisMonth,
      newUsersList: newUsersList.map(u => ({
        _id: u._id.toString(),
        name: u.name || "Sin nombre",
        email: u.email,
        createdAt: u.createdAt,
      })),
      newChildrenThisMonth,
      newChildrenList: newChildrenList.map(c => ({
        _id: c._id.toString(),
        firstName: c.firstName,
        lastName: c.lastName,
        createdAt: c.createdAt,
      })),
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error("Error fetching admin dashboard metrics:", error)
    return NextResponse.json(
      { message: "Error al obtener métricas", error: String(error) },
      { status: 500 }
    )
  }
}
