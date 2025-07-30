// API para gestión de planes personalizados de niños
// Maneja Plan 0 (basado en survey + stats + RAG) y Planes subsecuentes (basados en transcript analysis)

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { getMongoDBVectorStoreManager } from "@/lib/rag/vector-store-mongodb"
import { OpenAI } from "openai"
import { differenceInDays, format, subDays } from "date-fns"
import { processSleepStatistics } from "@/lib/sleep-calculations"
import { createLogger } from "@/lib/logger"
import { ChildPlan } from "@/types/models"

const logger = createLogger("API:consultas:plans:route")

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// GET: Obtener todos los planes de un niño
export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación y permisos de admin
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const url = new URL(req.url)
    const childId = url.searchParams.get("childId")
    const userId = url.searchParams.get("userId")

    if (!childId || !userId) {
      return NextResponse.json({ 
        error: "Faltan parámetros requeridos: childId, userId" 
      }, { status: 400 })
    }

    logger.info("Obteniendo planes del niño", {
      childId,
      userId,
      adminId: session.user.id
    })

    const client = await clientPromise
    const db = client.db()
    
    // Obtener todos los planes del niño ordenados por planNumber
    const plans = await db.collection("child_plans")
      .find({ 
        childId: new ObjectId(childId),
        userId: new ObjectId(userId)
      })
      .sort({ planNumber: 1 })
      .toArray()

    logger.info("Planes obtenidos", {
      childId,
      totalPlanes: plans.length,
      planNumbers: plans.map(p => p.planNumber)
    })

    return NextResponse.json({
      success: true,
      plans,
      totalCount: plans.length
    })

  } catch (error) {
    logger.error("Error obteniendo planes:", error)
    return NextResponse.json({ 
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : "Error desconocido"
    }, { status: 500 })
  }
}

// POST: Generar nuevo plan (Plan 0 o Plan N+1)
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
        error: "Faltan parámetros requeridos: userId, childId, planType" 
      }, { status: 400 })
    }

    if (planType === "transcript_based" && !reportId) {
      return NextResponse.json({ 
        error: "Para planes basados en transcript se requiere el reportId del análisis" 
      }, { status: 400 })
    }

    logger.info("Iniciando generación de plan", {
      userId,
      childId,
      planType,
      reportId,
      adminId: session.user.id
    })

    const client = await clientPromise
    const db = client.db()

    // Verificar planes existentes
    const existingPlans = await db.collection("child_plans")
      .find({ 
        childId: new ObjectId(childId),
        userId: new ObjectId(userId)
      })
      .sort({ planNumber: -1 })
      .toArray()

    const nextPlanNumber = existingPlans.length > 0 ? existingPlans[0].planNumber + 1 : 0

    // Validaciones específicas por tipo de plan
    if (planType === "initial" && existingPlans.length > 0) {
      return NextResponse.json({ 
        error: "Ya existe un plan inicial para este niño" 
      }, { status: 400 })
    }

    if (planType === "transcript_based" && existingPlans.length === 0) {
      return NextResponse.json({ 
        error: "Debe existir un plan inicial antes de crear planes basados en transcript" 
      }, { status: 400 })
    }

    let generatedPlan: ChildPlan

    if (planType === "initial") {
      // Generar Plan 0 basado en survey + stats + RAG
      generatedPlan = await generateInitialPlan(userId, childId, session.user.id)
    } else {
      // Generar Plan N+1 basado en reporte de análisis
      generatedPlan = await generateTranscriptBasedPlan(
        userId, 
        childId, 
        reportId, 
        nextPlanNumber, 
        existingPlans[0].planNumber,
        session.user.id
      )
    }

    // Marcar planes anteriores como superseded (excepto el más reciente)
    if (existingPlans.length > 0) {
      await db.collection("child_plans").updateMany(
        { 
          childId: new ObjectId(childId),
          userId: new ObjectId(userId),
          planNumber: { $lt: nextPlanNumber }
        },
        { 
          $set: { 
            status: "superseded",
            updatedAt: new Date()
          } 
        }
      )
    }

    // Guardar el nuevo plan
    const result = await db.collection("child_plans").insertOne({
      ...generatedPlan,
      planNumber: nextPlanNumber,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: "active"
    })

    const totalProcessingTime = Date.now() - startTime

    logger.info("Plan generado exitosamente", {
      planId: result.insertedId,
      planNumber: nextPlanNumber,
      planType,
      childId,
      processingTime: totalProcessingTime
    })

    return NextResponse.json({
      success: true,
      planId: result.insertedId,
      plan: {
        ...generatedPlan,
        _id: result.insertedId,
        planNumber: nextPlanNumber,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "active"
      },
      metadata: {
        processingTime: totalProcessingTime,
        planNumber: nextPlanNumber,
        totalPlans: existingPlans.length + 1
      }
    })

  } catch (error) {
    const totalProcessingTime = Date.now() - startTime
    logger.error("Error generando plan", {
      error: error instanceof Error ? error.message : "Error desconocido",
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: totalProcessingTime
    })
    
    return NextResponse.json({ 
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : "Error desconocido"
    }, { status: 500 })
  }
}

