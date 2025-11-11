// @ts-nocheck
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { getMongoDBVectorStoreManager } from "@/lib/rag/vector-store-mongodb"
import { differenceInDays, differenceInMinutes, parseISO, subDays } from "date-fns"
import { ChatOpenAI } from "@langchain/openai"
import { DynamicStructuredTool } from "@langchain/core/tools"
import { z } from "zod"
import { createLogger } from "@/lib/logger"
import { SystemMessage, HumanMessage } from "@langchain/core/messages"
import { getChildPlanContext, getAllPlansContext } from "@/lib/rag/plan-context-builder"
import { checkRateLimit } from "@/lib/rag/rate-limiter"

const logger = createLogger('RAGChatAPI')

// 🎛️ CONFIGURACIÓN DE LOGGING PROFESIONAL
const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const DEBUG_ENABLED = process.env.DEBUG_RAG === 'true'
const VERBOSE_LOGGING = !IS_PRODUCTION || DEBUG_ENABLED

// Helper para logging condicional
const logInfo = (...args: any[]) => {
  if (VERBOSE_LOGGING) logger.info(...args)
}
const logDebug = (...args: any[]) => {
  if (DEBUG_ENABLED) logger.debug(...args)
}

// 📦 CACHE INTELIGENTE PARA RAG (Optimización Profesional)
const ragCache = new Map<string, { result: any, timestamp: number, hitCount: number }>()
const CACHE_TTL = 15 * 60 * 1000 // 15 minutos
const MAX_CACHE_SIZE = 100 // Máximo 100 entradas en cache

// Función para limpiar cache automáticamente
function cleanExpiredCache() {
  const now = Date.now()
  for (const [key, value] of ragCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      ragCache.delete(key)
    }
  }
  
  // Si el cache está muy grande, eliminar las entradas menos usadas
  if (ragCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(ragCache.entries())
      .sort((a, b) => a[1].hitCount - b[1].hitCount)
    
    // Eliminar el 20% de las entradas menos usadas
    const toDelete = Math.floor(entries.length * 0.2)
    for (let i = 0; i < toDelete; i++) {
      ragCache.delete(entries[i][0])
    }
  }
}

// 🗓️ HELPER PARA CONVERTIR NOMBRES DE MESES
function getMonthIndex(monthName: string): number {
  const months = {
    'january': 0, 'enero': 0,
    'february': 1, 'febrero': 1,
    'march': 2, 'marzo': 2,
    'april': 3, 'abril': 3,
    'may': 4, 'mayo': 4,
    'june': 5, 'junio': 5,
    'july': 6, 'julio': 6,
    'august': 7, 'agosto': 7,
    'september': 8, 'septiembre': 8,
    'october': 9, 'octubre': 9,
    'november': 10, 'noviembre': 10,
    'december': 11, 'diciembre': 11
  };
  return months[monthName.toLowerCase()] ?? -1;
}

// 📅 FUNCIÓN PARA FILTRAR EVENTOS POR PERIODO
function filterEventsByPeriod(events: any[], period?: string): any[] {
  if (!period || period === 'all') {
    logger.info(`Sin filtro de periodo - usando todos los eventos: ${events.length}`)
    return events;
  }
  
  const now = new Date();
  let filteredEvents: any[] = [];
  
  if (period.includes('-')) {
    // Formato: "july-2025", "june-2024"
    const [monthName, yearStr] = period.split('-');
    const monthIndex = getMonthIndex(monthName);
    const targetYear = parseInt(yearStr);
    
    if (monthIndex === -1) {
      logger.warn(`Mes no reconocido: ${monthName}`);
      return events;
    }
    
    filteredEvents = events.filter(event => {
      const eventDate = new Date(event.startTime);
      return eventDate.getMonth() === monthIndex && 
             eventDate.getFullYear() === targetYear;
    });
    
    logger.info(`Filtrado por ${monthName} ${yearStr}: ${filteredEvents.length} eventos de ${events.length} totales`);
    
  } else if (period === 'last-7-days') {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    filteredEvents = events.filter(event => 
      new Date(event.startTime) >= sevenDaysAgo
    );
    logger.info(`Filtrado últimos 7 días: ${filteredEvents.length} eventos`);
    
  } else if (period === 'current-month') {
    filteredEvents = events.filter(event => {
      const eventDate = new Date(event.startTime);
      return eventDate.getMonth() === now.getMonth() && 
             eventDate.getFullYear() === now.getFullYear();
    });
    logger.info(`Filtrado mes actual: ${filteredEvents.length} eventos`);
    
  } else if (period === 'since-current-plan') {
    // Este caso especial se maneja en el tool, aquí solo retornamos todos los eventos
    logger.info(`Periodo since-current-plan - se procesará en el tool con fecha del plan actual`);
    return events;
  } else {
    logger.warn(`Periodo no reconocido: ${period}`);
    return events;
  }
  
  return filteredEvents;
}

// 🔍 HELPER PARA EXTRAER KEYWORDS RELEVANTES PARA RAG
function extractRelevantKeywords(question: string): string {
  // Mantener la pregunta original pero reformular para RAG si es muy específica
  const lowerQuestion = question.toLowerCase()
  
  // Si la pregunta es muy específica sobre el niño, agregar contexto médico
  if (lowerQuestion.includes('mi niño') || lowerQuestion.includes('mi hijo') || 
      lowerQuestion.includes('alejandro') || lowerQuestion.includes('cómo está')) {
    return question + " desarrollo infantil sueño pediátrico"
  }
  
  // Si pregunta sobre plan, agregar contexto
  if (lowerQuestion.includes('plan')) {
    return question + " plan sueño rutina infantil"
  }
  
  // Para estadísticas, agregar contexto de sueño
  if (lowerQuestion.includes('estadísticas') || lowerQuestion.includes('duerme') || 
      lowerQuestion.includes('horas')) {
    return question + " sueño infantil estadísticas"
  }
  
  // Por defecto, usar la pregunta original
  return question
}

