// Script semanal para poblar eventos - CONFIGURACIÓN AL PRINCIPIO
// Solo cambiar estas fechas y ejecutar: node poblar-semanal.js

// ========================================
// 📅 CONFIGURACIÓN DE FECHAS - CAMBIAR AQUÍ
// ========================================
const FECHA_INICIO = '2025-06-01'  // Formato: YYYY-MM-DD - PRIMERA SEMANA JUNIO
const FECHA_FIN = '2025-06-07'     // Formato: YYYY-MM-DD - PRIMERA SEMANA JUNIO
const NIÑO_ESPECÍFICO = null       // null = ambos, 'Bernardo' o 'Esteban' para uno específico
const SOBRESCRIBIR = true          // true = eliminar eventos existentes, false = mantener

// ========================================
// SCRIPT - NO MODIFICAR DEBAJO DE ESTA LÍNEA
// ========================================

require('dotenv').config()
const { MongoClient, ObjectId } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI
const USER_ID = '688ce146d2d5ff9616549d86'

async function poblarSemanal() {
  try {
    console.log('📅 POBLAR EVENTOS SEMANAL')
    console.log('=========================')
    console.log(`📊 Configuración:`)
    console.log(`   Fecha inicio: ${FECHA_INICIO}`)
    console.log(`   Fecha fin: ${FECHA_FIN}`)
    console.log(`   Niño específico: ${NIÑO_ESPECÍFICO || 'Ambos'}`)
    console.log(`   Sobrescribir: ${SOBRESCRIBIR ? 'SÍ' : 'NO'}`)
    
    const client = new MongoClient(MONGODB_URI)
    await client.connect()
    console.log('✅ Conectado a MongoDB')
    
    const db = client.db()
    
    // Validar fechas
    const startDate = new Date(FECHA_INICIO + 'T00:00:00Z')
    const endDate = new Date(FECHA_FIN + 'T23:59:59Z')
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.error('❌ Fechas inválidas. Use formato YYYY-MM-DD')
      return
    }
    
    if (startDate >= endDate) {
      console.error('❌ Fecha inicio debe ser anterior a fecha fin')
      return
    }
    
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
    console.log(`⏰ Generando ${daysDiff} días de eventos`)
    
    // Buscar niños disponibles
    const availableChildren = await db.collection('children')
      .find({ parentId: USER_ID })
      .toArray()
    
    if (availableChildren.length === 0) {
      console.error('❌ No hay niños. Ejecuta primero: node crear-niños.js')
      return
    }
    
    console.log(`\n👶 Niños disponibles:`)
    availableChildren.forEach((child, i) => {
      const age = calculateAgeInMonths(child.birthDate)
      console.log(`   ${i + 1}. ${child.firstName} ${child.lastName} (${age} meses)`)
    })
    
    // Filtrar niños si se especifica uno
    let targetChildren = availableChildren
    if (NIÑO_ESPECÍFICO) {
      targetChildren = availableChildren.filter(child => 
        child.firstName.toLowerCase() === NIÑO_ESPECÍFICO.toLowerCase()
      )
      
      if (targetChildren.length === 0) {
        console.error(`❌ No se encontró niño: ${NIÑO_ESPECÍFICO}`)
        return
      }
    }
    
    console.log(`\n🎯 Procesando ${targetChildren.length} niño(s)...`)
    
    let totalEvents = 0
    const results = []
    
    // Procesar cada niño
    for (const child of targetChildren) {
      const childAge = calculateAgeInMonths(child.birthDate)
      console.log(`\n📝 ${child.firstName} ${child.lastName} (${childAge} meses)`)
      
      // Los eventos ahora se guardan en child.events (no en colección separada)
      
      // Verificar eventos existentes en el documento del niño
      const existingChildEvents = child.events || []
      const eventsInRange = existingChildEvents.filter(event => {
        const eventDate = new Date(event.startTime)
        return eventDate >= startDate && eventDate <= endDate
      })
      
      if (eventsInRange.length > 0) {
        console.log(`   ⚠️  ${eventsInRange.length} eventos existentes en el documento`)
        
        if (SOBRESCRIBIR) {
          console.log('   🔄 Eliminando eventos del documento...')
          await db.collection('children').updateOne(
            { _id: child._id },
            { 
              $pull: { 
                events: { 
                  startTime: { 
                    $gte: startDate, 
                    $lte: endDate 
                  } 
                } 
              } 
            }
          )
        } else {
          console.log('   💡 Saltando (cambia SOBRESCRIBIR = true para eliminar)')
          continue
        }
      }
      
      // Generar eventos
      const childEvents = await generateEventsForChild(
        db, child._id, child.firstName, childAge, startDate, endDate
      )
      
      totalEvents += childEvents
      results.push({
        name: `${child.firstName} ${child.lastName}`,
        age: childAge,
        events: childEvents
      })
      
      console.log(`   ✅ ${childEvents} eventos generados`)
    }
    
    // Resumen final
    console.log('\n' + '='.repeat(40))
    console.log('🎉 EVENTOS GENERADOS')
    console.log('='.repeat(40))
    console.log(`📅 Período: ${FECHA_INICIO} → ${FECHA_FIN}`)
    console.log(`⏰ Días: ${daysDiff}`)
    console.log(`👶 Niños: ${results.length}`)
    console.log(`📊 Total eventos: ${totalEvents}`)
    
    results.forEach(result => {
      console.log(`   • ${result.name}: ${result.events} eventos`)
    })
    
    await client.close()
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

async function generateEventsForChild(db, childId, childName, ageInMonths, startDate, endDate) {
  const events = []
  const currentDate = new Date(startDate)
  
  // Patrones según edad
  const patterns = getAgeBasedPatterns(ageInMonths, childName)
  
  while (currentDate <= endDate) {
    const dayEvents = generateDayEvents(childId, childName, currentDate, patterns)
    events.push(...dayEvents)
    
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  // Actualizar el documento del niño con los eventos
  if (events.length > 0) {
    await db.collection('children').updateOne(
      { _id: childId },
      { 
        $push: { 
          events: { $each: events } 
        },
        $set: { updatedAt: new Date() }
      }
    )
  }
  
  return events.length
}

function getAgeBasedPatterns(ageInMonths, childName) {
  // Patrones específicos por niño basados en sus problemas reales
  if (childName === 'Bernardo') {
    // Bernardo: problemas severos de sueño, despertares cada 30 min
    return {
      sleepStart: { hour: 20, minute: 0, variance: 30 },
      wakeUp: { hour: 8, minute: 0, variance: 60 },
      napTimes: [
        { hour: 10, minute: 30, duration: 90, variance: 30 },
        { hour: 16, minute: 30, duration: 90, variance: 30 }
      ],
      feedingTimes: [
        { hour: 9, minute: 45, type: "breakfast" },
        { hour: 12, minute: 0, type: "lunch" },
        { hour: 19, minute: 15, type: "dinner" }
      ],
      nightWakings: 6, // Problema principal
      nightWakingPattern: [22, 23, 0, 1, 2, 3, 4, 5, 6],
      mood: ["cansado", "irritable", "tranquilo"],
      sleepQuality: [2, 3], // Mala calidad
      feedingType: "breast_milk", // Pecho y sólidos
      problems: ["despertares_frecuentes", "necesita_arrullo", "colecho"]
    }
  } else {
    // Esteban: problema de dependencia del chupón, mejor sueño general
    return {
      sleepStart: { hour: 20, minute: 0, variance: 45 },
      wakeUp: { hour: 7, minute: 0, variance: 60 },
      napTimes: [
        { hour: 13, minute: 45, duration: 105, variance: 15 }
      ],
      feedingTimes: [
        { hour: 7, minute: 45, type: "breakfast" },
        { hour: 13, minute: 0, type: "lunch" },
        { hour: 18, minute: 45, type: "dinner" }
      ],
      nightWakings: 2, // Menos despertares
      nightWakingPattern: [23, 2, 5],
      mood: ["feliz", "tranquilo", "irritable"],
      sleepQuality: [3, 4], // Mejor calidad
      feedingType: "solid_food", // Solo sólidos
      tantrums: 0.3, // 30% días con rabietas
      problems: ["dependencia_chupon", "rabietas_rutina", "hermana_recien_nacida"]
    }
  }
}

function generateDayEvents(childId, childName, date, patterns) {
  const events = []
  
  // 🌅 DÍA COHERENTE: Generar eventos en orden lógico temporal
  console.log(`    🗓️  Generando día coherente para ${childName}: ${date.toISOString().split('T')[0]}`)
  
  // 1. DESPERTAR MATUTINO (7-8 AM según niño)
  const wakeTime = new Date(date)
  wakeTime.setHours(
    patterns.wakeUp.hour,
    patterns.wakeUp.minute + (Math.random() - 0.5) * 30,
    0, 0
  )
  
  events.push({
    _id: new ObjectId(),
    eventType: "wake_up",
    startTime: wakeTime,
    mood: patterns.mood[Math.floor(Math.random() * patterns.mood.length)],
    quality: patterns.sleepQuality[Math.floor(Math.random() * patterns.sleepQuality.length)],
    notes: `${childName} despertó para comenzar el día`,
    createdAt: new Date()
  })
  
  // 2. DESAYUNO (30-60 min después de despertar)
  const breakfastTime = new Date(wakeTime)
  breakfastTime.setMinutes(breakfastTime.getMinutes() + 30 + Math.random() * 30)
  
  events.push({
    _id: new ObjectId(),
    eventType: "feeding",
    startTime: breakfastTime,
    feedingType: patterns.feedingType,
    duration: 15 + Math.random() * 25,
    notes: `${childName} - desayuno (${patterns.feedingType})`,
    createdAt: new Date()
  })
  
  // 3. SIESTAS SEGÚN EDAD (horarios fijos realistas)
  patterns.napTimes.forEach((nap, idx) => {
    const napStart = new Date(date)
    napStart.setHours(
      nap.hour,
      nap.minute + Math.floor((Math.random() - 0.5) * 15), // Menos varianza
      0, 0
    )
    
    // Validar horarios lógicos
    if (napStart <= breakfastTime) {
      napStart.setTime(breakfastTime.getTime() + 2 * 60 * 60 * 1000) // 2 horas después del desayuno
    }
    
    events.push({
      _id: new ObjectId(),
      eventType: "nap_start",
      startTime: napStart,
      notes: `${childName} inicio ${idx === 0 ? 'primera' : 'segunda'} siesta`,
      createdAt: new Date()
    })
    
    const napEnd = new Date(napStart)
    const napDuration = nap.duration + Math.floor((Math.random() - 0.5) * 30)
    napEnd.setMinutes(napEnd.getMinutes() + napDuration)
    
    events.push({
      _id: new ObjectId(),
      eventType: "nap_end",
      startTime: napEnd,
      notes: `${childName} fin ${idx === 0 ? 'primera' : 'segunda'} siesta (${napDuration}min)`,
      createdAt: new Date()
    })
  })
  
  // 4. COMIDAS PRINCIPALES (almuerzo y cena en horarios lógicos)
  const lunchTime = new Date(date)
  lunchTime.setHours(12, Math.random() * 30, 0, 0) // 12:00-12:30
  
  events.push({
    _id: new ObjectId(),
    eventType: "feeding",
    startTime: lunchTime,
    feedingType: patterns.feedingType,
    duration: 20 + Math.random() * 25,
    notes: `${childName} - almuerzo (comida principal)`,
    createdAt: new Date()
  })
  
  const dinnerTime = new Date(date)
  dinnerTime.setHours(18, 30 + Math.random() * 30, 0, 0) // 18:30-19:00
  
  events.push({
    _id: new ObjectId(),
    eventType: "feeding",
    startTime: dinnerTime,
    feedingType: patterns.feedingType,
    duration: 15 + Math.random() * 20,
    notes: `${childName} - cena ligera antes de rutina nocturna`,
    createdAt: new Date()
  })
  
  // 5. RUTINA NOCTURNA Y DORMIR (19:30-20:30)
  const bedtimeRoutine = new Date(date)
  bedtimeRoutine.setHours(19, 30 + Math.random() * 30, 0, 0)
  
  // Eventos especiales según niño ANTES de dormir
  if (patterns.tantrums && Math.random() < patterns.tantrums) {
    events.push({
      _id: new ObjectId(),
      eventType: "other",
      startTime: bedtimeRoutine,
      duration: 10 + Math.random() * 20,
      notes: `${childName} rabieta durante rutina - batalla pijama`,
      mood: "irritable",
      createdAt: new Date()
    })
  }
  
  const sleepTime = new Date(date)
  sleepTime.setHours(
    patterns.sleepStart.hour,
    patterns.sleepStart.minute + (Math.random() - 0.5) * 30, // Max 30 min varianza
    0, 0
  )
  
  events.push({
    _id: new ObjectId(),
    eventType: "sleep_start",
    startTime: sleepTime,
    mood: patterns.mood[Math.floor(Math.random() * patterns.mood.length)],
    notes: `${childName} se durmió después de rutina nocturna`,
    createdAt: new Date()
  })
  
  // 6. DESPERTARES NOCTURNOS (REALISTAS según problema del niño)
  const shouldHaveWakings = Math.random() < (childName === 'Bernardo' ? 0.9 : 0.4)
  if (shouldHaveWakings) {
    const numWakings = Math.floor(Math.random() * patterns.nightWakings) + 1
    
    for (let i = 0; i < numWakings; i++) {
      // Hora lógica: entre bedtime y wake up del día siguiente
      const minHour = sleepTime.getHours()
      const maxHour = minHour + 8 // Máximo 8 horas después
      const wakingHour = minHour + Math.random() * (maxHour - minHour)
      
      const waking = new Date(sleepTime)
      waking.setHours(Math.floor(wakingHour), Math.random() * 60, 0, 0)
      
      // Si pasa de medianoche, ajustar al día siguiente
      if (waking.getHours() < sleepTime.getHours()) {
        waking.setDate(waking.getDate() + 1)
      }
      
      const problem = patterns.problems[Math.floor(Math.random() * patterns.problems.length)]
      let notes = `${childName} despertar nocturno`
      if (problem === 'despertares_frecuentes') notes += ' - cada 30 min'
      if (problem === 'dependencia_chupon') notes += ' - buscando chupón'
      if (problem === 'necesita_arrullo') notes += ' - necesita arrullo'
      
      events.push({
        _id: new ObjectId(),
        eventType: "night_waking",
        startTime: waking,
        duration: 5 + Math.random() * (childName === 'Bernardo' ? 25 : 15),
        notes: notes,
        createdAt: new Date()
      })
    }
  }
  
  console.log(`    ✅ ${events.length} eventos coherentes generados`)
  return events
}

function calculateAgeInMonths(birthDateString) {
  const birthDate = new Date(birthDateString)
  const now = new Date()
  
  const years = now.getFullYear() - birthDate.getFullYear()
  const months = now.getMonth() - birthDate.getMonth()
  
  return years * 12 + months
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  poblarSemanal()
}

module.exports = { poblarSemanal }