// Script para verificar qué planes existen en la base de datos
require('dotenv').config()
const { MongoClient, ObjectId } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI
const USER_ID = '688ce146d2d5ff9616549d86'

async function checkPlansDatabase() {
  try {
    const client = new MongoClient(MONGODB_URI)
    await client.connect()
    console.log('✅ Conectado a MongoDB')
    
    const db = client.db()
    
    // Verificar planes existentes
    console.log('\n🔍 VERIFICANDO PLANES EN BASE DE DATOS...')
    
    const planes = await db.collection('sleep_plans')
      .find({ parentId: new ObjectId(USER_ID) })
      .toArray()
    
    console.log(`📊 Total planes encontrados: ${planes.length}`)
    
    if (planes.length === 0) {
      console.log('❌ NO HAY PLANES EN LA BASE DE DATOS')
      console.log('   Esto explica por qué no se ven en la interfaz.')
    } else {
      console.log('\n📋 PLANES EXISTENTES:')
      planes.forEach((plan, i) => {
        console.log(`\n${i+1}. ${plan.title}`)
        console.log(`   ID: ${plan._id}`)
        console.log(`   Child ID: ${plan.childId}`)
        console.log(`   Parent ID: ${plan.parentId}`)
        console.log(`   Estado: ${plan.status}`)
        console.log(`   Creado: ${plan.createdAt}`)
      })
    }
    
    // Verificar niños para comparar
    const children = await db.collection('children')
      .find({ parentId: USER_ID })
      .toArray()
    
    console.log(`\n👶 Total niños encontrados: ${children.length}`)
    children.forEach((child, i) => {
      console.log(`${i+1}. ${child.firstName} - ID: ${child._id}`)
    })
    
    await client.close()
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkPlansDatabase()