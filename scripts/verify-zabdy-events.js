// Script para verificar eventos de jakitooo y encontrar eventos fantasma
// Compara colección 'events' con array embebido 'children.events'

const { MongoClient, ObjectId } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://jaco:nebulatools@nebulacluster01.1rmm8s4.mongodb.net/?retryWrites=true&w=majority&appName=NebulaCluster01'
const DB_NAME = 'jaco_db_ultimate_2025'
const CHILD_ID = '68d1af5315d0e9b1cc189544'

// IDs de eventos fantasma que aparecen en admin
const PHANTOM_IDS = [
  '68e578cdd1ed5c4c029a4517',
  '68e57934d1ed5c4c029a4518'
]

async function main() {
  const client = new MongoClient(MONGODB_URI)

  try {
    console.log('🔌 Conectando a MongoDB...')
    await client.connect()
    console.log('✅ Conectado\n')

    const db = client.db(DB_NAME)

    // 1. Buscar en colección canónica 'events'
    console.log('📦 1. COLECCIÓN CANÓNICA "events":')
    console.log('   Buscando eventos del niño', CHILD_ID)

    const eventsCol = db.collection('events')
    const eventsInCol = await eventsCol.find({ childId: new ObjectId(CHILD_ID) }).toArray()

    console.log(`   ✅ Total eventos encontrados: ${eventsInCol.length}`)

    // Buscar eventos fantasma en colección
    console.log('\n   🔍 Buscando eventos fantasma en colección:')
    for (const phantomId of PHANTOM_IDS) {
      const foundById = await eventsCol.findOne({ _id: new ObjectId(phantomId) })
      const foundByString = await eventsCol.findOne({ _id: phantomId })

      if (foundById || foundByString) {
        console.log(`   ❌ ENCONTRADO: ${phantomId}`)
        console.log(`      ObjectId: ${foundById ? 'SÍ' : 'NO'}`)
        console.log(`      String: ${foundByString ? 'SÍ' : 'NO'}`)
        if (foundById || foundByString) {
          const event = foundById || foundByString
          console.log(`      Tipo: ${event.eventType}`)
          console.log(`      Fecha: ${event.startTime}`)
        }
      } else {
        console.log(`   ✅ NO EXISTE: ${phantomId}`)
      }
    }

    // 2. Buscar en documento del niño (array embebido)
    console.log('\n📦 2. DOCUMENTO DEL NIÑO (array embebido):')
    const childDoc = await db.collection('children').findOne({ _id: new ObjectId(CHILD_ID) })

    if (childDoc) {
      const embeddedEvents = childDoc.events || []
      console.log(`   ✅ Eventos en array embebido: ${embeddedEvents.length}`)

      // Buscar eventos fantasma en array embebido
      console.log('\n   🔍 Buscando eventos fantasma en array embebido:')
      for (const phantomId of PHANTOM_IDS) {
        const found = embeddedEvents.find(e => {
          const eId = e._id?.toString?.() || e._id
          return eId === phantomId
        })

        if (found) {
          console.log(`   ❌ ENCONTRADO: ${phantomId}`)
          console.log(`      Tipo: ${found.eventType}`)
          console.log(`      Fecha: ${found.startTime}`)
        } else {
          console.log(`   ✅ NO EXISTE: ${phantomId}`)
        }
      }
    } else {
      console.log('   ❌ Niño no encontrado')
    }

    // 3. Mostrar últimos 5 eventos de cada ubicación
    console.log('\n📊 3. COMPARACIÓN DE ÚLTIMOS 5 EVENTOS:')

    console.log('\n   Colección "events" (últimos 5):')
    const recentInCol = await eventsCol
      .find({ childId: new ObjectId(CHILD_ID) })
      .sort({ startTime: -1 })
      .limit(5)
      .toArray()

    recentInCol.forEach((e, i) => {
      const id = e._id?.toString?.() || e._id
      const date = new Date(e.startTime).toLocaleString('es-ES')
      console.log(`   ${i + 1}. ${e.eventType} - ${date} - ID: ${id}`)
    })

    console.log('\n   Array embebido (últimos 5):')
    const embeddedSorted = (childDoc?.events || [])
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, 5)

    embeddedSorted.forEach((e, i) => {
      const id = e._id?.toString?.() || e._id
      const date = new Date(e.startTime).toLocaleString('es-ES')
      console.log(`   ${i + 1}. ${e.eventType} - ${date} - ID: ${id}`)
    })

    // 4. Eventos después del 1 septiembre 2025
    console.log('\n📅 4. EVENTOS DESPUÉS DEL 1 SEPTIEMBRE 2025:')
    const afterDate = '2025-09-01T10:00:00.000Z'

    const eventsAfterDate = await eventsCol.find({
      childId: new ObjectId(CHILD_ID),
      startTime: { $gt: afterDate }
    }).toArray()

    console.log(`   Total eventos después de ${afterDate}: ${eventsAfterDate.length}`)
    eventsAfterDate.forEach((e, i) => {
      const id = e._id?.toString?.() || e._id
      const date = new Date(e.startTime).toLocaleString('es-ES')
      console.log(`   ${i + 1}. ${e.eventType} - ${date} - ID: ${id}`)
    })

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await client.close()
    console.log('\n🔌 Conexión cerrada')
  }
}

main()