// ✅ SISTEMA SIMPLIFICADO - YA NO NECESITAMOS MULTI-AGENT STATE COMPLEJO

// 🎯 DEFINICIÓN DE HERRAMIENTAS PARA LOS AGENTES
const ragSearchTool = new DynamicStructuredTool({
  name: "rag_search",
  description: "Busca información en documentos especializados sobre desarrollo infantil, sueño, alimentación y técnicas de crianza",
  schema: z.object({
    query: z.string().describe("La consulta para buscar en los documentos especializados"),
  }),
  func: async ({ query }) => {
    try {
      // 📦 VERIFICAR CACHE PRIMERO (Optimización Profesional)
      const cacheKey = `rag:${query.toLowerCase().trim()}`
      const cached = ragCache.get(cacheKey)
      
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        cached.hitCount++
        logInfo(`📦 Cache HIT para: "${query}" (usado ${cached.hitCount} veces)`)
        return cached.result
      }
      
      logInfo(`🔍 Buscando en RAG: "${query}"`)
      
      // Limpiar cache automáticamente cada vez que hacemos búsqueda nueva
      cleanExpiredCache()
      
      const vectorStore = getMongoDBVectorStoreManager()
      const results = await vectorStore.searchSimilar(query, 3)
      
      if (results.length === 0) {
        logInfo(`❌ No se encontraron documentos relevantes para: "${query}"`)
        return "No se encontró información relevante en los documentos"
      }

      // 📋 LOGGING DETALLADO DE DOCUMENTOS ENCONTRADOS (SIEMPRE EN DESARROLLO)
      logInfo(`✅ Encontrados ${results.length} documentos relevantes para: "${query}"`)
      
      // Mostrar fuentes SIEMPRE en desarrollo para debugging
      if (VERBOSE_LOGGING) {
        results.forEach((doc: any, i: number) => {
          const metadata = doc.metadata as any
          const source = metadata.source || 'Fuente desconocida'
          const similarity = doc.score ? ` (similitud: ${(doc.score * 100).toFixed(1)}%)` : ''
          logger.info(`   📄 ${i + 1}. ${source}${similarity}`)
          logger.info(`      📝 Preview: ${doc.pageContent.substring(0, 100)}...`)
        })
      }

      const ragContext = results.map((doc: any, i: number) => {
        const metadata = doc.metadata as any
        return `Fuente: ${metadata.source}\nContenido: ${doc.pageContent}`
      }).join("\n\n---\n\n")

      // 📦 GUARDAR EN CACHE (Optimización Profesional)
      ragCache.set(cacheKey, {
        result: ragContext,
        timestamp: Date.now(),
        hitCount: 1
      })
      logInfo(`💾 Resultado guardado en cache para: "${query}"`)

      return ragContext
    } catch (error) {
      logger.error(`❌ Error buscando en RAG para "${query}":`, error)
      return "Error al buscar en los documentos"
    }
  },
})

const childDataTool = new DynamicStructuredTool({
  name: "child_data_search",
  description: "Busca estadísticas procesadas del niño: promedios de sueño, patrones, métricas calculadas para un periodo específico",
  schema: z.object({
    childId: z.string().describe("ID del niño"),
    userId: z.string().describe("ID del usuario padre"),
    dataType: z.string().describe("Tipo de datos: 'stats', 'patterns', 'metrics'"),
    period: z.string().optional().describe("Periodo detectado: 'july-2025', 'june-2025', 'august-2024', 'last-7-days', 'current-month', 'all'"),
  }),
  func: async ({ childId, userId, dataType, period }) => {
    try {
      logDebug('childDataTool invocado', { childId, userId, dataType, period })
      
      if (!childId || childId === "null" || childId === "") {
        logger.warn('childId inválido o no proporcionado')
        return "Por favor selecciona un niño específico para obtener sus estadísticas"
      }

      // 📊 ACCESO DIRECTO A LA BASE DE DATOS (MÁS EFICIENTE QUE FETCH)
      const { db } = await connectToDatabase()
      
      const childDoc = await db.collection("children").findOne({
        _id: new ObjectId(childId),
        parentId: userId,
      })
      
      if (!childDoc) {
        logger.warn('Niño no encontrado en la base de datos', { childId })
        return "No se encontró información del niño"
      }
      
      logInfo('Niño encontrado', { name: `${childDoc.firstName} ${childDoc.lastName}` })
      
      const events = childDoc.events || []
      logDebug('Eventos encontrados', { count: events.length })
      
      // 📅 FILTRAR EVENTOS POR PERIODO SI SE ESPECIFICÓ
      let filteredEvents = filterEventsByPeriod(events, period)
      
      // 🎯 LÓGICA ESPECIAL PARA ESTADÍSTICAS COHERENTES CON PLANES
      if (period === 'since-current-plan') {
        // Obtener fecha del plan actual para filtrar eventos desde que empezó
        const currentPlanDate = await getCurrentPlanDate(childId, userId)
        if (currentPlanDate) {
          filteredEvents = events.filter(event => 
            new Date(event.startTime) >= currentPlanDate
          )
          logInfo(`📊 Estadísticas desde plan actual (${currentPlanDate.toLocaleDateString()}): ${filteredEvents.length} eventos`)
        } else {
          // Si no hay plan actual, usar últimos 30 días
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          filteredEvents = events.filter(event => 
            new Date(event.startTime) >= thirtyDaysAgo
          )
          logInfo(`📊 No hay plan actual - usando últimos 30 días: ${filteredEvents.length} eventos`)
        }
      }
      
      // 🧮 PROCESAR ESTADÍSTICAS CON EVENTOS FILTRADOS
      const sleepStats = await processSleepStatistics(filteredEvents)
      
      // 🏗️ CONSTRUIR CONTEXTO CON INFORMACIÓN DEL PERIODO
      let context = buildProcessedStatsContext(childDoc, sleepStats)
      
      if (period && period !== 'all') {
        context += `\n📅 PERIODO ANALIZADO: ${period}\n`
        context += `📊 Eventos en este periodo: ${filteredEvents.length} de ${events.length} totales\n`
      }
      
      return context
    } catch (error) {
      logger.error('Error en childDataTool', error)
      return "Error al acceder a las estadísticas del niño"
    }
  },
})

