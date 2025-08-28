/**
 * 📊 SAMPLE DATA GENERATOR - Happy Dreamers
 * 
 * Genera datos realistas para pruebas del flujo completo
 * Incluye: Survey, Eventos, Transcripts
 */

class SampleDataGenerator {
  constructor() {
    this.eventIdCounter = 1
  }

  /**
   * Survey completo con todas las respuestas (6 pasos)
   */
  get completeSurvey() {
    return {
      completed: true,
      lastUpdated: new Date(),
      
      // Step 1: Información Familiar
      familyInfo: {
        parentNames: ['María González', 'Juan Pérez'],
        parentAges: [32, 35],
        parentOccupations: ['Maestra', 'Ingeniero'],
        workSchedules: ['Mañana', 'Tiempo completo'],
        siblings: [
          {
            name: 'Carlos',
            age: 5,
            relationship: 'Hermano mayor'
          }
        ],
        homeAddress: 'Ciudad de México',
        livingArrangement: 'Casa propia',
        primaryLanguage: 'Español',
        secondaryLanguages: ['Inglés']
      },
      
      // Step 2: Historia del Niño
      childHistory: {
        // Embarazo y nacimiento
        pregnancyDuration: 39, // semanas
        pregnancyComplications: false,
        complicationsDetails: '',
        birthType: 'natural', // natural, cesarean, induced
        birthWeight: 3.2, // kg
        birthLength: 50, // cm
        apgarScore: 9,
        neonatalComplications: false,
        
        // Lactancia y alimentación temprana
        breastfeeding: true,
        breastfeedingDuration: 12, // meses
        formulaIntroduction: 0, // meses (0 = no formula)
        solidFoodIntroduction: 6, // meses
        feedingDifficulties: false,
        currentDiet: 'Variada y balanceada',
        
        // Historial médico
        hospitalizations: 0,
        chronicConditions: [],
        surgeries: [],
        significantIllnesses: ['Gripe a los 10 meses'],
        vaccinations: 'Al día',
        lastPediatricVisit: '2025-06-15'
      },
      
      // Step 3: Salud y Desarrollo
      healthDevelopment: {
        // Estado actual de salud
        currentWeight: 10.5, // kg para 18 meses
        currentHeight: 80, // cm
        headCircumference: 47, // cm
        
        // Medicamentos y alergias
        currentMedications: [],
        vitamins: ['Vitamina D'],
        allergies: ['Polvo', 'Polen'],
        foodIntolerances: [],
        
        // Hitos del desarrollo
        developmentMilestones: {
          socialSmile: 2, // meses
          headControl: 3,
          rolling: 5,
          sitting: 6,
          crawling: 8,
          standing: 10,
          walking: 12,
          firstWords: 10,
          twoWordPhrases: 16,
          pincerGrasp: 9,
          selfFeeding: 14,
          drinkingFromCup: 13
        },
        
        // Preocupaciones del desarrollo
        developmentConcerns: [],
        therapies: [],
        
        // Desarrollo sensorial
        vision: 'Normal',
        hearing: 'Normal',
        sensoryIssues: ['Sensibilidad a ruidos fuertes']
      },
      
      // Step 4: Rutina y Hábitos
      routineHabits: {
        // Horarios típicos
        typicalWakeTime: '07:00',
        typicalBedtime: '20:00',
        desiredWakeTime: '07:00',
        desiredBedtime: '20:00',
        
        // Siestas
        napsPerDay: 1,
        napTimes: ['13:00'],
        napDuration: [90], // minutos
        napLocation: 'Cuna en su cuarto',
        napDifficulty: 'Ocasional',
        
        // Rutina de dormir
        bedtimeRoutineSteps: [
          'Cena ligera',
          'Baño tibio',
          'Pijama',
          'Lectura de cuento',
          'Canción de cuna',
          'Besos de buenas noches'
        ],
        bedtimeRoutineDuration: 45, // minutos
        
        // Ambiente de sueño
        sleepLocation: 'own_room', // own_room, parents_room, shared_room
        sleepSurface: 'Cuna',
        roomTemperature: '20°C',
        roomDarkness: 'Oscuro con luz nocturna tenue',
        noiseLevel: 'Silencioso',
        sleepCompanions: ['Osito de peluche', 'Mantita'],
        
        // Comportamiento del sueño
        fallAsleepMethod: 'Solo después de rutina',
        averageTimeToSleep: 20, // minutos
        nightWakings: 1, // promedio por noche
        nightWakingResponse: 'Consuelo breve sin sacar de cuna',
        earlyMorningWaking: 'Ocasional (6:30 AM)',
        
        // Problemas de sueño
        sleepProblems: [
          'Resistencia ocasional a dormir',
          'Despertar nocturno ocasional'
        ],
        sleepProblemDuration: '2 meses',
        previousInterventions: ['Rutina más consistente']
      },
      
      // Step 5: Actividad Física
      physicalActivity: {
        // Actividad diaria
        dailyActivityHours: 2,
        outdoorTimeHours: 1.5,
        structuredActivities: ['Natación bebés (1 vez/semana)'],
        unstructuredPlayTime: 3, // horas
        
        // Tiempo de pantalla
        screenTimeHours: 0.5,
        screenTimeContent: ['Videos educativos'],
        screenTimeTiming: 'Solo en la mañana',
        
        // Actividades favoritas
        favoriteActivities: [
          'Jugar con bloques',
          'Correr en el parque',
          'Juegos de agua',
          'Libros interactivos'
        ],
        
        // Nivel de energía
        energyLevel: 'Alto', // Bajo, Medio, Alto, Muy alto
        energyPeakTimes: ['10:00', '16:00'],
        calmActivities: [
          'Colorear',
          'Rompecabezas',
          'Música suave'
        ],
        
        // Actividad antes de dormir
        eveningActivityLevel: 'Tranquila',
        lastActivePlayTime: '17:00',
        windDownActivities: [
          'Lectura',
          'Juego tranquilo',
          'Música relajante'
        ]
      },
      
      // Step 6: Dinámica Familiar
      familyDynamics: {
        // Estructura familiar
        familyStructure: 'nuclear', // nuclear, extended, single_parent, blended
        householdMembers: 4,
        primaryCaregiver: 'Madre',
        caregiverWorkSchedule: 'Medio tiempo',
        
        // Estilo de crianza
        parentingStyle: 'authoritative', // authoritative, authoritarian, permissive, uninvolved
        parentingConsistency: 'Generalmente consistente',
        disciplineApproach: 'Tiempo fuera y redirección',
        
        // Rutinas familiares
        familyMealTimes: ['08:00', '13:00', '18:30'],
        familyBedtimes: {
          child: '20:00',
          sibling: '21:00',
          parents: '22:30'
        },
        weekendRoutine: 'Similar con más flexibilidad',
        
        // Estrés familiar
        familyStressors: [
          'Horarios de trabajo',
          'Adaptación a hermano menor'
        ],
        recentChanges: ['Mudanza hace 3 meses'],
        supportSystem: 'Abuelos cerca, visitas semanales',
        
        // Cultura del sueño familiar
        familySleepPriority: 'Alta',
        parentSleepQuality: 'Regular',
        familySleepChallenges: ['Hermano mayor a veces despierta al bebé'],
        
        // Expectativas y metas
        sleepGoals: [
          'Dormir toda la noche sin despertares',
          'Mantener horario consistente',
          'Reducir tiempo para dormirse'
        ],
        parentCommitment: 'Alto',
        previousSleepTraining: 'Método de extinción gradual a los 12 meses'
      }
    }
  }

