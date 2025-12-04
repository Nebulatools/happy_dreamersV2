import { getGoogleDriveScheduler } from "./scheduler"
import { getGoogleDriveSyncService } from "./sync-service"
import { isGoogleDriveEnabled } from "./drive-client"
import { createLogger } from "@/lib/logger"

const logger = createLogger("GoogleDriveInit")

/**
 * Inicializa el sistema de Google Drive
 * - Verifica configuración
 * - Inicia el scheduler si está habilitado
 * - Ejecuta verificación de conexión
 */
export async function initializeGoogleDrive(): Promise<{
  success: boolean
  message: string
  isEnabled: boolean
  schedulerStarted: boolean
}> {
  try {
    logger.info("🚀 Inicializando sistema de Google Drive...")

    // Verificar si está habilitado
    const isEnabled = isGoogleDriveEnabled()
    
    if (!isEnabled) {
      logger.info("ℹ️  Google Drive sync está deshabilitado o no configurado")
      return {
        success: true,
        message: "Google Drive sync no está habilitado",
        isEnabled: false,
        schedulerStarted: false,
      }
    }

    logger.info("✅ Google Drive sync está habilitado")

    // Obtener servicios
    const syncService = getGoogleDriveSyncService()
    const scheduler = getGoogleDriveScheduler()

    // Verificar conexión
    logger.info("🔗 Verificando conexión con Google Drive...")
    const connectionOk = await syncService.testConnection()

    if (!connectionOk) {
      logger.error("❌ Error de conexión con Google Drive")
      return {
        success: false,
        message: "Error de conexión con Google Drive. Verifica las credenciales.",
        isEnabled: true,
        schedulerStarted: false,
      }
    }

    logger.info("✅ Conexión con Google Drive verificada")

    // El scheduler ya se auto-inicia en su constructor si está habilitado
    const schedulerStatus = scheduler.getStatus()
    const schedulerStarted = schedulerStatus.isRunning

    if (schedulerStarted) {
      logger.info(`⏰ Scheduler iniciado - próxima ejecución: ${schedulerStatus.nextRun}`)
    } else {
      logger.warn("⚠️  Scheduler no se pudo iniciar")
    }

    // Obtener estadísticas iniciales
    const stats = await syncService.getStats()
    logger.info(`📊 Estadísticas: ${stats.totalDocuments} docs totales, ${stats.driveDocuments} de Drive`)

    return {
      success: true,
      message: `Google Drive inicializado correctamente. ${stats.driveDocuments} documentos sincronizados.`,
      isEnabled: true,
      schedulerStarted,
    }

  } catch (error) {
    logger.error("❌ Error inicializando Google Drive:", error)
    return {
      success: false,
      message: `Error inicializando Google Drive: ${(error as Error).message}`,
      isEnabled: isGoogleDriveEnabled(),
      schedulerStarted: false,
    }
  }
}

/**
 * Verifica el estado del sistema de Google Drive
 */
