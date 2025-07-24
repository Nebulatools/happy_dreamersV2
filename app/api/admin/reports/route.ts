import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import {
  format,
  parseISO,
  differenceInMinutes,
  getHours,
  getMinutes,
} from "date-fns"
import { es } from "date-fns/locale"

import { createLogger } from "@/lib/logger"

const logger = createLogger("API:admin:reports:route")


interface Event {
  _id: string;
  childId: string;
  eventType: string;
  emotionalState: string;
  startTime: string;
  endTime?: string;
  notes?: string;
  createdAt: string;
}

// POST /api/admin/reports - generar reporte con análisis de IA
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Verificar que sea admin
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { childId, period } = await req.json()
    
    if (!childId) {
      return NextResponse.json({ error: "childId requerido" }, { status: 400 })
    }

    // Conectar a la base de datos
    const client = await clientPromise
    const db = client.db()

    // Obtener datos del niño
    const child = await db.collection("children").findOne({ _id: new ObjectId(childId) })
    if (!child) {
      return NextResponse.json({ error: "Niño no encontrado" }, { status: 404 })
    }

    const events = child.events || []
    
    // Calcular rango de fechas según el período
    const getDateRange = () => {
      const now = new Date()
      switch (period) {
      case "week":
        const oneWeekAgo = new Date(now)
        oneWeekAgo.setDate(now.getDate() - 7)
        return { start: oneWeekAgo, end: now }
      case "month":
        const oneMonthAgo = new Date(now)
        oneMonthAgo.setMonth(now.getMonth() - 1)
        return { start: oneMonthAgo, end: now }
      case "3months":
        const threeMonthsAgo = new Date(now)
        threeMonthsAgo.setMonth(now.getMonth() - 3)
        return { start: threeMonthsAgo, end: now }
      case "6months":
        const sixMonthsAgo = new Date(now)
        sixMonthsAgo.setMonth(now.getMonth() - 6)
        return { start: sixMonthsAgo, end: now }
      default:
        const defaultSixMonthsAgo = new Date(now)
        defaultSixMonthsAgo.setMonth(now.getMonth() - 6)
        return { start: defaultSixMonthsAgo, end: now }
      }
    }

    const { start, end } = getDateRange()
    
    // Filtrar eventos por período
    const filteredEvents = events.filter((event: Event) => {
      const eventDate = parseISO(event.startTime)
      return eventDate >= start && eventDate <= end
    })

    // Calcular métricas detalladas
    const sleepEvents = filteredEvents.filter((e: Event) => e.eventType === "sleep" && e.endTime)
    const napEvents = filteredEvents.filter((e: Event) => e.eventType === "nap")
    const allSleepEvents = filteredEvents.filter((e: Event) => (e.eventType === "sleep" || e.eventType === "nap") && e.endTime)

    // Calcular estadísticas
    const totalSleepMinutes = allSleepEvents.reduce((sum: number, event: any) => {
      return sum + differenceInMinutes(parseISO(event.endTime!), parseISO(event.startTime))
    }, 0)

    const avgSleepPerDay = totalSleepMinutes / Math.max(1, new Set(allSleepEvents.map((e: any) => format(parseISO(e.startTime), "yyyy-MM-dd"))).size)
    const avgSleepHours = Math.round((avgSleepPerDay / 60) * 10) / 10

    // Horarios promedio
    let avgWakeTime = "N/A"
    let avgBedTime = "N/A"
    let avgFirstNapTime = "N/A"

    if (sleepEvents.length > 0) {
      // Hora de despertar
      const avgWakeMinutes = sleepEvents.reduce((sum: number, event: any) => {
        const endTime = parseISO(event.endTime!)
        return sum + (getHours(endTime) * 60 + getMinutes(endTime))
      }, 0) / sleepEvents.length
      const wakeHours = Math.floor(avgWakeMinutes / 60)
      const wakeMins = Math.round(avgWakeMinutes % 60)
      avgWakeTime = `${wakeHours.toString().padStart(2, "0")}:${wakeMins.toString().padStart(2, "0")}`

      // Hora de acostarse
      const avgBedMinutes = sleepEvents.reduce((sum: number, event: any) => {
        const startTime = parseISO(event.startTime)
        return sum + (getHours(startTime) * 60 + getMinutes(startTime))
      }, 0) / sleepEvents.length
      const bedHours = Math.floor(avgBedMinutes / 60)
      const bedMins = Math.round(avgBedMinutes % 60)
      avgBedTime = `${bedHours.toString().padStart(2, "0")}:${bedMins.toString().padStart(2, "0")}`
    }

    if (napEvents.length > 0) {
      // Agrupar siestas por día para primera siesta
      const napsByDay = napEvents.reduce((acc: Record<string, Event[]>, nap: Event) => {
        const day = format(parseISO(nap.startTime), "yyyy-MM-dd")
        if (!acc[day]) acc[day] = []
        acc[day].push(nap)
        return acc
      }, {} as Record<string, Event[]>)

      const firstNaps = Object.values(napsByDay).map((dayNaps: any) => 
        dayNaps.sort((a: any, b: any) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime())[0]
      )

      if (firstNaps.length > 0) {
        const avgFirstNapMinutes = firstNaps.reduce((sum: number, nap: any) => {
          const startTime = parseISO(nap.startTime)
          return sum + (getHours(startTime) * 60 + getMinutes(startTime))
        }, 0) / firstNaps.length
        const napHours = Math.floor(avgFirstNapMinutes / 60)
        const napMins = Math.round(avgFirstNapMinutes % 60)
        avgFirstNapTime = `${napHours.toString().padStart(2, "0")}:${napMins.toString().padStart(2, "0")}`
      }
    }

    // Estados emocionales
    const moodCounts = filteredEvents.reduce((acc: Record<string, number>, event: any) => {
      acc[event.emotionalState] = (acc[event.emotionalState] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const totalMoodEvents = Object.values(moodCounts).reduce((sum: number, count: unknown) => sum + (count as number), 0)
    const predominantMood = Object.entries(moodCounts).sort(([,a]: [string, unknown], [,b]: [string, unknown]) => (b as number) - (a as number))[0]?.[0] || "unknown"

    // Preparar datos para el LLM
    const periodLabel = period === "week" ? "última semana" : 
      period === "month" ? "último mes" : 
        period === "3months" ? "últimos 3 meses" : 
          period === "6months" ? "últimos 6 meses" : "período analizado"

    const analysisData = {
      childName: `${child.firstName} ${child.lastName}`,
      period: periodLabel,
      totalEvents: filteredEvents.length,
      sleepMetrics: {
        avgSleepHours,
        totalSleepEvents: sleepEvents.length,
        totalNapEvents: napEvents.length,
        avgWakeTime,
        avgBedTime,
        avgFirstNapTime,
      },
      emotionalData: {
        predominantMood,
        moodDistribution: moodCounts,
        totalMoodEvents,
      },
      rawEvents: filteredEvents.slice(0, 20), // Primeros 20 eventos para contexto
    }

    // Generar análisis con IA (simulado por ahora, puedes agregar OpenAI después)
    const aiAnalysis = await generateAIAnalysis(analysisData)

    return NextResponse.json({
      success: true,
      report: aiAnalysis,
    })

  } catch (error) {
    logger.error("Error generando reporte:", error)
    return NextResponse.json({ 
      error: "Error interno del servidor", 
    }, { status: 500 })
  }
}

// Función para generar análisis con IA (puedes reemplazar con OpenAI)
async function generateAIAnalysis(data: any) {
  // Por ahora genero un análisis inteligente sin OpenAI
  // Puedes agregar OpenAI API aquí después
  
  const sleepQuality = data.sleepMetrics.avgSleepHours >= 10 ? "excelente" : 
    data.sleepMetrics.avgSleepHours >= 8 ? "buena" : 
      data.sleepMetrics.avgSleepHours >= 6 ? "regular" : "deficiente"

  const moodAnalysis = data.emotionalData.predominantMood === "happy" ? "predominantemente positivo" :
    data.emotionalData.predominantMood === "calm" ? "tranquilo y estable" :
      data.emotionalData.predominantMood === "tired" ? "con signos de fatiga" :
        "variable"

  const recommendations = []
  
  if (data.sleepMetrics.avgSleepHours < 10) {
    recommendations.push("Considerar establecer una rutina de sueño más temprana para aumentar las horas de descanso.")
  }
  
  if (data.sleepMetrics.totalNapEvents < 5) {
    recommendations.push("Incorporar más siestas regulares durante el día para mejorar el descanso total.")
  }
  
  if (data.emotionalData.predominantMood === "irritable" || data.emotionalData.predominantMood === "tired") {
    recommendations.push("El estado emocional sugiere que el niño podría beneficiarse de más descanso y rutinas más consistentes.")
  }

  return {
    title: `Análisis de Patrones de Sueño - ${data.childName}`,
    period: data.period,
    executiveSummary: `Durante el ${data.period}, ${data.childName} ha mostrado un patrón de sueño ${sleepQuality} con un promedio de ${data.sleepMetrics.avgSleepHours} horas por día. Se registraron ${data.sleepMetrics.totalSleepEvents} eventos de sueño nocturno y ${data.sleepMetrics.totalNapEvents} siestas. El estado emocional ha sido ${moodAnalysis}.`,
    
    sleepAnalysis: {
      quality: sleepQuality,
      avgHours: data.sleepMetrics.avgSleepHours,
      schedule: `El niño tiende a acostarse alrededor de las ${data.sleepMetrics.avgBedTime} y despertar cerca de las ${data.sleepMetrics.avgWakeTime}. ${data.sleepMetrics.avgFirstNapTime !== "N/A" ? `La primera siesta del día suele ocurrir alrededor de las ${data.sleepMetrics.avgFirstNapTime}.` : "No se observó un patrón consistente de siestas."}`,
      consistency: data.sleepMetrics.totalSleepEvents >= 20 ? "Alta consistencia en los patrones de sueño" : 
        data.sleepMetrics.totalSleepEvents >= 10 ? "Consistencia moderada" : "Patrones irregulares detectados",
    },
    
    emotionalAnalysis: {
      overview: `El estado emocional predominante fue '${data.emotionalData.predominantMood}' representando el ${Math.round((data.emotionalData.moodDistribution[data.emotionalData.predominantMood] / data.emotionalData.totalMoodEvents) * 100)}% de los eventos registrados.`,
      moodBreakdown: Object.entries(data.emotionalData.moodDistribution).map(([mood, count]: [string, any]) => 
        `${mood}: ${count} eventos (${Math.round((count as number / data.emotionalData.totalMoodEvents) * 100)}%)`
      ).join(", "),
    },
    
    recommendations: recommendations.length > 0 ? recommendations : ["Los patrones de sueño actuales parecen adecuados. Continúa monitoreando para mantener la consistencia."],
    
    metrics: {
      sleepScore: Math.min(100, (data.sleepMetrics.avgSleepHours / 12) * 50 + (data.sleepMetrics.totalSleepEvents / 30) * 30 + (data.sleepMetrics.totalNapEvents / 20) * 20),
      consistencyScore: Math.min(100, (data.sleepMetrics.totalSleepEvents / 30) * 100),
      emotionalScore: data.emotionalData.predominantMood === "happy" ? 90 : 
        data.emotionalData.predominantMood === "calm" ? 85 :
          data.emotionalData.predominantMood === "excited" ? 75 : 60,
    },
    
    dataPoints: {
      totalEvents: data.totalEvents,
      sleepEvents: data.sleepMetrics.totalSleepEvents,
      napEvents: data.sleepMetrics.totalNapEvents,
      avgSleepHours: data.sleepMetrics.avgSleepHours,
      analysisDate: format(new Date(), "dd/MM/yyyy", { locale: es }),
    },
  }
} 