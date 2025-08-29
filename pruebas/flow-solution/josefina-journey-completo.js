const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://ventas:Piano81370211@cluster0.hf4ej.mongodb.net/happy-dreamers?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'happy-dreamers';

async function crearJourneyCompletoJosefina() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB');
    
    const db = client.db(DB_NAME);
    
    const josefinaId = new ObjectId('68b1e890cc3fa58befd037c3');
    const testUserId = new ObjectId('688ce146d2d5ff9616549d86'); // test@test.com
    const adminUserId = new ObjectId('687999869a879ac61e9fb873'); // admin@test.com
    
    console.log('🧹 LIMPIANDO DATOS EXISTENTES');
    console.log('=============================');
    
    // Limpiar eventos y planes existentes
    await db.collection('events').deleteMany({ childId: josefinaId });
    await db.collection('sleepPlans').deleteMany({ childId: josefinaId });
    await db.collection('consultation_transcripts').deleteMany({ childId: josefinaId });
    
    console.log('🗑️ Datos anteriores eliminados');
    
    console.log('\\n📈 CREANDO JOURNEY PROGRESIVO DE JOSEFINA');
    console.log('==========================================');
    
    // === FASE 1: EVENTOS INICIALES (Enero 1 - Enero 20, 2025) ===
    console.log('\\n📅 FASE 1: Eventos iniciales (Enero 1-20, 2025)');
    console.log('Problemas: Muchos despertares nocturnos, tardanza para dormir');
    
    const eventos = [];
    let currentDate = new Date('2025-01-01T00:00:00Z');
    const fase1End = new Date('2025-01-20T00:00:00Z');
    
    while (currentDate <= fase1End) {
      // Patrón problemático: muchos despertares, tardanza para dormir
      
      // BEDTIME (20:00-21:30) - más tarde de lo ideal
      const bedtimeDate = new Date(currentDate);
      bedtimeDate.setHours(20 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0);
      
      // SLEEP (30-90 min después) - mucha tardanza
      const sleepDelay = 30 + Math.floor(Math.random() * 60); // 30-90 min
      const sleepDate = new Date(bedtimeDate);
      sleepDate.setMinutes(sleepDate.getMinutes() + sleepDelay);
      
      // WAKE (6:00-8:00 siguiente día)
      const wakeDate = new Date(sleepDate);
      wakeDate.setDate(wakeDate.getDate() + 1);
      wakeDate.setHours(6 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0);
      
      // Eventos básicos
      eventos.push(
        {
          _id: new ObjectId(),
          childId: josefinaId,
          parentId: testUserId,
          type: 'bedtime',
          eventType: 'bedtime',
          startTime: bedtimeDate,
          endTime: sleepDate,
          duration: sleepDelay,
          emotionalState: Math.random() > 0.5 ? 'fussy' : 'crying',
          notes: 'Dificultad para conciliar el sueño',
          metadata: { sleepDelay: sleepDelay },
          createdAt: bedtimeDate
        },
        {
          _id: new ObjectId(),
          childId: josefinaId,
          parentId: testUserId,
          type: 'sleep',
          eventType: 'sleep',
          startTime: sleepDate,
          endTime: wakeDate,
          duration: Math.floor((wakeDate - sleepDate) / (1000 * 60)),
          emotionalState: 'calm',
          sleepDelay: sleepDelay,
          metadata: { sleepType: 'night' },
          createdAt: sleepDate
        }
      );
      
      // MÚLTIPLES DESPERTARES NOCTURNOS (2-4 por noche)
      const numDespertares = 2 + Math.floor(Math.random() * 3); // 2-4
      for (let i = 0; i < numDespertares; i++) {
        const despertarTime = new Date(sleepDate);
        despertarTime.setHours(sleepDate.getHours() + 1 + i * 2 + Math.floor(Math.random() * 2));
        
        if (despertarTime < wakeDate) {
          const backToSleepTime = new Date(despertarTime);
          backToSleepTime.setMinutes(despertarTime.getMinutes() + 10 + Math.floor(Math.random() * 30)); // 10-40 min
          
          eventos.push({
            _id: new ObjectId(),
            childId: josefinaId,
            parentId: testUserId,
            type: 'night_waking',
            eventType: 'night_waking',
            startTime: despertarTime,
            endTime: backToSleepTime,
            duration: Math.floor((backToSleepTime - despertarTime) / (1000 * 60)),
            emotionalState: Math.random() > 0.7 ? 'crying' : 'fussy',
            notes: `Despertar nocturno ${i + 1}`,
            awakeDelay: Math.floor((backToSleepTime - despertarTime) / (1000 * 60)),
            createdAt: despertarTime
          });
        }
      }
      
      // WAKE final
      eventos.push({
        _id: new ObjectId(),
        childId: josefinaId,
        parentId: testUserId,
        type: 'wake',
        eventType: 'wake',
        startTime: wakeDate,
        endTime: wakeDate,
        duration: 0,
        emotionalState: Math.random() > 0.6 ? 'fussy' : 'happy',
        notes: 'Despertar matutino',
        metadata: { morningWake: true },
        createdAt: wakeDate
      });
      
      // SIESTA (inconsistente en esta fase)
      if (Math.random() > 0.3) {
        const napStart = new Date(currentDate);
        napStart.setHours(13, 30 + Math.floor(Math.random() * 60), 0, 0);
        const napDuration = 30 + Math.floor(Math.random() * 90); // 30-120 min
        const napEnd = new Date(napStart);
        napEnd.setMinutes(napStart.getMinutes() + napDuration);
        
        eventos.push({
          _id: new ObjectId(),
          childId: josefinaId,
          parentId: testUserId,
          type: 'nap',
          eventType: 'nap',
          startTime: napStart,
          endTime: napEnd,
          duration: napDuration,
          emotionalState: Math.random() > 0.5 ? 'fussy' : 'calm',
          notes: 'Siesta irregular',
          metadata: { sleepType: 'nap' },
          createdAt: napStart
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log(`✅ Fase 1: ${eventos.length} eventos creados (problemas evidentes)`);
    
    // === INSERTAR EVENTOS FASE 1 ===
    await db.collection('events').insertMany(eventos);
    
    // === PLAN 0: EVALUACIÓN INICIAL (Enero 21, 2025) ===
    console.log('\\n📋 CREANDO PLAN 0: Evaluación Inicial (Enero 21, 2025)');
    
    const plan0 = {
      _id: new ObjectId(),
      childId: josefinaId,
      parentId: adminUserId, // Creado por admin
      title: 'Plan 0: Evaluación Inicial - Diagnóstico de Problemas',
      description: 'Evaluación inicial basada en 20 días de registros. Se identifican múltiples despertares nocturnos y dificultades para conciliar el sueño.',
      startDate: new Date('2025-01-21T00:00:00Z'),
      endDate: new Date('2025-02-20T00:00:00Z'),
      status: 'completed',
      aiRecommendations: [
        'Establecer horario fijo de acostarse: 20:00 máximo',
        'Crear rutina pre-sueño de 30 minutos con actividades calmantes',
        'Implementar técnica de extinción gradual para despertares nocturnos',
        'Mantener registro detallado para identificar patrones específicos'
      ],
      goals: [
        'Reducir despertares nocturnos de 3.2 promedio a máximo 2 por noche',
        'Disminuir tiempo para conciliar sueño de 60 minutos a 30 minutos',
        'Establecer rutina pre-sueño consistente'
      ],
      metrics: {
        baselineNightWakings: 3.2,
        targetNightWakings: 2.0,
        baselineSleepDelay: 60,
        targetSleepDelay: 30,
        baselineRoutineConsistency: 30,
        targetRoutineConsistency: 80
      },
      analysis: 'Análisis inicial revela patrón clásico de resistencia al sueño con múltiples despertares. Se requiere intervención estructurada.',
      createdAt: new Date('2025-01-21T08:00:00Z'),
      updatedAt: new Date('2025-02-20T00:00:00Z')
    };
    
    await db.collection('sleepPlans').insertOne(plan0);
    console.log('✅ Plan 0 creado por admin');
    
    // === FASE 2: IMPLEMENTACIÓN PLAN 0 (Enero 21 - Febrero 28, 2025) ===
    console.log('\\n📅 FASE 2: Implementación Plan 0 (Enero 21 - Feb 28, 2025)');
    console.log('Mejoras graduales: Menos despertares, mejor rutina');
    
    const eventos2 = [];
    currentDate = new Date('2025-01-21T00:00:00Z');
    const fase2End = new Date('2025-02-28T00:00:00Z');
    
    while (currentDate <= fase2End) {
      // Mejora gradual: horarios más consistentes, menos despertares
      
      // BEDTIME (19:30-20:30) - más temprano y consistente
      const bedtimeDate = new Date(currentDate);
      bedtimeDate.setHours(19, 30 + Math.floor(Math.random() * 60), 0, 0);
      
      // SLEEP (20-45 min después) - mejora gradual
      const sleepDelay = 20 + Math.floor(Math.random() * 25); // 20-45 min
      const sleepDate = new Date(bedtimeDate);
      sleepDate.setMinutes(sleepDate.getMinutes() + sleepDelay);
      
      // WAKE (6:30-7:30)
      const wakeDate = new Date(sleepDate);
      wakeDate.setDate(wakeDate.getDate() + 1);
      wakeDate.setHours(6, 30 + Math.floor(Math.random() * 60), 0, 0);
      
      eventos2.push(
        {
          _id: new ObjectId(),
          childId: josefinaId,
          parentId: testUserId,
          type: 'bedtime',
          eventType: 'bedtime',
          startTime: bedtimeDate,
          endTime: sleepDate,
          duration: sleepDelay,
          emotionalState: Math.random() > 0.7 ? 'fussy' : (Math.random() > 0.4 ? 'calm' : 'happy'),
          notes: 'Siguiendo rutina del Plan 0',
          metadata: { sleepDelay: sleepDelay, planActive: 'Plan 0' },
          createdAt: bedtimeDate
        },
        {
          _id: new ObjectId(),
          childId: josefinaId,
          parentId: testUserId,
          type: 'sleep',
          eventType: 'sleep',
          startTime: sleepDate,
          endTime: wakeDate,
          duration: Math.floor((wakeDate - sleepDate) / (1000 * 60)),
          emotionalState: 'calm',
          sleepDelay: sleepDelay,
          metadata: { sleepType: 'night', planActive: 'Plan 0' },
          createdAt: sleepDate
        }
      );
      
      // MENOS DESPERTARES (1-2 por noche) - mejora gradual
      const numDespertares = Math.random() > 0.6 ? 1 : (Math.random() > 0.3 ? 2 : 0);
      for (let i = 0; i < numDespertares; i++) {
        const despertarTime = new Date(sleepDate);
        despertarTime.setHours(sleepDate.getHours() + 2 + i * 3);
        
        if (despertarTime < wakeDate) {
          const backToSleepTime = new Date(despertarTime);
          backToSleepTime.setMinutes(despertarTime.getMinutes() + 5 + Math.floor(Math.random() * 15)); // 5-20 min
          
          eventos2.push({
            _id: new ObjectId(),
            childId: josefinaId,
            parentId: testUserId,
            type: 'night_waking',
            eventType: 'night_waking',
            startTime: despertarTime,
            endTime: backToSleepTime,
            duration: Math.floor((backToSleepTime - despertarTime) / (1000 * 60)),
            emotionalState: Math.random() > 0.6 ? 'fussy' : 'calm',
            notes: 'Despertar nocturno - menor duración',
            awakeDelay: Math.floor((backToSleepTime - despertarTime) / (1000 * 60)),
            createdAt: despertarTime
          });
        }
      }
      
      // WAKE
      eventos2.push({
        _id: new ObjectId(),
        childId: josefinaId,
        parentId: testUserId,
        type: 'wake',
        eventType: 'wake',
        startTime: wakeDate,
        endTime: wakeDate,
        duration: 0,
        emotionalState: Math.random() > 0.3 ? 'happy' : 'calm',
        notes: 'Despertar más descansada',
        metadata: { morningWake: true, planActive: 'Plan 0' },
        createdAt: wakeDate
      });
      
      // SIESTA más consistente
      if (Math.random() > 0.2) {
        const napStart = new Date(currentDate);
        napStart.setHours(13, 45 + Math.floor(Math.random() * 30), 0, 0); // Más consistente
        const napDuration = 60 + Math.floor(Math.random() * 60); // 60-120 min
        const napEnd = new Date(napStart);
        napEnd.setMinutes(napStart.getMinutes() + napDuration);
        
        eventos2.push({
          _id: new ObjectId(),
          childId: josefinaId,
          parentId: testUserId,
          type: 'nap',
          eventType: 'nap',
          startTime: napStart,
          endTime: napEnd,
          duration: napDuration,
          emotionalState: Math.random() > 0.8 ? 'fussy' : 'calm',
          notes: 'Siesta más regular - Plan 0',
          metadata: { sleepType: 'nap', planActive: 'Plan 0' },
          createdAt: napStart
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log(`✅ Fase 2: ${eventos2.length} eventos adicionales (mejoras evidentes)`);
    await db.collection('events').insertMany(eventos2);
    
    // Actualizar Plan 0 como completado
    await db.collection('sleepPlans').updateOne(
      { _id: plan0._id },
      {
        $set: {
          status: 'completed',
          metrics: {
            ...plan0.metrics,
            actualNightWakings: 1.6,
            actualSleepDelay: 32,
            actualRoutineConsistency: 75
          },
          completedAt: new Date('2025-02-28T00:00:00Z'),
          updatedAt: new Date('2025-02-28T00:00:00Z')
        }
      }
    );
    
    // === PLAN 1: CONSOLIDACIÓN (Marzo 1, 2025) ===
    console.log('\\n📋 CREANDO PLAN 1: Consolidación (Marzo 1, 2025)');
    
    const plan1 = {
      _id: new ObjectId(),
      childId: josefinaId,
      parentId: adminUserId,
      title: 'Plan 1: Consolidación del Sueño',
      description: 'Plan de consolidación basado en los avances del Plan 0. Enfoque en eliminar despertares restantes y optimizar calidad del sueño.',
      startDate: new Date('2025-03-01T00:00:00Z'),
      endDate: new Date('2025-04-15T00:00:00Z'),
      status: 'completed',
      aiRecommendations: [
        'Mantener rutina establecida pero optimizar timing',
        'Introducir objeto de transición (peluche favorito) para autoconsuelo',
        'Ajustar horario de siesta para no interferir con sueño nocturno',
        'Implementar técnica de verificaciones programadas para despertares'
      ],
      goals: [
        'Eliminar despertares nocturnos por completo (objetivo: 0-1 por semana)',
        'Reducir tiempo para dormir a menos de 20 minutos consistentemente',
        'Lograr siestas de duración óptima (90-120 minutos)'
      ],
      metrics: {
        baselineNightWakings: 1.6,
        targetNightWakings: 0.3,
        baselineSleepDelay: 32,
        targetSleepDelay: 20,
        baselineNapDuration: 75,
        targetNapDuration: 105
      },
      analysis: 'Plan 0 exitoso con reducción significativa de problemas. Plan 1 enfocado en consolidación y optimización.',
      createdAt: new Date('2025-03-01T08:00:00Z'),
      updatedAt: new Date('2025-04-15T00:00:00Z')
    };
    
    await db.collection('sleepPlans').insertOne(plan1);
    console.log('✅ Plan 1 creado por admin');
    
    // === FASE 3: IMPLEMENTACIÓN PLAN 1 (Marzo 1 - Abril 15, 2025) ===
    console.log('\\n📅 FASE 3: Implementación Plan 1 (Marzo 1 - Abril 15, 2025)');
    console.log('Consolidación: Sueño más estable, pocos despertares');
    
    const eventos3 = [];
    currentDate = new Date('2025-03-01T00:00:00Z');
    const fase3End = new Date('2025-04-15T00:00:00Z');
    
    while (currentDate <= fase3End) {
      // Sueño consolidado: horarios muy consistentes, mínimos despertares
      
      const bedtimeDate = new Date(currentDate);
      bedtimeDate.setHours(19, 45 + Math.floor(Math.random() * 15), 0, 0); // 19:45-20:00
      
      const sleepDelay = 15 + Math.floor(Math.random() * 15); // 15-30 min
      const sleepDate = new Date(bedtimeDate);
      sleepDate.setMinutes(sleepDate.getMinutes() + sleepDelay);
      
      const wakeDate = new Date(sleepDate);
      wakeDate.setDate(wakeDate.getDate() + 1);
      wakeDate.setHours(7, Math.floor(Math.random() * 15), 0, 0); // 7:00-7:15
      
      eventos3.push(
        {
          _id: new ObjectId(),
          childId: josefinaId,
          parentId: testUserId,
          type: 'bedtime',
          eventType: 'bedtime',
          startTime: bedtimeDate,
          endTime: sleepDate,
          duration: sleepDelay,
          emotionalState: Math.random() > 0.8 ? 'fussy' : (Math.random() > 0.3 ? 'calm' : 'happy'),
          notes: 'Rutina consolidada - Plan 1',
          metadata: { sleepDelay: sleepDelay, planActive: 'Plan 1' },
          createdAt: bedtimeDate
        },
        {
          _id: new ObjectId(),
          childId: josefinaId,
          parentId: testUserId,
          type: 'sleep',
          eventType: 'sleep',
          startTime: sleepDate,
          endTime: wakeDate,
          duration: Math.floor((wakeDate - sleepDate) / (1000 * 60)),
          emotionalState: 'calm',
          sleepDelay: sleepDelay,
          metadata: { sleepType: 'night', planActive: 'Plan 1' },
          createdAt: sleepDate
        }
      );
      
      // MUY POCOS DESPERTARES (0-1 por noche, mayoría sin despertares)
      if (Math.random() > 0.7) { // Solo 30% de las noches tienen despertar
        const despertarTime = new Date(sleepDate);
        despertarTime.setHours(sleepDate.getHours() + 4 + Math.floor(Math.random() * 2));
        
        if (despertarTime < wakeDate) {
          const backToSleepTime = new Date(despertarTime);
          backToSleepTime.setMinutes(despertarTime.getMinutes() + 5 + Math.floor(Math.random() * 10)); // 5-15 min
          
          eventos3.push({
            _id: new ObjectId(),
            childId: josefinaId,
            parentId: testUserId,
            type: 'night_waking',
            eventType: 'night_waking',
            startTime: despertarTime,
            endTime: backToSleepTime,
            duration: Math.floor((backToSleepTime - despertarTime) / (1000 * 60)),
            emotionalState: 'calm',
            notes: 'Despertar breve - se autoconsuelo rápidamente',
            awakeDelay: Math.floor((backToSleepTime - despertarTime) / (1000 * 60)),
            createdAt: despertarTime
          });
        }
      }
      
      // WAKE
      eventos3.push({
        _id: new ObjectId(),
        childId: josefinaId,
        parentId: testUserId,
        type: 'wake',
        eventType: 'wake',
        startTime: wakeDate,
        endTime: wakeDate,
        duration: 0,
        emotionalState: Math.random() > 0.2 ? 'happy' : 'calm',
        notes: 'Despertar descansada y feliz',
        metadata: { morningWake: true, planActive: 'Plan 1' },
        createdAt: wakeDate
      });
      
      // SIESTA ÓPTIMA
      const napStart = new Date(currentDate);
      napStart.setHours(13, 15 + Math.floor(Math.random() * 30), 0, 0); // 13:15-13:45
      const napDuration = 90 + Math.floor(Math.random() * 30); // 90-120 min
      const napEnd = new Date(napStart);
      napEnd.setMinutes(napStart.getMinutes() + napDuration);
      
      eventos3.push({
        _id: new ObjectId(),
        childId: josefinaId,
        parentId: testUserId,
        type: 'nap',
        eventType: 'nap',
        startTime: napStart,
        endTime: napEnd,
        duration: napDuration,
        emotionalState: 'calm',
        notes: 'Siesta óptima - Plan 1',
        metadata: { sleepType: 'nap', planActive: 'Plan 1' },
        createdAt: napStart
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log(`✅ Fase 3: ${eventos3.length} eventos adicionales (sueño consolidado)`);
    await db.collection('events').insertMany(eventos3);
    
    // === CREAR TRANSCRIPCIÓN DE CONSULTA PARA PLAN 1.1 ===
    console.log('\\n💬 CREANDO TRANSCRIPCIÓN DE CONSULTA (Abril 16, 2025)');
    
    const consultaTranscript = {
      _id: new ObjectId(),
      childId: josefinaId,
      parentId: testUserId,
      consultationDate: new Date('2025-04-16T10:00:00Z'),
      transcript: `
CONSULTA DE SEGUIMIENTO - JOSEFINA GARCÍA
Fecha: 16 de abril, 2025
Duración: 25 minutos
Participantes: Madre (test@test.com) y Dr. Assistant

[10:00] MADRE: Buenos días doctor. Quería hacer seguimiento del Plan 1 que implementamos en marzo.

[10:01] DR. ASSISTANT: Buenos días. Me da mucho gusto escucharla. ¿Cómo ha ido la implementación del Plan 1 de consolidación?

[10:02] MADRE: Ha funcionado muy bien en general. Los despertares nocturnos prácticamente desaparecieron. Josefina ahora duerme toda la noche la mayoría de días.

[10:03] DR. ASSISTANT: Excelente progreso. Según veo en los registros, hemos pasado de 1.6 despertares promedio a aproximadamente 0.4. ¿Hay algún aspecto que le preocupe?

[10:04] MADRE: Bueno, hay dos cosas. Primero, algunos días todavía tarda hasta 30 minutos en dormirse, especialmente después de días muy estimulantes.

[10:05] DR. ASSISTANT: Es normal que haya cierta variabilidad. ¿Qué tipo de días nota que son más estimulantes?

[10:06] MADRE: Los fines de semana cuando salimos al parque, o cuando tiene visitas de los abuelos. También cuando cambiamos rutinas.

[10:07] DR. ASSISTANT: Perfecto, eso me da una pista importante. ¿Y cuál es la segunda preocupación?

[10:08] MADRE: Las siestas. Algunas veces son muy largas, de más de 2 horas, y otras muy cortas. No sé si eso afecta el sueño nocturno.

[10:09] DR. ASSISTANT: Buena observación. Las siestas inconsistentes pueden crear cierta variabilidad en el sueño nocturno. ¿Ha notado algún patrón?

[10:11] MADRE: Creo que cuando duerme siesta muy larga, después le cuesta más trabajo dormirse en la noche.

[10:12] DR. ASSISTANT: Exactamente. Esa es una conexión muy importante que ha identificado. Vamos a trabajar en optimizar ese balance.

[10:13] MADRE: ¿Qué sugiere?

[10:14] DR. ASSISTANT: Propongo crear un Plan 1.1 de refinamiento que se enfoque en dos áreas: gestión de activación después de días estimulantes y optimización del timing de siestas.

[10:15] MADRE: Me parece perfecto. ¿Cómo funcionaría?

[10:16] DR. ASSISTANT: Para días estimulantes, implementaremos una "rutina de desactivación extendida" de 45 minutos en lugar de 30, con actividades extra calmantes.

[10:17] MADRE: ¿Como qué actividades?

[10:18] DR. ASSISTANT: Baño tibio, masaje suave, música muy suave, y perhaps dimming progresivo de luces comenzando más temprano.

[10:19] MADRE: Y para las siestas?

[10:20] DR. ASSISTANT: Vamos a establecer un límite máximo de siesta de 90 minutos, y un horario fijo de inicio entre 1:00 y 1:30 PM.

[10:21] MADRE: ¿Y si todavía tiene sueño después de 90 minutos?

[10:22] DR. ASSISTANT: Es mejor despertar suavemente y compensar con hora de dormir ligeramente más temprana esa noche. Esto mantendrá el balance.

[10:23] MADRE: Suena lógico. ¿Cuánto tiempo implementamos esto?

[10:24] DR. ASSISTANT: Sugiero 6 semanas, hasta finales de mayo. Después evaluamos y posiblemente pasamos a un plan de mantenimiento a largo plazo.

[10:25] MADRE: Perfecto doctor. Me siento muy confiada con el progreso de Josefina. Gracias por su ayuda.

[10:25] DR. ASSISTANT: Ha sido un placer acompañarla en este proceso. Josefina ha tenido un progreso excepcional gracias a su consistencia. Nos vemos en el seguimiento.

FIN DE CONSULTA
      `,
      summary: 'Consulta de seguimiento exitosa. Plan 1 funcionó bien con reducción significativa de despertares nocturnos. Se identificaron oportunidades de refinamiento en gestión de días estimulantes y optimización de siestas. Se propone Plan 1.1.',
      recommendations: [
        'Implementar rutina de desactivación extendida para días estimulantes',
        'Establecer límite máximo de siesta de 90 minutos',
        'Horario fijo de siesta entre 1:00-1:30 PM',
        'Compensar siestas cortas con hora de dormir más temprana'
      ],
      nextSteps: ['Crear Plan 1.1 de refinamiento', 'Implementar por 6 semanas', 'Evaluar para plan de mantenimiento'],
      createdAt: new Date('2025-04-16T10:25:00Z')
    };
    
    await db.collection('consultation_transcripts').insertOne(consultaTranscript);
    console.log('✅ Transcripción de consulta creada');
    
    // === PLAN 1.1: REFINAMIENTO (Abril 17, 2025) ===
    console.log('\\n📋 CREANDO PLAN 1.1: Refinamiento (Abril 17, 2025)');
    
    const plan11 = {
      _id: new ObjectId(),
      childId: josefinaId,
      parentId: adminUserId,
      title: 'Plan 1.1: Refinamiento Basado en Consulta',
      description: 'Plan de refinamiento desarrollado a partir de consulta del 16 de abril. Enfoque en optimización de siestas y gestión de días estimulantes.',
      startDate: new Date('2025-04-17T00:00:00Z'),
      endDate: new Date('2025-05-31T00:00:00Z'),
      status: 'active',
      consultationTranscriptId: consultaTranscript._id,
      aiRecommendations: [
        'Rutina de desactivación extendida (45 min) para días estimulantes',
        'Límite máximo de siesta: 90 minutos',
        'Horario fijo de siesta: 1:00-1:30 PM',
        'Despertar suave si siesta excede 90 minutos',
        'Compensar siestas cortas con hora de dormir más temprana'
      ],
      goals: [
        'Reducir variabilidad en tiempo para dormir después de días estimulantes',
        'Optimizar duración de siestas (objetivo: 75-90 minutos)',
        'Mantener consistencia en sueño nocturno independientemente de actividades diurnas'
      ],
      metrics: {
        baselineNightWakings: 0.3,
        targetNightWakings: 0.2,
        baselineSleepDelay: 22,
        targetSleepDelay: 18,
        baselineNapDuration: 105,
        targetNapDuration: 85,
        napConsistency: 0.6,
        targetNapConsistency: 0.9
      },
      analysis: 'Plan basado en análisis de transcripción de consulta. Enfoque en refinamientos específicos identificados por la madre.',
      derivedFrom: {
        consultationId: consultaTranscript._id,
        previousPlan: plan1._id,
        refinementType: 'consultation_based'
      },
      createdAt: new Date('2025-04-17T09:00:00Z'),
      updatedAt: new Date()
    };
    
    await db.collection('sleepPlans').insertOne(plan11);
    console.log('✅ Plan 1.1 creado basado en transcripción de consulta');
    
    // === FASE 4: IMPLEMENTACIÓN PLAN 1.1 (Abril 17 - Agosto 29, 2025) ===
    console.log('\\n📅 FASE 4: Implementación Plan 1.1 (Abril 17 - Agosto 29, 2025)');
    console.log('Refinamiento: Sueño optimizado, siestas consistentes');
    
    const eventos4 = [];
    currentDate = new Date('2025-04-17T00:00:00Z');
    const fase4End = new Date('2025-08-29T00:00:00Z');
    
    while (currentDate <= fase4End) {
      // Sueño refinado: máxima consistencia, siestas optimizadas
      
      const bedtimeDate = new Date(currentDate);
      bedtimeDate.setHours(19, 45 + Math.floor(Math.random() * 10), 0, 0); // 19:45-19:55
      
      const sleepDelay = 12 + Math.floor(Math.random() * 12); // 12-24 min
      const sleepDate = new Date(bedtimeDate);
      sleepDate.setMinutes(sleepDate.getMinutes() + sleepDelay);
      
      const wakeDate = new Date(sleepDate);
      wakeDate.setDate(wakeDate.getDate() + 1);
      wakeDate.setHours(7, Math.floor(Math.random() * 10), 0, 0); // 7:00-7:10
      
      eventos4.push(
        {
          _id: new ObjectId(),
          childId: josefinaId,
          parentId: testUserId,
          type: 'bedtime',
          eventType: 'bedtime',
          startTime: bedtimeDate,
          endTime: sleepDate,
          duration: sleepDelay,
          emotionalState: Math.random() > 0.9 ? 'fussy' : (Math.random() > 0.2 ? 'calm' : 'happy'),
          notes: 'Rutina refinada - Plan 1.1',
          metadata: { sleepDelay: sleepDelay, planActive: 'Plan 1.1' },
          createdAt: bedtimeDate
        },
        {
          _id: new ObjectId(),
          childId: josefinaId,
          parentId: testUserId,
          type: 'sleep',
          eventType: 'sleep',
          startTime: sleepDate,
          endTime: wakeDate,
          duration: Math.floor((wakeDate - sleepDate) / (1000 * 60)),
          emotionalState: 'calm',
          sleepDelay: sleepDelay,
          metadata: { sleepType: 'night', planActive: 'Plan 1.1' },
          createdAt: sleepDate
        }
      );
      
      // DESPERTARES MÍNIMOS (solo 20% de las noches)
      if (Math.random() > 0.8) {
        const despertarTime = new Date(sleepDate);
        despertarTime.setHours(sleepDate.getHours() + 5);
        
        if (despertarTime < wakeDate) {
          const backToSleepTime = new Date(despertarTime);
          backToSleepTime.setMinutes(despertarTime.getMinutes() + 3 + Math.floor(Math.random() * 7)); // 3-10 min
          
          eventos4.push({
            _id: new ObjectId(),
            childId: josefinaId,
            parentId: testUserId,
            type: 'night_waking',
            eventType: 'night_waking',
            startTime: despertarTime,
            endTime: backToSleepTime,
            duration: Math.floor((backToSleepTime - despertarTime) / (1000 * 60)),
            emotionalState: 'calm',
            notes: 'Autoconsuelo rápido - Plan 1.1',
            awakeDelay: Math.floor((backToSleepTime - despertarTime) / (1000 * 60)),
            createdAt: despertarTime
          });
        }
      }
      
      // WAKE
      eventos4.push({
        _id: new ObjectId(),
        childId: josefinaId,
        parentId: testUserId,
        type: 'wake',
        eventType: 'wake',
        startTime: wakeDate,
        endTime: wakeDate,
        duration: 0,
        emotionalState: 'happy',
        notes: 'Despertar descansada - Plan 1.1',
        metadata: { morningWake: true, planActive: 'Plan 1.1' },
        createdAt: wakeDate
      });
      
      // SIESTA OPTIMIZADA (75-90 min, horario fijo)
      const napStart = new Date(currentDate);
      napStart.setHours(13, 15 + Math.floor(Math.random() * 15), 0, 0); // 13:15-13:30
      const napDuration = 75 + Math.floor(Math.random() * 15); // 75-90 min
      const napEnd = new Date(napStart);
      napEnd.setMinutes(napStart.getMinutes() + napDuration);
      
      eventos4.push({
        _id: new ObjectId(),
        childId: josefinaId,
        parentId: testUserId,
        type: 'nap',
        eventType: 'nap',
        startTime: napStart,
        endTime: napEnd,
        duration: napDuration,
        emotionalState: 'calm',
        notes: 'Siesta optimizada - Plan 1.1',
        metadata: { sleepType: 'nap', planActive: 'Plan 1.1' },
        createdAt: napStart
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log(`✅ Fase 4: ${eventos4.length} eventos adicionales (sueño refinado y optimizado)`);
    await db.collection('events').insertMany(eventos4);
    
    // Actualizar niño con plan activo
    await db.collection('children').updateOne(
      { _id: josefinaId },
      {
        $set: {
          activePlan: {
            planId: plan11._id,
            startDate: new Date('2025-04-17T00:00:00Z'),
            status: 'active'
          },
          updatedAt: new Date()
        }
      }
    );
    
    // Completar Plan 1
    await db.collection('sleepPlans').updateOne(
      { _id: plan1._id },
      {
        $set: {
          status: 'completed',
          metrics: {
            ...plan1.metrics,
            actualNightWakings: 0.4,
            actualSleepDelay: 22,
            actualNapDuration: 105
          },
          completedAt: new Date('2025-04-16T00:00:00Z'),
          updatedAt: new Date('2025-04-16T00:00:00Z')
        }
      }
    );
    
    // === VERIFICACIÓN FINAL ===
    const totalEvents = await db.collection('events').countDocuments({ childId: josefinaId });
    const totalPlans = await db.collection('sleepPlans').countDocuments({ childId: josefinaId });
    const totalTranscripts = await db.collection('consultation_transcripts').countDocuments({ childId: josefinaId });
    
    console.log('\\n🎉 ¡JOURNEY COMPLETO DE JOSEFINA CREADO!');
    console.log('=======================================');
    console.log(`👶 Niña: Josefina García`);
    console.log(`📊 Total eventos: ${totalEvents}`);
    console.log(`📋 Total planes: ${totalPlans}`);
    console.log(`💬 Transcripciones: ${totalTranscripts}`);
    console.log(`⏰ Período completo: Enero 1 - Agosto 29, 2025`);
    console.log('');
    console.log('📈 JOURNEY PROGRESIVO:');
    console.log('======================');
    console.log('🔴 FASE 1 (Ene 1-20): Problemas severos');
    console.log('   - Despertares: 3.2 por noche');
    console.log('   - Tardanza para dormir: 60 min');
    console.log('   - Estado: Problemático');
    console.log('');
    console.log('📋 PLAN 0 (Ene 21): Evaluación inicial por admin');
    console.log('   - Diagnóstico de problemas identificados');
    console.log('   - Objetivos: Reducir despertares y tardanza');
    console.log('');
    console.log('🟡 FASE 2 (Ene 21-Feb 28): Implementación Plan 0');
    console.log('   - Despertares: 3.2 → 1.6 por noche');
    console.log('   - Tardanza para dormir: 60 → 32 min');
    console.log('   - Estado: Mejorando gradualmente');
    console.log('');
    console.log('📋 PLAN 1 (Mar 1): Consolidación por admin');
    console.log('   - Enfoque en eliminar despertares restantes');
    console.log('   - Optimizar calidad del sueño');
    console.log('');
    console.log('🟢 FASE 3 (Mar 1-Abr 15): Implementación Plan 1');
    console.log('   - Despertares: 1.6 → 0.4 por noche');
    console.log('   - Tardanza para dormir: 32 → 22 min');
    console.log('   - Estado: Sueño consolidado');
    console.log('');
    console.log('💬 CONSULTA (Abr 16): Seguimiento con madre');
    console.log('   - Evaluación de progreso');
    console.log('   - Identificación de refinamientos necesarios');
    console.log('   - Transcripción detallada guardada');
    console.log('');
    console.log('📋 PLAN 1.1 (Abr 17): Refinamiento basado en consulta');
    console.log('   - Gestión de días estimulantes');
    console.log('   - Optimización de siestas');
    console.log('');
    console.log('✅ FASE 4 (Abr 17-Ago 29): Implementación Plan 1.1');
    console.log('   - Despertares: 0.4 → 0.2 por noche');
    console.log('   - Tardanza para dormir: 22 → 18 min');
    console.log('   - Siestas: Optimizadas a 75-90 min');
    console.log('   - Estado: ÓPTIMO - Sueño refinado');
    console.log('');
    console.log('🏆 RESULTADO FINAL: ÉXITO TOTAL');
    console.log('- Journey coherente y progresivo');
    console.log('- Planes evolutivos basados en datos');
    console.log('- Transcripción real de consulta');
    console.log('- Visible desde admin@test.com en /dashboard/consultas');
    console.log('');
    console.log('🎯 ACCESO PARA VERIFICACIÓN:');
    console.log('- Admin: admin@test.com / password');
    console.log('- Usuario: test@test.com / password');
    console.log('- URL consultas: http://localhost:3000/dashboard/consultas');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

crearJourneyCompletoJosefina();