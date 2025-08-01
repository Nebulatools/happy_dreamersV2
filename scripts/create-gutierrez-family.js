// Script COMPLETO para crear familia Gutierrez con 4 niños (incluyendo bebé Isabella), eventos realistas Y encuestas completadas
// Ejecutar con: node scripts/create-gutierrez-family.js
// MANEJA TODO: Registro de niños, encuestas completas, eventos realistas con fechas ISO correctas

const { MongoClient, ObjectId } = require('mongodb');

// Cargar variables de entorno
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/happy_dreamers';
const USER_ID = '688ce146d2d5ff9616549d86';

// Datos de los 4 niños (3 Gutierrez + Isabella Lopez) con perfiles únicos
const children = [
  {
    firstName: "Alejandro",
    lastName: "Gutierrez",
    birthDate: '2021-06-15', // ~4 años - Como STRING para compatibilidad con API
    gender: "male",
    surveyData: {
      rutinaHabitos: {
        horaDormir: "21:15",
        horaDespertar: "07:15",
        rutinaAntesAcostarse: "Cena, juego tranquilo, baño, cuento",
        haceSiestas: false,
        duracionSiesta: 0,
        horaSiesta: null,
        dondeDuermeNoche: "Su propia habitación",
        dondeDuermeSiesta: "No hace siesta",
        tiempoEnDormirse: 20,
        despiertaNoche: "A veces",
        vecesDespierta: 1
      },
      alimentacion: {
        tipoAlimentacion: "Sólidos",
        horarioComidas: "Fijo",
        cenaHora: "19:45",
        problemasApetito: false,
        alergias: "Lácteos"
      },
      actividadFisica: {
        tiempoJuegoLibre: 200,
        actividadesEstructuradas: "Fútbol, bicicleta, dibujo",
        tiempoPantalla: 120,
        actividadFisicaDiaria: true
      },
      saludGeneral: {
        medicamentos: "Ninguno",
        problemasRespiratorios: false,
        problemasDigestivos: false,
        estadoAnimoDiurno: "Muy activo y social"
      }
    }
  },
  {
    firstName: "Valentina",
    lastName: "Gutierrez",
    birthDate: '2022-12-03', // ~2 años - Como STRING para compatibilidad con API
    gender: "female",
    surveyData: {
      rutinaHabitos: {
        horaDormir: "20:00",
        horaDespertar: "06:45",
        rutinaAntesAcostarse: "Baño, pijama, cuento, canción de cuna",
        haceSiestas: true,
        duracionSiesta: 100,
        horaSiesta: "14:30",
        dondeDuermeNoche: "Su propia habitación",
        dondeDuermeSiesta: "Su cuna",
        tiempoEnDormirse: 12,
        despiertaNoche: "Frecuentemente",
        vecesDespierta: 2
      },
      alimentacion: {
        tipoAlimentacion: "Mixta",
        horarioComidas: "Muy fijo",
        cenaHora: "18:45",
        problemasApetito: true,
        alergias: "Ninguna"
      },
      actividadFisica: {
        tiempoJuegoLibre: 150,
        actividadesEstructuradas: "Parque, plastilina, música",
        tiempoPantalla: 45,
        actividadFisicaDiaria: true
      },
      saludGeneral: {
        medicamentos: "Ninguno",
        problemasRespiratorios: false,
        problemasDigestivos: true,
        estadoAnimoDiurno: "Dulce pero testaruda"
      }
    }
  },
  {
    firstName: "Matias",
    lastName: "Gutierrez",
    birthDate: '2024-01-20', // ~1 año - Como STRING para compatibilidad con API
    gender: "male",
    surveyData: {
      rutinaHabitos: {
        horaDormir: "19:00",
        horaDespertar: "06:30",
        rutinaAntesAcostarse: "Baño, masaje, biberón, música suave",
        haceSiestas: true,
        duracionSiesta: 140,
        horaSiesta: "13:00",
        dondeDuermeNoche: "Habitación con padres",
        dondeDuermeSiesta: "Su cuna",
        tiempoEnDormirse: 8,
        despiertaNoche: "Raramente",
        vecesDespierta: 0
      },
      alimentacion: {
        tipoAlimentacion: "Lactancia mixta",
        horarioComidas: "Flexible",
        cenaHora: "18:00",
        problemasApetito: false,
        alergias: "Ninguna"
      },
      actividadFisica: {
        tiempoJuegoLibre: 80,
        actividadesEstructuradas: "Gatear, juguetes sensoriales, música",
        tiempoPantalla: 15,
        actividadFisicaDiaria: true
      },
      saludGeneral: {
        medicamentos: "Ninguno",
        problemasRespiratorios: false,
        problemasDigestivos: false,
        estadoAnimoDiurno: "Muy tranquilo y observador"
      }
    }
  },
  {
    firstName: "Isabella",
    lastName: "Lopez",
    birthDate: '2024-12-01', // 4 meses (bebé) - Como STRING para compatibilidad con API
    gender: "female",
    surveyData: {
      rutinaHabitos: {
        horaDormir: "19:30",
        horaDespertar: "06:00",
        rutinaAntesAcostarse: "Baño, masaje, biberón/pecho, canción suave",
        haceSiestas: true,
        duracionSiesta: 45, // Siestas más cortas e irregulares
        horaSiesta: "09:00", // Primera siesta de la mañana
        dondeDuermeNoche: "Habitación con padres (cuna)",
        dondeDuermeSiesta: "Su cuna o cochecito",
        tiempoEnDormirse: 5, // Bebés se duermen rápido si están cansados
        despiertaNoche: "Frecuentemente",
        vecesDespierta: 3 // Bebés de 4 meses despiertan mucho
      },
      alimentacion: {
        tipoAlimentacion: "Lactancia materna exclusiva",
        horarioComidas: "A demanda (cada 2-3 horas)",
        cenaHora: "18:30", // Última toma antes de dormir
        problemasApetito: false,
        alergias: "Ninguna"
      },
      actividadFisica: {
        tiempoJuegoLibre: 30, // Tiempo despierto muy limitado
        actividadesEstructuradas: "Tummy time, sonajeros, música suave",
        tiempoPantalla: 0, // Sin pantallas a los 4 meses
        actividadFisicaDiaria: false
      },
      saludGeneral: {
        medicamentos: "Vitamina D (gotas)",
        problemasRespiratorios: false,
        problemasDigestivos: true, // Cólicos comunes a esta edad
        estadoAnimoDiurno: "Tranquila pero con períodos de llanto (cólicos)"
      }
    }
  }
];