  /**
   * Genera eventos para un día típico
   */
  generateDayEvents(date) {
    const events = []
    
    // Despertar matutino (6:30 - 7:30 AM)
    const wakeTime = new Date(date)
    wakeTime.setHours(6 + Math.random(), Math.random() * 60, 0, 0)
    
    // Evento de despertar
    events.push({
      eventType: 'wake_up',
      startTime: wakeTime,
      endTime: wakeTime,
      emotionalState: this.randomFrom(['happy', 'calm', 'fussy']),
      quality: Math.floor(Math.random() * 2) + 3, // 3-5
      notes: this.randomFrom([
        'Despertó de buen humor',
        'Despertó llamando',
        'Despertó tranquilo',
        ''
      ])
    })
    
    // Siesta (12:30 - 2:00 PM)
    if (Math.random() > 0.2) { // 80% de días con siesta
      const napStart = new Date(date)
      napStart.setHours(12 + Math.random(), 30 + Math.random() * 30, 0, 0)
      
      const napDuration = 60 + Math.random() * 60 // 60-120 minutos
      const napEnd = new Date(napStart.getTime() + napDuration * 60000)
      
      events.push({
        eventType: 'nap_start',
        startTime: napStart,
        endTime: napEnd,
        duration: napDuration,
        emotionalState: 'calm',
        sleepDelay: Math.floor(Math.random() * 20), // 0-20 minutos
        quality: Math.floor(Math.random() * 2) + 3,
        notes: this.randomFrom([
          'Se durmió fácilmente',
          'Necesitó mecerlo',
          'Protestó un poco al inicio',
          ''
        ])
      })
      
      events.push({
        eventType: 'nap_end',
        startTime: napEnd,
        endTime: napEnd,
        emotionalState: this.randomFrom(['happy', 'calm', 'fussy']),
        notes: 'Despertó de la siesta'
      })
    }
    
    // Hora de dormir (19:30 - 20:30)
    const bedtime = new Date(date)
    bedtime.setHours(19 + Math.random(), 30 + Math.random() * 30, 0, 0)
    
    // Despertar nocturno ocasional (30% probabilidad)
    let nightWakingCount = 0
    if (Math.random() > 0.7) {
      nightWakingCount = Math.floor(Math.random() * 2) + 1 // 1-2 despertares
      
      const nightWaking = new Date(date)
      nightWaking.setHours(23 + Math.random() * 4, Math.random() * 60, 0, 0)
      
      events.push({
        eventType: 'night_waking',
        startTime: nightWaking,
        endTime: new Date(nightWaking.getTime() + 10 * 60000), // 10 minutos
        duration: 10,
        emotionalState: 'fussy',
        notes: this.randomFrom([
          'Pesadilla',
          'Sed',
          'Llamó a mamá',
          'Se calmó solo'
        ])
      })
    }
    
    events.push({
      eventType: 'bedtime',
      startTime: bedtime,
      endTime: new Date(date.getTime() + 24 * 60 * 60 * 1000 + 7 * 60 * 60 * 1000), // Hasta el próximo día 7 AM
      duration: 660, // 11 horas promedio
      emotionalState: 'calm',
      sleepDelay: 10 + Math.floor(Math.random() * 20), // 10-30 minutos
      nightWakingCount: nightWakingCount,
      quality: nightWakingCount > 0 ? 3 : 4,
      notes: this.randomFrom([
        'Rutina completa realizada',
        'Se durmió con su osito',
        'Protestó un poco al principio',
        'Se durmió más rápido que ayer',
        ''
      ])
    })
    
    return events
  }

