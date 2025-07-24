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
import { differenceInDays } from "date-fns"
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
  description: "Busca información específica del niño: estadísticas, eventos, estados emocionales, patrones de comportamiento",
  schema: z.object({
    childId: z.string().describe("ID del niño"),
    userId: z.string().describe("ID del usuario padre"),
    dataType: z.string().describe("Tipo de datos: 'stats', 'events', 'emotions', 'patterns'"),
  }),
  func: async ({ childId, userId, dataType }) => {
    try {
      const { db } = await connectToDatabase()
      
      let activeChild = null
      if (childId) {
        activeChild = await db.collection("children").findOne({
          _id: new ObjectId(childId),
          parentId: userId,
        })
      } else {
        const children = await db.collection("children")
          .find({ parentId: userId })
          .sort({ createdAt: -1 })
          .limit(1)
          .toArray()
        activeChild = children[0] || null
      }

      if (!activeChild) {
        return "No se encontró información del niño"
      }

      return buildChildContext(activeChild)
    } catch (error) {
      return "Error al acceder a los datos del niño"
    }
  },
})

// 🧠 AGENTE ROUTER INTELIGENTE SIMPLIFICADO
const routerAgent = async (state: typeof MultiAgentState.State) => {
  const llm = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0,
  })

  const routingPrompt = `Eres un router inteligente para un asistente pediátrico. 
  Analiza la pregunta y decide qué fuente usar:

  OPCIONES:
  - RAG: Preguntas sobre técnicas, consejos, información médica, conceptos (ej: "qué es la atención", "cómo mejorar el sueño", "técnicas de lactancia", "problemas de desarrollo")
  - DB: Preguntas sobre números/estadísticas específicas del niño (ej: "cuántas siestas", "cuántos eventos", "estados emocionales de mi niño", "estadísticas")

  PREGUNTA: "${state.question}"

  EJEMPLOS:
  - "que es la atencion" → RAG (pregunta conceptual)
  - "cuantas siestas ha tomado" → DB (estadística específica)
  - "como mejorar el sueño" → RAG (técnica/consejo)
  - "estados emocionales de jacoe" → DB (datos del niño)

  Responde SOLO con: RAG o DB`

  const response = await llm.invoke([
    new SystemMessage(routingPrompt),
    new HumanMessage(state.question),
  ])

  const agentType = response.content.toString().trim()
  
  return {
    agentType,
    routingDecision: `Router decidió: ${agentType}`,
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

// 🏗️ FUNCIÓN AUXILIAR PARA CONSTRUIR CONTEXTO DEL NIÑO
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

    const recentEventsCount = activeChild.events 
      ? activeChild.events.filter((event: any) => {
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