# Script de Generación de Datos de Testing - Happy Dreamers 🧪

## 📋 Objetivo

Generar datos completos y realistas para testing del sistema Happy Dreamers usando los casos reales de **Bernardo García Rivas** y **Esteban Benavides García** con sus cuestionarios completos y 4 semanas de eventos simulados.

---

## 🔧 **SCRIPT COMPLETO DE GENERACIÓN**

### **PASO 1: Verificar/Crear Usuario Test**

```javascript
// Script: check-and-setup-test-user.js
const { connectToDatabase } = require('./lib/mongodb')
const bcrypt = require('bcrypt')

async function setupTestUser() {
  const { db } = await connectToDatabase()
  
  // Usuario base para testing
  const testUser = {
    _id: ObjectId("688ce146d2d5ff9616549d86"), // ID que proporcionaste
    name: "test",
    email: "test@test.com", 
    password: await bcrypt.hash("test123", 12),
    role: "parent",
    children: [], // Se poblará al crear los niños
    createdAt: new Date("2025-01-01T00:00:00Z"),
    updatedAt: new Date()
  }
  
  // Verificar si existe y actualizar si es necesario
  const existingUser = await db.collection("users").findOne({
    _id: ObjectId("688ce146d2d5ff9616549d86")
  })
  
  if (existingUser) {
    console.log("✅ Usuario test existe:", existingUser.name)
    // Limpiar array children para empezar fresh
    await db.collection("users").updateOne(
      { _id: ObjectId("688ce146d2d5ff9616549d86") },
      { $set: { children: [], updatedAt: new Date() } }
    )
  } else {
    await db.collection("users").insertOne(testUser)
    console.log("✅ Usuario test creado")
  }
}
```

---

### **PASO 2: Crear Niño Bernardo con Cuestionario Completo**

```javascript
// Script: create-bernardo.js
async function createBernardo() {
  const { db } = await connectToDatabase()
  
  // **DATOS REALES DE BERNARDO GARCÍA RIVAS**
  const bernardoData = {
    firstName: "Bernardo",
    lastName: "García Rivas", 
    birthDate: "2022-01-12", // 12 de enero 2022 (8-9 meses en oct 2022)
    parentId: "688ce146d2d5ff9616549d86",
    createdAt: new Date("2025-01-01T00:00:00Z"),
    updatedAt: new Date(),
    
    // **CUESTIONARIO COMPLETO BASADO EN CASO REAL**
    surveyData: {
      completedAt: new Date("2025-01-01T10:00:00Z"),
      
      // INFORMACIÓN FAMILIAR 
      informacionFamiliar: {
        papa: {
          nombre: "Bernardo Garcia",
          edad: 34,
          ocupacion: "Empresario",
          direccion: "Olimpo 15, Las Ceibas",
          ciudad: "Nuevo Vallarta", 
          telefono: "8661156816",
          email: "bernardo.garcia@ejemplo.com",
          trabajaFueraCasa: true,
          tieneAlergias: false,
          alergias: ""
        },
        mama: {
          nombre: "Itzel Rivas",
          edad: 26,
          ocupacion: "Maestra", 
          mismaDireccionPapa: true,
          direccion: "Olimpo 15, Las Ceibas",
          ciudad: "Nuevo Vallarta",
          telefono: "8661156816", 
          email: "itzel.rivas@ejemplo.com",
          trabajaFueraCasa: true,
          puedeDormirConHijo: true,
          apetito: "normal",
          pensamientosNegativos: false,
          tieneAlergias: false,
          alergias: ""
        }
      },
      
      // DINÁMICA FAMILIAR
      dinamicaFamiliar: {
        cantidadHijos: 1,
        hijosInfo: [{
          nombre: "Bernardo",
          fechaNacimiento: "2022-01-12",
          edad: 8,
          esElQueNecesitaAyuda: true
        }],
        otrosEnCasa: "Nanny/persona de limpieza y cuidado del bebé",
        telefonoSeguimiento: "8661156816",
        emailObservaciones: "itzel.rivas@ejemplo.com", 
        comoConocioServicios: "Instagram, Facebook, recomendaciones",
        librosConsultados: "Ninguno",
        metodosEnContra: "Ninguno",
        asesorAnterior: "No", 
        quienSeLevaantaNoche: "Ambos padres se turnan"
      },
      
      // HISTORIAL DEL NIÑO
      historial: {
        nombre: "Bernardo García Rivas",
        fechaNacimiento: "2022-01-12", 
        peso: 8.1,
        percentilPeso: 50,
        embarazoPlaneado: true,
        problemasEmbarazo: false,
        problemasEmbarazoDescripcion: "",
        padecimientosEmbarazo: ["Ninguna"],
        tipoParto: "Vaginal",
        complicacionesParto: false,
        complicacionesPartoDescripcion: "",
        nacioPlazo: true,
        problemasAlNacer: false,
        problemasAlNacerDescripcion: "",
        pediatra: "Dr. Pediatra",
        pediatraDescartaProblemas: true,
        pediatraConfirmaCapacidadDormir: true,
        tratamientoMedico: true,
        tratamientoMedicoDescripcion: "Tylenol y Motrin para fiebre (enfermedad temporal)"
      },
      
      // DESARROLLO Y SALUD 
      desarrolloSalud: {
        edadRodar: 4, // meses
        edadSentarse: 5.5,
        edadGatear: 6.5,
        edadPararse: 6,
        edadCaminar: null, // Aún no camina
        usoVaso: "Biberón",
        alimentacion: "Leche materna exclusiva", 
        comeSolidos: true,
        caracteristicas: ["Come muy poco sólidos", "Problemas integración sensorial", "Usa biberón y vasito"]
      },
      
      // ACTIVIDAD FÍSICA
      actividadFisica: {
        vePantallas: false, // No ve pantallas
        pantallasTiempo: "0 minutos",
        practicaActividad: false, 
        actividades: "No practica actividad organizada",
        actividadesDespierto: "Juega, gatea, actividades sensoriales",
        signosIrritabilidad: false,
        situacionesSufridas: []
      },
      
      // RUTINA Y HÁBITOS DE SUEÑO (PROBLEMA PRINCIPAL)
      rutinaHabitos: {
        diaTypico: "Despierta 8:00 AM, nanny cuida hasta 4:00 PM. Desayuno sólidos 9:45 AM, siesta 10:30 AM con biberón. Siesta tarde 4:30 PM con mamá y pecho. Papá llega 6:00 PM, cenan 7:15 PM. Rutina nocturna 7:45 PM: baño, vitaminas, dientes (llora), pecho, papá lo arrulla para cuna.",
        vaGuarderia: false,
        quienPasaTiempo: "Nanny durante día, padres tarde/noche",
        quienCuidaNoche: "Ambos padres se turnan",
        dondeVurmePadresSalen: "Con nanny",
        rutinaAntesAcostarse: "Baño, vitaminas, lavado de dientes, pecho, arrullo",
        horaEspecificaDormir: true,
        horaDormir: "20:00", // Rutina inicia 7:45 PM
        seQuedaDormirSolo: false, // PROBLEMA PRINCIPAL
        oscuridadCuarto: ["Habitación 100% oscura"],
        usaRuidoBlanco: false,
        temperaturaCuarto: "Normal",
        tipoPiyama: "Pijama normal",
        usaSacoDormir: false,
        seQuedaHastaConciliar: true, // Necesita arrullo
        
        dondeDuermeNoche: "Primero en su cuna/corral y luego a cama de papás", // PROBLEMA
        
        comparteHabitacion: true, // Termina en cama de padres
        conQuienComparte: "Padres después de 10 PM",
        intentaSalirCama: false,
        sacaDesCamaNohe: false, 
        lloraAlDejarSolo: true, // PROBLEMA PRINCIPAL
        golpeaCabeza: false,
        despiertaEnNoche: true, // CADA 30 MINUTOS
        miendoOscuridad: false,
        padresMiedoOscuridad: false,
        temperamento: "Tranquilo pero demandante",
        reaccionDejarSolo: "Llora y se despierta cada 30 minutos después 8 PM",
        metodosRelajarse: "Pecho y arrullo",
        haceSiestas: true,
        
        otrosHijosProblemas: false,
        dondeViermesViaja: "Portátil",
        duermeMejorViaja: "Peor",
        padresDispuestos: true,
        objetivosPadres: "Que duerma de corrido en su cuna por sí solo, siestas largas en cuna, preferiblemente destetar noche (una toma aceptable). No les molesta arrullar al inicio pero quieren solucionar despertares.",
        informacionAdicional: "Despertares cada 30 min después 8 PM, padres se turnan. 10 PM mamá se acuesta con él, amamanta cada despertar. 2 AM toma nutritiva, demás solo arrullo. 6 AM mamá trabaja, papá arrulla hasta 8-9 AM."
      }
    }
  }
  
  // Crear el niño
  const result = await db.collection("children").insertOne(bernardoData)
  const bernardoId = result.insertedId
  
  // Actualizar usuario con el ID del niño
  await db.collection("users").updateOne(
    { _id: ObjectId("688ce146d2d5ff9616549d86") },
    { 
      $addToSet: { children: bernardoId },
      $set: { updatedAt: new Date() }
    }
  )
  
  console.log(`✅ Bernardo creado con ID: ${bernardoId}`)
  return bernardoId
}
```

