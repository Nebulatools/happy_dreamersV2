// Verificar tipos de childId en eventos
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

    // Buscar eventos con childId como string
    const stringEvents = await eventsCol.find({
      childId: { $type: 'string' }
    }).toArray()

    console.log(`📊 Eventos con childId como STRING: ${stringEvents.length}`)

    // Buscar eventos con childId como ObjectId
    const objectIdEvents = await eventsCol.find({
      childId: { $type: 'objectId' }
    }).toArray()

    console.log(`📊 Eventos con childId como ObjectId: ${objectIdEvents.length}`)

    // Buscar eventos de jakitooo con childId como ObjectId
    const jakitooEvents = await eventsCol.find({
      childId: new ObjectId(CHILD_ID)
    }).toArray()

    console.log(`\n👶 Eventos de jakitooo (con ObjectId): ${jakitooEvents.length}`)

    // Buscar eventos de jakitooo con childId como string
    const jakitooStringEvents = await eventsCol.find({
      childId: CHILD_ID
    }).toArray()

    console.log(`👶 Eventos de jakitooo (con string): ${jakitooStringEvents.length}`)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await client.close()
  }
}

main()
