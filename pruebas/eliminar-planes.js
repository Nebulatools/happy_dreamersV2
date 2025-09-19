// Script para eliminar todos los planes de los niÃ±os
// Ãštil para testing del nuevo flujo progresivo de planes

require('dotenv').config()
const { ObjectId } = require('mongodb')
const { connect, getDb, disconnect } = require('../scripts/mongoose-util')

const MONGODB_URI = process.env.MONGODB_URI
const USER_ID = '688ce146d2d5ff9616549d86' // Usuario de prueba

async function eliminarPlanes() {
  try {
    console.log('ðŸ—‘ï¸  ELIMINAR TODOS LOS PLANES')
    console.log('===============================')
    
    const client = /* mongoose connection handled in connect() */
    await connect()
    console.log('âœ… Conectado a MongoDB')
    
    const db = await getDb()
    
    // Obtener niÃ±os del usuario
    const children = await db.collection('children')
      .find({ parentId: USER_ID })
      .toArray()
      
    if (children.length === 0) {
      console.error('âŒ No hay niÃ±os encontrados')
      return
    }
    
    console.log(`\nðŸ“ NiÃ±os encontrados:`)
    for (const child of children) {
      console.log(`   ðŸ‘¶ ${child.firstName} ${child.lastName}`)
    }
    
    // Eliminar todos los planes de estos niÃ±os
    const childIds = children.map(child => child._id)
    
    const result = await db.collection('child_plans').deleteMany({
      childId: { $in: childIds }
    })
    
    console.log(`\nðŸ—‘ï¸  Planes eliminados: ${result.deletedCount}`)
    
    // Mostrar resumen por niÃ±o
    for (const child of children) {
      const planesEliminados = await db.collection('child_plans').countDocuments({
        childId: child._id
      })
      console.log(`   âœ… ${child.firstName}: ${planesEliminados} planes restantes (deberÃ­a ser 0)`)
    }
    
    await disconnect()
    console.log('\nðŸŽ‰ PLANES ELIMINADOS EXITOSAMENTE')
    console.log('================================')
    console.log('âœ… Listo para probar el nuevo flujo progresivo')
    
  } catch (error) {
    console.error('âŒ Error:', error)
    process.exit(1)
  }
}

// Ejecutar script
eliminarPlanes()