// Investigar un evento específico
const { MongoClient, ObjectId } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://jaco:nebulatools@nebulacluster01.1rmm8s4.mongodb.net/?retryWrites=true&w=majority&appName=NebulaCluster01'
const DB_NAME = 'jaco_db_ultimate_2025'
const EVENT_ID = '68e57934d1ed5c4c029a4518'
const USER_ID = '68d1a9b07e63c75df18e1c1c'

async function main() {
  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    console.log('✅ Conectado\n')

    const db = client.db(DB_NAME)
    const eventsCol = db.collection('events')

    console.log('🔍 Buscando evento:', EVENT_ID)
    console.log('👤 Usuario esperado:', USER_ID)
    console.log('')

    // Buscar por ObjectId
    console.log('1. Búsqueda por ObjectId:')
    const byObjectId = await eventsCol.findOne({ _id: new ObjectId(EVENT_ID) })
    console.log('   Resultado:', byObjectId ? 'ENCONTRADO' : 'NO ENCONTRADO')
    if (byObjectId) {
      console.log('   - childId:', byObjectId.childId)
      console.log('   - parentId:', byObjectId.parentId)
      console.log('   - eventType:', byObjectId.eventType)
      console.log('   - startTime:', byObjectId.startTime)
    }

    // Buscar por string
    console.log('\n2. Búsqueda por string:')
    const byString = await eventsCol.findOne({ _id: EVENT_ID })
    console.log('   Resultado:', byString ? 'ENCONTRADO' : 'NO ENCONTRADO')
    if (byString) {
      console.log('   - childId:', byString.childId)
      console.log('   - parentId:', byString.parentId)
      console.log('   - eventType:', byString.eventType)
      console.log('   - startTime:', byString.startTime)
    }

    // Verificar el filtro completo del DELETE
    console.log('\n3. Filtro completo del DELETE:')
    const deleteFilter = {
      _id: new ObjectId(EVENT_ID),
      parentId: new ObjectId(USER_ID)
    }
    const byDeleteFilter = await eventsCol.findOne(deleteFilter)
    console.log('   Resultado:', byDeleteFilter ? 'ENCONTRADO' : 'NO ENCONTRADO')
    console.log('   Filtro usado:', JSON.stringify({
      _id: EVENT_ID,
      parentId: USER_ID
    }))

    if (!byDeleteFilter && byObjectId) {
      console.log('\n❌ PROBLEMA ENCONTRADO:')
      console.log('   El evento existe, pero NO coincide con el filtro del DELETE')
      console.log('   parentId del evento:', byObjectId.parentId?.toString())
      console.log('   parentId esperado:', USER_ID)

      if (byObjectId.parentId?.toString() !== USER_ID) {
        console.log('\n   ⚠️ El parentId NO COINCIDE')
      }
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await client.close()
  }
}

main()
