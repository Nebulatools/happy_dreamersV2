// @ts-nocheck
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { getMongoDBVectorStoreManager } from "@/lib/rag/vector-store-mongodb"
import { getDoctorSystemPrompt } from "@/lib/rag/doctor-personality"
import { differenceInDays, differenceInMinutes, parseISO, subDays } from "date-fns"
import { createReactAgent } from "@langchain/langgraph/prebuilt"
import { ChatOpenAI } from "@langchain/openai"
import { DynamicStructuredTool } from "@langchain/core/tools"
import { z } from "zod"
import { createLogger } from "@/lib/logger"
import { StateGraph, Annotation, START, END } from "@langchain/langgraph"
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages"
import { getChildPlanContext } from "@/lib/rag/plan-context-builder"
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
    
  } else {
    logger.warn(`Periodo no reconocido: ${period}`);
    return events;
  }
  
  return filteredEvents;
}

// 🤖 DEFINICIÓN DEL ESTADO DEL MULTI-AGENT SYSTEM
const MultiAgentState = Annotation.Root({
  question: Annotation<string>,
  agentType: Annotation<string>,
  ragResults: Annotation<any>,
  childData: Annotation<any>,
  finalAnswer: Annotation<string>,
  conversationHistory: Annotation<any[]>,
  routingDecision: Annotation<string>,
  performance: Annotation<{ startTime: number; endTime?: number; agent: string }>,
})

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
      const filteredEvents = filterEventsByPeriod(events, period)
      
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

// 🧠 AGENTE ROUTER INTELIGENTE CON ANÁLISIS CONTEXTUAL
const routerAgent = async (state: typeof MultiAgentState.State) => {
  const llm = new ChatOpenAI({
    modelName: "gpt-4o-mini", 
    temperature: 0,
    maxTokens: 50,
  })

  // Construir contexto de conversación para el router
  const conversationContext = state.conversationHistory && state.conversationHistory.length > 0 
    ? `Contexto de conversación reciente: ${state.conversationHistory.slice(-3).map(msg => `${msg.role}: ${msg.content}`).join(' | ')}`
    : "Sin contexto previo."

  // Análisis comprimido para clasificación de pregunta
  const analysisPrompt = `Clasifica esta pregunta con contexto:

PREGUNTA: "${state.question}"
${conversationContext}

REGLAS:
- BD del niño (estadísticas, horas, promedios) → DATOS_ESPECIFICOS
- Plan de sueño (horarios, recomendaciones del plan) → PLAN_ESPECIFICO  
- Conocimiento médico general (técnicas, consejos) → INFORMACION_GENERAL

CONTINUACIONES:
- "¿Es suficiente?", "¿Y para su edad?" → mantiene categoría previa
- "¿Está siguiendo eso?" → PLAN_ESPECIFICO

Responde solo: DATOS_ESPECIFICOS, PLAN_ESPECIFICO o INFORMACION_GENERAL`

  const analysisResponse = await llm.invoke([
    new SystemMessage(analysisPrompt),
    new HumanMessage(state.question),
  ])

  const analysis = analysisResponse.content.toString().trim()
  
  // Convertir análisis a decisión de agente
  let agentType: string
  if (analysis === "DATOS_ESPECIFICOS") {
    agentType = "DB"
  } else if (analysis === "PLAN_ESPECIFICO") {
    agentType = "PLAN"
  } else {
    agentType = "RAG"
  }
  
  logger.info('Router de agente', { question: state.question, analysis, agentType })
  
  return {
    agentType,
    routingDecision: `Router analizó: ${analysis} → ${agentType}`,
    performance: { startTime: Date.now(), agent: agentType },
  }
}

