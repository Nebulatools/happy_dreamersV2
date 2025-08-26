// Script para eliminar todos los planes de los niños
// Útil para testing del nuevo flujo progresivo de planes

require('dotenv').config()
const { MongoClient, ObjectId } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI
const USER_ID = '688ce146d2d5ff9616549d86' // Usuario de prueba

async function eliminarPlanes() {
  try {
    console.log('🗑️  ELIMINAR TODOS LOS PLANES')
    console.log('===============================')
    
    const client = new MongoClient(MONGODB_URI)
    await client.connect()
    console.log('✅ Conectado a MongoDB')
    
    const db = client.db()
    
    // Obtener niños del usuario
    const children = await db.collection('children')
      .find({ parentId: USER_ID })
      .toArray()
      
    if (children.length === 0) {
      console.error('❌ No hay niños encontrados')
      return
    }
    
    console.log(`\n📝 Niños encontrados:`)
    for (const child of children) {
      console.log(`   👶 ${child.firstName} ${child.lastName}`)
    }
    
    // Eliminar todos los planes de estos niños
    const childIds = children.map(child => child._id)
    
    const result = await db.collection('child_plans').deleteMany({
      childId: { $in: childIds }
    })
    
    console.log(`\n🗑️  Planes eliminados: ${result.deletedCount}`)
    
    // Mostrar resumen por niño
    for (const child of children) {
      const planesEliminados = await db.collection('child_plans').countDocuments({
        childId: child._id
      })
      console.log(`   ✅ ${child.firstName}: ${planesEliminados} planes restantes (debería ser 0)`)
    }
    
    await client.close()
    console.log('\n🎉 PLANES ELIMINADOS EXITOSAMENTE')
    console.log('================================')
    console.log('✅ Listo para probar el nuevo flujo progresivo')
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

// Ejecutar script
eliminarPlanes()