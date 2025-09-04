// Configuración de Mongoose para Happy Dreamers
// Conexión singleton compatible con MongoDB nativo existente

import mongoose from 'mongoose'
import { createLogger } from "@/lib/logger"

const logger = createLogger("Mongoose")

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"')
}

const MONGODB_URI = process.env.MONGODB_URI

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

// Usar global cache para evitar múltiples conexiones en desarrollo
declare global {
  var mongoose: MongooseCache | undefined
}

let cached: MongooseCache = global.mongoose || {
  conn: null,
  promise: null,
}

if (!global.mongoose) {
  global.mongoose = cached
}

// Configuración optimizada de Mongoose
const mongooseOptions = {
  // Configuraciones compatibles con nuestro setup MongoDB existente
  maxPoolSize: 10,                    // Máximo 10 conexiones (mismo que MongoDB)
  minPoolSize: 2,                     // Mínimo 2 conexiones (mismo que MongoDB)
  maxIdleTimeMS: 30000,               // 30s timeout (mismo que MongoDB)
  serverSelectionTimeoutMS: 5000,     // 5s para seleccionar servidor (mismo que MongoDB)
  socketTimeoutMS: 45000,             // 45s timeout para operaciones (mismo que MongoDB)
  connectTimeoutMS: 10000,            // 10s timeout para conectar (mismo que MongoDB)
  heartbeatFrequencyMS: 10000,        // Health check cada 10s (mismo que MongoDB)
  
  // Configuraciones específicas de Mongoose
  bufferCommands: false,              // No bufferear comandos si no hay conexión
  bufferMaxEntries: 0,                // No limitar buffer
  useNewUrlParser: true,              // Usar nuevo parser de URL
  useUnifiedTopology: true,           // Usar nueva topología unificada
}

async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) {
    logger.info("Using cached Mongoose connection")
    return cached.conn
  }

  if (!cached.promise) {
    logger.info("Creating new Mongoose connection")
    
    cached.promise = mongoose.connect(MONGODB_URI, mongooseOptions)
      .then((mongoose) => {
        logger.info("Mongoose connected successfully")
        
        // Event listeners para monitoreo
        mongoose.connection.on('error', (error) => {
          logger.error("Mongoose connection error:", error)
        })

        mongoose.connection.on('disconnected', () => {
          logger.warn("Mongoose disconnected")
        })

        mongoose.connection.on('reconnected', () => {
          logger.info("Mongoose reconnected")
        })

        return mongoose
      })
      .catch((error) => {
        logger.error("Mongoose connection failed:", error)
        cached.promise = null
        throw error
      })
  }

  cached.conn = await cached.promise
  return cached.conn
}

// Health check específico para Mongoose
export async function mongooseHealthCheck(): Promise<{ 
  healthy: boolean
  readyState: number
  readyStateText: string
  error?: string 
}> {
  try {
    await dbConnect()
    
    const readyStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    }

    const readyState = mongoose.connection.readyState
    const readyStateText = readyStates[readyState as keyof typeof readyStates]
    const healthy = readyState === 1

    return { 
      healthy, 
      readyState, 
      readyStateText 
    }
  } catch (error: any) {
    return { 
      healthy: false, 
      readyState: 0, 
      readyStateText: 'error',
      error: error.message 
    }
  }
}

// Función de desconexión para limpiar conexiones (útil en tests)
export async function mongooseDisconnect(): Promise<void> {
  if (cached.conn) {
    await cached.conn.disconnect()
    cached.conn = null
    cached.promise = null
    logger.info("Mongoose disconnected and cache cleared")
  }
}

// Función principal exportada
export default dbConnect