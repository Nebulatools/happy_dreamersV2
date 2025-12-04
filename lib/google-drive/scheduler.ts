import { getGoogleDriveSyncService } from "./sync-service"
import { createLogger } from "@/lib/logger"

const logger = createLogger("GoogleDriveScheduler")

export interface SchedulerStatus {
  isRunning: boolean
  interval: string
  nextRun: string | null
  lastRun: string | null
  runsCount: number
  errorsCount: number
}

/**
 * Scheduler para ejecutar sincronización automática con Google Drive
 * Usa setTimeout recursivo en lugar de cron para mayor control
 */
export class GoogleDriveScheduler {
  private syncService = getGoogleDriveSyncService()
  private isRunning = false
  private timeoutId: NodeJS.Timeout | null = null
  private intervalMs: number = 30 * 60 * 1000 // 30 minutos por defecto
  private nextRunTime: Date | null = null
  private lastRunTime: Date | null = null
  private runsCount = 0
  private errorsCount = 0

  constructor() {
    // Parsear intervalo desde variables de entorno
    this.parseInterval()
    
    // Auto-iniciar si está habilitado
    if (this.syncService.isEnabled()) {
      this.start()
    }
  }

  /**
   * Parsea el intervalo de sincronización desde variables de entorno
   */
  private parseInterval() {
    const cronPattern = process.env.GOOGLE_DRIVE_SYNC_INTERVAL || "*/30 * * * *"
    
    try {
      // Convertir patrón cron simple a milisegundos
      // Soporta: */N * * * * (cada N minutos)
      const parts = cronPattern.split(" ")
      
      if (parts.length >= 5 && parts[0].startsWith("*/")) {
        const minutes = parseInt(parts[0].replace("*/", ""))
        if (!isNaN(minutes) && minutes > 0) {
          this.intervalMs = minutes * 60 * 1000
          logger.info(`📅 Intervalo de sincronización configurado: cada ${minutes} minutos`)
          return
        }
      }

      // Fallback para otros patrones comunes
      if (cronPattern === "0 */2 * * *") { // Cada 2 horas
        this.intervalMs = 2 * 60 * 60 * 1000
      } else if (cronPattern === "0 0 * * *") { // Una vez al día
        this.intervalMs = 24 * 60 * 60 * 1000
      } else {
        // Default: 30 minutos
        this.intervalMs = 30 * 60 * 1000
        logger.warn(`⚠️  Patrón cron no reconocido: ${cronPattern}. Usando 30 minutos por defecto`)
      }

      logger.info(`📅 Intervalo de sincronización: ${this.intervalMs / 1000 / 60} minutos`)

    } catch (error) {
      logger.error("❌ Error parseando intervalo de sincronización:", error)
      this.intervalMs = 30 * 60 * 1000 // Fallback a 30 minutos
    }
  }

  /**
   * Inicia el scheduler
   */
  start(): void {
    if (this.isRunning) {
      logger.warn("⚠️  Scheduler ya está ejecutándose")
      return
    }

    if (!this.syncService.isEnabled()) {
      logger.warn("⚠️  Google Drive sync no está habilitado, no se puede iniciar scheduler")
      return
    }

    this.isRunning = true
    this.scheduleNextRun()
    
    logger.info(`🟢 Scheduler de Google Drive iniciado (intervalo: ${this.intervalMs / 1000 / 60}min)`)
  }

  /**
   * Detiene el scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn("⚠️  Scheduler no está ejecutándose")
      return
    }

    this.isRunning = false
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }

    this.nextRunTime = null
    
    logger.info("🔴 Scheduler de Google Drive detenido")
  }

  /**
   * Reinicia el scheduler
   */
  restart(): void {
    logger.info("🔄 Reiniciando scheduler de Google Drive")
    this.stop()
    
    // Recargar configuración
    this.parseInterval()
    
    // Reiniciar si está habilitado
    if (this.syncService.isEnabled()) {
      this.start()
    }
  }

  /**
   * Programa la siguiente ejecución
   */
  private scheduleNextRun(): void {
    if (!this.isRunning) {
      return
    }

    this.nextRunTime = new Date(Date.now() + this.intervalMs)
    
    this.timeoutId = setTimeout(async () => {
      await this.runSync()
      this.scheduleNextRun() // Programar siguiente ejecución
    }, this.intervalMs)

    logger.info(`⏰ Próxima sincronización programada: ${this.nextRunTime.toLocaleString()}`)
  }

