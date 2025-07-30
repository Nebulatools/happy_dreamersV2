// API para análisis inteligente de consultas
// Combina transcript + estadísticas del niño + knowledge base RAG

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { getMongoDBVectorStoreManager } from "@/lib/rag/vector-store-mongodb"
import { OpenAI } from "openai"
import { differenceInDays, format, parseISO, subDays } from "date-fns"
import { processSleepStatistics } from "@/lib/sleep-calculations"
import { createLogger } from "@/lib/logger"

const logger = createLogger("API:consultas:analyze:route")


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  const processingSteps = {
    transcript: false,
    childStats: false,
    ragContext: false,
    consultationHistory: false,
    aiAnalysis: false
  }
  
  try {
    // Verificar autenticación y permisos de admin
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { userId, childId, transcript } = await req.json()

    if (!userId || !childId || !transcript) {
      return NextResponse.json({ 
        error: "Faltan parámetros requeridos: userId, childId, transcript", 
      }, { status: 400 })
    }

    // 📊 LOG DE ENTRADA
    logger.info("Iniciando análisis de consulta", {
      userId,
      childId,
      transcriptLength: transcript.length,
      adminId: session.user.id,
      requestTimestamp: new Date().toISOString()
    })

    processingSteps.transcript = true

    // 1. Obtener datos del niño y estadísticas
    const stepStartTime = Date.now()
    const childData = await getChildWithStats(userId, childId)
    if (!childData) {
      logger.error("No se encontró información del niño", { userId, childId })
      return NextResponse.json({ 
        error: "No se pudo obtener la información del niño", 
      }, { status: 404 })
    }
    
    processingSteps.childStats = true
    logger.info("Estadísticas del niño calculadas", {
      childId,
      childName: `${childData.firstName} ${childData.lastName}`,
      ageInMonths: childData.ageInMonths,
      totalEvents: childData.stats.totalEvents,
      recentEvents: childData.stats.recentEvents,
      avgSleepDuration: childData.stats.avgSleepDuration,
      avgWakeTime: childData.stats.avgWakeTime,
      statsFromDate: childData.statsFromDate?.toISOString(),
      lastConsultationDate: childData.lastConsultationDate?.toISOString(),
      calculationMethod: "unified_with_dashboard",
      processingTime: Date.now() - stepStartTime
    })

    // 2. Generar análisis SOLO del transcript (sin RAG, sin historial)
    const aiStartTime = Date.now()
    const analysis = await generateTranscriptOnlyAnalysis({
      transcript,
      childData,
    })
    processingSteps.aiAnalysis = true
    
    logger.info("Análisis con IA completado", {
      analysisLength: analysis.analysis?.length || 0,
      recommendationsLength: analysis.recommendations?.length || 0,
      processingTime: Date.now() - aiStartTime
    })

    // 5. Guardar el reporte en la base de datos
    const reportId = await saveConsultationReport({
      userId,
      childId,
      transcript,
      analysis,
      adminId: session.user.id,
    })

    // 📊 LOG DE COMPLETITUD FINAL
    const totalProcessingTime = Date.now() - startTime
    logger.info("Análisis de consulta completado exitosamente", {
      reportId,
      totalProcessingTime,
      stepsCompleted: processingSteps,
      sourcesUsed: {
        transcript: processingSteps.transcript,
        childStatistics: processingSteps.childStats,
        aiAnalysis: processingSteps.aiAnalysis
      },
      dataQuality: {
        transcriptLength: transcript.length,
        statsEventsCount: childData.stats.totalEvents,
        analysisMode: "transcript_only",
        allSourcesUsed: Object.values(processingSteps).every(step => step)
      },
      performance: {
        totalTime: totalProcessingTime,
        avgTimePerStep: totalProcessingTime / Object.keys(processingSteps).length
      }
    })

    return NextResponse.json({
      success: true,
      reportId,
      analysis: analysis.analysis,
      recommendations: analysis.recommendations,
      childContext: {
        name: `${childData.firstName} ${childData.lastName}`,
        ageInMonths: childData.ageInMonths,
        totalEvents: childData.stats.totalEvents,
      },
      metadata: {
        processingTime: totalProcessingTime,
        sourcesUsed: Object.values(processingSteps).filter(Boolean).length,
        dataQuality: {
          allSourcesUsed: Object.values(processingSteps).every(step => step),
          statsFromDate: childData.statsFromDate?.toISOString(),
          statsMethod: "unified_with_dashboard"
        }
      }
    })

  } catch (error) {
    const totalProcessingTime = Date.now() - startTime
    logger.error("Error en análisis de consulta", {
      error: error instanceof Error ? error.message : "Error desconocido",
      stack: error instanceof Error ? error.stack : undefined,
      processingSteps,
      totalProcessingTime,
      failedAt: Object.entries(processingSteps).find(([_, completed]) => !completed)?.[0] || "unknown"
    })
    
    return NextResponse.json({ 
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : "Error desconocido",
    }, { status: 500 })
  }
}

