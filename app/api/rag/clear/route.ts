// API para limpiar sistema RAG
// Solo admins pueden eliminar todos los documentos y reiniciar el vector store

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { getMongoDBVectorStoreManager } from "@/lib/rag/vector-store-mongodb"

import { createLogger } from "@/lib/logger"

const logger = createLogger("API:rag:clear:route")


export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Solo admins pueden limpiar el sistema RAG
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Solo administradores pueden limpiar el sistema RAG" }, { status: 403 })
    }

    logger.info(`🧹 Admin ${session.user.email} limpiando sistema RAG...`)

    let deletedCount = 0
    
    // Limpiar vector store MongoDB
    try {
      const vectorStore = getMongoDBVectorStoreManager()
      deletedCount = await vectorStore.clearAll()
      logger.info(`📄 Eliminados ${deletedCount} documentos del vector store`)
    } catch (error) {
      logger.info("Error limpiando vector store MongoDB:", error)
    }

    return NextResponse.json({
      message: "Sistema RAG limpiado completamente",
      deletedDocuments: deletedCount,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    logger.error("Error limpiando sistema RAG:", error)
    return NextResponse.json({ 
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : "Error desconocido",
    }, { status: 500 })
  }
} 