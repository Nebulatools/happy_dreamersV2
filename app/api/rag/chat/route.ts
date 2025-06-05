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

    // Ejecutar consultas en paralelo para mayor eficiencia
    const [ragResults, childData] = await Promise.all([
      // 1. Búsqueda RAG en paralelo
      searchRAGDocuments(message),
      // 2. Consulta del niño en paralelo
      getChildData(childId, session.user.id)
    ])

    // 3. Construir contexto combinado
    const combinedContext = buildCombinedContext(ragResults, childData)

    // 4. Generar respuesta con historial conversacional
    const response = await generateResponse({
      message,
      combinedContext,
      conversationHistory
    })

    return NextResponse.json({
      response,
      documentsUsed: ragResults.documentsUsed,
      sources: ragResults.sources,
      childContext: childData.childContext
    })

  } catch (error) {
    console.error("Error en chat RAG:", error)
    return NextResponse.json({ 
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : "Error desconocido"
    }, { status: 500 })
  }
}

// 🔍 Función optimizada para búsqueda RAG
async function searchRAGDocuments(message: string) {
  try {
    const vectorStore = getMongoDBVectorStoreManager()
    const results = await vectorStore.searchSimilar(message, 3)
    
    if (results.length === 0) {
      return { ragContext: "", documentsUsed: 0, sources: [] }
    }

    const sources: Array<{source: string, type: string, preview: string}> = []
    const ragContext = results.map((doc: any, i: number) => {
      const metadata = doc.metadata as any
      sources.push({
        source: metadata.source || `Documento ${i+1}`,
        type: metadata.type || 'unknown',
        preview: doc.pageContent.substring(0, 100) + '...'
      })
      return `Fuente: ${metadata.source}\nContenido: ${doc.pageContent}`
    }).join('\n\n---\n\n')

    return { ragContext, documentsUsed: results.length, sources }
  } catch (error) {
    console.error("Error en búsqueda RAG:", error)
    return { ragContext: "", documentsUsed: 0, sources: [] }
  }
}

// 👶 Función optimizada para datos del niño
async function getChildData(childId: string | null, userId: string) {
  try {
    const { db } = await connectToDatabase()
    
    let activeChild = null

    if (childId) {
      // Buscar niño específico con agregación optimizada
      activeChild = await db.collection("children").findOne({
        _id: new ObjectId(childId),
        parentId: userId
      })
    } else {
      // Buscar niño más reciente
      const children = await db.collection("children")
        .find({ parentId: userId })
        .sort({ createdAt: -1 })
        .limit(1)
        .toArray()
      
      activeChild = children[0] || null
    }

    if (!activeChild) {
      return { userChildContext: "", childContext: null }
    }

    // Construir contexto del niño de forma eficiente
    const userChildContext = buildChildContext(activeChild)
    
    // Calcular eventos recientes
    const recentEventsCount = activeChild.events 
      ? activeChild.events.filter((event: any) => {
          const daysDiff = differenceInDays(new Date(), new Date(event.startTime))
          return daysDiff <= 7
        }).length 
      : 0

    const childContext = {
      name: `${activeChild.firstName} ${activeChild.lastName}`,
      hasPersonalData: true,
      recentEventsCount
    }

    return { userChildContext, childContext }
  } catch (error) {
    console.error("Error obteniendo datos del niño:", error)
    return { userChildContext: "", childContext: null }
  }
}