// Tipos de eventos reales según la aplicación
const eventTypes = {
  sleep: { hasEndTime: false, hasSleepDelay: true },
  nap: { hasEndTime: true, hasSleepDelay: false },
  wake: { hasEndTime: false, hasSleepDelay: false },
  night_waking: { hasEndTime: false, hasSleepDelay: true },
  extra_activities: { hasEndTime: false, requiresDescription: true }
};

// Estados emocionales disponibles
const emotionalStates = ["calm", "happy", "fussy", "excited", "tired", "cranky"];

// Función para generar fecha aleatoria entre dos fechas
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Función para generar hora en formato ISO string con variación
function generateTimeWithVariation(baseTime, variationMinutes = 30) {
  const [hours, minutes] = baseTime.split(':').map(Number);
  const baseMinutes = hours * 60 + minutes;
  const variation = Math.floor(Math.random() * (variationMinutes * 2 + 1)) - variationMinutes;
  const finalMinutes = Math.max(0, Math.min(1439, baseMinutes + variation)); // 0-1439 minutos en un día
  
  const finalHours = Math.floor(finalMinutes / 60);
  const finalMins = finalMinutes % 60;
  
  return `${finalHours.toString().padStart(2, '0')}:${finalMins.toString().padStart(2, '0')}`;
}