---

### **PASO 3: Crear Niña Esteban con Cuestionario Completo**

```javascript
// Script: create-esteban.js
async function createEsteban() {
  const { db } = await connectToDatabase()
  
  // **DATOS REALES DE ESTEBAN BENAVIDES GARCÍA**
  const estebanData = {
    firstName: "Esteban", 
    lastName: "Benavides García",
    birthDate: "2021-02-12", // 12 febrero 2021 (2 años en feb 2023)
    parentId: "688ce146d2d5ff9616549d86",
    createdAt: new Date("2025-01-02T00:00:00Z"),
    updatedAt: new Date(),
    
    // **CUESTIONARIO COMPLETO CASO REAL ESTEBAN**
    surveyData: {
      completedAt: new Date("2025-01-02T10:00:00Z"),
      
      // INFORMACIÓN FAMILIAR
      informacionFamiliar: {
        papa: {
          nombre: "Esteban Benavides",
          edad: 35,
          ocupacion: "Ingeniero",
          direccion: "Pontevedra 205 Colonia Las Sendas de Galicia",
          ciudad: "Monterrey",
          telefono: "8183626323", 
          email: "benavides.esteban@gmail.com",
          trabajaFueraCasa: true,
          tieneAlergias: true,
          alergias: "Alergias varias"
        },
        mama: {
          nombre: "Raquel García",
          edad: 32,
          ocupacion: "Mamá de tiempo completo",
          mismaDireccionPapa: true, 
          direccion: "Pontevedra 205 Colonia Las Sendas de Galicia",
          ciudad: "Monterrey",
          telefono: "8182537057",
          email: "mgd.raquel@gmail.com",
          trabajaFueraCasa: false,
          puedeDormirConHijo: true,
          apetito: "Variable, cuando estoy estresada puedo comer más",
          pensamientosNegativos: true,
          tieneAlergias: true,
          alergias: "Ácaro, en tratamiento igual que Esteban"
        }
      },
      
      // DINÁMICA FAMILIAR
      dinamicaFamiliar: {
        cantidadHijos: 2,
        hijosInfo: [
          {
            nombre: "Esteban", 
            fechaNacimiento: "2021-02-12",
            edad: 24, // meses
            esElQueNecesitaAyuda: true
          },
          {
            nombre: "Raquel",
            fechaNacimiento: "2022-10-26", 
            edad: 3, // meses
            esElQueNecesitaAyuda: false
          }
        ],
        otrosEnCasa: "Ely (trabaja en casa desde que Esteban era bebé), enfermeras cuidando a Raquel",
        telefonoSeguimiento: "8182537057",
        emailObservaciones: "mgd.raquel@gmail.com",
        comoConocioServicios: "Mis amigas", 
        librosConsultados: "Ninguno",
        metodosEnContra: "No",
        asesorAnterior: "No",
        quienSeLevaantaNoche: "Ely o la enfermera (Celia). Si se despierta, entran, cambian pañal, le dicen que vuelva a dormir"
      },
      
      // HISTORIAL DEL NIÑO
      historial: {
        nombre: "Esteban Benavides García",
        fechaNacimiento: "2021-02-12",
        peso: 13,
        percentilPeso: 50,
        embarazoPlaneado: true,
        problemasEmbarazo: false, 
        problemasEmbarazoDescripcion: "",
        padecimientosEmbarazo: ["Ninguna"],
        tipoParto: "Cesárea",
        complicacionesParto: false,
        complicacionesPartoDescripcion: "",
        nacioPlazo: true,
        problemasAlNacer: false,
        problemasAlNacerDescripcion: "",
        pediatra: "Manuel Pérez - 8180316515",
        pediatraDescartaProblemas: false, // "No creo que sepa de eso"
        pediatraConfirmaCapacidadDormir: true,
        tratamientoMedico: true,
        tratamientoMedicoDescripcion: "Allegra, Montelukast, Avamys, Aerochamber (alergias), Vitamina D (inflamación), Polyvacc y Factor (defensas). Macrozit lunes/miércoles/viernes, inyecciones alergias martes/viernes"
      },
      
      // DESARROLLO Y SALUD
      desarrolloSalud: {
        edadRodar: 4, // No recuerda exacto "pero a tiempo" 
        edadSentarse: 6,
        edadGatear: 8,
        edadPararse: 9,
        edadCaminar: 12, // "Pasando el año"
        usoVaso: "Biberón",
        alimentacion: "Fórmula",
        comeSolidos: true,
        caracteristicas: ["Come de todo, no es picky", "A veces falta de interés", "Buen apetito cuando tiene hambre"]
      },
      
      // ACTIVIDAD FÍSICA  
      actividadFisica: {
        vePantallas: true,
        pantallasTiempo: "No todos los días. Cuando enfermo para nebulizar. Fines de semana 30 min máximo TV. Celular una vez/semana si chofer cuida",
        practicaActividad: false,
        actividades: "No practica actividad organizada",
        actividadesDespierto: "Juega mucho, le gusta pegarle a pelota, correr con niños, muy activo",
        signosIrritabilidad: false,
        situacionesSufridas: ["Alergias", "Rinitis Frecuente", "Nariz tapada", "Dermatitis atópica (primer invierno)"]
      },
      
      // RUTINA Y HÁBITOS DE SUEÑO (PROBLEMA DEL CHUPÓN)
      rutinaHabitos: {
        diaTypico: "7:00 AM despierta (si antes se queda ahí). Ely lo saca. Polyvacc, desayuna tardado, uniforme, papá colegio 8:30 AM. Recoge 1:10 PM cansado pero activo, come algo, cuna 1:30-1:45 PM. Despierta 3:30-3:45 PM. 4:00 PM come, parque. 6:45 PM cenar/medicinas. 7:30 PM rutina baño (batalla pijama, quiere jugar esconderse). Cuento, rezar, ruido blanco, cuna.",
        vaGuarderia: true,
        quienPasaTiempo: "Ely durante día, padres tarde",
        quienCuidaNoche: "Ely o enfermera", 
        dondeVurmePadresSalen: "En su cuna con Ely/enfermera",
        rutinaAntesAcostarse: "Baño (batalla), pijama (batalla jugar), cuento, rezar, ruido blanco",
        horaEspecificaDormir: true,
        horaDormir: "20:00", // Proceso 7:45 PM, cuna 8:00 PM
        seQuedaDormirSolo: true, // CON CHUPÓN
        oscuridadCuarto: ["Muy oscuro", "Blackout", "Todo apagado"],
        usaRuidoBlanco: true,
        temperaturaCuarto: "23 grados",
        tipoPiyama: "Pantalón largo y camisa manga larga algodón Carter's 2T",
        usaSacoDormir: false,
        seQuedaHastaConciliar: false, // Se duerme solo con chupón
        
        dondeDuermeNoche: "Cuna/corral en su cuarto",
        
        comparteHabitacion: false,
        conQuienComparte: "",
        intentaSalirCama: false,
        sacaDesCamaNohe: false,
        lloraAlDejarSolo: false, // No llora con chupón 
        golpeaCabeza: false,
        despiertaEnNoche: true, // A veces
        miendoOscuridad: false,
        padresMiedoOscuridad: false,
        temperamento: "Alegre, juguetón, se enoja si le cambian tema o quitan algo, se recupera rápido, mandón",
        reaccionDejarSolo: "Depende, a veces se va a jugar solo o dice que se vayan. Si despierta en cuna no le gusta que se vayan",
        metodosRelajarse: "Pedía biberón y chupón (PROBLEMA PRINCIPAL - dentista recomendó quitar chupón)",
        haceSiestas: true,
        
        otrosHijosProblemas: false,
        dondeViermesViaja: "Pack n play", 
        duermeMejorViaja: "Peor", // Se despierta muchas veces
        padresDispuestos: true,
        objetivosPadres: "Aprenda a dormirse en cuna sin chupón. Acostarlo 8:00 PM sin batallar tanto (parte de etapa toddler)",
        informacionAdicional: "Su hermana recién nació, la ama pero le ha afectado. Ha mejorado colegio, menos exhausto. A veces golpea suavemente a quien pasa, no le gusta compartir juguetes pero ya comparte más. Con padres más rabietas y pide más biberón."
      }
    }
  }
  
  // Crear el niño
  const result = await db.collection("children").insertOne(estebanData)
  const estebanId = result.insertedId
  
  // Actualizar usuario
  await db.collection("users").updateOne(
    { _id: ObjectId("688ce146d2d5ff9616549d86") },
    { 
      $addToSet: { children: estebanId },
      $set: { updatedAt: new Date() }
    }
  )
  
  console.log(`✅ Esteban creado con ID: ${estebanId}`)
  return estebanId
}
```

