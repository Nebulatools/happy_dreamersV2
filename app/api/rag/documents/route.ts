import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getMongoDBVectorStoreManager } from "@/lib/rag/vector-store-mongodb";

// GET - Obtener lista de documentos (solo admin)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar que es admin
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: "Solo los administradores pueden ver los documentos" }, { status: 403 });
    }

    const vectorStore = getMongoDBVectorStoreManager();
    const documents = await vectorStore.getDocumentsList();
    const totalCount = await vectorStore.getDocumentCount();

    return NextResponse.json({
      documents,
      totalCount,
      message: `${totalCount} documentos en el vector store`
    });

  } catch (error) {
    console.error("Error obteniendo documentos:", error);
    return NextResponse.json({ 
      error: "Error interno del servidor" 
    }, { status: 500 });
  }
}

// DELETE - Eliminar un documento específico (solo admin)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar que es admin
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: "Solo los administradores pueden eliminar documentos" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('id');

    if (!documentId) {
      return NextResponse.json({ error: "ID de documento requerido" }, { status: 400 });
    }

    const vectorStore = getMongoDBVectorStoreManager();
    const success = await vectorStore.deleteDocument(documentId);

    if (!success) {
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Documento eliminado exitosamente",
      documentId
    });

  } catch (error) {
    console.error("Error eliminando documento:", error);
    return NextResponse.json({ 
      error: "Error interno del servidor" 
    }, { status: 500 });
  }
} 