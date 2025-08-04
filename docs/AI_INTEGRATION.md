# > Integraci�n de IA - Happy Dreamers

## =� Tabla de Contenidos

- [Visi�n General](#visi�n-general)
- [OpenAI GPT-4](#openai-gpt-4)
- [LangChain Integration](#langchain-integration)
- [RAG System](#rag-system)
- [Google Gemini](#google-gemini)
- [An�lisis de Sue�o](#an�lisis-de-sue�o)
- [Chat Agent](#chat-agent)
- [Prompts y Personalizaci�n](#prompts-y-personalizaci�n)
- [Optimizaci�n y Costos](#optimizaci�n-y-costos)
- [Troubleshooting](#troubleshooting)

## <� Visi�n General

Happy Dreamers utiliza m�ltiples sistemas de IA para proporcionar:
- **An�lisis de patrones de sue�o** con GPT-4
- **Consultas personalizadas** mediante RAG
- **Transcripci�n de audio** con Google Gemini
- **Generaci�n de planes** de mejora del sue�o

### Stack de IA

```typescript
// Tecnolog�as principales
{
  "llm": "OpenAI GPT-4",
  "framework": "LangChain + LangGraph",
  "vectorDB": "MongoDB Atlas Vector Search",
  "embeddings": "OpenAI text-embedding-ada-002",
  "transcription": "Google Gemini",
  "documentProcessing": "Mammoth + FAISS"
}
```

## >� OpenAI GPT-4

### Configuraci�n

```typescript
// lib/openai-config.ts
import { OpenAI } from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID, // Opcional
  maxRetries: 3,
  timeout: 30000, // 30 segundos
})

export default openai
```

### An�lisis de Sue�o

```typescript
// app/api/sleep-analysis/insights/route.ts
import { OpenAI } from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  const { childId, period } = await request.json()
  
  // Obtener datos del ni�o y eventos
  const child = await getChildData(childId)
  const events = await getSleepEvents(childId, period)
  
  // Preparar contexto
  const context = {
    edad: calculateAge(child.birthDate),
    patronesSue�o: analyzeSleepPatterns(events),
    estadoEmocional: getEmotionalTrends(events),
    historial: child.surveyData
  }
  
  // Generar an�lisis con GPT-4
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: getSleepAnalysisPrompt()
      },
      {
        role: "user",
        content: JSON.stringify(context)
      }
    ],
    temperature: 0.7,
    max_tokens: 1500,
    presence_penalty: 0.1,
    frequency_penalty: 0.1,
  })
  
  return NextResponse.json({
    analysis: completion.choices[0].message.content,
    usage: completion.usage
  })
}
```

### Generaci�n de Planes

```typescript
// app/api/consultas/plans/route.ts
export async function POST(request: NextRequest) {
  const { childId, analysisId, goals } = await request.json()
  
  const planPrompt = `
    Genera un plan personalizado de mejora del sue�o.
    
    Contexto del ni�o:
    ${JSON.stringify(childContext)}
    
    Objetivos:
    ${goals.join(", ")}
    
    El plan debe incluir:
    1. Fases semanales progresivas
    2. Acciones espec�ficas y medibles
    3. Indicadores de �xito
    4. Ajustes seg�n edad del ni�o
  `
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "Eres un especialista en sue�o infantil..."
      },
      {
        role: "user",
        content: planPrompt
      }
    ],
    temperature: 0.8,
    max_tokens: 2000,
    response_format: { type: "json_object" } // Respuesta estructurada
  })
  
  const plan = JSON.parse(completion.choices[0].message.content)
  
  // Guardar plan en base de datos
  await savePlan(childId, plan)
  
  return NextResponse.json({ plan })
}
```

## = LangChain Integration

### Configuraci�n Base

```typescript
// lib/langchain-config.ts
import { ChatOpenAI } from "@langchain/openai"
import { ConversationChain } from "langchain/chains"
import { BufferMemory } from "langchain/memory"

const model = new ChatOpenAI({
  modelName: "gpt-4",
  temperature: 0.7,
  openAIApiKey: process.env.OPENAI_API_KEY,
})

const memory = new BufferMemory()

export const conversationChain = new ConversationChain({
  llm: model,
  memory: memory,
  verbose: process.env.NODE_ENV === "development",
})
```

### LangGraph para Flujos Complejos

```typescript
// lib/langgraph/sleep-analysis-graph.ts
import { StateGraph } from "@langchain/langgraph"

interface SleepAnalysisState {
  childData: any
  events: any[]
  analysis: string
  recommendations: string[]
  plan: any
}

const workflow = new StateGraph<SleepAnalysisState>({
  channels: {
    childData: null,
    events: [],
    analysis: "",
    recommendations: [],
    plan: null,
  },
})

// Definir nodos
workflow.addNode("fetch_data", async (state) => {
  const childData = await fetchChildData(state.childId)
  const events = await fetchEvents(state.childId)
  return { childData, events }
})

workflow.addNode("analyze_patterns", async (state) => {
  const analysis = await analyzePatterns(state.events)
  return { analysis }
})

workflow.addNode("generate_recommendations", async (state) => {
  const recommendations = await generateRecommendations(state.analysis)
  return { recommendations }
})

workflow.addNode("create_plan", async (state) => {
  const plan = await createActionPlan(state.recommendations)
  return { plan }
})

// Definir edges
workflow.addEdge("fetch_data", "analyze_patterns")
workflow.addEdge("analyze_patterns", "generate_recommendations")
workflow.addEdge("generate_recommendations", "create_plan")

workflow.setEntryPoint("fetch_data")
workflow.setFinishPoint("create_plan")

export const sleepAnalysisGraph = workflow.compile()
```

## =� RAG System

### Vector Store Setup

```typescript
// lib/rag/vector-store-mongodb.ts
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb"
import { OpenAIEmbeddings } from "@langchain/openai"
import clientPromise from "@/lib/mongodb"

export async function getVectorStore() {
  const client = await clientPromise
  const collection = client.db().collection("documents")
  
  const vectorStore = new MongoDBAtlasVectorSearch(
    new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    }),
    {
      collection,
      indexName: "vector_index",
      textKey: "text",
      embeddingKey: "embedding",
    }
  )
  
  return vectorStore
}
```

### Document Processing

```typescript
// lib/rag/document-processor.ts
import { Document } from "@langchain/core/documents"
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"
import mammoth from "mammoth"

export class DocumentProcessor {
  private textSplitter: RecursiveCharacterTextSplitter
  
  constructor() {
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ["\n\n", "\n", ". ", " ", ""],
    })
  }
  
  async processDocument(file: File): Promise<Document[]> {
    let text = ""
    
    if (file.type === "application/pdf") {
      text = await this.extractPDFText(file)
    } else if (file.type.includes("word")) {
      text = await this.extractWordText(file)
    } else {
      text = await file.text()
    }
    
    // Dividir en chunks
    const chunks = await this.textSplitter.splitText(text)
    
    // Crear documentos con metadata
    return chunks.map((chunk, index) => new Document({
      pageContent: chunk,
      metadata: {
        source: file.name,
        chunkIndex: index,
        totalChunks: chunks.length,
        uploadedAt: new Date(),
      }
    }))
  }
  
  private async extractWordText(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    return result.value
  }
  
  private async extractPDFText(file: File): Promise<string> {
    // Implementaci�n de extracci�n PDF
    // Usar pdf-parse o similar
  }
}
```

### RAG Chat Implementation

```typescript
// lib/rag/chat-agent.ts
import { OpenAI } from "openai"
import { Document } from "@langchain/core/documents"
import { getDoctorSystemPrompt } from "./doctor-personality"

export class ChatAgent {
  private openai: OpenAI
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  
  async generateResponse(
    query: string,
    relevantDocs: Document[]
  ): Promise<string> {
    // Construir contexto desde documentos relevantes
    const context = relevantDocs.length > 0 
      ? relevantDocs.map(doc => {
        const source = doc.metadata.source || "documento"
        return `Fuente: ${source}\nContenido: ${doc.pageContent}`
      }).join("\n\n---\n\n")
      : ""
    
    // Usar prompt personalizado de doctora
    const systemPrompt = getDoctorSystemPrompt(context)
    
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: query,
        },
      ],
      max_tokens: 300,
      temperature: 0.8,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    })
    
    return completion.choices[0]?.message?.content || 
           "Lo siento, no pude generar una respuesta."
  }
}
```

## =. Google Gemini

### Transcripci�n de Audio

```typescript
// app/api/transcript/route.ts
import { GoogleGenerativeAI } from "@google/generative-ai"

export async function POST(request: NextRequest) {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  
  if (!apiKey) {
    return NextResponse.json(
      { error: "API key de Google Gemini no configurada" },
      { status: 500 }
    )
  }
  
  try {
    const { transcript } = await request.json()
    
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-pro" })
    
    const prompt = `
      Analiza la siguiente transcripci�n de una consulta sobre sue�o infantil.
      Extrae los puntos clave y preocupaciones principales:
      
      ${transcript}
    `
    
    const result = await model.generateContent(prompt)
    const response = await result.response
    const analysis = response.text()
    
    return NextResponse.json({ 
      success: true,
      analysis 
    })
  } catch (error) {
    logger.error("Error en transcripci�n:", error)
    return NextResponse.json(
      { error: "Error al procesar transcripci�n" },
      { status: 500 }
    )
  }
}
```

### Procesamiento de Documentos con Gemini

```typescript
// lib/rag/document-processor.ts
private async processWithGemini(text: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Gemini API key no configurada")
  }
  
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({ model: "gemini-pro" })
  
  const prompt = `
    Resume el siguiente texto manteniendo la informaci�n clave 
    sobre sue�o infantil y recomendaciones:
    
    ${text}
  `
  
  const result = await model.generateContent(prompt)
  return result.response.text()
}
```

## =� An�lisis de Sue�o

### Sistema de An�lisis Completo

```typescript
// lib/sleep-analysis/analyzer.ts
export class SleepAnalyzer {
  private openai: OpenAI
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  
  async analyzePatterns(events: SleepEvent[]): Promise<SleepAnalysis> {
    // 1. An�lisis estad�stico
    const stats = this.calculateStatistics(events)
    
    // 2. Detecci�n de patrones
    const patterns = this.detectPatterns(events)
    
    // 3. An�lisis emocional
    const emotionalTrends = this.analyzeEmotions(events)
    
    // 4. Generaci�n de insights con IA
    const insights = await this.generateInsights({
      stats,
      patterns,
      emotionalTrends
    })
    
    return {
      statistics: stats,
      patterns: patterns,
      emotionalAnalysis: emotionalTrends,
      insights: insights,
      recommendations: await this.generateRecommendations(insights)
    }
  }
  
  private calculateStatistics(events: SleepEvent[]) {
    return {
      totalSleepHours: this.getTotalSleepHours(events),
      averageSleepDuration: this.getAverageDuration(events),
      nightWakings: this.countNightWakings(events),
      sleepEfficiency: this.calculateEfficiency(events),
      consistency: this.calculateConsistency(events)
    }
  }
  
  private async generateInsights(data: any): Promise<string[]> {
    const prompt = `
      Bas�ndote en estos datos de sue�o infantil, genera 3-5 insights clave:
      
      Estad�sticas: ${JSON.stringify(data.stats)}
      Patrones: ${JSON.stringify(data.patterns)}
      Tendencias emocionales: ${JSON.stringify(data.emotionalTrends)}
      
      Los insights deben ser:
      1. Espec�ficos y accionables
      2. Basados en evidencia
      3. Apropiados para la edad del ni�o
      4. En espa�ol y f�ciles de entender para padres
    `
    
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Eres un especialista en sue�o infantil..."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    })
    
    return this.parseInsights(completion.choices[0].message.content)
  }
}
```

## =i� Chat Agent

### Personalidad de la Doctora

```typescript
// lib/rag/doctor-personality.ts
export function getDoctorSystemPrompt(context: string): string {
  return `
    Eres la Dra. Luna, una especialista en sue�o infantil con m�s de 15 a�os 
    de experiencia. Tu personalidad es:
    
    - C�lida y emp�tica
    - Profesional pero accesible
    - Paciente y comprensiva
    - Pr�ctica y orientada a soluciones
    
    CONTEXTO RELEVANTE:
    ${context}
    
    REGLAS DE COMUNICACI�N:
    1. Siempre habla en espa�ol
    2. Usa un tono amigable pero profesional
    3. Mant�n respuestas concisas (m�ximo 3-4 p�rrafos)
    4. Ofrece consejos pr�cticos y espec�ficos
    5. Muestra empat�a con las preocupaciones de los padres
    6. Evita jerga m�dica compleja
    7. Si no tienes informaci�n espec�fica, s� honesta
    
    ESTRUCTURA DE RESPUESTA:
    1. Reconoce la preocupaci�n del padre/madre
    2. Proporciona informaci�n relevante basada en el contexto
    3. Ofrece 2-3 recomendaciones pr�cticas
    4. Cierra con palabras de aliento
    
    Recuerda: Los padres est�n cansados y preocupados. 
    S� comprensiva y ofrece esperanza junto con soluciones pr�cticas.
  `
}
```

## � Prompts y Personalizaci�n

### Prompts Especializados

```typescript
// lib/prompts/sleep-analysis.ts
export const SLEEP_ANALYSIS_PROMPTS = {
  pattern_detection: `
    Analiza los siguientes eventos de sue�o y detecta patrones:
    - Despertares frecuentes
    - Horarios inconsistentes
    - Correlaci�n con estado emocional
    - Duraci�n de siestas vs sue�o nocturno
  `,
  
  recommendation_generation: `
    Bas�ndote en el an�lisis, genera recomendaciones que sean:
    1. Espec�ficas para la edad del ni�o
    2. Implementables gradualmente
    3. Basadas en evidencia cient�fica
    4. Culturalmente apropiadas
    5. Considerando la din�mica familiar
  `,
  
  plan_creation: `
    Crea un plan de mejora del sue�o de 4 semanas con:
    - Objetivos semanales claros
    - Acciones diarias espec�ficas
    - Indicadores de progreso
    - Ajustes seg�n respuesta del ni�o
    - Plan B para dificultades comunes
  `
}
```

## =� Optimizaci�n y Costos

### Control de Costos

```typescript
// lib/ai/cost-tracker.ts
export class AIUsageTracker {
  private static COSTS = {
    "gpt-4": {
      input: 0.03 / 1000,  // $0.03 per 1K tokens
      output: 0.06 / 1000, // $0.06 per 1K tokens
    },
    "gpt-3.5-turbo": {
      input: 0.001 / 1000,
      output: 0.002 / 1000,
    },
    "text-embedding-ada-002": 0.0001 / 1000,
  }
  
  async trackUsage(
    model: string,
    usage: { prompt_tokens: number; completion_tokens: number }
  ) {
    const cost = this.calculateCost(model, usage)
    
    await db.collection("ai_usage").insertOne({
      model,
      usage,
      cost,
      timestamp: new Date(),
    })
    
    // Alertar si el costo excede l�mites
    if (cost > 1.0) {
      await this.sendCostAlert(cost, model)
    }
  }
  
  private calculateCost(model: string, usage: any): number {
    const rates = AIUsageTracker.COSTS[model]
    if (!rates) return 0
    
    const inputCost = usage.prompt_tokens * rates.input
    const outputCost = usage.completion_tokens * rates.output
    
    return inputCost + outputCost
  }
}
```

### Estrategias de Optimizaci�n

```typescript
// lib/ai/optimization.ts
export const AI_OPTIMIZATION = {
  // Cache de respuestas frecuentes
  caching: {
    enabled: true,
    ttl: 3600, // 1 hora
    maxSize: 100, // m�ximo 100 respuestas cacheadas
  },
  
  // Selecci�n inteligente de modelo
  modelSelection: {
    simple_queries: "gpt-3.5-turbo",
    complex_analysis: "gpt-4",
    embeddings: "text-embedding-ada-002",
  },
  
  // L�mites de tokens
  tokenLimits: {
    max_input: 2000,
    max_output: 1000,
    summary_length: 500,
  },
  
  // Batching de requests
  batching: {
    enabled: true,
    maxBatchSize: 10,
    maxWaitTime: 1000, // 1 segundo
  },
}

// Implementaci�n de cache
class ResponseCache {
  private cache: Map<string, CachedResponse> = new Map()
  
  get(key: string): string | null {
    const cached = this.cache.get(key)
    if (!cached) return null
    
    if (Date.now() - cached.timestamp > AI_OPTIMIZATION.caching.ttl * 1000) {
      this.cache.delete(key)
      return null
    }
    
    return cached.response
  }
  
  set(key: string, response: string) {
    if (this.cache.size >= AI_OPTIMIZATION.caching.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    
    this.cache.set(key, {
      response,
      timestamp: Date.now(),
    })
  }
}
```

## =' Troubleshooting

### Problemas Comunes

#### Rate Limiting de OpenAI

```typescript
// Implementar retry con exponential backoff
import { backOff } from "exponential-backoff"

async function callOpenAIWithRetry(fn: () => Promise<any>) {
  return backOff(fn, {
    numOfAttempts: 5,
    startingDelay: 1000,
    timeMultiple: 2,
    maxDelay: 30000,
    retry: (error: any) => {
      // Retry en rate limit errors
      return error?.response?.status === 429
    },
  })
}
```

#### Timeout en Requests Largos

```typescript
// Configurar timeouts apropiados
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000, // 60 segundos para an�lisis complejos
  maxRetries: 3,
})

// Para Vercel, usar streaming
export async function POST(request: NextRequest) {
  const stream = await openai.chat.completions.create({
    model: "gpt-4",
    messages: messages,
    stream: true,
  })
  
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  })
}
```

#### Embeddings Incorrectos

```typescript
// Validar y normalizar texto antes de embeddings
function prepareTextForEmbedding(text: string): string {
  return text
    .replace(/\s+/g, " ") // Normalizar espacios
    .trim()
    .slice(0, 8000) // L�mite de tokens
}
```

### Debugging de IA

```typescript
// lib/ai/debug.ts
export const AI_DEBUG = {
  logPrompts: process.env.NODE_ENV === "development",
  logResponses: process.env.NODE_ENV === "development",
  logTokenUsage: true,
  logCosts: true,
  
  debugPrompt: (prompt: string) => {
    if (AI_DEBUG.logPrompts) {
      console.log("> PROMPT:", prompt)
    }
  },
  
  debugResponse: (response: any) => {
    if (AI_DEBUG.logResponses) {
      console.log("=� RESPONSE:", response)
    }
  },
  
  debugUsage: (usage: any) => {
    if (AI_DEBUG.logTokenUsage) {
      console.log("=� TOKEN USAGE:", usage)
    }
  },
}
```

---

**�ltima actualizaci�n:** Enero 2024  
**Versi�n:** 1.0.0