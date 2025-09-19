const { ObjectId } = require('mongodb');
const { connect, getDb, disconnect } = require('../../scripts/mongoose-util');

const MONGODB_URI = 'mongodb+srv://ventas:Piano81370211@cluster0.hf4ej.mongodb.net/happy-dreamers?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'happy-dreamers';

async function crearJourneyCompletoJosefina() {
  const client = /* mongoose connect handled */;
  
  try {
    await connect();
    console.log('âœ… Conectado a MongoDB');
    
    const db = await getDb();
    
    const josefinaId = new ObjectId('68b1e890cc3fa58befd037c3');
    const testUserId = new ObjectId('688ce146d2d5ff9616549d86'); // test@test.com
    const adminUserId = new ObjectId('687999869a879ac61e9fb873'); // admin@test.com
    
    console.log('ðŸ§¹ LIMPIANDO DATOS EXISTENTES');
    console.log('=============================');
    
    // Limpiar eventos y planes existentes
    await db.collection('events').deleteMany({ childId: josefinaId });
    await db.collection('sleepPlans').deleteMany({ childId: josefinaId });
    await db.collection('consultation_transcripts').deleteMany({ childId: josefinaId });
    
    console.log('ðŸ—‘ï¸ Datos anteriores eliminados');
    
    console.log('\\nðŸ“ˆ CREANDO JOURNEY PROGRESIVO DE JOSEFINA');
    console.log('==========================================');
    
    // === FASE 1: EVENTOS INICIALES (Enero 1 - Enero 20, 2025) ===
    console.log('\\nðŸ“… FASE 1: Eventos iniciales (Enero 1-20, 2025)');
    console.log('Problemas: Muchos despertares nocturnos, tardanza para dormir');
    
    const eventos = [];
    let currentDate = new Date('2025-01-01T00:00:00Z');
    const fase1End = new Date('2025-01-20T00:00:00Z');
    
    while (currentDate <= fase1End) {
      // PatrÃ³n problemÃ¡tico: muchos despertares, tardanza para dormir
      
      // BEDTIME (20:00-21:30) - mÃ¡s tarde de lo ideal
      const bedtimeDate = new Date(currentDate);
      bedtimeDate.setHours(20 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0);
      
      // SLEEP (30-90 min despuÃ©s) - mucha tardanza
      const sleepDelay = 30 + Math.floor(Math.random() * 60); // 30-90 min
      const sleepDate = new Date(bedtimeDate);
      sleepDate.setMinutes(sleepDate.getMinutes() + sleepDelay);
      
      // WAKE (6:00-8:00 siguiente dÃ­a)
      const wakeDate = new Date(sleepDate);
      wakeDate.setDate(wakeDate.getDate() + 1);
      wakeDate.setHours(6 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0);
      
      // Eventos bÃ¡sicos
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
          notes: 'Dificultad para conciliar el sueÃ±o',
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
      
      // MÃšLTIPLES DESPERTARES NOCTURNOS (2-4 por noche)
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
    
    console.log(`âœ… Fase 1: ${eventos.length} eventos creados (problemas evidentes)`);
    
    // === INSERTAR EVENTOS FASE 1 ===
    await db.collection('events').insertMany(eventos);
    
    // === PLAN 0: EVALUACIÃ“N INICIAL (Enero 21, 2025) ===
    console.log('\\nðŸ“‹ CREANDO PLAN 0: EvaluaciÃ³n Inicial (Enero 21, 2025)');
    
    const plan0 = {
      _id: new ObjectId(),
      childId: josefinaId,
      parentId: adminUserId, // Creado por admin
      title: 'Plan 0: EvaluaciÃ³n Inicial - DiagnÃ³stico de Problemas',
      description: 'EvaluaciÃ³n inicial basada en 20 dÃ­as de registros. Se identifican mÃºltiples despertares nocturnos y dificultades para conciliar el sueÃ±o.',
      startDate: new Date('2025-01-21T00:00:00Z'),
      endDate: new Date('2025-02-20T00:00:00Z'),
      status: 'completed',
      aiRecommendations: [
        'Establecer horario fijo de acostarse: 20:00 mÃ¡ximo',
        'Crear rutina pre-sueÃ±o de 30 minutos con actividades calmantes',
        'Implementar tÃ©cnica de extinciÃ³n gradual para despertares nocturnos',
        'Mantener registro detallado para identificar patrones especÃ­ficos'
      ],
      goals: [
        'Reducir despertares nocturnos de 3.2 promedio a mÃ¡ximo 2 por noche',
        'Disminuir tiempo para conciliar sueÃ±o de 60 minutos a 30 minutos',
        'Establecer rutina pre-sueÃ±o consistente'
      ],
      metrics: {
        baselineNightWakings: 3.2,
        targetNightWakings: 2.0,
        baselineSleepDelay: 60,
        targetSleepDelay: 30,
        baselineRoutineConsistency: 30,
        targetRoutineConsistency: 80
      },
      analysis: 'AnÃ¡lisis inicial revela patrÃ³n clÃ¡sico de resistencia al sueÃ±o con mÃºltiples despertares. Se requiere intervenciÃ³n estructurada.',
      createdAt: new Date('2025-01-21T08:00:00Z'),
      updatedAt: new Date('2025-02-20T00:00:00Z')
    };
    
    await db.collection('sleepPlans').insertOne(plan0);
    console.log('âœ… Plan 0 creado por admin');
    
    // === FASE 2: IMPLEMENTACIÃ“N PLAN 0 (Enero 21 - Febrero 28, 2025) ===
    console.log('\\nðŸ“… FASE 2: ImplementaciÃ³n Plan 0 (Enero 21 - Feb 28, 2025)');
    console.log('Mejoras graduales: Menos despertares, mejor rutina');
    
    const eventos2 = [];
    currentDate = new Date('2025-01-21T00:00:00Z');
    const fase2End = new Date('2025-02-28T00:00:00Z');
    
    while (currentDate <= fase2End) {
      // Mejora gradual: horarios mÃ¡s consistentes, menos despertares
      
      // BEDTIME (19:30-20:30) - mÃ¡s temprano y consistente
      const bedtimeDate = new Date(currentDate);
      bedtimeDate.setHours(19, 30 + Math.floor(Math.random() * 60), 0, 0);
      
      // SLEEP (20-45 min despuÃ©s) - mejora gradual
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
            notes: 'Despertar nocturno - menor duraciÃ³n',
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
        notes: 'Despertar mÃ¡s descansada',
        metadata: { morningWake: true, planActive: 'Plan 0' },
        createdAt: wakeDate
      });
      
      // SIESTA mÃ¡s consistente
      if (Math.random() > 0.2) {
        const napStart = new Date(currentDate);
        napStart.setHours(13, 45 + Math.floor(Math.random() * 30), 0, 0); // MÃ¡s consistente
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
          notes: 'Siesta mÃ¡s regular - Plan 0',
          metadata: { sleepType: 'nap', planActive: 'Plan 0' },
          createdAt: napStart
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log(`âœ… Fase 2: ${eventos2.length} eventos adicionales (mejoras evidentes)`);
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
    
    // === PLAN 1: CONSOLIDACIÃ“N (Marzo 1, 2025) ===
    console.log('\\nðŸ“‹ CREANDO PLAN 1: ConsolidaciÃ³n (Marzo 1, 2025)');
    
    const plan1 = {
      _id: new ObjectId(),
      childId: josefinaId,
      parentId: adminUserId,
      title: 'Plan 1: ConsolidaciÃ³n del SueÃ±o',
      description: 'Plan de consolidaciÃ³n basado en los avances del Plan 0. Enfoque en eliminar despertares restantes y optimizar calidad del sueÃ±o.',
      startDate: new Date('2025-03-01T00:00:00Z'),
      endDate: new Date('2025-04-15T00:00:00Z'),
      status: 'completed',
      aiRecommendations: [
        'Mantener rutina establecida pero optimizar timing',
        'Introducir objeto de transiciÃ³n (peluche favorito) para autoconsuelo',
        'Ajustar horario de siesta para no interferir con sueÃ±o nocturno',
        'Implementar tÃ©cnica de verificaciones programadas para despertares'
      ],
      goals: [
        'Eliminar despertares nocturnos por completo (objetivo: 0-1 por semana)',
        'Reducir tiempo para dormir a menos de 20 minutos consistentemente',
        'Lograr siestas de duraciÃ³n Ã³ptima (90-120 minutos)'
      ],
      metrics: {
        baselineNightWakings: 1.6,
        targetNightWakings: 0.3,
        baselineSleepDelay: 32,
        targetSleepDelay: 20,
        baselineNapDuration: 75,
        targetNapDuration: 105
      },
      analysis: 'Plan 0 exitoso con reducciÃ³n significativa de problemas. Plan 1 enfocado en consolidaciÃ³n y optimizaciÃ³n.',
      createdAt: new Date('2025-03-01T08:00:00Z'),
      updatedAt: new Date('2025-04-15T00:00:00Z')
    };
    
    await db.collection('sleepPlans').insertOne(plan1);
    console.log('âœ… Plan 1 creado por admin');
    
    // === FASE 3: IMPLEMENTACIÃ“N PLAN 1 (Marzo 1 - Abril 15, 2025) ===
    console.log('\\nðŸ“… FASE 3: ImplementaciÃ³n Plan 1 (Marzo 1 - Abril 15, 2025)');
    console.log('ConsolidaciÃ³n: SueÃ±o mÃ¡s estable, pocos despertares');
    
    const eventos3 = [];
    currentDate = new Date('2025-03-01T00:00:00Z');
    const fase3End = new Date('2025-04-15T00:00:00Z');
    
    while (currentDate <= fase3End) {
      // SueÃ±o consolidado: horarios muy consistentes, mÃ­nimos despertares
      
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
      
      // MUY POCOS DESPERTARES (0-1 por noche, mayorÃ­a sin despertares)
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
            notes: 'Despertar breve - se autoconsuelo rÃ¡pidamente',
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
      
      // SIESTA Ã“PTIMA
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
        notes: 'Siesta Ã³ptima - Plan 1',
        metadata: { sleepType: 'nap', planActive: 'Plan 1' },
        createdAt: napStart
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log(`âœ… Fase 3: ${eventos3.length} eventos adicionales (sueÃ±o consolidado)`);
    await db.collection('events').insertMany(eventos3);
    
    // === CREAR TRANSCRIPCIÃ“N DE CONSULTA PARA PLAN 1.1 ===
    console.log('\\nðŸ’¬ CREANDO TRANSCRIPCIÃ“N DE CONSULTA (Abril 16, 2025)');
    
    const consultaTranscript = {
      _id: new ObjectId(),
      childId: josefinaId,
      parentId: testUserId,
      consultationDate: new Date('2025-04-16T10:00:00Z'),
      transcript: `
CONSULTA DE SEGUIMIENTO - JOSEFINA GARCÃA
Fecha: 16 de abril, 2025
DuraciÃ³n: 25 minutos
Participantes: Madre (test@test.com) y Dr. Assistant

[10:00] MADRE: Buenos dÃ­as doctor. QuerÃ­a hacer seguimiento del Plan 1 que implementamos en marzo.

[10:01] DR. ASSISTANT: Buenos dÃ­as. Me da mucho gusto escucharla. Â¿CÃ³mo ha ido la implementaciÃ³n del Plan 1 de consolidaciÃ³n?

[10:02] MADRE: Ha funcionado muy bien en general. Los despertares nocturnos prÃ¡cticamente desaparecieron. Josefina ahora duerme toda la noche la mayorÃ­a de dÃ­as.

[10:03] DR. ASSISTANT: Excelente progreso. SegÃºn veo en los registros, hemos pasado de 1.6 despertares promedio a aproximadamente 0.4. Â¿Hay algÃºn aspecto que le preocupe?

[10:04] MADRE: Bueno, hay dos cosas. Primero, algunos dÃ­as todavÃ­a tarda hasta 30 minutos en dormirse, especialmente despuÃ©s de dÃ­as muy estimulantes.

[10:05] DR. ASSISTANT: Es normal que haya cierta variabilidad. Â¿QuÃ© tipo de dÃ­as nota que son mÃ¡s estimulantes?

[10:06] MADRE: Los fines de semana cuando salimos al parque, o cuando tiene visitas de los abuelos. TambiÃ©n cuando cambiamos rutinas.

[10:07] DR. ASSISTANT: Perfecto, eso me da una pista importante. Â¿Y cuÃ¡l es la segunda preocupaciÃ³n?

[10:08] MADRE: Las siestas. Algunas veces son muy largas, de mÃ¡s de 2 horas, y otras muy cortas. No sÃ© si eso afecta el sueÃ±o nocturno.

[10:09] DR. ASSISTANT: Buena observaciÃ³n. Las siestas inconsistentes pueden crear cierta variabilidad en el sueÃ±o nocturno. Â¿Ha notado algÃºn patrÃ³n?

[10:11] MADRE: Creo que cuando duerme siesta muy larga, despuÃ©s le cuesta mÃ¡s trabajo dormirse en la noche.

[10:12] DR. ASSISTANT: Exactamente. Esa es una conexiÃ³n muy importante que ha identificado. Vamos a trabajar en optimizar ese balance.

[10:13] MADRE: Â¿QuÃ© sugiere?

[10:14] DR. ASSISTANT: Propongo crear un Plan 1.1 de refinamiento que se enfoque en dos Ã¡reas: gestiÃ³n de activaciÃ³n despuÃ©s de dÃ­as estimulantes y optimizaciÃ³n del timing de siestas.

[10:15] MADRE: Me parece perfecto. Â¿CÃ³mo funcionarÃ­a?

[10:16] DR. ASSISTANT: Para dÃ­as estimulantes, implementaremos una "rutina de desactivaciÃ³n extendida" de 45 minutos en lugar de 30, con actividades extra calmantes.

[10:17] MADRE: Â¿Como quÃ© actividades?

[10:18] DR. ASSISTANT: BaÃ±o tibio, masaje suave, mÃºsica muy suave, y perhaps dimming progresivo de luces comenzando mÃ¡s temprano.

[10:19] MADRE: Y para las siestas?

[10:20] DR. ASSISTANT: Vamos a establecer un lÃ­mite mÃ¡ximo de siesta de 90 minutos, y un horario fijo de inicio entre 1:00 y 1:30 PM.

[10:21] MADRE: Â¿Y si todavÃ­a tiene sueÃ±o despuÃ©s de 90 minutos?

[10:22] DR. ASSISTANT: Es mejor despertar suavemente y compensar con hora de dormir ligeramente mÃ¡s temprana esa noche. Esto mantendrÃ¡ el balance.

[10:23] MADRE: Suena lÃ³gico. Â¿CuÃ¡nto tiempo implementamos esto?

[10:24] DR. ASSISTANT: Sugiero 6 semanas, hasta finales de mayo. DespuÃ©s evaluamos y posiblemente pasamos a un plan de mantenimiento a largo plazo.

[10:25] MADRE: Perfecto doctor. Me siento muy confiada con el progreso de Josefina. Gracias por su ayuda.

[10:25] DR. ASSISTANT: Ha sido un placer acompaÃ±arla en este proceso. Josefina ha tenido un progreso excepcional gracias a su consistencia. Nos vemos en el seguimiento.

FIN DE CONSULTA
      `,
      summary: 'Consulta de seguimiento exitosa. Plan 1 funcionÃ³ bien con reducciÃ³n significativa de despertares nocturnos. Se identificaron oportunidades de refinamiento en gestiÃ³n de dÃ­as estimulantes y optimizaciÃ³n de siestas. Se propone Plan 1.1.',
      recommendations: [
        'Implementar rutina de desactivaciÃ³n extendida para dÃ­as estimulantes',
        'Establecer lÃ­mite mÃ¡ximo de siesta de 90 minutos',
        'Horario fijo de siesta entre 1:00-1:30 PM',
        'Compensar siestas cortas con hora de dormir mÃ¡s temprana'
      ],
      nextSteps: ['Crear Plan 1.1 de refinamiento', 'Implementar por 6 semanas', 'Evaluar para plan de mantenimiento'],
      createdAt: new Date('2025-04-16T10:25:00Z')
    };
    
    await db.collection('consultation_transcripts').insertOne(consultaTranscript);
    console.log('âœ… TranscripciÃ³n de consulta creada');
    
    // === PLAN 1.1: REFINAMIENTO (Abril 17, 2025) ===
    console.log('\\nðŸ“‹ CREANDO PLAN 1.1: Refinamiento (Abril 17, 2025)');
    
    const plan11 = {
      _id: new ObjectId(),
      childId: josefinaId,
      parentId: adminUserId,
      title: 'Plan 1.1: Refinamiento Basado en Consulta',
      description: 'Plan de refinamiento desarrollado a partir de consulta del 16 de abril. Enfoque en optimizaciÃ³n de siestas y gestiÃ³n de dÃ­as estimulantes.',
      startDate: new Date('2025-04-17T00:00:00Z'),
      endDate: new Date('2025-05-31T00:00:00Z'),
      status: 'active',
      consultationTranscriptId: consultaTranscript._id,
      aiRecommendations: [
        'Rutina de desactivaciÃ³n extendida (45 min) para dÃ­as estimulantes',
        'LÃ­mite mÃ¡ximo de siesta: 90 minutos',
        'Horario fijo de siesta: 1:00-1:30 PM',
        'Despertar suave si siesta excede 90 minutos',
        'Compensar siestas cortas con hora de dormir mÃ¡s temprana'
      ],
      goals: [
        'Reducir variabilidad en tiempo para dormir despuÃ©s de dÃ­as estimulantes',
        'Optimizar duraciÃ³n de siestas (objetivo: 75-90 minutos)',
        'Mantener consistencia en sueÃ±o nocturno independientemente de actividades diurnas'
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
      analysis: 'Plan basado en anÃ¡lisis de transcripciÃ³n de consulta. Enfoque en refinamientos especÃ­ficos identificados por la madre.',
      derivedFrom: {
        consultationId: consultaTranscript._id,
        previousPlan: plan1._id,
        refinementType: 'consultation_based'
      },
      createdAt: new Date('2025-04-17T09:00:00Z'),
      updatedAt: new Date()
    };
    
    await db.collection('sleepPlans').insertOne(plan11);
    console.log('âœ… Plan 1.1 creado basado en transcripciÃ³n de consulta');
    
    // === FASE 4: IMPLEMENTACIÃ“N PLAN 1.1 (Abril 17 - Agosto 29, 2025) ===
    console.log('\\nðŸ“… FASE 4: ImplementaciÃ³n Plan 1.1 (Abril 17 - Agosto 29, 2025)');
    console.log('Refinamiento: SueÃ±o optimizado, siestas consistentes');
    
    const eventos4 = [];
    currentDate = new Date('2025-04-17T00:00:00Z');
    const fase4End = new Date('2025-08-29T00:00:00Z');
    
    while (currentDate <= fase4End) {
      // SueÃ±o refinado: mÃ¡xima consistencia, siestas optimizadas
      
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
      
      // DESPERTARES MÃNIMOS (solo 20% de las noches)
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
            notes: 'Autoconsuelo rÃ¡pido - Plan 1.1',
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
    
    console.log(`âœ… Fase 4: ${eventos4.length} eventos adicionales (sueÃ±o refinado y optimizado)`);
    await db.collection('events').insertMany(eventos4);
    
    // Actualizar niÃ±o con plan activo
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
    
    // === VERIFICACIÃ“N FINAL ===
    const totalEvents = await db.collection('events').countDocuments({ childId: josefinaId });
    const totalPlans = await db.collection('sleepPlans').countDocuments({ childId: josefinaId });
    const totalTranscripts = await db.collection('consultation_transcripts').countDocuments({ childId: josefinaId });
    
    console.log('\\nðŸŽ‰ Â¡JOURNEY COMPLETO DE JOSEFINA CREADO!');
    console.log('=======================================');
    console.log(`ðŸ‘¶ NiÃ±a: Josefina GarcÃ­a`);
    console.log(`ðŸ“Š Total eventos: ${totalEvents}`);
    console.log(`ðŸ“‹ Total planes: ${totalPlans}`);
    console.log(`ðŸ’¬ Transcripciones: ${totalTranscripts}`);
    console.log(`â° PerÃ­odo completo: Enero 1 - Agosto 29, 2025`);
    console.log('');
    console.log('ðŸ“ˆ JOURNEY PROGRESIVO:');
    console.log('======================');
    console.log('ðŸ”´ FASE 1 (Ene 1-20): Problemas severos');
    console.log('   - Despertares: 3.2 por noche');
    console.log('   - Tardanza para dormir: 60 min');
    console.log('   - Estado: ProblemÃ¡tico');
    console.log('');
    console.log('ðŸ“‹ PLAN 0 (Ene 21): EvaluaciÃ³n inicial por admin');
    console.log('   - DiagnÃ³stico de problemas identificados');
    console.log('   - Objetivos: Reducir despertares y tardanza');
    console.log('');
    console.log('ðŸŸ¡ FASE 2 (Ene 21-Feb 28): ImplementaciÃ³n Plan 0');
    console.log('   - Despertares: 3.2 â†’ 1.6 por noche');
    console.log('   - Tardanza para dormir: 60 â†’ 32 min');
    console.log('   - Estado: Mejorando gradualmente');
    console.log('');
    console.log('ðŸ“‹ PLAN 1 (Mar 1): ConsolidaciÃ³n por admin');
    console.log('   - Enfoque en eliminar despertares restantes');
    console.log('   - Optimizar calidad del sueÃ±o');
    console.log('');
    console.log('ðŸŸ¢ FASE 3 (Mar 1-Abr 15): ImplementaciÃ³n Plan 1');
    console.log('   - Despertares: 1.6 â†’ 0.4 por noche');
    console.log('   - Tardanza para dormir: 32 â†’ 22 min');
    console.log('   - Estado: SueÃ±o consolidado');
    console.log('');
    console.log('ðŸ’¬ CONSULTA (Abr 16): Seguimiento con madre');
    console.log('   - EvaluaciÃ³n de progreso');
    console.log('   - IdentificaciÃ³n de refinamientos necesarios');
    console.log('   - TranscripciÃ³n detallada guardada');
    console.log('');
    console.log('ðŸ“‹ PLAN 1.1 (Abr 17): Refinamiento basado en consulta');
    console.log('   - GestiÃ³n de dÃ­as estimulantes');
    console.log('   - OptimizaciÃ³n de siestas');
    console.log('');
    console.log('âœ… FASE 4 (Abr 17-Ago 29): ImplementaciÃ³n Plan 1.1');
    console.log('   - Despertares: 0.4 â†’ 0.2 por noche');
    console.log('   - Tardanza para dormir: 22 â†’ 18 min');
    console.log('   - Siestas: Optimizadas a 75-90 min');
    console.log('   - Estado: Ã“PTIMO - SueÃ±o refinado');
    console.log('');
    console.log('ðŸ† RESULTADO FINAL: Ã‰XITO TOTAL');
    console.log('- Journey coherente y progresivo');
    console.log('- Planes evolutivos basados en datos');
    console.log('- TranscripciÃ³n real de consulta');
    console.log('- Visible desde admin@test.com en /dashboard/consultas');
    console.log('');
    console.log('ðŸŽ¯ ACCESO PARA VERIFICACIÃ“N:');
    console.log('- Admin: admin@test.com / password');
    console.log('- Usuario: test@test.com / password');
    console.log('- URL consultas: http://localhost:3000/dashboard/consultas');
    
  } catch (error) {
    console.error('âŒ Error:', error);
  } finally {
    await disconnect();
  }
}

crearJourneyCompletoJosefina();