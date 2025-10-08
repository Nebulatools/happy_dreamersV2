// Script de migración: Homologar childId de STRING a ObjectId en eventos
// Convierte TODOS los eventos con childId como string a ObjectId
// SEGURO: No elimina datos, solo actualiza el tipo de childId

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

    // 1. Buscar TODOS los eventos con childId como string
    console.log('📦 PASO 1: Identificando eventos con childId como STRING...')

    const eventsWithStringChildId = await eventsCol.find({
      childId: { $type: 'string' }  // Buscar solo strings
    }).toArray()

    console.log(`   ✅ Encontrados ${eventsWithStringChildId.length} eventos con childId como string\n`)

    if (eventsWithStringChildId.length === 0) {
      console.log('✅ No hay eventos para migrar. Todo está homologado.')
      return
    }

    // 2. Mostrar resumen de eventos a migrar
    console.log('📋 EVENTOS A MIGRAR:')
    eventsWithStringChildId.forEach((e, i) => {
      const date = new Date(e.startTime).toLocaleString('es-ES')
      console.log(`   ${i + 1}. ${e.eventType} - ${date} - childId: ${e.childId} (string)`)
    })

    // 3. Migrar cada evento
    console.log('\n🔄 PASO 2: Migrando eventos (childId: string → ObjectId)...\n')

    let migratedCount = 0
    let errorCount = 0

    for (const event of eventsWithStringChildId) {
      try {
        const stringChildId = event.childId

        // Validar que el string es un ObjectId válido
        if (!ObjectId.isValid(stringChildId)) {
          console.log(`   ⚠️ SKIP: ${event._id} - childId "${stringChildId}" no es un ObjectId válido`)
          errorCount++
          continue
        }

        // Actualizar: convertir childId de string a ObjectId
        const result = await eventsCol.updateOne(
          { _id: event._id },
          { $set: { childId: new ObjectId(stringChildId) } }
        )

        if (result.modifiedCount > 0) {
          console.log(`   ✅ Migrado: ${event._id} - ${event.eventType} (${event.startTime})`)
          migratedCount++
        } else {
          console.log(`   ⚠️ No modificado: ${event._id}`)
          errorCount++
        }

      } catch (error) {
        console.log(`   ❌ ERROR: ${event._id} - ${error.message}`)
        errorCount++
      }
    }

    // 4. Verificar migración
    console.log('\n📊 PASO 3: Verificando migración...\n')

    const remainingStringEvents = await eventsCol.find({
      childId: { $type: 'string' }
    }).toArray()

    console.log('📈 RESUMEN DE MIGRACIÓN:')
    console.log(`   ✅ Eventos migrados exitosamente: ${migratedCount}`)
    console.log(`   ❌ Errores: ${errorCount}`)
    console.log(`   ⚠️ Eventos pendientes (aún string): ${remainingStringEvents.length}`)

    if (remainingStringEvents.length > 0) {
      console.log('\n⚠️ EVENTOS PENDIENTES:')
      remainingStringEvents.forEach((e, i) => {
        console.log(`   ${i + 1}. ${e._id} - childId: ${e.childId}`)
      })
    }

    // 5. Verificar que los eventos ahora se leen correctamente
    console.log('\n✅ PASO 4: Verificación final...\n')

    // Tomar un ejemplo de los eventos migrados
    if (eventsWithStringChildId.length > 0) {
      const sampleChildId = eventsWithStringChildId[0].childId

      // Buscar como ObjectId (forma correcta)
      const eventsAsObjectId = await eventsCol.find({
        childId: new ObjectId(sampleChildId)
      }).toArray()

      // Buscar como string (forma incorrecta)
      const eventsAsString = await eventsCol.find({
        childId: sampleChildId
      }).toArray()

      console.log(`   Para childId: ${sampleChildId}`)
      console.log(`   - Búsqueda con ObjectId: ${eventsAsObjectId.length} eventos`)
      console.log(`   - Búsqueda con string: ${eventsAsString.length} eventos`)

      if (eventsAsObjectId.length > eventsAsString.length) {
        console.log('\n   ✅ ¡ÉXITO! Los eventos ahora se leen correctamente con ObjectId')
      } else {
        console.log('\n   ⚠️ Todavía hay eventos con childId como string')
      }
    }

    console.log('\n🎉 MIGRACIÓN COMPLETADA')

  } catch (error) {
    console.error('\n❌ Error durante la migración:', error.message)
    throw error
  } finally {
    await client.close()
    console.log('\n🔌 Conexión cerrada')
  }
}

main()
  .then(() => {
    console.log('\n✅ Script completado exitosamente')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script falló:', error)
    process.exit(1)
  })
