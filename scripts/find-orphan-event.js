// Encontrar el evento con childId como string
const { MongoClient, ObjectId } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://jaco:nebulatools@nebulacluster01.1rmm8s4.mongodb.net/?retryWrites=true&w=majority&appName=NebulaCluster01'
const DB_NAME = 'jaco_db_ultimate_2025'
const CHILD_ID = '68d1af5315d0e9b1cc189544'

async function main() {
  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    console.log('✅ Conectado\n')

    const db = client.db(DB_NAME)
    const eventsCol = db.collection('events')

    // Buscar evento de jakitooo con childId como string
    const orphanEvent = await eventsCol.findOne({
      childId: CHILD_ID  // String
    })

    if (orphanEvent) {
      console.log('📍 EVENTO HUÉRFANO ENCONTRADO:\n')
      console.log('   _id:', orphanEvent._id)
      console.log('   childId:', orphanEvent.childId, '(tipo:', typeof orphanEvent.childId, ')')
      console.log('   parentId:', orphanEvent.parentId)
      console.log('   eventType:', orphanEvent.eventType)
      console.log('   startTime:', orphanEvent.startTime)
      console.log('   endTime:', orphanEvent.endTime)
      console.log('   created:', orphanEvent.createdAt)
      console.log('\n   Fecha formateada:', new Date(orphanEvent.startTime).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }))

      console.log('\n🔧 Este evento tiene childId como STRING y debe ser migrado a ObjectId')
    } else {
      console.log('✅ No se encontraron eventos con childId como string')
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await client.close()
  }
}

main()
