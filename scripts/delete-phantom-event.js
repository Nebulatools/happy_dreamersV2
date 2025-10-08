// Script para eliminar evento fantasma de la base de datos
// ID del evento: 68e546ca24bd3e59c4fddb5f
// ID del niño: 68d1af5315d0e9b1cc189544

const { MongoClient, ObjectId } = require('mongodb')

// Usar URI directamente o desde variable de entorno
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://jacokam97:C4J3zOCXWjwdDxWk@happydreamers.ljvoc.mongodb.net/?retryWrites=true&w=majority&appName=happydreamers'
const DB_NAME = 'happy_dreamers'

const EVENT_ID = '68e546ca24bd3e59c4fddb5f'
const CHILD_ID = '68d1af5315d0e9b1cc189544'

async function deletePhantomEvent() {
  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    console.log('✅ Conectado a MongoDB')

    const db = client.db(DB_NAME)

    console.log('\n🔍 Buscando evento fantasma...')
    console.log(`   ID del evento: ${EVENT_ID}`)
    console.log(`   ID del niño: ${CHILD_ID}`)

    // PASO 1: Eliminar de la colección 'events'
    console.log('\n📦 PASO 1: Eliminando de colección "events"...')

    // Intentar con ObjectId
    let deleteResult = await db.collection('events').deleteOne({
      _id: new ObjectId(EVENT_ID)
    })
    console.log(`   Intentó con ObjectId: ${deleteResult.deletedCount} eliminados`)

    // Si no se eliminó, intentar con string
    if (deleteResult.deletedCount === 0) {
      deleteResult = await db.collection('events').deleteOne({
        _id: EVENT_ID
      })
      console.log(`   Intentó con string: ${deleteResult.deletedCount} eliminados`)
    }

    // PASO 2: Eliminar del array embebido children.events
    console.log('\n📦 PASO 2: Eliminando de array "children.events"...')

    const updateResult = await db.collection('children').updateOne(
      { _id: new ObjectId(CHILD_ID) },
      { $pull: { events: { _id: EVENT_ID } } }
    )
    console.log(`   Documentos modificados: ${updateResult.modifiedCount}`)

    // PASO 3: Verificar que se eliminó
    console.log('\n🔍 PASO 3: Verificando eliminación...')

    const eventInCol = await db.collection('events').findOne({ _id: EVENT_ID })
    const eventInColObjectId = await db.collection('events').findOne({ _id: new ObjectId(EVENT_ID) })
    const childDoc = await db.collection('children').findOne(
      { _id: new ObjectId(CHILD_ID) },
      { projection: { events: 1 } }
    )

    const eventInArray = childDoc?.events?.find(e => e._id === EVENT_ID)

    console.log(`   Evento en colección (string): ${eventInCol ? '❌ EXISTE' : '✅ NO EXISTE'}`)
    console.log(`   Evento en colección (ObjectId): ${eventInColObjectId ? '❌ EXISTE' : '✅ NO EXISTE'}`)
    console.log(`   Evento en array embebido: ${eventInArray ? '❌ EXISTE' : '✅ NO EXISTE'}`)

    if (!eventInCol && !eventInColObjectId && !eventInArray) {
      console.log('\n✅ ¡ÉXITO! El evento fantasma ha sido eliminado completamente.')
    } else {
      console.log('\n⚠️ ADVERTENCIA: El evento aún existe en algún lugar.')
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    throw error
  } finally {
    await client.close()
    console.log('\n🔌 Conexión cerrada')
  }
}

deletePhantomEvent()
  .then(() => {
    console.log('\n✅ Script completado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script falló:', error)
    process.exit(1)
  })
