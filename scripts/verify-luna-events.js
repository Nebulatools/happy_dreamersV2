// Verifica qué eventos tiene Luna y por qué no aparecen en el calendario

require('dotenv').config()
const { MongoClient, ObjectId } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI
const DB_NAME = process.env.MONGODB_DB_FINAL || process.env.MONGODB_DATABASE || process.env.MONGODB_DB

const LUNA_CHILD_ID = '68ed606b296f42530dd36c6f'

async function main() {
  const client = new MongoClient(MONGODB_URI)

  console.log('🔍 VERIFICACIÓN: Eventos de Luna García\n')
  console.log('Conectando a MongoDB...')

  await client.connect()
  console.log('✅ Conectado\n')

  const db = client.db(DB_NAME)

  try {
    const child = await db.collection('children').findOne({ _id: new ObjectId(LUNA_CHILD_ID) })
    console.log('👶 Niña:', child?.firstName || 'No encontrada')
    console.log('Child ID:', LUNA_CHILD_ID)
    console.log()

    // Buscar eventos de TODAS las formas posibles
    console.log('=' .repeat(60))
    console.log('🔎 BÚSQUEDA 1: childId como STRING')
    console.log('=' .repeat(60))
    const eventsAsString = await db.collection('events').find({
      childId: LUNA_CHILD_ID
    }).limit(5).toArray()
    console.log(`Encontrados: ${eventsAsString.length}`)
    if (eventsAsString.length > 0) {
      console.log('Ejemplo:', eventsAsString[0])
    }

    console.log('\n' + '=' .repeat(60))
    console.log('🔎 BÚSQUEDA 2: childId como ObjectId')
    console.log('=' .repeat(60))
    const eventsAsObjectId = await db.collection('events').find({
      childId: new ObjectId(LUNA_CHILD_ID)
    }).limit(5).toArray()
    console.log(`Encontrados: ${eventsAsObjectId.length}`)
    if (eventsAsObjectId.length > 0) {
      console.log('Ejemplo:', eventsAsObjectId[0])
    }

    console.log('\n' + '=' .repeat(60))
    console.log('🔎 BÚSQUEDA 3: Contar TODOS los formatos')
    console.log('=' .repeat(60))

    const totalString = await db.collection('events').countDocuments({
      childId: LUNA_CHILD_ID
    })

    const totalObjectId = await db.collection('events').countDocuments({
      childId: new ObjectId(LUNA_CHILD_ID)
    })

    console.log(`Como STRING: ${totalString}`)
    console.log(`Como ObjectId: ${totalObjectId}`)

    // Ver qué tiene el API
    console.log('\n' + '=' .repeat(60))
    console.log('🔎 VERIFICAR: Tipo de childId en eventos existentes')
    console.log('=' .repeat(60))

    const sampleEvents = await db.collection('events').find({}).limit(10).toArray()

    if (sampleEvents.length > 0) {
      console.log('Muestreo de eventos en BD:')
      sampleEvents.forEach((evt, idx) => {
        console.log(`\n${idx + 1}. Event ${evt._id}`)
        console.log(`   childId: ${evt.childId}`)
        console.log(`   childId type: ${typeof evt.childId}`)
        console.log(`   eventType: ${evt.eventType}`)
        console.log(`   startTime: ${evt.startTime}`)
      })
    }

    // Verificar cómo el API busca eventos
    console.log('\n' + '=' .repeat(60))
    console.log('🔍 ANÁLISIS: Cómo busca el API')
    console.log('=' .repeat(60))
    console.log('El API en /api/events usa:')
    console.log('  childId: new ObjectId(childId)')
    console.log('')
    console.log('Pero nosotros guardamos Luna con:')
    console.log('  childId: childId.toString()  // ❌ STRING!')
    console.log('')
    console.log('⚠️  PROBLEMA: Discrepancia de tipos!')
    console.log('   El API busca ObjectId pero guardamos STRING')

    // Solución
    console.log('\n' + '=' .repeat(60))
    console.log('✅ SOLUCIÓN')
    console.log('=' .repeat(60))
    console.log('Opciones:')
    console.log('1. Convertir eventos de Luna a ObjectId')
    console.log('2. Actualizar script para guardar como ObjectId')
    console.log('3. Regenerar eventos con formato correcto')

  } catch (error) {
    console.error('\n❌ Error:', error)
  } finally {
    await client.close()
    console.log('\n🔌 Conexión cerrada')
  }
}

main().catch((e) => {
  console.error('Error fatal:', e)
  process.exit(1)
})
