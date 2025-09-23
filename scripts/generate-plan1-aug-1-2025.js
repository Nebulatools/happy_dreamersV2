// Genera Plan 1 (event_based) con fecha 1 agosto 2025
// Usa: Plan 0 + eventos desde Plan 0 hasta 1/08/2025 + RAG + políticas

require('dotenv').config()
const { MongoClient, ObjectId } = require('mongodb')
const { OpenAI } = require('openai')

const MONGODB_URI = process.env.MONGODB_URI
const DB_NAME = process.env.MONGODB_DB_FINAL || process.env.MONGODB_DATABASE || process.env.MONGODB_DB
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

// Parámetros por defecto (puedes sobreescribir con env)
const TARGET_CHILD_ID = process.env.SEED_CHILD_ID || '68d1af5315d0e9b1cc189544'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'mariana@admin.com'

if (!MONGODB_URI || !DB_NAME) {
  console.error('❌ Faltan variables de entorno MONGODB_URI o base de datos (MONGODB_DB_FINAL/MONGODB_DATABASE/MONGODB_DB)')
  process.exit(1)
}
if (!OPENAI_API_KEY) {
  console.error('❌ Falta OPENAI_API_KEY en el entorno')
  process.exit(1)
}

// Fecha de “generación” del plan 1 y rango de eventos considerados
const PLAN1_CREATED_AT_ISO = '2025-08-01T10:00:00.000Z'
const RANGE_TO_ISO = '2025-08-01T00:00:00.000Z' // incluir eventos hasta el inicio del día 1/08
const PLAN1_CREATED_AT = new Date(PLAN1_CREATED_AT_ISO)

function minutesBetween(a, b) { return Math.round((b.getTime() - a.getTime()) / 60000) }
function parseISO(s) { return new Date(s) }
function average(arr) { return !arr?.length ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length }
function timeToMinutes(date) { return date.getHours() * 60 + date.getMinutes() }
function formatTwo(n) { return String(n).padStart(2, '0') }

async function computeBasicStats(events) {
  const sleeps = events.filter(e => e.eventType === 'sleep' && e.startTime && e.endTime)
  const sleepDurations = []
  const wakeTimes = []
  for (const e of sleeps) {
    const start = parseISO(e.startTime)
    const end = parseISO(e.endTime)
    const delay = Math.max(0, Number(e.sleepDelay || 0))
    const actualStart = new Date(start.getTime() + delay * 60000)
    const durMin = minutesBetween(actualStart, end)
    if (durMin >= 120 && durMin <= 960) sleepDurations.push(durMin)
    wakeTimes.push(end)
  }
  const avgSleepDurationMinutes = Math.round(average(sleepDurations)) || 0
  const avgWakeTimeMinutes = wakeTimes.length ? Math.round(average(wakeTimes.map(timeToMinutes))) : 0
  return { avgSleepDurationMinutes, avgWakeTimeMinutes }
}

function derivePlanPolicyLike(ageInMonths, events) {
  const isTransitionWindow = ageInMonths != null && ageInMonths >= 15 && ageInMonths <= 18
  const recommendedStep = isTransitionWindow ? 10 : 30
  const napLine = isTransitionWindow
    ? `Transición 2→1 siestas (15–18 meses): cambios de ${Math.max(10, Math.min(15, recommendedStep))} min cada 3–4 días.`
    : `Ajustes generales: puedes mover bloques de ${recommendedStep} min si el niño lo tolera.`
  const weekAgo = new Date(PLAN1_CREATED_AT.getTime() - 7 * 24 * 60 * 60 * 1000)
  const hasRecentNightFeeding = events.some(e => e.eventType === 'night_feeding' && e.startTime && parseISO(e.startTime) >= weekAgo && parseISO(e.startTime) <= PLAN1_CREATED_AT)
  const nightLine = hasRecentNightFeeding
    ? `Destete nocturno activo: mover toma 15 min más temprano y aumentar ~1 oz cada 3 días.`
    : `Si no hay tomas nocturnas recientes, no incluir destete.`
  return `POLÍTICAS Y LÍMITES DE AJUSTE (OBLIGATORIO RESPETAR):\n- ${napLine}\n- ${nightLine}`
}

