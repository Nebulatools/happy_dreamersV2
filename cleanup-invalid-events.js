// Script para limpiar eventos con fechas malformadas
require('dotenv').config()
const { MongoClient, ObjectId } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI
const USER_ID = '688ce146d2d5ff9616549d86'

async function cleanupInvalidEvents() {
  try {
    const client = new MongoClient(MONGODB_URI)
    await client.connect()
    console.log('✅ Conectado a MongoDB')
    
    const db = client.db()
    
    // Buscar niños del usuario test
    const children = await db.collection('children')
      .find({ parentId: USER_ID })
      .toArray()
    
    console.log(`\n🗂️  Encontrados ${children.length} niños del usuario test`)
    
    let totalRemoved = 0
    
    for (const child of children) {
      if (!child.events || child.events.length === 0) continue
      
      console.log(`\n👶 Limpiando eventos de ${child.firstName}...`)
      console.log(`   Eventos actuales: ${child.events.length}`)
      
      // Filtrar eventos válidos
      const validEvents = child.events.filter(event => {
        // Verificar startTime
        if (!event.startTime) return false
        try {
          new Date(event.startTime).toISOString()
        } catch {
          return false
        }
        
        // Verificar endTime si existe
        if (event.endTime) {
          try {
            new Date(event.endTime).toISOString()
          } catch {
            return false
          }
        }
        
        return true
      })
      
      const removedCount = child.events.length - validEvents.length
      totalRemoved += removedCount
      
      console.log(`   Eventos válidos: ${validEvents.length}`)
      console.log(`   Eventos eliminados: ${removedCount}`)
      
      if (removedCount > 0) {
        // Actualizar el documento con solo eventos válidos
        await db.collection('children').updateOne(
          { _id: child._id },
          { $set: { events: validEvents } }
        )
        console.log(`   ✅ Base de datos actualizada`)
      }
    }
    
    await client.close()
    
    console.log(`\n🎉 Limpieza completada!`)
    console.log(`📊 Total eventos con fechas inválidas eliminados: ${totalRemoved}`)
    console.log(`\n💡 Ahora puedes generar datos limpios con: node generate-test-data.js`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

cleanupInvalidEvents()