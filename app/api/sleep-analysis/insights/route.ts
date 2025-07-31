// API para generar análisis y recomendaciones de sueño
// Compara datos reales con el plan activo del niño

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { OpenAI } from "openai"
import { subDays, parseISO, differenceInMinutes, format } from "date-fns"
import { processSleepStatistics } from "@/lib/sleep-calculations"
import { createLogger } from "@/lib/logger"
import { ChildPlan } from "@/types/models"

const logger = createLogger("API:sleep-analysis:insights")

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Tipos para los insights
export interface SleepInsight {
  id: string
  type: 'adherence' | 'deviation' | 'pattern' | 'achievement' | 'recommendation'
  category: 'schedule' | 'quality' | 'consistency' | 'health'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  metric?: {
    actual: string | number
    expected: string | number
    difference?: string | number
    percentage?: number
  }
  icon: string
  actionable?: boolean
  action?: {
    label: string
    link?: string
  }
}

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const url = new URL(req.url)
    const childId = url.searchParams.get("childId")
    const dateRange = url.searchParams.get("dateRange") || "7-days"

    if (!childId) {
      return NextResponse.json({ 
        error: "Falta el parámetro childId" 
      }, { status: 400 })
    }

    logger.info("Generando insights de sueño", {
      childId,
      dateRange,
      userId: session.user.id
    })

    const client = await clientPromise
    const db = client.db()

    // 1. Obtener el plan activo del niño
    const activePlan = await db.collection<ChildPlan>("child_plans")
      .findOne({
        childId: new ObjectId(childId),
        status: "active"
      })

    if (!activePlan) {
      logger.warn("No se encontró plan activo para el niño", { childId })
    }

    // 2. Obtener datos del niño
    const child = await db.collection("children").findOne({
      _id: new ObjectId(childId),
      parentId: session.user.id
    })

    if (!child) {
      return NextResponse.json({ 
        error: "Niño no encontrado" 
      }, { status: 404 })
    }

    // 3. Calcular días a filtrar basado en dateRange
    const now = new Date()
    let daysToSubtract = 7
    
    if (dateRange === "30-days") {
      daysToSubtract = 30
    } else if (dateRange === "90-days") {
      daysToSubtract = 90
    }
    
    const filterDate = subDays(now, daysToSubtract)

    // 4. Obtener eventos de sueño
    const events = await db.collection("events")
      .find({
        childId: new ObjectId(childId),
        startTime: { $gte: filterDate.toISOString() }
      })
      .sort({ startTime: -1 })
      .toArray()

    // 5. Procesar estadísticas
    const stats = processSleepStatistics(events, filterDate)

    // 6. Generar insights comparando con el plan
    const insights = await generateInsights({
      child,
      stats,
      events,
      activePlan,
      dateRange
    })

    logger.info("Insights generados exitosamente", {
      childId,
      totalInsights: insights.length,
      hasPlan: !!activePlan
    })

    return NextResponse.json({
      success: true,
      insights,
      metadata: {
        childId,
        dateRange,
        totalEvents: events.length,
        hasPlan: !!activePlan,
        planNumber: activePlan?.planNumber
      }
    })

  } catch (error) {
    logger.error("Error generando insights:", error)
    return NextResponse.json({ 
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : "Error desconocido"
    }, { status: 500 })
  }
}