// Función para obtener datos del niño con estadísticas calculadas usando lógica unificada
async function getChildWithStats(userId: string, childId: string) {
  try {
    const client = await clientPromise
    const db = client.db()
    
    // Obtener información básica del niño
    const child = await db.collection("children").findOne({
      _id: new ObjectId(childId),
      parentId: userId,
    })

    if (!child) return null

    // Obtener la fecha de la última consulta
    const lastConsultation = await db.collection("consultation_reports")
      .findOne(
        { childId: new ObjectId(childId) },
        { sort: { createdAt: -1 } }
      )

    // Determinar fecha de inicio para estadísticas
    const now = new Date()
    let statsStartDate: Date
    
    if (lastConsultation) {
      // Si hay consulta previa, usar desde esa fecha
      statsStartDate = new Date(lastConsultation.createdAt)
      logger.info("📊 Usando estadísticas desde última consulta", {
        lastConsultationDate: lastConsultation.createdAt,
        statsFromDate: statsStartDate.toISOString()
      })
    } else {
      // Si no hay consulta previa, usar últimos 30 días como fallback
      statsStartDate = subDays(now, 30)
      logger.info("📊 Primera consulta - usando estadísticas de últimos 30 días", {
        statsFromDate: statsStartDate.toISOString()
      })
    }

    // Obtener todos los eventos del niño
    const events = await db.collection("events").find({
      childId: new ObjectId(childId),
    }).sort({ startTime: -1 }).toArray()

    logger.info("📅 Eventos del niño obtenidos", {
      totalEvents: events.length,
      eventTypes: [...new Set(events.map(e => e.eventType))],
      dateRange: {
        oldest: events[events.length - 1]?.startTime,
        newest: events[0]?.startTime
      }
    })

    // 🔧 USAR LÓGICA UNIFICADA DE SLEEP-CALCULATIONS
    const stats = processSleepStatistics(events, statsStartDate)
    
    // Calcular edad en meses
    const birthDate = child.birthDate ? new Date(child.birthDate) : null
    const ageInMonths = birthDate ? Math.floor(differenceInDays(new Date(), birthDate) / 30.44) : null

    logger.info("✅ Estadísticas calculadas con lógica unificada", {
      avgSleepDuration: stats.avgSleepDuration,
      avgWakeTime: stats.avgWakeTime,
      totalEvents: stats.totalEvents,
      recentEvents: stats.recentEvents,
      dominantMood: stats.dominantMood,
      method: "processSleepStatistics_unified"
    })

    return {
      ...child,
      ageInMonths,
      events,
      stats,
      lastConsultationDate: lastConsultation?.createdAt,
      statsFromDate: statsStartDate,
    }
  } catch (error) {
    logger.error("Error obteniendo datos del niño:", error)
    return null
  }
}

// FUNCIÓN ELIMINADA: calculateChildStats() 
// Ahora usamos processSleepStatistics() de /lib/sleep-calculations.ts 
// para mantener consistencia con el dashboard de sleep-statistics

// Función para buscar en el knowledge base RAG
async function searchRAGKnowledge(transcript: string) {
  try {
    const vectorStore = getMongoDBVectorStoreManager()
    
    // Extraer conceptos clave del transcript para búsqueda
    const searchQueries = [
      transcript.substring(0, 200), // Primeras líneas del transcript
      "patrones de sueño infantil",
      "desarrollo del niño",
      "problemas de sueño",
    ]

    let allResults: any[] = []
    
    for (const query of searchQueries) {
      const results = await vectorStore.searchSimilar(query, 2)
      allResults = [...allResults, ...results]
    }

    // Eliminar duplicados y tomar los mejores resultados
    const uniqueResults = allResults.filter((item, index, arr) => 
      index === arr.findIndex(t => t.metadata?.source === item.metadata?.source)
    ).slice(0, 5)

    return uniqueResults.map(doc => ({
      source: doc.metadata?.source || "documento",
      content: doc.pageContent,
    }))
  } catch (error) {
    logger.error("Error en búsqueda RAG:", error)
    return []
  }
}

