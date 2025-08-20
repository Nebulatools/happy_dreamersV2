// Script para inspeccionar eventos existentes y entender el formato
require('dotenv').config()
const { MongoClient, ObjectId } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI
const USER_ID = '688ce146d2d5ff9616549d86'

async function inspectEvents() {
  try {
    const client = new MongoClient(MONGODB_URI)
    await client.connect()
    console.log('✅ Conectado a MongoDB')
    
    const db = client.db()
    
    // Buscar algunos niños del usuario test
    const children = await db.collection('children')
      .find({ parentId: USER_ID })
      .limit(2)
      .toArray()
    
    console.log(`\n📊 Encontrados ${children.length} niños del usuario test`)
    
    for (const child of children) {
      console.log(`\n👶 NIÑO: ${child.firstName}`)
      console.log(`   ID: ${child._id}`)
      console.log(`   Total eventos: ${child.events?.length || 0}`)
      
      if (child.events && child.events.length > 0) {
        console.log(`\n   📝 Primeros 3 eventos:`)
        child.events.slice(0, 3).forEach((event, i) => {
          console.log(`   ${i+1}. Tipo: ${event.eventType}`)
          console.log(`      StartTime: "${event.startTime}" (${typeof event.startTime})`)
          console.log(`      EndTime: "${event.endTime || 'N/A'}" (${typeof event.endTime})`)
          console.log(`      CreatedAt: "${event.createdAt}" (${typeof event.createdAt})`)
          
          // Verificar si es una fecha válida
          try {
            if (event.startTime) {
              const testDate = new Date(event.startTime)
              console.log(`      StartTime parsed: ${testDate.toISOString()} - ✅ Válida`)
            }
          } catch (error) {
            console.log(`      StartTime parsed: ❌ INVÁLIDA - ${error.message}`)
          }
          console.log('')
        })
        
        // Buscar eventos problemáticos
        const problematicEvents = child.events.filter(event => {
          if (!event.startTime) return false
          try {
            new Date(event.startTime).toISOString()
            return false
          } catch {
            return true
          }
        })
        
        if (problematicEvents.length > 0) {
          console.log(`   ⚠️  Eventos con fechas problemáticas: ${problematicEvents.length}`)
          problematicEvents.slice(0, 2).forEach((event, i) => {
            console.log(`      ${i+1}. ${event.eventType}: "${event.startTime}"`)
          })
        }
      }
    }
    
    await client.close()
    console.log('\n✅ Inspección completada')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

inspectEvents()