// Función para generar Plan 0 (inicial) basado en survey + stats + RAG
async function generateInitialPlan(userId: string, childId: string, adminId: string): Promise<ChildPlan> {
  logger.info("Generando plan inicial", { userId, childId })

  const client = await clientPromise
  const db = client.db()
  
  // 1. Obtener datos del niño con survey
  const child = await db.collection("children").findOne({
    _id: new ObjectId(childId),
    parentId: userId,
  })

  if (!child) {
    throw new Error("No se encontró información del niño")
  }

  // 2. Calcular estadísticas del niño
  const events = await db.collection("events").find({
    childId: new ObjectId(childId),
  }).sort({ startTime: -1 }).toArray()

  const statsStartDate = subDays(new Date(), 30)
  const stats = processSleepStatistics(events, statsStartDate)
  
  const birthDate = child.birthDate ? new Date(child.birthDate) : null
  const ageInMonths = birthDate ? Math.floor(differenceInDays(new Date(), birthDate) / 30.44) : null

  // 3. Buscar información relevante en RAG
  const ragContext = await searchRAGForPlan(ageInMonths)
  
  // 4. Generar plan con IA
  const aiPlan = await generatePlanWithAI({
    planType: "initial",
    childData: {
      ...child,
      ageInMonths,
      stats,
      events
    },
    ragContext,
    surveyData: child.surveyData
  })

  return {
    childId: new ObjectId(childId),
    userId: new ObjectId(userId),
    planNumber: 0,
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
      totalEvents: events.length
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: new ObjectId(adminId),
    status: "active"
  }
}

// Función para generar Plan N+1 basado en reporte de análisis (enfocado en cambios)
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
    planNumber 
  })

  const client = await clientPromise
  const db = client.db()
  
  // 1. Obtener el reporte de análisis completo
  const consultationReport = await db.collection("consultation_reports").findOne({
    _id: new ObjectId(reportId),
    childId: new ObjectId(childId)
  })

  if (!consultationReport) {
    throw new Error("No se encontró el reporte de análisis")
  }

  // 2. Obtener el plan anterior
  const previousPlan = await db.collection("child_plans").findOne({
    childId: new ObjectId(childId),
    userId: new ObjectId(userId),
    planNumber: previousPlanNumber
  })

  if (!previousPlan) {
    throw new Error("No se encontró el plan anterior")
  }

  // 3. Obtener datos básicos del niño
  const child = await db.collection("children").findOne({
    _id: new ObjectId(childId)
  })

  if (!child) {
    throw new Error("No se encontró información del niño")
  }

  // 4. Generar nuevo plan enfocado en cambios del análisis
  const aiPlan = await generatePlanWithAI({
    planType: "transcript_based",
    childData: child,
    previousPlan,
    transcriptAnalysis: {
      analysis: consultationReport.analysis,
      recommendations: consultationReport.recommendations,
      transcript: consultationReport.transcript
    }
  })

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
      previousPlanNumber
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: new ObjectId(adminId),
    status: "active"
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

Responde en el siguiente formato JSON:
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
      return {
        analysis: responseContent,
        recommendations: "Ver análisis para recomendaciones específicas."
      }
    }
  } catch (error) {
    logger.error("Error en análisis ligero de transcript:", error)
    throw new Error("Error al procesar el análisis del transcript")
  }
}

