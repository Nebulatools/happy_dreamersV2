import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"

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

    const client = await clientPromise
    const db = client.db()

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

    // 3. Obtener todos los planes activos (últimos 30 días)
    const activePlans = await db.collection("consultas").find({
      createdAt: { $gte: thirtyDaysAgo },
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

    // 5. Calcular métricas agregadas
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
