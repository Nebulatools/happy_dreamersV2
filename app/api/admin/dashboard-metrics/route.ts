import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"

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

    // 7. Calcular métricas agregadas
    let activeToday = 0
    const childMetrics = allChildren.map(child => {
      const childIdStr = child._id.toString()
      const hasPlan = childrenWithPlans.has(childIdStr)
      const hasActivity = childrenWithActivity.has(childIdStr)
      const isActive = hasPlan || hasActivity

      if (isActive) {
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
      }
    })

    // 8. Obtener niños con actividad reciente (últimas 48 horas) para tab "Actividad Reciente"
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

    // Ordenar por apellido del contacto principal (A-Z)
    childMetrics.sort((a, b) => {
      const apellidoA = a.apellidoContacto.toLowerCase()
      const apellidoB = b.apellidoContacto.toLowerCase()
      if (apellidoA < apellidoB) return -1
      if (apellidoA > apellidoB) return 1
      // Si tienen el mismo apellido, ordenar por nombre del niño
      return a.childName.toLowerCase().localeCompare(b.childName.toLowerCase())
    })

    return NextResponse.json({
      totalChildren: allChildren.length,
      activeToday,
      childMetrics,
      recentActivityChildren,
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