export async function checkGoogleDriveStatus(): Promise<{
  isEnabled: boolean
  isConfigured: boolean
  connectionOk: boolean
  schedulerRunning: boolean
  lastSync: string | null
  totalDocuments: number
  driveDocuments: number
  errors: string[]
}> {
  const errors: string[] = []

  try {
    // Verificar configuración básica
    const isEnabled = isGoogleDriveEnabled()
    
    if (!isEnabled) {
      return {
        isEnabled: false,
        isConfigured: false,
        connectionOk: false,
        schedulerRunning: false,
        lastSync: null,
        totalDocuments: 0,
        driveDocuments: 0,
        errors: ["Google Drive sync no está habilitado o configurado"],
      }
    }

    // Verificar variables de entorno requeridas
    const requiredEnvVars = [
      "GOOGLE_DRIVE_CLIENT_EMAIL",
      "GOOGLE_DRIVE_PRIVATE_KEY",
      "GOOGLE_DRIVE_PROJECT_ID",
      "GOOGLE_DRIVE_FOLDER_ID",
    ]

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
    if (missingVars.length > 0) {
      errors.push(`Variables de entorno faltantes: ${missingVars.join(", ")}`)
    }

    const isConfigured = missingVars.length === 0

    // Verificar conexión si está configurado
    let connectionOk = false
    if (isConfigured) {
      try {
        const syncService = getGoogleDriveSyncService()
        connectionOk = await syncService.testConnection()
        
        if (!connectionOk) {
          errors.push("Error de conexión con Google Drive API")
        }
      } catch (error) {
        errors.push(`Error probando conexión: ${(error as Error).message}`)
      }
    }

    // Verificar estado del scheduler
    let schedulerRunning = false
    if (isConfigured) {
      try {
        const scheduler = getGoogleDriveScheduler()
        const schedulerStatus = scheduler.getStatus()
        schedulerRunning = schedulerStatus.isRunning
      } catch (error) {
        errors.push(`Error verificando scheduler: ${(error as Error).message}`)
      }
    }

    // Obtener estadísticas
    let stats = {
      lastSync: null,
      totalDocuments: 0,
      driveDocuments: 0,
    }

    if (isConfigured && connectionOk) {
      try {
        const syncService = getGoogleDriveSyncService()
        const syncStats = await syncService.getStats()
        const syncStatus = await syncService.getSyncStatus()
        
        stats = {
          lastSync: syncStatus.lastSyncAt || null,
          totalDocuments: syncStats.totalDocuments,
          driveDocuments: syncStats.driveDocuments,
        }
      } catch (error) {
        errors.push(`Error obteniendo estadísticas: ${(error as Error).message}`)
      }
    }

    return {
      isEnabled,
      isConfigured,
      connectionOk,
      schedulerRunning,
      lastSync: stats.lastSync,
      totalDocuments: stats.totalDocuments,
      driveDocuments: stats.driveDocuments,
      errors,
    }

  } catch (error) {
    errors.push(`Error verificando estado: ${(error as Error).message}`)
    
    return {
      isEnabled: false,
      isConfigured: false,
      connectionOk: false,
      schedulerRunning: false,
      lastSync: null,
      totalDocuments: 0,
      driveDocuments: 0,
      errors,
    }
  }
}

/**
 * Obtiene diagnóstico detallado del sistema
 */
