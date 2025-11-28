import { Document } from "@langchain/core/documents"
import * as fs from "fs"
import * as path from "path"
import * as AdmZip from "adm-zip"
import { GoogleGenerativeAI } from "@google/generative-ai"

import { createLogger } from "@/lib/logger"

const logger = createLogger("document-processor")


// Procesador universal usando Gemini para cualquier tipo de archivo
export async function processFileWithGemini(filePath: string, fileName: string, fileType: string): Promise<Document[]> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY no está configurada")
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

    logger.info(`🧠 Usando Gemini 2.5 Flash para extraer texto de ${fileType.toUpperCase()}: ${fileName}`)

    // Leer el archivo como base64
    const fileBuffer = fs.readFileSync(filePath)
    const base64Data = fileBuffer.toString("base64")
    const mimeType = getMimeType(fileName)

    // Preparar el archivo para Gemini
    const filePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    }

    // Prompt especializado según tipo de archivo
    const prompt = getPromptForFileType(fileType)

    // Procesar con Gemini
    const result = await model.generateContent([prompt, filePart])
    const extractedText = result.response.text()

    if (!extractedText || extractedText.trim().length < 10) {
      throw new Error(`El archivo ${fileType.toUpperCase()} no contiene texto suficiente o Gemini no pudo extraerlo`)
    }

    // Crear documentos con chunks
    const documents = createDocumentsFromText(extractedText.trim(), fileName, fileType)

    logger.info(`✅ ${fileType.toUpperCase()} procesado con Gemini 2.5 Flash: ${fileName} - ${extractedText.length} caracteres, ${documents.length} chunks`)
    return documents
    
  } catch (error) {
    logger.error(`❌ Error procesando ${fileType.toUpperCase()} con Gemini ${fileName}:`, error)
    throw new Error(`No se pudo procesar el ${fileType.toUpperCase()} con Gemini 2.5 Flash: ${error instanceof Error ? error.message : "Error desconocido"}`)
  }
}

// Procesador para PDFs usando Gemini (mantener compatibilidad)
export async function processPdfFile(filePath: string, fileName: string): Promise<Document[]> {
  return await processFileWithGemini(filePath, fileName, "pdf")
}

// Procesador para texto plano
export async function processTextFile(filePath: string, fileName: string): Promise<Document[]> {
  const content = fs.readFileSync(filePath, "utf-8")
  return [new Document({
    pageContent: content,
    metadata: {
      source: fileName,
      type: "text",
      uploadDate: new Date().toISOString(),
      pages: 1,
    },
  })]
}

// Procesador para archivos ZIP
export async function processZipFile(filePath: string, fileName: string): Promise<Document[]> {
  try {
    logger.info(`📦 Procesando archivo ZIP: ${fileName}`)
    
    const zip = new AdmZip(filePath)
    const zipEntries = zip.getEntries()
    const allDocuments: Document[] = []
    
    // Crear directorio temporal para extraer archivos
    const tempDir = path.join(path.dirname(filePath), `temp_${Date.now()}`)
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    try {
      for (const entry of zipEntries) {
        // Solo procesar archivos (no directorios)
        if (entry.isDirectory) continue
        
        const entryName = entry.entryName
        const entryExt = path.extname(entryName).toLowerCase()
        
        // Verificar si el archivo interno es válido
        if (!isValidFileType(entryName)) {
          logger.info(`⏭️  Saltando archivo no válido en ZIP: ${entryName}`)
          continue
        }
        
        logger.info(`📄 Procesando archivo interno: ${entryName}`)
        
        // Extraer archivo a directorio temporal
        const tempFilePath = path.join(tempDir, path.basename(entryName))
        fs.writeFileSync(tempFilePath, entry.getData())
        
        try {
          // Procesar archivo extraído
          const documents = await processDocument(tempFilePath, `${fileName}/${entryName}`)
          allDocuments.push(...documents)
          
          // Limpiar archivo temporal
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath)
          }
        } catch (fileError) {
          logger.error(`❌ Error procesando archivo interno ${entryName}:`, fileError)
          // Continuar con otros archivos
        }
      }
      
      logger.info(`✅ ZIP procesado: ${fileName} - ${allDocuments.length} documentos extraídos`)
      return allDocuments
      
    } finally {
      // Limpiar directorio temporal
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true })
      }
    }
    
  } catch (error) {
    logger.error(`❌ Error procesando ZIP ${fileName}:`, error)
    throw new Error(`No se pudo procesar el archivo ZIP: ${error instanceof Error ? error.message : "Error desconocido"}`)
  }
}