// Función principal para generar insights
async function generateInsights({
  child,
  stats,
  events,
  activePlan,
  dateRange
}: {
  child: any
  stats: any
  events: any[]
  activePlan: ChildPlan | null
  dateRange: string
}): Promise<SleepInsight[]> {
  const insights: SleepInsight[] = []
  let insightId = 1

  // Si hay plan activo, generar insights de adherencia
  if (activePlan && stats.avgBedtime && stats.avgBedtime !== "--:--") {
    // Comparar hora de dormir
    const bedtimeAdherence = calculateBedtimeAdherence(stats, activePlan)
    if (bedtimeAdherence) {
      insights.push({
        id: (insightId++).toString(),
        type: bedtimeAdherence.adherencePercentage >= 80 ? 'achievement' : 'deviation',
        category: 'schedule',
        priority: bedtimeAdherence.adherencePercentage < 70 ? 'high' : 'medium',
        title: bedtimeAdherence.adherencePercentage >= 80 
          ? `¡Excelente adherencia!`
          : `Horario variable`,
        description: bedtimeAdherence.adherencePercentage >= 80
          ? `Siguiendo el horario con ${bedtimeAdherence.adherencePercentage}% de precisión`
          : `Varía ${bedtimeAdherence.averageDifference} min del plan`,
        metric: {
          actual: stats.avgBedtime,
          expected: activePlan.schedule.bedtime,
          difference: `${bedtimeAdherence.averageDifference} min`,
          percentage: bedtimeAdherence.adherencePercentage
        },
        icon: bedtimeAdherence.adherencePercentage >= 80 ? '🌟' : '⚠️',
        actionable: bedtimeAdherence.adherencePercentage < 80,
        action: bedtimeAdherence.adherencePercentage < 80 ? {
          label: 'Ver estrategias',
          link: '#strategies'
        } : undefined
      })
    }

    // Comparar hora de despertar
    if (stats.avgWakeTime && stats.avgWakeTime !== "--:--") {
      const wakeTimeAdherence = calculateWakeTimeAdherence(stats, activePlan)
      if (wakeTimeAdherence) {
        insights.push({
          id: (insightId++).toString(),
          type: wakeTimeAdherence.adherencePercentage >= 80 ? 'achievement' : 'deviation',
          category: 'schedule',
          priority: wakeTimeAdherence.adherencePercentage < 70 ? 'high' : 'medium',
          title: wakeTimeAdherence.adherencePercentage >= 80 
            ? `Despertar consistente`
            : `Despertar variable`,
          description: wakeTimeAdherence.adherencePercentage >= 80
            ? `Cerca de la hora planificada`
            : `Varía ${wakeTimeAdherence.averageDifference} min`,
          metric: {
            actual: stats.avgWakeTime,
            expected: activePlan.schedule.wakeTime,
            difference: `${wakeTimeAdherence.averageDifference} min`,
            percentage: wakeTimeAdherence.adherencePercentage
          },
          icon: wakeTimeAdherence.adherencePercentage >= 80 ? '☀️' : '⏰',
          actionable: wakeTimeAdherence.adherencePercentage < 80
        })
      }
    }
  }

  // Insights de patrones (independientes del plan)
  
  // Duración total del sueño (solo si hay datos válidos)
  if (stats.totalSleepHours > 0) {
    const sleepQuality = evaluateSleepQuality(stats, child)
    insights.push({
      id: (insightId++).toString(),
      type: sleepQuality.isGood ? 'achievement' : 'pattern',
      category: 'quality',
      priority: sleepQuality.isGood ? 'low' : 'high',
      title: sleepQuality.title,
      description: sleepQuality.description,
      metric: {
        actual: `${stats.totalSleepHours.toFixed(1)} horas`,
        expected: `${sleepQuality.recommendedHours} horas`,
        difference: `${Math.abs(stats.totalSleepHours - sleepQuality.recommendedHours).toFixed(1)} horas`
      },
      icon: sleepQuality.isGood ? '😴' : '💤',
      actionable: !sleepQuality.isGood
    })
  }

  // Consistencia de horarios
  if (stats.bedtimeVariation > 30) {
    insights.push({
      id: (insightId++).toString(),
      type: 'pattern',
      category: 'consistency',
      priority: stats.bedtimeVariation > 45 ? 'high' : 'medium',
      title: 'Horarios irregulares',
      description: `Varía ${Math.round(stats.bedtimeVariation)} min entre días`,
      metric: {
        actual: `±${Math.round(stats.bedtimeVariation)} min`,
        expected: '±15 min',
        difference: `${Math.round(stats.bedtimeVariation - 15)} min`
      },
      icon: '🔄',
      actionable: true,
      action: {
        label: 'Mejorar consistencia',
        link: '#consistency'
      }
    })
  }

  // Despertares nocturnos
  if (stats.totalWakeups > 0) {
    const wakeupSeverity = stats.avgWakeupsPerNight > 2 ? 'high' : 
                          stats.avgWakeupsPerNight > 1 ? 'medium' : 'low'
    
    insights.push({
      id: (insightId++).toString(),
      type: 'pattern',
      category: 'quality',
      priority: wakeupSeverity,
      title: `Despertares nocturnos`,
      description: `${stats.avgWakeupsPerNight.toFixed(1)} por noche`,
      metric: {
        actual: stats.avgWakeupsPerNight.toFixed(1),
        expected: '0-1',
        difference: stats.totalWakeups
      },
      icon: '🌙',
      actionable: stats.avgWakeupsPerNight > 1,
      action: stats.avgWakeupsPerNight > 1 ? {
        label: 'Ver consejos',
        link: '#night-waking'
      } : undefined
    })
  }

  // Tiempo para dormirse
  const sleepDelayMinutes = parseSleepDelay(stats.bedtimeToSleepDifference)
  if (sleepDelayMinutes > 20 && stats.bedtimeToSleepDifference !== "--") {
    insights.push({
      id: (insightId++).toString(),
      type: 'pattern',
      category: 'quality',
      priority: sleepDelayMinutes > 30 ? 'high' : 'medium',
      title: 'Tarda en dormirse',
      description: `${stats.bedtimeToSleepDifference} después de acostarse`,
      metric: {
        actual: stats.bedtimeToSleepDifference,
        expected: '10-15 min',
        difference: `+${sleepDelayMinutes - 15} min`
      },
      icon: '⏱️',
      actionable: true,
      action: {
        label: 'Estrategias para dormir',
        link: '#sleep-strategies'
      }
    })
  }

  // Generar recomendaciones basadas en IA
  const aiRecommendations = await generateAIRecommendations({
    child,
    stats,
    activePlan,
    insights
  })

  // Agregar las recomendaciones de IA
  aiRecommendations.forEach(rec => {
    insights.push({
      id: (insightId++).toString(),
      type: 'recommendation',
      category: rec.category as any,
      priority: rec.priority as any,
      title: rec.title,
      description: rec.description,
      icon: '💡',
      actionable: true,
      action: rec.action
    })
  })

  // Ordenar insights por prioridad
  return insights.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })
}