export async function getGoogleDriveDiagnostics(): Promise<{
  timestamp: string
  configuration: {
    enabled: boolean
    projectId: string | null
    clientEmail: string | null
    folderId: string | null
    syncInterval: string
    hasPrivateKey: boolean
  }
  connection: {
    status: "ok" | "error" | "not_tested"
    message: string
  }
  scheduler: {
    running: boolean
    interval: string
    nextRun: string | null
    lastRun: string | null
    totalRuns: number
    errorRuns: number
  }
  data: {
    totalDocuments: number
    driveDocuments: number
    lastSyncAt: string | null
    lastSyncStatus: string
  }
  recommendations: string[]
}> {
  const recommendations: string[] = []

  // Configuración
  const projectId = process.env.GOOGLE_DRIVE_PROJECT_ID || null
  const clientEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL || null
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || null
  const syncInterval = process.env.GOOGLE_DRIVE_SYNC_INTERVAL || "*/30 * * * *"
  const hasPrivateKey = !!(process.env.GOOGLE_DRIVE_PRIVATE_KEY?.length)
  const enabled = process.env.GOOGLE_DRIVE_SYNC_ENABLED === "true"

  // Recommendations de configuración
  if (!enabled) {
    recommendations.push("Habilitar Google Drive sync con GOOGLE_DRIVE_SYNC_ENABLED=true")
  }
  
  if (!projectId) {
    recommendations.push("Configurar GOOGLE_DRIVE_PROJECT_ID con tu Project ID de Google Cloud")
  }
  
  if (!clientEmail) {
    recommendations.push("Configurar GOOGLE_DRIVE_CLIENT_EMAIL con el email de tu service account")
  }
  
  if (!hasPrivateKey) {
    recommendations.push("Configurar GOOGLE_DRIVE_PRIVATE_KEY con la clave privada de tu service account")
  }
  
  if (!folderId) {
    recommendations.push("Configurar GOOGLE_DRIVE_FOLDER_ID con el ID de tu carpeta de Google Drive")
  }

  // Test de conexión
  let connection = {
    status: "not_tested" as const,
    message: "No se pudo probar la conexión",
  }

  if (enabled && projectId && clientEmail && hasPrivateKey && folderId) {
    try {
      const syncService = getGoogleDriveSyncService()
      const connectionOk = await syncService.testConnection()
      
      connection = {
        status: connectionOk ? "ok" : "error",
        message: connectionOk 
          ? "Conexión exitosa con Google Drive" 
          : "Error de conexión con Google Drive",
      }

      if (!connectionOk) {
        recommendations.push("Verificar credenciales de Google Drive y permisos de la carpeta")
      }
    } catch (error) {
      connection = {
        status: "error",
        message: `Error probando conexión: ${(error as Error).message}`,
      }
    }
  }

  // Estado del scheduler
  let scheduler = {
    running: false,
    interval: "30 minutos",
    nextRun: null as string | null,
    lastRun: null as string | null,
    totalRuns: 0,
    errorRuns: 0,
  }

  if (enabled) {
    try {
      const driveScheduler = getGoogleDriveScheduler()
      const status = driveScheduler.getStatus()
      const stats = driveScheduler.getStats()
      
      scheduler = {
        running: status.isRunning,
        interval: status.interval,
        nextRun: status.nextRun,
        lastRun: status.lastRun,
        totalRuns: stats.totalRuns,
        errorRuns: stats.errorRuns,
      }

      if (!status.isRunning && enabled) {
        recommendations.push("El scheduler no está funcionando, revisar configuración y logs")
      }
    } catch (error) {
      recommendations.push(`Error verificando scheduler: ${(error as Error).message}`)
    }
  }

  // Datos
  let data = {
    totalDocuments: 0,
    driveDocuments: 0,
    lastSyncAt: null as string | null,
    lastSyncStatus: "never",
  }

  if (connection.status === "ok") {
    try {
      const syncService = getGoogleDriveSyncService()
      const stats = await syncService.getStats()
      const status = await syncService.getSyncStatus()
      
      data = {
        totalDocuments: stats.totalDocuments,
        driveDocuments: stats.driveDocuments,
        lastSyncAt: status.lastSyncAt || null,
        lastSyncStatus: status.lastSyncStatus || "never",
      }

      if (data.driveDocuments === 0 && data.lastSyncStatus === "never") {
        recommendations.push("Ejecutar una sincronización inicial para cargar documentos")
      }
    } catch (error) {
      recommendations.push(`Error obteniendo datos: ${(error as Error).message}`)
    }
  }

  return {
    timestamp: new Date().toISOString(),
    configuration: {
      enabled,
      projectId,
      clientEmail,
      folderId,
      syncInterval,
      hasPrivateKey,
    },
    connection,
    scheduler,
    data,
    recommendations,
  }
}

// Auto-inicializar si no estamos en modo de desarrollo extremo
if (process.env.NODE_ENV !== "test" && process.env.SKIP_GOOGLE_DRIVE_INIT !== "true") {
  // Inicializar después de un pequeño delay para que las variables de entorno estén cargadas
  setTimeout(() => {
    initializeGoogleDrive().then(result => {
      if (result.success) {
        logger.info(`🎉 ${result.message}`)
      } else {
        logger.warn(`⚠️  ${result.message}`)
      }
    }).catch(error => {
      logger.error("❌ Error en auto-inicialización:", error)
    })
  }, 2000)
}