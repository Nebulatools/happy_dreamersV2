require('dotenv').config()
const { MongoClient, ObjectId } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI
const DB_NAME = process.env.MONGODB_DB_FINAL || process.env.MONGODB_DATABASE || process.env.MONGODB_DB

async function main() {
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  const db = client.db(DB_NAME)
  
  const plan1 = await db.collection('child_plans').findOne({
    childId: new ObjectId('68d42d99dee78f126e911490'),
    userId: new ObjectId('68cd8521c9c96bc3f7d26955'),
    planNumber: 1
  })
  
  if (plan1) {
    console.log('✅ Plan 1 encontrado:')
    console.log('  createdAt:', plan1.createdAt)
    console.log('  planVersion:', plan1.planVersion)
    console.log('  planType:', plan1.planType)
    
    // Verificar eventos después
    const now = new Date()
    const eventsAfter = await db.collection('events').countDocuments({
      childId: new ObjectId('68d42d99dee78f126e911490'),
      startTime: { 
        $gt: plan1.createdAt.toISOString(), 
        $lte: now.toISOString() 
      }
    })
    
    console.log('\n📊 Eventos después del Plan 1 hasta ahora:', eventsAfter)
    console.log('   Rango: desde', plan1.createdAt.toISOString(), 'hasta', now.toISOString())
  } else {
    console.log('❌ Plan 1 NO encontrado')
  }
  
  await client.close()
}

main().catch(console.error)
