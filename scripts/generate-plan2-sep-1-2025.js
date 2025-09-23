// Genera Plan 2 (event_based) con fecha 1 septiembre 2025
// Usa: Plan 1.1 como base (schedule) + eventos desde 1.1 hasta 1/09/2025 + RAG/Políticas (fallback si IA indisponible)

require('dotenv').config()
const { MongoClient, ObjectId } = require('mongodb')
const { OpenAI } = require('openai')

const MONGODB_URI = process.env.MONGODB_URI
const DB_NAME = process.env.MONGODB_DB_FINAL || process.env.MONGODB_DATABASE || process.env.MONGODB_DB
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

const TARGET_CHILD_ID = process.env.SEED_CHILD_ID || '68d1af5315d0e9b1cc189544'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'mariana@admin.com'

// Fechas fijas de la corrida
const PLAN2_CREATED_AT_ISO = '2025-09-01T10:00:00.000Z'
const RANGE_TO_ISO = '2025-09-01T00:00:00.000Z' // eventos hasta inicio del día 1/09
const PLAN2_CREATED_AT = new Date(PLAN2_CREATED_AT_ISO)

if (!MONGODB_URI || !DB_NAME) {
  console.error('❌ Faltan variables de entorno MONGODB_URI o base de datos (MONGODB_DB_FINAL/MONGODB_DATABASE/MONGODB_DB)')
  process.exit(1)
}

// Utils
function minutesBetween(a, b) { return Math.round((b.getTime() - a.getTime()) / 60000) }
function average(arr) { return !arr?.length ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length }
function two(n) { return String(n).padStart(2, '0') }
function minutesToHHMM(mins) { if (mins == null) return null; const h = Math.floor(mins/60)%24, m = mins%60; return `${two(h)}:${two(m)}` }
function avgMinutesFromDates(dates, nocturnal=false) { if (!dates.length) return null; const mins=dates.map(d=>{let m=d.getHours()*60+d.getMinutes(); if(nocturnal && d.getHours()<=6) m+=1440; return m}); const avg=Math.round(average(mins)); return avg%1440 }

function computeNapStats(events) {
  const naps = (events||[]).filter(e=>e.eventType==='nap' && e.startTime && e.endTime)
  if (!naps.length) return { count:0, avgDuration:0, typicalTime:null }
  const starts = naps.map(e=>new Date(e.startTime))
  const durs = naps.map(e=>minutesBetween(new Date(e.startTime), new Date(e.endTime)))
  return { count:naps.length, avgDuration:Math.round(average(durs)), typicalTime: minutesToHHMM(avgMinutesFromDates(starts,false)) }
}
function computeBedtimeStats(events) {
  const sleeps = (events||[]).filter(e=>e.eventType==='sleep' && e.startTime)
  if (!sleeps.length) return { avgBedtime:null }
  const starts = sleeps.map(e=>new Date(e.startTime))
  return { avgBedtime: minutesToHHMM(avgMinutesFromDates(starts,true)) }
}
function computeFeedingTypicalTimes(events) {
  const fed=(events||[]).filter(e=>e.eventType==='feeding' && e.startTime)
  const buckets={
    breakfast:{from:6*60,to:10*60,times:[]},
    lunch:{from:11*60,to:14*60,times:[]},
    snack:{from:15*60,to:17*60,times:[]},
    dinner:{from:18*60,to:20*60+59,times:[]},
  }
  for (const e of fed){ const d=new Date(e.startTime); const m=d.getHours()*60+d.getMinutes(); for (const k of Object.keys(buckets)){const b=buckets[k]; if(m>=b.from && m<=b.to){b.times.push(d); break} } }
  const out={}
  for (const k of Object.keys(buckets)){ const arr=buckets[k].times; const avg=avgMinutesFromDates(arr,false); out[k]=arr.length?minutesToHHMM(avg):null; out[k+'Count']=arr.length }
  return out
}