  /**
   * Genera eventos mejorados (después de implementar plan)
   */
  generateImprovedDayEvents(date) {
    const events = []
    
    // Despertar más consistente (6:45 - 7:15 AM)
    const wakeTime = new Date(date)
    wakeTime.setHours(6, 45 + Math.random() * 30, 0, 0)
    
    events.push({
      eventType: 'wake_up',
      startTime: wakeTime,
      endTime: wakeTime,
      emotionalState: this.randomFrom(['happy', 'calm']), // Menos fussy
      quality: 4 + Math.floor(Math.random() * 2), // 4-5
      notes: 'Despertó descansado'
    })
    
    // Siesta más consistente
    const napStart = new Date(date)
    napStart.setHours(13, Math.random() * 15, 0, 0) // 13:00-13:15
    
    const napDuration = 60 + Math.random() * 30 // 60-90 minutos (más corta)
    const napEnd = new Date(napStart.getTime() + napDuration * 60000)
    
    events.push({
      eventType: 'nap_start',
      startTime: napStart,
      endTime: napEnd,
      duration: napDuration,
      emotionalState: 'calm',
      sleepDelay: Math.floor(Math.random() * 10), // 0-10 minutos (menos delay)
      quality: 4,
      notes: 'Se durmió con rutina establecida'
    })
    
    events.push({
      eventType: 'nap_end',
      startTime: napEnd,
      endTime: napEnd,
      emotionalState: 'happy',
      notes: 'Despertó bien de la siesta'
    })
    
    // Hora de dormir más consistente
    const bedtime = new Date(date)
    bedtime.setHours(20, Math.random() * 15, 0, 0) // 20:00-20:15
    
    // Menos despertares nocturnos (15% probabilidad)
    let nightWakingCount = 0
    if (Math.random() > 0.85) {
      nightWakingCount = 1 // Solo 1 despertar máximo
      
      const nightWaking = new Date(date)
      nightWaking.setHours(2 + Math.random() * 2, Math.random() * 60, 0, 0)
      
      events.push({
        eventType: 'night_waking',
        startTime: nightWaking,
        endTime: new Date(nightWaking.getTime() + 5 * 60000), // Solo 5 minutos
        duration: 5,
        emotionalState: 'calm',
        notes: 'Se auto-consoló rápidamente'
      })
    }
    
    events.push({
      eventType: 'bedtime',
      startTime: bedtime,
      endTime: new Date(date.getTime() + 24 * 60 * 60 * 1000 + 7 * 60 * 60 * 1000),
      duration: 660,
      emotionalState: 'calm',
      sleepDelay: 5 + Math.floor(Math.random() * 10), // 5-15 minutos (mejorado)
      nightWakingCount: nightWakingCount,
      quality: 5, // Excelente calidad
      notes: 'Mejora significativa en el patrón de sueño'
    })
    
    return events
  }

