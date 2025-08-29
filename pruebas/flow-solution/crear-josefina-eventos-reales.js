const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://ventas:Piano81370211@cluster0.hf4ej.mongodb.net/happy-dreamers?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'happy-dreamers';

async function crearJosefinaEventosReales() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB');
    
    const db = client.db(DB_NAME);
    
    const josefinaId = new ObjectId('68b1e890cc3fa58befd037c3');
    const testUserId = new ObjectId('688ce146d2d5ff9616549d86');
    
    console.log('🧹 LIMPIANDO EVENTOS EXISTENTES DE JOSEFINA');
    console.log('==========================================');
    
    // Eliminar eventos existentes de Josefina
    const deleteResult = await db.collection('events').deleteMany({
      childId: josefinaId
    });
    
    console.log(`🗑️ Eventos eliminados: ${deleteResult.deletedCount}`);
    
    console.log('\n🎯 CREANDO EVENTOS REALES CON TIPOS CORRECTOS');
    console.log('=============================================');
    
    const eventos = [];
    const startDate = new Date('2025-01-01T00:00:00Z');
    const endDate = new Date('2025-08-29T23:59:59Z');
    
    // Generar eventos día por día con patrones REALES
    let currentDate = new Date(startDate);
    let eventoCount = 0;
    
    while (currentDate <= endDate) {
      const dayEvents = [];
      
      // === PATRÓN DE SUEÑO NOCTURNO ===
      
      // 1. BEDTIME - Ir a la cama (19:30 - 21:00)
      const bedtimeHour = 19 + Math.floor(Math.random() * 2); // 19-20
      const bedtimeMinute = 30 + Math.floor(Math.random() * 30); // 30-59
      const bedtimeDate = new Date(currentDate);
      bedtimeDate.setHours(bedtimeHour, bedtimeMinute, 0, 0);
      
      // 2. SLEEP - Dormirse (15-60 min después de bedtime)
      const sleepDelay = 15 + Math.floor(Math.random() * 45); // 15-60 min
      const sleepDate = new Date(bedtimeDate);
      sleepDate.setMinutes(sleepDate.getMinutes() + sleepDelay);
      
      // 3. WAKE - Despertar matutino (6:00 - 8:00 del día siguiente)
      const wakeDate = new Date(sleepDate);
      wakeDate.setDate(wakeDate.getDate() + 1);
      wakeDate.setHours(6 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0);
      
      // Calcular duración real de sueño
      const sleepDuration = Math.floor((wakeDate - sleepDate) / (1000 * 60)); // minutos
      
      // BEDTIME EVENT
      dayEvents.push({
        _id: new ObjectId(),
        childId: josefinaId,
        parentId: testUserId,
        type: 'bedtime',
        eventType: 'bedtime',
        startTime: bedtimeDate,
        endTime: sleepDate,
        duration: sleepDelay,
        emotionalState: Math.random() > 0.7 ? 'fussy' : (Math.random() > 0.5 ? 'calm' : 'happy'),
        notes: Math.random() > 0.8 ? 'Rutina normal con cuento' : '',
        metadata: {
          sleepDelay: sleepDelay
        },
        createdAt: bedtimeDate
      });
      
      // SLEEP EVENT
      dayEvents.push({
        _id: new ObjectId(),
        childId: josefinaId,
        parentId: testUserId,
        type: 'sleep',
        eventType: 'sleep',
        startTime: sleepDate,
        endTime: wakeDate,
        duration: sleepDuration,
        emotionalState: 'calm',
        sleepDelay: sleepDelay,
        metadata: {
          sleepType: 'night'
        },
        createdAt: sleepDate
      });
      
      // DESPERTARES NOCTURNOS (más frecuentes en enero-febrero)
      const isEarlyMonth = currentDate.getMonth() <= 1;
      const nightWakingChance = isEarlyMonth ? 0.8 : 0.3;
      
      if (Math.random() < nightWakingChance) {
        const wakeupTime = new Date(sleepDate);
        wakeupTime.setHours(sleepDate.getHours() + 2 + Math.floor(Math.random() * 4));
        
        if (wakeupTime < wakeDate) {
          const backToSleepTime = new Date(wakeupTime);
          backToSleepTime.setMinutes(wakeupTime.getMinutes() + 5 + Math.floor(Math.random() * 20));
          const awakeDuration = Math.floor((backToSleepTime - wakeupTime) / (1000 * 60));
          
          dayEvents.push({
            _id: new ObjectId(),
            childId: josefinaId,
            parentId: testUserId,
            type: 'night_waking',
            eventType: 'night_waking',
            startTime: wakeupTime,
            endTime: backToSleepTime,
            duration: awakeDuration,
            emotionalState: Math.random() > 0.6 ? 'crying' : 'fussy',
            notes: 'Despertar nocturno',
            awakeDelay: awakeDuration,
            metadata: {
              nightWaking: true
            },
            createdAt: wakeupTime
          });
        }
      }
      
      // WAKE EVENT (despertar matutino)
      dayEvents.push({
        _id: new ObjectId(),
        childId: josefinaId,
        parentId: testUserId,
        type: 'wake',
        eventType: 'wake',
        startTime: wakeDate,
        endTime: wakeDate,
        duration: 0,
        emotionalState: Math.random() > 0.8 ? 'fussy' : 'happy',
        notes: Math.random() > 0.9 ? 'Despertó con buen ánimo' : '',
        metadata: {
          morningWake: true
        },
        createdAt: wakeDate
      });
      
      // === SIESTA DIARIA ===
      const napChance = currentDate.getMonth() <= 2 ? 0.9 : 0.6;
      
      if (Math.random() < napChance) {
        const napStart = new Date(currentDate);
        napStart.setHours(13, 30 + Math.floor(Math.random() * 60), 0, 0);
        
        const napDuration = 45 + Math.floor(Math.random() * 75); // 45-120 min
        const napEnd = new Date(napStart);
        napEnd.setMinutes(napStart.getMinutes() + napDuration);
        
        dayEvents.push({
          _id: new ObjectId(),
          childId: josefinaId,
          parentId: testUserId,
          type: 'nap',
          eventType: 'nap',
          startTime: napStart,
          endTime: napEnd,
          duration: napDuration,
          emotionalState: Math.random() > 0.7 ? 'fussy' : 'calm',
          notes: Math.random() > 0.8 ? 'Siesta después del almuerzo' : '',
          metadata: {
            sleepType: 'nap'
          },
          createdAt: napStart
        });
      }
      
      // === ALIMENTACIÓN ===
      if (Math.random() > 0.6) {
        const feedingTime = new Date(currentDate);
        feedingTime.setHours(12, Math.floor(Math.random() * 60), 0, 0);
        
        const feedingTypes = ['breast', 'bottle', 'solids'];
        const feedingType = feedingTypes[Math.floor(Math.random() * feedingTypes.length)];
        const feedingAmount = feedingType === 'solids' ? 
          50 + Math.floor(Math.random() * 100) : // 50-150g
          80 + Math.floor(Math.random() * 120);   // 80-200ml
        
        dayEvents.push({
          _id: new ObjectId(),
          childId: josefinaId,
          parentId: testUserId,
          type: 'feeding',
          eventType: 'feeding',
          startTime: feedingTime,
          endTime: new Date(feedingTime.getTime() + 20 * 60 * 1000),
          duration: 20,
          emotionalState: 'calm',
          notes: 'Alimentación normal',
          feedingType: feedingType,
          feedingAmount: feedingAmount,
          feedingDuration: 20,
          babyState: 'awake',
          feedingNotes: '',
          createdAt: feedingTime
        });
      }
      
      // === MEDICAMENTOS (ocasional) ===
      if (Math.random() > 0.95) {
        const medTime = new Date(currentDate);
        medTime.setHours(18, Math.floor(Math.random() * 60), 0, 0);
        
        const medications = ['Paracetamol infantil', 'Probióticos', 'Vitamina D'];
        const medication = medications[Math.floor(Math.random() * medications.length)];
        
        dayEvents.push({
          _id: new ObjectId(),
          childId: josefinaId,
          parentId: testUserId,
          type: 'medication',
          eventType: 'medication',
          startTime: medTime,
          endTime: medTime,
          duration: 0,
          emotionalState: 'neutral',
          medicationName: medication,
          medicationDose: '2.5ml',
          medicationTime: medTime,
          medicationNotes: 'Dosis según indicación médica',
          createdAt: medTime
        });
      }
      
      // === ACTIVIDADES EXTRA (ocasional) ===
      if (Math.random() > 0.8) {
        const activityTime = new Date(currentDate);
        activityTime.setHours(10, Math.floor(Math.random() * 60), 0, 0);
        
        const activities = ['Juego en el parque', 'Tiempo de lectura', 'Baño relajante', 'Música y baile'];
        const activity = activities[Math.floor(Math.random() * activities.length)];
        
        dayEvents.push({
          _id: new ObjectId(),
          childId: josefinaId,
          parentId: testUserId,
          type: 'extra_activities',
          eventType: 'extra_activities',
          startTime: activityTime,
          endTime: new Date(activityTime.getTime() + 30 * 60 * 1000),
          duration: 30,
          emotionalState: 'happy',
          activityDescription: activity,
          activityDuration: 30,
          activityImpact: 'positive',
          activityNotes: 'Actividad estimulante',
          createdAt: activityTime
        });
      }
      
      // Agregar eventos del día al array principal
      eventos.push(...dayEvents);
      eventoCount += dayEvents.length;
      
      // Avanzar al siguiente día
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Insertar eventos en batches
    const batchSize = 1000;
    let insertedCount = 0;
    
    for (let i = 0; i < eventos.length; i += batchSize) {
      const batch = eventos.slice(i, i + batchSize);
      await db.collection('events').insertMany(batch);
      insertedCount += batch.length;
      console.log(`✅ Insertados ${insertedCount}/${eventos.length} eventos`);
    }
    
    // Crear planes de sueño REALISTAS
    console.log('\n📋 CREANDO PLANES DE SUEÑO REALISTAS');
    console.log('===================================');
    
    // Eliminar planes existentes de Josefina
    await db.collection('sleepPlans').deleteMany({ childId: josefinaId });
    
    const planes = [
      {
        _id: new ObjectId(),
        childId: josefinaId,
        parentId: testUserId,
        title: 'Plan de Adaptación Inicial - Reducir Despertares',
        description: 'Plan enfocado en reducir los despertares nocturnos frecuentes y establecer una rutina de sueño más consistente.',
        startDate: new Date('2025-01-15T00:00:00Z'),
        endDate: new Date('2025-02-15T00:00:00Z'),
        status: 'completed',
        aiRecommendations: [
          'Establecer rutina consistente de 30 minutos antes de dormir con actividades calmantes',
          'Implementar técnica de extinción gradual para los despertares nocturnos',
          'Mantener horarios de acostarse y despertar fijos (±15 minutos)',
          'Crear ambiente propicio: temperatura 18-20°C, oscuridad, ruido blanco suave'
        ],
        goals: [
          'Reducir despertares nocturnos de 3-4 por noche a máximo 1',
          'Lograr que se duerma en menos de 30 minutos',
          'Establecer rutina pre-sueño consistente'
        ],
        metrics: {
          baselineNightWakings: 3.2,
          targetNightWakings: 1.0,
          baselineSleepDelay: 45,
          targetSleepDelay: 20,
          actualNightWakings: 1.8,
          actualSleepDelay: 25
        },
        createdAt: new Date('2025-01-15T00:00:00Z'),
        updatedAt: new Date('2025-02-15T00:00:00Z')
      },
      {
        _id: new ObjectId(),
        childId: josefinaId,
        parentId: testUserId,
        title: 'Plan de Consolidación - Optimizar Calidad',
        description: 'Plan para consolidar los avances y optimizar la calidad del sueño nocturno, extendiendo los períodos de sueño ininterrumpido.',
        startDate: new Date('2025-03-01T00:00:00Z'),
        endDate: new Date('2025-04-01T00:00:00Z'),
        status: 'completed',
        aiRecommendations: [
          'Mantener rutina establecida pero ajustar timing según respuesta del niño',
          'Introducir objeto de transición (peluche o mantita) para autoconsuelo',
          'Evaluar y ajustar horario de siesta para no interferir con sueño nocturno',
          'Implementar registro detallado para identificar patrones específicos'
        ],
        goals: [
          'Lograr noches completas de 6-8 horas sin despertares',
          'Reducir tiempo para conciliar sueño a menos de 20 minutos',
          'Estabilizar horarios de sueño diurno'
        ],
        metrics: {
          baselineNightWakings: 1.8,
          targetNightWakings: 0.5,
          baselineSleepDelay: 25,
          targetSleepDelay: 15,
          actualNightWakings: 0.8,
          actualSleepDelay: 18
        },
        createdAt: new Date('2025-03-01T00:00:00Z'),
        updatedAt: new Date('2025-04-01T00:00:00Z')
      },
      {
        _id: new ObjectId(),
        childId: josefinaId,
        parentId: testUserId,
        title: 'Plan de Mantenimiento y Desarrollo',
        description: 'Plan a largo plazo para mantener buenos hábitos de sueño y adaptarse a los cambios del desarrollo infantil.',
        startDate: new Date('2025-05-01T00:00:00Z'),
        endDate: new Date('2025-08-29T00:00:00Z'),
        status: 'active',
        aiRecommendations: [
          'Monitorear cambios en patrones de sueño relacionados con crecimiento y desarrollo',
          'Ajustar horarios según necesidades estacionales y cambios de rutina',
          'Mantener flexibilidad en la rutina mientras se preservan elementos clave',
          'Continuar registro para detectar tempranamente cualquier regresión'
        ],
        goals: [
          'Mantener patrones de sueño saludables y estables',
          'Adaptarse proactivamente a cambios del desarrollo',
          'Prevenir regresiones durante períodos de cambio'
        ],
        metrics: {
          baselineNightWakings: 0.8,
          targetNightWakings: 0.3,
          baselineSleepDelay: 18,
          targetSleepDelay: 15,
          actualNightWakings: 0.4,
          actualSleepDelay: 16
        },
        createdAt: new Date('2025-05-01T00:00:00Z'),
        updatedAt: new Date()
      }
    ];
    
    await db.collection('sleepPlans').insertMany(planes);
    console.log(`✅ ${planes.length} planes de sueño creados`);
    
    // Actualizar niño con plan activo
    await db.collection('children').updateOne(
      { _id: josefinaId },
      {
        $set: {
          activePlan: {
            planId: planes[2]._id,
            startDate: new Date('2025-05-01T00:00:00Z'),
            status: 'active'
          },
          updatedAt: new Date()
        }
      }
    );
    
    // Verificación final
    const finalEventCount = await db.collection('events').countDocuments({ childId: josefinaId });
    const finalPlanCount = await db.collection('sleepPlans').countDocuments({ childId: josefinaId });
    
    console.log('\n🎉 ¡JOSEFINA CREADA CORRECTAMENTE CON DATOS REALES!');
    console.log('================================================');
    console.log(`👶 Nombre: Josefina García`);
    console.log(`📊 Eventos creados: ${finalEventCount}`);
    console.log(`📋 Planes de sueño: ${finalPlanCount}`);
    console.log(`⏰ Período: Enero 1, 2025 - Agosto 29, 2025`);
    console.log('');
    console.log('📈 TIPOS DE EVENTOS:');
    console.log('- bedtime: Ir a la cama');
    console.log('- sleep: Dormirse');
    console.log('- wake: Despertar');
    console.log('- nap: Siesta');
    console.log('- night_waking: Despertar nocturno');
    console.log('- feeding: Alimentación');
    console.log('- medication: Medicamentos');
    console.log('- extra_activities: Actividades extra');
    console.log('');
    console.log('🎯 EVOLUCIÓN DE PLANES:');
    console.log('1. Ene-Feb: Reducir despertares (3.2 → 1.8)');
    console.log('2. Mar-Abr: Consolidar sueño (1.8 → 0.8)');
    console.log('3. May-Ago: Mantener logros (0.8 → 0.4)');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

crearJosefinaEventosReales();