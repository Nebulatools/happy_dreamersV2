// Genera Plan 0 (initial) con fecha 1 julio 2025
// Usa: survey + estadísticas históricas (junio ya poblado) + RAG (MongoDB vector store) + políticas

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

// Fecha de “generación” del plan 0
const PLAN_DATE_ISO = '2025-07-01T10:00:00.000Z'
const PLAN_DATE = new Date(PLAN_DATE_ISO)

function minutesBetween(a, b) {
  return Math.round((b.getTime() - a.getTime()) / 60000)
}

function parseISO(s) {
  return new Date(s)
}

function average(arr) {
  if (!arr || arr.length === 0) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function timeToMinutes(date) {
  return date.getHours() * 60 + date.getMinutes()
}

function formatTwo(n) { return String(n).padStart(2, '0') }

async function computeBasicStats(events) {
  // Duración promedio del sueño nocturno (eventType === 'sleep') usando sleepDelay
  const sleeps = events.filter(e => e.eventType === 'sleep' && e.startTime && e.endTime)
  const sleepDurations = []
  const wakeTimes = []

  for (const e of sleeps) {
    const start = parseISO(e.startTime)
    const end = parseISO(e.endTime)
    const delay = Math.max(0, Number(e.sleepDelay || 0))
    const actualStart = new Date(start.getTime() + delay * 60000)
    const durMin = minutesBetween(actualStart, end)
    // Filtro razonable 2–16h
    if (durMin >= 120 && durMin <= 960) {
      sleepDurations.push(durMin)
    }
    wakeTimes.push(end)
  }

  const avgSleepDurationMinutes = Math.round(average(sleepDurations)) || 0

  // Hora promedio de despertar (promedio de endTime de sleeps)
  if (wakeTimes.length === 0) {
    return { avgSleepDurationMinutes: 0, avgWakeTimeMinutes: 0 }
  }
  const wakeMinutes = wakeTimes.map(timeToMinutes)
  const avgWakeTimeMinutes = Math.round(average(wakeMinutes))
  return { avgSleepDurationMinutes, avgWakeTimeMinutes }
}

function derivePlanPolicyLike(ageInMonths, events) {
  // Ventana de transición 2→1 siestas (15–18 meses)
  const isTransitionWindow = ageInMonths != null && ageInMonths >= 15 && ageInMonths <= 18
  const recommendedStep = isTransitionWindow ? 10 : 30
  const napLine = isTransitionWindow
    ? `Transición 2→1 siestas (15–18 meses): cambios de ${Math.max(10, Math.min(15, recommendedStep))} min cada 3–4 días.`
    : `Ajustes generales: puedes mover bloques de ${recommendedStep} min si el niño lo tolera.`

  // Destete nocturno si hay night_feeding en últimos 7 días respecto a PLAN_DATE
  const weekAgo = new Date(PLAN_DATE.getTime() - 7 * 24 * 60 * 60 * 1000)
  const hasRecentNightFeeding = events.some(e => {
    if (e.eventType !== 'night_feeding' || !e.startTime) return false
    const dt = parseISO(e.startTime)
    return dt >= weekAgo && dt <= PLAN_DATE
  })
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
    // Embedding de la query
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: q,
    })
    const queryEmbedding = embedding.data[0].embedding

    // Agregación estilo vector-store-mongodb.ts (dot product)
    const pipeline = [
      {
        $addFields: {
          similarity: {
            $let: {
              vars: {
                dotProduct: {
                  $reduce: {
                    input: { $range: [0, { $size: '$embedding' }] },
                    initialValue: 0,
                    in: {
                      $add: [
                        '$$value',
                        {
                          $multiply: [
                            { $arrayElemAt: ['$embedding', '$$this'] },
                            { $arrayElemAt: [queryEmbedding, '$$this'] },
                          ],
                        },
                      ],
                    },
                  },
                },
              },
              in: '$$dotProduct',
            },
          },
        },
      },
      { $sort: { similarity: -1 } },
      { $limit: 2 },
    ]

    const results = await collection.aggregate(pipeline).toArray()
    for (const doc of results) {
      const source = doc.metadata?.source || 'documento'
      if (!uniqueBySource.has(source)) {
        uniqueBySource.set(source, {
          source,
          content: doc.content,
        })
      }
      if (uniqueBySource.size >= 6) break
    }
  }

  return Array.from(uniqueBySource.values())
}

