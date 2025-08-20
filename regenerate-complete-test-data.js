// Script mejorado para generar datos de prueba completos - 10 niños con eventos variados y planes
// Ejecutar: node regenerate-complete-test-data.js

const { MongoClient, ObjectId } = require('mongodb')
const { addDays, format, subDays, startOfDay, addMinutes, addHours } = require('date-fns')

require('dotenv').config()
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/happy_dreamers'
const USER_ID = '688ce146d2d5ff9616549d86'

// Configuración mejorada de fechas - 4 meses de datos
const END_DATE = new Date('2025-08-20')  // Hoy
const START_DATE = new Date('2025-04-20') // 4 meses atrás

// Datos realistas de niños con más variedad
const CHILDREN_DATA = [
  {
    firstName: "Sofía",
    lastName: "González", 
    birthDate: new Date('2023-03-15'), // 2.4 años
    gender: "female",
    sleepGoal: 12,
    napGoal: 2,
    currentHabits: ["chupete", "manta_especial", "cancion"],
    temperament: "tranquilo",
    healthNotes: "Alergia leve a lactosa, duerme bien",
    profile: "dormilona" // Duerme fácil y mucho
  },
  {
    firstName: "Diego",
    lastName: "Martínez",
    birthDate: new Date('2022-11-20'), // 2.75 años
    gender: "male", 
    sleepGoal: 11,
    napGoal: 1.5,
    currentHabits: ["peluche", "luz_nocturna"],
    temperament: "activo",
    healthNotes: "Muy energético, necesita mucha actividad física",
    profile: "activo" // Muchas actividades, tarde en dormirse
  },
  {
    firstName: "Isabella", 
    lastName: "López",
    birthDate: new Date('2024-01-10'), // 1.6 años
    gender: "female",
    sleepGoal: 13,
    napGoal: 2.5,
    currentHabits: ["biberon_nocturno", "musica_suave", "arrullo"],
    temperament: "sensible",
    healthNotes: "Regresión del sueño reciente, necesita más comfort",
    profile: "sensible" // Despertares nocturnos frecuentes
  },
  {
    firstName: "Mateo",
    lastName: "Rodríguez", 
    birthDate: new Date('2021-08-05'), // 4.1 años
    gender: "male",
    sleepGoal: 10,
    napGoal: 0, // Ya no hace siesta
    currentHabits: ["cuentos", "rutina_larga"],
    temperament: "independiente",
    healthNotes: "Transición completa sin siestas, muy maduro",
    profile: "maduro" // Sin siestas, rutinas largas
  },
  {
    firstName: "Emma",
    lastName: "Fernández",
    birthDate: new Date('2024-06-30'), // 1.2 años  
    gender: "female",
    sleepGoal: 14,
    napGoal: 3,
    currentHabits: ["chupete", "arrullo", "blackout"],
    temperament: "tranquilo", 
    healthNotes: "Bebé muy tranquila, excelente dormilona",
    profile: "bebe_modelo" // Duerme perfecto, pocas interrupciones
  },
  {
    firstName: "Sebastián",
    lastName: "Torres",
    birthDate: new Date('2023-09-12'), // 2.1 años
    gender: "male",
    sleepGoal: 12,
    napGoal: 2,
    currentHabits: ["peluche", "rutina_estricta", "blackout"],
    temperament: "estructurado",
    healthNotes: "Necesita rutinas muy consistentes y precisas",
    profile: "estructurado" // Horarios exactos, rutinas largas
  },
  {
    firstName: "Valentina", 
    lastName: "Ruiz",
    birthDate: new Date('2022-04-18'), // 3.3 años
    gender: "female",
    sleepGoal: 11,
    napGoal: 1,
    currentHabits: ["manta_especial", "cancion", "cuentos"],
    temperament: "social",
    healthNotes: "Le cuesta dormir si hay ruido o movimiento",
    profile: "social" // Rutinas largas sociales, sensible al ruido
  },
  {
    firstName: "Lucas",
    lastName: "Morales", 
    birthDate: new Date('2024-03-25'), // 1.4 años
    gender: "male",
    sleepGoal: 13,
    napGoal: 2.5,
    currentHabits: ["chupete", "oscuridad_total", "silencio"],
    temperament: "sensible",
    healthNotes: "Muy sensible a luz y sonidos, despertares fáciles",
    profile: "ultra_sensible" // Despierta por cualquier ruido/luz
  },
  {
    firstName: "Camila",
    lastName: "Vargas",
    birthDate: new Date('2021-12-08'), // 3.7 años
    gender: "female", 
    sleepGoal: 10.5,
    napGoal: 0.5, // Siesta muy corta ocasional
    currentHabits: ["cuentos", "peluche", "musica"],
    temperament: "activo",
    healthNotes: "Transición final de siestas, muy activa",
    profile: "transicion" // Algunas siestas, otras no
  },
  {
    firstName: "Joaquín",
    lastName: "Silva", 
    birthDate: new Date('2023-07-14'), // 2.1 años
    gender: "male",
    sleepGoal: 12,
    napGoal: 2,
    currentHabits: ["biberon", "luz_nocturna", "musica", "arrullo"],
    temperament: "tranquilo",
    healthNotes: "Excelente durmiente con rutina bien establecida",
    profile: "ideal" // Rutina perfecta, muy consistente
  }
]

