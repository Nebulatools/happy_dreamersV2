// Script COMPLETO para crear familia Gutierrez con 4 niÃ±os (incluyendo bebÃ© Isabella), eventos realistas Y encuestas completadas
// Ejecutar con: node scripts/create-gutierrez-family.js
// MANEJA TODO: Registro de niÃ±os, encuestas completas, eventos realistas con fechas ISO correctas

const { ObjectId } = require('mongodb')
const { connect, getDb, disconnect } = require('./mongoose-util');

// Cargar variables de entorno
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/happy_dreamers';
const USER_ID = '688ce146d2d5ff9616549d86';

// Datos de los 4 niÃ±os (3 Gutierrez + Isabella Lopez) con perfiles Ãºnicos
const children = [
  {
    firstName: "Alejandro",
    lastName: "Gutierrez",
    birthDate: '2021-06-15', // ~4 aÃ±os - Como STRING para compatibilidad con API
    gender: "male",
    surveyData: {
      rutinaHabitos: {
        horaDormir: "21:15",
        horaDespertar: "07:15",
        rutinaAntesAcostarse: "Cena, juego tranquilo, baÃ±o, cuento",
        haceSiestas: false,
        duracionSiesta: 0,
        horaSiesta: null,
        dondeDuermeNoche: "Su propia habitaciÃ³n",
        dondeDuermeSiesta: "No hace siesta",
        tiempoEnDormirse: 20,
        despiertaNoche: "A veces",
        vecesDespierta: 1
      },
      alimentacion: {
        tipoAlimentacion: "SÃ³lidos",
        horarioComidas: "Fijo",
        cenaHora: "19:45",
        problemasApetito: false,
        alergias: "LÃ¡cteos"
      },
      actividadFisica: {
        tiempoJuegoLibre: 200,
        actividadesEstructuradas: "FÃºtbol, bicicleta, dibujo",
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
    birthDate: '2022-12-03', // ~2 aÃ±os - Como STRING para compatibilidad con API
    gender: "female",
    surveyData: {
      rutinaHabitos: {
        horaDormir: "20:00",
        horaDespertar: "06:45",
        rutinaAntesAcostarse: "BaÃ±o, pijama, cuento, canciÃ³n de cuna",
        haceSiestas: true,
        duracionSiesta: 100,
        horaSiesta: "14:30",
        dondeDuermeNoche: "Su propia habitaciÃ³n",
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
        actividadesEstructuradas: "Parque, plastilina, mÃºsica",
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
    birthDate: '2024-01-20', // ~1 aÃ±o - Como STRING para compatibilidad con API
    gender: "male",
    surveyData: {
      rutinaHabitos: {
        horaDormir: "19:00",
        horaDespertar: "06:30",
        rutinaAntesAcostarse: "BaÃ±o, masaje, biberÃ³n, mÃºsica suave",
        haceSiestas: true,
        duracionSiesta: 140,
        horaSiesta: "13:00",
        dondeDuermeNoche: "HabitaciÃ³n con padres",
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
        actividadesEstructuradas: "Gatear, juguetes sensoriales, mÃºsica",
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
    birthDate: '2024-12-01', // 4 meses (bebÃ©) - Como STRING para compatibilidad con API
    gender: "female",
    surveyData: {
      rutinaHabitos: {
        horaDormir: "19:30",
        horaDespertar: "06:00",
        rutinaAntesAcostarse: "BaÃ±o, masaje, biberÃ³n/pecho, canciÃ³n suave",
        haceSiestas: true,
        duracionSiesta: 45, // Siestas mÃ¡s cortas e irregulares
        horaSiesta: "09:00", // Primera siesta de la maÃ±ana
        dondeDuermeNoche: "HabitaciÃ³n con padres (cuna)",
        dondeDuermeSiesta: "Su cuna o cochecito",
        tiempoEnDormirse: 5, // BebÃ©s se duermen rÃ¡pido si estÃ¡n cansados
        despiertaNoche: "Frecuentemente",
        vecesDespierta: 3 // BebÃ©s de 4 meses despiertan mucho
      },
      alimentacion: {
        tipoAlimentacion: "Lactancia materna exclusiva",
        horarioComidas: "A demanda (cada 2-3 horas)",
        cenaHora: "18:30", // Ãšltima toma antes de dormir
        problemasApetito: false,
        alergias: "Ninguna"
      },
      actividadFisica: {
        tiempoJuegoLibre: 30, // Tiempo despierto muy limitado
        actividadesEstructuradas: "Tummy time, sonajeros, mÃºsica suave",
        tiempoPantalla: 0, // Sin pantallas a los 4 meses
        actividadFisicaDiaria: false
      },
      saludGeneral: {
        medicamentos: "Vitamina D (gotas)",
        problemasRespiratorios: false,
        problemasDigestivos: true, // CÃ³licos comunes a esta edad
        estadoAnimoDiurno: "Tranquila pero con perÃ­odos de llanto (cÃ³licos)"
      }
    }
  }
];

// Tipos de eventos reales segÃºn la aplicaciÃ³n
const eventTypes = {
  sleep: { hasEndTime: false, hasSleepDelay: true },
  nap: { hasEndTime: true, hasSleepDelay: false },
  wake: { hasEndTime: false, hasSleepDelay: false },
  night_waking: { hasEndTime: false, hasSleepDelay: true },
  extra_activities: { hasEndTime: false, requiresDescription: true }
};

// Estados emocionales disponibles
const emotionalStates = ["calm", "happy", "fussy", "excited", "tired", "cranky"];

// FunciÃ³n para generar fecha aleatoria entre dos fechas
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// FunciÃ³n para generar hora en formato ISO string con variaciÃ³n
function generateTimeWithVariation(baseTime, variationMinutes = 30) {
  const [hours, minutes] = baseTime.split(':').map(Number);
  const baseMinutes = hours * 60 + minutes;
  const variation = Math.floor(Math.random() * (variationMinutes * 2 + 1)) - variationMinutes;
  const finalMinutes = Math.max(0, Math.min(1439, baseMinutes + variation)); // 0-1439 minutos en un dÃ­a
  
  const finalHours = Math.floor(finalMinutes / 60);
  const finalMins = finalMinutes % 60;
  
  return `${finalHours.toString().padStart(2, '0')}:${finalMins.toString().padStart(2, '0')}`;
}

// Estados emocionales mÃ¡s apropiados para bebÃ©s
const babyEmotionalStates = ["calm", "fussy", "sleepy", "content", "cranky"];

// FunciÃ³n especial para generar eventos de bebÃ© (Isabella)
function generateBabyEvents(childId, childData, startDate, endDate) {
  const events = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const currentDate = new Date(current);
    
    // PATRÃ“N TÃPICO DE BEBÃ‰ DE 4 MESES:
    // - Despierta cada 2-4 horas para comer
    // - 3-4 siestas por dÃ­a
    // - Despertares nocturnos frecuentes
    // - Horarios menos predecibles
    
    // 1. Despertar matutino (6:00 Â± 30 min)
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
          "DespertÃ³ llorando - hambre",
          "DespertÃ³ tranquila",
          "NecesitÃ³ cambio de paÃ±al",
          "DespertÃ³ pidiendo comida",
          "LlorÃ³ un poco al despertar"
        ][Math.floor(Math.random() * 5)],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    // 2. MÃºltiples siestas durante el dÃ­a (bebÃ©s de 4 meses duermen mucho)
    const napTimes = [
      { hour: 9, duration: 45 },   // Siesta matutina
      { hour: 12, duration: 60 },  // Siesta del mediodÃ­a
      { hour: 15, duration: 30 },  // Siesta tarde
      { hour: 17, duration: 20 }   // Micro-siesta tarde
    ];
    
    napTimes.forEach((napInfo, index) => {
      // No todas las siestas ocurren todos los dÃ­as (bebÃ©s son impredecibles)
      if (Math.random() > 0.2) { // 80% probabilidad por siesta
        const napStart = new Date(currentDate);
        const napHour = napInfo.hour + Math.floor(Math.random() * 3) - 1; // Â±1 hora variaciÃ³n
        const napMin = Math.floor(Math.random() * 60);
        napStart.setHours(napHour, napMin, 0, 0);
        
        const durationVariation = Math.floor(Math.random() * 31) - 15; // Â±15 min
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
              "Se durmiÃ³ en brazos",
              "Siesta en cochecito",
              "LlorÃ³ un poco antes de dormir",
              "DurmiÃ³ profundamente",
              "Siesta interrumpida por ruido"
            ][Math.floor(Math.random() * 6)],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }
    });

    // 3. Hora de dormir nocturna (19:30 Â± 30 min)
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
        sleepDelay: Math.floor(Math.random() * 20), // 0-20 min (bebÃ©s se duermen rÃ¡pido)
        notes: [
          "Se durmiÃ³ mamando/con biberÃ³n",
          "NecesitÃ³ mecerse para dormir",
          "Se durmiÃ³ fÃ¡cilmente",
          "LlorÃ³ un poco por cÃ³licos",
          "Rutina de sueÃ±o exitosa",
          "Tuvo gases antes de dormir"
        ][Math.floor(Math.random() * 6)],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    // 4. Despertares nocturnos mÃºltiples (bebÃ©s de 4 meses despiertan mucho)
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
            "DespertÃ³ con hambre - tomÃ³ pecho/biberÃ³n",
            "NecesitÃ³ cambio de paÃ±al",
            "CÃ³licos - llorÃ³ mucho",
            "Solo necesitÃ³ consuelo",
            "Gases - necesitÃ³ ayuda para eructar",
            "DespertÃ³ sobresaltada",
            "LlorÃ³ hasta que lo cargaron",
            "NecesitÃ³ mecerse para volver a dormir"
          ][Math.floor(Math.random() * 8)],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }

    // 5. Actividades extra relacionadas con bebÃ©s (menos frecuentes)
    if (Math.random() > 0.85) { // 15% probabilidad por dÃ­a
      const extraTime = new Date(currentDate);
      extraTime.setHours(10 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60), 0, 0);
      
      if (extraTime >= startDate && extraTime <= endDate) {
        const babyActivities = [
          "Vacunas - estuvo irritable todo el dÃ­a",
          "DÃ­a muy caluroso - durmiÃ³ inquieta",
          "Visita de familiares - sobreestimulada",
          "Primer baÃ±o en tina - le gustÃ³ mucho",
          "CÃ³licos intensos - llorÃ³ varias horas",
          "Cambio de fÃ³rmula - se adaptÃ³ bien",
          "Salida al parque - durmiÃ³ en cochecito",
          "RevisiÃ³n pediÃ¡trica - todo normal",
          "Primeros sonrisas sociales - muy feliz",
          "DenticiÃ³n temprana - babea mucho"
        ];
        
        events.push({
          _id: new ObjectId(),
          childId: new ObjectId(childId),
          eventType: "extra_activities", 
          startTime: extraTime.toISOString(),
          emotionalState: babyEmotionalStates[Math.floor(Math.random() * babyEmotionalStates.length)],
          description: babyActivities[Math.floor(Math.random() * babyActivities.length)],
          notes: "Evento especial que podrÃ­a afectar el sueÃ±o del bebÃ©",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }

    current.setDate(current.getDate() + 1);
  }
  
  return events;
}

// FunciÃ³n para generar eventos realistas basados en los tipos reales
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
    
    // Evento de despertar por la maÃ±ana (wake)
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
          "DespertÃ³ naturalmente",
          "NecesitÃ³ que lo despertaran",
          "Se despertÃ³ temprano",
          "DurmiÃ³ hasta tarde",
          "DespertÃ³ de buen humor"
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
      
      // Calcular duraciÃ³n con variaciÃ³n
      const durationVariation = Math.floor(Math.random() * 31) - 15; // Â±15 minutos
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
            "Le costÃ³ dormirse",
            "DurmiÃ³ profundamente",
            "Siesta corta",
            "DespertÃ³ con hambre"
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
        sleepDelay: sleepDelay + Math.floor(Math.random() * 21) - 10, // Â±10 minutos de variaciÃ³n
        notes: [
          "Se durmiÃ³ fÃ¡cilmente",
          "LlorÃ³ un poco antes de dormir",
          "NecesitÃ³ consuelo extra",
          "Rutina normal de sueÃ±o",
          "PidiÃ³ agua antes de dormir"
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
            "LlorÃ³ por unos minutos",
            "NecesitÃ³ consuelo de mamÃ¡/papÃ¡",
            "PidiÃ³ agua",
            "Tuvo pesadilla",
            "Se calmÃ³ solo",
            "NecesitÃ³ cambio de paÃ±al"
          ][Math.floor(Math.random() * 6)],
          createdAt: new Date().toISOString(), // CONVERTIR A ISO STRING
          updatedAt: new Date().toISOString() // CONVERTIR A ISO STRING
        });
      }
    }

    // Actividades extra ocasionales (extra_activities)
    if (Math.random() > 0.8) { // 20% de probabilidad por dÃ­a
      const extraTime = randomDate(
        new Date(currentDate.getTime() + 8 * 60 * 60 * 1000), // DespuÃ©s de las 8am
        new Date(currentDate.getTime() + 18 * 60 * 60 * 1000)  // Antes de las 6pm
      );
      
      if (extraTime >= startDate && extraTime <= endDate) {
        const activities = [
          "Visita a los abuelos - estuvo muy emocionado",
          "DÃ­a en el parque - corriÃ³ mucho y se cansÃ³",
          "Fiesta de cumpleaÃ±os - comiÃ³ mucho dulce",
          "Cita mÃ©dica - llorÃ³ durante la consulta",
          "DÃ­a lluvioso - no pudo salir a jugar",
          "Visita de amigos - jugÃ³ mÃ¡s tarde de lo normal",
          "Salida familiar - cambio en la rutina",
          "Dentista - estuvo nervioso toda la tarde",
          "Nueva actividad - clases de nataciÃ³n",
          "Viaje corto - durmiÃ³ en el carro"
        ];
        
        events.push({
          _id: new ObjectId(),
          childId: new ObjectId(childId),
          eventType: "extra_activities",
          startTime: extraTime.toISOString(), // CONVERTIR A ISO STRING
          emotionalState: emotionalStates[Math.floor(Math.random() * emotionalStates.length)],
          description: activities[Math.floor(Math.random() * activities.length)],
          notes: "Actividad que podrÃ­a afectar el sueÃ±o de hoy",
          createdAt: new Date().toISOString(), // CONVERTIR A ISO STRING
          updatedAt: new Date().toISOString() // CONVERTIR A ISO STRING
        });
      }
    }

    current.setDate(current.getDate() + 1);
  }
  
  return events;
}