const childPlanTool = new DynamicStructuredTool({
  name: "child_plan_search",
  description: "Obtiene información del plan de sueño activo del niño: horarios, actividades, recomendaciones específicas",
  schema: z.object({
    childId: z.string().describe("ID del niño"),
    userId: z.string().describe("ID del usuario padre"),
    infoType: z.string().describe("Tipo de información: 'full_plan', 'schedule', 'recommendations', 'summary'"),
  }),
  func: async ({ childId, userId, infoType }) => {
    try {
      logger.debug('childPlanTool invocado', { childId, userId, infoType })
      
      if (!childId || childId === "null" || childId === "") {
        logger.warn('childId inválido para obtener plan')
        return "Por favor selecciona un niño específico para obtener su plan de sueño"
      }

      // Obtener el contexto completo del plan del niño
      const planContext = await getChildPlanContext(childId, userId)
      
      if (planContext.includes("no tiene un plan")) {
        return "Este niño no tiene un plan de sueño activo. Se recomienda generar un plan inicial."
      }

      // Filtrar información según el tipo solicitado
      if (infoType === 'schedule') {
        // Extraer solo la sección de horarios
        const scheduleMatch = planContext.match(/⏰ HORARIOS ESTABLECIDOS:(.*?)(?=\n\n|💡|📊|===)/s)
        return scheduleMatch ? `⏰ HORARIOS ESTABLECIDOS:${scheduleMatch[1]}` : "No hay horarios definidos en el plan"
      } else if (infoType === 'recommendations') {
        // Extraer solo las recomendaciones
        const recMatch = planContext.match(/💡 RECOMENDACIONES ESPECÍFICAS:(.*?)(?=\n\n|📊|===)/s)
        return recMatch ? `💡 RECOMENDACIONES ESPECÍFICAS:${recMatch[1]}` : "No hay recomendaciones específicas en el plan"
      } else if (infoType === 'summary') {
        // Extraer solo información básica
        const summaryMatch = planContext.match(/=== PLAN ACTUAL DEL NIÑO ===(.*?)(?=⏰|💡|📊)/s)
        return summaryMatch ? `=== RESUMEN DEL PLAN ===${summaryMatch[1]}` : "No se pudo obtener resumen del plan"
      }
      
      // Por defecto, devolver el contexto completo
      return planContext
    } catch (error) {
      logger.error('Error en childPlanTool', error)
      return "Error al acceder al plan de sueño del niño"
    }
  },
})

// 🧠 SUPER AGENTE COMPREHENSIVO - COMBINA TODO AUTOMÁTICAMENTE
const superComprehensiveAgent = async (
  question: string, 
  conversationHistory: any[], 
  childId: string, 
  userId: string
) => {
  const startTime = Date.now()
  
  logInfo(`🚀 Super Agente ejecutándose para: "${question}"`)
  
  // 1. DETECCIÓN INTELIGENTE DE PERIODO PARA ESTADÍSTICAS
  let period = detectPeriodFromQuestion(question)
  let usesPlanBasedPeriod = false
  
  // 🎯 LÓGICA INTELIGENTE: Si no hay período específico, usar estadísticas coherentes con el plan
  if (!period) {
    const isPlanProgressQuestion = await detectPlanProgressQuestionWithAI(question)
    if (isPlanProgressQuestion) {
      period = "since-current-plan" // Estadísticas desde el plan actual para ver cómo va
      usesPlanBasedPeriod = true
      logInfo(`🤖 AI detectó pregunta sobre progreso del plan - usando estadísticas desde el plan actual`)
    } else {
      period = "last-30-days" // Por defecto si no es sobre progreso del plan
      logInfo(`🤖 AI detectó pregunta general - usando últimos 30 días`)
    }
  }
  
  logInfo(`📅 Periodo detectado para estadísticas: ${period} ${usesPlanBasedPeriod ? '(coherente con plan)' : ''}`)
  
  // 2. EJECUCIÓN PARALELA DE TODOS LOS TOOLS
  logInfo(`⚡ Ejecutando todos los tools en paralelo...`)
  
  const [ragResults, statistics, currentPlan, plansHistory] = await Promise.all([
    // RAG - Búsqueda contextual
    ragSearchTool.func({ 
      query: extractRelevantKeywords(question) 
    }).catch(err => {
      logger.error("Error en RAG:", err)
      return "Error obteniendo información médica"
    }),
    
    // Estadísticas con periodo inteligente
    childDataTool.func({ 
      childId, 
      userId, 
      dataType: "stats",
      period 
    }).catch(err => {
      logger.error("Error en estadísticas:", err)
      return "Error obteniendo estadísticas del niño"
    }),
    
    // Plan actual
    childPlanTool.func({ 
      childId, 
      userId, 
      infoType: "full_plan" 
    }).catch(err => {
      logger.error("Error en plan actual:", err)
      return "Error obteniendo plan actual"
    }),
    
    // Historial de planes
    getAllPlansContext(childId, userId).catch(err => {
      logger.error("Error en historial de planes:", err)
      return "Error obteniendo historial de planes"
    })
  ])
  
  logInfo(`✅ Todos los tools completados, sintetizando respuesta...`)
  
  // 3. CONSTRUCCIÓN DE CONTEXTO PARA GPT
  const conversationContext = conversationHistory && conversationHistory.length > 0
    ? `Contexto conversacional: ${conversationHistory.slice(-4).map(msg => `${msg.role}: ${msg.content}`).join(' | ')}`
    : "Sin contexto previo."
  
  // 4. SÍNTESIS INTELIGENTE CON GPT
  const llm = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.7,
    maxTokens: 1000
  })
  
  const synthesisPrompt = `Eres la Dra. Mariana, pediatra especialista en sueño infantil.

PREGUNTA DEL USUARIO: "${question}"
${conversationContext}

INFORMACIÓN DISPONIBLE:

📊 ESTADÍSTICAS DEL NIÑO (${period}):
${statistics}

📋 PLAN ACTUAL:
${currentPlan}

📈 EVOLUCIÓN DE PLANES:
${plansHistory}

📚 CONOCIMIENTO MÉDICO:
${ragResults}

INSTRUCCIONES:
- Responde de forma profesional y empática
- USA SOLO la información relevante para la pregunta específica
- Si pregunta sobre estadísticas, enfócate en los datos pero contextualiza con el plan
- Si pregunta sobre el plan, enfócate en el plan pero relaciona con estadísticas si es útil
- Si es pregunta general ("¿cómo está?"), combina todo lo relevante
- Compara con planes anteriores cuando sea útil para mostrar progreso
- Máximo 3 párrafos, sé conciso y directo
- Si no tienes información específica, dilo claramente`

  const response = await llm.invoke([
    new SystemMessage(synthesisPrompt),
    new HumanMessage(question),
  ])
  
  const executionTime = Date.now() - startTime
  logInfo(`🎯 Super Agente completado en ${executionTime}ms`)
  
  return {
    finalAnswer: response.content,
    performance: { 
      startTime, 
      endTime: Date.now(), 
      agent: "SUPER_COMPREHENSIVE",
      executionTime 
    }
  }
}

