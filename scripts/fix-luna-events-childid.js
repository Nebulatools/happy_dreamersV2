// Convierte childId de Luna de STRING a ObjectId
// Para que aparezcan en el calendario

require('dotenv').config()
const { MongoClient, ObjectId } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI
const DB_NAME = process.env.MONGODB_DB_FINAL || process.env.MONGODB_DATABASE || process.env.MONGODB_DB

const LUNA_CHILD_ID = '68ed606b296f42530dd36c6f'

async function main() {
  const client = new MongoClient(MONGODB_URI)

  console.log('🔧 CONVERSIÓN: childId de Luna a ObjectId\n')
  console.log('Conectando a MongoDB...')

  await client.connect()
  console.log('✅ Conectado\n')

  const db = client.db(DB_NAME)

  try {
    // 1. Verificar eventos actuales
    console.log('=' .repeat(60))
    console.log('📊 ESTADO ANTES DE CONVERSIÓN')
    console.log('=' .repeat(60))

    const beforeCount = await db.collection('events').countDocuments({
      childId: LUNA_CHILD_ID  // Como STRING
    })

    console.log(`Eventos con childId STRING: ${beforeCount}`)

    if (beforeCount === 0) {
      console.log('❌ No hay eventos para convertir')
      return
    }

    // 2. Obtener algunos ejemplos
    const samples = await db.collection('events').find({
      childId: LUNA_CHILD_ID
    }).limit(3).toArray()

    console.log('\nEjemplos ANTES:')
    samples.forEach((evt, idx) => {
      console.log(`  ${idx + 1}. childId: ${evt.childId} (type: ${typeof evt.childId})`)
    })

    // 3. Convertir todos los eventos
    console.log('\n' + '=' .repeat(60))
    console.log('🔄 CONVIRTIENDO...')
    console.log('=' .repeat(60))

    const result = await db.collection('events').updateMany(
      { childId: LUNA_CHILD_ID },  // Buscar por STRING
      { $set: { childId: new ObjectId(LUNA_CHILD_ID) } }  // Convertir a ObjectId
    )

    console.log(`✅ Eventos modificados: ${result.modifiedCount}`)

    // 4. Verificar después
    console.log('\n' + '=' .repeat(60))
    console.log('📊 ESTADO DESPUÉS DE CONVERSIÓN')
    console.log('=' .repeat(60))

    const afterCountString = await db.collection('events').countDocuments({
      childId: LUNA_CHILD_ID  // Como STRING
    })

    const afterCountObjectId = await db.collection('events').countDocuments({
      childId: new ObjectId(LUNA_CHILD_ID)  // Como ObjectId
    })

    console.log(`Eventos con childId STRING: ${afterCountString}`)
    console.log(`Eventos con childId ObjectId: ${afterCountObjectId}`)

    // 5. Verificar ejemplos
    const samplesAfter = await db.collection('events').find({
      childId: new ObjectId(LUNA_CHILD_ID)
    }).limit(3).toArray()

    console.log('\nEjemplos DESPUÉS:')
    samplesAfter.forEach((evt, idx) => {
      console.log(`  ${idx + 1}. childId: ${evt.childId} (type: ${typeof evt.childId})`)
      console.log(`     eventType: ${evt.eventType}, startTime: ${evt.startTime}`)
    })

    // 6. Resumen
    console.log('\n' + '=' .repeat(60))
    console.log('✨ CONVERSIÓN COMPLETADA')
    console.log('=' .repeat(60))
    console.log('✅ Los eventos de Luna ahora tienen childId como ObjectId')
    console.log('✅ Deberían aparecer en el calendario correctamente')
    console.log(`\nTotal convertido: ${result.modifiedCount} eventos`)

  } catch (error) {
    console.error('\n❌ Error:', error)
    throw error
  } finally {
    await client.close()
    console.log('\n🔌 Conexión cerrada')
  }
}

main().catch((e) => {
  console.error('Error fatal:', e)
  process.exit(1)
})