// 🔍 AGENTE RAG ESPECIALIZADO CON CONTEXTO DE CONVERSACIÓN
const ragAgent = async (state: typeof MultiAgentState.State) => {
  const llm = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.7,
  })

  // Construir mensajes con contexto de conversación
  const messages = []
  
  // Agregar historial de conversación si existe
  if (state.conversationHistory && state.conversationHistory.length > 0) {
    // Tomar las últimas 4 interacciones para contexto
    const recentHistory = state.conversationHistory.slice(-4)
    
    // Contexto conversacional comprimido
    messages.push(new SystemMessage(
      `Contexto: ${recentHistory.map(msg => `${msg.role}: ${msg.content}`).join(' | ')}
      
      Si la pregunta continúa la conversación, reformula la búsqueda:
      Ej: "lactancia" + "¿y si tiene 3 años?" → buscar "lactancia niños 3 años"`
    ))
  }
  
  // Agregar la pregunta actual
  messages.push(new HumanMessage(state.question))

  const agent = createReactAgent({
    llm,
    tools: [ragSearchTool],
    stateModifier: `Dra. Mariana - Pediatra.
    
    Si la pregunta continúa conversación previa, reformula búsqueda incluyendo contexto.
    Ej: "lactancia" + "¿3 años?" → "lactancia niños 3 años"
    
    Usa rag_search con consulta completa. Responde conciso basado en información encontrada.`,
  })

  const result = await agent.invoke({ messages })
  
  return {
    finalAnswer: result.messages[result.messages.length - 1].content,
    performance: { ...state.performance, endTime: Date.now() },
  }
}

// 👶 AGENTE DE DATOS DEL NIÑO
const childDataAgent = async (state: typeof MultiAgentState.State, childId: string, userId: string) => {
  const llm = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.3,
  })

  const messages = [
    new SystemMessage(`Datos disponibles: childId=${childId}, userId=${userId}`)
  ]
  
  // Agregar contexto de conversación si existe
  if (state.conversationHistory && state.conversationHistory.length > 0) {
    const recentHistory = state.conversationHistory.slice(-4)
    messages.push(new SystemMessage(
      `Contexto de conversación: ${recentHistory.map(msg => `${msg.role}: ${msg.content}`).join(' | ')}`
    ))
  }
  
  messages.push(new HumanMessage(state.question))

  const agent = createReactAgent({
    llm,
    tools: [childDataTool],
    stateModifier: `Dra. Mariana - Análisis datos infantiles.
    
    REGLAS:
    - Usa child_data_search siempre
    - Detecta periodo: "julio"→"july-${new Date().getFullYear()}", "julio 2024"→"july-2024", sin mes→"all"
    - Mantén coherencia conversacional: "¿es suficiente?" mantiene periodo previo
    - Presenta datos clara y profesionalmente
    
    Hoy: ${new Date().toLocaleDateString('es')}`,
  })

  const result = await agent.invoke({ messages })
  
  return {
    finalAnswer: result.messages[result.messages.length - 1].content,
    performance: { ...state.performance, endTime: Date.now() },
  }
}

// 📋 AGENTE DEL PLAN DEL NIÑO
const childPlanAgent = async (state: typeof MultiAgentState.State, childId: string, userId: string) => {
  const llm = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.3,
  })

  const messages = [
    new SystemMessage(`Plan del niño disponible: childId=${childId}, userId=${userId}`)
  ]
  
  // Agregar contexto de conversación si existe
  if (state.conversationHistory && state.conversationHistory.length > 0) {
    const recentHistory = state.conversationHistory.slice(-4)
    messages.push(new SystemMessage(
      `Contexto de conversación: ${recentHistory.map(msg => `${msg.role}: ${msg.content}`).join(' | ')}`
    ))
  }
  
  messages.push(new HumanMessage(state.question))

  const agent = createReactAgent({
    llm,
    tools: [childPlanTool],
    stateModifier: `Dra. Mariana - Planes de sueño infantil.
    
    REGLAS:
    - Usa child_plan_search siempre
    - Mantén coherencia conversacional: no repitas info mencionada
    - infoType: "schedule" (horarios), "recommendations" (recomendaciones), "summary" (resumen), "full_plan" (completo)
    - Si sin plan activo, sugiere generar uno
    
    Responde directo basado en plan específico del niño.`,
  })

  const result = await agent.invoke({ messages })
  
  return {
    finalAnswer: result.messages[result.messages.length - 1].content,
    performance: { ...state.performance, endTime: Date.now() },
  }
}