---

### **PASO 4: Generar 4 Semanas de Eventos Realistas**

```javascript
// Script: generate-realistic-events.js
async function generateEventsForChild(childId, childName, ageInMonths, startDate) {
  const { db } = await connectToDatabase()
  
  const events = []
  const currentDate = new Date(startDate)
  
  // Patrones por edad
  const patterns = getAgeBasedPatterns(ageInMonths)
  
  // Generar 28 días de eventos
  for (let day = 0; day < 28; day++) {
    const dayDate = new Date(currentDate)
    dayDate.setDate(currentDate.getDate() + day)
    
    // Patrón diario básico con variaciones realistas
    const dayEvents = generateDayEvents(childId, dayDate, patterns, childName)
    events.push(...dayEvents)
  }
  
  // Insertar todos los eventos
  if (events.length > 0) {
    await db.collection("events").insertMany(events)
    console.log(`✅ ${events.length} eventos generados para ${childName}`)
  }
  
  return events.length
}

function getAgeBasedPatterns(ageInMonths) {
  if (ageInMonths <= 12) {
    // Patrón Bernardo (8-9 meses) - Problemas de sueño
    return {
      sleepStart: { hour: 20, minute: 0, variance: 30 }, // 8:00 PM ±30min
      wakeUp: { hour: 8, minute: 0, variance: 60 }, // 8:00 AM ±1h  
      napTimes: [
        { hour: 10, minute: 30, duration: 90, variance: 30 }, // Siesta mañana
        { hour: 16, minute: 30, duration: 90, variance: 30 }  // Siesta tarde
      ],
      feedingTimes: [
        { hour: 9, minute: 45, type: "breakfast" },
        { hour: 12, minute: 0, type: "lunch" }, 
        { hour: 19, minute: 15, type: "dinner" }
      ],
      nightWakings: 6, // PROBLEMA: cada 30 min aprox
      nightWakingPattern: [22, 23, 0, 1, 2, 3, 4, 5, 6], // Horas de despertares
      mood: ["cansado", "irritable", "tranquilo"], // Más problemas
      sleepQuality: [2, 3] // Mala calidad por despertares
    }
  } else {
    // Patrón Esteban (24 meses) - Mejor sueño pero problema chupón
    return {
      sleepStart: { hour: 20, minute: 0, variance: 45 }, // 8:00 PM ±45min (batalla)
      wakeUp: { hour: 7, minute: 0, variance: 80 }, // 6:30-8:20 AM irregular
      napTimes: [
        { hour: 13, minute: 45, duration: 105, variance: 15 } // Una siesta 1:45-3:30
      ],
      feedingTimes: [
        { hour: 7, minute: 45, type: "breakfast" },
        { hour: 13, minute: 0, type: "lunch" },
        { hour: 18, minute: 45, type: "dinner" }
      ],
      nightWakings: 2, // Menos despertares
      nightWakingPattern: [23, 2, 5], // Ocasionales
      mood: ["feliz", "tranquilo", "irritable"], // Mejor humor general
      sleepQuality: [3, 4], // Mejor calidad
      tantrums: 0.3 // 30% días con rabietas (batalla pijama)
    }
  }
}

function generateDayEvents(childId, date, patterns, childName) {
  const events = []
  const userId = "688ce146d2d5ff9616549d86"
  
  // 1. SLEEP START (con variaciones realistas)
  const sleepVariance = (Math.random() - 0.5) * patterns.sleepStart.variance
  const sleepHour = patterns.sleepStart.hour + Math.floor(sleepVariance / 60)
  const sleepMinute = patterns.sleepStart.minute + (sleepVariance % 60)
  
  const sleepStartTime = new Date(date)
  sleepStartTime.setHours(sleepHour, sleepMinute, 0, 0)
  
  events.push({
    childId: ObjectId(childId),
    parentId: ObjectId(userId),
    eventType: "sleep_start",
    startTime: sleepStartTime,
    mood: patterns.mood[Math.floor(Math.random() * patterns.mood.length)],
    notes: generateSleepStartNote(childName, patterns),
    createdAt: sleepStartTime
  })
  
  // 2. NIGHT WAKINGS (patrón realista según edad)
  if (Math.random() < 0.7) { // 70% días tienen despertares
    const numWakings = Math.floor(Math.random() * patterns.nightWakings) + 1
    
    for (let i = 0; i < numWakings; i++) {
      const wakingHour = patterns.nightWakingPattern[
        Math.floor(Math.random() * patterns.nightWakingPattern.length)
      ]
      
      const nightWaking = new Date(sleepStartTime)
      nightWaking.setHours(wakingHour, Math.random() * 60, 0, 0)
      
      events.push({
        childId: ObjectId(childId),
        parentId: ObjectId(userId), 
        eventType: "night_waking",
        startTime: nightWaking,
        duration: 5 + Math.random() * 25, // 5-30 minutos
        notes: generateNightWakingNote(childName, patterns, wakingHour),
        createdAt: nightWaking
      })
    }
  }
  
  // 3. WAKE UP (mañana siguiente)
  const wakeVariance = (Math.random() - 0.5) * patterns.wakeUp.variance
  const wakeHour = patterns.wakeUp.hour + Math.floor(wakeVariance / 60)
  const wakeMinute = patterns.wakeUp.minute + (wakeVariance % 60)
  
  const wakeUpTime = new Date(date)
  wakeUpTime.setDate(date.getDate() + 1)
  wakeUpTime.setHours(wakeHour, wakeMinute, 0, 0)
  
  events.push({
    childId: ObjectId(childId),
    parentId: ObjectId(userId),
    eventType: "wake_up", 
    startTime: wakeUpTime,
    mood: patterns.mood[Math.floor(Math.random() * patterns.mood.length)],
    quality: patterns.sleepQuality[Math.floor(Math.random() * patterns.sleepQuality.length)],
    notes: generateWakeUpNote(childName, patterns),
    createdAt: wakeUpTime
  })
  
  // 4. FEEDING EVENTS
  patterns.feedingTimes.forEach(feedingTime => {
    const feedingDateTime = new Date(date)
    feedingDateTime.setHours(
      feedingTime.hour + Math.floor((Math.random() - 0.5) * 60), // ±30min variación
      feedingTime.minute + Math.floor((Math.random() - 0.5) * 30),
      0, 0
    )
    
    events.push({
      childId: ObjectId(childId),
      parentId: ObjectId(userId),
      eventType: "feeding",
      startTime: feedingDateTime,
      feedingType: getFeedingType(childName, feedingTime.type),
      duration: 15 + Math.random() * 25, // 15-40 minutos
      notes: generateFeedingNote(childName, feedingTime.type),
      createdAt: feedingDateTime
    })
  })
  
  // 5. NAP EVENTS 
  patterns.napTimes.forEach(napTime => {
    const napStart = new Date(date)
    napStart.setHours(napTime.hour, napTime.minute + Math.random() * napTime.variance, 0, 0)
    
    events.push({
      childId: ObjectId(childId),
      parentId: ObjectId(userId),
      eventType: "nap_start",
      startTime: napStart,
      notes: generateNapNote(childName, "start"),
      createdAt: napStart
    })
    
    const napEnd = new Date(napStart)
    napEnd.setMinutes(napEnd.getMinutes() + napTime.duration + Math.random() * napTime.variance)
    
    events.push({
      childId: ObjectId(childId),
      parentId: ObjectId(userId),
      eventType: "nap_end",
      startTime: napEnd,
      notes: generateNapNote(childName, "end"),
      createdAt: napEnd
    })
  })
  
  // 6. EVENTOS ESPECIALES (tantrums, medicamentos, etc.)
  if (patterns.tantrums && Math.random() < patterns.tantrums) {
    const tantrumTime = new Date(sleepStartTime)
    tantrumTime.setMinutes(tantrumTime.getMinutes() - 30) // Antes de dormir
    
    events.push({
      childId: ObjectId(childId),
      parentId: ObjectId(userId),
      eventType: "other",
      startTime: tantrumTime,
      duration: 15 + Math.random() * 20,
      notes: `${childName} tuvo rabieta durante rutina de baño/pijama. Quería jugar esconderse.`,
      mood: "irritable",
      createdAt: tantrumTime
    })
  }
  
  return events
}

// Funciones helper para notas realistas
function generateSleepStartNote(childName, patterns) {
  const notes = [
    `${childName} se durmió después de la rutina habitual`,
    `Rutina nocturna normal, ${childName} cooperativo`,
    `${childName} necesitó más arrullo hoy para dormirse`,
    `Se durmió rápido después de baño y cuento`,
    `${childName} batalló un poco para relajarse`
  ]
  return notes[Math.floor(Math.random() * notes.length)]
}

function generateNightWakingNote(childName, patterns, hour) {
  if (hour >= 22 && hour <= 23) {
    return `${childName} despertó temprano en la noche, se calmó con arrullo`
  } else if (hour >= 1 && hour <= 3) {
    return `${childName} despertar nocturno, posible toma nutritiva`
  } else {
    return `${childName} despertar breve, volvió a dormir`
  }
}

function getFeedingType(childName, mealType) {
  if (childName === "Bernardo") {
    return mealType === "breakfast" ? "solid_food" : "breast_milk"
  } else {
    return mealType === "lunch" ? "solid_food" : "solid_food" 
  }
}

// Script principal de ejecución
async function generateAllTestingData() {
  console.log("🚀 Iniciando generación de datos completos de testing")
  
  try {
    // Paso 1: Setup usuario
    await setupTestUser()
    
    // Paso 2: Crear Bernardo
    const bernardoId = await createBernardo()
    
    // Paso 3: Crear Esteban  
    const estebanId = await createEsteban()
    
    // Paso 4: Generar eventos Bernardo (8 meses)
    await generateEventsForChild(
      bernardoId, 
      "Bernardo", 
      8, 
      "2025-01-01"
    )
    
    // Paso 5: Generar eventos Esteban (24 meses)
    await generateEventsForChild(
      estebanId,
      "Esteban", 
      24,
      "2025-01-01" 
    )
    
    console.log("✅ ¡Datos de testing completos generados exitosamente!")
    console.log("📊 Datos creados:")
    console.log("   - Usuario test verificado/actualizado")  
    console.log("   - Bernardo García Rivas (8 meses) con cuestionario completo")
    console.log("   - Esteban Benavides García (24 meses) con cuestionario completo")
    console.log("   - ~4 semanas de eventos realistas para cada niño")
    console.log("   - Patrones de sueño diferenciados por edad")
    console.log("   - Variaciones realistas en horarios y comportamientos")
    
    console.log("\n💡 Para datos semanales adicionales usa:")
    console.log("   node populate-weekly-data.js 2025-01-29 2025-02-05")
    console.log("   node populate-weekly-data.js 2025-02-01 2025-02-07 Bernardo")
    console.log("   node populate-weekly-data.js 2025-02-01 2025-02-07 Esteban --force")
    
  } catch (error) {
    console.error("❌ Error generando datos:", error)
  }
}

// Ejecutar script principal
if (require.main === module) {
  generateAllTestingData()
}

module.exports = { 
  setupTestUser, 
  createBernardo, 
  createEsteban, 
  generateEventsForChild,
  generateAllTestingData 
}
```

