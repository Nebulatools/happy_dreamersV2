// Script para generar datos de prueba completos - Usuario test con 10 niños y 4 meses de datos
// Ejecutar desde la raíz del proyecto: node generate-test-data.js

const { MongoClient, ObjectId } = require('mongodb')
const bcrypt = require('bcrypt')
const { addDays, format, subDays, startOfDay, addMinutes } = require('date-fns')

require('dotenv').config()
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/happy_dreamers'
const USER_ID = '688ce146d2d5ff9616549d86'

// Configuración de fechas
const END_DATE = new Date('2025-08-20')  // 20 de agosto 2025
const START_DATE = new Date('2025-04-20') // 20 de abril 2025 (4 meses)

// Datos realistas de niños
const CHILDREN_DATA = [
  {
    firstName: "Sofía",
    lastName: "González",
    birthDate: new Date('2023-03-15'), // 2 años
    gender: "female",
    sleepGoal: 12,
    napGoal: 2,
    currentHabits: ["chupete", "manta_especial"],
    temperament: "tranquilo",
    healthNotes: "Alergia leve a lactosa"
  },
  {
    firstName: "Diego",
    lastName: "Martínez", 
    birthDate: new Date('2022-11-20'), // 2.5 años
    gender: "male",
    sleepGoal: 11,
    napGoal: 1.5,
    currentHabits: ["peluche", "luz_nocturna"],
    temperament: "activo",
    healthNotes: "Muy energético, necesita mucha actividad física"
  },
  {
    firstName: "Isabella",
    lastName: "López",
    birthDate: new Date('2024-01-10'), // 1.5 años
    gender: "female", 
    sleepGoal: 13,
    napGoal: 2.5,
    currentHabits: ["biberon_nocturno", "musica_suave"],
    temperament: "sensible",
    healthNotes: "Regresión del sueño reciente"
  },
  {
    firstName: "Mateo",
    lastName: "Rodríguez",
    birthDate: new Date('2021-08-05'), // 4 años
    gender: "male",
    sleepGoal: 10,
    napGoal: 0, // Ya no hace siesta
    currentHabits: ["cuentos"],
    temperament: "independiente", 
    healthNotes: "Transición para dejar siestas"
  },
  {
    firstName: "Emma",
    lastName: "Fernández",
    birthDate: new Date('2024-06-30'), // 1 año
    gender: "female",
    sleepGoal: 14,
    napGoal: 3,
    currentHabits: ["chupete", "arrullo"],
    temperament: "tranquilo",
    healthNotes: "Bebé muy tranquila, buen dormilón"
  },
  {
    firstName: "Sebastián", 
    lastName: "Torres",
    birthDate: new Date('2023-09-12'), // 2 años
    gender: "male",
    sleepGoal: 12,
    napGoal: 2,
    currentHabits: ["peluche", "rutina_estricta"],
    temperament: "estructurado",
    healthNotes: "Necesita rutinas muy consistentes"
  },
  {
    firstName: "Valentina",
    lastName: "Ruiz", 
    birthDate: new Date('2022-04-18'), // 3 años
    gender: "female",
    sleepGoal: 11,
    napGoal: 1,
    currentHabits: ["manta_especial", "cancion"],
    temperament: "social",
    healthNotes: "Le cuesta dormir si hay ruido"
  },
  {
    firstName: "Lucas",
    lastName: "Morales",
    birthDate: new Date('2024-03-25'), // 1.5 años
    gender: "male",
    sleepGoal: 13,
    napGoal: 2.5, 
    currentHabits: ["chupete", "oscuridad_total"],
    temperament: "sensible",
    healthNotes: "Muy sensible a la luz y sonidos"
  },
  {
    firstName: "Camila",
    lastName: "Vargas",
    birthDate: new Date('2021-12-08'), // 3.5 años
    gender: "female",
    sleepGoal: 10.5,
    napGoal: 0.5, // Siesta corta ocasional
    currentHabits: ["cuentos", "peluche"],
    temperament: "activo",
    healthNotes: "En proceso de dejar siestas completamente"
  },
  {
    firstName: "Joaquín",
    lastName: "Silva",
    birthDate: new Date('2023-07-14'), // 2 años
    gender: "male", 
    sleepGoal: 12,
    napGoal: 2,
    currentHabits: ["biberon", "luz_nocturna", "musica"],
    temperament: "tranquilo",
    healthNotes: "Muy buen durmiente, rutina establecida"
  }
]