// FunciÃ³n para verificar si un niÃ±o ya existe
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
    console.log('ðŸ”Œ Conectando a MongoDB...');
    client = /* mongoose connection handled in connect() */;
    await connect();
    
    const db = await getDb();
    
    console.log('ðŸ‘¶ Creando familia COMPLETA con 4 niÃ±os (3 Gutierrez + Isabella Lopez bebÃ©)...');
    
    // Fechas para los eventos (1 mayo - 31 julio 2025)
    const startDate = new Date('2025-05-01');
    const endDate = new Date('2025-07-31');
    
    const createdChildren = [];
    
    for (let i = 0; i < children.length; i++) {
      const childData = children[i];
      
      console.log(`\nðŸ§’ Procesando ${childData.firstName} ${childData.lastName}...`);
      
      // 1. VERIFICAR SI EL NIÃ‘O YA EXISTE
      const existingChild = await findExistingChild(db, childData.firstName, childData.lastName, USER_ID);
      
      let childId;
      let childObjectId;
      
      if (existingChild) {
        // NIÃ‘O EXISTENTE - ACTUALIZAR
        console.log(`âœ… NiÃ±o encontrado - actualizando datos: ${childData.firstName} ${childData.lastName} (ID: ${existingChild._id})`);
        childId = existingChild._id.toString();
        childObjectId = existingChild._id;
        
        // Actualizar datos bÃ¡sicos
        await db.collection('children').updateOne(
          { _id: existingChild._id },
          { 
            $set: { 
              birthDate: childData.birthDate, // Actualizar fecha si cambiÃ³
              updatedAt: new Date()
            } 
          }
        );
        console.log(`ðŸ”„ Datos bÃ¡sicos actualizados para ${childData.firstName}`);
        
      } else {
        // NIÃ‘O NUEVO - CREAR
        console.log(`ðŸ†• NiÃ±o nuevo - creando: ${childData.firstName} ${childData.lastName}`);
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
        console.log(`âœ… NiÃ±o creado: ${childData.firstName} ${childData.lastName} (ID: ${childId})`);
      }
      
      createdChildren.push({ ...childData, _id: childId });
      
      // 2. ACTUALIZAR LA ENCUESTA (SOLO EMBEBIDA EN CHILDREN - NO COLECCIÃ“N SEPARADA)
      console.log(`ðŸ“ Guardando encuesta completa para ${childData.firstName}...`);
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
      console.log(`âœ… Encuesta completada y guardada en ${childData.firstName}`);
      
      // 3. GENERAR/ACTUALIZAR EVENTOS REALISTAS (usar funciÃ³n especial para bebÃ©s)
      console.log(`ðŸ“… Generando eventos realistas para ${childData.firstName}...`);
      const isBaby = childData.firstName === "Isabella" && childData.lastName === "Lopez";
      const events = isBaby 
        ? generateBabyEvents(childId, childData, startDate, endDate)
        : generateRealisticEvents(childId, childData, startDate, endDate);
      
      if (events.length > 0) {
        // Limpiar eventos existentes del niÃ±o y insertar nuevos
        await db.collection('events').deleteMany({ childId: childObjectId });
        await db.collection('events').insertMany(events);
        console.log(`âœ… ${events.length} eventos ${existingChild ? 'actualizados' : 'creados'} en colecciÃ³n separada`);
        
        // TambiÃ©n embeber eventos en el documento del niÃ±o
        await db.collection('children').updateOne(
          { _id: childObjectId },
          { 
            $set: { 
              events: events,
              updatedAt: new Date()
            } 
          }
        );
        console.log(`âœ… Eventos embebidos en documento de ${childData.firstName}`);
      }
      
      console.log(`ðŸŽ‰ ${childData.firstName} ${childData.lastName} ${existingChild ? 'actualizado' : 'creado'} completamente!`);
    }
    
    console.log('\nðŸŽ‰ Â¡Familia completa procesada exitosamente!');
    console.log(`ðŸ‘¶ NiÃ±os procesados: ${createdChildren.length}`);
    console.log(`ðŸ“ Encuestas completadas: ${createdChildren.length}`);
    console.log(`ðŸ“… PerÃ­odo de datos: 1 mayo 2025 - 31 julio 2025`);
    console.log(`ðŸ‘¤ Usuario: ${USER_ID}`);
    
    console.log('\nðŸ“‹ Resumen final de la familia (3 Gutierrez + 1 Lopez):');
    createdChildren.forEach((child, index) => {
      // Calcular edad desde string de fecha
      const birthDate = new Date(child.birthDate);
      const isBaby = child.firstName === "Isabella";
      
      if (isBaby) {
        const ageMonths = Math.floor((new Date() - birthDate) / (30.44 * 24 * 60 * 60 * 1000));
        console.log(`${index + 1}. ${child.firstName} ${child.lastName} (${child.gender}, ${ageMonths} meses - BEBÃ‰)`);
        console.log(`   - Duerme: ${child.surveyData.rutinaHabitos.horaDormir} - ${child.surveyData.rutinaHabitos.horaDespertar}`);
        console.log(`   - Siestas: MÃºltiples (tÃ­pico de bebÃ© de 4 meses)`);
        console.log(`   - Despertares nocturnos: ${child.surveyData.rutinaHabitos.vecesDespierta} veces promedio`);
        console.log(`   - AlimentaciÃ³n: ${child.surveyData.alimentacion.tipoAlimentacion}`);
        console.log(`   - Perfil: ${child.surveyData.saludGeneral.estadoAnimoDiurno}`);
      } else {
        const age = Math.floor((new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
        console.log(`${index + 1}. ${child.firstName} ${child.lastName} (${child.gender}, ~${age} aÃ±os)`);
        console.log(`   - Duerme: ${child.surveyData.rutinaHabitos.horaDormir} - ${child.surveyData.rutinaHabitos.horaDespertar}`);
        console.log(`   - Siestas: ${child.surveyData.rutinaHabitos.haceSiestas ? 'SÃ­ (' + child.surveyData.rutinaHabitos.horaSiesta + ')' : 'No'}`);
        console.log(`   - Perfil: ${child.surveyData.saludGeneral.estadoAnimoDiurno}`);
      }
      console.log(`   - Encuesta: âœ… Completada`);
    });
    
    console.log('\nâœ¨ TODO LISTO! Ahora las encuestas aparecerÃ¡n como completadas:');
    console.log('   - http://localhost:3000/dashboard/children/new (registro funciona)');
    console.log('   - http://localhost:3000/dashboard/survey?childId=<ID> (âœ… encuestas completadas)');
    console.log('   - GeneraciÃ³n de planes funcionarÃ¡ correctamente');
    console.log('\nðŸ”§ CAMBIOS REALIZADOS:');
    console.log('   - âœ… VerificaciÃ³n de niÃ±os existentes (no duplica)');
    console.log('   - âœ… Encuestas guardadas SOLO en children.surveyData (API las encuentra)');
    console.log('   - âœ… Eventos regenerados con fechas ISO correctas');
    console.log('   - âœ… LÃ³gica inteligente: actualiza existentes, crea nuevos');
    
  } catch (error) {
    console.error('âŒ Error creando familia Gutierrez:', error);
  } finally {
    if (client) {
      await disconnect();
      console.log('ðŸ”Œ ConexiÃ³n cerrada');
    }
  }
}

// Ejecutar el script
if (require.main === module) {
  createGutierrezFamily();
}

module.exports = { createGutierrezFamily };