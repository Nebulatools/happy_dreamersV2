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
import { StateGraph, Annotation, START, END } from "@langchain/langgraph"
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages"

import { createLogger } from "@/lib/logger"

const logger = createLogger("API:rag:chat:route")


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
      const vectorStore = getMongoDBVectorStoreManager()
      const results = await vectorStore.searchSimilar(query, 3)
      
      if (results.length === 0) {
        return "No se encontró información relevante en los documentos"
      }

      const ragContext = results.map((doc: any, i: number) => {
        const metadata = doc.metadata as any
        return `Fuente: ${metadata.source}\nContenido: ${doc.pageContent}`
      }).join("\n\n---\n\n")

      return ragContext
    } catch (error) {
      return "Error al buscar en los documentos"
    }
  },
})

const childDataTool = new DynamicStructuredTool({
  name: "child_data_search",
  description: "Busca estadísticas procesadas del niño: promedios de sueño, patrones, métricas calculadas",
  schema: z.object({
    childId: z.string().describe("ID del niño"),
    userId: z.string().describe("ID del usuario padre"),
    dataType: z.string().describe("Tipo de datos: 'stats', 'patterns', 'metrics'"),
  }),
  func: async ({ childId, userId, dataType }) => {
    try {
      console.log(`🔍 childDataTool llamado con: childId=${childId}, userId=${userId}, dataType=${dataType}`)
      
      if (!childId || childId === "null" || childId === "") {
        console.log("❌ No hay childId válido")
        return "Por favor selecciona un niño específico para obtener sus estadísticas"
      }

      // 📊 ACCESO DIRECTO A LA BASE DE DATOS (MÁS EFICIENTE QUE FETCH)
      const { db } = await connectToDatabase()
      
      const childDoc = await db.collection("children").findOne({
        _id: new ObjectId(childId),
        parentId: userId,
      })
      
      if (!childDoc) {
        console.log("❌ No se encontró el niño en la base de datos")
        return "No se encontró información del niño"
      }
      
      console.log(`👶 Niño encontrado: ${childDoc.firstName} ${childDoc.lastName}`)
      
      const events = childDoc.events || []
      console.log(`📊 Eventos totales encontrados: ${events.length}`)
      
      // 🧮 PROCESAR ESTADÍSTICAS COMO EN SLEEP-STATISTICS
      const sleepStats = await processSleepStatistics(events)
      
      return buildProcessedStatsContext(childDoc, sleepStats)
    } catch (error) {
      console.log("❌ Error en childDataTool:", error)
      return "Error al acceder a las estadísticas del niño"
    }
  },
})

// 🧠 AGENTE ROUTER INTELIGENTE CON ANÁLISIS CONTEXTUAL
const routerAgent = async (state: typeof MultiAgentState.State) => {
  const llm = new ChatOpenAI({
    modelName: "gpt-4o-mini", 
    temperature: 0,
  })

  // Primero, analizar si la pregunta es sobre datos específicos del niño
  const analysisPrompt = `Eres un analizador experto en preguntas sobre datos infantiles.

PREGUNTA: "${state.question}"

ANÁLISIS: Esta pregunta busca:
A) Datos específicos de un niño particular (eventos, estadísticas, patrones, información personal)
B) Información general/consejos sobre crianza y sueño infantil

Considera que palabras como "tengo", "mi niño", "eventos", "estadísticas", "cuántas", "cómo durmió", "patrones" indican datos específicos.

Responde solo: DATOS_ESPECIFICOS o INFORMACION_GENERAL`

  const analysisResponse = await llm.invoke([
    new SystemMessage(analysisPrompt),
    new HumanMessage(state.question),
  ])

  const analysis = analysisResponse.content.toString().trim()
  
  // Convertir análisis a decisión de agente
  const agentType = analysis === "DATOS_ESPECIFICOS" ? "DB" : "RAG"
  
  console.log(`🤖 ROUTER: Pregunta="${state.question}" → Análisis="${analysis}" → Decisión="${agentType}"`)
  
  return {
    agentType,
    routingDecision: `Router analizó: ${analysis} → ${agentType}`,
    performance: { startTime: Date.now(), agent: agentType },
  }
}

// 🔍 AGENTE RAG ESPECIALIZADO
const ragAgent = async (state: typeof MultiAgentState.State) => {
  const llm = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.7,
  })

  const agent = createReactAgent({
    llm,
    tools: [ragSearchTool],
    stateModifier: `Eres la Dra. Mariana, especialista en pediatría. 
    Usa SOLO la herramienta rag_search para buscar información en documentos especializados.
    Responde de forma concisa y directa. Si no encuentras información específica, dilo claramente.`,
  })

  const messages = [new HumanMessage(state.question)]
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

  const agent = createReactAgent({
    llm,
    tools: [childDataTool],
    stateModifier: `Eres la Dra. Mariana, especialista en análisis de datos infantiles.
    Usa SOLO la herramienta child_data_search para acceder a información específica del niño.
    Proporciona respuestas precisas y concisas basadas en los datos reales.`,
  })

  const messages = [
    new SystemMessage(`Datos disponibles: childId=${childId}, userId=${userId}`),
    new HumanMessage(state.question),
  ]
  
  const result = await agent.invoke({ messages })
  
  return {
    finalAnswer: result.messages[result.messages.length - 1].content,
    performance: { ...state.performance, endTime: Date.now() },
  }
}

// 🎯 FUNCIÓN DE ROUTING CON TIPOS EXPLÍCITOS
const routeToAgent = (state: { agentType: string }): "RAG_ONLY" | "CHILD_DATA_ONLY" => {
  return state.agentType === "DB" ? "CHILD_DATA_ONLY" : "RAG_ONLY"
}

// 🏗️ CONSTRUCCIÓN DEL GRAFO CON SINTAXIS CORRECTA
const buildMultiAgentGraph = (childId: string, userId: string) => {
  const workflow = new StateGraph(MultiAgentState)

  // 1. Agregar nodos
  workflow.addNode("router", routerAgent)
  workflow.addNode("RAG_ONLY", ragAgent)
  workflow.addNode("CHILD_DATA_ONLY", (state) => childDataAgent(state, childId, userId))

  // 2. Definir punto de entrada
  workflow.setEntryPoint("router")

  // 3. Definir branching condicional
  workflow.addConditionalEdges(
    "router", // El nodo de origen para la decisión
    routeToAgent, // La función que decide la ruta
    {
      "RAG_ONLY": "RAG_ONLY",           // Si la función devuelve "RAG_ONLY", ir a este nodo
      "CHILD_DATA_ONLY": "CHILD_DATA_ONLY", // Si devuelve "CHILD_DATA_ONLY", ir a este nodo
    }
  )

  // 4. Definir los puntos finales
  workflow.addEdge("RAG_ONLY", END)
  workflow.addEdge("CHILD_DATA_ONLY", END)

  // 5. Compilar
  return workflow.compile()
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { message, childId, conversationHistory = [] } = await req.json()

    if (!message) {
      return NextResponse.json({ error: "Mensaje requerido" }, { status: 400 })
    }


    // 🚀 CREAR Y EJECUTAR EL SISTEMA MULTI-AGENTE
    const multiAgentGraph = buildMultiAgentGraph(childId || "", session.user.id)
    
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

    // 🎭 OBTENER CONTEXTO DEL NIÑO PARA RESPUESTA
    const childContext = childId ? await getChildContextForResponse(childId, session.user.id) : null

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