// Estados emocionales más apropiados para bebés
const babyEmotionalStates = ["calm", "fussy", "sleepy", "content", "cranky"];

// Función especial para generar eventos de bebé (Isabella)
function generateBabyEvents(childId, childData, startDate, endDate) {
  const events = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const currentDate = new Date(current);
    
    // PATRÓN TÍPICO DE BEBÉ DE 4 MESES:
    // - Despierta cada 2-4 horas para comer
    // - 3-4 siestas por día
    // - Despertares nocturnos frecuentes
    // - Horarios menos predecibles
    
    // 1. Despertar matutino (6:00 ± 30 min)
    const wakeHour = 6 + Math.floor(Math.random() * 3) - 1; // 5-7 AM
    const wakeMin = Math.floor(Math.random() * 60);
    const wakeTime = new Date(currentDate);
    wakeTime.setHours(wakeHour, wakeMin, 0, 0);
    
    if (wakeTime >= startDate && wakeTime <= endDate) {
      events.push({
        _id: new ObjectId(),
        childId: new ObjectId(childId),
        eventType: "wake",
        startTime: wakeTime.toISOString(),
        emotionalState: Math.random() > 0.6 ? "calm" : "fussy",
        notes: [
          "Despertó llorando - hambre",
          "Despertó tranquila",
          "Necesitó cambio de pañal",
          "Despertó pidiendo comida",
          "Lloró un poco al despertar"
        ][Math.floor(Math.random() * 5)],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    // 2. Múltiples siestas durante el día (bebés de 4 meses duermen mucho)
    const napTimes = [
      { hour: 9, duration: 45 },   // Siesta matutina
      { hour: 12, duration: 60 },  // Siesta del mediodía
      { hour: 15, duration: 30 },  // Siesta tarde
      { hour: 17, duration: 20 }   // Micro-siesta tarde
    ];
    
    napTimes.forEach((napInfo, index) => {
      // No todas las siestas ocurren todos los días (bebés son impredecibles)
      if (Math.random() > 0.2) { // 80% probabilidad por siesta
        const napStart = new Date(currentDate);
        const napHour = napInfo.hour + Math.floor(Math.random() * 3) - 1; // ±1 hora variación
        const napMin = Math.floor(Math.random() * 60);
        napStart.setHours(napHour, napMin, 0, 0);
        
        const durationVariation = Math.floor(Math.random() * 31) - 15; // ±15 min
        const finalDuration = Math.max(10, napInfo.duration + durationVariation);
        
        const napEnd = new Date(napStart);
        napEnd.setMinutes(napEnd.getMinutes() + finalDuration);
        
        if (napStart >= startDate && napStart <= endDate) {
          events.push({
            _id: new ObjectId(),
            childId: new ObjectId(childId),
            eventType: "nap",
            startTime: napStart.toISOString(),
            endTime: napEnd.toISOString(),
            emotionalState: Math.random() > 0.7 ? "sleepy" : "calm",
            sleepDelay: Math.floor(Math.random() * 15), // 0-15 min para dormirse
            notes: [
              "Siesta corta pero reparadora",
              "Se durmió en brazos",
              "Siesta en cochecito",
              "Lloró un poco antes de dormir",
              "Durmió profundamente",
              "Siesta interrumpida por ruido"
            ][Math.floor(Math.random() * 6)],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }
    });

    // 3. Hora de dormir nocturna (19:30 ± 30 min)
    const bedHour = 19 + Math.floor(Math.random() * 3) - 1; // 18-20
    const bedMin = Math.floor(Math.random() * 60);
    const bedTime = new Date(currentDate);
    bedTime.setHours(bedHour, bedMin, 0, 0);
    
    if (bedTime >= startDate && bedTime <= endDate) {
      events.push({
        _id: new ObjectId(),
        childId: new ObjectId(childId),
        eventType: "sleep",
        startTime: bedTime.toISOString(),
        emotionalState: Math.random() > 0.5 ? "sleepy" : Math.random() > 0.3 ? "calm" : "fussy",
        sleepDelay: Math.floor(Math.random() * 20), // 0-20 min (bebés se duermen rápido)
        notes: [
          "Se durmió mamando/con biberón",
          "Necesitó mecerse para dormir",
          "Se durmió fácilmente",
          "Lloró un poco por cólicos",
          "Rutina de sueño exitosa",
          "Tuvo gases antes de dormir"
        ][Math.floor(Math.random() * 6)],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    // 4. Despertares nocturnos múltiples (bebés de 4 meses despiertan mucho)
    const nightWakeCount = 2 + Math.floor(Math.random() * 3); // 2-4 despertares por noche
    
    for (let i = 0; i < nightWakeCount; i++) {
      const wakeHour = 21 + Math.floor(Math.random() * 8); // Entre 21:00 y 05:00
      const wakeMin = Math.floor(Math.random() * 60);
      const nightWake = new Date(currentDate);
      
      if (wakeHour >= 24) {
        nightWake.setDate(nightWake.getDate() + 1);
        nightWake.setHours(wakeHour - 24, wakeMin, 0, 0);
      } else {
        nightWake.setHours(wakeHour, wakeMin, 0, 0);
      }
      
      if (nightWake >= startDate && nightWake <= endDate) {
        events.push({
          _id: new ObjectId(),
          childId: new ObjectId(childId),
          eventType: "night_waking",
          startTime: nightWake.toISOString(),
          emotionalState: Math.random() > 0.3 ? "fussy" : "cranky",
          sleepDelay: Math.floor(Math.random() * 60) + 10, // 10-70 min para volver a dormir
          notes: [
            "Despertó con hambre - tomó pecho/biberón",
            "Necesitó cambio de pañal",
            "Cólicos - lloró mucho",
            "Solo necesitó consuelo",
            "Gases - necesitó ayuda para eructar",
            "Despertó sobresaltada",
            "Lloró hasta que lo cargaron",
            "Necesitó mecerse para volver a dormir"
          ][Math.floor(Math.random() * 8)],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }

    // 5. Actividades extra relacionadas con bebés (menos frecuentes)
    if (Math.random() > 0.85) { // 15% probabilidad por día
      const extraTime = new Date(currentDate);
      extraTime.setHours(10 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60), 0, 0);
      
      if (extraTime >= startDate && extraTime <= endDate) {
        const babyActivities = [
          "Vacunas - estuvo irritable todo el día",
          "Día muy caluroso - durmió inquieta",
          "Visita de familiares - sobreestimulada",
          "Primer baño en tina - le gustó mucho",
          "Cólicos intensos - lloró varias horas",
          "Cambio de fórmula - se adaptó bien",
          "Salida al parque - durmió en cochecito",
          "Revisión pediátrica - todo normal",
          "Primeros sonrisas sociales - muy feliz",
          "Dentición temprana - babea mucho"
        ];
        
        events.push({
          _id: new ObjectId(),
          childId: new ObjectId(childId),
          eventType: "extra_activities", 
          startTime: extraTime.toISOString(),
          emotionalState: babyEmotionalStates[Math.floor(Math.random() * babyEmotionalStates.length)],
          description: babyActivities[Math.floor(Math.random() * babyActivities.length)],
          notes: "Evento especial que podría afectar el sueño del bebé",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }

    current.setDate(current.getDate() + 1);
  }
  
  return events;
}

// Función para generar eventos realistas basados en los tipos reales
function generateRealisticEvents(childId, childData, startDate, endDate) {
  const events = [];
  const current = new Date(startDate);
  
  // Extraer horarios base del survey
  const bedtimeBase = childData.surveyData.rutinaHabitos.horaDormir;
  const waketimeBase = childData.surveyData.rutinaHabitos.horaDespertar;
  const napBase = childData.surveyData.rutinaHabitos.horaSiesta;
  const napDuration = childData.surveyData.rutinaHabitos.duracionSiesta;
  const sleepDelay = childData.surveyData.rutinaHabitos.tiempoEnDormirse;
  
  while (current <= endDate) {
    const currentDate = new Date(current);
    
    // Evento de despertar por la mañana (wake)
    const wakeTime = generateTimeWithVariation(waketimeBase, 25);
    const wakeDateTime = new Date(currentDate);
    const [wakeHour, wakeMin] = wakeTime.split(':').map(Number);
    wakeDateTime.setHours(wakeHour, wakeMin, 0, 0);
    
    if (wakeDateTime >= startDate && wakeDateTime <= endDate) {
      events.push({
        _id: new ObjectId(),
        childId: new ObjectId(childId),
        eventType: "wake",
        startTime: wakeDateTime.toISOString(), // CONVERTIR A ISO STRING
        emotionalState: Math.random() > 0.7 ? "fussy" : Math.random() > 0.4 ? "calm" : "happy",
        notes: [
          "Despertó naturalmente",
          "Necesitó que lo despertaran",
          "Se despertó temprano",
          "Durmió hasta tarde",
          "Despertó de buen humor"
        ][Math.floor(Math.random() * 5)],
        createdAt: new Date().toISOString(), // CONVERTIR A ISO STRING
        updatedAt: new Date().toISOString() // CONVERTIR A ISO STRING
      });
    }

    // Siesta (nap) - si aplica
    if (childData.surveyData.rutinaHabitos.haceSiestas && napBase) {
      const napStartTime = generateTimeWithVariation(napBase, 20);
      const napStart = new Date(currentDate);
      const [napHour, napMin] = napStartTime.split(':').map(Number);
      napStart.setHours(napHour, napMin, 0, 0);
      
      // Calcular duración con variación
      const durationVariation = Math.floor(Math.random() * 31) - 15; // ±15 minutos
      const finalDuration = Math.max(15, napDuration + durationVariation);
      
      const napEnd = new Date(napStart);
      napEnd.setMinutes(napEnd.getMinutes() + finalDuration);
      
      if (napStart >= startDate && napStart <= endDate) {
        events.push({
          _id: new ObjectId(),
          childId: new ObjectId(childId),
          eventType: "nap",
          startTime: napStart.toISOString(), // CONVERTIR A ISO STRING
          endTime: napEnd.toISOString(), // CONVERTIR A ISO STRING
          emotionalState: Math.random() > 0.6 ? "calm" : "tired",
          sleepDelay: Math.floor(Math.random() * 20), // 0-20 minutos para dormirse
          notes: [
            "Siesta tranquila",
            "Le costó dormirse",
            "Durmió profundamente",
            "Siesta corta",
            "Despertó con hambre"
          ][Math.floor(Math.random() * 5)],
          createdAt: new Date().toISOString(), // CONVERTIR A ISO STRING
          updatedAt: new Date().toISOString() // CONVERTIR A ISO STRING
        });
      }
    }

    // Hora de dormir por la noche (sleep)
    const bedTime = generateTimeWithVariation(bedtimeBase, 25);
    const bedDateTime = new Date(currentDate);
    const [bedHour, bedMin] = bedTime.split(':').map(Number);
    bedDateTime.setHours(bedHour, bedMin, 0, 0);
    
    if (bedDateTime >= startDate && bedDateTime <= endDate) {
      events.push({
        _id: new ObjectId(),
        childId: new ObjectId(childId),
        eventType: "sleep",
        startTime: bedDateTime.toISOString(), // CONVERTIR A ISO STRING
        emotionalState: Math.random() > 0.6 ? "calm" : Math.random() > 0.3 ? "tired" : "fussy",
        sleepDelay: sleepDelay + Math.floor(Math.random() * 21) - 10, // ±10 minutos de variación
        notes: [
          "Se durmió fácilmente",
          "Lloró un poco antes de dormir",
          "Necesitó consuelo extra",
          "Rutina normal de sueño",
          "Pidió agua antes de dormir"
        ][Math.floor(Math.random() * 5)],
        createdAt: new Date().toISOString(), // CONVERTIR A ISO STRING
        updatedAt: new Date().toISOString() // CONVERTIR A ISO STRING
      });
    }

    // Despertares nocturnos ocasionales (night_waking)
    const nightWakingProbability = childData.surveyData.rutinaHabitos.vecesDespierta * 0.3; // Probabilidad basada en survey
    if (Math.random() < nightWakingProbability) {
      // Generar despertar nocturno entre 23:00 y 05:00
      const nightWakeHour = 23 + Math.floor(Math.random() * 7); // 23-05
      const nightWakeMin = Math.floor(Math.random() * 60);
      const nightWakeDateTime = new Date(currentDate);
      
      if (nightWakeHour >= 24) {
        nightWakeDateTime.setDate(nightWakeDateTime.getDate() + 1);
        nightWakeDateTime.setHours(nightWakeHour - 24, nightWakeMin, 0, 0);
      } else {
        nightWakeDateTime.setHours(nightWakeHour, nightWakeMin, 0, 0);
      }
      
      if (nightWakeDateTime >= startDate && nightWakeDateTime <= endDate) {
        events.push({
          _id: new ObjectId(),
          childId: new ObjectId(childId),
          eventType: "night_waking",
          startTime: nightWakeDateTime.toISOString(), // CONVERTIR A ISO STRING
          emotionalState: Math.random() > 0.5 ? "fussy" : "cranky",
          sleepDelay: Math.floor(Math.random() * 45) + 5, // 5-50 minutos para volver a dormir
          notes: [
            "Lloró por unos minutos",
            "Necesitó consuelo de mamá/papá",
            "Pidió agua",
            "Tuvo pesadilla",
            "Se calmó solo",
            "Necesitó cambio de pañal"
          ][Math.floor(Math.random() * 6)],
          createdAt: new Date().toISOString(), // CONVERTIR A ISO STRING
          updatedAt: new Date().toISOString() // CONVERTIR A ISO STRING
        });
      }
    }

    // Actividades extra ocasionales (extra_activities)
    if (Math.random() > 0.8) { // 20% de probabilidad por día
      const extraTime = randomDate(
        new Date(currentDate.getTime() + 8 * 60 * 60 * 1000), // Después de las 8am
        new Date(currentDate.getTime() + 18 * 60 * 60 * 1000)  // Antes de las 6pm
      );
      
      if (extraTime >= startDate && extraTime <= endDate) {
        const activities = [
          "Visita a los abuelos - estuvo muy emocionado",
          "Día en el parque - corrió mucho y se cansó",
          "Fiesta de cumpleaños - comió mucho dulce",
          "Cita médica - lloró durante la consulta",
          "Día lluvioso - no pudo salir a jugar",
          "Visita de amigos - jugó más tarde de lo normal",
          "Salida familiar - cambio en la rutina",
          "Dentista - estuvo nervioso toda la tarde",
          "Nueva actividad - clases de natación",
          "Viaje corto - durmió en el carro"
        ];
        
        events.push({
          _id: new ObjectId(),
          childId: new ObjectId(childId),
          eventType: "extra_activities",
          startTime: extraTime.toISOString(), // CONVERTIR A ISO STRING
          emotionalState: emotionalStates[Math.floor(Math.random() * emotionalStates.length)],
          description: activities[Math.floor(Math.random() * activities.length)],
          notes: "Actividad que podría afectar el sueño de hoy",
          createdAt: new Date().toISOString(), // CONVERTIR A ISO STRING
          updatedAt: new Date().toISOString() // CONVERTIR A ISO STRING
        });
      }
    }

    current.setDate(current.getDate() + 1);
  }
  
  return events;
}

// Función para verificar si un niño ya existe
async function findExistingChild(db, firstName, lastName, parentId) {
  return await db.collection('children').findOne({
    firstName: firstName,
    lastName: lastName,
    parentId: parentId
  });
}

async function createGutierrezFamily() {
  let client;
  
  try {
    console.log('🔌 Conectando a MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db();
    
    console.log('👶 Creando familia COMPLETA con 4 niños (3 Gutierrez + Isabella Lopez bebé)...');
    
    // Fechas para los eventos (1 mayo - 31 julio 2025)
    const startDate = new Date('2025-05-01');
    const endDate = new Date('2025-07-31');
    
    const createdChildren = [];
    
    for (let i = 0; i < children.length; i++) {
      const childData = children[i];
      
      console.log(`\n🧒 Procesando ${childData.firstName} ${childData.lastName}...`);
      
      // 1. VERIFICAR SI EL NIÑO YA EXISTE
      const existingChild = await findExistingChild(db, childData.firstName, childData.lastName, USER_ID);
      
      let childId;
      let childObjectId;
      
      if (existingChild) {
        // NIÑO EXISTENTE - ACTUALIZAR
        console.log(`✅ Niño encontrado - actualizando datos: ${childData.firstName} ${childData.lastName} (ID: ${existingChild._id})`);
        childId = existingChild._id.toString();
        childObjectId = existingChild._id;
        
        // Actualizar datos básicos
        await db.collection('children').updateOne(
          { _id: existingChild._id },
          { 
            $set: { 
              birthDate: childData.birthDate, // Actualizar fecha si cambió
              updatedAt: new Date()
            } 
          }
        );
        console.log(`🔄 Datos básicos actualizados para ${childData.firstName}`);
        
      } else {
        // NIÑO NUEVO - CREAR
        console.log(`🆕 Niño nuevo - creando: ${childData.firstName} ${childData.lastName}`);
        const childDoc = {
          firstName: childData.firstName,
          lastName: childData.lastName,
          birthDate: childData.birthDate,
          parentId: USER_ID,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        const childResult = await db.collection('children').insertOne(childDoc);
        childId = childResult.insertedId.toString();
        childObjectId = childResult.insertedId;
        console.log(`✅ Niño creado: ${childData.firstName} ${childData.lastName} (ID: ${childId})`);
      }
      
      createdChildren.push({ ...childData, _id: childId });
      
      // 2. ACTUALIZAR LA ENCUESTA (SOLO EMBEBIDA EN CHILDREN - NO COLECCIÓN SEPARADA)
      console.log(`📝 Guardando encuesta completa para ${childData.firstName}...`);
      await db.collection('children').updateOne(
        { _id: childObjectId },
        { 
          $set: { 
            surveyData: childData.surveyData, // Los datos de la encuesta
            surveyUpdatedAt: new Date('2025-07-28T19:43:43.604Z'), // Fecha de completado
            updatedAt: new Date()
          } 
        }
      );
      console.log(`✅ Encuesta completada y guardada en ${childData.firstName}`);
      
      // 3. GENERAR/ACTUALIZAR EVENTOS REALISTAS (usar función especial para bebés)
      console.log(`📅 Generando eventos realistas para ${childData.firstName}...`);
      const isBaby = childData.firstName === "Isabella" && childData.lastName === "Lopez";
      const events = isBaby 
        ? generateBabyEvents(childId, childData, startDate, endDate)
        : generateRealisticEvents(childId, childData, startDate, endDate);
      
      if (events.length > 0) {
        // Limpiar eventos existentes del niño y insertar nuevos
        await db.collection('events').deleteMany({ childId: childObjectId });
        await db.collection('events').insertMany(events);
        console.log(`✅ ${events.length} eventos ${existingChild ? 'actualizados' : 'creados'} en colección separada`);
        
        // También embeber eventos en el documento del niño
        await db.collection('children').updateOne(
          { _id: childObjectId },
          { 
            $set: { 
              events: events,
              updatedAt: new Date()
            } 
          }
        );
        console.log(`✅ Eventos embebidos en documento de ${childData.firstName}`);
      }
      
      console.log(`🎉 ${childData.firstName} ${childData.lastName} ${existingChild ? 'actualizado' : 'creado'} completamente!`);
    }
    
    console.log('\n🎉 ¡Familia completa procesada exitosamente!');
    console.log(`👶 Niños procesados: ${createdChildren.length}`);
    console.log(`📝 Encuestas completadas: ${createdChildren.length}`);
    console.log(`📅 Período de datos: 1 mayo 2025 - 31 julio 2025`);
    console.log(`👤 Usuario: ${USER_ID}`);
    
    console.log('\n📋 Resumen final de la familia (3 Gutierrez + 1 Lopez):');
    createdChildren.forEach((child, index) => {
      // Calcular edad desde string de fecha
      const birthDate = new Date(child.birthDate);
      const isBaby = child.firstName === "Isabella";
      
      if (isBaby) {
        const ageMonths = Math.floor((new Date() - birthDate) / (30.44 * 24 * 60 * 60 * 1000));
        console.log(`${index + 1}. ${child.firstName} ${child.lastName} (${child.gender}, ${ageMonths} meses - BEBÉ)`);
        console.log(`   - Duerme: ${child.surveyData.rutinaHabitos.horaDormir} - ${child.surveyData.rutinaHabitos.horaDespertar}`);
        console.log(`   - Siestas: Múltiples (típico de bebé de 4 meses)`);
        console.log(`   - Despertares nocturnos: ${child.surveyData.rutinaHabitos.vecesDespierta} veces promedio`);
        console.log(`   - Alimentación: ${child.surveyData.alimentacion.tipoAlimentacion}`);
        console.log(`   - Perfil: ${child.surveyData.saludGeneral.estadoAnimoDiurno}`);
      } else {
        const age = Math.floor((new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
        console.log(`${index + 1}. ${child.firstName} ${child.lastName} (${child.gender}, ~${age} años)`);
        console.log(`   - Duerme: ${child.surveyData.rutinaHabitos.horaDormir} - ${child.surveyData.rutinaHabitos.horaDespertar}`);
        console.log(`   - Siestas: ${child.surveyData.rutinaHabitos.haceSiestas ? 'Sí (' + child.surveyData.rutinaHabitos.horaSiesta + ')' : 'No'}`);
        console.log(`   - Perfil: ${child.surveyData.saludGeneral.estadoAnimoDiurno}`);
      }
      console.log(`   - Encuesta: ✅ Completada`);
    });
    
    console.log('\n✨ TODO LISTO! Ahora las encuestas aparecerán como completadas:');
    console.log('   - http://localhost:3000/dashboard/children/new (registro funciona)');
    console.log('   - http://localhost:3000/dashboard/survey?childId=<ID> (✅ encuestas completadas)');
    console.log('   - Generación de planes funcionará correctamente');
    console.log('\n🔧 CAMBIOS REALIZADOS:');
    console.log('   - ✅ Verificación de niños existentes (no duplica)');
    console.log('   - ✅ Encuestas guardadas SOLO en children.surveyData (API las encuentra)');
    console.log('   - ✅ Eventos regenerados con fechas ISO correctas');
    console.log('   - ✅ Lógica inteligente: actualiza existentes, crea nuevos');
    
  } catch (error) {
    console.error('❌ Error creando familia Gutierrez:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Conexión cerrada');
    }
  }
}

// Ejecutar el script
if (require.main === module) {
  createGutierrezFamily();
}

module.exports = { createGutierrezFamily };