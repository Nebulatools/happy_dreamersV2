// Verificación final de homologación de eventos
const { MongoClient, ObjectId } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://jaco:nebulatools@nebulacluster01.1rmm8s4.mongodb.net/?retryWrites=true&w=majority&appName=NebulaCluster01'
const DB_NAME = 'jaco_db_ultimate_2025'
const CHILD_ID = '68d1af5315d0e9b1cc189544'
const PLAN0_DATE = '2025-09-01T10:00:00.000Z'

async function main() {
  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    console.log('✅ Conectado\n')

    const db = client.db(DB_NAME)
    const eventsCol = db.collection('events')

    console.log('🔍 VERIFICACIÓN DE HOMOLOGACIÓN\n')
    console.log('=' .repeat(60))

    // 1. Verificar tipos de childId
    console.log('\n1️⃣  TIPOS DE childId:')
    const stringEvents = await eventsCol.find({ childId: { $type: 'string' } }).toArray()
    const objectIdEvents = await eventsCol.find({ childId: { $type: 'objectId' } }).toArray()

    console.log(`   📊 Eventos con childId como STRING: ${stringEvents.length}`)
    console.log(`   📊 Eventos con childId como ObjectId: ${objectIdEvents.length}`)

    if (stringEvents.length === 0) {
      console.log('   ✅ PERFECTO: Todos los eventos usan ObjectId para childId')
    } else {
      console.log('   ❌ ERROR: Todavía hay eventos con childId como string')
    }

    // 2. Verificar tipos de _id
    console.log('\n2️⃣  TIPOS DE _id:')
    const stringIds = await eventsCol.find({ _id: { $type: 'string' } }).toArray()
    const objectIds = await eventsCol.find({ _id: { $type: 'objectId' } }).toArray()

    console.log(`   📊 Eventos con _id como STRING: ${stringIds.length}`)
    console.log(`   📊 Eventos con _id como ObjectId: ${objectIds.length}`)

    if (stringIds.length === 0) {
      console.log('   ✅ PERFECTO: Todos los eventos usan ObjectId para _id')
    } else {
      console.log('   ❌ ERROR: Todavía hay eventos con _id como string')
    }

    // 3. Verificar tipos de parentId
    console.log('\n3️⃣  TIPOS DE parentId:')
    const stringParentIds = await eventsCol.find({ parentId: { $type: 'string' } }).toArray()
    const objectParentIds = await eventsCol.find({ parentId: { $type: 'objectId' } }).toArray()

    console.log(`   📊 Eventos con parentId como STRING: ${stringParentIds.length}`)
    console.log(`   📊 Eventos con parentId como ObjectId: ${objectParentIds.length}`)

    if (stringParentIds.length === 0) {
      console.log('   ✅ PERFECTO: Todos los eventos usan ObjectId para parentId')
    } else {
      console.log('   ❌ ERROR: Todavía hay eventos con parentId como string')
    }

    // 4. Verificar eventos de jakitooo
    console.log('\n4️⃣  EVENTOS DE JAKITOOO:')
    const jakitooEvents = await eventsCol.find({
      childId: new ObjectId(CHILD_ID)
    }).toArray()

    console.log(`   📊 Total eventos de jakitooo: ${jakitooEvents.length}`)

    // 5. Verificar eventos después de Plan 0
    console.log('\n5️⃣  EVENTOS DESPUÉS DE PLAN 0:')
    const eventsAfterPlan = await eventsCol.find({
      childId: new ObjectId(CHILD_ID),
      startTime: { $gt: PLAN0_DATE }
    }).toArray()

    console.log(`   📊 Eventos después de ${PLAN0_DATE}: ${eventsAfterPlan.length}`)

    if (eventsAfterPlan.length === 0) {
      console.log('   ✅ PERFECTO: No hay eventos después de la fecha del Plan 0')
      console.log('   ✅ El botón del admin debería estar DESHABILITADO')
    } else {
      console.log('   ❌ ERROR: Hay eventos después de la fecha del Plan 0')
      console.log('   ❌ El botón del admin estará HABILITADO')

      eventsAfterPlan.forEach((e, i) => {
        console.log(`\n   Evento ${i + 1}:`)
        console.log(`     ID: ${e._id}`)
        console.log(`     Tipo: ${e.eventType}`)
        console.log(`     Fecha: ${e.startTime}`)
      })
    }

    // Resumen final
    console.log('\n' + '='.repeat(60))
    console.log('📊 RESUMEN FINAL:\n')

    const allGood = stringEvents.length === 0 &&
                    stringIds.length === 0 &&
                    stringParentIds.length === 0 &&
                    eventsAfterPlan.length === 0

    if (allGood) {
      console.log('   ✅✅✅ TODO HOMOLOGADO CORRECTAMENTE ✅✅✅')
      console.log('   ✅ El sistema está listo para usar')
      console.log('   ✅ El admin debería funcionar correctamente')
    } else {
      console.log('   ❌ TODAVÍA HAY PROBLEMAS QUE RESOLVER')
    }

    console.log('\n' + '='.repeat(60))

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await client.close()
  }
}

main()
