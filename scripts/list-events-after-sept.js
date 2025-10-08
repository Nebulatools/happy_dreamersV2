// Listar TODOS los eventos después del 1 sept 2025 para jakitooo
const { MongoClient, ObjectId } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://jaco:nebulatools@nebulacluster01.1rmm8s4.mongodb.net/?retryWrites=true&w=majority&appName=NebulaCluster01'
const DB_NAME = 'jaco_db_ultimate_2025'
const CHILD_ID = '68d1af5315d0e9b1cc189544'
const AFTER_DATE = '2025-09-01T10:00:00.000Z'

async function main() {
  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    console.log('✅ Conectado\n')

    const db = client.db(DB_NAME)
    const eventsCol = db.collection('events')

    console.log('🔍 Buscando eventos después de', AFTER_DATE)
    console.log('👶 Niño:', CHILD_ID)
    console.log('')

    const events = await eventsCol.find({
      childId: new ObjectId(CHILD_ID),
      startTime: { $gt: AFTER_DATE }
    }).sort({ startTime: 1 }).toArray()

    console.log(`📊 Total eventos encontrados: ${events.length}\n`)

    if (events.length === 0) {
      console.log('✅ No hay eventos después del 1 sept 2025')
    } else {
      console.log('📋 EVENTOS:\n')
      events.forEach((e, i) => {
        const date = new Date(e.startTime)
        const localDate = date.toLocaleString('es-ES', { timeZone: 'America/Mexico_City' })
        const utcDate = date.toISOString()

        console.log(`${i + 1}. ${e.eventType}`)
        console.log(`   ID: ${e._id}`)
        console.log(`   Fecha UTC: ${utcDate}`)
        console.log(`   Fecha Local (Mexico): ${localDate}`)
        console.log(`   childId: ${e.childId}`)
        console.log(`   parentId: ${e.parentId}`)
        console.log('')
      })
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await client.close()
  }
}

main()