// 🎯 ROUTER INTELIGENTE - DECIDE QUÉ AGENTES USAR (100% PROMPTING)
async function intelligentAgentRouter(question: string): Promise<{
  agents: string[],
  reasoning: string,
  period?: string
}> {
  try {
    const llm = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.1,
      maxTokens: 200
    })

    const routerPrompt = `Eres un experto en sueño infantil que decide qué información necesitas para responder preguntas.

PREGUNTA DEL USUARIO: "${question}"

AGENTES DISPONIBLES:
1. "plan_progress" - Plan actual + estadísticas desde que empezó el plan (para evaluar efectividad)
2. "medical_rag" - Conocimiento médico especializado en sueño infantil
3. "statistics" - Estadísticas por período específico (julio, junio, semana, etc.)
4. "general_insights" - Vista integral del niño (últimos 30 días + plan como contexto)
5. "plan_context" - Solo información del plan actual (horarios, objetivos)

EJEMPLOS DE DECISIONES:
- "¿Funciona el plan?" → ["plan_progress"] 
- "¿Consejos para mejorar sueño?" → ["medical_rag", "plan_context"]
- "¿Estadísticas de julio?" → ["statistics"] + period="july-2025"
- "¿Cómo está mi niño?" → ["general_insights"]
- "¿Es normal que despierte?" → ["medical_rag", "general_insights"]
- "¿Qué ajustes hacer al plan?" → ["plan_progress", "medical_rag"]

INSTRUCCIONES:
- Selecciona SOLO los agentes necesarios para la pregunta específica
- Si menciona un período (julio, junio, semana), usar "statistics" con ese período
- Si pregunta sobre efectividad/progreso del plan, usar "plan_progress"
- Si pide consejos médicos, incluir "medical_rag"
- Si es pregunta general, usar "general_insights"

Responde en JSON exacto:
{
  "agents": ["agent1", "agent2"],
  "reasoning": "explicación breve",
  "period": "july-2025" (solo si aplica)
}`

    const response = await llm.invoke([
      new SystemMessage(routerPrompt),
      new HumanMessage("Decide qué agentes usar")
    ])

    const result = response.content.toString().trim()
    
    try {
      return JSON.parse(result)
    } catch (parseError) {
      logger.error("Error parsing router response:", parseError)
      // Fallback inteligente
      return {
        agents: ["general_insights"],
        reasoning: "Fallback a vista general por error en parsing"
      }
    }

  } catch (error) {
    logger.error("Error en router inteligente:", error)
    // Fallback seguro
    return {
      agents: ["general_insights"],
      reasoning: "Fallback por error en AI router"
    }
  }
}

// 🔍 FUNCIÓN INTELIGENTE PARA DETECTAR PERIODO EN LA PREGUNTA
function detectPeriodFromQuestion(question: string): string | null {
  const lowerQuestion = question.toLowerCase()
  const currentYear = new Date().getFullYear()
  
  // Detección de meses específicos (esto sí se mantiene porque es preciso)
  const monthPatterns = {
    'enero': `january-${currentYear}`,
    'febrero': `february-${currentYear}`,
    'marzo': `march-${currentYear}`,
    'abril': `april-${currentYear}`,
    'mayo': `may-${currentYear}`,
    'junio': `june-${currentYear}`,
    'julio': `july-${currentYear}`,
    'agosto': `august-${currentYear}`,
    'septiembre': `september-${currentYear}`,
    'octubre': `october-${currentYear}`,
    'noviembre': `november-${currentYear}`,
    'diciembre': `december-${currentYear}`
  }
  
  // Buscar mes específico primero (esto es preciso)
  for (const [month, period] of Object.entries(monthPatterns)) {
    if (lowerQuestion.includes(month)) {
      logInfo(`📅 Mes específico detectado: ${month} → ${period}`)
      return period
    }
  }
  
  // Períodos relativos claros
  if (lowerQuestion.includes('este mes') || lowerQuestion.includes('mes actual')) {
    return 'current-month'
  }
  
  if (lowerQuestion.includes('semana') || lowerQuestion.includes('últimos días')) {
    return 'last-7-days'
  }
  
  if (lowerQuestion.includes('evolución') || lowerQuestion.includes('últimos meses')) {
    return 'last-90-days'
  }
  
  // No hay período específico detectado - AI decidirá el contexto
  return null
}