async function main(){
  const client = new MongoClient(MONGODB_URI)
  console.log('Conectando a MongoDB...')
  await client.connect()
  console.log('✅ Conectado')
  const db = client.db(DB_NAME)
  const users = db.collection('users')
  const children = db.collection('children')
  const plans = db.collection('child_plans')
  const eventsCol = db.collection('events')

  const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null

  try {
    const admin = await users.findOne({ email: ADMIN_EMAIL.toLowerCase() })
    if (!admin) throw new Error(`Admin no encontrado: ${ADMIN_EMAIL}`)
    const child = await children.findOne({ _id: new ObjectId(TARGET_CHILD_ID) })
    if (!child) throw new Error(`Niño no encontrado: ${TARGET_CHILD_ID}`)
    const effectiveUserId = child.parentId || child.userId || admin._id

    // Base más reciente (incluye refinamientos) → Plan 1.1
    const baseLatest = await plans.find({ childId: new ObjectId(TARGET_CHILD_ID), userId: new ObjectId(effectiveUserId) })
      .sort({ createdAt: -1 }).limit(1).toArray()
    if (!baseLatest.length) throw new Error('No hay planes previos (se requiere al menos el Plan 1.1)')
    const basePlan = baseLatest[0]

    // Ventana de eventos: desde baseLatest.createdAt → 1/09/2025 00:00Z
    const fromDate = new Date(basePlan.createdAt)
    const toDate = new Date(RANGE_TO_ISO)
    if (!(fromDate < toDate)) throw new Error('Rango inválido: fromDate >= toDate')

    // Recolectar eventos
    const newEvents = await eventsCol.find({
      childId: new ObjectId(TARGET_CHILD_ID),
      startTime: { $gt: fromDate.toISOString(), $lte: toDate.toISOString() }
    }).sort({ startTime: 1 }).toArray()
    if (newEvents.length === 0) throw new Error('No hay eventos nuevos entre 1.1 y 2 (hasta 1/09)')
    console.log(`📊 Eventos nuevos (desde ${fromDate.toISOString()} hasta ${toDate.toISOString()}): ${newEvents.length}`)

    // Estadísticas enriquecidas
    const napStats = computeNapStats(newEvents)
    const bedtimeStats = computeBedtimeStats(newEvents)
    const feedingStats = computeFeedingTypicalTimes(newEvents)

    // IA: generar plan basado en basePlan.schedule y stats (fallback si no hay OpenAI)
    let aiPlan
    if (openai) {
      const systemPrompt = `Eres la Dra. Mariana. Responde SOLO JSON.\n\nPLAN ANTERIOR (BASE):\n${JSON.stringify(basePlan.schedule, null, 2)}\n\nDATOS REALES DEL PERÍODO (${newEvents.length} eventos):\n- Período: ${fromDate.toISOString()} → ${toDate.toISOString()}\n- Bedtime típico: ${bedtimeStats.avgBedtime || 'N/A'}\n- Siesta: total=${napStats.count}, hora típica=${napStats.typicalTime || 'N/A'}, duración prom=${napStats.avgDuration} min\n- Comidas típicas: desayuno=${feedingStats.breakfast || 'N/A'} (n=${feedingStats.breakfastCount}), almuerzo=${feedingStats.lunch || 'N/A'} (n=${feedingStats.lunchCount}), merienda=${feedingStats.snack || 'N/A'} (n=${feedingStats.snackCount}), cena=${feedingStats.dinner || 'N/A'} (n=${feedingStats.dinnerCount})\n\nINSTRUCCIONES:\n1) Ajusta el schedule manteniendo coherencia con el plan base.\n2) Usa los patrones observados (bedtime/wake/naps/meals).\n3) Devuelve: { schedule, objectives, recommendations, progressAnalysis }.`
      try {
        const comp = await openai.chat.completions.create({ model: 'gpt-4', messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Genera el plan de progresión como JSON válido.' }
        ], max_tokens: 2000, temperature: 0.7 })
        let content = comp.choices?.[0]?.message?.content?.trim() || ''
        if (!content.startsWith('{')) { const m = content.match(/\{[\s\S]*\}/); if (m) content = m[0] }
        aiPlan = JSON.parse(content)
      } catch (e) {
        console.warn('⚠️ IA no disponible/parse error, usando fallback simple')
      }
    }
    if (!aiPlan) {
      aiPlan = {
        schedule: {
          bedtime: bedtimeStats.avgBedtime || basePlan.schedule?.bedtime || '20:30',
          wakeTime: basePlan.schedule?.wakeTime || '07:00',
          meals: [
            { time: feedingStats.breakfast || basePlan.schedule?.meals?.[0]?.time || '08:00', type: 'desayuno', description: 'Ajustado por datos reales' },
            { time: feedingStats.lunch || '12:30', type: 'almuerzo', description: 'Ajustado por datos reales' },
            { time: feedingStats.dinner || '18:45', type: 'cena', description: 'Ajustado por datos reales' },
          ],
          activities: [],
          naps: napStats.count ? [ { time: napStats.typicalTime || '13:30', duration: Math.max(60, Math.min(120, napStats.avgDuration||90)), description: 'Siesta principal' } ] : [],
        },
        objectives: [ 'Optimizar consistencia basada en eventos recientes' ],
        recommendations: [ 'Mantener horarios coherentes con patrones observados' ],
        progressAnalysis: 'Ajustes basados en datos entre Plan 1.1 y 1/09/2025'
      }
    }

    // Eliminar Plan 2 previo si existe
    await plans.deleteMany({ childId: new ObjectId(TARGET_CHILD_ID), userId: new ObjectId(effectiveUserId), planNumber: 2 })

    // Insertar Plan 2 backdated
    const plan2Doc = {
      childId: new ObjectId(TARGET_CHILD_ID),
      userId: new ObjectId(effectiveUserId),
      planNumber: 2,
      planVersion: '2',
      planType: 'event_based',
      title: `Plan 2 para ${child.firstName} (Progresión por Eventos)`,
      schedule: aiPlan.schedule,
      objectives: aiPlan.objectives,
      recommendations: aiPlan.recommendations,
      basedOn: 'events_stats_rag',
      basedOnPlan: { planId: basePlan._id, planVersion: basePlan.planVersion },
      eventsDateRange: { fromDate: fromDate, toDate: toDate, totalEventsAnalyzed: newEvents.length },
      eventAnalysis: {
        eventsAnalyzed: newEvents.length,
        eventTypes: [...new Set(newEvents.map(e=>e.eventType))],
        progressFromPrevious: aiPlan.progressAnalysis || 'Progresión basada en eventos recientes',
        ragSources: [],
        basePlanVersion: basePlan.planVersion,
      },
      createdAt: PLAN2_CREATED_AT,
      updatedAt: PLAN2_CREATED_AT,
      createdBy: admin._id,
      status: 'active',
    }

    const insert = await plans.insertOne(plan2Doc)
    console.log('✅ Plan 2 insertado:', insert.insertedId.toString())

    // Marcar planes anteriores (<2) como superseded
    await plans.updateMany({ childId: new ObjectId(TARGET_CHILD_ID), userId: new ObjectId(effectiveUserId), planNumber: { $lt: 2 } }, { $set: { status: 'superseded', updatedAt: PLAN2_CREATED_AT } })
    console.log('📌 Planes < 2 marcados como superseded')

  } catch (err) {
    console.error('❌ Error generando Plan 2 backdated:', err)
    process.exit(1)
  } finally {
    await client.close()
    console.log('🔌 Conexión cerrada')
  }
}

main().catch((e)=>{ console.error('Error fatal:', e); process.exit(1) })

