// Script para verificar y corregir parentId en eventos
// Asegura que todos los eventos tengan el parentId correcto del niño

const { MongoClient, ObjectId } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://jaco:nebulatools@nebulacluster01.1rmm8s4.mongodb.net/?retryWrites=true&w=majority&appName=NebulaCluster01'
const DB_NAME = 'jaco_db_ultimate_2025'
const CHILD_ID = '68d1af5315d0e9b1cc189544'

async function main() {
  const client = new MongoClient(MONGODB_URI)

  try {
    console.log('🔌 Conectando a MongoDB...')
    await client.connect()
    console.log('✅ Conectado\n')

    const db = client.db(DB_NAME)

    // 1. Obtener el niño para saber su parentId correcto
    const child = await db.collection('children').findOne({ _id: new ObjectId(CHILD_ID) })

    if (!child) {
      console.error('❌ Niño no encontrado')
      return
    }

    const correctParentId = child.parentId
    console.log('👶 Niño:', child.firstName, child.lastName)
    console.log('👤 Parent ID correcto:', correctParentId.toString())
    console.log('')

    // 2. Buscar eventos del niño
    const eventsCol = db.collection('events')
    const childEvents = await eventsCol.find({
      childId: new ObjectId(CHILD_ID)
    }).toArray()

    console.log(`📊 Total eventos del niño: ${childEvents.length}\n`)

    // 3. Verificar parentId en cada evento
    console.log('🔍 Verificando parentId en eventos...\n')

    let correctCount = 0
    let incorrectCount = 0
    let missingCount = 0
    let fixedCount = 0

    for (const event of childEvents) {
      const eventParentId = event.parentId
      const eventId = event._id.toString()

      // Caso 1: No tiene parentId
      if (!eventParentId) {
        console.log(`❌ SIN parentId: ${eventId} - ${event.eventType} (${event.startTime})`)
        missingCount++

        // Agregar parentId
        await eventsCol.updateOne(
          { _id: event._id },
          { $set: { parentId: correctParentId } }
        )
        fixedCount++
        console.log(`   ✅ Agregado parentId: ${correctParentId}`)
        continue
      }

      // Caso 2: parentId incorrecto
      const eventParentIdStr = eventParentId.toString()
      const correctParentIdStr = correctParentId.toString()

      if (eventParentIdStr !== correctParentIdStr) {
        console.log(`❌ INCORRECTO: ${eventId} - ${event.eventType}`)
        console.log(`   Actual: ${eventParentIdStr}`)
        console.log(`   Correcto: ${correctParentIdStr}`)
        incorrectCount++

        // Corregir parentId
        await eventsCol.updateOne(
          { _id: event._id },
          { $set: { parentId: correctParentId } }
        )
        fixedCount++
        console.log(`   ✅ Corregido`)
        continue
      }

      // Caso 3: parentId correcto
      correctCount++
    }

    console.log('\n📈 RESUMEN:')
    console.log(`   ✅ Eventos con parentId correcto: ${correctCount}`)
    console.log(`   ❌ Eventos con parentId incorrecto: ${incorrectCount}`)
    console.log(`   ⚠️ Eventos sin parentId: ${missingCount}`)
    console.log(`   🔧 Eventos corregidos: ${fixedCount}`)

    // 4. Verificación final
    console.log('\n✅ VERIFICACIÓN FINAL:\n')

    const eventsAfterFix = await eventsCol.find({
      childId: new ObjectId(CHILD_ID)
    }).toArray()

    const allCorrect = eventsAfterFix.every(e => {
      return e.parentId && e.parentId.toString() === correctParentId.toString()
    })

    if (allCorrect) {
      console.log('   ✅ ¡TODOS los eventos tienen el parentId correcto!')
    } else {
      console.log('   ⚠️ Todavía hay eventos con parentId incorrecto')
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