// 🎯 AGENTE ESPECIALIZADO: PROGRESO DEL PLAN
async function planProgressAgent(childId: string, userId: string): Promise<string> {
  try {
    logInfo(`🎯 Ejecutando PlanProgressAgent`)
    
    // 1. Obtener plan actual
    const currentPlan = await childPlanTool.func({ 
      childId, 
      userId, 
      infoType: "full_plan" 
    })
    
    // 2. Obtener fecha del plan para estadísticas coherentes
    const planDate = await getCurrentPlanDate(childId, userId)
    
    // 3. Obtener estadísticas desde el plan actual
    let statistics
    if (planDate) {
      statistics = await childDataTool.func({ 
        childId, 
        userId, 
        dataType: "stats",
        period: "since-current-plan"
      })
    } else {
      statistics = await childDataTool.func({ 
        childId, 
        userId, 
        dataType: "stats",
        period: "last-30-days"
      })
    }
    
    return `=== PROGRESO DEL PLAN ===
${currentPlan}

=== ESTADÍSTICAS DESDE EL PLAN ===
${statistics}

=== ANÁLISIS ===
Datos para evaluar efectividad del plan actual`
    
  } catch (error) {
    logger.error("Error en PlanProgressAgent:", error)
    return "Error obteniendo progreso del plan"
  }
}

// 🧠 AGENTE ESPECIALIZADO: CONOCIMIENTO MÉDICO
async function medicalRAGAgent(question: string): Promise<string> {
  try {
    logInfo(`🧠 Ejecutando MedicalRAGAgent`)
    
    const ragResults = await ragSearchTool.func({ 
      query: extractRelevantKeywords(question)
    })
    
    return `=== CONOCIMIENTO MÉDICO ESPECIALIZADO ===
${ragResults}

=== ANÁLISIS ===
Información médica relevante para la consulta`
    
  } catch (error) {
    logger.error("Error en MedicalRAGAgent:", error)
    return "Error obteniendo conocimiento médico"
  }
}

// 📊 AGENTE ESPECIALIZADO: ESTADÍSTICAS POR PERÍODO
async function statisticsAgent(childId: string, userId: string, period: string): Promise<string> {
  try {
    logInfo(`📊 Ejecutando StatisticsAgent con período: ${period}`)
    
    const statistics = await childDataTool.func({ 
      childId, 
      userId, 
      dataType: "stats",
      period
    })
    
    return `=== ESTADÍSTICAS DEL PERÍODO: ${period.toUpperCase()} ===
${statistics}

=== ANÁLISIS ===
Datos específicos del período solicitado`
    
  } catch (error) {
    logger.error("Error en StatisticsAgent:", error)
    return "Error obteniendo estadísticas del período"
  }
}

// 🌍 AGENTE ESPECIALIZADO: VISTA INTEGRAL
async function generalInsightsAgent(childId: string, userId: string): Promise<string> {
  try {
    logInfo(`🌍 Ejecutando GeneralInsightsAgent`)
    
    // Ejecutar en paralelo para eficiencia
    const [statistics, currentPlan, plansHistory] = await Promise.all([
      childDataTool.func({ 
        childId, 
        userId, 
        dataType: "stats",
        period: "last-30-days"
      }),
      childPlanTool.func({ 
        childId, 
        userId, 
        infoType: "full_plan" 
      }),
      getAllPlansContext(childId, userId)
    ])
    
    return `=== VISTA INTEGRAL DEL NIÑO ===
${statistics}

=== PLAN COMO CONTEXTO ===
${currentPlan}

=== EVOLUCIÓN ===
${plansHistory}

=== ANÁLISIS ===
Visión completa del estado actual del niño`
    
  } catch (error) {
    logger.error("Error en GeneralInsightsAgent:", error)
    return "Error obteniendo vista integral"
  }
}

// 📋 AGENTE ESPECIALIZADO: CONTEXTO DEL PLAN
async function planContextAgent(childId: string, userId: string): Promise<string> {
  try {
    logInfo(`📋 Ejecutando PlanContextAgent`)
    
    const currentPlan = await childPlanTool.func({ 
      childId, 
      userId, 
      infoType: "full_plan" 
    })
    
    return `=== CONTEXTO DEL PLAN ACTUAL ===
${currentPlan}

=== ANÁLISIS ===
Información específica del plan de sueño actual`
    
  } catch (error) {
    logger.error("Error en PlanContextAgent:", error)
    return "Error obteniendo contexto del plan"
  }
}

// 📅 FUNCIÓN PARA OBTENER FECHA DEL PLAN ACTUAL
async function getCurrentPlanDate(childId: string, userId: string): Promise<Date | null> {
  try {
    const { db } = await connectToDatabase()
    
    const currentPlan = await db.collection("child_plans").findOne({
      childId: new ObjectId(childId),
      userId: new ObjectId(userId),
      status: "active"
    }, {
      sort: { planNumber: -1 } // El más reciente
    })
    
    if (currentPlan && currentPlan.createdAt) {
      logInfo(`✅ Plan actual encontrado - creado el: ${currentPlan.createdAt}`)
      return new Date(currentPlan.createdAt)
    }
    
    logInfo(`❌ No se encontró plan actual para el niño`)
    return null
  } catch (error) {
    logger.error("Error obteniendo fecha del plan actual:", error)
    return null
  }
}

