require('dotenv').config()
const { MongoClient, ObjectId } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI
const DB_NAME = process.env.MONGODB_DB_FINAL || process.env.MONGODB_DATABASE || process.env.MONGODB_DB

const TARGET_CHILD_ID = process.env.SEED_CHILD_ID || '68d1af5315d0e9b1cc189544'
const TARGET_USER_EMAIL = process.env.SEED_USER_EMAIL || 'ventas@jacoagency.io'

if (!MONGODB_URI || !DB_NAME) {
  console.error('Faltan variables de entorno MONGODB_URI o base de datos (MONGODB_DB_FINAL/MONGODB_DATABASE/MONGODB_DB)')
  process.exit(1)
}

function dtLocal(y, m, d, hh, mm) { return new Date(y, m - 1, d, hh, mm) }
function minutesBetween(a, b) { return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000)) }
function humanDuration(mins) {
  if (!mins || mins <= 0) return ''
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

async function main() {
  const client = new MongoClient(MONGODB_URI)
  console.log('Conectando a MongoDB...')
  await client.connect()
  console.log('✅ Conectado')
  const db = client.db(DB_NAME)
  const users = db.collection('users')
  const children = db.collection('children')
  const eventsCol = db.collection('events')

  try {
    const user = await users.findOne({ email: TARGET_USER_EMAIL.toLowerCase() })
    if (!user) {
      console.error(`❌ Usuario no encontrado por email: ${TARGET_USER_EMAIL}`)
      process.exit(1)
    }

    const child = await children.findOne({ _id: new ObjectId(TARGET_CHILD_ID) })
    if (!child) {
      console.error(`❌ Niño no encontrado con ID: ${TARGET_CHILD_ID}`)
      process.exit(1)
    }

    if (child.parentId?.toString() !== user._id.toString()) {
      console.warn('⚠️ Advertencia: El parentId del niño no coincide con el usuario esperado.')
      console.warn(`   child.parentId=${child.parentId}  user._id=${user._id}`)
      console.warn('   Continuaré usando el parentId del niño para mantener aislamiento de datos.')
    }

    const parentId = child.parentId

    const from = dtLocal(2025, 8, 1, 0, 0)
    const to = dtLocal(2025, 9, 1, 0, 0)

    console.log('🧹 Limpiando eventos existentes de agosto 2025 para este niño en colección events...')
    await eventsCol.deleteMany({
      childId: new ObjectId(TARGET_CHILD_ID),
      startTime: { $gte: from.toISOString(), $lt: to.toISOString() },
    })

    const events = []

    const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
    const choice = (arr) => arr[randInt(0, arr.length - 1)]
    const emo = () => choice(['tranquilo', 'neutral', 'inquieto'])

    for (let day = 1; day <= 31; day++) {
      const sleepStart = dtLocal(2025, 8, day, 20, 30)
      sleepStart.setMinutes(sleepStart.getMinutes() + randInt(-30, 60))
      const sleepEnd = dtLocal(2025, 8, day + 1, 7, 0)
      sleepEnd.setMinutes(sleepEnd.getMinutes() + randInt(-45, 30))
      const sleepDelay = randInt(0, 20)
      const sleepDuration = Math.max(0, minutesBetween(sleepStart, sleepEnd) - sleepDelay)
      events.push({
        _id: new ObjectId(),
        childId: new ObjectId(TARGET_CHILD_ID),
        parentId,
        eventType: 'sleep',
        startTime: sleepStart.toISOString(),
        endTime: sleepEnd.toISOString(),
        sleepDelay,
        duration: sleepDuration,
        durationReadable: humanDuration(sleepDuration),
        emotionalState: emo(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      if (randInt(1, 100) <= 30) {
        const nwStart = dtLocal(2025, 8, day + 1, choice([1, 2, 3]), randInt(0, 59))
        const nwEnd = new Date(nwStart)
        nwEnd.setMinutes(nwStart.getMinutes() + randInt(8, 25))
        const awakeDuration = minutesBetween(nwStart, nwEnd)
        events.push({
          _id: new ObjectId(),
          childId: new ObjectId(TARGET_CHILD_ID),
          parentId,
          eventType: 'night_waking',
          startTime: nwStart.toISOString(),
          endTime: nwEnd.toISOString(),
          awakeDelay: awakeDuration,
          duration: awakeDuration,
          durationReadable: humanDuration(awakeDuration),
          emotionalState: choice(['inquieto', 'neutral']),
          notes: 'Despertó y pidió agua',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      }

      if (randInt(1, 100) <= 15) {
        const nfStart = dtLocal(2025, 8, day + 1, choice([2, 3, 4]), randInt(0, 59))
        const nfEnd = new Date(nfStart)
        nfEnd.setMinutes(nfStart.getMinutes() + randInt(10, 25))
        events.push({
          _id: new ObjectId(),
          childId: new ObjectId(TARGET_CHILD_ID),
          parentId,
          eventType: 'night_feeding',
          startTime: nfStart.toISOString(),
          endTime: nfEnd.toISOString(),
          notes: 'Toma nocturna ligera',
          emotionalState: emo(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      }

      const napStart = dtLocal(2025, 8, day, 13, 0)
      napStart.setMinutes(napStart.getMinutes() + randInt(-15, 75))
      const napEnd = new Date(napStart)
      napEnd.setMinutes(napStart.getMinutes() + randInt(60, 120))
      const napDuration = minutesBetween(napStart, napEnd)
      events.push({
        _id: new ObjectId(),
        childId: new ObjectId(TARGET_CHILD_ID),
        parentId,
        eventType: 'nap',
        startTime: napStart.toISOString(),
        endTime: napEnd.toISOString(),
        duration: napDuration,
        durationReadable: humanDuration(napDuration),
        emotionalState: emo(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const meals = [
        { h: 8, m: 0, amount: () => randInt(150, 220), dur: () => randInt(15, 25), notes: 'Desayuno (solids)' },
        { h: 12, m: 30, amount: () => randInt(180, 260), dur: () => randInt(20, 30), notes: 'Comida (solids)' },
        { h: 18, m: 45, amount: () => randInt(170, 230), dur: () => randInt(15, 25), notes: 'Cena (solids)' },
      ]
      for (const meal of meals) {
        const t = dtLocal(2025, 8, day, meal.h, meal.m)
        t.setMinutes(t.getMinutes() + randInt(-30, 30))
        events.push({
          _id: new ObjectId(),
          childId: new ObjectId(TARGET_CHILD_ID),
          parentId,
          eventType: 'feeding',
          startTime: t.toISOString(),
          feedingType: 'solids',
          feedingAmount: typeof meal.amount === 'function' ? meal.amount() : meal.amount,
          feedingDuration: typeof meal.dur === 'function' ? meal.dur() : meal.dur,
          babyState: 'awake',
          feedingNotes: meal.notes,
          emotionalState: emo(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      }

      const date = dtLocal(2025, 8, day, 12, 0)
      const weekday = date.getUTCDay()
      if (weekday === 0 || weekday === 6) {
        const actTime = dtLocal(2025, 8, day, 17, 0)
        actTime.setMinutes(actTime.getMinutes() + randInt(-60, 60))
        events.push({
          _id: new ObjectId(),
          childId: new ObjectId(TARGET_CHILD_ID),
          parentId,
          eventType: 'extra_activities',
          startTime: actTime.toISOString(),
          activityDescription: 'Parque y juegos',
          activityDuration: randInt(45, 90),
          activityImpact: 'positive',
          activityNotes: 'Mucho juego al aire libre',
          emotionalState: emo(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      }

      if (day === 15) {
        const medTime = dtLocal(2025, 8, day, 9, 0)
        medTime.setMinutes(medTime.getMinutes() + randInt(-10, 10))
        events.push({
          _id: new ObjectId(),
          childId: new ObjectId(TARGET_CHILD_ID),
          parentId,
          eventType: 'medication',
          startTime: medTime.toISOString(),
          medicationName: 'Ibuprofeno',
          medicationDose: '5ml',
          medicationTime: medTime.toISOString(),
          medicationNotes: 'Fiebre leve',
          emotionalState: emo(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      }
    }

    console.log(`Preparando inserción de ${events.length} eventos...`)
    if (events.length === 0) {
      console.log('No hay eventos para insertar.')
      return
    }

    const insertResult = await eventsCol.insertMany(events, { ordered: false })
    console.log(`🎉 Insertados ${insertResult.insertedCount} eventos en agosto 2025 para ${child.firstName}.`)
    const totalCount = await eventsCol.countDocuments({ childId: new ObjectId(TARGET_CHILD_ID) })
    console.log(`📈 Total de eventos del niño ahora: ${totalCount}`)
  } catch (err) {
    console.error('❌ Error durante el seed:', err)
  } finally {
    await client.close()
    console.log('🔌 Conexión cerrada')
  }
}

main().catch((e) => { console.error('Error fatal:', e); process.exit(1) })

