// Script simple para eliminar evento fantasma
// Ejecutar con: node scripts/force-delete-event.js

const { MongoClient, ObjectId } = require('mongodb')

const EVENT_ID = '68e546ca24bd3e59c4fddb5f'
const CHILD_ID = '68d1af5315d0e9b1cc189544'

// URI de conexión
const uri = 'mongodb+srv://jacokam97:C4J3zOCXWjwdDxWk@happydreamers.ljvoc.mongodb.net/happy_dreamers?retryWrites=true&w=majority'

async function deleteEvent() {
  let client

  try {
    console.log('🔌 Conectando a MongoDB...')
    client = await MongoClient.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    })

    console.log('✅ Conectado!\n')

    const db = client.db('happy_dreamers')

    console.log(`🗑️  Eliminando evento ${EVENT_ID}...\n`)

    // 1. Eliminar de colección events (con ObjectId)
    console.log('1️⃣  Intentando eliminar de "events" con ObjectId...')
    let result1 = await db.collection('events').deleteOne({ _id: new ObjectId(EVENT_ID) })
    console.log(`   Resultado: ${result1.deletedCount} documento(s) eliminado(s)`)

    // 2. Eliminar de colección events (con string)
    console.log('\n2️⃣  Intentando eliminar de "events" con string...')
    let result2 = await db.collection('events').deleteOne({ _id: EVENT_ID })
    console.log(`   Resultado: ${result2.deletedCount} documento(s) eliminado(s)`)

    // 3. Eliminar del array children.events
    console.log('\n3️⃣  Eliminando de array "children.events"...')
    let result3 = await db.collection('children').updateOne(
      { _id: new ObjectId(CHILD_ID) },
      { $pull: { events: { _id: EVENT_ID } } }
    )
    console.log(`   Resultado: ${result3.modifiedCount} documento(s) modificado(s)`)

    // 4. Verificar
    console.log('\n✅ Verificando eliminación...')
    const check1 = await db.collection('events').findOne({ _id: new ObjectId(EVENT_ID) })
    const check2 = await db.collection('events').findOne({ _id: EVENT_ID })

    if (!check1 && !check2) {
      console.log('✅ ¡ÉXITO! El evento ha sido eliminado completamente.\n')
    } else {
      console.log('⚠️  El evento aún existe en la base de datos.\n')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    if (client) {
      await client.close()
      console.log('🔌 Conexión cerrada')
    }
  }
}

deleteEvent()
