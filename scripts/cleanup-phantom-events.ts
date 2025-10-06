/**
 * Script de limpieza para eliminar eventos fantasma
 * Estos eventos quedaron en la BD debido al bug de eliminación
 */

import { MongoClient, ObjectId } from 'mongodb'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const MONGODB_URI = process.env.MONGODB_URI || ''
const MONGODB_DB = process.env.MONGODB_DB || 'happy_dreamers'

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI no está configurado en .env.local')
}

const CHILD_ID = '68d1af5315d0e9b1cc189544'

const PHANTOM_EVENT_IDS = [
  '68d1b6f931d1254a261dbc80',
  '68d1b80331d1254a261dbc81',
  '68d1b82331d1254a261dbc82',
  '68d1b84131d1254a261dbc83',
  '68d1b85b31d1254a261dbc84',
  '68d1b89131d1254a261dbc85',
  '68d1b8b731d1254a261dbc86',
  '68d1b8cd31d1254a261dbc87',
  '68e2d4ec0533902c2c81fa03',
  '68e3e923c12351ed13659971'
]

async function cleanupPhantomEvents() {
  let client: MongoClient | null = null

  try {
    console.log('🔌 Conectando a MongoDB...')
    client = new MongoClient(MONGODB_URI)
    await client.connect()
    const db = client.db(MONGODB_DB)

    console.log('\n📋 Eventos a eliminar:', PHANTOM_EVENT_IDS.length)

    // 1. Eliminar de la colección events
    console.log('\n🗑️  Eliminando de colección events...')
    const objectIdArray = PHANTOM_EVENT_IDS.map(id => new ObjectId(id))

    const deleteResult = await db.collection('events').deleteMany({
      _id: { $in: objectIdArray }
    })

    console.log(`   ✅ Eliminados de events: ${deleteResult.deletedCount}`)

    // 2. Eliminar del array children.events
    console.log('\n🗑️  Eliminando de children.events...')
    const updateResult = await db.collection('children').updateOne(
      { _id: new ObjectId(CHILD_ID) },
      {
        $pull: {
          events: {
            _id: { $in: PHANTOM_EVENT_IDS }
          }
        } as any
      }
    )

    console.log(`   ✅ Documento children actualizado: ${updateResult.modifiedCount}`)

    // 3. Verificar que se eliminaron
    console.log('\n🔍 Verificando eliminación...')
    const remainingEvents = await db.collection('events').find({
      childId: CHILD_ID
    }).toArray()

    console.log(`   📊 Eventos restantes en colección events: ${remainingEvents.length}`)

    const child = await db.collection('children').findOne({
      _id: new ObjectId(CHILD_ID)
    })

    const childEventsCount = child?.events?.length || 0
    console.log(`   📊 Eventos restantes en children.events: ${childEventsCount}`)

    console.log('\n✅ Limpieza completada exitosamente!')

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error)
    throw error
  } finally {
    if (client) {
      await client.close()
      console.log('\n🔌 Conexión cerrada')
    }
  }
}

// Ejecutar script
cleanupPhantomEvents()
  .then(() => {
    console.log('\n🎉 Script finalizado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error)
    process.exit(1)
  })