// Función para buscar información relevante en RAG para planes
async function searchRAGForPlan(ageInMonths: number | null) {
  try {
    const vectorStore = getMongoDBVectorStoreManager()
    
    const searchQueries = [
      `rutina de sueño para niños de ${ageInMonths} meses`,
      "horarios de comida infantil",
      "actividades para desarrollo infantil",
      "siestas apropiadas por edad",
      "rutinas de acostarse"
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
  transcriptAnalysis
}: {
  planType: "initial" | "transcript_based"
  childData: any
  ragContext?: any[]
  surveyData?: any
  previousPlan?: any
  transcriptAnalysis?: any
}) {
  let systemPrompt = ""

  if (planType === "initial") {
    systemPrompt = `Eres la Dra. Mariana, especialista en pediatría y desarrollo infantil. 

Genera un PLAN DETALLADO Y ESTRUCTURADO para ${childData.firstName} (${childData.ageInMonths} meses).

INFORMACIÓN DEL NIÑO:
- Edad: ${childData.ageInMonths} meses
- Eventos de sueño registrados: ${childData.events?.length || 0}
- Duración promedio de sueño: ${childData.stats?.avgSleepDurationMinutes || 0} minutos
- Hora promedio de despertar: ${Math.floor((childData.stats?.avgWakeTimeMinutes || 0) / 60)}:${((childData.stats?.avgWakeTimeMinutes || 0) % 60).toString().padStart(2, "0")}

${surveyData ? `
DATOS DEL CUESTIONARIO:
- Rutina antes de acostarse: ${surveyData.rutinaHabitos?.rutinaAntesAcostarse}
- Hora específica de dormir: ${surveyData.rutinaHabitos?.horaDormir}
- Hace siestas: ${surveyData.rutinaHabitos?.haceSiestas ? 'Sí' : 'No'}
- Donde duerme: ${surveyData.rutinaHabitos?.dondeDuermeNoche}
` : ''}

${ragContext ? `
CONOCIMIENTO ESPECIALIZADO:
${ragContext.map(doc => `Fuente: ${doc.source}\nContenido: ${doc.content}`).join("\n\n---\n\n")}
` : ''}

INSTRUCCIONES:
1. Crea un plan DETALLADO con horarios específicos
2. Incluye horarios para: dormir, despertar, comidas, actividades y siestas
3. Adapta las recomendaciones a la edad del niño
4. Proporciona objetivos claros y medibles
5. Incluye recomendaciones específicas para los padres

Responde en el siguiente formato JSON:
{
  "schedule": {
    "bedtime": "20:00",
    "wakeTime": "07:00",
    "meals": [
      {"time": "07:30", "type": "desayuno", "description": "Descripción del desayuno"},
      {"time": "12:00", "type": "almuerzo", "description": "Descripción del almuerzo"},
      {"time": "16:00", "type": "merienda", "description": "Descripción de la merienda"},
      {"time": "19:00", "type": "cena", "description": "Descripción de la cena"}
    ],
    "activities": [
      {"time": "08:00", "activity": "jugar", "duration": 30, "description": "Descripción de la actividad"},
      {"time": "17:00", "activity": "leer", "duration": 20, "description": "Descripción de la actividad"}
    ],
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
  } else {
    systemPrompt = `Eres la Dra. Mariana, especialista en pediatría y desarrollo infantil.

ACTUALIZA EL PLAN EXISTENTE para ${childData.firstName} basándote en el análisis de la sesión más reciente.

PLAN ANTERIOR:
${JSON.stringify(previousPlan.schedule, null, 2)}

ANÁLISIS DE LA ÚLTIMA SESIÓN:
Análisis: ${transcriptAnalysis.analysis}
Recomendaciones: ${transcriptAnalysis.recommendations}

TRANSCRIPT DE LA SESIÓN:
${transcriptAnalysis.transcript.substring(0, 500)}...

INSTRUCCIONES:
1. Revisa el plan anterior y el análisis de la sesión
2. Identifica áreas de mejora basadas en el transcript
3. Ajusta horarios si es necesario
4. Mantén la estructura general pero haz mejoras específicas
5. Enfócate en los problemas identificados en la sesión

Responde en el siguiente formato JSON:
{
  "schedule": {
    "bedtime": "20:00",
    "wakeTime": "07:00",
    "meals": [...],
    "activities": [...],
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
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",  
          content: `Genera el plan detallado siguiendo exactamente el formato JSON especificado.`,
        },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    })

    const responseContent = completion.choices[0]?.message?.content || ""
    
    try {
      return JSON.parse(responseContent)
    } catch (parseError) {
      logger.error("Error parseando respuesta de IA:", parseError)
      throw new Error("Error al procesar la respuesta de la IA")
    }
  } catch (error) {
    logger.error("Error generando plan con IA:", error)
    throw new Error("Error al procesar el plan con IA")
  }
}