---

## 📊 **DATOS GENERADOS**

### **Bernardo García Rivas (8 meses)**
- **Problema principal**: Despertares cada 30 minutos
- **Cuestionario**: Basado en caso real completo
- **Eventos**: Patrón problemático con 6+ despertares nocturnos
- **Patrones realistas**: Siestas en brazos, necesita pecho/arrullo

### **Esteban Benavides García (24 meses)**  
- **Problema principal**: Dependencia del chupón + rabietas
- **Cuestionario**: Basado en caso real con hermana recién nacida
- **Eventos**: Mejor sueño pero despertares tempranos irregulares
- **Patrones realistas**: Batallas pijama, horarios variables

### **Eventos por Semana (ambos niños)**
- **~200+ eventos** totales en 4 semanas
- **Patrones diferenciados** por edad y problemas específicos
- **Variaciones realistas** en horarios, humor, calidad de sueño
- **Eventos especiales**: Rabietas, medicamentos, despertares

---

## 🎯 **TESTING SCENARIOS HABILITADOS**

✅ **Plan 0 Generation**: Survey + estadísticas → Plan inicial  
✅ **Consulta Analysis**: Transcript → Análisis profesional  
✅ **Plan 1+ Generation**: Transcript analysis → Plan actualizado  
✅ **Dashboard Statistics**: Métricas realistas de progreso  
✅ **Comparative Analysis**: Dos niños diferentes edades/problemas  
✅ **Historical Tracking**: Evolución longitudinal de 4 semanas  