  /**
   * Transcript de consulta realista
   */
  get consultationTranscript() {
    return `
CONSULTA MÉDICA - SEGUIMIENTO PLAN DE SUEÑO
Fecha: ${new Date().toLocaleDateString()}
Participantes: Dra. López (Especialista en Sueño), María González (Madre), Juan Pérez (Padre)

[INICIO DE TRANSCRIPCIÓN]

Dra. López: Buenos días, María y Juan. ¿Cómo les ha ido con el plan de sueño que implementamos hace dos semanas?

María: Hola doctora. La verdad es que hemos visto mejoras significativas. Josefina se está durmiendo más rápido, antes tardaba hasta 30 minutos y ahora son como 15 minutos máximo.

Juan: Sí, y los despertares nocturnos han disminuido mucho. Antes se despertaba 2 o 3 veces, ahora máximo una vez, y a veces duerme toda la noche.

Dra. López: Excelente, eso es un progreso muy positivo. ¿Han notado algún patrón en los días que sí se despierta?

María: Mmmm, ahora que lo menciona, creo que se despierta más cuando no hace siesta completa, o cuando la siesta es muy tarde.

Dra. López: Muy buena observación. La siesta es crucial a esta edad. ¿A qué hora está haciendo siesta normalmente?

Juan: Tratamos que sea a la 1 PM, pero a veces se resiste y termina siendo a las 2 o 2:30.

Dra. López: Entiendo. Veo en los registros que la duración de la siesta varía entre 60 y 120 minutos. ¿Han notado diferencia en el sueño nocturno según la duración?

María: Sí, cuando duerme más de hora y media en la siesta, le cuesta más dormirse en la noche. Pero si duerme menos de una hora, está irritable toda la tarde.

Dra. López: Es un balance delicado. Les sugiero que empecemos a implementar una técnica de "fading" para la siesta. Vamos a reducir gradualmente la duración máxima de 90 a 60 minutos durante las próximas 2-3 semanas. Reduzcan 5 minutos cada 3 días.

Juan: ¿Y si se despierta muy molesta?

Dra. López: Si está muy irritable, pueden mantener esa duración 3 días más antes de continuar reduciendo. El objetivo es que su cuerpo se adapte gradualmente. Ahora, hábleme del ambiente de sueño. ¿Han hecho algún cambio?

María: Seguimos su consejo de mantener el cuarto más oscuro, pero todavía entra algo de luz por las cortinas.

Dra. López: Recomiendo invertir en cortinas blackout completas. He notado que Josefina parece ser especialmente sensible a la luz. Esto también ayudará con esos despertares a las 6:30 AM que mencionaron en el registro.

Juan: Tiene sentido. También queríamos preguntarle sobre el objeto de transición. Tiene un osito pero no siempre lo quiere.

Dra. López: Es normal. Les sugiero que durante el día jueguen con el osito, que sea parte de actividades positivas. Pónganle un nombre especial, "Señor Oso" o algo así, y que solo aparezca en momentos de calma y para dormir. Incluyanlo en la rutina de forma consistente.

María: ¿Y si lo rechaza?

Dra. López: No lo fuercen. Simplemente déjenlo en la cuna, disponible. Con el tiempo, la asociación positiva se formará. Ahora, revisemos la rutina nocturna. ¿Siguen los pasos que establecimos?

Juan: Sí, cena a las 6:30, baño a las 7:30, y tratamos de acostarla a las 8.

Dra. López: Perfecto. Solo un ajuste: veo que algunos días se duerme hasta las 8:30. Les sugiero ser flexibles con una ventana de 8:00 a 8:30. Si no tiene sueño a las 8, no la fuercen. Esperen 15 minutos más con actividades muy tranquilas.

María: Eso nos quita presión. A veces nos estresamos si no se duerme exactamente a las 8.

Dra. López: Exacto, el estrés de los padres lo perciben los niños. Ahora, sobre las pantallas...

Juan: Hemos eliminado completamente las pantallas después de las 6 PM como sugirió.

Dra. López: Excelente. ¿Han notado diferencia?

María: Sí, definitivamente está más tranquila en las tardes.

Dra. López: Perfecto. Mantengamos eso. Ahora, hay algunos puntos adicionales que quiero agregar al plan:

1. Para los despertares antes de las 6:30 AM: no interactúen con ella hasta esa hora. Pueden verificar que esté bien, pero no la saquen de la cuna.

2. Celebren los pequeños logros. Cuando duerma toda la noche, háganle saber en la mañana que están orgullosos.

3. Mantengan la consistencia incluso los fines de semana. Sé que es tentador ser flexibles, pero a esta edad la consistencia es clave.

Juan: ¿Y si tenemos un evento familiar o algo así?

Dra. López: Ocasionalmente está bien salirse de la rutina, pero traten de que no sea más de una vez por semana y vuelvan inmediatamente a la rutina normal.

María: Doctora, ¿cuándo deberíamos ver resultados más consistentes?

Dra. López: Con los ajustes que estamos haciendo hoy, especialmente el fading de la siesta y las cortinas blackout, deberían ver mejoras adicionales en 2-3 semanas. Programemos una llamada de seguimiento para dentro de 15 días.

Juan: Perfecto. ¿Hay algo más que debamos monitorear?

Dra. López: Sigan registrando los eventos de sueño como lo han hecho. Pongan especial atención a:
- Hora exacta de inicio de sueño
- Número y duración de despertares nocturnos
- Estado de ánimo al despertar
- Cualquier factor inusual (enfermedad, visitas, cambios de rutina)

María: Entendido. Muchas gracias doctora, nos sentimos mucho más confiados con estos ajustes.

Dra. López: Me alegra mucho escuchar sobre el progreso. Están haciendo un excelente trabajo. Recuerden, el sueño infantil no es lineal, habrá algunos retrocesos, pero la tendencia general debe ser positiva. ¿Alguna otra pregunta?

Juan: No, creo que está todo claro.

Dra. López: Perfecto. Los veo en dos semanas entonces. Si surge algo urgente antes, no duden en contactarme. Sigan con el excelente trabajo.

María y Juan: Muchas gracias doctora. Hasta luego.

[FIN DE TRANSCRIPCIÓN]

RESUMEN DE ACUERDOS:
1. Implementar técnica de fading para siesta (90 → 60 minutos en 3 semanas)
2. Instalar cortinas blackout completas
3. Introducir objeto de transición "Señor Oso" gradualmente
4. Flexibilizar ventana de sueño 20:00-20:30
5. No interactuar antes de 6:30 AM en despertares tempranos
6. Mantener prohibición de pantallas después de 18:00
7. Seguimiento en 15 días
    `
  }

