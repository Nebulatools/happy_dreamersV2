import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { getMongoDBVectorStoreManager } from "@/lib/rag/vector-store-mongodb"
import { processTextFile, processPdfFile } from "@/lib/rag/document-processor"
import * as fs from "fs"
import * as path from "path"

import { createLogger } from "@/lib/logger"

const logger = createLogger("API:rag:upload:route")


export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar que es admin
    if (session.user.role !== "admin") {
      return NextResponse.json({ 
        error: "Solo los administradores pueden subir documentos", 
      }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File
    
    if (!file) {
      return NextResponse.json({ error: "No se envió ningún archivo" }, { status: 400 })
    }

    // Validar tipo de archivo
    const allowedTypes = [".txt", ".md", ".pdf"]
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase()
    
    if (!allowedTypes.includes(fileExtension)) {
      return NextResponse.json({ 
        error: `Tipo de archivo no válido. Solo se permiten: ${allowedTypes.join(", ")}`, 
      }, { status: 400 })
    }

    // Validar tamaño (100MB)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: "El archivo debe ser menor a 100MB", 
      }, { status: 400 })
    }

    // ✅ VERIFICAR DUPLICADOS ANTES DE PROCESAR
    const vectorStore = getMongoDBVectorStoreManager()
    const existingDocs = await vectorStore.getDocumentsList()
    
    const isDuplicate = existingDocs.some(doc => doc.source === file.name)
    if (isDuplicate) {
      return NextResponse.json({ 
        error: `El documento "${file.name}" ya existe en el sistema. Por favor, elimínalo primero si quieres resubir una nueva versión.`, 
      }, { status: 409 }) // 409 = Conflict
    }

    logger.info(`📄 Procesando archivo: ${file.name} (${fileExtension})`)

    // Crear directorio temporal si no existe
    const tempDir = path.join(process.cwd(), "temp")
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    // Guardar archivo temporalmente
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const tempFilePath = path.join(tempDir, file.name)
    fs.writeFileSync(tempFilePath, buffer)

    try {
      let documents
      
      if (fileExtension === ".pdf") {
        documents = await processPdfFile(tempFilePath, file.name)
      } else {
        documents = await processTextFile(tempFilePath, file.name)
      }

      if (!documents || documents.length === 0) {
        return NextResponse.json({ 
          error: "No se pudo extraer contenido del archivo", 
        }, { status: 400 })
      }

      // Usar MongoDB Vector Store
      const vectorStore = getMongoDBVectorStoreManager()
      const chunksAdded = await vectorStore.addDocuments(documents)

      // Limpiar archivo temporal
      fs.unlinkSync(tempFilePath)

      return NextResponse.json({
        message: "Documento procesado exitosamente",
        fileName: file.name,
        fileType: fileExtension,
        documentsCount: documents.length,
        chunksAdded: chunksAdded,
        technology: "MongoDB + OpenAI Embeddings",
      })

    } catch (processingError) {
      // Limpiar archivo temporal en caso de error
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath)
      }
      
      logger.error("Error procesando documento:", processingError)
      return NextResponse.json({ 
        error: "Error procesando el documento: " + (processingError as Error).message, 
      }, { status: 500 })
    }

  } catch (error) {
    logger.error("Error en upload:", error)
    return NextResponse.json({ 
      error: "Error interno del servidor", 
    }, { status: 500 })
  }
} 