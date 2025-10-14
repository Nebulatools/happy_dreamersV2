a// Script para eliminar evento fantasma AHORA
const { MongoClient, ObjectId } = require('mongodb')

const MONGODB_URI = 'mongodb+srv://jaco:nebulatools@nebulacluster01.1rmm8s4.mongodb.net/?retryWrites=true&w=majority&appName=NebulaCluster01'
const DB_NAME = 'jaco_db_ultimate_2025'
const EVENT_ID = '68e554a124bd3e59c4fddb60'
const CHILD_ID = '68d1af5315d0e9b1cc189544'

async function deleteEvent() {
  const client = new MongoClient(MONGODB_URI)

  try {
    console.log('🔌 Conectando...')
    await client.connect()
    console.log('✅ Conectado a MongoDB\n')

    const db = client.db(DB_NAME)

    // 1. Eliminar de colección events (ObjectId)
    console.log('1️⃣  Eliminando de "events" (ObjectId)...')
    let r1 = await db.collection('events').deleteOne({ _id: new ObjectId(EVENT_ID) })
    console.log(`   ✅ ${r1.deletedCount} eliminado(s)`)

    // 2. Eliminar de colección events (string)
    console.log('\n2️⃣  Eliminando de "events" (string)...')
    let r2 = await db.collection('events').deleteOne({ _id: EVENT_ID })
    console.log(`   ✅ ${r2.deletedCount} eliminado(s)`)

    // 3. Eliminar del array
    console.log('\n3️⃣  Eliminando de "children.events"...')
    let r3 = await db.collection('children').updateOne(
      { _id: new ObjectId(CHILD_ID) },
      { $pull: { events: { _id: EVENT_ID } } }
    )
    console.log(`   ✅ ${r3.modifiedCount} modificado(s)`)

    console.log('\n✅ ¡EVENTO ELIMINADO!')

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await client.close()
  }
}

deleteEvent()