// 🏗️ Función para construir contexto del niño
function buildChildContext(activeChild: any): string {
  let context = "=== INFORMACIÓN ESPECÍFICA DEL NIÑO ===\n"
  
  // Información básica
  const birthDate = activeChild.birthDate ? new Date(activeChild.birthDate) : null
  const ageInMonths = birthDate ? Math.floor(differenceInDays(new Date(), birthDate) / 30.44) : null
  
  context += `Nombre: ${activeChild.firstName} ${activeChild.lastName}\n`
  if (ageInMonths !== null) {
    context += `Edad: ${ageInMonths} meses\n`
  }

  // Datos de encuesta más relevantes
  if (activeChild.surveyData?.sleepRoutine) {
    const sleep = activeChild.surveyData.sleepRoutine
    context += "\nRutina de sueño:\n"
    if (sleep.bedtime) context += `- Se acuesta: ${sleep.bedtime}\n`
    if (sleep.wake_time) context += `- Se despierta: ${sleep.wake_time}\n`
    if (sleep.sleep_problems) context += `- Problemas: ${sleep.sleep_problems}\n`
  }

  // TODOS LOS EVENTOS - HISTORIAL COMPLETO
  if (activeChild.events?.length > 0) {
    const allEvents = activeChild.events.sort((a: any, b: any) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    )

    // Eventos recientes (últimos 7 días)
    const recentEvents = allEvents.filter((event: any) => {
      const daysDiff = differenceInDays(new Date(), new Date(event.startTime))
      return daysDiff <= 7
    })

    context += `\n=== ESTADÍSTICAS COMPLETAS ===\n`
    
    // ESTADÍSTICAS GENERALES (TODOS LOS EVENTOS)
    const totalNaps = allEvents.filter((e: any) => e.eventType === 'nap').length
    const totalSleep = allEvents.filter((e: any) => e.eventType === 'sleep').length
    const totalMeals = allEvents.filter((e: any) => e.eventType === 'meal').length
    const totalPlay = allEvents.filter((e: any) => e.eventType === 'play').length
    const totalBaths = allEvents.filter((e: any) => e.eventType === 'bath').length
    const totalOther = allEvents.filter((e: any) => !['nap', 'sleep', 'meal', 'play', 'bath'].includes(e.eventType)).length

    context += `HISTORIAL TOTAL:\n`
    context += `- Total eventos registrados: ${allEvents.length}\n`
    if (totalSleep > 0) context += `- Eventos de sueño: ${totalSleep}\n`
    if (totalNaps > 0) context += `- Siestas: ${totalNaps}\n`
    if (totalMeals > 0) context += `- Comidas: ${totalMeals}\n`
    if (totalPlay > 0) context += `- Juegos: ${totalPlay}\n`
    if (totalBaths > 0) context += `- Baños: ${totalBaths}\n`
    if (totalOther > 0) context += `- Otros: ${totalOther}\n`

    // ESTADÍSTICAS RECIENTES
    if (recentEvents.length > 0) {
      const recentNaps = recentEvents.filter((e: any) => e.eventType === 'nap').length
      const recentSleep = recentEvents.filter((e: any) => e.eventType === 'sleep').length
      
      context += `\nÚLTIMOS 7 DÍAS:\n`
      context += `- Eventos recientes: ${recentEvents.length}\n`
      if (recentSleep > 0) context += `- Sueño: ${recentSleep}\n`
      if (recentNaps > 0) context += `- Siestas: ${recentNaps}\n`
    }

    // ANÁLISIS DE ESTADOS EMOCIONALES (TODOS LOS EVENTOS)
    const allEmotionalStates = allEvents
      .map((e: any) => e.emotionalState)
      .filter((state: any) => state)
    
    if (allEmotionalStates.length > 0) {
      const stateCount: { [key: string]: number } = {}
      allEmotionalStates.forEach((state: string) => {
        stateCount[state] = (stateCount[state] || 0) + 1
      })
      
      context += `\nESTADOS EMOCIONALES (HISTORIAL COMPLETO):\n`
      Object.entries(stateCount).forEach(([state, count]) => {
        context += `- ${state}: ${count} veces\n`
      })
    }

    // EVENTOS MÁS RECIENTES (DETALLES)
    if (recentEvents.length > 0) {
      context += `\nEVENTOS MÁS RECIENTES:\n`
      recentEvents.slice(0, 5).forEach((event: any, index: number) => {
        const eventDate = new Date(event.startTime).toLocaleDateString()
        const eventTime = new Date(event.startTime).toLocaleTimeString()
        
        context += `${index + 1}. ${eventDate} ${eventTime} - ${event.eventType}`
        if (event.emotionalState) context += ` (${event.emotionalState})`
        if (event.notes) context += ` - ${event.notes}`
        context += "\n"
      })
    }

    // PATRONES DE SUEÑO
    const sleepEvents = allEvents.filter((e: any) => e.eventType === 'sleep' || e.eventType === 'nap')
    if (sleepEvents.length > 0) {
      const totalSleepTime = sleepEvents.reduce((total: number, event: any) => {
        return total + (event.duration || 0)
      }, 0)
      
      if (totalSleepTime > 0) {
        context += `\nPATRONES DE SUEÑO:\n`
        context += `- Tiempo total de sueño registrado: ${Math.round(totalSleepTime / 60)} horas\n`
        context += `- Promedio por evento: ${Math.round(totalSleepTime / sleepEvents.length)} minutos\n`
      }
    }
  }

  return context + "=== FIN DE INFORMACIÓN ===\n\n"
}

// 🔗 Función para combinar contextos
function buildCombinedContext(ragResults: any, childData: any): string {
  return `${ragResults.ragContext}\n\n${childData.userChildContext}`.trim()
}

// 🤖 Función para generar respuesta
async function generateResponse({ message, combinedContext, conversationHistory }: {
  message: string
  combinedContext: string
  conversationHistory: any[]
}) {
  const systemPrompt = getDoctorSystemPrompt(combinedContext)
  
  // Construir historial conversacional
  const conversationContext = conversationHistory.length > 0 
    ? `\nCONVERSACIÓN ANTERIOR:\n${conversationHistory.map((msg: any) => 
        `${msg.role === 'user' ? 'Padre/Madre' : 'Dra. Mariana'}: ${msg.content}`
      ).join('\n')}\n\nRECUERDA: Mantén coherencia con lo anterior.\n\n`
    : ''

  const { text } = await generateText({
    model: openai("gpt-4o"),
    prompt: `${systemPrompt}

${conversationContext}Consulta actual: ${message}`,
    maxTokens: 150,
    temperature: 0.7,
  })

  return text
}