// 🎯 ORQUESTADOR INTELIGENTE - NUEVA ARQUITECTURA CON AGENTES ESPECIALIZADOS
const intelligentOrchestrator = async (
  question: string, 
  conversationHistory: any[], 
  childId: string, 
  userId: string
) => {
  const startTime = Date.now()
  
  logInfo(`🎯 Orquestador Inteligente ejecutándose para: "${question}"`)
  
  // 1. ROUTER INTELIGENTE DECIDE QUÉ AGENTES USAR
  const routing = await intelligentAgentRouter(question)
  
  logInfo(`🤖 Router AI decidió usar agentes: [${routing.agents.join(', ')}]`)
  logInfo(`💭 Razón: ${routing.reasoning}`)
  
  // 2. EJECUTAR AGENTES SELECCIONADOS EN PARALELO
  const agentPromises: Promise<string>[] = []
  
  for (const agentName of routing.agents) {
    switch (agentName) {
      case 'plan_progress':
        agentPromises.push(planProgressAgent(childId, userId))
        break
      case 'medical_rag':
        agentPromises.push(medicalRAGAgent(question))
        break
      case 'statistics':
        const period = routing.period || detectPeriodFromQuestion(question) || 'last-30-days'
        agentPromises.push(statisticsAgent(childId, userId, period))
        break
      case 'general_insights':
        agentPromises.push(generalInsightsAgent(childId, userId))
        break
      case 'plan_context':
        agentPromises.push(planContextAgent(childId, userId))
        break
      default:
        logInfo(`⚠️ Agente desconocido: ${agentName}, usando general_insights`)
        agentPromises.push(generalInsightsAgent(childId, userId))
    }
  }
  
  logInfo(`⚡ Ejecutando ${agentPromises.length} agentes en paralelo...`)
  
  // 3. OBTENER RESULTADOS DE TODOS LOS AGENTES
  const agentResults = await Promise.all(agentPromises)
  
  logInfo(`✅ Todos los agentes completados, sintetizando respuesta...`)
  
  // 4. CONSTRUCCIÓN DE CONTEXTO PARA GPT
  const conversationContext = conversationHistory && conversationHistory.length > 0
    ? `Contexto conversacional: ${conversationHistory.slice(-4).map(msg => `${msg.role}: ${msg.content}`).join(' | ')}`
    : "Sin contexto previo."
  
  // 5. SÍNTESIS INTELIGENTE CON GPT
  const llm = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.7,
    maxTokens: 1000
  })
  
  const combinedInformation = agentResults.join('\n\n')
  
  const synthesisPrompt = `Eres la Dra. Mariana, pediatra especialista en sueño infantil.

PREGUNTA DEL USUARIO: "${question}"
${conversationContext}

INFORMACIÓN RECOPILADA POR AGENTES ESPECIALIZADOS:
${combinedInformation}

INSTRUCCIONES:
- Responde de forma profesional y empática
- Usa TODA la información relevante proporcionada por los agentes
- Integra los datos de manera coherente para dar una respuesta completa
- Si hay múltiples fuentes, combínalas inteligentemente
- Máximo 3 párrafos, sé conciso y directo
- Si no tienes información específica, dilo claramente
- Enfócate en responder exactamente lo que se preguntó`

  const response = await llm.invoke([
    new SystemMessage(synthesisPrompt),
    new HumanMessage(question),
  ])
  
  const executionTime = Date.now() - startTime
  logInfo(`🎯 Orquestador completado en ${executionTime}ms con agentes: [${routing.agents.join(', ')}]`)
  
  return {
    finalAnswer: response.content,
    performance: { 
      startTime, 
      endTime: Date.now(), 
      agent: "INTELLIGENT_ORCHESTRATOR",
      agents: routing.agents,
      reasoning: routing.reasoning,
      executionTime 
    }
  }
}

// ✅ NUEVA ARQUITECTURA CON ORQUESTADOR INTELIGENTE IMPLEMENTADA

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // 🚦 VERIFICAR RATE LIMIT (Protección Profesional)
    const rateLimitCheck = checkRateLimit(session.user.id)
    if (!rateLimitCheck.allowed) {
      const waitTime = Math.ceil((rateLimitCheck.resetTime - Date.now()) / 1000)
      logger.warn(`⛔ Rate limit excedido para usuario ${session.user.email} - Espera ${waitTime}s`)
      
      return NextResponse.json({ 
        error: "Demasiadas solicitudes. Por favor espera un momento.",
        retryAfter: waitTime,
        remaining: rateLimitCheck.remaining
      }, { 
        status: 429,
        headers: {
          'Retry-After': waitTime.toString(),
          'X-RateLimit-Remaining': rateLimitCheck.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimitCheck.resetTime).toISOString()
        }
      })
    }

    const { message, childId, conversationHistory = [] } = await req.json()

    if (!message) {
      return NextResponse.json({ error: "Mensaje requerido" }, { status: 400 })
    }

    // 💬 LOGGING DE PREGUNTA RECIBIDA (Solo en desarrollo/debug)
    logInfo(`💬 Nueva pregunta recibida: "${message}"`)
    logDebug(`👶 ChildId: ${childId || 'No especificado'}`)
    logDebug(`👤 Usuario: ${session.user.email || session.user.id}`)

    // 🔍 OBTENER EL PARENT ID CORRECTO DEL NIÑO
    let parentUserId = session.user.id // Default para usuarios normales
    
    if (childId) {
      try {
        const { db } = await connectToDatabase()
        const child = await db.collection("children").findOne({
          _id: new ObjectId(childId)
        })
        
        if (child && child.parentId) {
          parentUserId = child.parentId
          logInfo('Niño encontrado', { name: `${child.firstName} ${child.lastName}`, parentId: parentUserId })
        } else {
          logger.warn('Niño no encontrado', { childId })
        }
      } catch (error) {
        logger.error('Error obteniendo parent ID', error)
      }
    }

    // 🎯 EJECUTAR ORQUESTADOR INTELIGENTE CON AGENTES ESPECIALIZADOS
    logInfo(`🎯 Ejecutando Orquestador Inteligente para: "${message}"`)
    
    const result = await intelligentOrchestrator(
      message,
      conversationHistory,
      childId || "",
      parentUserId
    )

    // 📊 CALCULAR MÉTRICAS DE PERFORMANCE
    const executionTime = result.performance?.executionTime || 0

    // 🎭 OBTENER CONTEXTO DEL NIÑO PARA RESPUESTA (con parent ID correcto)
    const childContext = childId ? await getChildContextForResponse(childId, parentUserId) : null

    // 📝 LOGGING DE RESPUESTA FINAL (Siempre mostrar en desarrollo, condensado en producción)
    if (VERBOSE_LOGGING) {
      logger.info(`✅ Respuesta generada por: ${result.performance?.agent || "SUPER_COMPREHENSIVE"}`)
      logger.info(`⏱️  Tiempo de ejecución: ${executionTime}ms`)
      logger.info(`💡 Respuesta: ${result.finalAnswer.substring(0, 200)}...`)
    } else {
      // En producción, solo un log condensado
      logger.info(`✅ ${result.performance?.agent || "SUPER"} | ${executionTime}ms | ${message.substring(0, 50)}...`)
    }

    return NextResponse.json({
      response: result.finalAnswer,
      agentUsed: result.performance?.agent || "SUPER_COMPREHENSIVE",
      executionTime: `${executionTime}ms`,
      childContext,
      performance: {
        agent: result.performance?.agent || "SUPER_COMPREHENSIVE",
        duration: executionTime,
      },
    })

  } catch (error) {
    logger.error("Error en multi-agent system:", error)
    return NextResponse.json({ 
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : "Error desconocido",
    }, { status: 500 })
  }
}