// Función mejorada para generar eventos con más variedad y realismo
function generateRealisticEventsImproved(child, date) {
  const events = []
  const age = (Date.now() - child.birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  const profile = child.profile || 'normal'
  
  // Horarios base personalizados por perfil
  let wakeTime, bedTime, napCount, nightWakingProb, sleepDelayRange
  
  switch(profile) {
    case 'dormilona':
      wakeTime = 7.5 + Math.random() * 0.5 // Despierta más tarde
      bedTime = 19 + Math.random() * 0.5   // Se duerme temprano
      nightWakingProb = 0.1 // Pocas interrupciones
      sleepDelayRange = [0, 10] // Se duerme rápido
      break
      
    case 'activo': 
      wakeTime = 6 + Math.random() * 0.5   // Despierta temprano
      bedTime = 20.5 + Math.random() * 0.5 // Se duerme tarde
      nightWakingProb = 0.2
      sleepDelayRange = [15, 45] // Tarda en dormirse
      break
      
    case 'sensible':
      wakeTime = 6.5 + Math.random()       // Irregular
      bedTime = 19.5 + Math.random()
      nightWakingProb = 0.6 // Muchos despertares
      sleepDelayRange = [10, 30]
      break
      
    case 'ultra_sensible':
      wakeTime = 5.5 + Math.random() * 1.5 // Muy irregular
      bedTime = 19 + Math.random() * 1.5
      nightWakingProb = 0.8 // Despertares muy frecuentes
      sleepDelayRange = [5, 60] // Muy variable
      break
      
    case 'bebe_modelo':
      wakeTime = 7 + Math.random() * 0.5   // Muy regular
      bedTime = 19 + Math.random() * 0.5
      nightWakingProb = 0.1 // Casi nunca se despierta
      sleepDelayRange = [0, 5] // Se duerme inmediatamente
      break
      
    case 'estructurado':
      wakeTime = 7 // Siempre igual
      bedTime = 19.5 // Siempre igual
      nightWakingProb = 0.15
      sleepDelayRange = [5, 15] // Muy consistente
      break
      
    case 'ideal':
      wakeTime = 7 + Math.random() * 0.3
      bedTime = 19.5 + Math.random() * 0.3
      nightWakingProb = 0.1
      sleepDelayRange = [5, 10]
      break
      
    default: // normal, maduro, social, transicion
      wakeTime = age < 1.5 ? 6.5 + Math.random() : 7 + Math.random()
      bedTime = age < 2 ? 19.5 + Math.random() : 20 + Math.random()
      nightWakingProb = age < 1 ? 0.5 : age < 2 ? 0.3 : 0.1
      sleepDelayRange = [5, 20]
  }

  // Determinar número de siestas según edad y perfil
  if (age < 1) napCount = 3
  else if (age < 2) napCount = 2  
  else if (age < 3) napCount = profile === 'transicion' ? (Math.random() > 0.5 ? 1 : 0) : 1
  else napCount = profile === 'maduro' ? 0 : (Math.random() > 0.8 ? 1 : 0)

  const dateStr = format(date, 'yyyy-MM-dd')
  
  // 1. DESPERTAR MATUTINO
  const wakeHour = Math.floor(wakeTime)
  const wakeMin = Math.floor((wakeTime - wakeHour) * 60)
  const wakeStates = profile === 'activo' ? ['excited', 'happy'] : 
                     profile === 'sensible' ? ['cranky', 'tired', 'calm'] :
                     ['happy', 'calm', 'tired']
  
  events.push({
    _id: new ObjectId().toString(),
    childId: child._id.toString(),
    eventType: 'wake',
    startTime: `${dateStr}T${wakeHour.toString().padStart(2, '0')}:${wakeMin.toString().padStart(2, '0')}:00.000Z`,
    emotionalState: wakeStates[Math.floor(Math.random() * wakeStates.length)],
    notes: profile === 'activo' ? 'Despertó con mucha energía' :
           profile === 'sensible' ? 'Despertó llorando un poco' :
           profile === 'dormilona' ? 'Despertó tranquila y descansada' :
           ['Despertó naturalmente', 'Buenos días', 'Despertó con hambre'][Math.floor(Math.random() * 3)],
    createdAt: new Date().toISOString()
  })

  // 2. ALIMENTACIONES VARIADAS
  const feedingTimes = age < 1 ? [8, 11, 14, 17, 19.5] : 
                       age < 2 ? [8, 12, 16, 18.5] : 
                       [8.5, 12.5, 18]
  
  feedingTimes.forEach((feedTime, index) => {
    const feedHour = Math.floor(feedTime)
    const feedMin = Math.floor((feedTime - feedHour) * 60)
    
    // Duración variable según tipo y edad
    let duration, feedingType, amount
    if (age < 1.5) {
      feedingType = ['bottle', 'breast'][Math.floor(Math.random() * 2)]
      duration = feedingType === 'bottle' ? 15 + Math.random() * 10 : 20 + Math.random() * 15
      amount = feedingType === 'bottle' ? 80 + Math.random() * 80 : Math.floor(15 + Math.random() * 10)
    } else if (age < 3) {
      feedingType = Math.random() > 0.7 ? 'bottle' : 'solids'
      duration = feedingType === 'bottle' ? 10 + Math.random() * 10 : 20 + Math.random() * 20
      amount = feedingType === 'bottle' ? 100 + Math.random() * 100 : Math.floor(50 + Math.random() * 100)
    } else {
      feedingType = 'solids'
      duration = 15 + Math.random() * 25
      amount = Math.floor(80 + Math.random() * 120)
    }

    events.push({
      _id: new ObjectId().toString(),
      childId: child._id.toString(),
      eventType: 'feeding',
      startTime: `${dateStr}T${feedHour.toString().padStart(2, '0')}:${feedMin.toString().padStart(2, '0')}:00.000Z`,
      endTime: `${dateStr}T${feedHour.toString().padStart(2, '0')}:${Math.floor(feedMin + duration).toString().padStart(2, '0')}:00.000Z`,
      emotionalState: ['calm', 'happy', 'hungry'][Math.floor(Math.random() * 3)],
      feedingType,
      feedingAmount: Math.floor(amount),
      feedingDuration: Math.floor(duration),
      babyState: 'awake',
      feedingNotes: feedingType === 'bottle' ? `${Math.floor(amount)}ml de fórmula` :
                    feedingType === 'breast' ? `${Math.floor(amount)} minutos de lactancia` :
                    `Comida sólida: ${Math.floor(amount)}g aproximadamente`,
      createdAt: new Date().toISOString()
    })
  })

  // 3. SIESTAS CON DURACIÓN REAL
  const napTimes = age < 1 ? [9.5, 13, 16] :
                   age < 2 ? [10, 14.5] :
                   age < 3 ? (napCount > 0 ? [13.5] : []) :
                   []

  if (profile === 'transicion' && age >= 3) {
    // 50% chance de siesta
    if (Math.random() > 0.5) napTimes.push(14)
  }

  napTimes.forEach(napTime => {
    const napHour = Math.floor(napTime)
    const napMin = Math.floor((napTime - napHour) * 60)
    
    // Duración de siesta según perfil
    let napDuration = age < 1 ? 90 + Math.random() * 60 :
                      age < 2 ? 60 + Math.random() * 60 :
                      45 + Math.random() * 45

    if (profile === 'dormilona') napDuration *= 1.3
    if (profile === 'sensible') napDuration *= 0.7
    if (profile === 'transicion') napDuration *= 0.6

    const sleepDelay = sleepDelayRange[0] + Math.random() * (sleepDelayRange[1] - sleepDelayRange[0])
    const actualSleepDuration = napDuration - sleepDelay

    events.push({
      _id: new ObjectId().toString(),
      childId: child._id.toString(), 
      eventType: 'nap',
      startTime: `${dateStr}T${napHour.toString().padStart(2, '0')}:${napMin.toString().padStart(2, '0')}:00.000Z`,
      endTime: `${dateStr}T${napHour.toString().padStart(2, '0')}:${Math.floor(napMin + napDuration).toString().padStart(2, '0')}:00.000Z`,
      emotionalState: ['tired', 'calm', 'cranky'][Math.floor(Math.random() * 3)],
      sleepDelay: Math.floor(sleepDelay),
      duration: Math.floor(actualSleepDuration),
      durationReadable: `${Math.floor(actualSleepDuration / 60)}h ${Math.floor(actualSleepDuration % 60)}min`,
      notes: profile === 'estructurado' ? 'Siesta en horario exacto' :
             profile === 'sensible' ? 'Necesitó mucho silencio' :
             profile === 'dormilona' ? 'Siesta larga y reparadora' :
             ['Durmió bien', 'Le costó un poco', 'Siesta corta', 'Despertó descansado'][Math.floor(Math.random() * 4)],
      createdAt: new Date().toISOString()
    })
  })

  // 4. SUEÑO NOCTURNO
  const bedHour = Math.floor(bedTime)
  const bedMin = Math.floor((bedTime - bedHour) * 60)
  const sleepDelay = sleepDelayRange[0] + Math.random() * (sleepDelayRange[1] - sleepDelayRange[0])

  events.push({
    _id: new ObjectId().toString(),
    childId: child._id.toString(),
    eventType: 'sleep',
    startTime: `${dateStr}T${bedHour.toString().padStart(2, '0')}:${bedMin.toString().padStart(2, '0')}:00.000Z`,
    emotionalState: profile === 'activo' ? ['excited', 'tired'][Math.floor(Math.random() * 2)] :
                    profile === 'sensible' ? ['cranky', 'tired'][Math.floor(Math.random() * 2)] :
                    ['tired', 'calm'],
    sleepDelay: Math.floor(sleepDelay),
    notes: profile === 'estructurado' ? 'Rutina de sueño completa y exacta' :
           profile === 'activo' ? `Tardó ${Math.floor(sleepDelay)} min en calmarse` :
           profile === 'dormilona' ? 'Se durmió muy fácil' :
           ['Rutina normal', 'Le costó un poco', 'Se durmió tranquilo'][Math.floor(Math.random() * 3)],
    createdAt: new Date().toISOString()
  })

  // 5. DESPERTARES NOCTURNOS SEGÚN PERFIL
  if (Math.random() < nightWakingProb) {
    const wakingCount = profile === 'ultra_sensible' ? 1 + Math.floor(Math.random() * 3) : 
                        profile === 'sensible' ? 1 + Math.floor(Math.random() * 2) : 1

    for (let i = 0; i < wakingCount; i++) {
      const nightTime = 22 + Math.random() * 6  // Entre 22:00 y 04:00
      const nightHour = Math.floor(nightTime) % 24
      const nightMin = Math.floor((nightTime - Math.floor(nightTime)) * 60)
      const awakeDuration = profile === 'ultra_sensible' ? 20 + Math.random() * 40 :
                            profile === 'sensible' ? 15 + Math.random() * 30 :
                            10 + Math.random() * 20

      events.push({
        _id: new ObjectId().toString(),
        childId: child._id.toString(),
        eventType: 'night_waking',
        startTime: `${dateStr}T${nightHour.toString().padStart(2, '0')}:${nightMin.toString().padStart(2, '0')}:00.000Z`,
        endTime: `${dateStr}T${nightHour.toString().padStart(2, '0')}:${Math.floor(nightMin + awakeDuration).toString().padStart(2, '0')}:00.000Z`,
        emotionalState: ['irritable', 'cranky', 'calm'][Math.floor(Math.random() * 3)],
        awakeDelay: Math.floor(awakeDuration),
        duration: Math.floor(awakeDuration),
        durationReadable: `${Math.floor(awakeDuration)}min`,
        notes: profile === 'ultra_sensible' ? 'Despertó por ruido/luz' :
               profile === 'sensible' ? 'Necesitó consuelo para volver a dormir' :
               ['Lloró un poco', 'Volvió a dormir solo', 'Pidió agua'][Math.floor(Math.random() * 3)],
        createdAt: new Date().toISOString()
      })
    }
  }

  // 6. MEDICAMENTOS (ocasional con más detalle)
  if (Math.random() < 0.15) { // 15% probabilidad
    const medTime = 9 + Math.random() * 8
    const medHour = Math.floor(medTime)
    const medMin = Math.floor((medTime - medHour) * 60)
    
    const medications = [
      { name: 'Paracetamol infantil', dose: '5ml', reason: 'fiebre' },
      { name: 'Vitamina D', dose: '400 UI', reason: 'suplemento' },
      { name: 'Probióticos', dose: '1 sobre', reason: 'digestivo' },
      { name: 'Hierro', dose: '2.5ml', reason: 'anemia' },
      { name: 'Antihistamínico', dose: '2.5ml', reason: 'alergia' }
    ]
    
    const med = medications[Math.floor(Math.random() * medications.length)]

    events.push({
      _id: new ObjectId().toString(),
      childId: child._id.toString(),
      eventType: 'medication',
      startTime: `${dateStr}T${medHour.toString().padStart(2, '0')}:${medMin.toString().padStart(2, '0')}:00.000Z`,
      emotionalState: 'calm',
      medicationName: med.name,
      medicationDose: med.dose,
      medicationTime: `${dateStr}T${medHour.toString().padStart(2, '0')}:${medMin.toString().padStart(2, '0')}:00.000Z`,
      medicationNotes: `${med.reason} - administrado correctamente`,
      notes: `${med.name} ${med.dose} por ${med.reason}`,
      createdAt: new Date().toISOString()
    })
  }

  // 7. ACTIVIDADES EXTRA VARIADAS
  if (Math.random() < 0.4) { // 40% probabilidad
    const actTime = 10 + Math.random() * 6
    const actHour = Math.floor(actTime)
    const actMin = Math.floor((actTime - actHour) * 60)
    const duration = profile === 'activo' ? 30 + Math.random() * 60 : 15 + Math.random() * 30

    const activitiesByProfile = {
      'activo': ['Juego en el parque', 'Corrió mucho', 'Juegos físicos', 'Salto en cama elástica', 'Fútbol en jardín'],
      'social': ['Visita de abuelos', 'Juego con amigos', 'Fiesta infantil', 'Paseo familiar', 'Cine'],
      'sensible': ['Masajes relajantes', 'Música suave', 'Lectura tranquila', 'Baño relajante', 'Tiempo tranquilo'],
      'estructurado': ['Actividad programada', 'Clase de natación', 'Rutina de ejercicios', 'Sesión educativa'],
      'default': ['Tiempo de juego libre', 'Lectura de cuentos', 'Música y baile', 'Arte y manualidades', 'Paseo']
    }

    const activities = activitiesByProfile[profile] || activitiesByProfile['default']
    const activity = activities[Math.floor(Math.random() * activities.length)]

    events.push({
      _id: new ObjectId().toString(),
      childId: child._id.toString(),
      eventType: 'extra_activities',
      startTime: `${dateStr}T${actHour.toString().padStart(2, '0')}:${actMin.toString().padStart(2, '0')}:00.000Z`,
      endTime: `${dateStr}T${actHour.toString().padStart(2, '0')}:${Math.floor(actMin + duration).toString().padStart(2, '0')}:00.000Z`,
      emotionalState: profile === 'activo' ? ['excited', 'happy'][Math.floor(Math.random() * 2)] :
                      profile === 'sensible' ? ['calm', 'content'][Math.floor(Math.random() * 2)] :
                      ['happy', 'excited', 'calm'][Math.floor(Math.random() * 3)],
      activityDescription: activity,
      activityDuration: Math.floor(duration),
      activityImpact: profile === 'activo' && duration > 45 ? 'stimulating' : 
                      profile === 'sensible' && activity.includes('relajante') ? 'calming' : 'neutral',
      activityNotes: profile === 'activo' ? `Actividad física intensa - ${Math.floor(duration)}min` :
                     profile === 'sensible' ? `Actividad tranquila y relajante` :
                     `${activity} durante ${Math.floor(duration)} minutos`,
      notes: activity,
      createdAt: new Date().toISOString()
    })
  }

  // 8. TOMAS NOCTURNAS (para bebés menores de 18 meses)
  if (age < 1.5 && Math.random() < 0.4) {
    const nightFeedTime = 2 + Math.random() * 3 // Entre 2am y 5am
    const nfHour = Math.floor(nightFeedTime)
    const nfMin = Math.floor((nightFeedTime - nfHour) * 60)
    const duration = 15 + Math.random() * 20

    events.push({
      _id: new ObjectId().toString(),
      childId: child._id.toString(),
      eventType: 'night_feeding',
      startTime: `${dateStr}T${nfHour.toString().padStart(2, '0')}:${nfMin.toString().padStart(2, '0')}:00.000Z`,
      endTime: `${dateStr}T${nfHour.toString().padStart(2, '0')}:${Math.floor(nfMin + duration).toString().padStart(2, '0')}:00.000Z`,
      emotionalState: 'sleepy',
      feedingType: Math.random() > 0.5 ? 'bottle' : 'breast',
      feedingAmount: Math.floor(60 + Math.random() * 40),
      feedingDuration: Math.floor(duration),
      babyState: 'asleep',
      feedingNotes: `Toma nocturna - volvió a dormir después`,
      notes: 'Toma nocturna tranquila',
      createdAt: new Date().toISOString()
    })
  }

  return events
}

// Función mejorada para generar planes de sueño más detallados
function generateDetailedSleepPlans(child, startDate, endDate) {
  const plans = []
  const age = (Date.now() - child.birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  const profile = child.profile || 'normal'
  
  // Generar 2-4 planes durante el período según el perfil
  const planCount = profile === 'estructurado' || profile === 'ideal' ? 2 : 
                    profile === 'sensible' || profile === 'ultra_sensible' ? 4 : 3
  
  for (let i = 0; i < planCount; i++) {
    const planDate = addDays(startDate, Math.floor((i / planCount) * ((endDate - startDate) / (1000 * 60 * 60 * 24))))
    
    // Horarios personalizados por perfil y edad
    let baseWakeTime, baseBedTime, baseNapTimes, techniques, goals

    switch(profile) {
      case 'dormilona':
        baseWakeTime = "07:30"
        baseBedTime = age < 2 ? "19:00" : "19:30" 
        baseNapTimes = age < 2 ? ["10:00", "14:00"] : age < 3 ? ["13:30"] : []
        techniques = [
          'Ambiente muy oscuro y silencioso',
          'Rutina corta y eficiente',
          'Aprovecha su tendencia natural al sueño',
          'Mantener horarios consistentes'
        ]
        goals = [
          `Mantener ${child.sleepGoal} horas de sueño nocturno`,
          child.napGoal > 0 ? `${child.napGoal}h de siestas diarias` : 'Sin siestas',
          'Preservar la buena calidad de sueño',
          'Horarios regulares y predecibles'
        ]
        break

      case 'activo':
        baseWakeTime = "06:30"
        baseBedTime = age < 2 ? "20:00" : "20:30"
        baseNapTimes = age < 2 ? ["10:30", "15:00"] : age < 3 ? ["14:00"] : []
        techniques = [
          'Actividad física intensa durante el día',
          'Rutina de relajación larga antes de dormir',
          'Técnicas de respiración y mindfulness',
          'Ambiente tranquilo 1 hora antes de dormir',
          'Evitar pantallas 2 horas antes'
        ]
        goals = [
          `Reducir tiempo para dormirse a menos de 20 minutos`,
          `${child.sleepGoal} horas de sueño reparador`,
          'Canalizar energía durante el día',
          'Crear transición efectiva día-noche'
        ]
        break

      case 'sensible':
        baseWakeTime = "07:00"
        baseBedTime = "19:30"
        baseNapTimes = age < 2 ? ["09:30", "13:30"] : age < 3 ? ["13:00"] : []
        techniques = [
          'Ambiente ultra-controlado (luz, ruido, temperatura)',
          'Rutina muy predecible y calmante',
          'Técnicas de confort y arrullo extendidas',
          'Respuesta inmediata a despertares',
          'Gradual reducción de dependencias nocturnas'
        ]
        goals = [
          'Reducir despertares nocturnos a máximo 2 por noche',
          'Aumentar capacidad de autoregulación',
          `${child.sleepGoal} horas de sueño con menos interrupciones`,
          'Mejorar calidad del sueño REM'
        ]
        break

      case 'estructurado':
        baseWakeTime = "07:00"
        baseBedTime = "19:30"
        baseNapTimes = age < 2 ? ["10:00", "14:00"] : age < 3 ? ["13:30"] : []
        techniques = [
          'Horarios exactos sin variaciones',
          'Rutina detallada paso a paso',
          'Sistema de recordatorios visuales',
          'Consistencia absoluta entre cuidadores',
          'Preparación anticipada para cambios'
        ]
        goals = [
          'Mantener horarios exactos (±5 minutos)',
          'Rutina completamente independiente',
          'Sueño predecible y estable',
          'Adaptación gradual a nuevas etapas'
        ]
        break

      case 'bebe_modelo':
        baseWakeTime = "07:00"
        baseBedTime = "19:00"
        baseNapTimes = age < 1 ? ["09:00", "13:00", "16:30"] : ["10:00", "14:00"]
        techniques = [
          'Mantener rutina exitosa actual',
          'Ajustes mínimos y graduales',
          'Preservar ambiente óptimo de sueño',
          'Monitoreo para prevenir regresiones'
        ]
        goals = [
          'Mantener excelente patrón actual',
          'Adaptación suave a cambios de desarrollo',
          'Prevenir interrupciones por cambios externos',
          'Modelo de sueño saludable a largo plazo'
        ]
        break

      default:
        baseWakeTime = age < 2 ? "06:30" : "07:00"
        baseBedTime = age < 2 ? "19:30" : "20:00" 
        baseNapTimes = age < 2 ? ["10:00", "14:00"] : age < 3 ? ["13:30"] : []
        techniques = [
          'Rutina consistente pero flexible',
          'Ambiente propicio para el sueño',
          'Actividades calmantes antes de dormir',
          'Horarios regulares adaptados a la familia'
        ]
        goals = [
          `${child.sleepGoal} horas de sueño nocturno`,
          child.napGoal > 0 ? `${child.napGoal}h de siestas` : 'Transición sin siestas',
          'Sueño independiente y reparador',
          'Balance entre rutina y flexibilidad'
        ]
    }

    const planTypes = {
      'dormilona': ['Optimización de horarios naturales', 'Mantenimiento de rutina exitosa'],
      'activo': ['Plan intensivo de gasto energético', 'Técnicas de relajación progresiva'],
      'sensible': ['Plan de desensibilización gradual', 'Protocolo anti-despertares'],
      'ultra_sensible': ['Ambiente ultra-controlado', 'Intervención intensiva de sueño'],
      'bebe_modelo': ['Plan de mantenimiento óptimo', 'Prevención de regresiones'],
      'estructurado': ['Rutina de precisión milimétrica', 'Sistema estructurado avanzado'],
      'social': ['Balance social-sueño', 'Rutina flexible adaptable'],
      'transicion': ['Plan transición de siestas', 'Adaptación a nueva etapa'],
      'ideal': ['Optimización de rutina perfecta', 'Plan de excelencia en sueño'],
      'maduro': ['Rutina sin siestas', 'Plan de sueño nocturno extendido']
    }

    const typeOptions = planTypes[profile] || ['Plan de mejora general', 'Optimización de rutina']
    const planTitle = typeOptions[Math.floor(Math.random() * typeOptions.length)]

    plans.push({
      _id: new ObjectId(),
      title: `${planTitle} - ${child.firstName}`,
      description: `Plan personalizado ${profile} para ${child.firstName} (${Math.floor(age * 10)/10} años)`,
      childId: child._id,
      parentId: new ObjectId(USER_ID),
      createdAt: planDate,
      status: i === planCount - 1 ? 'active' : (i === planCount - 2 ? 'review' : 'completed'),
      priority: profile === 'sensible' || profile === 'ultra_sensible' ? 'high' : 
                profile === 'bebe_modelo' ? 'low' : 'medium',
      schedule: {
        bedtime: baseBedTime,
        wakeTime: baseWakeTime,
        napTimes: baseNapTimes,
        totalSleepGoal: child.sleepGoal,
        napGoal: child.napGoal
      },
      techniques,
      goals,
      profileType: profile,
      ageGroup: age < 1 ? 'infant' : age < 2 ? 'toddler_early' : age < 3 ? 'toddler_late' : 'preschool',
      notes: `Plan especializado para perfil ${profile}. ${child.healthNotes}`,
      expectedDuration: profile === 'ultra_sensible' || profile === 'sensible' ? '4-6 semanas' : '2-4 semanas',
      followUpSchedule: profile === 'estructurado' ? 'Revisión cada 3 días' : 'Revisión semanal',
      successMetrics: [
        'Tiempo promedio para dormir',
        'Número de despertares nocturnos', 
        'Duración total de sueño',
        'Calidad del despertar matutino',
        'Regularidad de horarios'
      ]
    })
  }
  
  return plans
}

// Función principal mejorada
async function regenerateCompleteTestData() {
  console.log('🚀 REGENERANDO DATOS COMPLETOS DE PRUEBA')
  console.log('=' * 60)
  console.log(`📅 Período: ${format(START_DATE, 'dd/MM/yyyy')} - ${format(END_DATE, 'dd/MM/yyyy')}`)
  console.log(`👶 Niños: ${CHILDREN_DATA.length} con perfiles únicos`)
  
  try {
    const client = new MongoClient(MONGODB_URI)
    await client.connect()
    console.log('✅ Conectado a MongoDB')
    
    const db = client.db()
    
    // 1. LIMPIAR DATOS EXISTENTES
    console.log('\n🧹 Limpiando datos anteriores...')
    const deleteChildren = await db.collection('children').deleteMany({ parentId: USER_ID })
    const deletePlans = await db.collection('sleep_plans').deleteMany({ parentId: new ObjectId(USER_ID) })
    console.log(`   🗑️  ${deleteChildren.deletedCount} niños eliminados`)
    console.log(`   🗑️  ${deletePlans.deletedCount} planes eliminados`)
    
    // 2. GENERAR NIÑOS MEJORADOS
    console.log('\n👶 Generando niños con perfiles únicos...')
    const children = CHILDREN_DATA.map((childData, index) => {
      const child = {
        _id: new ObjectId(),
        ...childData,
        parentId: USER_ID,
        events: [],
        createdAt: new Date('2025-04-20'),
        updatedAt: new Date(),
        profileDescription: `Niño con perfil ${childData.profile} - ${childData.healthNotes}`
      }
      console.log(`   ${index + 1}. ${child.firstName} - Perfil: ${child.profile} (${Math.floor(((Date.now() - child.birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)) * 10) / 10} años)`)
      return child
    })
    
    // 3. GENERAR EVENTOS MEJORADOS
    console.log('\n📊 Generando eventos realistas por perfil...')
    let totalEvents = 0
    
    for (const child of children) {
      console.log(`\n   📝 ${child.firstName} (${child.profile}):`)
      
      const currentDate = new Date(START_DATE)
      let childEvents = 0
      
      while (currentDate <= END_DATE) {
        if (currentDate <= new Date()) { // Solo hasta hoy
          const dayEvents = generateRealisticEventsImproved(child, currentDate)
          child.events.push(...dayEvents)
          totalEvents += dayEvents.length
          childEvents += dayEvents.length
        }
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      // Estadísticas por niño
      const eventsByType = child.events.reduce((acc, event) => {
        acc[event.eventType] = (acc[event.eventType] || 0) + 1
        return acc
      }, {})
      
      console.log(`      Total: ${childEvents} eventos`)
      console.log(`      Sueño: ${eventsByType.sleep || 0} | Despertares: ${eventsByType.wake || 0}`)
      console.log(`      Siestas: ${eventsByType.nap || 0} | Alimentación: ${eventsByType.feeding || 0}`)
      console.log(`      Nocturnos: ${eventsByType.night_waking || 0} | Actividades: ${eventsByType.extra_activities || 0}`)
      console.log(`      Medicinas: ${eventsByType.medication || 0} | Tomas nocturnas: ${eventsByType.night_feeding || 0}`)
    }
    
    // 4. GENERAR PLANES DETALLADOS
    console.log('\n📋 Generando planes de sueño especializados...')
    const allPlans = []
    
    for (const child of children) {
      const childPlans = generateDetailedSleepPlans(child, START_DATE, END_DATE)
      allPlans.push(...childPlans)
      console.log(`   ${child.firstName}: ${childPlans.length} planes (${childPlans[childPlans.length-1].status})`)
    }
    
    // 5. GUARDAR EN BASE DE DATOS
    console.log('\n💾 Guardando en base de datos...')
    
    await db.collection('children').insertMany(children)
    console.log(`   ✅ ${children.length} niños insertados`)
    
    if (allPlans.length > 0) {
      await db.collection('sleep_plans').insertMany(allPlans)
      console.log(`   ✅ ${allPlans.length} planes de sueño insertados`)
    }
    
    await client.close()
    console.log('   ✅ Conexión cerrada')
    
    // 6. RESUMEN FINAL DETALLADO
    console.log('\n🎉 ¡DATOS COMPLETOS REGENERADOS EXITOSAMENTE!')
    console.log('=' * 80)
    console.log(`👶 Niños creados: ${children.length} con perfiles únicos`)
    console.log(`📊 Total eventos: ${totalEvents}`)
    console.log(`📋 Total planes: ${allPlans.length}`)
    console.log(`📅 Período cubierto: ${format(START_DATE, 'dd/MM/yyyy')} - ${format(END_DATE, 'dd/MM/yyyy')}`)
    console.log(`🎯 Promedio eventos/niño: ${Math.floor(totalEvents/children.length)}`)
    
    console.log('\n📋 RESUMEN POR NIÑO Y PERFIL:')
    children.forEach((child, i) => {
      const age = Math.floor(((Date.now() - child.birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)) * 10) / 10
      const plans = allPlans.filter(p => p.childId.toString() === child._id.toString())
      console.log(`   ${i+1}. ${child.firstName} - ${age} años`)
      console.log(`      📊 Perfil: ${child.profile} | ${child.events.length} eventos`)
      console.log(`      🎯 Meta: ${child.sleepGoal}h sueño + ${child.napGoal}h siesta`)  
      console.log(`      📋 Planes: ${plans.length} (${plans.find(p => p.status === 'active') ? 'Plan activo' : 'Sin plan activo'})`)
      console.log(`      🏥 Salud: ${child.healthNotes}`)
    })
    
    console.log('\n🎯 CARACTERÍSTICAS DESTACADAS:')
    console.log('• Perfiles únicos de sueño por niño')
    console.log('• Eventos con duración real y variabilidad')
    console.log('• Horarios personalizados según temperamento')
    console.log('• Planes especializados por perfil de sueño')
    console.log('• Medicamentos y actividades detalladas')
    console.log('• Despertares nocturnos según edad y sensibilidad')
    console.log('• Tomas nocturnas para bebés menores de 18 meses')
    console.log('• Siestas variables según transición de edad')
    
    console.log('\n🎯 PRÓXIMOS PASOS SUGERIDOS:')
    console.log('• Explora el calendario con diferentes niños')
    console.log('• Compara estadísticas entre perfiles de sueño')
    console.log('• Revisa los planes especializados por niño')
    console.log('• Usa el registro manual con todos los tipos de eventos')
    console.log('• Consulta al asistente IA sobre patrones específicos')
    
  } catch (error) {
    console.error('❌ Error regenerando datos:', error)
  }
}

// Ejecutar regeneración
regenerateCompleteTestData()