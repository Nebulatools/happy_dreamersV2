// Cliente de Google Drive API para acceso y manejo de archivos
// Incluye autenticación, listado de archivos y descarga

import { google } from "googleapis"
import { createLogger } from "@/lib/logger"

const logger = createLogger("GoogleDriveClient")

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  size?: number
  modifiedTime: string
  createdTime: string
  parents?: string[]
  webViewLink?: string
}

export interface ListFilesOptions {
  includeSubfolders?: boolean
  fileTypes?: string[]
  maxResults?: number
  modifiedAfter?: Date
}

/**
 * Cliente para interactuar con Google Drive API
 */
export class GoogleDriveClient {
  private drive: any = null
  private credentials: any = null

  constructor() {
    this.initializeClient()
  }

  /**
   * Inicializa el cliente de Google Drive con service account
   */
  private initializeClient() {
    try {
      // Verificar variables de entorno
      const requiredEnvVars = [
        "GOOGLE_DRIVE_TYPE",
        "GOOGLE_DRIVE_PROJECT_ID", 
        "GOOGLE_DRIVE_PRIVATE_KEY_ID",
        "GOOGLE_DRIVE_PRIVATE_KEY",
        "GOOGLE_DRIVE_CLIENT_EMAIL",
        "GOOGLE_DRIVE_CLIENT_ID",
        "GOOGLE_DRIVE_AUTH_URI",
        "GOOGLE_DRIVE_TOKEN_URI",
        "GOOGLE_DRIVE_AUTH_PROVIDER_CERT_URL",
        "GOOGLE_DRIVE_CLIENT_CERT_URL",
      ]

      const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
      if (missingVars.length > 0) {
        throw new Error(`Variables de entorno faltantes: ${missingVars.join(", ")}`)
      }

      // Construir credenciales del service account
      this.credentials = {
        type: process.env.GOOGLE_DRIVE_TYPE,
        project_id: process.env.GOOGLE_DRIVE_PROJECT_ID,
        private_key_id: process.env.GOOGLE_DRIVE_PRIVATE_KEY_ID,
        private_key: process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        client_email: process.env.GOOGLE_DRIVE_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_DRIVE_CLIENT_ID,
        auth_uri: process.env.GOOGLE_DRIVE_AUTH_URI,
        token_uri: process.env.GOOGLE_DRIVE_TOKEN_URI,
        auth_provider_x509_cert_url: process.env.GOOGLE_DRIVE_AUTH_PROVIDER_CERT_URL,
        client_x509_cert_url: process.env.GOOGLE_DRIVE_CLIENT_CERT_URL,
        universe_domain: process.env.GOOGLE_DRIVE_UNIVERSE_DOMAIN || "googleapis.com",
      }

      // Crear autenticación
      const auth = new google.auth.GoogleAuth({
        credentials: this.credentials,
        scopes: ["https://www.googleapis.com/auth/drive.readonly"],
      })

      // Inicializar cliente de Drive
      this.drive = google.drive({ version: "v3", auth })
      
      logger.info("✅ Google Drive client inicializado correctamente")

    } catch (error) {
      logger.error("❌ Error inicializando Google Drive client:", error)
      throw error
    }
  }

