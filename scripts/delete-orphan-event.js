// Eliminar evento huérfano con childId como string
const { MongoClient, ObjectId } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://jaco:nebulatools@nebulacluster01.1rmm8s4.mongodb.net/?retryWrites=true&w=majority&appName=NebulaCluster01'
const DB_NAME = 'jaco_db_ultimate_2025'
const EVENT_ID = '68e59135d1ed5c4c029a451a'
const CHILD_ID = '68d1af5315d0e9b1cc189544'

async function main() {
  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    console.log('✅ Conectado\n')

    const db = client.db(DB_NAME)
    const eventsCol = db.collection('events')

    // Buscar el evento con childId como string
    const event = await eventsCol.findOne({
      childId: CHILD_ID  // String
    })

    if (!event) {
      console.log('❌ Evento no encontrado')
      return
    }

    console.log('📍 EVENTO A ELIMINAR:\n')
    console.log('   _id:', event._id)
    console.log('   childId:', event.childId, '(tipo:', typeof event.childId, ')')
    console.log('   eventType:', event.eventType)
    console.log('   startTime:', event.startTime)
    console.log('   Fecha:', new Date(event.startTime).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }))

    // Eliminar evento usando el _id encontrado
    const result = await eventsCol.deleteOne({
      _id: event._id
    })

    console.log('\n🗑️  RESULTADO:')
    console.log('   Eventos eliminados:', result.deletedCount)

    if (result.deletedCount === 1) {
      console.log('\n✅ Evento huérfano eliminado exitosamente')
    } else {
      console.log('\n❌ No se pudo eliminar el evento')
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await client.close()
  }
}

main()
