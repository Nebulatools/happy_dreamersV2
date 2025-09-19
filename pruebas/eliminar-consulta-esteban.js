// Script para eliminar consulta de Esteban del historial
require('dotenv').config()
const { ObjectId } = require('mongodb')
const { connect, getDb, disconnect } = require('../scripts/mongoose-util')

const MONGODB_URI = process.env.MONGODB_URI
const ESTEBAN_ID = '68ad0476b98bdbe0f7ff5942'

async function eliminarConsultaEsteban() {
  try {
    console.log('ðŸ—‘ï¸  ELIMINANDO CONSULTA DE ESTEBAN')
    console.log('==================================')
    
    const client = /* mongoose connection handled in connect() */
    await connect()
    console.log('âœ… Conectado a MongoDB')
    
    const db = await getDb()
    
    // Verificar consultas existentes de Esteban
    const consultasAntes = await db.collection('consultas').find({
      childId: new ObjectId(ESTEBAN_ID)
    }).toArray()
    
    console.log(`\nðŸ“‹ Consultas encontradas: ${consultasAntes.length}`)
    
    if (consultasAntes.length > 0) {
      consultasAntes.forEach((consulta, i) => {
        console.log(`  ${i + 1}. Consulta ID: ${consulta._id}`)
        console.log(`     - Fecha: ${consulta.createdAt}`)
        console.log(`     - AnÃ¡lisis: ${consulta.analysis?.substring(0, 80)}...`)
        console.log('')
      })
      
      // Eliminar todas las consultas de Esteban
      const resultado = await db.collection('consultas').deleteMany({
        childId: new ObjectId(ESTEBAN_ID)
      })
      
      console.log(`âœ… CONSULTAS ELIMINADAS`)
      console.log(`========================`)
      console.log(`ðŸ“Š Total eliminadas: ${resultado.deletedCount}`)
      console.log(`ðŸŽ¯ Child ID: ${ESTEBAN_ID}`)
      
    } else {
      console.log('â„¹ï¸  No se encontraron consultas para Esteban')
    }
    
    // Verificar que se eliminaron
    const consultasDespues = await db.collection('consultas').find({
      childId: new ObjectId(ESTEBAN_ID)
    }).toArray()
    
    console.log(`\nðŸ“Š Consultas restantes: ${consultasDespues.length}`)
    
    await disconnect()
    console.log('\nðŸŽ‰ PROCESO COMPLETADO')
    
  } catch (error) {
    console.error('âŒ Error:', error)
    process.exit(1)
  }
}

// Ejecutar script
eliminarConsultaEsteban()