import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getMongoDBVectorStoreManager } from '@/lib/rag/vector-store-mongodb';
import { getChatAgent } from '@/lib/rag/chat-agent';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { message } = await req.json();
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 });
    }

    console.log(`💬 Chat RAG - Usuario: ${session.user.email}, Query: "${message}"`);

    // Buscar documentos relevantes en MongoDB
    const vectorStore = getMongoDBVectorStoreManager();
    const relevantDocs = await vectorStore.searchSimilar(message, 4);

    console.log(`📚 Documentos encontrados: ${relevantDocs.length}`);

    // Generar respuesta con contexto
    const chatAgent = getChatAgent();
    const response = await chatAgent.generateResponse(message, relevantDocs);

    return NextResponse.json({
      response: response,
      documentsUsed: relevantDocs.length,
      sources: relevantDocs.map(doc => ({
        source: doc.metadata.source,
        type: doc.metadata.type,
        preview: doc.pageContent.substring(0, 150) + "..."
      })),
      technology: "MongoDB Vector Search + OpenAI GPT-4"
    });

  } catch (error) {
    console.error('Error en chat RAG:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
} 