¡Listo para testing completo del flujo de pacientes! 🌟

---

## 📅 **SCRIPT SEMANAL PERSONALIZABLE**

### **populate-weekly-data.js - Generación por Rangos de Fechas**

```javascript
// Script: populate-weekly-data.js
// Uso: node populate-weekly-data.js [startDate] [endDate] [childName]
// Ejemplos:
//   node populate-weekly-data.js 2025-01-15 2025-01-21
//   node populate-weekly-data.js 2025-01-20 2025-01-27 Bernardo
//   node populate-weekly-data.js 2025-02-01 2025-02-07 Esteban

require('dotenv').config()
const { MongoClient, ObjectId } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI
const USER_ID = '688ce146d2d5ff9616549d86'

// Función principal
async function populateWeeklyData() {
  const args = process.argv.slice(2)
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp()
    return
  }
  
  try {
    console.log('🚀 Iniciando generación semanal de datos...')
    
    const client = new MongoClient(MONGODB_URI)
    await client.connect()
    console.log('✅ Conectado a MongoDB')
    
    const db = client.db()
    
    // Parsear argumentos
    const config = parseArguments(args)
    
    // Validar fechas
    if (!config.startDate || !config.endDate) {
      console.error('❌ Fechas inválidas. Formato: YYYY-MM-DD')
      showHelp()
      return
    }
    
    if (config.startDate >= config.endDate) {
      console.error('❌ Fecha inicio debe ser anterior a fecha fin')
      return
    }
    
    const daysDiff = Math.ceil((config.endDate - config.startDate) / (1000 * 60 * 60 * 24))
    console.log(`📊 Generando datos para ${daysDiff} días (${config.startDate.toISOString().split('T')[0]} → ${config.endDate.toISOString().split('T')[0]})`)
    
    // Buscar niños disponibles
    const availableChildren = await getAvailableChildren(db)
    
    if (availableChildren.length === 0) {
      console.error('❌ No se encontraron niños para el usuario test')
      console.log('💡 Ejecuta primero: node create-bernardo-esteban.js')
      return
    }
    
    console.log('\n👶 Niños disponibles:')
    availableChildren.forEach((child, i) => {
      const age = calculateAgeInMonths(child.birthDate)
      console.log(`   ${i + 1}. ${child.firstName} ${child.lastName} (${age} meses)`)
    })
    
    // Filtrar niños según parámetros
    let targetChildren = availableChildren
    if (config.childName) {
      targetChildren = availableChildren.filter(child => 
        child.firstName.toLowerCase().includes(config.childName.toLowerCase())
      )
      
      if (targetChildren.length === 0) {
        console.error(`❌ No se encontró niño con nombre: ${config.childName}`)
        return
      }
    }
    
    console.log(`\n🎯 Generando eventos para ${targetChildren.length} niño(s)...`)
    
    let totalEvents = 0
    const results = []
    
    // Generar eventos para cada niño
    for (const child of targetChildren) {
      const childAge = calculateAgeInMonths(child.birthDate)
      
      console.log(`\n📝 Procesando: ${child.firstName} ${child.lastName} (${childAge} meses)`)
      
      // Verificar duplicados
      const existingCount = await checkExistingEvents(db, child._id, config.startDate, config.endDate)
      if (existingCount > 0) {
        console.log(`⚠️  Encontrados ${existingCount} eventos existentes en el rango`)
        if (!config.force) {
          console.log('💡 Usa --force para sobrescribir o elige un rango diferente')
          continue
        }
        console.log('🔄 Modo --force: eliminando eventos existentes...')
        await deleteExistingEvents(db, child._id, config.startDate, config.endDate)
      }
      
      // Generar eventos para el rango
      const childEvents = await generateEventsForRange(
        db,
        child._id,
        child.firstName,
        childAge,
        config.startDate,
        config.endDate
      )
      
      totalEvents += childEvents
      results.push({
        name: `${child.firstName} ${child.lastName}`,
        age: childAge,
        events: childEvents
      })
      
      console.log(`✅ ${childEvents} eventos generados para ${child.firstName}`)
    }
    
    // Resumen final
    console.log('\n' + '='.repeat(60))
    console.log('🎉 GENERACIÓN COMPLETADA')
    console.log('='.repeat(60))
    console.log(`📅 Período: ${config.startDate.toISOString().split('T')[0]} → ${config.endDate.toISOString().split('T')[0]}`)
    console.log(`⏰ Días: ${daysDiff}`)
    console.log(`👶 Niños procesados: ${results.length}`)
    console.log(`📊 Total eventos: ${totalEvents}`)
    
    console.log('\n📋 Detalle por niño:')
    results.forEach(result => {
      console.log(`   • ${result.name}: ${result.events} eventos (${result.age} meses)`)
    })
    
    console.log('\n🔍 Para verificar los datos:')
    console.log('   db.events.find({parentId: ObjectId("' + USER_ID + '")}).count()')
    console.log('   db.events.find({parentId: ObjectId("' + USER_ID + '")}).sort({startTime: 1})')
    
    await client.close()
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
  }
}

// Parsear argumentos de línea de comandos
function parseArguments(args) {
  const config = {
    startDate: null,
    endDate: null,
    childName: null,
    force: false
  }
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    
    if (arg === '--force' || arg === '-f') {
      config.force = true
    } else if (arg === '--child' || arg === '-c') {
      config.childName = args[++i]
    } else if (!config.startDate && isValidDate(arg)) {
      config.startDate = new Date(arg + 'T00:00:00Z')
    } else if (!config.endDate && isValidDate(arg)) {
      config.endDate = new Date(arg + 'T23:59:59Z')
    } else if (!config.childName && !isValidDate(arg) && !arg.startsWith('-')) {
      config.childName = arg
    }
  }
  
  return config
}

// Validar formato de fecha
function isValidDate(dateString) {
  const regex = /^\d{4}-\d{2}-\d{2}$/
  if (!regex.test(dateString)) return false
  
  const date = new Date(dateString)
  return date instanceof Date && !isNaN(date)
}

// Obtener niños disponibles
async function getAvailableChildren(db) {
  const children = await db.collection('children')
    .find({ parentId: USER_ID })
    .sort({ createdAt: 1 })
    .toArray()
  
  return children
}

// Calcular edad en meses
function calculateAgeInMonths(birthDateString) {
  const birthDate = new Date(birthDateString)
  const now = new Date()
  
  const years = now.getFullYear() - birthDate.getFullYear()
  const months = now.getMonth() - birthDate.getMonth()
  
  return years * 12 + months
}

// Verificar eventos existentes en el rango
async function checkExistingEvents(db, childId, startDate, endDate) {
  const count = await db.collection('events').countDocuments({
    childId: new ObjectId(childId),
    startTime: {
      $gte: startDate,
      $lte: endDate
    }
  })
  
  return count
}

// Eliminar eventos existentes
async function deleteExistingEvents(db, childId, startDate, endDate) {
  const result = await db.collection('events').deleteMany({
    childId: new ObjectId(childId),
    startTime: {
      $gte: startDate,
      $lte: endDate
    }
  })
  
  console.log(`🗑️  Eliminados ${result.deletedCount} eventos existentes`)
}

// Generar eventos para un rango de fechas
async function generateEventsForRange(db, childId, childName, ageInMonths, startDate, endDate) {
  const events = []
  const currentDate = new Date(startDate)
  
  // Patrones por edad
  const patterns = getAgeBasedPatterns(ageInMonths)
  
  while (currentDate <= endDate) {
    const dayEvents = generateDayEvents(childId, currentDate, patterns, childName)
    events.push(...dayEvents)
    
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  // Insertar eventos en batch
  if (events.length > 0) {
    await db.collection('events').insertMany(events)
  }
  
  return events.length
}

// Patrones por edad (reutilizado del script principal)
function getAgeBasedPatterns(ageInMonths) {
  if (ageInMonths <= 12) {
    // Patrón Bernardo (8-9 meses) - Problemas de sueño
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
      nightWakings: 6,
      nightWakingPattern: [22, 23, 0, 1, 2, 3, 4, 5, 6],
      mood: ["cansado", "irritable", "tranquilo"],
      sleepQuality: [2, 3]
    }
  } else {
    // Patrón Esteban (24 meses) - Mejor sueño pero problema chupón
    return {
      sleepStart: { hour: 20, minute: 0, variance: 45 },
      wakeUp: { hour: 7, minute: 0, variance: 80 },
      napTimes: [
        { hour: 13, minute: 45, duration: 105, variance: 15 }
      ],
      feedingTimes: [
        { hour: 7, minute: 45, type: "breakfast" },
        { hour: 13, minute: 0, type: "lunch" },
        { hour: 18, minute: 45, type: "dinner" }
      ],
      nightWakings: 2,
      nightWakingPattern: [23, 2, 5],
      mood: ["feliz", "tranquilo", "irritable"],
      sleepQuality: [3, 4],
      tantrums: 0.3
    }
  }
}

// Generar eventos de un día (función simplificada)
function generateDayEvents(childId, date, patterns, childName) {
  const events = []
  const userId = USER_ID
  
  // Sleep start
  const sleepVariance = (Math.random() - 0.5) * patterns.sleepStart.variance
  const sleepHour = patterns.sleepStart.hour + Math.floor(sleepVariance / 60)
  const sleepMinute = patterns.sleepStart.minute + (sleepVariance % 60)
  
  const sleepStartTime = new Date(date)
  sleepStartTime.setHours(sleepHour, sleepMinute, 0, 0)
  
  events.push({
    childId: new ObjectId(childId),
    parentId: new ObjectId(userId),
    eventType: "sleep_start",
    startTime: sleepStartTime,
    mood: patterns.mood[Math.floor(Math.random() * patterns.mood.length)],
    notes: `${childName} se durmió después de la rutina nocturna`,
    createdAt: sleepStartTime
  })
  
  // Night wakings
  if (Math.random() < 0.7) {
    const numWakings = Math.floor(Math.random() * patterns.nightWakings) + 1
    
    for (let i = 0; i < numWakings; i++) {
      const wakingHour = patterns.nightWakingPattern[
        Math.floor(Math.random() * patterns.nightWakingPattern.length)
      ]
      
      const nightWaking = new Date(sleepStartTime)
      nightWaking.setHours(wakingHour, Math.random() * 60, 0, 0)
      
      events.push({
        childId: new ObjectId(childId),
        parentId: new ObjectId(userId),
        eventType: "night_waking",
        startTime: nightWaking,
        duration: 5 + Math.random() * 25,
        notes: `${childName} despertar nocturno`,
        createdAt: nightWaking
      })
    }
  }
  
  // Wake up (siguiente día)
  const wakeVariance = (Math.random() - 0.5) * patterns.wakeUp.variance
  const wakeHour = patterns.wakeUp.hour + Math.floor(wakeVariance / 60)
  const wakeMinute = patterns.wakeUp.minute + (wakeVariance % 60)
  
  const wakeUpTime = new Date(date)
  wakeUpTime.setDate(date.getDate() + 1)
  wakeUpTime.setHours(wakeHour, wakeMinute, 0, 0)
  
  events.push({
    childId: new ObjectId(childId),
    parentId: new ObjectId(userId),
    eventType: "wake_up",
    startTime: wakeUpTime,
    mood: patterns.mood[Math.floor(Math.random() * patterns.mood.length)],
    quality: patterns.sleepQuality[Math.floor(Math.random() * patterns.sleepQuality.length)],
    notes: `${childName} despertó para comenzar el día`,
    createdAt: wakeUpTime
  })
  
  // Feeding events
  patterns.feedingTimes.forEach(feedingTime => {
    const feedingDateTime = new Date(date)
    feedingDateTime.setHours(
      feedingTime.hour + Math.floor((Math.random() - 0.5) * 1),
      feedingTime.minute + Math.floor((Math.random() - 0.5) * 30),
      0, 0
    )
    
    events.push({
      childId: new ObjectId(childId),
      parentId: new ObjectId(userId),
      eventType: "feeding",
      startTime: feedingDateTime,
      feedingType: getFeedingType(childName, feedingTime.type),
      duration: 15 + Math.random() * 25,
      notes: `${childName} - ${feedingTime.type}`,
      createdAt: feedingDateTime
    })
  })
  
  // Nap events
  patterns.napTimes.forEach(napTime => {
    const napStart = new Date(date)
    napStart.setHours(napTime.hour, napTime.minute + Math.random() * napTime.variance, 0, 0)
    
    events.push({
      childId: new ObjectId(childId),
      parentId: new ObjectId(userId),
      eventType: "nap_start",
      startTime: napStart,
      notes: `${childName} inició siesta`,
      createdAt: napStart
    })
    
    const napEnd = new Date(napStart)
    napEnd.setMinutes(napEnd.getMinutes() + napTime.duration + Math.random() * napTime.variance)
    
    events.push({
      childId: new ObjectId(childId),
      parentId: new ObjectId(userId),
      eventType: "nap_end",
      startTime: napEnd,
      notes: `${childName} terminó siesta`,
      createdAt: napEnd
    })
  })
  
  // Tantrums (solo para niños mayores)
  if (patterns.tantrums && Math.random() < patterns.tantrums) {
    const tantrumTime = new Date(sleepStartTime)
    tantrumTime.setMinutes(tantrumTime.getMinutes() - 30)
    
    events.push({
      childId: new ObjectId(childId),
      parentId: new ObjectId(userId),
      eventType: "other",
      startTime: tantrumTime,
      duration: 15 + Math.random() * 20,
      notes: `${childName} tuvo rabieta durante rutina nocturna`,
      mood: "irritable",
      createdAt: tantrumTime
    })
  }
  
  return events
}

function getFeedingType(childName, mealType) {
  if (childName === "Bernardo") {
    return mealType === "breakfast" ? "solid_food" : "breast_milk"
  } else {
    return "solid_food"
  }
}

// Mostrar ayuda
function showHelp() {
  console.log(`