// Función principal - GEMINI UNIVERSAL!
export async function processDocument(filePath: string, fileName: string): Promise<Document[]> {
  const ext = path.extname(fileName).toLowerCase()
  
  logger.info(`🔄 Procesando: ${fileName} (${ext})`)
  
  switch (ext) {
  case ".txt":
  case ".md":
    return await processTextFile(filePath, fileName)
  case ".pdf":
    return await processFileWithGemini(filePath, fileName, "pdf")
  case ".docx":
    return await processFileWithGemini(filePath, fileName, "docx")
  case ".pptx":
    return await processFileWithGemini(filePath, fileName, "pptx")
  case ".xlsx":
    return await processFileWithGemini(filePath, fileName, "xlsx")
  case ".png":
  case ".jpg":
  case ".jpeg":
    return await processFileWithGemini(filePath, fileName, "image")
  case ".zip":
    return await processZipFile(filePath, fileName)
  default:
    throw new Error(`❌ Tipo no soportado: ${ext}. Permitidos: ${getAllowedExtensions().join(", ")}`)
  }
}

// Funciones auxiliares
function getPromptForFileType(fileType: string): string {
  switch (fileType.toLowerCase()) {
  case "pdf":
    return "Extrae TODO el texto de este PDF. Devuelve solo el texto sin explicaciones adicionales. Mantén la estructura y formato cuando sea posible."
  case "docx":
    return "Extrae TODO el texto de este documento Word. Incluye títulos, párrafos, listas y cualquier texto visible. Mantén la estructura y formato cuando sea posible. Devuelve solo el texto sin explicaciones adicionales."
  case "pptx":
    return "Extrae TODO el texto de esta presentación PowerPoint. Incluye títulos de slides, contenido, notas del presentador y cualquier texto visible. Organiza por slides cuando sea posible. Devuelve solo el texto sin explicaciones adicionales."
  case "xlsx":
    return "Extrae TODO el texto y datos de esta hoja de cálculo Excel. Incluye nombres de hojas, encabezados, datos de celdas y cualquier texto visible. Organiza por hojas cuando sea posible. Devuelve solo el contenido sin explicaciones adicionales."
  case "image":
    return "Extrae TODO el texto visible en esta imagen. Incluye cualquier texto, números, etiquetas, títulos o contenido legible. Si hay diagramas o gráficos, describe brevemente su contenido textual. Devuelve solo el texto extraído sin explicaciones adicionales."
  default:
    return "Extrae TODO el texto de este archivo. Devuelve solo el contenido textual sin explicaciones adicionales."
  }
}

function createDocumentsFromText(text: string, fileName: string, fileType: string): Document[] {
  const maxChunkSize = 2000
  const documents: Document[] = []
  
  if (text.length <= maxChunkSize) {
    // Archivo pequeño, un solo documento
    documents.push(new Document({
      pageContent: text,
      metadata: {
        source: fileName,
        type: fileType,
        uploadDate: new Date().toISOString(),
        extractedWith: "Gemini",
        chunk: 1,
        totalChunks: 1,
        textLength: text.length,
      },
    }))
  } else {
    // Archivo grande, dividir en chunks
    const chunks = []
    for (let i = 0; i < text.length; i += maxChunkSize) {
      chunks.push(text.slice(i, i + maxChunkSize))
    }
    
    chunks.forEach((chunk, index) => {
      documents.push(new Document({
        pageContent: chunk,
        metadata: {
          source: fileName,
          type: fileType,
          uploadDate: new Date().toISOString(),
          extractedWith: "Gemini",
          chunk: index + 1,
          totalChunks: chunks.length,
          textLength: text.length,
        },
      }))
    })
  }
  
  return documents
}

export function getAllowedExtensions(): string[] {
  return [".txt", ".md", ".pdf", ".docx", ".pptx", ".xlsx", ".png", ".jpg", ".jpeg", ".zip"]
}

export function isValidFileType(fileName: string): boolean {
  const allowedExtensions = getAllowedExtensions()
  const ext = path.extname(fileName).toLowerCase()
  return allowedExtensions.includes(ext)
}

export function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase()
  switch (ext) {
  case ".txt": return "text/plain"
  case ".md": return "text/markdown"
  case ".pdf": return "application/pdf"
  case ".docx": return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  case ".pptx": return "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  case ".xlsx": return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  case ".png": return "image/png"
  case ".jpg":
  case ".jpeg": return "image/jpeg"
  case ".zip": return "application/zip"
  default: return "application/octet-stream"
  }
} 