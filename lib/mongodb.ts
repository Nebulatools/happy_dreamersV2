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

// Configuración del connection pool optimizada para MongoDB Atlas M0 (free tier)
// M0 tiene conexiones compartidas y throttling, hay que ser conservador
const options: MongoClientOptions = {
  // Connection Pool - conservador para M0 free tier
  maxPoolSize: 3,                     // M0 tiene limite compartido, no saturar
  minPoolSize: 0,                     // No mantener conexiones idle en serverless
  maxIdleTimeMS: 15000,               // 15s idle timeout (liberar rapido en M0)

  // Timeouts - tolerantes a cold starts en M0
  serverSelectionTimeoutMS: 20000,    // 20s para seleccionar servidor (M0 puede ser lento)
  socketTimeoutMS: 45000,             // 45s timeout para operaciones
  connectTimeoutMS: 20000,            // 20s timeout para conectar (M0 cold starts)
  
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
