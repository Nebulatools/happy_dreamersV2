// Configuración optimizada de MongoDB con connection pooling profesional
// Utiliza singleton con health checks y configuración de performance

import { MongoClient, MongoClientOptions, Db } from "mongodb"
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
  serverSelectionTimeoutMS: 5000,     // 5s para seleccionar servidor
  socketTimeoutMS: 45000,             // 45s timeout para operaciones
  connectTimeoutMS: 10000,            // 10s timeout para conectar
  
  // Reliability
  heartbeatFrequencyMS: 10000,        // Health check cada 10s
  retryWrites: true,                  // Retry automático en fallas
  retryReads: true,                   // Retry automático para lecturas
  
  // Performance
  compressors: ['snappy', 'zlib'],    // Compresión de datos
  zlibCompressionLevel: 6,            // Nivel de compresión balanceado
  
  // Monitoring
  monitorCommands: process.env.NODE_ENV === 'development',
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

// 🔌 FUNCIÓN DE CONEXIÓN SIMPLE Y ESTABLE
export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  const client = await clientPromise
  const dbName = process.env.MONGODB_DB_FINAL || process.env.MONGODB_DATABASE || process.env.MONGODB_DB
  const db = client.db(dbName)
  return { client, db }
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
        host: stats.host
      }
    }
  } catch (error: any) {
    return { connected: false, stats: null, error: error?.message }
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
  } catch (error: any) {
    return { healthy: false, error: error?.message }
  }
}

export default clientPromise