📅 SCRIPT SEMANAL PERSONALIZABLE - Happy Dreamers

🎯 Uso:
   node populate-weekly-data.js <startDate> <endDate> [childName] [opciones]

📝 Parámetros:
   startDate    Fecha inicio (formato YYYY-MM-DD)
   endDate      Fecha fin (formato YYYY-MM-DD)
   childName    Nombre del niño (opcional, por defecto todos)
   
🔧 Opciones:
   --force, -f      Sobrescribir eventos existentes
   --child, -c      Especificar nombre del niño
   --help, -h       Mostrar esta ayuda

💡 Ejemplos:
   node populate-weekly-data.js 2025-01-15 2025-01-21
   node populate-weekly-data.js 2025-01-20 2025-01-27 Bernardo
   node populate-weekly-data.js 2025-02-01 2025-02-07 Esteban --force
   node populate-weekly-data.js 2025-01-01 2025-01-07 --child Bernardo

👶 Niños disponibles:
   - Bernardo García Rivas (8 meses) - Problemas sueño severos
   - Esteban Benavides García (24 meses) - Dependencia chupón

📊 Eventos generados por día:
   - Sleep start/wake up con variaciones realistas
   - Night wakings según patrones de edad
   - 2-3 feeding events (breast milk / solid food)
   - Nap events (1-2 siestas según edad)
   - Eventos especiales (tantrums, otros)

