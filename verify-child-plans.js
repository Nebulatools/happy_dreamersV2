// Script para verificar que los child_plans se crearon correctamente
require('dotenv').config()
const { MongoClient, ObjectId } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI
const USER_ID = '688ce146d2d5ff9616549d86'
const SOFIA_ID = '68a61767b67a4429652bfe63' // ID de Sofía según los logs

async function verifyChildPlans() {
  console.log('🔍 VERIFICANDO CHILD_PLANS CREADOS')
  console.log('=' * 50)
  
  try {
    const client = new MongoClient(MONGODB_URI)
    await client.connect()
    console.log('✅ Conectado a MongoDB')
    
    const db = client.db()
    
    // 1. VERIFICAR PLANES EN CHILD_PLANS
    console.log('\n📋 PLANES EN CHILD_PLANS:')
    const childPlans = await db.collection('child_plans').find({}).toArray()
    
    console.log(`Total planes encontrados: ${childPlans.length}`)
    
    if (childPlans.length === 0) {
      console.log('❌ NO HAY PLANES EN CHILD_PLANS')
    } else {
      childPlans.forEach((plan, i) => {
        console.log(`\n${i+1}. ${plan.title}`)
        console.log(`   _id: ${plan._id}`)
        console.log(`   childId: ${plan.childId}`)
        console.log(`   userId: ${plan.userId}`)
        console.log(`   planNumber: ${plan.planNumber}`)
        console.log(`   status: ${plan.status}`)
        console.log(`   createdAt: ${plan.createdAt}`)
      })
    }
    
    // 2. VERIFICAR SOFÍA ESPECÍFICAMENTE  
    console.log(`\n👑 BUSCANDO PLANES PARA SOFÍA (ID: ${SOFIA_ID})`)
    const sofiaPlans = await db.collection('child_plans')
      .find({ 
        childId: new ObjectId(SOFIA_ID),
        userId: new ObjectId(USER_ID)
      })
      .toArray()
    
    console.log(`Planes de Sofía encontrados: ${sofiaPlans.length}`)
    sofiaPlans.forEach(plan => {
      console.log(`   ✅ Plan: ${plan.title} - Número: ${plan.planNumber}`)
    })
    
    // 3. VERIFICAR TODOS LOS NIÑOS Y SUS PLANES
    console.log('\n👶 VERIFICANDO TODOS LOS NIÑOS:')
    const children = await db.collection('children')
      .find({ parentId: USER_ID })
      .toArray()
    
    for (const child of children) {
      console.log(`\n${child.firstName} ${child.lastName}`)
      console.log(`   ID: ${child._id}`)
      
      const childPlansForThisChild = await db.collection('child_plans')
        .find({ 
          childId: child._id,
          userId: new ObjectId(USER_ID)
        })
        .toArray()
      
      console.log(`   Planes: ${childPlansForThisChild.length}`)
      childPlansForThisChild.forEach(plan => {
        console.log(`      - ${plan.title} (Plan ${plan.planNumber})`)
      })
    }
    
    // 4. VERIFICAR QUERY ESPECÍFICO QUE USA EL API
    console.log('\n🔍 PROBANDO QUERY EXACTO DEL API:')
    const apiQuery = await db.collection("child_plans")
      .find({ 
        childId: new ObjectId(SOFIA_ID),
        userId: new ObjectId(USER_ID)
      })
      .sort({ planNumber: 1 })
      .toArray()
    
    console.log(`Resultado del query del API: ${apiQuery.length} planes`)
    apiQuery.forEach(plan => {
      console.log(`   ✅ ${plan.title}`)
    })
    
    await client.close()
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

verifyChildPlans()