  /**
   * Verifica la conexión con Google Drive
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.drive) {
        throw new Error("Cliente de Google Drive no inicializado")
      }

      // Test básico - obtener información del usuario
      const response = await this.drive.about.get({ fields: "user" })
      
      if (response.data && response.data.user) {
        logger.info("✅ Conexión con Google Drive exitosa")
        return true
      } else {
        logger.error("❌ Respuesta inválida de Google Drive API")
        return false
      }

    } catch (error) {
      logger.error("❌ Error en conexión con Google Drive:", error)
      return false
    }
  }

  /**
   * Lista archivos en una carpeta de Google Drive
   */
  async listFilesInFolder(folderId: string, options: ListFilesOptions = {}): Promise<DriveFile[]> {
    try {
      if (!this.drive) {
        throw new Error("Cliente de Google Drive no inicializado")
      }

      logger.info(`📁 Listando archivos en carpeta: ${folderId}`)

      const {
        includeSubfolders = true,
        fileTypes = [],
        maxResults = 1000,
        modifiedAfter,
      } = options

      // Construir query
      let query = `'${folderId}' in parents and trashed = false`
      
      // Incluir subcarpertas si se requiere
      if (includeSubfolders) {
        // No cambiar query - la búsqueda recursiva se hará con múltiples llamadas
      }

      // Filtrar por tipos de archivo si se especifica
      if (fileTypes.length > 0) {
        const mimeTypeFilters = fileTypes.map(type => {
          switch (type.toLowerCase()) {
          case "pdf": return "mimeType='application/pdf'"
          case "doc": return "mimeType='application/msword'"
          case "docx": return "mimeType='application/vnd.openxmlformats-officedocument.wordprocessingml.document' or mimeType='application/vnd.google-apps.document'"
          case "txt": return "mimeType='text/plain'"
          case "md": return "mimeType='text/markdown' or mimeType='text/x-markdown'"
          case "pptx": return "mimeType='application/vnd.openxmlformats-officedocument.presentationml.presentation' or mimeType='application/vnd.google-apps.presentation'"
          case "xlsx": return "mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or mimeType='application/vnd.google-apps.spreadsheet'"
          case "png": return "mimeType='image/png'"
          case "jpg": case "jpeg": return "mimeType='image/jpeg'"
          case "zip": return "mimeType='application/zip'"
          default: return null
          }
        }).filter(Boolean)

        if (mimeTypeFilters.length > 0) {
          query += ` and (${mimeTypeFilters.join(" or ")})`
        }
      }

      // Filtrar por fecha de modificación
      if (modifiedAfter) {
        const isoDate = modifiedAfter.toISOString()
        query += ` and modifiedTime > '${isoDate}'`
      }

      logger.info(`🔍 Query: ${query}`)

      // Ejecutar búsqueda
      const response = await this.drive.files.list({
        q: query,
        pageSize: Math.min(maxResults, 1000),
        fields: "nextPageToken, files(id, name, mimeType, size, modifiedTime, createdTime, parents, webViewLink)",
        orderBy: "modifiedTime desc",
      })

      let files: DriveFile[] = response.data.files || []
      
      // Si incluimos subcarpertas, buscar recursivamente
      if (includeSubfolders) {
        const subfolders = await this.getSubfolders(folderId)
        for (const subfolder of subfolders) {
          const subfolderFiles = await this.listFilesInFolder(subfolder.id, {
            ...options,
            includeSubfolders: false, // Evitar recursión infinita
          })
          files = files.concat(subfolderFiles)
        }
      }

      // Limitar resultados
      if (files.length > maxResults) {
        files = files.slice(0, maxResults)
      }

      logger.info(`📄 Encontrados ${files.length} archivos`)
      return files

    } catch (error) {
      logger.error("❌ Error listando archivos de Google Drive:", error)
      throw new Error(`Error accediendo a Google Drive: ${error instanceof Error ? error.message : "Error desconocido"}`)
    }
  }

  /**
   * Obtiene las subcarpertas de una carpeta
   */
  private async getSubfolders(folderId: string): Promise<DriveFile[]> {
    try {
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed = false`,
        fields: "files(id, name, mimeType)",
      })

      return response.data.files || []
    } catch (error) {
      logger.error(`❌ Error obteniendo subcarpertas de ${folderId}:`, error)
      return []
    }
  }

  /**
   * Descarga un archivo de Google Drive
   */
  async downloadFile(fileId: string, mimeType?: string): Promise<Buffer> {
    try {
      if (!this.drive) {
        throw new Error("Cliente de Google Drive no inicializado")
      }

      logger.info(`⬇️  Descargando archivo: ${fileId}${mimeType ? ` (${mimeType})` : ""}`)

      let buffer: Buffer
      // Si es un documento de Google (Docs/Sheets/Slides), usar export
      if (mimeType && mimeType.startsWith("application/vnd.google-apps.")) {
        let exportMime = "application/pdf"
        if (mimeType === "application/vnd.google-apps.document") {
          exportMime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document" // .docx
        } else if (mimeType === "application/vnd.google-apps.spreadsheet") {
          exportMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" // .xlsx
        } else if (mimeType === "application/vnd.google-apps.presentation") {
          exportMime = "application/vnd.openxmlformats-officedocument.presentationml.presentation" // .pptx
        }

        const response = await this.drive.files.export({
          fileId,
          mimeType: exportMime,
        }, { responseType: "arraybuffer" })
        buffer = Buffer.from(response.data)
      } else {
        const response = await this.drive.files.get({
          fileId: fileId,
          alt: "media",
        }, { responseType: "arraybuffer" })
        buffer = Buffer.from(response.data)
      }
      logger.info(`✅ Archivo descargado: ${buffer.length} bytes`)
      
      return buffer

    } catch (error) {
      logger.error(`❌ Error descargando archivo ${fileId}:`, error)
      throw new Error(`Error descargando archivo: ${error instanceof Error ? error.message : "Error desconocido"}`)
    }
  }

  /**
   * Obtiene metadatos de un archivo
   */
  async getFileMetadata(fileId: string): Promise<DriveFile> {
    try {
      if (!this.drive) {
        throw new Error("Cliente de Google Drive no inicializado")
      }

      const response = await this.drive.files.get({
        fileId: fileId,
        fields: "id, name, mimeType, size, modifiedTime, createdTime, parents, webViewLink",
      })

      return response.data as DriveFile

    } catch (error) {
      logger.error(`❌ Error obteniendo metadatos de archivo ${fileId}:`, error)
      throw new Error(`Error obteniendo metadatos: ${error instanceof Error ? error.message : "Error desconocido"}`)
    }
  }

  /**
   * Verifica si un archivo existe en Google Drive
   */
  async fileExists(fileId: string): Promise<boolean> {
    try {
      await this.getFileMetadata(fileId)
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Obtiene información de una carpeta
   */
  async getFolderInfo(folderId: string): Promise<DriveFile> {
    try {
      if (!this.drive) {
        throw new Error("Cliente de Google Drive no inicializado")
      }

      const response = await this.drive.files.get({
        fileId: folderId,
        fields: "id, name, mimeType, modifiedTime, createdTime, webViewLink",
      })

      return response.data as DriveFile

    } catch (error) {
      logger.error(`❌ Error obteniendo información de carpeta ${folderId}:`, error)
      throw new Error(`Error accediendo a carpeta: ${error instanceof Error ? error.message : "Error desconocido"}`)
    }
  }
}

// Singleton instance
let driveClientInstance: GoogleDriveClient | null = null

/**
 * Obtiene la instancia singleton del cliente de Google Drive
 */
export function getGoogleDriveClient(): GoogleDriveClient {
  if (!driveClientInstance) {
    driveClientInstance = new GoogleDriveClient()
  }
  return driveClientInstance
}

/**
 * Verifica si Google Drive está habilitado y configurado
 */
export function isGoogleDriveEnabled(): boolean {
  const enabled = process.env.GOOGLE_DRIVE_SYNC_ENABLED === "true"
  const hasCredentials = !!(
    process.env.GOOGLE_DRIVE_CLIENT_EMAIL &&
    process.env.GOOGLE_DRIVE_PRIVATE_KEY &&
    process.env.GOOGLE_DRIVE_PROJECT_ID
  )
  const hasFolderId = !!process.env.GOOGLE_DRIVE_FOLDER_ID

  return enabled && hasCredentials && hasFolderId
}

/**
 * Obtiene la configuración actual de Google Drive
 */
export function getGoogleDriveConfig() {
  return {
    enabled: process.env.GOOGLE_DRIVE_SYNC_ENABLED === "true",
    projectId: process.env.GOOGLE_DRIVE_PROJECT_ID || null,
    clientEmail: process.env.GOOGLE_DRIVE_CLIENT_EMAIL || null,
    folderId: process.env.GOOGLE_DRIVE_FOLDER_ID || null,
    syncInterval: process.env.GOOGLE_DRIVE_SYNC_INTERVAL || "*/30 * * * *",
    hasPrivateKey: !!(process.env.GOOGLE_DRIVE_PRIVATE_KEY?.length),
  }
}
