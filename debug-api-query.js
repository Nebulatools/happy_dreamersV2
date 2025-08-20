// Script para diagnosticar exactamente por qué el API no encuentra los planes
require('dotenv').config()
const { MongoClient, ObjectId } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI
const USER_ID = '688ce146d2d5ff9616549d86'
const SOFIA_ID = '68a61767b67a4429652bfe63'

async function debugApiQuery() {
  console.log('🔍 DIAGNOSTICANDO QUERY DEL API')
  console.log('=' * 50)
  
  try {
    const client = new MongoClient(MONGODB_URI)
    await client.connect()
    console.log('✅ Conectado a MongoDB')
    
    const db = client.db()
    
    console.log(`\n🎯 PARÁMETROS RECIBIDOS:`)
    console.log(`childId: "${SOFIA_ID}"`)
    console.log(`userId: "${USER_ID}"`)
    
    // 1. QUERY EXACTO QUE USA EL API
    console.log(`\n📋 QUERY 1: Tal como lo hace el API`)
    console.log(`db.collection("child_plans").find({ 
      childId: new ObjectId("${SOFIA_ID}"),
      userId: new ObjectId("${USER_ID}")
    })`)
    
    const query1 = await db.collection("child_plans")
      .find({ 
        childId: new ObjectId(SOFIA_ID),
        userId: new ObjectId(USER_ID)
      })
      .toArray()
    
    console.log(`Resultado: ${query1.length} planes`)
    
    // 2. VERIFICAR TIPOS DE DATOS EN LA DB
    console.log(`\n🔍 QUERY 2: Verificar tipos de datos`)
    const samplePlan = await db.collection("child_plans")
      .findOne({ childId: new ObjectId(SOFIA_ID) })
    
    if (samplePlan) {
      console.log('Plan encontrado:')
      console.log(`   childId type: ${typeof samplePlan.childId} (${samplePlan.childId.constructor.name})`)
      console.log(`   childId value: ${samplePlan.childId}`)
      console.log(`   userId type: ${typeof samplePlan.userId} (${samplePlan.userId.constructor.name})`)
      console.log(`   userId value: ${samplePlan.userId}`)
      console.log(`   title: ${samplePlan.title}`)
    } else {
      console.log('❌ No se encontró plan con childId como ObjectId')
    }
    
    // 3. BUSCAR CON STRINGS
    console.log(`\n📋 QUERY 3: Con strings`)
    const query3 = await db.collection("child_plans")
      .find({ 
        childId: SOFIA_ID,
        userId: USER_ID
      })
      .toArray()
    
    console.log(`Resultado con strings: ${query3.length} planes`)
    
    // 4. BUSCAR SOLO POR CHILDID
    console.log(`\n📋 QUERY 4: Solo por childId (ObjectId)`)
    const query4 = await db.collection("child_plans")
      .find({ childId: new ObjectId(SOFIA_ID) })
      .toArray()
    
    console.log(`Resultado solo childId: ${query4.length} planes`)
    
    // 5. BUSCAR SOLO POR USERID  
    console.log(`\n📋 QUERY 5: Solo por userId (ObjectId)`)
    const query5 = await db.collection("child_plans")
      .find({ userId: new ObjectId(USER_ID) })
      .toArray()
    
    console.log(`Resultado solo userId: ${query5.length} planes`)
    
    // 6. BUSCAR TODO EN CHILD_PLANS PARA ESTE USER
    console.log(`\n📋 QUERY 6: Todos los planes del usuario`)
    const allPlansForUser = await db.collection("child_plans")
      .find({ userId: new ObjectId(USER_ID) })
      .toArray()
    
    console.log(`Total planes del usuario: ${allPlansForUser.length}`)
    allPlansForUser.forEach(plan => {
      console.log(`   - ${plan.title} (childId: ${plan.childId})`)
    })
    
    // 7. SIMULAR LA FUNCIÓN COMPLETA DEL API
    console.log(`\n🚀 SIMULANDO FUNCIÓN COMPLETA DEL API:`)
    
    // Verificación de permisos (simulada)
    console.log('✅ Permisos: isParent = true')
    
    // Query exacto del API
    const apiQuery = await db.collection("child_plans")
      .find({ 
        childId: new ObjectId(SOFIA_ID),
        userId: new ObjectId(USER_ID)
      })
      .sort({ planNumber: 1 })
      .toArray()
    
    console.log(`📊 Resultado final API: ${apiQuery.length} planes`)
    
    if (apiQuery.length > 0) {
      console.log('🎉 ¡EL API DEBERÍA FUNCIONAR!')
      apiQuery.forEach(plan => {
        console.log(`   ✅ ${plan.title} - Plan ${plan.planNumber}`)
      })
    } else {
      console.log('❌ PROBLEMA: El API no encuentra planes')
      
      // Buscar causa específica
      const allSofiasPlans = await db.collection("child_plans")
        .find({ $or: [
          { childId: new ObjectId(SOFIA_ID) },
          { childId: SOFIA_ID }
        ]})
        .toArray()
      
      console.log(`\nPlanes de Sofía (cualquier tipo): ${allSofiasPlans.length}`)
      allSofiasPlans.forEach(plan => {
        console.log(`   childId: ${plan.childId} (${typeof plan.childId})`)
        console.log(`   userId: ${plan.userId} (${typeof plan.userId})`)
        console.log(`   Match childId: ${plan.childId.toString() === SOFIA_ID}`)
        console.log(`   Match userId: ${plan.userId.toString() === USER_ID}`)
      })
    }
    
    await client.close()
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

debugApiQuery()