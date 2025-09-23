// Genera Plan 1.1 (transcript_refinement) con fecha 1 agosto 2025
// Base: Plan 1 (event_based). Aplica acuerdos de transcript y backdatea createdAt.

require('dotenv').config()
const { MongoClient, ObjectId } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI
const DB_NAME = process.env.MONGODB_DB_FINAL || process.env.MONGODB_DATABASE || process.env.MONGODB_DB

const TARGET_CHILD_ID = process.env.SEED_CHILD_ID || '68d1af5315d0e9b1cc189544'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'mariana@admin.com'

// Fecha de creación forzada para el Plan 1.1 (refinamiento)
const PLAN11_CREATED_AT_ISO = '2025-08-01T20:05:56.000Z'
const PLAN11_CREATED_AT = new Date(PLAN11_CREATED_AT_ISO)

if (!MONGODB_URI || !DB_NAME) {
  console.error('❌ Faltan variables de entorno MONGODB_URI o base de datos (MONGODB_DB_FINAL/MONGODB_DATABASE/MONGODB_DB)')
  process.exit(1)
}

async function main() {
  const client = new MongoClient(MONGODB_URI)
  console.log('Conectando a MongoDB...')
  await client.connect()
  console.log('✅ Conectado')

  const db = client.db(DB_NAME)
  const users = db.collection('users')
  const plans = db.collection('child_plans')
  const children = db.collection('children')

  try {
    // Admin y niño
    const admin = await users.findOne({ email: ADMIN_EMAIL.toLowerCase() })
    if (!admin) throw new Error(`Admin no encontrado: ${ADMIN_EMAIL}`)
    const child = await children.findOne({ _id: new ObjectId(TARGET_CHILD_ID) })
    if (!child) throw new Error(`Niño no encontrado: ${TARGET_CHILD_ID}`)

    const effectiveUserId = child.parentId || child.userId || admin._id

    // Plan 1 base (event_based)
    const plan1 = await plans.findOne({
      childId: new ObjectId(TARGET_CHILD_ID),
      userId: new ObjectId(effectiveUserId),
      planType: 'event_based',
      planNumber: 1,
    }, { sort: { createdAt: -1 } })
    if (!plan1) throw new Error('No se encontró Plan 1 (event_based) para usar como base')

    // Schedule base (del Plan 1) y ajustes de transcript (acuerdos típicos)
    const baseSchedule = plan1.schedule || {}
    const refinedSchedule = {
      ...baseSchedule,
      wakeTime: '06:55',
      bedtime: '20:40',
      meals: [
        { time: '08:10', type: 'desayuno', description: 'Desayuno ajustado por consulta' },
        { time: '12:35', type: 'almuerzo', description: 'Almuerzo según acuerdos' },
        { time: '18:45', type: 'cena', description: 'Cena previa a rutina nocturna' },
      ],
      activities: [],
      naps: [ { time: '13:30', duration: 90, description: 'Siesta principal' } ],
    }

    // Borrar cualquier Plan 1.1 previo
    await plans.deleteMany({
      childId: new ObjectId(TARGET_CHILD_ID),
      userId: new ObjectId(effectiveUserId),
      planNumber: 1,
      planType: 'transcript_refinement',
    })

    // Insertar Plan 1.1
    const plan11Doc = {
      childId: new ObjectId(TARGET_CHILD_ID),
      userId: new ObjectId(effectiveUserId),
      planNumber: 1,
      planVersion: '1.1',
      planType: 'transcript_refinement',
      title: `Plan 1.1 de Refinamiento para ${child.firstName}`,
      schedule: refinedSchedule,
      objectives: [
        'Reducir despertares nocturnos',
        'Mantener horarios consistentes de sueño y comidas',
      ],
      recommendations: [
        'Corte de pantallas a las 18:30',
        'Rutina tranquila 30 minutos antes de dormir',
      ],
      basedOn: 'transcript_analysis',
      basedOnPlan: { planId: plan1._id, planVersion: plan1.planVersion },
      transcriptAnalysis: {
        reportId: null, // opcional si no se quiere crear un documento de reporte
        improvements: ['Siesta más estable', 'Reducción de despertares'],
        adjustments: ['Despertar 06:55', 'Dormir 20:40', 'Desayuno 08:10 / Comida 12:35 / Cena 18:45'],
        basePlanVersion: plan1.planVersion,
      },
      createdAt: PLAN11_CREATED_AT,
      updatedAt: PLAN11_CREATED_AT,
      createdBy: admin._id,
      status: 'active',
    }

    const insert = await plans.insertOne(plan11Doc)
    console.log('✅ Plan 1.1 insertado:', insert.insertedId.toString())

    // Marcar Plan 1 como superseded (por 1.1) con la misma fecha
    await plans.updateOne({ _id: plan1._id }, { $set: { status: 'superseded', updatedAt: PLAN11_CREATED_AT } })
    console.log('📌 Plan 1 marcado como superseded')

  } catch (err) {
    console.error('❌ Error generando Plan 1.1 backdated:', err)
    process.exit(1)
  } finally {
    await client.close()
    console.log('🔌 Conexión cerrada')
  }
}

main().catch((e) => { console.error('Error fatal:', e); process.exit(1) })