⚠️  Notas:
   - Verifica duplicados automáticamente
   - Usa --force solo si estás seguro
   - Los patrones son realistas basados en casos reales
   - Genera ~10-15 eventos por día por niño
`)
}

// Ejecutar script
if (require.main === module) {
  populateWeeklyData()
}

module.exports = { populateWeeklyData, getAgeBasedPatterns }
```

### **Instrucciones de Uso del Script Semanal**

#### **Comandos Básicos:**

1. **Generar datos para una semana específica (ambos niños):**
   ```bash
   node populate-weekly-data.js 2025-01-15 2025-01-21
   ```

2. **Generar datos solo para Bernardo:**
   ```bash
   node populate-weekly-data.js 2025-01-20 2025-01-27 Bernardo
   ```

3. **Generar datos solo para Esteban:**
   ```bash
   node populate-weekly-data.js 2025-02-01 2025-02-07 Esteban
   ```

4. **Sobrescribir datos existentes:**
   ```bash
   node populate-weekly-data.js 2025-01-01 2025-01-07 --force
   ```

#### **Características del Script:**

✅ **Rango de fechas personalizable** - Cualquier período de días
✅ **Filtrado por niño** - Generar para uno o ambos niños
✅ **Detección de duplicados** - Previene datos duplicados automáticamente
✅ **Patrones realistas** - Diferenciados por edad y problemas específicos
✅ **Validación de entrada** - Verifica formato de fechas y parámetros
✅ **Resumen detallado** - Estadísticas de eventos generados
✅ **Help integrado** - `--help` para ver todas las opciones

#### **Casos de Uso Típicos:**

🎯 **Testing semanal regular:**
```bash
# Cada lunes generar nueva semana
node populate-weekly-data.js 2025-01-27 2025-02-03
```

🎯 **Testing de features específicas:**
```bash
# Solo Bernardo para testing de Plan 0 (problemas severos)
node populate-weekly-data.js 2025-02-01 2025-02-07 Bernardo

# Solo Esteban para testing de toddler behaviors
node populate-weekly-data.js 2025-02-01 2025-02-07 Esteban
```

🎯 **Testing de rangos largos:**
```bash
# Mes completo para análisis longitudinal
node populate-weekly-data.js 2025-02-01 2025-02-28
```

---

### **Integración con Testing Workflow**

Este script semanal se integra perfectamente con el flujo de testing:

1. **Ejecutar script principal una vez** → Crear Bernardo y Esteban con cuestionarios
2. **Usar script semanal regularmente** → Generar datos específicos por períodos
3. **Testing iterativo** → Probar diferentes escenarios semana a semana
4. **Análisis comparativo** → Datos diferenciados por edad y problemas

¡Ahora tienes control total sobre la generación de datos de testing! 🎉