// 🧮 FUNCIONES PARA PROCESAR ESTADÍSTICAS (COPIADAS DE useSleepData)
async function processSleepStatistics(events: any[]) {
  if (events.length === 0) {
    return {
      avgSleepDuration: 0,
      avgNapDuration: 0,
      avgBedtime: "--:--",
      avgSleepTime: "--:--",
      avgWakeTime: "--:--",
      totalEvents: 0,
      totalSleepEvents: 0,
      totalNaps: 0,
      totalMeals: 0,
      recentEventsCount: 0
    }
  }

  // Filtrar eventos de la última semana para "recientes"
  const now = new Date()
  const weekAgo = subDays(now, 7)
  const recentEvents = events.filter((e: any) => {
    const eventDate = parseISO(e.startTime)
    return eventDate >= weekAgo
  })

  // Separar tipos de eventos
  const sleepEvents = events.filter((e: any) => e.eventType === 'sleep')
  const naps = events.filter((e: any) => e.eventType === 'nap')
  const meals = events.filter((e: any) => e.eventType === 'meal')
  const bedtimeEvents = events.filter((e: any) => e.eventType === 'bedtime')

  // Calcular promedios usando la misma lógica que useSleepData
  const avgSleepDuration = calculateInferredSleepDuration(events)
  const avgNapDuration = naps.length > 0
    ? naps.reduce((sum: number, event: any) => {
        if (event.endTime) {
          return sum + differenceInMinutes(parseISO(event.endTime), parseISO(event.startTime)) / 60
        }
        return sum
      }, 0) / naps.length
    : 0

  // Calcular horarios promedio
  const nocturnalBedtimeEvents = bedtimeEvents.filter((e: any) => {
    const hour = parseISO(e.startTime).getHours()
    return hour >= 18 || hour <= 6
  })
  
  const avgBedtime = nocturnalBedtimeEvents.length > 0
    ? calculateAverageTime(nocturnalBedtimeEvents.map((e: any) => parseISO(e.startTime)))
    : "--:--"

  const nocturnalSleepEvents = sleepEvents.filter((e: any) => {
    const hour = parseISO(e.startTime).getHours()
    return hour >= 18 || hour <= 6
  })
  
  const avgSleepTime = nocturnalSleepEvents.length > 0
    ? calculateAverageTime(nocturnalSleepEvents.map((e: any) => parseISO(e.startTime)))
    : "--:--"

  const avgWakeTime = calculateInferredWakeTime(events)

  return {
    avgSleepDuration,
    avgNapDuration,
    avgBedtime,
    avgSleepTime,
    avgWakeTime,
    totalEvents: events.length,
    totalSleepEvents: sleepEvents.length,
    totalNaps: naps.length,
    totalMeals: meals.length,
    recentEventsCount: recentEvents.length
  }
}

function calculateInferredSleepDuration(events: any[]): number {
  if (events.length === 0) return 0
  
  const sortedEvents = events.sort((a: any, b: any) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )
  
  const sleepDurations: number[] = []
  
  for (let i = 0; i < sortedEvents.length - 1; i++) {
    const currentEvent = sortedEvents[i]
    const nextEvent = sortedEvents[i + 1]
    
    if (
      ['bedtime', 'sleep'].includes(currentEvent.eventType) &&
      nextEvent.eventType === 'wake'
    ) {
      const bedTime = parseISO(currentEvent.startTime)
      const wakeTime = parseISO(nextEvent.startTime)
      
      let duration = differenceInMinutes(wakeTime, bedTime)
      
      if (duration < 0) {
        duration += 24 * 60
      }
      
      if (duration >= 120 && duration <= 960) {
        sleepDurations.push(duration)
      }
    }
  }
  
  if (sleepDurations.length === 0) return 0
  
  const averageMinutes = sleepDurations.reduce((sum, duration) => sum + duration, 0) / sleepDurations.length
  return averageMinutes / 60
}

function calculateAverageTime(dates: Date[]): string {
  if (dates.length === 0) return "--:--"
  
  try {
    const totalMinutes = dates.reduce((sum, date) => {
      let minutes = date.getHours() * 60 + date.getMinutes()
      
      if (date.getHours() >= 0 && date.getHours() <= 6) {
        minutes += 24 * 60
      }
      
      return sum + minutes
    }, 0)
    
    const avgMinutes = totalMinutes / dates.length
    let finalHours = Math.floor(avgMinutes / 60) % 24
    const finalMinutes = Math.round(avgMinutes % 60)
    
    return `${finalHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`
  } catch {
    return "--:--"
  }
}

