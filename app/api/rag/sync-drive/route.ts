// API endpoint para sincronización manual y automática con Google Drive
// Permite forzar sincronización o consultar estado

import { NextRequest, NextResponse } from "next/server"
import { getGoogleDriveSyncService } from "@/lib/google-drive/sync-service"
import { checkGoogleDriveStatus } from "@/lib/google-drive/init"
import { createLogger } from "@/lib/logger"

const logger = createLogger("sync-drive-api")

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { fullSync = false, testConnection = false } = body
    
    if (testConnection) {
      logger.info("🔗 Probando conexión con Google Drive")
      
      const syncService = getGoogleDriveSyncService()
      const connectionOk = await syncService.testConnection()
      
      return NextResponse.json({
        success: connectionOk,
        message: connectionOk 
          ? "Conexión con Google Drive exitosa" 
          : "Error de conexión con Google Drive"
      })
    }
    
    logger.info(`🔄 Iniciando ${fullSync ? 'sincronización completa' : 'sincronización incremental'} con Google Drive`)
    
    // Ejecutar sincronización
    const syncService = getGoogleDriveSyncService()
    const result = await syncService.syncWithDrive(fullSync)
    
    logger.info("✅ Sincronización completada", { 
      filesProcessed: result.stats.filesProcessed,
      chunksAdded: result.stats.chunksAdded,
      errorsCount: result.stats.errorsCount
    })
    
    return NextResponse.json({
      success: result.success,
      message: result.message,
      stats: result.stats,
      duration: `${result.duration}ms`,
      syncType: fullSync ? 'completa' : 'incremental',
      errors: result.errors
    })
    
  } catch (error) {
    logger.error("❌ Error en sincronización con Google Drive:", error)
    
    return NextResponse.json({
      success: false,
      message: "Error en la sincronización",
      error: error instanceof Error ? error.message : "Error desconocido"
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    logger.info("📊 Consultando estado de sincronización")
    
    // Obtener estado completo del sistema
    const status = await checkGoogleDriveStatus()
    
    return NextResponse.json({
      success: true,
      googleDrive: {
        isEnabled: status.isEnabled,
        isConfigured: status.isConfigured,
        lastSyncAt: status.lastSync,
        lastSyncStatus: status.connectionOk ? 'success' : (status.isConfigured ? 'error' : 'not_configured'),
        totalDocuments: status.totalDocuments
      },
      scheduler: {
        isRunning: status.schedulerRunning,
        interval: process.env.GOOGLE_DRIVE_SYNC_INTERVAL || '*/30 * * * *',
        nextRun: null,
        lastRun: status.lastSync,
        runsCount: 0,
        errorsCount: status.errors.length
      },
      configuration: {
        folderId: process.env.GOOGLE_DRIVE_FOLDER_ID || null,
        clientEmail: process.env.GOOGLE_DRIVE_CLIENT_EMAIL || null,
        projectId: process.env.GOOGLE_DRIVE_PROJECT_ID || null
      },
      errors: status.errors
    })
    
  } catch (error) {
    logger.error("❌ Error consultando estado de sincronización:", error)
    
    return NextResponse.json({
      success: false,
      message: "Error consultando estado",
      error: error instanceof Error ? error.message : "Error desconocido"
    }, { status: 500 })
  }
}