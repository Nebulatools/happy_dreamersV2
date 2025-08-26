// POBLAR SEGUNDA SEMANA CON VARIACIÓN REALISTA
require('dotenv').config({ path: '../.env' })
const { MongoClient, ObjectId } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI
const USER_ID = '688ce146d2d5ff9616549d86'

const FECHAS_POBLAR = [
  '2025-06-07', '2025-06-08', '2025-06-09', '2025-06-10', 
  '2025-06-11', '2025-06-12', '2025-06-13', '2025-06-14'
]

function crearFechaFormatoCorrecto(fecha, hora) {
  return `${fecha}T${hora}:00-06:00`
}

function variacionTiempo(horaBase, variacionMin = 15) {
  const [h, m] = horaBase.split(':')
  let minutos = parseInt(h) * 60 + parseInt(m)
  
  // Añadir variación aleatoria
  const variacion = (Math.random() - 0.5) * variacionMin * 2
  minutos += Math.round(variacion)
  
  const horas = Math.floor(minutos / 60)
  const mins = minutos % 60
  
  return `${horas.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)]
}

function shouldIncludeEvent(probability = 0.5) {
  return Math.random() < probability
}

async function poblarSegundaSemanaVariada() {
  try {
    console.log('🎯 POBLANDO SEGUNDA SEMANA CON VARIACIÓN REALISTA')
    console.log('================================================')
    
    const client = new MongoClient(MONGODB_URI)
    await client.connect()
    const db = client.db()
    
    const bernardo = await db.collection('children').findOne({
      firstName: "Bernardo",
      lastName: "García Rivas", 
      parentId: USER_ID
    })
    
    const esteban = await db.collection('children').findOne({
      firstName: "Esteban",
      lastName: "Benavides García",
      parentId: USER_ID
    })
    
    if (!bernardo || !esteban) {
      console.log('❌ Niños no encontrados')
      await client.close()
      return
    }
    
    console.log('🧹 Limpiando segunda semana actual...')
    
    // Borrar eventos actuales de la segunda semana
    for (const fecha of FECHAS_POBLAR) {
      await db.collection('children').updateOne(
        { _id: new ObjectId(bernardo._id) },
        { $pull: { events: { startTime: { $regex: `^${fecha}` } } } }
      )
      
      await db.collection('children').updateOne(
        { _id: new ObjectId(esteban._id) },
        { $pull: { events: { startTime: { $regex: `^${fecha}` } } } }
      )
    }
    
    console.log('✨ Poblando con variación realista...')
    
    for (let i = 0; i < FECHAS_POBLAR.length; i++) {
      const fecha = FECHAS_POBLAR[i]
      const diaSemana = new Date(fecha).getDay() // 0=domingo, 1=lunes, etc
      
      console.log(`📅 ${fecha} (día ${diaSemana === 0 ? 'domingo' : diaSemana === 1 ? 'lunes' : diaSemana === 2 ? 'martes' : diaSemana === 3 ? 'miércoles' : diaSemana === 4 ? 'jueves' : diaSemana === 5 ? 'viernes' : 'sábado'})`)
      
      await poblarBernardoVariado(db, bernardo._id, fecha, diaSemana)
      await poblarEstebanVariado(db, esteban._id, fecha, diaSemana)
    }
    
    console.log('\\n🎉 SEGUNDA SEMANA POBLADA CON VARIACIÓN')
    console.log('Cada niño tiene eventos únicos con horarios variables')
    
    await client.close()
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

async function poblarBernardoVariado(db, ninoId, fecha, diaSemana) {
  const eventos = []
  
  // BERNARDO - Bebé con patrones más frecuentes
  
  // 1. DESPERTAR (7:45-8:15)
  const horaDespertar = variacionTiempo('08:00', 15)
  eventos.push({
    _id: new ObjectId().toString(),
    childId: ninoId,
    startTime: crearFechaFormatoCorrecto(fecha, horaDespertar),
    eventType: 'wake',
    emotionalState: randomChoice(['feliz', 'tranquilo', 'tired']),
    notes: `Bernardo despertó ${randomChoice(['bien', 'un poco inquieto', 'muy activo'])}`,
    createdAt: new Date().toISOString()
  })
  
  // 2. ALIMENTACIÓN MATUTINA (8:15-8:45)
  const horaFeedingMañana = variacionTiempo('08:30', 15)
  eventos.push({
    _id: new ObjectId().toString(),
    childId: ninoId,
    startTime: crearFechaFormatoCorrecto(fecha, horaFeedingMañana),
    eventType: 'feeding',
    emotionalState: randomChoice(['feliz', 'tranquilo']),
    notes: randomChoice(['', 'Toma completa', 'Comió bien']),
    createdAt: new Date().toISOString()
  })
  
  // 3. SIESTA MATUTINA (probabilidad 70%, 10:00-11:30)
  if (shouldIncludeEvent(0.7)) {
    const horaInicioSiesta = variacionTiempo('10:30', 30)
    const duracion = randomChoice([60, 75, 90])
    const [h, m] = horaInicioSiesta.split(':')
    const minutosInicio = parseInt(h) * 60 + parseInt(m)
    const minutosFin = minutosInicio + duracion
    const horaFin = `${Math.floor(minutosFin / 60).toString().padStart(2, '0')}:${(minutosFin % 60).toString().padStart(2, '0')}`
    
    eventos.push({
      _id: new ObjectId().toString(),
      childId: ninoId,
      startTime: crearFechaFormatoCorrecto(fecha, horaInicioSiesta),
      endTime: crearFechaFormatoCorrecto(fecha, horaFin),
      eventType: 'nap',
      emotionalState: 'tranquilo',
      notes: `Siesta matutina (${duracion} min)`,
      duration: duracion,
      createdAt: new Date().toISOString()
    })
  }
  
  // 4. EVENTOS ESPECIALES según día de la semana
  if (diaSemana === 1 || diaSemana === 3) { // Lunes y miércoles - medicamento
    const horaMedicamento = variacionTiempo('14:00', 20)
    eventos.push({
      _id: new ObjectId().toString(),
      childId: ninoId,
      startTime: crearFechaFormatoCorrecto(fecha, horaMedicamento),
      eventType: 'medication',
      emotionalState: randomChoice(['tranquilo', 'un_poco_molesto']),
      notes: randomChoice(['Vitaminas', 'Medicamento rutina', 'Suplemento']),
      createdAt: new Date().toISOString()
    })
  }
  
  if (diaSemana === 2 || diaSemana === 5) { // Martes y viernes - despertar nocturno
    const horaDespertarNoche = variacionTiempo('02:30', 45)
    eventos.push({
      _id: new ObjectId().toString(),
      childId: ninoId,
      startTime: crearFechaFormatoCorrecto(fecha, horaDespertarNoche),
      eventType: 'night_waking',
      emotionalState: randomChoice(['inquieto', 'llorando', 'confundido']),
      notes: randomChoice(['Despertó llorando', 'Pesadilla', 'Se despertó solo']),
      createdAt: new Date().toISOString()
    })
  }
  
  // 5. ALIMENTACIÓN TARDE (12:00-13:00, probabilidad 80%)
  if (shouldIncludeEvent(0.8)) {
    const horaFeedingTarde = variacionTiempo('12:30', 25)
    eventos.push({
      _id: new ObjectId().toString(),
      childId: ninoId,
      startTime: crearFechaFormatoCorrecto(fecha, horaFeedingTarde),
      eventType: 'feeding',
      emotionalState: randomChoice(['feliz', 'hambriento', 'tranquilo']),
      notes: randomChoice(['', 'Comió todo', 'Un poco menos hambre']),
      createdAt: new Date().toISOString()
    })
  }
  
  // 6. SIESTA VESPERTINA (14:30-16:30, probabilidad 60%)
  if (shouldIncludeEvent(0.6)) {
    const horaInicioSiestaVesp = variacionTiempo('15:00', 30)
    const duracionVesp = randomChoice([90, 120, 135])
    const [h, m] = horaInicioSiestaVesp.split(':')
    const minutosInicio = parseInt(h) * 60 + parseInt(m)
    const minutosFin = minutosInicio + duracionVesp
    const horaFin = `${Math.floor(minutosFin / 60).toString().padStart(2, '0')}:${(minutosFin % 60).toString().padStart(2, '0')}`
    
    eventos.push({
      _id: new ObjectId().toString(),
      childId: ninoId,
      startTime: crearFechaFormatoCorrecto(fecha, horaInicioSiestaVesp),
      endTime: crearFechaFormatoCorrecto(fecha, horaFin),
      eventType: 'nap',
      emotionalState: 'tranquilo',
      notes: `Siesta vespertina (${duracionVesp} min)`,
      duration: duracionVesp,
      createdAt: new Date().toISOString()
    })
  }
  
  // 7. ALIMENTACIÓN NOCHE (18:00-19:00)
  const horaFeedingNoche = variacionTiempo('18:30', 20)
  eventos.push({
    _id: new ObjectId().toString(),
    childId: ninoId,
    startTime: crearFechaFormatoCorrecto(fecha, horaFeedingNoche),
    eventType: 'feeding',
    emotionalState: randomChoice(['tranquilo', 'cansado', 'feliz']),
    notes: randomChoice(['', 'Última toma del día', 'Preparándose para dormir']),
    createdAt: new Date().toISOString()
  })
  
  // 8. SUEÑO NOCTURNO (20:00-21:00)
  const horaSueño = variacionTiempo('20:30', 25)
  const fechaObj = new Date(fecha)
  fechaObj.setDate(fechaObj.getDate() + 1)
  const fechaSiguiente = fechaObj.toISOString().split('T')[0]
  const horaDespertarSiguiente = variacionTiempo('08:00', 20)
  
  eventos.push({
    _id: new ObjectId().toString(),
    childId: ninoId,
    startTime: crearFechaFormatoCorrecto(fecha, horaSueño),
    endTime: crearFechaFormatoCorrecto(fechaSiguiente, horaDespertarSiguiente),
    eventType: 'sleep',
    emotionalState: randomChoice(['cansado', 'tranquilo']),
    notes: randomChoice(['Durmió bien', 'Se durmió rápido', 'Noche tranquila']),
    duration: randomChoice([660, 690, 720]), // 11-12 horas aprox
    createdAt: new Date().toISOString()
  })
  
  // INSERTAR
  if (eventos.length > 0) {
    await db.collection('children').updateOne(
      { _id: new ObjectId(ninoId) },
      { $push: { events: { $each: eventos } } }
    )
    console.log(`      🍼 Bernardo: ${eventos.length} eventos`)
  }
}

async function poblarEstebanVariado(db, ninoId, fecha, diaSemana) {
  const eventos = []
  
  // ESTEBAN - Niño mayor con patrones diferentes
  
  // 1. DESPERTAR (7:15-7:45)
  const horaDespertar = variacionTiempo('07:30', 15)
  eventos.push({
    _id: new ObjectId().toString(),
    childId: ninoId,
    startTime: crearFechaFormatoCorrecto(fecha, horaDespertar),
    eventType: 'wake',
    emotionalState: randomChoice(['feliz', 'energético', 'tranquilo']),
    notes: `Esteban despertó ${randomChoice(['con energía', 'tranquilo', 'listo para el día'])}`,
    createdAt: new Date().toISOString()
  })
  
  // 2. ALIMENTACIÓN MATUTINA (7:45-8:15) - IGUAL QUE BERNARDO
  const horaAlimentacion = variacionTiempo('08:00', 15)
  eventos.push({
    _id: new ObjectId().toString(),
    childId: ninoId,
    startTime: crearFechaFormatoCorrecto(fecha, horaAlimentacion),
    eventType: 'feeding',
    emotionalState: 'feliz',
    notes: randomChoice(['Desayuno de Esteban', 'Comió bien', 'Alimentación matutina']),
    createdAt: new Date().toISOString()
  })
  
  // 3. ALIMENTACIÓN MEDIODÍA (12:00-13:00, probabilidad 80%)
  if (shouldIncludeEvent(0.8)) {
    const horaFeedingMedio = variacionTiempo('12:30', 25)
    eventos.push({
      _id: new ObjectId().toString(),
      childId: ninoId,
      startTime: crearFechaFormatoCorrecto(fecha, horaFeedingMedio),
      eventType: 'feeding',
      emotionalState: randomChoice(['feliz', 'hambriento', 'tranquilo']),
      notes: randomChoice(['Comida del mediodía', 'Almuerzo de Esteban', 'Alimentación tarde']),
      createdAt: new Date().toISOString()
    })
  }
  
  // 4. EVENTOS ESPECIALES IGUAL QUE BERNARDO
  if (diaSemana === 2 || diaSemana === 4) { // Martes y jueves - medicamento
    const horaMedicamento = variacionTiempo('15:00', 30)
    eventos.push({
      _id: new ObjectId().toString(),
      childId: ninoId,
      startTime: crearFechaFormatoCorrecto(fecha, horaMedicamento),
      eventType: 'medication',
      emotionalState: randomChoice(['tranquilo', 'un_poco_molesto']),
      notes: randomChoice(['Vitaminas de Esteban', 'Medicamento rutina', 'Suplemento diario']),
      createdAt: new Date().toISOString()
    })
  }
  
  if (diaSemana === 1 || diaSemana === 6) { // Lunes y sábados - despertar nocturno 
    const horaDespertarNoche = variacionTiempo('03:00', 60)
    eventos.push({
      _id: new ObjectId().toString(),
      childId: ninoId,
      startTime: crearFechaFormatoCorrecto(fecha, horaDespertarNoche),
      eventType: 'night_waking',
      emotionalState: randomChoice(['inquieto', 'confundido', 'cansado']),
      notes: randomChoice(['Esteban se despertó', 'Despertar nocturno', 'Se levantó en la noche']),
      createdAt: new Date().toISOString()
    })
  }
  
  // 5. SIESTA (solo algunos días, 14:00-16:00)
  if (shouldIncludeEvent(0.4)) {
    const horaInicioSiesta = variacionTiempo('14:30', 30)
    const duracion = randomChoice([90, 120])
    const [h, m] = horaInicioSiesta.split(':')
    const minutosInicio = parseInt(h) * 60 + parseInt(m)
    const minutosFin = minutosInicio + duracion
    const horaFin = `${Math.floor(minutosFin / 60).toString().padStart(2, '0')}:${(minutosFin % 60).toString().padStart(2, '0')}`
    
    eventos.push({
      _id: new ObjectId().toString(),
      childId: ninoId,
      startTime: crearFechaFormatoCorrecto(fecha, horaInicioSiesta),
      endTime: crearFechaFormatoCorrecto(fecha, horaFin),
      eventType: 'nap',
      emotionalState: 'cansado',
      notes: `Siesta reparadora (${duracion} min)`,
      duration: duracion,
      createdAt: new Date().toISOString()
    })
  }
  
  // 6. SUEÑO NOCTURNO (19:30-20:30)
  const horaSueño = variacionTiempo('20:00', 25)
  const fechaObj = new Date(fecha)
  fechaObj.setDate(fechaObj.getDate() + 1)
  const fechaSiguiente = fechaObj.toISOString().split('T')[0]
  const horaDespertarSiguiente = variacionTiempo('07:30', 15)
  
  eventos.push({
    _id: new ObjectId().toString(),
    childId: ninoId,
    startTime: crearFechaFormatoCorrecto(fecha, horaSueño),
    endTime: crearFechaFormatoCorrecto(fechaSiguiente, horaDespertarSiguiente),
    eventType: 'sleep',
    emotionalState: 'cansado',
    notes: randomChoice(['Noche tranquila', 'Se durmió rápido', 'Durmió de corrido']),
    duration: randomChoice([630, 660, 690]), // 10.5-11.5 horas
    createdAt: new Date().toISOString()
  })
  
  // INSERTAR
  if (eventos.length > 0) {
    await db.collection('children').updateOne(
      { _id: new ObjectId(ninoId) },
      { $push: { events: { $each: eventos } } }
    )
    console.log(`      🧸 Esteban: ${eventos.length} eventos`)
  }
}

poblarSegundaSemanaVariada()