// Funciones auxiliares para cálculos

function calculateBedtimeAdherence(stats: any, plan: ChildPlan) {
  if (!stats.avgBedtime || stats.avgBedtime === "--:--") return null

  const planBedtime = parseTime(plan.schedule.bedtime)
  const actualBedtime = parseTime(stats.avgBedtime)
  
  if (!planBedtime || !actualBedtime) return null

  const difference = Math.abs(actualBedtime - planBedtime)
  const adherencePercentage = Math.max(0, 100 - (difference / 60) * 100)

  return {
    averageDifference: difference,
    adherencePercentage: Math.round(adherencePercentage)
  }
}

function calculateWakeTimeAdherence(stats: any, plan: ChildPlan) {
  if (!stats.avgWakeTime || stats.avgWakeTime === "--:--") return null

  const planWakeTime = parseTime(plan.schedule.wakeTime)
  const actualWakeTime = parseTime(stats.avgWakeTime)
  
  if (!planWakeTime || !actualWakeTime) return null

  const difference = Math.abs(actualWakeTime - planWakeTime)
  const adherencePercentage = Math.max(0, 100 - (difference / 60) * 100)

  return {
    averageDifference: difference,
    adherencePercentage: Math.round(adherencePercentage)
  }
}

function parseTime(timeString: string): number | null {
  if (!timeString || timeString === "--:--") return null
  
  const [hours, minutes] = timeString.split(':').map(Number)
  return hours * 60 + minutes
}

function parseSleepDelay(delayString: string): number {
  if (!delayString || delayString === "--") return 0
  
  const match = delayString.match(/(\d+)/)
  return match ? parseInt(match[1]) : 0
}

