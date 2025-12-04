import { Document } from "@langchain/core/documents"
import { getGoogleDriveClient } from "./drive-client"
import { processDocument, isValidFileType, getMimeType } from "@/lib/rag/document-processor"
import { createLogger } from "@/lib/logger"
import * as fs from "fs"
import * as path from "path"

const logger = createLogger("GoogleDriveDocumentLoader")

export interface DriveFileInfo {
  id: string
  name: string
  mimeType: string
  modifiedTime: string
  size?: string
  webViewLink?: string
}

/**
 * Cargador de documentos desde Google Drive
 * Descarga archivos de Google Drive y los convierte en documentos para el RAG
 */
export class GoogleDriveDocumentLoader {
  private driveClient = getGoogleDriveClient()
  private tempDir: string

  constructor() {
    // Crear directorio temporal para downloads
    this.tempDir = path.join(process.cwd(), "temp", "google-drive")
    this.ensureTempDir()
  }

  /**
   * Asegura que el directorio temporal existe
   */
  private ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true })
      logger.info(`📁 Directorio temporal creado: ${this.tempDir}`)
    }
  }

  /**
   * Carga un documento desde Google Drive y lo convierte para el RAG
   */
  async loadDocumentFromDrive(fileInfo: DriveFileInfo): Promise<Document[]> {
    try {
      logger.info(`📥 Cargando documento de Google Drive: ${fileInfo.name}`)

      // Validar tipo de archivo
      if (!isValidFileType(fileInfo.name)) {
        logger.warn(`⚠️  Tipo de archivo no soportado: ${fileInfo.name}`)
        return []
      }

      // Determinar nombre efectivo con extensión adecuada (soporte Google Docs)
      let effectiveName = fileInfo.name || `file_${fileInfo.id}`
      const isGoogleDoc = fileInfo.mimeType?.startsWith("application/vnd.google-apps.")
      if (isGoogleDoc) {
        if (fileInfo.mimeType === "application/vnd.google-apps.document" && !/\.docx$/i.test(effectiveName)) {
          effectiveName = `${effectiveName}.docx`
        } else if (fileInfo.mimeType === "application/vnd.google-apps.spreadsheet" && !/\.xlsx$/i.test(effectiveName)) {
          effectiveName = `${effectiveName}.xlsx`
        } else if (fileInfo.mimeType === "application/vnd.google-apps.presentation" && !/\.pptx$/i.test(effectiveName)) {
          effectiveName = `${effectiveName}.pptx`
        }
      }

      // Generar ruta temporal con nombre efectivo
      const tempFilePath = path.join(this.tempDir, `${fileInfo.id}_${effectiveName}`)

      try {
        // Descargar archivo desde Google Drive
        logger.info(`📥 Descargando: ${fileInfo.name}`)
        const fileBuffer = await this.driveClient.downloadFile(fileInfo.id, fileInfo.mimeType)

        // Guardar temporalmente
        fs.writeFileSync(tempFilePath, fileBuffer)
        logger.info(`💾 Archivo guardado temporalmente: ${tempFilePath}`)

        // Procesar documento usando el sistema existente
        const documents = await processDocument(tempFilePath, effectiveName)

        // Agregar metadata específica de Google Drive
        const driveDocuments = documents.map(doc => new Document({
          pageContent: doc.pageContent,
          metadata: {
            ...doc.metadata,
            // Usar fileId como clave estable de documento para agrupar todos los chunks como un solo doc
            source: `drive:${fileInfo.id}`,
            displayName: effectiveName,
            driveFileId: fileInfo.id,
            driveModifiedTime: fileInfo.modifiedTime,
            driveWebViewLink: fileInfo.webViewLink,
            originalSize: fileInfo.size,
            syncDate: new Date().toISOString(),
          },
        }))

        logger.info(`✅ Documento procesado desde Google Drive: ${fileInfo.name} (${driveDocuments.length} chunks)`)
        
        return driveDocuments

      } finally {
        // Limpiar archivo temporal
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath)
          logger.debug(`🧹 Archivo temporal eliminado: ${tempFilePath}`)
        }
      }

    } catch (error) {
      logger.error(`❌ Error cargando documento de Google Drive ${fileInfo.name}:`, error)
      throw new Error(`Error procesando ${fileInfo.name}: ${(error as Error).message}`)
    }
  }

  /**
   * Carga múltiples documentos desde Google Drive
   */
  async loadDocumentsFromDrive(files: DriveFileInfo[]): Promise<{
    documents: Document[]
    errors: Array<{ file: string, error: string }>
  }> {
    const documents: Document[] = []
    const errors: Array<{ file: string, error: string }> = []

    logger.info(`📂 Cargando ${files.length} documentos desde Google Drive`)

    for (const file of files) {
      try {
        const fileDocs = await this.loadDocumentFromDrive(file)
        documents.push(...fileDocs)
      } catch (error) {
        const errorMsg = (error as Error).message
        logger.error(`❌ Error con archivo ${file.name}: ${errorMsg}`)
        errors.push({ file: file.name, error: errorMsg })
      }
    }

    logger.info(`✅ Carga completa: ${documents.length} documentos cargados, ${errors.length} errores`)

    return { documents, errors }
  }

  /**
   * Obtiene información de archivos en una carpeta de Google Drive
   */
  async getFilesFromFolder(folderId: string, options: {
    includeSubfolders?: boolean
    fileTypes?: string[]
    maxResults?: number
  } = {}): Promise<DriveFileInfo[]> {
    try {
      logger.info(`📁 Obteniendo archivos de carpeta Google Drive: ${folderId}`)

      const files = await this.driveClient.listFilesInFolder(folderId, options)
      
      // Filtrar solo archivos válidos
      const validFiles = files.filter(file => isValidFileType(file.name))
      
      logger.info(`📄 ${validFiles.length} archivos válidos encontrados de ${files.length} totales`)

      return validFiles.map(file => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        modifiedTime: file.modifiedTime,
        size: file.size,
        webViewLink: file.webViewLink,
      }))

    } catch (error) {
      logger.error("❌ Error obteniendo archivos de Google Drive:", error)
      throw error
    }
  }

  /**
   * Verifica si un archivo ha cambiado desde la última sincronización
   */
  async hasFileChanged(fileInfo: DriveFileInfo, lastSyncTime: string): Promise<boolean> {
    try {
      // Comparar fecha de modificación con última sincronización
      const fileModified = new Date(fileInfo.modifiedTime)
      const lastSync = new Date(lastSyncTime)

      const hasChanged = fileModified > lastSync
      
      if (hasChanged) {
        logger.info(`🔄 Archivo modificado: ${fileInfo.name} (${fileInfo.modifiedTime} > ${lastSyncTime})`)
      }

      return hasChanged

    } catch (error) {
      logger.error(`❌ Error verificando cambios en archivo ${fileInfo.name}:`, error)
      // En caso de error, asumir que cambió para estar seguros
      return true
    }
  }

  /**
   * Obtiene estadísticas de archivos en Google Drive
   */
  async getStats(folderId: string): Promise<{
    totalFiles: number
    validFiles: number
    fileTypes: Record<string, number>
    totalSize: number
  }> {
    try {
      const allFiles = await this.driveClient.listFilesInFolder(folderId, {
        includeSubfolders: true,
        maxResults: 1000,
      })

      const validFiles = allFiles.filter(file => isValidFileType(file.name))
      
      const fileTypes: Record<string, number> = {}
      let totalSize = 0

      validFiles.forEach(file => {
        const ext = path.extname(file.name).toLowerCase()
        fileTypes[ext] = (fileTypes[ext] || 0) + 1
        
        if (file.size) {
          totalSize += parseInt(file.size)
        }
      })

      return {
        totalFiles: allFiles.length,
        validFiles: validFiles.length,
        fileTypes,
        totalSize,
      }

    } catch (error) {
      logger.error("❌ Error obteniendo estadísticas:", error)
      return {
        totalFiles: 0,
        validFiles: 0,
        fileTypes: {},
        totalSize: 0,
      }
    }
  }

  /**
   * Limpia archivos temporales antiguos
   */
  cleanupTempFiles(maxAgeMinutes: number = 60): void {
    try {
      if (!fs.existsSync(this.tempDir)) {
        return
      }

      const files = fs.readdirSync(this.tempDir)
      const maxAge = Date.now() - (maxAgeMinutes * 60 * 1000)
      let cleanedCount = 0

      files.forEach(filename => {
        const filePath = path.join(this.tempDir, filename)
        const stats = fs.statSync(filePath)
        
        if (stats.mtime.getTime() < maxAge) {
          fs.unlinkSync(filePath)
          cleanedCount++
        }
      })

      if (cleanedCount > 0) {
        logger.info(`🧹 ${cleanedCount} archivos temporales limpiados`)
      }

    } catch (error) {
      logger.error("❌ Error limpiando archivos temporales:", error)
    }
  }
}

// Singleton instance
let documentLoaderInstance: GoogleDriveDocumentLoader | null = null

/**
 * Obtiene la instancia singleton del cargador de documentos
 */
export function getGoogleDriveDocumentLoader(): GoogleDriveDocumentLoader {
  if (!documentLoaderInstance) {
    documentLoaderInstance = new GoogleDriveDocumentLoader()
  }
  return documentLoaderInstance
}
