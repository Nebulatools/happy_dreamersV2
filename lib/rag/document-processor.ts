import { Document } from "@langchain/core/documents"
import * as fs from "fs"
import * as path from "path"
import { GoogleGenerativeAI } from "@google/generative-ai"

import { createLogger } from "@/lib/logger"

const logger = createLogger("document-processor")


// Procesador para PDFs usando Gemini
export async function processPdfFile(filePath: string, fileName: string): Promise<Document[]> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY no está configurada")
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })

    logger.info(`🧠 Usando Gemini 2.0 Flash para extraer texto de: ${fileName}`)

    // Leer el archivo PDF como base64
    const pdfBuffer = fs.readFileSync(filePath)
    const base64Data = pdfBuffer.toString("base64")

    // Preparar el archivo para Gemini
    const filePart = {
      inlineData: {
        data: base64Data,
        mimeType: "application/pdf",
      },
    }

    const prompt = "Extrae TODO el texto de este PDF. Devuelve solo el texto sin explicaciones adicionales. Mantén la estructura y formato cuando sea posible."

    // Procesar con Gemini
    const result = await model.generateContent([prompt, filePart])
    const extractedText = result.response.text()

    if (!extractedText || extractedText.trim().length < 50) {
      throw new Error("El PDF no contiene texto suficiente o Gemini no pudo extraerlo")
    }

    // Dividir en chunks si es necesario
    const text = extractedText.trim()
    const maxChunkSize = 2000
    const documents: Document[] = []

    if (text.length <= maxChunkSize) {
      // PDF pequeño, un solo documento
      documents.push(new Document({
        pageContent: text,
        metadata: {
          source: fileName,
          type: "pdf",
          uploadDate: new Date().toISOString(),
          extractedWith: "Gemini",
          chunk: 1,
          totalChunks: 1,
          textLength: text.length,
        },
      }))
    } else {
      // PDF grande, dividir en chunks
      const chunks = []
      for (let i = 0; i < text.length; i += maxChunkSize) {
        chunks.push(text.slice(i, i + maxChunkSize))
      }
      
      chunks.forEach((chunk, index) => {
        documents.push(new Document({
          pageContent: chunk,
          metadata: {
            source: fileName,
            type: "pdf",
            uploadDate: new Date().toISOString(),
            extractedWith: "Gemini",
            chunk: index + 1,
            totalChunks: chunks.length,
            textLength: text.length,
          },
        }))
      })
    }

    logger.info(`✅ PDF procesado con Gemini: ${fileName} - ${text.length} caracteres, ${documents.length} chunks`)
    return documents
    
  } catch (error) {
    logger.error(`❌ Error procesando PDF con Gemini ${fileName}:`, error)
    throw new Error(`No se pudo procesar el PDF con Gemini: ${error instanceof Error ? error.message : "Error desconocido"}`)
  }
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

// Función principal - GEMINI PARA PDFs!
export async function processDocument(filePath: string, fileName: string): Promise<Document[]> {
  const ext = path.extname(fileName).toLowerCase()
  
  logger.info(`🔄 Procesando: ${fileName} (${ext})`)
  
  switch (ext) {
  case ".txt":
  case ".md":
    return await processTextFile(filePath, fileName)
  case ".pdf":
    return await processPdfFile(filePath, fileName)
  default:
    throw new Error(`❌ Tipo no soportado: ${ext}. Permitidos: .txt, .md, .pdf`)
  }
}

export function isValidFileType(fileName: string): boolean {
  const allowedExtensions = [".txt", ".md", ".pdf"]
  const ext = path.extname(fileName).toLowerCase()
  return allowedExtensions.includes(ext)
}

export function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase()
  switch (ext) {
  case ".txt": return "text/plain"
  case ".md": return "text/markdown"
  case ".pdf": return "application/pdf"
  default: return "application/octet-stream"
  }
} 