function evaluateSleepQuality(stats: any, child: any) {
  // Calcular edad en meses
  const birthDate = child.birthDate ? new Date(child.birthDate) : null
  const ageInMonths = birthDate ? 
    Math.floor((new Date().getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)) : 
    null

  // Recomendaciones de horas de sueño por edad
  let recommendedHours = 10
  if (ageInMonths) {
    if (ageInMonths < 12) recommendedHours = 14
    else if (ageInMonths < 24) recommendedHours = 13
    else if (ageInMonths < 36) recommendedHours = 12
    else if (ageInMonths < 60) recommendedHours = 11
  }

  const isGood = Math.abs(stats.totalSleepHours - recommendedHours) <= 1

  return {
    isGood,
    recommendedHours,
    title: isGood 
      ? 'Sueño adecuado' 
      : stats.totalSleepHours < recommendedHours 
        ? 'Sueño insuficiente'
        : 'Exceso de sueño',
    description: isGood
      ? `Duerme lo recomendado`
      : `Recomendado: ${recommendedHours}h para su edad`
  }
}

// Función para generar recomendaciones con IA
async function generateAIRecommendations({
  child,
  stats,
  activePlan,
  insights
}: {
  child: any
  stats: any
  activePlan: ChildPlan | null
  insights: SleepInsight[]
}) {
  const systemPrompt = `Eres la Dra. Mariana, especialista en pediatría y sueño infantil.

Genera 1-2 recomendaciones ESPECÍFICAS y ACCIONABLES basadas en los datos de sueño del niño.

INFORMACIÓN DEL NIÑO:
- Nombre: ${child.firstName}
- Edad: ${calculateAgeInMonths(child.birthDate)} meses

ESTADÍSTICAS DE SUEÑO:
- Duración promedio: ${stats.totalSleepHours.toFixed(1)} horas
- Hora promedio de dormir: ${stats.avgBedtime}
- Hora promedio de despertar: ${stats.avgWakeTime}
- Despertares nocturnos: ${stats.avgWakeupsPerNight.toFixed(1)} por noche
- Tiempo para dormirse: ${stats.bedtimeToSleepDifference}

${activePlan ? `
PLAN ACTIVO:
- Hora de dormir planificada: ${activePlan.schedule.bedtime}
- Hora de despertar planificada: ${activePlan.schedule.wakeTime}
` : ''}

PROBLEMAS DETECTADOS:
${insights.filter(i => i.type === 'deviation' || i.type === 'pattern')
  .map(i => `- ${i.title}: ${i.description}`).join('\n')}

Genera recomendaciones en formato JSON:
[
  {
    "title": "Título muy corto (3-4 palabras)",
    "description": "Descripción breve (máximo 10 palabras)",
    "category": "schedule|quality|consistency|health",
    "priority": "high|medium|low",
    "action": {
      "label": "Texto del botón",
      "link": "#section"
    }
  }
]

Las recomendaciones deben ser:
- Título: Máximo 4 palabras
- Descripción: Máximo 10 palabras
- Específicas y prácticas
- Apropiadas para la edad`

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: "Genera 1-2 recomendaciones específicas basadas en los datos proporcionados. Títulos máximo 4 palabras, descripciones máximo 10 palabras."
        }
      ],
      max_tokens: 800,
      temperature: 0.7
    })

    const responseContent = completion.choices[0]?.message?.content || ""
    
    try {
      return JSON.parse(responseContent)
    } catch (parseError) {
      logger.error("Error parseando recomendaciones de IA:", parseError)
      return []
    }
  } catch (error) {
    logger.error("Error generando recomendaciones con IA:", error)
    return []
  }
}

function calculateAgeInMonths(birthDate: string | Date | undefined): number {
  if (!birthDate) return 0
  
  const birth = new Date(birthDate)
  const now = new Date()
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + 
                 (now.getMonth() - birth.getMonth())
  
  return Math.max(0, months)
}