  /**
   * Genera un plan esperado basado en datos
   */
  generateExpectedPlan(planNumber, planType) {
    const plans = {
      0: {
        title: 'Plan Inicial de Sueño',
        focus: 'Establecer rutinas básicas',
        keyPoints: [
          'Horario consistente 20:00',
          'Rutina de 30-45 minutos',
          'Siesta de 90 minutos a las 13:00',
          'Ambiente oscuro y fresco'
        ]
      },
      1: {
        title: 'Plan Actualizado - Primera Iteración',
        focus: 'Ajustes basados en patrones observados',
        keyPoints: [
          'Ventana flexible 20:00-20:15',
          'Reducción gradual de siesta',
          'Técnicas de auto-consuelo',
          'Optimización de ambiente'
        ]
      },
      '1.1': {
        title: 'Plan Refinado Post-Consulta',
        focus: 'Incorporación de recomendaciones profesionales',
        keyPoints: [
          'Técnica de fading para siesta',
          'Cortinas blackout',
          'Objeto de transición',
          'Manejo de despertares tempranos'
        ]
      }
    }
    
    return plans[planNumber] || plans[0]
  }

  /**
   * Helper: Seleccionar elemento aleatorio de array
   */
  randomFrom(array) {
    return array[Math.floor(Math.random() * array.length)]
  }
}

// Función exportada para facilitar uso
function generateSampleData() {
  const generator = new SampleDataGenerator()
  
  return {
    completeSurvey: generator.completeSurvey,
    consultationTranscript: generator.consultationTranscript,
    generateDayEvents: (date) => generator.generateDayEvents(date),
    generateImprovedDayEvents: (date) => generator.generateImprovedDayEvents(date),
    generateExpectedPlan: (num, type) => generator.generateExpectedPlan(num, type)
  }
}

module.exports = {
  SampleDataGenerator,
  generateSampleData
}