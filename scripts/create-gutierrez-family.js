// Script para crear familia Gutierrez con 3 niños con eventos realistas
// Ejecutar con: node scripts/create-gutierrez-family.js

const { MongoClient, ObjectId } = require('mongodb');

// Cargar variables de entorno
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/happy_dreamers';
const USER_ID = '688ce146d2d5ff9616549d86';

// Datos de los 3 niños Gutierrez con perfiles únicos
const children = [
  {
    firstName: "Alejandro",
    lastName: "Gutierrez",
    birthDate: new Date('2021-06-15'), // ~4 años
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
    birthDate: new Date('2022-12-03'), // ~2 años
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
    birthDate: new Date('2024-01-20'), // ~1 año
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
        startTime: wakeDateTime,
        emotionalState: Math.random() > 0.7 ? "fussy" : Math.random() > 0.4 ? "calm" : "happy",
        notes: [
          "Despertó naturalmente",
          "Necesitó que lo despertaran",
          "Se despertó temprano",
          "Durmió hasta tarde",
          "Despertó de buen humor"
        ][Math.floor(Math.random() * 5)],
        createdAt: new Date(),
        updatedAt: new Date()
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
          startTime: napStart,
          endTime: napEnd,
          emotionalState: Math.random() > 0.6 ? "calm" : "tired",
          sleepDelay: Math.floor(Math.random() * 20), // 0-20 minutos para dormirse
          notes: [
            "Siesta tranquila",
            "Le costó dormirse",
            "Durmió profundamente",
            "Siesta corta",
            "Despertó con hambre"
          ][Math.floor(Math.random() * 5)],
          createdAt: new Date(),
          updatedAt: new Date()
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
        startTime: bedDateTime,
        emotionalState: Math.random() > 0.6 ? "calm" : Math.random() > 0.3 ? "tired" : "fussy",
        sleepDelay: sleepDelay + Math.floor(Math.random() * 21) - 10, // ±10 minutos de variación
        notes: [
          "Se durmió fácilmente",
          "Lloró un poco antes de dormir",
          "Necesitó consuelo extra",
          "Rutina normal de sueño",
          "Pidió agua antes de dormir"
        ][Math.floor(Math.random() * 5)],
        createdAt: new Date(),
        updatedAt: new Date()
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
          startTime: nightWakeDateTime,
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
          createdAt: new Date(),
          updatedAt: new Date()
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
          startTime: extraTime,
          emotionalState: emotionalStates[Math.floor(Math.random() * emotionalStates.length)],
          description: activities[Math.floor(Math.random() * activities.length)],
          notes: "Actividad que podría afectar el sueño de hoy",
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }

    current.setDate(current.getDate() + 1);
  }
  
  return events;
}

async function createGutierrezFamily() {
  let client;
  
  try {
    console.log('🔌 Conectando a MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db();
    
    console.log('👶 Creando familia Gutierrez...');
    
    // Fechas para los eventos (1 mayo - 31 julio 2025)
    const startDate = new Date('2025-05-01');
    const endDate = new Date('2025-07-31');
    
    const createdChildren = [];
    
    for (let i = 0; i < children.length; i++) {
      const childData = children[i];
      
      // Crear el niño
      const childDoc = {
        ...childData,
        parentId: USER_ID,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const childResult = await db.collection('children').insertOne(childDoc);
      const childId = childResult.insertedId.toString();
      
      console.log(`✅ Niño creado: ${childData.firstName} ${childData.lastName} (ID: ${childId})`);
      createdChildren.push({ ...childData, _id: childId });
      
      // Generar eventos realistas para este niño
      console.log(`📅 Generando eventos realistas para ${childData.firstName}...`);
      const events = generateRealisticEvents(childId, childData, startDate, endDate);
      
      if (events.length > 0) {
        // Insertar eventos en la colección separada
        await db.collection('events').insertMany(events);
        console.log(`✅ ${events.length} eventos creados en colección separada`);
        
        // También embeber eventos en el documento del niño
        await db.collection('children').updateOne(
          { _id: childResult.insertedId },
          { 
            $set: { 
              events: events,
              surveyUpdatedAt: new Date('2025-07-28T19:43:43.604Z'),
              updatedAt: new Date()
            } 
          }
        );
        console.log(`✅ Eventos embebidos en documento de ${childData.firstName}`);
      }
    }
    
    console.log('\n🎉 ¡Familia Gutierrez creada exitosamente!');
    console.log(`👶 Niños creados: ${createdChildren.length}`);
    console.log(`📅 Período de datos: 1 mayo 2025 - 31 julio 2025`);
    console.log(`👤 Usuario: ${USER_ID}`);
    
    console.log('\n📋 Resumen de la familia Gutierrez:');
    createdChildren.forEach((child, index) => {
      const age = Math.floor((new Date() - child.birthDate) / (365.25 * 24 * 60 * 60 * 1000));
      console.log(`${index + 1}. ${child.firstName} ${child.lastName} (${child.gender}, ~${age} años)`);
      console.log(`   - Duerme: ${child.surveyData.rutinaHabitos.horaDormir} - ${child.surveyData.rutinaHabitos.horaDespertar}`);
      console.log(`   - Siestas: ${child.surveyData.rutinaHabitos.haceSiestas ? 'Sí (' + child.surveyData.rutinaHabitos.horaSiesta + ')' : 'No'}`);
      console.log(`   - Perfil: ${child.surveyData.saludGeneral.estadoAnimoDiurno}`);
    });
    
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