// Script para BORRAR TODOS los eventos de los niños
require('dotenv').config()
const { MongoClient, ObjectId } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI
const USER_ID = '688ce146d2d5ff9616549d86'

async function limpiarTodosLosEventos() {
  try {
    console.log('🗑️  LIMPIANDO TODOS LOS EVENTOS')
    console.log('===============================')
    
    const client = new MongoClient(MONGODB_URI)
    await client.connect()
    console.log('✅ Conectado a MongoDB')
    
    const db = client.db()
    
    // Obtener todos los niños
    const children = await db.collection('children')
      .find({ parentId: USER_ID })
      .toArray()
      
    if (children.length === 0) {
      console.log('❌ No hay niños para limpiar')
      return
    }
    
    console.log(`👶 Niños encontrados: ${children.length}`)
    
    let totalEventosEliminados = 0
    
    // Limpiar eventos de cada niño
    for (const child of children) {
      const eventosAntes = child.events ? child.events.length : 0
      
      await db.collection('children').updateOne(
        { _id: child._id },
        { 
          $set: { 
            events: [] // Vaciar completamente el array de eventos
          }
        }
      )
      
      totalEventosEliminados += eventosAntes
      console.log(`   🧹 ${child.firstName}: ${eventosAntes} eventos eliminados`)
    }
    
    console.log('\n🎉 LIMPIEZA COMPLETADA')
    console.log('======================')
    console.log(`📊 Total eventos eliminados: ${totalEventosEliminados}`)
    console.log('✅ Base de datos limpia - listo para poblar desde cero')
    
    await client.close()
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Ejecutar limpieza
if (require.main === module) {
  limpiarTodosLosEventos()
}

module.exports = { limpiarTodosLosEventos }