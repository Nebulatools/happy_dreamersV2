// Script de investigación: Estado del RAG (Vector Store)
// Verifica qué documentos médicos tenemos cargados para generación de planes

require('dotenv').config()
const { MongoClient } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI
const DB_NAME = process.env.MONGODB_DB_FINAL || process.env.MONGODB_DATABASE || process.env.MONGODB_DB

if (!MONGODB_URI || !DB_NAME) {
  console.error('❌ Faltan variables de entorno MONGODB_URI o DB_NAME')
  process.exit(1)
}

async function main() {
  const client = new MongoClient(MONGODB_URI)

  console.log('🔍 INVESTIGACIÓN: Estado del RAG (Vector Store)\n')
  console.log('Conectando a MongoDB...')

  await client.connect()
  console.log('✅ Conectado\n')

  const db = client.db(DB_NAME)

  try {
    // 1. Verificar colección de vectores (chunks con embeddings)
    console.log('=' .repeat(60))
    console.log('📊 COLECCIÓN: vector_documents (chunks con embeddings)')
    console.log('=' .repeat(60))

    const vectorCount = await db.collection('vector_documents').countDocuments()
    console.log(`Total de chunks: ${vectorCount}`)

    if (vectorCount > 0) {
      // Mostrar algunos ejemplos
      const samples = await db.collection('vector_documents')
        .find({})
        .limit(3)
        .toArray()

      console.log('\n📝 Ejemplos de chunks:')
      samples.forEach((doc, idx) => {
        console.log(`\n--- Chunk ${idx + 1} ---`)
        console.log(`Fuente: ${doc.metadata?.source || 'N/A'}`)
        console.log(`Tipo: ${doc.metadata?.type || 'N/A'}`)
        console.log(`Tamaño embedding: ${doc.embedding?.length || 0}`)
        console.log(`Contenido (primeros 200 chars):\n${doc.content?.substring(0, 200)}...`)
      })
    } else {
      console.log('⚠️  NO HAY CHUNKS - El RAG está VACÍO')
    }

    // 2. Verificar metadata de documentos
    console.log('\n' + '=' .repeat(60))
    console.log('📚 COLECCIÓN: documents_metadata (fuentes originales)')
    console.log('=' .repeat(60))

    const metaCount = await db.collection('documents_metadata').countDocuments()
    console.log(`Total de documentos únicos: ${metaCount}`)

    if (metaCount > 0) {
      const metaDocs = await db.collection('documents_metadata')
        .find({})
        .sort({ createdAt: -1 })
        .toArray()

      console.log('\n📋 Lista de fuentes:')
      metaDocs.forEach((doc, idx) => {
        console.log(`\n${idx + 1}. ${doc.displayName || doc.source}`)
        console.log(`   - Fuente: ${doc.source}`)
        console.log(`   - Tipo: ${doc.type}`)
        console.log(`   - Tamaño: ${doc.size} caracteres`)
        console.log(`   - Chunks: ${doc.chunksCount || 'N/A'}`)
        console.log(`   - Fecha: ${doc.createdAt?.toISOString() || 'N/A'}`)
        if (doc.driveWebViewLink) {
          console.log(`   - Link: ${doc.driveWebViewLink}`)
        }
      })
    } else {
      console.log('⚠️  NO HAY METADATA - No se han cargado documentos')
    }

    // 3. Resumen y recomendaciones
    console.log('\n' + '=' .repeat(60))
    console.log('📊 RESUMEN Y ANÁLISIS')
    console.log('=' .repeat(60))

    if (vectorCount === 0 && metaCount === 0) {
      console.log('\n❌ PROBLEMA CRÍTICO: RAG completamente vacío')
      console.log('\nEsto significa que la generación de planes NO está usando')
      console.log('conocimiento médico/pediátrico especializado.')
      console.log('\n🔧 RECOMENDACIÓN:')
      console.log('   1. Cargar documentos médicos sobre:')
      console.log('      - Rutinas de sueño por edad')
      console.log('      - Horarios de alimentación infantil')
      console.log('      - Desarrollo infantil y siestas')
      console.log('      - Mejores prácticas pediátricas')
      console.log('   2. Usar el endpoint /api/rag/upload o sincronizar desde Google Drive')
    } else if (vectorCount > 0) {
      console.log('\n✅ RAG está POBLADO con contenido')
      console.log(`   - ${metaCount} documentos fuente`)
      console.log(`   - ${vectorCount} chunks procesados`)
      console.log(`   - Promedio: ${Math.round(vectorCount / (metaCount || 1))} chunks por documento`)
      console.log('\n✨ El sistema de generación de planes tiene acceso a conocimiento especializado')
    }

    // 4. Verificar capacidad de búsqueda
    if (vectorCount > 0) {
      console.log('\n' + '=' .repeat(60))
      console.log('🔍 TEST DE BÚSQUEDA VECTORIAL')
      console.log('=' .repeat(60))
      console.log('\n⚠️  Para test completo de búsqueda se necesita OpenAI API')
      console.log('   (Generación de embeddings para queries)')
      console.log('\n💡 En la generación real, se buscan 4 queries:')
      console.log('   1. "rutina de sueño para niños de X meses"')
      console.log('   2. "horarios de comida infantil"')
      console.log('   3. "siestas apropiadas por edad"')
      console.log('   4. "rutinas de acostarse"')
    }

  } catch (error) {
    console.error('\n❌ Error durante investigación:', error)
  } finally {
    await client.close()
    console.log('\n🔌 Conexión cerrada')
  }
}

main().catch((e) => {
  console.error('Error fatal:', e)
  process.exit(1)
})
