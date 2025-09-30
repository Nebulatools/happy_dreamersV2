import { getGoogleDriveClient } from './drive-client'
import { getGoogleDriveDocumentLoader } from './document-loader'
import { getMongoDBVectorStoreManager } from '@/lib/rag/vector-store-mongodb'
import { createLogger } from '@/lib/logger'

const logger = createLogger('GoogleDriveSyncService')

export interface SyncResult {
  success: boolean
  message: string
  stats: {
    filesScanned: number
    filesProcessed: number
    filesSkipped: number
    chunksAdded: number
    errorsCount: number
  }
  errors: string[]
  duration: number
}

export interface SyncStatus {
  isEnabled: boolean
  lastSyncAt?: string
  lastSyncStatus?: 'success' | 'error' | 'running'
  lastSyncResult?: SyncResult
  totalDocuments: number
}

/**
 * Servicio para sincronizar documentos de Google Drive con el RAG system
 */
export class GoogleDriveSyncService {
  private driveClient = getGoogleDriveClient()
  private documentLoader = getGoogleDriveDocumentLoader()
  private vectorStore = getMongoDBVectorStoreManager()
  private lastSyncStatus: SyncStatus = {
    isEnabled: false,
    totalDocuments: 0
  }

  constructor() {
    // Verificar si está habilitado
    this.lastSyncStatus.isEnabled = this.isEnabled()
  }

  /**
   * Verifica si el servicio está habilitado y configurado correctamente
   */
  isEnabled(): boolean {
    const enabled = process.env.GOOGLE_DRIVE_SYNC_ENABLED === 'true'
    const hasCredentials = !!(
      process.env.GOOGLE_DRIVE_CLIENT_EMAIL &&
      process.env.GOOGLE_DRIVE_PRIVATE_KEY &&
      process.env.GOOGLE_DRIVE_PROJECT_ID
    )
    const hasFolderId = !!process.env.GOOGLE_DRIVE_FOLDER_ID

    return enabled && hasCredentials && hasFolderId
  }

  /**
   * Ejecuta sincronización con Google Drive
   */
  async syncWithDrive(fullSync: boolean = false): Promise<SyncResult> {
    const startTime = Date.now()
    
    logger.info(`🚀 Iniciando ${fullSync ? 'sincronización completa' : 'sincronización incremental'} con Google Drive`)
    
    const result: SyncResult = {
      success: false,
      message: '',
      stats: {
        filesScanned: 0,
        filesProcessed: 0,
        filesSkipped: 0,
        chunksAdded: 0,
        errorsCount: 0
      },
      errors: [],
      duration: 0
    }

    try {
      // Verificar que esté habilitado
      if (!this.isEnabled()) {
        throw new Error('Google Drive sync no está habilitado o configurado correctamente')
      }

      // Actualizar estado
      this.lastSyncStatus.lastSyncStatus = 'running'

      // Obtener carpeta de Google Drive
      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID!
      
      // Listar archivos en Google Drive
      logger.info(`📁 Escaneando carpeta de Google Drive: ${folderId}`)
      
      const driveFiles = await this.driveClient.listFilesInFolder(folderId, {
        includeSubfolders: true,
        fileTypes: ['pdf', 'docx', 'pptx', 'xlsx', 'txt', 'md', 'png', 'jpg', 'jpeg', 'zip'],
        maxResults: 1000
      })

      result.stats.filesScanned = driveFiles.length
      logger.info(`📄 Encontrados ${driveFiles.length} archivos en Google Drive`)

      if (driveFiles.length === 0) {
        result.success = true
        result.message = 'No se encontraron archivos en Google Drive para sincronizar'
        result.duration = Date.now() - startTime
        return result
      }

      // Obtener documentos existentes en el vector store si no es fullSync
      let existingDocs: { id: string, source: string, displayName?: string }[] = []
      if (!fullSync) {
        const vectorStoreDocs = await this.vectorStore.getDocumentsList()
        existingDocs = vectorStoreDocs
          .filter((doc: any) => doc.source.startsWith('drive:'))
          .map((doc: any) => ({ id: doc.id, source: doc.source, displayName: doc.displayName }))
        
        logger.info(`📚 ${existingDocs.length} documentos de Google Drive ya en vector store`)
      }

      // Procesar cada archivo
      for (const file of driveFiles) {
        try {
          const fileName = `drive:${file.name}`
          const fileIdSource = `drive:${file.id}`
          
          // Saltar si ya existe y no es fullSync
          if (!fullSync && existingDocs.some(d => d.source === fileIdSource || d.source === fileName)) {
            logger.info(`⏭️  Saltando archivo existente: ${file.name}`)
            result.stats.filesSkipped++
            continue
          }

          // Si es fullSync y existe, eliminar primero
          if (fullSync) {
            const existingList = await this.vectorStore.getDocumentsList()
            const existingDoc = existingList
              .find((doc: any) => doc.source === fileIdSource || doc.source === fileName)
            
            if (existingDoc) {
              await this.vectorStore.deleteDocument(existingDoc.id)
              logger.info(`🗑️  Eliminado documento existente: ${file.name}`)
            }
          }

          // Procesar archivo
          logger.info(`🔄 Procesando archivo: ${file.name}`)
          
          const documents = await this.documentLoader.loadDocumentFromDrive(file)
          
          if (documents.length > 0) {
            const chunksAdded = await this.vectorStore.addDocuments(documents)
            result.stats.chunksAdded += chunksAdded
            result.stats.filesProcessed++
            
            logger.info(`✅ Archivo procesado: ${file.name} (${chunksAdded} chunks)`)
          } else {
            logger.warn(`⚠️  No se pudo extraer contenido de: ${file.name}`)
            result.stats.filesSkipped++
          }

        } catch (fileError) {
          const errorMsg = `Error procesando ${file.name}: ${(fileError as Error).message}`
          logger.error(errorMsg)
          result.errors.push(errorMsg)
          result.stats.errorsCount++
        }
      }

      // Calcular duración
      result.duration = Date.now() - startTime

      // Actualizar total de documentos
      result.stats.totalDocuments = await this.vectorStore.getDocumentCount()

      // Determinar éxito
      result.success = result.stats.errorsCount === 0 || result.stats.filesProcessed > 0
      
      if (result.success) {
        result.message = `Sincronización exitosa: ${result.stats.filesProcessed} archivos procesados, ${result.stats.chunksAdded} chunks agregados`
        logger.info(`✅ ${result.message}`)
      } else {
        result.message = `Sincronización con errores: ${result.stats.errorsCount} errores encontrados`
        logger.warn(`⚠️  ${result.message}`)
      }

      // Actualizar estado
      this.lastSyncStatus = {
        isEnabled: true,
        lastSyncAt: new Date().toISOString(),
        lastSyncStatus: result.success ? 'success' : 'error',
        lastSyncResult: result,
        totalDocuments: await this.vectorStore.getDocumentCount()
      }

      return result

    } catch (error) {
      result.duration = Date.now() - startTime
      result.success = false
      result.message = `Error en sincronización: ${(error as Error).message}`
      result.errors.push((error as Error).message)
      
      logger.error('❌ Error en sincronización con Google Drive:', error)
      
      // Actualizar estado de error
      this.lastSyncStatus = {
        isEnabled: this.isEnabled(),
        lastSyncAt: new Date().toISOString(),
        lastSyncStatus: 'error',
        lastSyncResult: result,
        totalDocuments: await this.vectorStore.getDocumentCount()
      }

      return result
    }
  }

