// Servicio de logging profesional para reemplazar console.log
// Previene la exposición de información sensible en producción

type LogLevel = "debug" | "info" | "warn" | "error"

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  data?: unknown
  context?: string
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development"
  private context: string

  constructor(context: string = "General") {
    this.context = context
  }

  private formatMessage(level: LogLevel, message: string, data?: unknown): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      data,
      context: this.context,
    }
  }

  private shouldLog(level: LogLevel): boolean {
    // En producción solo mostramos warnings y errores
    if (!this.isDevelopment) {
      return level === "warn" || level === "error"
    }
    return true
  }

  private sanitizeData(data: unknown): unknown {
    if (!data) return data
    
    // Remover información sensible
    const sensitiveKeys = ["password", "token", "secret", "apiKey", "authorization"]
    
    if (typeof data === "object" && data !== null) {
      const sanitized = { ...data } as Record<string, unknown>
      
      Object.keys(sanitized).forEach(key => {
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
          sanitized[key] = "[REDACTED]"
        } else if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
          sanitized[key] = this.sanitizeData(sanitized[key])
        }
      })
      
      return sanitized
    }
    
    return data
  }

  debug(message: string, data?: unknown): void {
    if (this.shouldLog("debug") && this.isDevelopment) {
      const logEntry = this.formatMessage("debug", message, this.sanitizeData(data))
      if (logEntry && logEntry.timestamp && logEntry.context) {
        // eslint-disable-next-line no-console
        console.log(`[${logEntry.timestamp}] [${logEntry.context}] DEBUG:`, message, data || "")
      }
    }
  }

  info(message: string, data?: unknown): void {
    if (this.shouldLog("info")) {
      const logEntry = this.formatMessage("info", message, this.sanitizeData(data))
      if (this.isDevelopment) {
        // eslint-disable-next-line no-console
        console.log(`[${logEntry.timestamp}] [${logEntry.context}] INFO:`, message, data || "")
      }
      // En producción, aquí enviaríamos a un servicio de logging como Sentry, LogRocket, etc.
    }
  }

  warn(message: string, data?: unknown): void {
    if (this.shouldLog("warn")) {
      const logEntry = this.formatMessage("warn", message, this.sanitizeData(data))
      // eslint-disable-next-line no-console
      console.warn(`[${logEntry.timestamp}] [${logEntry.context}] WARN:`, message, data || "")
      // TODO: Enviar a servicio de monitoreo en producción
    }
  }

  error(message: string, error?: Error | unknown): void {
    if (this.shouldLog("error")) {
      const errorData = error instanceof Error ? {
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined,
        name: error.name,
      } : error

      try {
        const logEntry = this.formatMessage("error", message, this.sanitizeData(errorData))
        
        // Defensive programming: Ensure logEntry is valid
        if (!logEntry || typeof logEntry !== "object" || !logEntry.timestamp || !logEntry.context) {
          // Fallback logging if formatMessage fails
          // eslint-disable-next-line no-console
          console.error(`[${new Date().toISOString()}] [${this.context || "Unknown"}] ERROR:`, message, errorData || "")
          return
        }

        // eslint-disable-next-line no-console
        console.error(`[${logEntry.timestamp}] [${logEntry.context}] ERROR:`, message, errorData || "")
        
        // TODO: En producción, enviar a servicio de monitoreo (Sentry, etc.)
        // if (!this.isDevelopment && typeof window === 'undefined') {
        //   // Enviar a servicio de logging
        // }
      } catch (loggerError) {
        // Ultimate fallback if logger itself fails
        // eslint-disable-next-line no-console
        console.error(`[${new Date().toISOString()}] [Logger Error] Failed to log error:`, message, errorData || "", loggerError)
      }
    }
  }

  // Método para crear un logger con contexto específico
  child(context: string): Logger {
    return new Logger(`${this.context}:${context}`)
  }
}

// Exportar instancia por defecto
export const logger = new Logger()

// Exportar función para crear logger con contexto
export function createLogger(context: string): Logger {
  return new Logger(context)
}

// Exportar la clase para casos especiales
export { Logger }