// 🎯 FUNCIÓN DE ROUTING CON TIPOS EXPLÍCITOS
const routeToAgent = (state: { agentType: string }): "RAG_ONLY" | "CHILD_DATA_ONLY" | "CHILD_PLAN_ONLY" => {
  if (state.agentType === "DB") {
    return "CHILD_DATA_ONLY"
  } else if (state.agentType === "PLAN") {
    return "CHILD_PLAN_ONLY"
  } else {
    return "RAG_ONLY"
  }
}

// 🏗️ CONSTRUCCIÓN DEL GRAFO CON SINTAXIS CORRECTA
const buildMultiAgentGraph = (childId: string, userId: string) => {
  const workflow = new StateGraph(MultiAgentState)

  // 1. Agregar nodos
  workflow.addNode("router", routerAgent)
  workflow.addNode("RAG_ONLY", ragAgent)
  workflow.addNode("CHILD_DATA_ONLY", (state) => childDataAgent(state, childId, userId))
  workflow.addNode("CHILD_PLAN_ONLY", (state) => childPlanAgent(state, childId, userId))

  // 2. Definir punto de entrada
  workflow.setEntryPoint("router")

  // 3. Definir branching condicional
  workflow.addConditionalEdges(
    "router", // El nodo de origen para la decisión
    routeToAgent, // La función que decide la ruta
    {
      "RAG_ONLY": "RAG_ONLY",           // Si la función devuelve "RAG_ONLY", ir a este nodo
      "CHILD_DATA_ONLY": "CHILD_DATA_ONLY", // Si devuelve "CHILD_DATA_ONLY", ir a este nodo
      "CHILD_PLAN_ONLY": "CHILD_PLAN_ONLY", // Si devuelve "CHILD_PLAN_ONLY", ir a este nodo
    }
  )

  // 4. Definir los puntos finales
  workflow.addEdge("RAG_ONLY", END)
  workflow.addEdge("CHILD_DATA_ONLY", END)
  workflow.addEdge("CHILD_PLAN_ONLY", END)

  // 5. Compilar
  return workflow.compile()
}

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

    // 🚀 CREAR Y EJECUTAR EL SISTEMA MULTI-AGENTE CON PARENT ID CORRECTO
    const multiAgentGraph = buildMultiAgentGraph(childId || "", parentUserId)
    
    const initialState = {
      question: message,
      agentType: "",
      ragResults: null,
      childData: null,
      finalAnswer: "",
      conversationHistory,
      routingDecision: "",
      performance: { startTime: Date.now(), agent: "" },
    }

    // 🎯 EJECUTAR EL GRAFO
    const result = await multiAgentGraph.invoke(initialState)

    // 📊 CALCULAR MÉTRICAS DE PERFORMANCE
    const executionTime = result.performance?.endTime ? 
      result.performance.endTime - result.performance.startTime : 0

    // 🎭 OBTENER CONTEXTO DEL NIÑO PARA RESPUESTA (con parent ID correcto)
    const childContext = childId ? await getChildContextForResponse(childId, parentUserId) : null

    // 📝 LOGGING DE RESPUESTA FINAL (Siempre mostrar en desarrollo, condensado en producción)
    if (VERBOSE_LOGGING) {
      logger.info(`✅ Respuesta generada por agente: ${result.performance?.agent || "unknown"}`)
      logger.info(`⏱️  Tiempo de ejecución: ${executionTime}ms`)
      logger.info(`💡 Respuesta: ${result.finalAnswer.substring(0, 200)}...`)
    } else {
      // En producción, solo un log condensado
      logger.info(`✅ ${result.performance?.agent || "?"} | ${executionTime}ms | ${message.substring(0, 50)}...`)
    }

    return NextResponse.json({
      response: result.finalAnswer,
      agentUsed: result.performance?.agent || "unknown",
      routingDecision: result.routingDecision,
      executionTime: `${executionTime}ms`,
      childContext,
      performance: {
        agent: result.performance?.agent,
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