// Función para generar eventos realistas según la edad y temperamento
function generateRealisticEvents(child, date) {
  const events = []
  const age = (Date.now() - child.birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  
  // Horarios base según edad
  let wakeTime = age < 1.5 ? 6 + Math.random() : 7 + Math.random()
  let bedTime = age < 2 ? 19 + Math.random() : 20 + Math.random()
  let napCount = age < 1 ? 3 : age < 2 ? 2 : age < 3 ? 1 : Math.random() > 0.7 ? 1 : 0
  
  // Ajustes por temperamento
  if (child.temperament === 'activo') {
    wakeTime -= 0.5
    bedTime += 0.5
  } else if (child.temperament === 'tranquilo') {
    wakeTime += 0.3
    bedTime -= 0.3
  }
  
  const dateStr = format(date, 'yyyy-MM-dd')
  
  // 1. Despertar matutino
  const wakeHour = Math.floor(wakeTime)
  const wakeMin = Math.floor((wakeTime - wakeHour) * 60)
  events.push({
    _id: new ObjectId().toString(),
    childId: child._id.toString(),
    eventType: 'wake',
    startTime: `${dateStr}T${wakeHour.toString().padStart(2, '0')}:${wakeMin.toString().padStart(2, '0')}:00.000Z`,
    emotionalState: ['happy', 'calm', 'cranky'][Math.floor(Math.random() * 3)],
    notes: ['Despertó naturalmente', 'Lloró un poco', 'Muy contento', ''][Math.floor(Math.random() * 4)],
    createdAt: new Date().toISOString()
  })
  
  // 2-4. Alimentaciones según edad
  const feedingTimes = age < 1 ? [8, 11, 14, 17, 19.5] : 
                       age < 2 ? [8, 12, 16, 18.5] : 
                       [8.5, 12.5, 18]
  
  feedingTimes.forEach(feedTime => {
    const feedHour = Math.floor(feedTime)
    const feedMin = Math.floor((feedTime - feedHour) * 60)
    const duration = age < 1 ? 20 + Math.random() * 15 : 15 + Math.random() * 10
    
    events.push({
      _id: new ObjectId().toString(),
      childId: child._id.toString(),
      eventType: 'feeding',
      startTime: `${dateStr}T${feedHour.toString().padStart(2, '0')}:${feedMin.toString().padStart(2, '0')}:00.000Z`,
      endTime: `${dateStr}T${feedHour.toString().padStart(2, '0')}:${Math.floor(feedMin + duration).toString().padStart(2, '0')}:00.000Z`,
      emotionalState: ['calm', 'happy'][Math.floor(Math.random() * 2)],
      feedingType: age < 1.5 ? ['bottle', 'breast'][Math.floor(Math.random() * 2)] : 
                   age < 3 ? ['solids', 'bottle'][Math.floor(Math.random() * 2)] : 'solids',
      feedingAmount: age < 1 ? 80 + Math.random() * 80 : 
                     age < 2 ? 100 + Math.random() * 100 :
                     50 + Math.random() * 100,
      feedingDuration: Math.floor(duration),
      babyState: 'awake',
      feedingNotes: ['Comió todo', 'Un poco inapetente', 'Le gustó mucho', ''][Math.floor(Math.random() * 4)],
      createdAt: new Date().toISOString()
    })
  })
  
  // 3-5. Siestas según edad
  const napTimes = age < 1 ? [9.5, 13, 16] :
                   age < 2 ? [10, 14.5] :
                   age < 3 ? [13.5] : 
                   Math.random() > 0.7 ? [13] : []
  
  napTimes.forEach(napTime => {
    const napHour = Math.floor(napTime)
    const napMin = Math.floor((napTime - napHour) * 60)
    const napDuration = age < 1 ? 60 + Math.random() * 60 :
                        age < 2 ? 90 + Math.random() * 60 :
                        60 + Math.random() * 30
    const sleepDelay = 5 + Math.random() * 15
    
    events.push({
      _id: new ObjectId().toString(),
      childId: child._id.toString(),
      eventType: 'nap',
      startTime: `${dateStr}T${napHour.toString().padStart(2, '0')}:${napMin.toString().padStart(2, '0')}:00.000Z`,
      endTime: `${dateStr}T${napHour.toString().padStart(2, '0')}:${Math.floor(napMin + napDuration).toString().padStart(2, '0')}:00.000Z`,
      emotionalState: ['tired', 'calm'][Math.floor(Math.random() * 2)],
      sleepDelay: Math.floor(sleepDelay),
      duration: Math.floor(napDuration - sleepDelay),
      durationReadable: `${Math.floor((napDuration - sleepDelay) / 60)}h ${Math.floor((napDuration - sleepDelay) % 60)}min`,
      notes: ['Durmió bien', 'Le costó dormirse', 'Siesta reparadora', 'Despertó llorando'][Math.floor(Math.random() * 4)],
      createdAt: new Date().toISOString()
    })
  })
  
  // 6. Sueño nocturno
  const bedHour = Math.floor(bedTime)
  const bedMin = Math.floor((bedTime - bedHour) * 60)
  const sleepDelay = child.temperament === 'activo' ? 10 + Math.random() * 20 : 
                     child.temperament === 'sensible' ? 15 + Math.random() * 25 :
                     5 + Math.random() * 15
  
  events.push({
    _id: new ObjectId().toString(),
    childId: child._id.toString(),
    eventType: 'sleep',
    startTime: `${dateStr}T${bedHour.toString().padStart(2, '0')}:${bedMin.toString().padStart(2, '0')}:00.000Z`,
    emotionalState: ['tired', 'calm', 'cranky'][Math.floor(Math.random() * 3)],
    sleepDelay: Math.floor(sleepDelay),
    notes: ['Se durmió fácil', 'Pidió agua', 'Le costó conciliar', 'Rutina normal'][Math.floor(Math.random() * 4)],
    createdAt: new Date().toISOString()
  })
  
  // 7. Despertares nocturnos (probabilidad según edad y temperamento)
  const nightWakingProb = age < 1 ? 0.6 : age < 2 ? 0.3 : 0.1
  if (Math.random() < nightWakingProb) {
    const wakeTime = 22 + Math.random() * 6  // Entre 22:00 y 04:00
    const wakeHour = Math.floor(wakeTime) % 24
    const wakeMin = Math.floor((wakeTime - Math.floor(wakeTime)) * 60)
    const awakeDuration = 10 + Math.random() * 30
    
    events.push({
      _id: new ObjectId().toString(),
      childId: child._id.toString(),
      eventType: 'night_waking',
      startTime: `${dateStr}T${wakeHour.toString().padStart(2, '0')}:${wakeMin.toString().padStart(2, '0')}:00.000Z`,
      endTime: `${dateStr}T${wakeHour.toString().padStart(2, '0')}:${Math.floor(wakeMin + awakeDuration).toString().padStart(2, '0')}:00.000Z`,
      emotionalState: ['irritable', 'cranky', 'calm'][Math.floor(Math.random() * 3)],
      awakeDelay: Math.floor(awakeDuration),
      duration: Math.floor(awakeDuration),
      durationReadable: `${Math.floor(awakeDuration)}min`,
      notes: ['Lloró un poco', 'Necesitó consuelo', 'Volvió a dormir solo', 'Pidió agua'][Math.floor(Math.random() * 4)],
      createdAt: new Date().toISOString()
    })
  }
  
  // 8. Medicamentos (ocasional)
  if (Math.random() < 0.1) { // 10% de probabilidad
    const medTime = 9 + Math.random() * 10
    const medHour = Math.floor(medTime)
    const medMin = Math.floor((medTime - medHour) * 60)
    
    events.push({
      _id: new ObjectId().toString(),
      childId: child._id.toString(),
      eventType: 'medication',
      startTime: `${dateStr}T${medHour.toString().padStart(2, '0')}:${medMin.toString().padStart(2, '0')}:00.000Z`,
      emotionalState: 'calm',
      medicationName: ['Paracetamol', 'Vitamina D', 'Probióticos'][Math.floor(Math.random() * 3)],
      medicationDose: ['5ml', '2.5ml', '1 gota'][Math.floor(Math.random() * 3)],
      medicationTime: `${dateStr}T${medHour.toString().padStart(2, '0')}:${medMin.toString().padStart(2, '0')}:00.000Z`,
      medicationNotes: ['Rutina', 'Para fiebre', 'Suplemento'][Math.floor(Math.random() * 3)],
      createdAt: new Date().toISOString()
    })
  }
  
  // 9. Actividades extra (algunas veces)
  if (Math.random() < 0.3) { // 30% de probabilidad
    const actTime = 10 + Math.random() * 6
    const actHour = Math.floor(actTime)
    const actMin = Math.floor((actTime - actHour) * 60)
    const duration = 15 + Math.random() * 45
    
    const activities = [
      'Tiempo de juego libre', 'Lectura de cuentos', 'Música y baile', 
      'Juego sensorial', 'Paseo al parque', 'Tiempo en el jardín',
      'Juegos de construcción', 'Arte y manualidades', 'Canto'
    ]
    
    events.push({
      _id: new ObjectId().toString(),
      childId: child._id.toString(),
      eventType: 'extra_activities',
      startTime: `${dateStr}T${actHour.toString().padStart(2, '0')}:${actMin.toString().padStart(2, '0')}:00.000Z`,
      endTime: `${dateStr}T${actHour.toString().padStart(2, '0')}:${Math.floor(actMin + duration).toString().padStart(2, '0')}:00.000Z`,
      emotionalState: ['excited', 'happy', 'calm'][Math.floor(Math.random() * 3)],
      activityDescription: activities[Math.floor(Math.random() * activities.length)],
      activityDuration: Math.floor(duration),
      activityImpact: ['positive', 'neutral'][Math.floor(Math.random() * 2)],
      activityNotes: ['Le gustó mucho', 'Participó activamente', 'Se divirtió', ''][Math.floor(Math.random() * 4)],
      createdAt: new Date().toISOString()
    })
  }
  
  return events
}

// Función para generar planes realistas
function generateSleepPlans(child, startDate, endDate) {
  const plans = []
  const age = (Date.now() - child.birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  
  // Generar 1-3 planes durante el período
  const planCount = 1 + Math.floor(Math.random() * 3)
  
  for (let i = 0; i < planCount; i++) {
    // Distribuir planes en el tiempo
    const planDate = addDays(startDate, Math.floor((i / planCount) * ((endDate - startDate) / (1000 * 60 * 60 * 24))))
    
    // Horarios base según edad
    const baseWakeTime = age < 2 ? "06:30" : "07:00"
    const baseBedTime = age < 2 ? "19:30" : age < 3 ? "20:00" : "20:30"
    const baseNapTime = age < 2 ? "13:00" : "14:00"
    
    const planTypes = [
      'Mejora de rutina nocturna',
      'Ajuste de horarios de siesta', 
      'Transición a nueva etapa',
      'Corrección de despertares nocturnos',
      'Establecimiento de rutina'
    ]
    
    plans.push({
      _id: new ObjectId(),
      title: `Plan de sueño - ${planTypes[Math.floor(Math.random() * planTypes.length)]}`,
      description: `Plan personalizado para mejorar los patrones de sueño de ${child.firstName}`,
      childId: child._id,
      parentId: new ObjectId(USER_ID),
      createdAt: planDate,
      status: i === planCount - 1 ? 'active' : 'completed', // El último plan es activo
      schedule: {
        bedtime: baseBedTime,
        wakeTime: baseWakeTime,
        napTimes: age < 1 ? [baseNapTime, "16:00"] : 
                  age < 3 ? [baseNapTime] : [],
        totalSleepGoal: child.sleepGoal,
        napGoal: child.napGoal
      },
      techniques: [
        'Rutina consistente antes de dormir',
        'Ambiente tranquilo y oscuro',
        'Horarios regulares de comida y sueño',
        child.currentHabits.includes('chupete') ? 'Uso gradual del chupete' : 'Sin chupete',
        child.temperament === 'activo' ? 'Actividad física durante el día' : 'Actividades calmantes'
      ].filter(Boolean),
      goals: [
        `Dormir ${child.sleepGoal} horas por noche`,
        child.napGoal > 0 ? `${child.napGoal} horas de siesta` : 'Sin siestas necesarias',
        'Reducir despertares nocturnos',
        'Mejorar calidad del sueño'
      ].filter(Boolean),
      notes: `Plan adaptado para temperamento ${child.temperament} y edad ${Math.floor(age * 10) / 10} años.`,
      expectedDuration: '2-4 semanas',
      followUpSchedule: 'Revisión semanal'
    })
  }
  
  return plans
}

async function generateTestData() {
  console.log('🚀 Iniciando generación de datos de prueba...')
  console.log(`📅 Período: ${format(START_DATE, 'dd/MM/yyyy')} - ${format(END_DATE, 'dd/MM/yyyy')}`)
  
  try {
    const client = new MongoClient(MONGODB_URI)
    await client.connect()
    console.log('✅ Conectado a MongoDB')
    
    const db = client.db()
    
    // 1. Generar niños
    console.log('\n👶 Generando 10 niños...')
    const children = CHILDREN_DATA.map(childData => ({
      _id: new ObjectId(),
      ...childData,
      parentId: USER_ID,
      events: [],
      createdAt: new Date('2025-04-20'),
      updatedAt: new Date()
    }))
    
    // 2. Generar eventos para cada niño durante 4 meses
    console.log('\n📊 Generando eventos para 4 meses...')
    let totalEvents = 0
    
    for (const child of children) {
      console.log(`  📝 Generando eventos para ${child.firstName}...`)
      
      const currentDate = new Date(START_DATE)
      while (currentDate <= END_DATE) {
        // No generar eventos para días futuros
        if (currentDate > new Date()) {
          currentDate.setDate(currentDate.getDate() + 1)
          continue
        }
        
        const dayEvents = generateRealisticEvents(child, currentDate)
        child.events.push(...dayEvents)
        totalEvents += dayEvents.length
        
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      console.log(`    ✅ ${child.events.length} eventos generados para ${child.firstName}`)
    }
    
    // 3. Generar planes de sueño
    console.log('\n📋 Generando planes de sueño...')
    const allPlans = []
    
    for (const child of children) {
      const childPlans = generateSleepPlans(child, START_DATE, END_DATE)
      allPlans.push(...childPlans)
      console.log(`  ✅ ${childPlans.length} planes generados para ${child.firstName}`)
    }
    
    // 4. Insertar en base de datos
    console.log('\n💾 Guardando en base de datos...')
    
    // Insertar niños
    await db.collection('children').insertMany(children)
    console.log(`✅ ${children.length} niños insertados`)
    
    // Insertar planes
    if (allPlans.length > 0) {
      await db.collection('sleep_plans').insertMany(allPlans)
      console.log(`✅ ${allPlans.length} planes de sueño insertados`)
    }
    
    await client.close()
    console.log('✅ Conexión cerrada')
    
    // 5. Resumen final
    console.log('\n🎉 ¡DATOS DE PRUEBA GENERADOS EXITOSAMENTE!')
    console.log('=' * 50)
    console.log(`👶 Niños creados: ${children.length}`)
    console.log(`📊 Total eventos: ${totalEvents}`)
    console.log(`📋 Total planes: ${allPlans.length}`)
    console.log(`📅 Período cubierto: ${format(START_DATE, 'dd/MM/yyyy')} - ${format(END_DATE, 'dd/MM/yyyy')}`)
    
    console.log('\n📋 Resumen por niño:')
    children.forEach(child => {
      const age = Math.floor(((Date.now() - child.birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)) * 10) / 10
      console.log(`  • ${child.firstName}: ${age} años, ${child.events.length} eventos, temperamento ${child.temperament}`)
    })
    
    console.log('\n🎯 ¿Qué puedes probar ahora?')
    console.log('• Ve al calendario y explora diferentes niños')
    console.log('• Revisa las estadísticas de cada niño')
    console.log('• Compara cómo funcionan los planes de sueño')
    console.log('• Prueba diferentes rangos de fechas')
    console.log('• Haz consultas al asistente IA sobre patrones')
    
  } catch (error) {
    console.error('❌ Error generando datos:', error)
  }
}

// Ejecutar
generateTestData()