// Función para obtener consultas anteriores
async function getPreviousConsultations(childId: string) {
  try {
    const client = await clientPromise
    const db = client.db()
    
    const previousConsultations = await db.collection("consultation_reports")
      .find({ childId: new ObjectId(childId) })
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray()

    return previousConsultations.map(consultation => ({
      date: format(consultation.createdAt, "dd/MM/yyyy"),
      summary: consultation.analysis?.substring(0, 200) + "...",
      recommendations: consultation.recommendations?.substring(0, 150) + "...",
    }))
  } catch (error) {
    logger.error("Error obteniendo consultas anteriores:", error)
    return []
  }
}

// Función para generar análisis SOLO del transcript (sin RAG, sin historial)
async function generateTranscriptOnlyAnalysis({
  transcript,
  childData,
}: {
  transcript: string
  childData: any
}) {
  const systemPrompt = `Eres la Dra. Mariana, especialista en pediatría y desarrollo infantil.

INFORMACIÓN BÁSICA DEL NIÑO:
- Nombre: ${childData.firstName} ${childData.lastName}
- Edad: ${childData.ageInMonths} meses

INSTRUCCIONES ESPECÍFICAS:
Analiza ÚNICAMENTE el transcript de esta consulta para extraer información clave que será usada para actualizar el plan del niño.

ENFÓCATE ESPECÍFICAMENTE EN:

✅ CAMBIOS DE HORARIOS EXPLÍCITOS:
   - Hora de despertar (ej: "cambiar despertar a las 7:40 AM")
   - Hora de acostarse/dormir (ej: "acostarse a las 8:00 PM") 
   - Horarios de comidas específicos mencionados
   - Horarios de siestas (hora y duración)
   - Límites de tiempo de pantalla
   - Cualquier horario específico que el médico recomiende cambiar

✅ PROGRESO Y PROBLEMAS:
   - Mejoras reportadas por los padres
   - Dificultades actuales que persisten
   - Nuevos problemas identificados

✅ RECOMENDACIONES DEL MÉDICO:
   - Cambios específicos recomendados
   - Ajustes en rutinas
   - Nuevas estrategias sugeridas

⚠️ REGLAS IMPORTANTES:
- Solo extrae lo que está EXPLÍCITAMENTE mencionado
- Incluye horarios EXACTOS cuando se mencionen
- NO agregues información externa
- Enfócate en información ÚTIL para actualizar el plan

Responde en el siguiente formato JSON:
{
  "analysis": "Análisis en texto plano de los puntos clave del transcript: cambios de horarios mencionados (con horarios exactos), progreso reportado por los padres, problemas identificados y recomendaciones específicas del médico. Escribe todo en párrafos normales, no en formato JSON u objeto.",
  "recommendations": "Recomendaciones en texto plano extraídas del transcript, incluyendo todos los cambios específicos de horarios mencionados por el médico (despertar, dormir, comidas, siestas, etc.) con horarios exactos. Escribe en párrafos normales."
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
          content: `TRANSCRIPT DE LA CONSULTA MÉDICA:

${transcript}

Analiza SOLO este transcript y extrae los cambios de horarios específicos, problemas identificados, progreso reportado y recomendaciones del médico.`,
        },
      ],
      max_tokens: 1200,
      temperature: 0.2, // Temperatura muy baja para máxima precisión
    })

    const responseContent = completion.choices[0]?.message?.content || ""
    
    try {
      return JSON.parse(responseContent)
    } catch (parseError) {
      logger.error("Error parseando respuesta de IA:", parseError)
      return {
        analysis: responseContent,
        recommendations: "Ver análisis para recomendaciones específicas."
      }
    }
  } catch (error) {
    logger.error("Error generando análisis:", error)
    throw new Error("Error al procesar el análisis con IA")
  }
}

// Función para guardar el reporte de consulta
async function saveConsultationReport({
  userId,
  childId,
  transcript,
  analysis,
  adminId,
}: {
  userId: string
  childId: string
  transcript: string
  analysis: any
  adminId: string
}) {
  try {
    const client = await clientPromise
    const db = client.db()
    
    const report = {
      userId: new ObjectId(userId),
      childId: new ObjectId(childId),
      adminId: new ObjectId(adminId),
      transcript,
      analysis: analysis.analysis,
      recommendations: analysis.recommendations,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("consultation_reports").insertOne(report)
    return result.insertedId
  } catch (error) {
    logger.error("Error guardando reporte:", error)
    throw new Error("Error al guardar el reporte de consulta")
  }
}