  /**
   * Ejecuta sincronización automática
   */
  private async runSync(): Promise<void> {
    try {
      this.lastRunTime = new Date()
      this.runsCount++

      logger.info(`🚀 Ejecutando sincronización automática #${this.runsCount}`)

      // Ejecutar sincronización incremental
      const result = await this.syncService.syncWithDrive(false)

      if (result.success) {
        logger.info(`✅ Sincronización automática exitosa: ${result.message}`)
      } else {
        logger.error(`❌ Sincronización automática falló: ${result.message}`)
        this.errorsCount++
      }

    } catch (error) {
      this.errorsCount++
      logger.error("❌ Error en sincronización automática:", error)
    }
  }

  /**
   * Ejecuta sincronización manual (sin afectar el scheduler)
   */
  async runManualSync(fullSync: boolean = false): Promise<any> {
    try {
      logger.info(`🎯 Ejecutando sincronización manual ${fullSync ? "completa" : "incremental"}`)

      const result = await this.syncService.syncWithDrive(fullSync)

      if (result.success) {
        logger.info(`✅ Sincronización manual exitosa: ${result.message}`)
      } else {
        logger.error(`❌ Sincronización manual falló: ${result.message}`)
      }

      return result

    } catch (error) {
      logger.error("❌ Error en sincronización manual:", error)
      return {
        success: false,
        message: `Error en sincronización: ${(error as Error).message}`,
        stats: {
          filesScanned: 0,
          filesProcessed: 0,
          filesSkipped: 0,
          chunksAdded: 0,
          errorsCount: 1,
        },
        errors: [(error as Error).message],
        duration: 0,
      }
    }
  }

  /**
   * Obtiene el estado actual del scheduler
   */
  getStatus(): SchedulerStatus {
    return {
      isRunning: this.isRunning,
      interval: `${this.intervalMs / 1000 / 60} minutos`,
      nextRun: this.nextRunTime?.toISOString() || null,
      lastRun: this.lastRunTime?.toISOString() || null,
      runsCount: this.runsCount,
      errorsCount: this.errorsCount,
    }
  }

  /**
   * Configura nuevo intervalo de sincronización
   */
  setInterval(minutes: number): void {
    if (minutes < 5) {
      throw new Error("El intervalo mínimo es 5 minutos")
    }

    if (minutes > 1440) { // 24 horas
      throw new Error("El intervalo máximo es 24 horas (1440 minutos)")
    }

    this.intervalMs = minutes * 60 * 1000
    logger.info(`📅 Intervalo actualizado: ${minutes} minutos`)

    // Si está corriendo, reiniciar con nuevo intervalo
    if (this.isRunning) {
      this.restart()
    }
  }

  /**
   * Obtiene estadísticas del scheduler
   */
  getStats(): {
    isRunning: boolean
    interval: string
    nextRun: string | null
    lastRun: string | null
    totalRuns: number
    successfulRuns: number
    errorRuns: number
    successRate: string
    uptime: string
    } {
    const successfulRuns = this.runsCount - this.errorsCount
    const successRate = this.runsCount > 0 
      ? `${((successfulRuns / this.runsCount) * 100).toFixed(1)}%`
      : "0%"

    const uptimeMs = this.lastRunTime 
      ? Date.now() - this.lastRunTime.getTime()
      : 0
    
    const uptime = this.formatDuration(uptimeMs)

    return {
      isRunning: this.isRunning,
      interval: `${this.intervalMs / 1000 / 60} minutos`,
      nextRun: this.nextRunTime?.toISOString() || null,
      lastRun: this.lastRunTime?.toISOString() || null,
      totalRuns: this.runsCount,
      successfulRuns,
      errorRuns: this.errorsCount,
      successRate,
      uptime,
    }
  }

  /**
   * Formatea duración en texto legible
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  /**
   * Limpieza cuando se destruye la instancia
   */
  destroy(): void {
    this.stop()
    logger.info("🧹 Scheduler de Google Drive destruido")
  }
}

// Singleton instance
let schedulerInstance: GoogleDriveScheduler | null = null

/**
 * Obtiene la instancia singleton del scheduler
 */
export function getGoogleDriveScheduler(): GoogleDriveScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new GoogleDriveScheduler()
  }
  return schedulerInstance
}

// Cleanup en proceso de salida
process.on("SIGTERM", () => {
  if (schedulerInstance) {
    schedulerInstance.destroy()
  }
})

process.on("SIGINT", () => {
  if (schedulerInstance) {
    schedulerInstance.destroy()
  }
})