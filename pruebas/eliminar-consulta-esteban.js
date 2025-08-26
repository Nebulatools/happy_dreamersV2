// Script para eliminar consulta de Esteban del historial
require('dotenv').config()
const { MongoClient, ObjectId } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI
const ESTEBAN_ID = '68ad0476b98bdbe0f7ff5942'

async function eliminarConsultaEsteban() {
  try {
    console.log('🗑️  ELIMINANDO CONSULTA DE ESTEBAN')
    console.log('==================================')
    
    const client = new MongoClient(MONGODB_URI)
    await client.connect()
    console.log('✅ Conectado a MongoDB')
    
    const db = client.db()
    
    // Verificar consultas existentes de Esteban
    const consultasAntes = await db.collection('consultas').find({
      childId: new ObjectId(ESTEBAN_ID)
    }).toArray()
    
    console.log(`\n📋 Consultas encontradas: ${consultasAntes.length}`)
    
    if (consultasAntes.length > 0) {
      consultasAntes.forEach((consulta, i) => {
        console.log(`  ${i + 1}. Consulta ID: ${consulta._id}`)
        console.log(`     - Fecha: ${consulta.createdAt}`)
        console.log(`     - Análisis: ${consulta.analysis?.substring(0, 80)}...`)
        console.log('')
      })
      
      // Eliminar todas las consultas de Esteban
      const resultado = await db.collection('consultas').deleteMany({
        childId: new ObjectId(ESTEBAN_ID)
      })
      
      console.log(`✅ CONSULTAS ELIMINADAS`)
      console.log(`========================`)
      console.log(`📊 Total eliminadas: ${resultado.deletedCount}`)
      console.log(`🎯 Child ID: ${ESTEBAN_ID}`)
      
    } else {
      console.log('ℹ️  No se encontraron consultas para Esteban')
    }
    
    // Verificar que se eliminaron
    const consultasDespues = await db.collection('consultas').find({
      childId: new ObjectId(ESTEBAN_ID)
    }).toArray()
    
    console.log(`\n📊 Consultas restantes: ${consultasDespues.length}`)
    
    await client.close()
    console.log('\n🎉 PROCESO COMPLETADO')
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

// Ejecutar script
eliminarConsultaEsteban()