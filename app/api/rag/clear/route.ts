import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getMongoDBVectorStoreManager } from "@/lib/rag/vector-store-mongodb";

// POST - Limpiar todos los documentos del vector store (solo admin)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar que es admin
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: "Solo los administradores pueden limpiar el vector store" }, { status: 403 });
    }

    const vectorStore = getMongoDBVectorStoreManager();
    await vectorStore.clearVectorStore();

    console.log(`🧹 Admin ${session.user.email} limpió el vector store`);

    return NextResponse.json({
      message: "Vector store limpiado exitosamente",
      clearedBy: session.user.email,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error limpiando vector store:", error);
    return NextResponse.json({ 
      error: "Error interno del servidor" 
    }, { status: 500 });
  }
} 