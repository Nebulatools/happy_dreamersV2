import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { connectToDatabase } from "@/lib/mongodb";
const { ObjectId } = require('mongodb');

export interface DocumentMetadata {
  source: string;
  type: string;
  uploadDate: string;
  extractedWith?: string;
  size: number;
  embedding?: number[];
}

export interface StoredDocument {
  content: string;
  metadata: DocumentMetadata;
  embedding: number[];
  createdAt: Date;
}

// Interfaz para documentos que ya están en la DB (con _id)
export interface StoredDocumentWithId extends StoredDocument {
  _id: string;
}

export class MongoDBVectorStoreManager {
  private embeddings: OpenAIEmbeddings;
  private collectionName = "vector_documents";
  private metaCollectionName = "documents_metadata";

  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: "text-embedding-3-large",
    });
  }

  async addDocuments(documents: Document[]): Promise<number> {
    const { db } = await connectToDatabase();
    
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ["\n\n", "\n", ".", "!", "?", ",", " ", ""],
    });

    const splitDocs = await textSplitter.splitDocuments(documents);
    
    console.log(`🔄 Procesando ${splitDocs.length} chunks con embeddings...`);
    
    // Generar embeddings para cada chunk
    const documentsWithEmbeddings: StoredDocument[] = [];
    
    for (const doc of splitDocs) {
      const embedding = await this.embeddings.embedQuery(doc.pageContent);
      
      documentsWithEmbeddings.push({
        content: doc.pageContent,
        metadata: doc.metadata as DocumentMetadata,
        embedding: embedding,
        createdAt: new Date()
        // No incluimos _id, MongoDB lo generará automáticamente
      });
    }

    // Guardar en MongoDB
    if (documentsWithEmbeddings.length > 0) {
      await db.collection(this.collectionName).insertMany(documentsWithEmbeddings);
      console.log(`✅ ${documentsWithEmbeddings.length} chunks guardados en MongoDB`);
    }

    // Guardar metadata de los documentos originales
    await this.saveDocumentsMeta(documents);
    
    return documentsWithEmbeddings.length;
  }

  private async saveDocumentsMeta(documents: Document[]) {
    const { db } = await connectToDatabase();
    
    const metaDocuments = documents.map(doc => ({
      source: doc.metadata.source,
      type: doc.metadata.type,
      uploadDate: doc.metadata.uploadDate,
      extractedWith: doc.metadata.extractedWith || 'unknown',
      size: doc.pageContent.length,
      createdAt: new Date()
    }));

    if (metaDocuments.length > 0) {
      await db.collection(this.metaCollectionName).insertMany(metaDocuments);
    }
  }

  async searchSimilar(query: string, k: number = 4): Promise<Document[]> {
    const { db } = await connectToDatabase();
    
    console.log(`🔍 Búsqueda vectorial en MongoDB: "${query}"`);
    
    try {
      // Generar embedding para la consulta
      const queryEmbedding = await this.embeddings.embedQuery(query);
      
      // Buscar documentos similares usando agregación de MongoDB
      const pipeline = [
        {
          $addFields: {
            similarity: {
              $let: {
                vars: {
                  dotProduct: {
                    $reduce: {
                      input: { $range: [0, { $size: "$embedding" }] },
                      initialValue: 0,
                      in: {
                        $add: [
                          "$$value",
                          {
                            $multiply: [
                              { $arrayElemAt: ["$embedding", "$$this"] },
                              { $arrayElemAt: [queryEmbedding, "$$this"] }
                            ]
                          }
                        ]
                      }
                    }
                  }
                },
                in: "$$dotProduct"
              }
            }
          }
        },
        { $sort: { similarity: -1 } },
        { $limit: k }
      ];

      const results = await db.collection(this.collectionName)
        .aggregate(pipeline)
        .toArray();

      console.log(`✅ ${results.length} resultados encontrados`);

      return results.map(doc => new Document({
        pageContent: doc.content,
        metadata: doc.metadata
      }));
    } catch (error) {
      console.error("❌ Error en búsqueda vectorial:", error);
      return [];
    }
  }

  async getDocumentCount(): Promise<number> {
    try {
      const { db } = await connectToDatabase();
      return await db.collection(this.metaCollectionName).countDocuments();
    } catch (error) {
      console.error("Error obteniendo count de documentos:", error);
      return 0;
    }
  }

  async getDocumentsList(): Promise<any[]> {
    try {
      const { db } = await connectToDatabase();
      const documents = await db.collection(this.metaCollectionName)
        .find({})
        .sort({ createdAt: -1 })
        .toArray();
      
      return documents.map(doc => ({
        id: doc._id.toString(),
        source: doc.source,
        type: doc.type,
        uploadDate: doc.uploadDate,
        extractedWith: doc.extractedWith,
        size: doc.size,
        createdAt: doc.createdAt
      }));
    } catch (error) {
      console.error("Error obteniendo lista de documentos:", error);
      return [];
    }
  }

  async clearVectorStore(): Promise<void> {
    try {
      const { db } = await connectToDatabase();
      
      // Limpiar ambas colecciones
      await db.collection(this.collectionName).deleteMany({});
      await db.collection(this.metaCollectionName).deleteMany({});
      
      console.log("🧹 Vector store de MongoDB limpiado");
    } catch (error) {
      console.error("Error limpiando vector store:", error);
      throw error;
    }
  }

  async clearAll(): Promise<number> {
    try {
      const { db } = await connectToDatabase();
      
      // Contar documentos antes de eliminar
      const vectorCount = await db.collection(this.collectionName).countDocuments();
      const metaCount = await db.collection(this.metaCollectionName).countDocuments();
      
      // Limpiar ambas colecciones
      await db.collection(this.collectionName).deleteMany({});
      await db.collection(this.metaCollectionName).deleteMany({});
      
      console.log(`🧹 ${vectorCount} vectores y ${metaCount} documentos eliminados`);
      return metaCount; // Retornamos el número de documentos únicos eliminados
    } catch (error) {
      console.error("Error limpiando vector store:", error);
      throw error;
    }
  }

  async deleteDocument(documentId: string): Promise<boolean> {
    try {
      const { db } = await connectToDatabase();
      
      // Obtener metadata del documento
      const docMeta = await db.collection(this.metaCollectionName)
        .findOne({ _id: new ObjectId(documentId) });
      
      if (!docMeta) {
        return false;
      }
      
      // Eliminar chunks del documento
      await db.collection(this.collectionName).deleteMany({
        "metadata.source": docMeta.source
      });
      
      // Eliminar metadata
      await db.collection(this.metaCollectionName).deleteOne({
        _id: new ObjectId(documentId)
      });
      
      console.log(`🗑️ Documento eliminado: ${docMeta.source}`);
      return true;
    } catch (error) {
      console.error("Error eliminando documento:", error);
      return false;
    }
  }
}

let vectorStoreManager: MongoDBVectorStoreManager | null = null;

export function getMongoDBVectorStoreManager(): MongoDBVectorStoreManager {
  if (!vectorStoreManager) {
    vectorStoreManager = new MongoDBVectorStoreManager();
  }
  return vectorStoreManager;
} 