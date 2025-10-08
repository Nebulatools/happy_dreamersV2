// Script para convertir _id de eventos de string a ObjectId
// CRÍTICO: Los _id deben ser ObjectId para que las operaciones CRUD funcionen

const { MongoClient, ObjectId } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://jaco:nebulatools@nebulacluster01.1rmm8s4.mongodb.net/?retryWrites=true&w=majority&appName=NebulaCluster01'
const DB_NAME = 'jaco_db_ultimate_2025'

async function main() {
  const client = new MongoClient(MONGODB_URI)

  try {
    console.log('🔌 Conectando a MongoDB...')
    await client.connect()
    console.log('✅ Conectado\n')

    const db = client.db(DB_NAME)
    const eventsCol = db.collection('events')

    // 1. Buscar eventos con _id como string
    console.log('📦 PASO 1: Identificando eventos con _id como STRING...')

    const eventsWithStringId = await eventsCol.find({
      _id: { $type: 'string' }
    }).toArray()

    console.log(`   ✅ Encontrados ${eventsWithStringId.length} eventos con _id como string\n`)

    if (eventsWithStringId.length === 0) {
      console.log('✅ No hay eventos para migrar. Todos los _id son ObjectId.')
      return
    }

    // 2. Mostrar eventos a migrar
    console.log('📋 EVENTOS A MIGRAR:')
    eventsWithStringId.slice(0, 10).forEach((e, i) => {
      console.log(`   ${i + 1}. ${e.eventType} - ${e.startTime} - _id: ${e._id} (string)`)
    })
    if (eventsWithStringId.length > 10) {
      console.log(`   ... y ${eventsWithStringId.length - 10} más`)
    }

    // 3. Migrar cada evento
    console.log('\n🔄 PASO 2: Migrando eventos (_id: string → ObjectId)...\n')

    let migratedCount = 0
    let errorCount = 0

    for (const event of eventsWithStringId) {
      try {
        const stringId = event._id

        // Validar que es un ObjectId válido
        if (!ObjectId.isValid(stringId)) {
          console.log(`   ⚠️ SKIP: ${stringId} - no es un ObjectId válido`)
          errorCount++
          continue
        }

        // ESTRATEGIA: Crear nuevo documento con _id ObjectId y eliminar el viejo
        const newEvent = { ...event, _id: new ObjectId(stringId) }

        // 1. Insertar con _id ObjectId
        await eventsCol.insertOne(newEvent)

        // 2. Eliminar el viejo con _id string
        await eventsCol.deleteOne({ _id: stringId })

        console.log(`   ✅ Migrado: ${stringId} → ObjectId`)
        migratedCount++

      } catch (error) {
        // Si ya existe con ObjectId, solo eliminar el string
        if (error.code === 11000) {
          await eventsCol.deleteOne({ _id: event._id })
          console.log(`   ✅ Eliminado duplicado string: ${event._id}`)
          migratedCount++
        } else {
          console.log(`   ❌ ERROR: ${event._id} - ${error.message}`)
          errorCount++
        }
      }
    }

    // 4. Verificación
    console.log('\n📊 PASO 3: Verificando migración...\n')

    const remainingStringIds = await eventsCol.find({
      _id: { $type: 'string' }
    }).toArray()

    console.log('📈 RESUMEN:')
    console.log(`   ✅ Eventos migrados: ${migratedCount}`)
    console.log(`   ❌ Errores: ${errorCount}`)
    console.log(`   ⚠️ Eventos pendientes (aún string): ${remainingStringIds.length}`)

    if (remainingStringIds.length === 0) {
      console.log('\n   ✅ ¡ÉXITO! Todos los _id son ahora ObjectId')
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    throw error
  } finally {
    await client.close()
    console.log('\n🔌 Conexión cerrada')
  }
}

main()
  .then(() => {
    console.log('\n✅ Script completado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script falló:', error)
    process.exit(1)
  })