async function ragSearch(db, openai, ageInMonths) {
  const queries = [
    `rutina de sueño para niños de ${ageInMonths} meses`,
    'horarios de comida infantil',
    'siestas apropiadas por edad',
    'rutinas de acostarse',
  ]
  const collection = db.collection('vector_documents')
  const uniqueBySource = new Map()
  for (const q of queries) {
    const embedding = await openai.embeddings.create({ model: 'text-embedding-3-large', input: q })
    const queryEmbedding = embedding.data[0].embedding
    const pipeline = [
      { $addFields: { similarity: { $let: { vars: { dotProduct: { $reduce: { input: { $range: [0, { $size: '$embedding' }] }, initialValue: 0, in: { $add: ['$$value', { $multiply: [ { $arrayElemAt: ['$embedding', '$$this'] }, { $arrayElemAt: [queryEmbedding, '$$this'] } ] }] } } } }, in: '$$dotProduct' } } } },
      { $sort: { similarity: -1 } },
      { $limit: 2 },
    ]
    const results = await collection.aggregate(pipeline).toArray()
    for (const doc of results) {
      const source = doc.metadata?.source || 'documento'
      if (!uniqueBySource.has(source)) uniqueBySource.set(source, { source, content: doc.content })
      if (uniqueBySource.size >= 6) break
    }
  }
  return Array.from(uniqueBySource.values())
}

function avgMinutesFromDates(dates, { nocturnal = false } = {}) {
  if (!dates.length) return 0
  const mins = dates.map(d => {
    let m = d.getHours() * 60 + d.getMinutes()
    if (nocturnal && d.getHours() <= 6) m += 24 * 60
    return m
  })
  const avg = Math.round(average(mins))
  return avg % (24 * 60)
}

function minutesToHHMM(mins) {
  const h = Math.floor(mins / 60) % 24
  const m = mins % 60
  return `${formatTwo(h)}:${formatTwo(m)}`
}

function computeNapStats(events) {
  const naps = events.filter(e => e.eventType === 'nap' && e.startTime && e.endTime)
  if (!naps.length) return { count: 0, avgDuration: 0, typicalTime: null }
  const starts = naps.map(e => new Date(e.startTime))
  const durations = naps.map(e => minutesBetween(new Date(e.startTime), new Date(e.endTime)))
  const avgDur = Math.round(average(durations))
  const typicalMin = avgMinutesFromDates(starts)
  return { count: naps.length, avgDuration: avgDur, typicalTime: minutesToHHMM(typicalMin) }
}

function computeBedtimeStats(events) {
  const sleeps = events.filter(e => e.eventType === 'sleep' && e.startTime)
  if (!sleeps.length) return { avgBedtime: null }
  const starts = sleeps.map(e => new Date(e.startTime))
  const typicalMin = avgMinutesFromDates(starts, { nocturnal: true })
  return { avgBedtime: minutesToHHMM(typicalMin) }
}

function computeFeedingTypicalTimes(events) {
  const fed = events.filter(e => e.eventType === 'feeding' && e.startTime)
  const buckets = {
    breakfast: { from: 6 * 60, to: 10 * 60, times: [] },
    lunch: { from: 11 * 60, to: 14 * 60, times: [] },
    snack: { from: 15 * 60, to: 17 * 60, times: [] },
    dinner: { from: 18 * 60, to: 20 * 60 + 59, times: [] },
  }
  for (const e of fed) {
    const d = new Date(e.startTime)
    const m = d.getHours() * 60 + d.getMinutes()
    for (const key of Object.keys(buckets)) {
      const b = buckets[key]
      if (m >= b.from && m <= b.to) { b.times.push(d); break }
    }
  }
  const result = {}
  for (const key of Object.keys(buckets)) {
    const arr = buckets[key].times
    result[key] = arr.length ? minutesToHHMM(avgMinutesFromDates(arr)) : null
    result[key + 'Count'] = arr.length
  }
  return result
}