function average(arr) {
  if (!arr || arr.length === 0) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
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
    // 1) Resolver admin y validar rol
    const admin = await db.collection('users').findOne({ email: ADMIN_EMAIL.toLowerCase() })
    if (!admin) {
      console.error(`❌ Admin no encontrado por email: ${ADMIN_EMAIL}`)
      process.exit(1)
    }
    if (admin.role !== 'admin') {
      console.error(`❌ Usuario ${ADMIN_EMAIL} no es admin. role=${admin.role}`)
      process.exit(1)
    }

    // 2) Resolver niño y owner real
    const child = await db.collection('children').findOne({ _id: new ObjectId(TARGET_CHILD_ID) })
    if (!child) {
      console.error(`❌ Niño no encontrado con ID: ${TARGET_CHILD_ID}`)
      process.exit(1)
    }
    const effectiveUserId = child.parentId
    if (!effectiveUserId) {
      console.error('❌ Niño sin parentId asignado')
      process.exit(1)
    }

    // 3) Continuar aunque exista Plan 0 (actualizaremos al final)

    // 4) Cargar eventos de toda la historia (Plan 0 usa todo el histórico)
    const events = await db.collection('events')
      .find({ childId: new ObjectId(TARGET_CHILD_ID) })
      .sort({ startTime: -1 })
      .toArray()

    console.log(`📊 Eventos totales disponibles: ${events.length}`)
    if (events.length === 0) {
      console.error('❌ No hay eventos para calcular estadísticas')
      process.exit(1)
    }

    // 5) Edad en meses al 1 de julio 2025
    const birthDate = child.birthDate ? new Date(child.birthDate) : null
    const ageInMonths = birthDate
      ? Math.floor((PLAN_DATE.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
      : null

    // 6) Estadísticas necesarias para el prompt (histórico completo)
    const { avgSleepDurationMinutes, avgWakeTimeMinutes } = await computeBasicStats(events)
    const napStats = computeNapStats(events)
    const bedtimeStats = computeBedtimeStats(events)
    const feedingStats = computeFeedingTypicalTimes(events)
    console.log(`   avgSleepDurationMinutes=${avgSleepDurationMinutes}  avgWakeTimeMinutes=${avgWakeTimeMinutes}`)
    console.log('   napStats=', napStats, 'bedtimeStats=', bedtimeStats, 'feedingStats=', feedingStats)

    // 7) RAG (MongoDB vector)
    const ragContext = await ragSearch(db, openai, ageInMonths || 0)
    console.log(`📚 RAG fuentes únicas: ${ragContext.length}`)

    // 8) Políticas de ajuste
    const policyText = derivePlanPolicyLike(ageInMonths, events)

    // 9) Prompt de IA (alineado con generatePlanWithAI para planType=initial)
    const ragBlock = ragContext.length
      ? `\nCONOCIMIENTO ESPECIALIZADO:\n${ragContext.map(doc => `Fuente: ${doc.source}\nContenido: ${doc.content}`).join("\n\n---\n\n")}\n`
      : ''

    const surveyData = child.surveyData || null
    const surveyBlock = surveyData ? `\nDATOS DEL CUESTIONARIO:\n- Rutina antes de acostarse: ${surveyData.rutinaHabitos?.rutinaAntesAcostarse}\n- Hora específica de dormir: ${surveyData.rutinaHabitos?.horaDormir}\n- Hace siestas: ${surveyData.rutinaHabitos?.haceSiestas ? 'Sí' : 'No'}\n- Donde duerme: ${surveyData.rutinaHabitos?.dondeDuermeNoche}\n` : ''

    const wakeHH = Math.floor((avgWakeTimeMinutes || 0) / 60)
    const wakeMM = formatTwo((avgWakeTimeMinutes || 0) % 60)

    const systemPrompt = `Eres la Dra. Mariana, especialista en pediatría y desarrollo infantil.\n\nCRÍTICO: Tu respuesta DEBE ser únicamente un objeto JSON válido, sin texto adicional.\n\nGenera un PLAN DETALLADO Y ESTRUCTURADO para ${child.firstName} (${ageInMonths} meses).\n\nINFORMACIÓN DEL NIÑO (histórico):\n- Eventos totales registrados: ${events.length}\n- Sueño nocturno (promedio): ${avgSleepDurationMinutes} minutos\n- Hora promedio de despertar: ${wakeHH}:${wakeMM}\n- Hora media de acostarse observada: ${bedtimeStats.avgBedtime || 'N/A'}\n- Siestas: total=${napStats.count}, hora típica=${napStats.typicalTime || 'N/A'}, duración prom=${napStats.avgDuration} min\n- Comidas típicas (si existen eventos en la categoría):\n  - desayuno=${feedingStats.breakfast || 'N/A'} (n=${feedingStats.breakfastCount})\n  - almuerzo=${feedingStats.lunch || 'N/A'} (n=${feedingStats.lunchCount})\n  - merienda=${feedingStats.snack || 'N/A'} (n=${feedingStats.snackCount})\n  - cena=${feedingStats.dinner || 'N/A'} (n=${feedingStats.dinnerCount})\n${surveyBlock}${ragBlock}\nINSTRUCCIONES:\n1. Crea un plan DETALLADO con horarios específicos\n2. Incluye horarios para: dormir, despertar, comidas y siestas (NO incluir actividades)\n3. Si hubo siestas registradas (napStats.count>0), incluye al menos 1 siesta, cercana a ${napStats.typicalTime || '14:00'} y duración ~${Math.max(60, Math.min(120, napStats.avgDuration || 90))} min\n4. Para comidas, si no hubo eventos en una categoría (n=0), no inventar horarios\n5. Adapta las recomendaciones a la edad del niño\n6. Proporciona objetivos claros y medibles\n\nFORMATO DE RESPUESTA OBLIGATORIO (JSON únicamente):\n{\n  \"schedule\": {\n    \"bedtime\": \"${bedtimeStats.avgBedtime || '20:30'}\",\n    \"wakeTime\": \"${wakeHH}:${wakeMM}\",\n    \"meals\": [...],\n    \"activities\": [],\n    \"naps\": [...]\n  },\n  \"objectives\": [\n    \"Objetivo 1 específico y medible\",\n    \"Objetivo 2 específico y medible\"\n  ],\n  \"recommendations\": [\n    \"Recomendación 1 específica\",\n    \"Recomendación 2 específica\"\n  ]\n}`

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'system', content: policyText },
      { role: 'user', content: 'Genera el plan detallado siguiendo exactamente el formato JSON especificado.' },
    ]

    // 10) Llamada a IA y parseo robusto
    let aiPlan
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages,
        max_tokens: 2000,
        temperature: 0.7,
      })
      let content = completion.choices?.[0]?.message?.content || ''
      content = content.trim()
      if (!content.startsWith('{')) {
        const m = content.match(/\{[\s\S]*\}/)
        if (m) content = m[0]
      }
      aiPlan = JSON.parse(content)
    } catch (err) {
      console.warn('⚠️ Fallback: error parseando respuesta IA, usando plan básico.', err?.message || err)
      aiPlan = {
        schedule: {
          bedtime: '20:30',
          wakeTime: '07:00',
          meals: [
            { time: '07:30', type: 'desayuno', description: 'Desayuno nutritivo' },
            { time: '12:00', type: 'almuerzo', description: 'Almuerzo balanceado' },
            { time: '16:00', type: 'merienda', description: 'Merienda ligera' },
            { time: '19:00', type: 'cena', description: 'Cena temprana' },
          ],
          activities: [],
          naps: [ { time: '14:00', duration: 90, description: 'Siesta vespertina' } ],
        },
        objectives: ['Establecer rutina de sueño consistente', 'Mejorar calidad del descanso'],
        recommendations: ['Mantener horarios fijos', 'Crear ambiente propicio para dormir'],
      }
    }

    // 11) Construir documento del plan
    const planDoc = {
      childId: new ObjectId(TARGET_CHILD_ID),
      userId: new ObjectId(effectiveUserId),
      planNumber: 0,
      planVersion: '0',
      planType: 'initial',
      title: `Plan Inicial para ${child.firstName}`,
      schedule: aiPlan.schedule,
      objectives: aiPlan.objectives,
      recommendations: aiPlan.recommendations,
      basedOn: 'survey_stats_rag',
      sourceData: {
        surveyDataUsed: !!child.surveyData,
        childStatsUsed: true,
        ragSources: ragContext.map(r => r.source),
        ageInMonths: Math.max(0, ageInMonths || 0),
        totalEvents: events.length,
        stats: {
          avgSleepDurationMinutes,
          avgWakeTimeMinutes,
          bedtimeAvg: bedtimeStats.avgBedtime || null,
          napCount: napStats.count,
          napTypicalTime: napStats.typicalTime,
          napAvgDuration: napStats.avgDuration,
          feedingTypical: {
            breakfast: feedingStats.breakfast,
            breakfastCount: feedingStats.breakfastCount,
            lunch: feedingStats.lunch,
            lunchCount: feedingStats.lunchCount,
            snack: feedingStats.snack,
            snackCount: feedingStats.snackCount,
            dinner: feedingStats.dinner,
            dinnerCount: feedingStats.dinnerCount,
          }
        }
      },
      createdAt: PLAN_DATE,
      updatedAt: PLAN_DATE,
      createdBy: admin._id,
      status: 'active',
    }

    // 12) Insertar o actualizar Plan 0
    const existingPlan0 = await db.collection('child_plans').findOne({ childId: new ObjectId(TARGET_CHILD_ID), userId: new ObjectId(effectiveUserId), planNumber: 0 })
    if (existingPlan0) {
      await db.collection('child_plans').updateOne(
        { _id: existingPlan0._id },
        { $set: { 
            schedule: planDoc.schedule,
            objectives: planDoc.objectives,
            recommendations: planDoc.recommendations,
            basedOn: planDoc.basedOn,
            sourceData: planDoc.sourceData,
            updatedAt: PLAN_DATE,
          } }
      )
      console.log('✅ Plan 0 actualizado:', existingPlan0._id.toString())
    } else {
      const result = await db.collection('child_plans').insertOne(planDoc)
      console.log('✅ Plan 0 insertado:', result.insertedId.toString())
    }

    // 13) Resumen
    console.log('— Resumen de generación —')
    console.log('Niño:', child.firstName)
    console.log('Edad (m):', Math.max(0, ageInMonths || 0))
    console.log('RAG fuentes:', planDoc.sourceData.ragSources)
    console.log('Stats: avgSleepDurationMinutes=', avgSleepDurationMinutes, ' avgWakeTimeMinutes=', avgWakeTimeMinutes)
    console.log('      bedtimeAvg=', planDoc.sourceData.stats.bedtimeAvg, ' nap=', planDoc.sourceData.stats.napCount, '@', planDoc.sourceData.stats.napTypicalTime, `(${planDoc.sourceData.stats.napAvgDuration} min)`) 
    console.log('      feeding typical:', planDoc.sourceData.stats.feedingTypical)
    console.log('Fecha plan:', PLAN_DATE_ISO)
  } catch (err) {
    console.error('❌ Error generando Plan 0:', err)
    process.exit(1)
  } finally {
    await client.close()
    console.log('🔌 Conexión cerrada')
  }
}

main().catch((e) => {
  console.error('Error fatal:', e)
  process.exit(1)
})
