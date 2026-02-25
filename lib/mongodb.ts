// Configuración optimizada de MongoDB con connection pooling profesional
// Utiliza singleton con health checks y configuración de performance

import { MongoClient, MongoClientOptions, Db } from "mongodb"
import * as Sentry from "@sentry/nextjs"
import { createLogger } from "@/lib/logger"

const logger = createLogger("MongoDB")

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"')
}

const uri = process.env.MONGODB_URI

// 🏊‍♂️ CONFIGURACIÓN PROFESIONAL DEL CONNECTION POOL
const options: MongoClientOptions = {
  // Connection Pool
  maxPoolSize: 10,                    // Máximo 10 conexiones concurrentes
  minPoolSize: 2,                     // Mínimo 2 conexiones en el pool
  maxIdleTimeMS: 30000,               // 30s timeout para conexiones idle
  
  // Timeouts
  serverSelectionTimeoutMS: 15000,    // 15s para seleccionar servidor (cold starts)
  socketTimeoutMS: 45000,             // 45s timeout para operaciones
  connectTimeoutMS: 15000,            // 15s timeout para conectar (cold starts)
  
  // Reliability
  heartbeatFrequencyMS: 10000,        // Health check cada 10s
  retryWrites: true,                  // Retry automático en fallas
  retryReads: true,                   // Retry automático para lecturas
  
  // Performance
  compressors: ["snappy", "zlib"],    // Compresión de datos
  zlibCompressionLevel: 6,            // Nivel de compresión balanceado
  
  // Monitoring
  monitorCommands: process.env.NODE_ENV === "development",
}

// 🏗️ SINGLETON PATTERN SIMPLE (SIN HEALTH CHECKS)
let client: MongoClient
let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === "development") {
  // En desarrollo, usamos una variable global para preservar la conexión entre recargas de HMR
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  }

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options)
    globalWithMongo._mongoClientPromise = client.connect()
  }
  clientPromise = globalWithMongo._mongoClientPromise
} else {
  // En producción, es mejor no usar una variable global
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

// 🔌 FUNCIÓN DE CONEXIÓN CON RETRY PARA COLD STARTS
const MAX_RETRIES = 2
const RETRY_DELAY_MS = 1000

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const client = await clientPromise
      const dbName = process.env.MONGODB_DB_FINAL || process.env.MONGODB_DATABASE || process.env.MONGODB_DB
      const db = client.db(dbName)

      Sentry.addBreadcrumb({
        category: "mongodb",
        message: `Conexion establecida (intento ${attempt})`,
        level: "info",
      })

      return { client, db }
    } catch (error) {
      lastError = error as Error
      logger.warn(`Intento ${attempt}/${MAX_RETRIES} fallido: ${lastError.message}`)

      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
      }
    }
  }

  Sentry.captureException(lastError, {
    tags: { module: "mongodb", action: "connectToDatabase" },
    extra: { retries: MAX_RETRIES },
  })

  throw lastError
}

// 📊 FUNCIONES UTILITARIAS PARA MONITOREO (SIMPLIFICADAS)
export async function getConnectionStats() {
  try {
    const { client } = await connectToDatabase()
    const stats = await client.db().admin().serverStatus()
    return {
      connected: true,
      stats: {
        connections: stats.connections,
        uptime: stats.uptime,
        version: stats.version,
        host: stats.host,
      },
    }
  } catch (error) {
    return { connected: false, stats: null, error: (error as Error).message }
  }
}

// 🏥 HEALTH CHECK SIMPLE
export async function healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
  try {
    const start = Date.now()
    const { client } = await connectToDatabase()
    await client.db().admin().ping()
    const latency = Date.now() - start
    
    return { healthy: true, latency }
  } catch (error) {
    return { healthy: false, error: (error as Error).message }
  }
}

export default clientPromise