async function main() {
  const client = new MongoClient(MONGODB_URI)
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY })
  console.log('Conectando a MongoDB...')
  await client.connect()
  console.log('✅ Conectado')
  const db = client.db(DB_NAME)

  try {
    // 1) Admin
    const admin = await db.collection('users').findOne({ email: ADMIN_EMAIL.toLowerCase() })
    if (!admin) { console.error(`❌ Admin no encontrado: ${ADMIN_EMAIL}`); process.exit(1) }
    if (admin.role !== 'admin') { console.error(`❌ Usuario no es admin. role=${admin.role}`); process.exit(1) }

    // 2) Niño y owner real
    const child = await db.collection('children').findOne({ _id: new ObjectId(TARGET_CHILD_ID) })
    if (!child) { console.error(`❌ Niño no encontrado: ${TARGET_CHILD_ID}`); process.exit(1) }
    const effectiveUserId = child.parentId
    if (!effectiveUserId) { console.error('❌ Niño sin parentId asignado'); process.exit(1) }

    // 3) Plan 0 existente
    const plan0 = await db.collection('child_plans').findOne({ childId: new ObjectId(TARGET_CHILD_ID), userId: new ObjectId(effectiveUserId), planNumber: 0 })
    if (!plan0) { console.error('❌ No existe Plan 0 para este niño/owner'); process.exit(1) }

    const fromDate = new Date(plan0.createdAt)
    const toDate = new Date(RANGE_TO_ISO)

    // 4) Eventos desde Plan 0 hasta 1/08
    const newEvents = await db.collection('events')
      .find({ childId: new ObjectId(TARGET_CHILD_ID), startTime: { $gt: fromDate.toISOString(), $lt: toDate.toISOString() } })
      .sort({ startTime: 1 })
      .toArray()

    if (!newEvents.length) { console.error('❌ No hay eventos nuevos desde el Plan 0 para generar Plan 1'); process.exit(1) }
    console.log(`📊 Eventos nuevos (desde ${fromDate.toISOString()} hasta ${toDate.toISOString()}): ${newEvents.length}`)

    // 5) Edad en meses al 1/08/2025
    const birthDate = child.birthDate ? new Date(child.birthDate) : null
    const ageInMonths = birthDate ? Math.floor((PLAN1_CREATED_AT.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)) : null

    // 6) Stats de eventos nuevos
    const { avgSleepDurationMinutes, avgWakeTimeMinutes } = await computeBasicStats(newEvents)
    const napStats = computeNapStats(newEvents)
    const bedtimeStats = computeBedtimeStats(newEvents)
    const feedingStats = computeFeedingTypicalTimes(newEvents)
    console.log(`   avgSleepDurationMinutes=${avgSleepDurationMinutes}  avgWakeTimeMinutes=${avgWakeTimeMinutes}`)
    console.log('   napStats=', napStats, 'bedtimeStats=', bedtimeStats, 'feedingStats=', feedingStats)

    // 7) RAG
    const ragContext = await ragSearch(db, openai, ageInMonths || 0)
    console.log(`📚 RAG fuentes únicas: ${ragContext.length}`)

    // 8) Políticas
    const policyText = derivePlanPolicyLike(ageInMonths, newEvents)

    // 9) Prompt de IA (event_based)
    const ragBlock = ragContext.length
      ? `\nCONOCIMIENTO ESPECIALIZADO ACTUALIZADO:\n${ragContext.map(doc => `Fuente: ${doc.source}\nContenido: ${doc.content}`).join("\n\n---\n\n")}\n`
      : ''
    const wakeHH = Math.floor((avgWakeTimeMinutes || 0) / 60)
    const wakeMM = formatTwo((avgWakeTimeMinutes || 0) % 60)

    const systemPrompt = `Eres la Dra. Mariana, especialista en pediatría y desarrollo infantil.\n\nCRÍTICO: Tu respuesta DEBE ser únicamente un objeto JSON válido, sin texto adicional.\n\nGENERA PLAN DE PROGRESIÓN basado en EVENTOS REALES registrados para ${child.firstName}.\n\nPLAN ANTERIOR (COMO BASE):\n${JSON.stringify(plan0?.schedule || {}, null, 2)}\n\nANÁLISIS DE EVENTOS RECIENTES (${newEvents.length} eventos):\n- Período analizado: ${fromDate.toISOString()} a ${toDate.toISOString()}\n- Duración promedio de sueño: ${avgSleepDurationMinutes} minutos\n- Hora promedio de despertar: ${wakeHH}:${wakeMM}\n- Siestas: total=${napStats.count}, hora típica=${napStats.typicalTime || 'N/A'}, duración prom=${napStats.avgDuration} min\n- Hora media de acostarse (bedtime) observada: ${bedtimeStats.avgBedtime || 'N/A'}\n- Comidas típicas (si existen eventos en el período):\n  - desayuno=${feedingStats.breakfast || 'N/A'} (n=${feedingStats.breakfastCount})\n  - almuerzo=${feedingStats.lunch || 'N/A'} (n=${feedingStats.lunchCount})\n  - merienda=${feedingStats.snack || 'N/A'} (n=${feedingStats.snackCount})\n  - cena=${feedingStats.dinner || 'N/A'} (n=${feedingStats.dinnerCount})\n${ragBlock}\nINSTRUCCIONES PARA PROGRESIÓN:\n1. 🎯 PRIORIDAD: Utiliza el PLAN ANTERIOR como base sólida\n2. 📊 AJUSTA según los PATRONES REALES observados en los eventos\n3. ✨ EVOLUCIONA el plan manteniendo coherencia con el anterior\n4. 📈 IDENTIFICA mejoras basadas en el comportamiento real del niño\n5. 🔧 OPTIMIZA horarios según los datos reales registrados\n6. Si hay ≥1 siesta en el período (napStats.count>0), DEBES incluir al menos 1 siesta, con hora cercana a ${napStats.typicalTime || '14:00'} y duración ~${Math.max(60, Math.min(120, napStats.avgDuration || 90))} min.\n7. Para comidas, SI NO hay eventos en una categoría (n=0), no inventes horarios; puedes omitirla o marcarla como opcional.\n\nFORMATO DE RESPUESTA OBLIGATORIO (JSON únicamente):\n{\n  \"schedule\": {\n    \"bedtime\": \"${bedtimeStats.avgBedtime || '20:00'}\",\n    \"wakeTime\": \"${wakeHH}:${wakeMM}\", \n    \"meals\": [...],\n    \"activities\": [],\n    \"naps\": [...]\n  },\n  \"objectives\": [\n    \"Objetivo basado en progresión real observada\"\n  ],\n  \"recommendations\": [\n    \"Recomendación basada en patrones de eventos reales\"\n  ],\n  \"progressAnalysis\": \"Análisis de cómo el niño ha progresado desde el plan anterior\"\n}`

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'system', content: policyText },
      { role: 'user', content: 'Genera el plan detallado siguiendo exactamente el formato JSON especificado.' },
    ]

    let aiPlan
    try {
      const completion = await openai.chat.completions.create({ model: 'gpt-4', messages, max_tokens: 2000, temperature: 0.7 })
      let content = completion.choices?.[0]?.message?.content || ''
      content = content.trim()
      if (!content.startsWith('{')) { const m = content.match(/\{[\s\S]*\}/); if (m) content = m[0] }
      aiPlan = JSON.parse(content)
    } catch (err) {
      console.warn('⚠️ Fallback: error parseando respuesta IA, usando plan básico.', err?.message || err)
      aiPlan = {
        schedule: {
          bedtime: '20:15',
          wakeTime: '07:15',
          meals: [
            { time: '08:00', type: 'desayuno', description: 'Desayuno nutritivo ajustado' },
            { time: '12:30', type: 'almuerzo', description: 'Almuerzo balanceado' },
            { time: '16:15', type: 'merienda', description: 'Merienda ligera' },
            { time: '19:00', type: 'cena', description: 'Cena temprana' },
          ],
          activities: [],
          naps: [ { time: '14:30', duration: 75, description: 'Siesta ajustada según patrones observados' } ],
        },
        objectives: ['Optimizar horarios basados en patrones reales', 'Mejorar consistencia de sueño'],
        recommendations: ['Mantener horarios consistentes', 'Rutina relajante previa a dormir'],
        progressAnalysis: 'Ajustes basados en eventos entre julio y el corte del 1 de agosto.'
      }
    }

    // 10) Eliminar Plan 1 previo (si existiera) para reemplazar y marcar Plan 0 como superseded
    await db.collection('child_plans').deleteMany({ childId: new ObjectId(TARGET_CHILD_ID), userId: new ObjectId(effectiveUserId), planNumber: 1 })
    await db.collection('child_plans').updateOne({ _id: plan0._id }, { $set: { status: 'superseded', updatedAt: PLAN1_CREATED_AT } })

    // 11) Insertar Plan 1
    const plan1Doc = {
      childId: new ObjectId(TARGET_CHILD_ID),
      userId: new ObjectId(effectiveUserId),
      planNumber: 1,
      planVersion: '1',
      planType: 'event_based',
      title: `Plan 1 de Progresión para ${child.firstName}`,
      schedule: aiPlan.schedule,
      objectives: aiPlan.objectives,
      recommendations: aiPlan.recommendations,
      basedOn: 'events_stats_rag',
      basedOnPlan: { planId: plan0._id, planVersion: plan0.planVersion },
      eventAnalysis: {
        eventsAnalyzed: newEvents.length,
        eventTypes: [...new Set(newEvents.map(e => e.eventType))],
        dateRange: { from: fromDate, to: toDate },
        progressAnalysis: aiPlan.progressAnalysis || null,
        ragSources: ragContext.map(r => r.source),
        basePlanVersion: plan0.planVersion,
      },
      createdAt: PLAN1_CREATED_AT,
      updatedAt: PLAN1_CREATED_AT,
      createdBy: admin._id,
      status: 'active',
    }

    const result = await db.collection('child_plans').insertOne(plan1Doc)
    console.log('✅ Plan 1 insertado:', result.insertedId.toString())
    console.log('— Resumen —')
    console.log('Período eventos:', fromDate.toISOString(), '→', toDate.toISOString())
    console.log('Eventos nuevos:', newEvents.length)
    console.log('RAG fuentes:', plan1Doc.eventAnalysis.ragSources)
    console.log('Fecha plan:', PLAN1_CREATED_AT_ISO)
  } catch (err) {
    console.error('❌ Error generando Plan 1:', err)
    process.exit(1)
  } finally {
    await client.close()
    console.log('🔌 Conexión cerrada')
  }
}

main().catch((e) => { console.error('Error fatal:', e); process.exit(1) })