function calculateInferredWakeTime(events: any[]): string {
  if (events.length === 0) return "--:--"
  
  const sortedEvents = events.sort((a: any, b: any) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )
  
  const wakeTimes: Date[] = []
  
  for (let i = 0; i < sortedEvents.length - 1; i++) {
    const currentEvent = sortedEvents[i]
    const nextEvent = sortedEvents[i + 1]
    
    if (
      ['bedtime', 'sleep'].includes(currentEvent.eventType) &&
      nextEvent.eventType === 'wake'
    ) {
      wakeTimes.push(parseISO(nextEvent.startTime))
    }
  }
  
  if (wakeTimes.length === 0) return "--:--"
  
  return calculateAverageTime(wakeTimes)
}

// 🏗️ FUNCIÓN PARA CONSTRUIR CONTEXTO CON ESTADÍSTICAS PROCESADAS
function buildProcessedStatsContext(childData: any, stats: any): string {
  let context = "=== ESTADÍSTICAS DE SUEÑO PROCESADAS ===\n"
  
  // Información básica
  const birthDate = childData.birthDate ? new Date(childData.birthDate) : null
  const ageInMonths = birthDate ? Math.floor(differenceInDays(new Date(), birthDate) / 30.44) : null
  
  context += `Nombre: ${childData.firstName} ${childData.lastName}\n`
  if (ageInMonths !== null) {
    context += `Edad: ${ageInMonths} meses\n`
  }

  // ESTADÍSTICAS PRINCIPALES
  context += "\n📊 MÉTRICAS PRINCIPALES:\n"
  context += `- Duración promedio de sueño nocturno: ${stats.avgSleepDuration.toFixed(1)} horas\n`
  context += `- Duración promedio de siestas: ${stats.avgNapDuration.toFixed(1)} horas\n`
  context += `- Hora promedio de acostarse: ${stats.avgBedtime}\n`
  context += `- Hora promedio de dormir: ${stats.avgSleepTime}\n`
  context += `- Hora promedio de despertar: ${stats.avgWakeTime}\n`

  // CONTADORES DE EVENTOS
  context += "\n📈 RESUMEN DE EVENTOS:\n"
  context += `- Total de eventos registrados: ${stats.totalEvents}\n`
  context += `- Eventos de sueño nocturno: ${stats.totalSleepEvents}\n`
  context += `- Total de siestas: ${stats.totalNaps}\n`
  context += `- Total de comidas: ${stats.totalMeals}\n`
  context += `- Eventos recientes (última semana): ${stats.recentEventsCount}\n`

  return context + "=== FIN DE ESTADÍSTICAS ===\n\n"
}

// 🏗️ FUNCIÓN AUXILIAR PARA CONSTRUIR CONTEXTO DEL NIÑO (LEGACY)
function buildChildContext(activeChild: any): string {
  let context = "=== INFORMACIÓN ESPECÍFICA DEL NIÑO ===\n"
  
  // Información básica
  const birthDate = activeChild.birthDate ? new Date(activeChild.birthDate) : null
  const ageInMonths = birthDate ? Math.floor(differenceInDays(new Date(), birthDate) / 30.44) : null
  
  context += `Nombre: ${activeChild.firstName} ${activeChild.lastName}\n`
  if (ageInMonths !== null) {
    context += `Edad: ${ageInMonths} meses\n`
  }

  // TODOS LOS EVENTOS - HISTORIAL COMPLETO
  if (activeChild.events?.length > 0) {
    const allEvents = activeChild.events.sort((a: any, b: any) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    )

    // ESTADÍSTICAS GENERALES
    const totalNaps = allEvents.filter((e: any) => e.eventType === "nap").length
    const totalSleep = allEvents.filter((e: any) => e.eventType === "sleep").length
    const totalMeals = allEvents.filter((e: any) => e.eventType === "meal").length
    
    context += "\nESTADÍSTICAS:\n"
    context += `- Total siestas: ${totalNaps}\n`
    context += `- Total eventos sueño: ${totalSleep}\n`
    context += `- Total comidas: ${totalMeals}\n`

    // ESTADOS EMOCIONALES
    const allEmotionalStates = allEvents
      .map((e: any) => e.emotionalState)
      .filter((state: any) => state)
    
    if (allEmotionalStates.length > 0) {
      const stateCount: { [key: string]: number } = {}
      allEmotionalStates.forEach((state: string) => {
        stateCount[state] = (stateCount[state] || 0) + 1
      })
      
      context += "\nESTADOS EMOCIONALES:\n"
      Object.entries(stateCount).forEach(([state, count]) => {
        context += `- ${state}: ${count} veces\n`
      })
    }
  }

  return context + "=== FIN DE INFORMACIÓN ===\n\n"
}

// 🎭 FUNCIÓN PARA OBTENER CONTEXTO PARA RESPUESTA
async function getChildContextForResponse(childId: string, userId: string) {
  try {
    const { db } = await connectToDatabase()
    
    const activeChild = await db.collection("children").findOne({
      _id: new ObjectId(childId),
      parentId: userId,
    })

    if (!activeChild) return null

    // 🔧 CARGAR EVENTOS RECIENTES DEL NIÑO
    const events = await db.collection("events")
      .find({ childId: activeChild._id.toString() })
      .sort({ startTime: -1 })
      .toArray()

    const recentEventsCount = events
      ? events.filter((event: any) => {
        const daysDiff = differenceInDays(new Date(), new Date(event.startTime))
        return daysDiff <= 7
      }).length 
      : 0

    return {
      name: `${activeChild.firstName} ${activeChild.lastName}`,
      hasPersonalData: true,
      recentEventsCount,
    }
  } catch (error) {
    logger.error("Error obteniendo contexto del niño:", error)
    return null
  }
}
