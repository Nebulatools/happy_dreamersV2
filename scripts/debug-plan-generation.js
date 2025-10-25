const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env' });

/**
 * Script para debuggear exactamente qué datos usa la generación del plan
 */
async function debugPlanGeneration() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB\n');

    const db = client.db('jaco_db_ultimate_2025');
    const childId = '68d1af5315d0e9b1cc189544';

    // PASO 1: Obtener datos del niño
    console.log('📋 PASO 1: Obtener datos del niño');
    const child = await db.collection('children').findOne({
      _id: new ObjectId(childId)
    });

    console.log('  Niño encontrado:', child?.firstName, child?.lastName);
    console.log('  Fecha nacimiento:', child?.birthDate);

    // Calcular edad
    const birthDate = new Date(child.birthDate);
    const today = new Date();
    const ageInMonths = Math.floor((today - birthDate) / (1000 * 60 * 60 * 24 * 30.44));
    console.log('  Edad calculada:', ageInMonths, 'meses\n');

    // PASO 2: Cargar eventos (EXACTAMENTE como lo hace el código)
    console.log('📅 PASO 2: Cargar eventos de MongoDB');
    console.log('  Query:', JSON.stringify({ childId: new ObjectId(childId) }));

    const events = await db.collection('events').find({
      childId: new ObjectId(childId)
    }).sort({ startTime: -1 }).toArray();

    console.log('  ✅ Eventos cargados:', events.length);

    if (events.length === 0) {
      console.log('  ❌ ERROR: No se cargaron eventos!\n');
      return;
    }

    // PASO 3: Filtrar por tipo de evento (como lo hacen las funciones)
    console.log('\n📊 PASO 3: Análisis de eventos por tipo');

    const naps = events.filter(e => e?.eventType === 'nap' && e?.startTime && e?.endTime);
    const sleeps = events.filter(e => e?.eventType === 'sleep' && e?.startTime);
    const feedings = events.filter(e => e?.eventType === 'feeding' && e?.startTime);

    console.log('  💤 Siestas (nap):', naps.length);
    console.log('  🌙 Sueño nocturno (sleep):', sleeps.length);
    console.log('  🍼 Alimentaciones (feeding):', feedings.length);

    // PASO 4: Calcular estadísticas de siestas
    console.log('\n⏱️  PASO 4: Calcular estadísticas de siestas');
    if (naps.length > 0) {
      const durations = naps.map(e => {
        const start = new Date(e.startTime);
        const end = new Date(e.endTime);
        return Math.round((end - start) / 60000); // minutos
      });
      const avgDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);

      console.log('  Promedio de duración:', avgDuration, 'minutos');
      console.log('  Ejemplo de siesta:', {
        inicio: naps[0].startTime,
        fin: naps[0].endTime,
        duracion: durations[0] + ' min'
      });
    } else {
      console.log('  ❌ No hay siestas con inicio y fin registrados');
    }

    // PASO 5: Calcular estadísticas de sueño nocturno
    console.log('\n🌙 PASO 5: Calcular estadísticas de sueño nocturno');
    if (sleeps.length > 0) {
      const starts = sleeps.map(e => new Date(e.startTime));
      const avgHour = starts.reduce((sum, date) => {
        let hour = date.getHours() + date.getMinutes() / 60;
        // Si es madrugada (0-6 AM), sumar 24 para el promedio
        if (hour <= 6) hour += 24;
        return sum + hour;
      }, 0) / starts.length;

      const finalHour = avgHour % 24;
      const hours = Math.floor(finalHour);
      const minutes = Math.round((finalHour - hours) * 60);

      console.log('  Hora promedio de dormir:', `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
      console.log('  Ejemplo:', sleeps[0].startTime);

      // Calcular duración promedio
      const sleepsWithEnd = sleeps.filter(e => e.endTime);
      if (sleepsWithEnd.length > 0) {
        const durations = sleepsWithEnd.map(e => {
          const start = new Date(e.startTime);
          const end = new Date(e.endTime);
          return Math.round((end - start) / 60000);
        });
        const avgSleepDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
        console.log('  Duración promedio sueño:', avgSleepDuration, 'minutos (~', (avgSleepDuration / 60).toFixed(1), 'horas)');
      }
    } else {
      console.log('  ❌ No hay eventos de sueño nocturno');
    }

    // PASO 6: Calcular estadísticas de alimentación
    console.log('\n🍼 PASO 6: Calcular estadísticas de alimentación');
    if (feedings.length > 0) {
      const buckets = {
        breakfast: { from: 6 * 60, to: 10 * 60, times: [] },
        lunch: { from: 11 * 60, to: 14 * 60, times: [] },
        snack: { from: 15 * 60, to: 17 * 60, times: [] },
        dinner: { from: 18 * 60, to: 20 * 60 + 59, times: [] },
      };

      feedings.forEach(e => {
        const d = new Date(e.startTime);
        const m = d.getHours() * 60 + d.getMinutes();
        for (const key of Object.keys(buckets)) {
          const b = buckets[key];
          if (m >= b.from && m < b.to) {
            b.times.push(d);
          }
        }
      });

      for (const [meal, bucket] of Object.entries(buckets)) {
        if (bucket.times.length > 0) {
          const avgMinutes = bucket.times.reduce((sum, date) => {
            return sum + (date.getHours() * 60 + date.getMinutes());
          }, 0) / bucket.times.length;
          const hours = Math.floor(avgMinutes / 60);
          const minutes = Math.round(avgMinutes % 60);
          console.log(`  ${meal}:`, `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`, `(${bucket.times.length} registros)`);
        } else {
          console.log(`  ${meal}: Sin datos`);
        }
      }
    } else {
      console.log('  ❌ No hay eventos de alimentación');
    }

    // PASO 7: Verificar estructura de eventos
    console.log('\n🔍 PASO 7: Verificar estructura de primer evento');
    if (events.length > 0) {
      console.log('  Campos del evento:');
      console.log('    eventType:', events[0].eventType, '✅');
      console.log('    startTime:', events[0].startTime, '✅');
      console.log('    endTime:', events[0].endTime || 'N/A');
      console.log('    emotionalState:', events[0].emotionalState);
      console.log('    duration:', events[0].duration);
    }

    console.log('\n✅ Análisis completado!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

debugPlanGeneration();
