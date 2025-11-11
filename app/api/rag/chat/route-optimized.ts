// Versión optimizada del chat route con carga dinámica de AI
// Reduce bundle size en ~350MB mediante lazy loading

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { getSleepCoachSystemPrompt } from "@/lib/rag/sleep-coach-personality"
import { differenceInDays, differenceInMinutes, parseISO, subDays } from "date-fns"
import { z } from "zod"
import { createLogger } from "@/lib/logger"
import { loadAIModules } from "@/lib/ai-loader"

const logger = createLogger('RAGChatAPI-Optimized')

// Cache para módulos AI cargados
let aiModules: any = null

/**
 * Inicializa los módulos AI de forma lazy
 */
async function initializeAIModules() {
  if (aiModules) {
    return aiModules
  }
  
  logger.info('Inicializando módulos AI...')
  const startTime = Date.now()
  
  try {
    // Cargar solo los módulos necesarios
    aiModules = await loadAIModules(['openai', 'langchain', 'vectorstore'])
    
    const loadTime = Date.now() - startTime
    logger.info(`Módulos AI cargados en ${loadTime}ms`)
    
    return aiModules
  } catch (error) {
    logger.error('Error inicializando módulos AI', error)
    throw new Error('No se pudieron cargar los módulos AI necesarios')
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    // Obtener datos del request
    const { message, childId, conversationHistory = [] } = await req.json()
    
    if (!message) {
      return NextResponse.json(
        { error: "El mensaje es requerido" },
        { status: 400 }
      )
    }

    // Cargar módulos AI dinámicamente (solo cuando se necesitan)
    const ai = await initializeAIModules()
    
    // Ahora tenemos acceso a los módulos cargados
    const {
      generateText,
      openai,
      ChatOpenAI,
      DynamicStructuredTool,
      StateGraph,
      Annotation,
      START,
      END,
      createReactAgent,
      HumanMessage,
      AIMessage,
      SystemMessage,
      getMongoDBVectorStoreManager,
    } = ai

    // Conectar a la base de datos
    const { db } = await connectToDatabase()
    
    // Estado del multi-agente
    const MultiAgentState = Annotation.Root({
      question: Annotation<string>,
      agentType: Annotation<string>,
      ragResults: Annotation<any>,
      childData: Annotation<any>,
      finalAnswer: Annotation<string>,
      conversationHistory: Annotation<any[]>,
      routingDecision: Annotation<string>,
      performance: Annotation<{ startTime: number; agent: string }>,
    })

    // Tool para obtener datos del niño
    const childDataTool = new DynamicStructuredTool({
      name: "childDataTool",
      description: "Obtiene estadísticas y datos del niño desde MongoDB",
      schema: z.object({
        childId: z.string().describe("ID del niño"),
        userId: z.string().describe("ID del usuario/padre"),
        dataType: z.string().describe("Tipo de datos a obtener").optional(),
      }),
      func: async ({ childId, userId, dataType }) => {
        try {
          logger.debug('childDataTool invocado', { childId, userId, dataType })
          
          if (!childId || childId === "null" || childId === "") {
            logger.warn('childId inválido o no proporcionado')
            return "Por favor selecciona un niño específico para obtener sus estadísticas"
          }
          
          const childDoc = await db.collection("children").findOne({
            _id: new ObjectId(childId),
            parentId: userId,
          })
          
          if (!childDoc) {
            logger.warn('Niño no encontrado en la base de datos', { childId })
            return "No se encontró información del niño"
          }
          
          logger.info('Niño encontrado', { name: `${childDoc.firstName} ${childDoc.lastName}` })
          
          const events = childDoc.events || []
          logger.debug('Eventos encontrados', { count: events.length })
          
          // Procesar estadísticas
          return processChildStatistics(childDoc, events)
          
        } catch (error) {
          logger.error('Error en childDataTool', error)
          return "Error al acceder a las estadísticas del niño"
        }
      },
    })

    // Tool para búsqueda RAG
    const ragSearchTool = new DynamicStructuredTool({
      name: "ragSearch",
      description: "Busca información en la base de conocimientos sobre sueño infantil",
      schema: z.object({
        query: z.string().describe("Consulta de búsqueda"),
        k: z.number().optional().default(3).describe("Número de resultados"),
      }),
      func: async ({ query, k = 3 }) => {
        try {
          const vectorStore = await getMongoDBVectorStoreManager()
          const results = await vectorStore.search(query, k)
          return results
        } catch (error) {
          logger.error('Error en búsqueda RAG', error)
          return "No se pudo buscar en la base de conocimientos"
        }
      },
    })

    // Router para decidir qué agente usar
    async function routeQuery(state: typeof MultiAgentState.State) {
      const { question } = state
      
      const routingPrompt = `Analiza esta pregunta y decide qué tipo de agente debe responderla:
      - "RAG" para preguntas generales sobre sueño infantil
      - "CHILD_DATA" para consultas sobre datos específicos del niño
      - "MIXED" para preguntas que requieren ambos
      
      Pregunta: ${question}
      
      Responde solo con: RAG, CHILD_DATA o MIXED`

      const { text: agentType } = await generateText({
        model: openai('gpt-3.5-turbo'),
        prompt: routingPrompt,
      })
      
      logger.info('Router de agente', { question, agentType })
      
      return { ...state, agentType: agentType.trim() }
    }

    // Agente RAG
    async function ragAgent(state: typeof MultiAgentState.State) {
      const { question, conversationHistory } = state
      
      const model = new ChatOpenAI({
        modelName: "gpt-3.5-turbo",
        temperature: 0.3,
      })
      
      const agent = createReactAgent({
        llm: model,
        tools: [ragSearchTool],
      })
      
      const messages = [
        new SystemMessage(getSleepCoachSystemPrompt()),
        ...conversationHistory.map((msg: any) => 
          msg.role === 'user' 
            ? new HumanMessage(msg.content)
            : new AIMessage(msg.content)
        ),
        new HumanMessage(question),
      ]
      
      const result = await agent.invoke({ messages })
      
      return { 
        ...state, 
        finalAnswer: result.messages[result.messages.length - 1].content 
      }
    }

    // Agente de datos del niño
    async function childDataAgent(state: typeof MultiAgentState.State) {
      const { question, conversationHistory } = state
      
      const model = new ChatOpenAI({
        modelName: "gpt-3.5-turbo",
        temperature: 0.3,
      })
      
      const agent = createReactAgent({
        llm: model,
        tools: [childDataTool],
      })
      
      const messages = [
        new SystemMessage(getSleepCoachSystemPrompt()),
        ...conversationHistory.map((msg: any) => 
          msg.role === 'user' 
            ? new HumanMessage(msg.content)
            : new AIMessage(msg.content)
        ),
        new HumanMessage(question),
      ]
      
      const result = await agent.invoke({ messages })
      
      return { 
        ...state, 
        finalAnswer: result.messages[result.messages.length - 1].content 
      }
    }

    // Agente mixto
    async function mixedAgent(state: typeof MultiAgentState.State) {
      const { question, conversationHistory } = state
      
      const model = new ChatOpenAI({
        modelName: "gpt-3.5-turbo",
        temperature: 0.3,
      })
      
      const agent = createReactAgent({
        llm: model,
        tools: [ragSearchTool, childDataTool],
      })
      
      const messages = [
        new SystemMessage(getSleepCoachSystemPrompt()),
        ...conversationHistory.map((msg: any) => 
          msg.role === 'user' 
            ? new HumanMessage(msg.content)
            : new AIMessage(msg.content)
        ),
        new HumanMessage(question),
      ]
      
      const result = await agent.invoke({ messages })
      
      return { 
        ...state, 
        finalAnswer: result.messages[result.messages.length - 1].content 
      }
    }

    // Construir el grafo del sistema multi-agente
    const workflow = new StateGraph(MultiAgentState)
      .addNode("router", routeQuery)
      .addNode("ragAgent", ragAgent)
      .addNode("childDataAgent", childDataAgent)
      .addNode("mixedAgent", mixedAgent)
      .addEdge(START, "router")
      .addConditionalEdges(
        "router",
        (state) => state.agentType,
        {
          "RAG": "ragAgent",
          "CHILD_DATA": "childDataAgent",
          "MIXED": "mixedAgent",
        }
      )
      .addEdge("ragAgent", END)
      .addEdge("childDataAgent", END)
      .addEdge("mixedAgent", END)
    
    const multiAgentGraph = workflow.compile()

    // Ejecutar el grafo
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

    const result = await multiAgentGraph.invoke(initialState)

    // Calcular métricas de rendimiento
    const responseTime = Date.now() - result.performance.startTime
    logger.info('Respuesta generada', { 
      agent: result.agentType, 
      responseTime: `${responseTime}ms` 
    })

    return NextResponse.json({
      success: true,
      answer: result.finalAnswer,
      agent: result.agentType,
      performance: {
        responseTime,
        agent: result.agentType,
      },
    })

  } catch (error) {
    logger.error('Error en el endpoint de chat', error)
    return NextResponse.json(
      { 
        success: false,
        error: "Error procesando la consulta",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

// Función auxiliar para procesar estadísticas del niño
function processChildStatistics(childDoc: any, events: any[]) {
  const today = new Date()
  const last7Days = subDays(today, 7)
  const last30Days = subDays(today, 30)
  
  // Filtrar eventos de los últimos 7 y 30 días
  const events7Days = events.filter(e => {
    const eventDate = parseISO(e.startTime)
    return eventDate >= last7Days
  })
  
  const events30Days = events.filter(e => {
    const eventDate = parseISO(e.startTime)
    return eventDate >= last30Days
  })
  
  // Calcular estadísticas básicas
  const sleepEvents = events7Days.filter(e => e.eventType === 'sleep')
  const avgSleepDuration = sleepEvents.length > 0
    ? sleepEvents.reduce((acc, e) => {
        if (e.endTime && e.startTime) {
          return acc + differenceInMinutes(parseISO(e.endTime), parseISO(e.startTime))
        }
        return acc
      }, 0) / sleepEvents.length / 60
    : 0
  
  return {
    childName: `${childDoc.firstName} ${childDoc.lastName}`,
    age: childDoc.birthDate 
      ? `${differenceInDays(today, parseISO(childDoc.birthDate))} días`
      : "Edad no especificada",
    totalEvents: events.length,
    eventsLast7Days: events7Days.length,
    eventsLast30Days: events30Days.length,
    avgSleepDuration: `${avgSleepDuration.toFixed(1)} horas`,
    sleepEventsCount: sleepEvents.length,
  }
}

export default { POST }