  /**
   * Obtiene el estado actual de sincronización
   */
  async getSyncStatus(): Promise<SyncStatus> {
    // Actualizar total de documentos
    this.lastSyncStatus.totalDocuments = await this.vectorStore.getDocumentCount()
    this.lastSyncStatus.isEnabled = this.isEnabled()
    
    return this.lastSyncStatus
  }

  /**
   * Prueba la conexión con Google Drive
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.isEnabled()) {
        logger.warn('⚠️  Google Drive sync no está habilitado')
        return false
      }

      // Test básico de conexión
      const connectionOk = await this.driveClient.testConnection()
      
      if (connectionOk) {
        // Test de acceso a la carpeta específica
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID!
        await this.driveClient.listFilesInFolder(folderId, { maxResults: 1 })
        
        logger.info('✅ Conexión con Google Drive verificada')
        return true
      } else {
        logger.error('❌ Error en conexión con Google Drive')
        return false
      }

    } catch (error) {
      logger.error('❌ Error probando conexión con Google Drive:', error)
      return false
    }
  }

  /**
   * Obtiene estadísticas de sincronización
   */
  async getStats(): Promise<{
    isEnabled: boolean
    totalDocuments: number
    driveDocuments: number
    lastSync: string | null
    syncStatus: string
  }> {
    const vectorStoreDocs = await this.vectorStore.getDocumentsList()
    const driveDocuments = vectorStoreDocs.filter(doc => doc.source.startsWith('drive:')).length

    return {
      isEnabled: this.isEnabled(),
      totalDocuments: await this.vectorStore.getDocumentCount(),
      driveDocuments,
      lastSync: this.lastSyncStatus.lastSyncAt || null,
      syncStatus: this.lastSyncStatus.lastSyncStatus || 'never'
    }
  }
}

// Singleton instance
let syncServiceInstance: GoogleDriveSyncService | null = null

/**
 * Obtiene la instancia singleton del servicio de sincronización
 */
export function getGoogleDriveSyncService(): GoogleDriveSyncService {
  if (!syncServiceInstance) {
    syncServiceInstance = new GoogleDriveSyncService()
  }
  return syncServiceInstance
}
