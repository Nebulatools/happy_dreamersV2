// Script para eliminar múltiples eventos fantasma
const { MongoClient, ObjectId } = require('mongodb')

const MONGODB_URI = 'mongodb+srv://jaco:nebulatools@nebulacluster01.1rmm8s4.mongodb.net/?retryWrites=true&w=majority&appName=NebulaCluster01'
const DB_NAME = 'jaco_db_ultimate_2025'

// IDs de eventos fantasma a eliminar
const PHANTOM_EVENT_IDS = [
  '68e5566878844d9d5d601c6e',
  '68e5568c78844d9d5d601c6f'
]

const CHILD_ID = '68d1af5315d0e9b1cc189544'

async function deletePhantomEvents() {
  const client = new MongoClient(MONGODB_URI)

  try {
    console.log('🔌 Conectando a MongoDB...')
    await client.connect()
    console.log('✅ Conectado\n')

    const db = client.db(DB_NAME)
    let totalEliminados = 0

    for (const eventId of PHANTOM_EVENT_IDS) {
      console.log(`\n🗑️  Eliminando evento: ${eventId}`)

      // 1. Eliminar de colección 'events' (ObjectId)
      let result1 = await db.collection('events').deleteOne({ _id: new ObjectId(eventId) })
      console.log(`   Eliminado de events (ObjectId): ${result1.deletedCount}`)

      // 2. Eliminar de colección 'events' (string)
      let result2 = await db.collection('events').deleteOne({ _id: eventId })
      console.log(`   Eliminado de events (string): ${result2.deletedCount}`)

      // 3. Eliminar del array children.events
      let result3 = await db.collection('children').updateOne(
        { _id: new ObjectId(CHILD_ID) },
        { $pull: { events: { _id: eventId } } }
      )
      console.log(`   Eliminado de children.events: ${result3.modifiedCount}`)

      const eliminado = result1.deletedCount + result2.deletedCount + result3.modifiedCount
      if (eliminado > 0) {
        console.log(`   ✅ Evento ${eventId} eliminado exitosamente`)
        totalEliminados++
      } else {
        console.log(`   ⚠️  Evento ${eventId} no se encontró`)
      }
    }

    console.log('\n\n📈 RESUMEN:')
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`✅ Eventos eliminados: ${totalEliminados}/${PHANTOM_EVENT_IDS.length}`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await client.close()
    console.log('🔌 Conexión cerrada')
  }
}

deletePhantomEvents()
  .then(() => {
    console.log('\n✅ Script completado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script falló:', error)
    process.exit(1)
  })
