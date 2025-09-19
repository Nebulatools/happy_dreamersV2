// Script para BORRAR TODOS los eventos de los niÃ±os
require('dotenv').config()
const { ObjectId } = require('mongodb')
const { connect, getDb, disconnect } = require('./mongoose-util')

const MONGODB_URI = process.env.MONGODB_URI
const USER_ID = '688ce146d2d5ff9616549d86'

async function limpiarTodosLosEventos() {
  try {
    console.log('ðŸ—‘ï¸  LIMPIANDO TODOS LOS EVENTOS')
    console.log('===============================')
    
    /* mongoose connection handled in connect() */await connect()
    console.log('âœ… Conectado a MongoDB')
    
    const db = await getDb()
    b
    
    // Obtener todos los niÃ±os
    const children = await db.collection('children')
      .find({ parentId: USER_ID })
      .toArray()
      
    if (children.length === 0) {
      console.log('âŒ No hay niÃ±os para limpiar')
      return
    }
    
    console.log(`ðŸ‘¶ NiÃ±os encontrados: ${children.length}`)
    
    let totalEventosEliminados = 0
    
    // Limpiar eventos de cada niÃ±o
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
      console.log(`   ðŸ§¹ ${child.firstName}: ${eventosAntes} eventos eliminados`)
    }
    
    console.log('\nðŸŽ‰ LIMPIEZA COMPLETADA')
    console.log('======================')
    console.log(`ðŸ“Š Total eventos eliminados: ${totalEventosEliminados}`)
    console.log('âœ… Base de datos limpia - listo para poblar desde cero')
    
    await disconnect()
    
  } catch (error) {
    console.error('âŒ Error:', error)
  }
}

// Ejecutar limpieza
if (require.main === module) {
  limpiarTodosLosEventos()
}

module.exports = { limpiarTodosLosEventos }