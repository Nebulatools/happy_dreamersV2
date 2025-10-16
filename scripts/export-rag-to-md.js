// Exporta todo el contenido del RAG (vector store) a un archivo Markdown
// - Lee `documents_metadata` para listar las fuentes
// - Reconstruye contenido por documento concatenando sus chunks en `vector_documents`
// - Genera `docs/RAG_SUMMARY.md` con resumen y contenido por documento

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { MongoClient } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI
const DB_NAME = process.env.MONGODB_DB_FINAL || process.env.MONGODB_DATABASE || process.env.MONGODB_DB

if (!MONGODB_URI || !DB_NAME) {
  console.error('❌ Faltan variables de entorno MONGODB_URI o DB_NAME')
  process.exit(1)
}

async function fetchRagDocuments(db) {
  const meta = await db.collection('documents_metadata')
    .find({})
    .sort({ createdAt: 1 })
    .toArray()

  const docs = []
  for (const m of meta) {
    const chunks = await db.collection('vector_documents')
      .find({ 'metadata.source': m.source })
      .sort({ createdAt: 1, _id: 1 })
      .project({ content: 1 })
      .toArray()

    const fullText = chunks.map(c => c.content).join('\n\n')
    docs.push({
      source: m.source,
      displayName: m.displayName || (m.source?.startsWith('drive:') ? m.source.replace(/^drive:/, '') : m.source),
      type: m.type,
      uploadDate: m.uploadDate,
      createdAt: m.createdAt,
      size: m.size,
      chunksCount: m.chunksCount || chunks.length,
      webViewLink: m.driveWebViewLink || null,
      content: fullText
    })
  }
  return docs
}

function buildMarkdown(docs) {
  const lines = []
  lines.push('# RAG: Resumen y Contenido por Documento')
  lines.push('')
  lines.push(`Generado: ${new Date().toISOString()}`)
  lines.push('')

  // Resumen
  lines.push('## Resumen')
  lines.push(`- Documentos totales: ${docs.length}`)
  const totalChunks = docs.reduce((acc, d) => acc + (d.chunksCount || 0), 0)
  lines.push(`- Chunks totales: ${totalChunks}`)
  lines.push('')

  // Índice
  lines.push('## Índice')
  docs.forEach((d, i) => {
    lines.push(`- [${i + 1}. ${d.displayName}]#doc-${i + 1}`)
  })
  lines.push('')

  // Contenido por documento
  docs.forEach((d, i) => {
    lines.push(`## ${i + 1}. ${d.displayName}`)
    lines.push('')
    lines.push(`- Fuente: ${d.source}`)
    lines.push(`- Tipo: ${d.type || 'N/A'}`)
    lines.push(`- Fecha de carga: ${d.uploadDate || 'N/A'}`)
    lines.push(`- Registrado en: ${d.createdAt ? new Date(d.createdAt).toISOString() : 'N/A'}`)
    lines.push(`- Chunks: ${d.chunksCount}`)
    lines.push(`- Tamaño aprox.: ${d.size} caracteres`)
    if (d.webViewLink) lines.push(`- Enlace: ${d.webViewLink}`)
    lines.push('')
    lines.push('### Contenido (reconstruido)')
    lines.push('')
    lines.push('```')
    lines.push(d.content || '[Sin contenido]')
    lines.push('```')
    lines.push('')
  })

  return lines.join('\n')
}

async function main() {
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  const db = client.db(DB_NAME)
  try {
    const docs = await fetchRagDocuments(db)
    const md = buildMarkdown(docs)

    const outDir = path.join(process.cwd(), 'docs')
    const outFile = path.join(outDir, 'RAG_SUMMARY.md')
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
    fs.writeFileSync(outFile, md, 'utf8')
    console.log(`✅ RAG exportado a: ${outFile}`)
    console.log(`   Documentos: ${docs.length}`)
  } catch (err) {
    console.error('❌ Error exportando RAG:', err)
    process.exit(1)
  } finally {
    await client.close()
  }
}

main().catch((e) => {
  console.error('Error fatal:', e)
  process.exit(1)
})

