// Cargador dinámico para librerías de AI - reduce bundle size significativamente
// Las librerías de AI solo se cargan cuando son necesarias (lazy loading)

import { createLogger } from "@/lib/logger"

const logger = createLogger("AILoader")

// Cache para módulos ya cargados
const moduleCache = new Map<string, any>()

/**
 * Carga dinámica de OpenAI SDK
 */
export async function loadOpenAI() {
  const cacheKey = "openai"
  
  if (moduleCache.has(cacheKey)) {
    return moduleCache.get(cacheKey)
  }
  
  try {
    logger.info("Cargando OpenAI SDK dinámicamente...")
    const [aiSdk, openaiModule] = await Promise.all([
      import("ai"),
      import("@ai-sdk/openai"),
    ])
    
    const result = {
      generateText: aiSdk.generateText,
      openai: openaiModule.openai,
    }
    
    moduleCache.set(cacheKey, result)
    logger.info("OpenAI SDK cargado exitosamente")
    return result
  } catch (error) {
    logger.error("Error cargando OpenAI SDK", error)
    throw new Error("No se pudo cargar OpenAI SDK")
  }
}

/**
 * Carga dinámica de LangChain
 */
export async function loadLangChain() {
  const cacheKey = "langchain"
  
  if (moduleCache.has(cacheKey)) {
    return moduleCache.get(cacheKey)
  }
  
  try {
    logger.info("Cargando LangChain dinámicamente...")
    const [
      langchainOpenai,
      langchainCore,
      langchainGraph,
      langchainPrebuilt,
    ] = await Promise.all([
      import("@langchain/openai"),
      import("@langchain/core/tools"),
      import("@langchain/langgraph"),
      import("@langchain/langgraph/prebuilt"),
    ])
    
    const result = {
      ChatOpenAI: langchainOpenai.ChatOpenAI,
      DynamicStructuredTool: langchainCore.DynamicStructuredTool,
      StateGraph: langchainGraph.StateGraph,
      Annotation: langchainGraph.Annotation,
      START: langchainGraph.START,
      END: langchainGraph.END,
      createReactAgent: langchainPrebuilt.createReactAgent,
    }
    
    moduleCache.set(cacheKey, result)
    logger.info("LangChain cargado exitosamente")
    return result
  } catch (error) {
    logger.error("Error cargando LangChain", error)
    throw new Error("No se pudo cargar LangChain")
  }
}

/**
 * Carga dinámica de LangChain Messages
 */
export async function loadLangChainMessages() {
  const cacheKey = "langchain-messages"
  
  if (moduleCache.has(cacheKey)) {
    return moduleCache.get(cacheKey)
  }
  
  try {
    const messagesModule = await import("@langchain/core/messages")
    
    const result = {
      BaseMessage: messagesModule.BaseMessage,
      HumanMessage: messagesModule.HumanMessage,
      AIMessage: messagesModule.AIMessage,
      SystemMessage: messagesModule.SystemMessage,
    }
    
    moduleCache.set(cacheKey, result)
    return result
  } catch (error) {
    logger.error("Error cargando LangChain Messages", error)
    throw new Error("No se pudo cargar LangChain Messages")
  }
}

/**
 * Carga dinámica de Google Generative AI
 */
export async function loadGoogleAI() {
  const cacheKey = "google-ai"
  
  if (moduleCache.has(cacheKey)) {
    return moduleCache.get(cacheKey)
  }
  
  try {
    logger.info("Cargando Google Generative AI dinámicamente...")
    const googleAI = await import("@google/generative-ai")
    
    const result = {
      GoogleGenerativeAI: googleAI.GoogleGenerativeAI,
    }
    
    moduleCache.set(cacheKey, result)
    logger.info("Google Generative AI cargado exitosamente")
    return result
  } catch (error) {
    logger.error("Error cargando Google Generative AI", error)
    throw new Error("No se pudo cargar Google Generative AI")
  }
}

/**
 * Carga dinámica del vector store de MongoDB
 */
export async function loadVectorStore() {
  const cacheKey = "vector-store"
  
  if (moduleCache.has(cacheKey)) {
    return moduleCache.get(cacheKey)
  }
  
  try {
    logger.info("Cargando Vector Store dinámicamente...")
    const vectorStore = await import("@/lib/rag/vector-store-mongodb")
    
    moduleCache.set(cacheKey, vectorStore)
    logger.info("Vector Store cargado exitosamente")
    return vectorStore
  } catch (error) {
    logger.error("Error cargando Vector Store", error)
    throw new Error("No se pudo cargar Vector Store")
  }
}

/**
 * Limpia el cache de módulos (útil para liberar memoria)
 */
export function clearAIModuleCache() {
  const cacheSize = moduleCache.size
  moduleCache.clear()
  logger.info(`Cache de módulos AI limpiado. ${cacheSize} módulos liberados.`)
}

/**
 * Obtiene el estado del cache
 */
export function getCacheStatus() {
  return {
    modulesLoaded: Array.from(moduleCache.keys()),
    cacheSize: moduleCache.size,
  }
}

// Wrapper para cargar todos los módulos AI necesarios
export async function loadAIModules(modules: string[] = ["openai", "langchain"]) {
  const loadPromises = []
  
  if (modules.includes("openai")) {
    loadPromises.push(loadOpenAI())
  }
  
  if (modules.includes("langchain")) {
    loadPromises.push(loadLangChain())
    loadPromises.push(loadLangChainMessages())
  }
  
  if (modules.includes("google")) {
    loadPromises.push(loadGoogleAI())
  }
  
  if (modules.includes("vectorstore")) {
    loadPromises.push(loadVectorStore())
  }
  
  const results = await Promise.all(loadPromises)
  
  // Combinar todos los resultados en un solo objeto
  return results.reduce((acc, curr) => ({ ...acc, ...curr }), {})
}

export default {
  loadOpenAI,
  loadLangChain,
  loadLangChainMessages,
  loadGoogleAI,
  loadVectorStore,
  loadAIModules,
  clearAIModuleCache,
  getCacheStatus,
}