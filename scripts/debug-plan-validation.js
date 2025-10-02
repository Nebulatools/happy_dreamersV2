// Script para debuggear la validación de generación de planes
// Muestra información detallada sobre planes y eventos para un niño específico

import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '..', '.env') });

const CHILD_ID = '68dc0e09df1830d45d7443fe'; // ID del niño a verificar

async function debugPlanValidation() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error('❌ Error: MONGODB_URI no está definido en .env.local');
    return;
  }

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB\n');

    const dbName = process.env.MONGODB_DB_FINAL || 'jaco_db_ultimate_2025';
    const db = client.db(dbName);
    console.log(`📚 Usando base de datos: ${dbName}\n`);

    // 1. Obtener información del niño
    console.log('📋 INFORMACIÓN DEL NIÑO');
    console.log('='.repeat(80));
    const child = await db.collection('children').findOne({ _id: new ObjectId(CHILD_ID) });
    if (!child) {
      console.log('❌ No se encontró el niño con ID:', CHILD_ID);
      console.log('\n🔍 Buscando todos los niños disponibles...\n');

      const allChildren = await db.collection('children').find({}).toArray();
      console.log(`Total de niños en la base de datos: ${allChildren.length}\n`);

      allChildren.forEach((c, index) => {
        console.log(`Niño ${index + 1}:`);
        console.log(`  - ID: ${c._id}`);
        console.log(`  - Nombre: ${c.firstName} ${c.lastName || ''}`);
        console.log(`  - Parent ID: ${c.parentId}`);
        console.log('');
      });

      return;
    }
    console.log(`Niño: ${child.firstName} ${child.lastName}`);
    console.log(`Fecha de nacimiento: ${child.birthDate}`);
    console.log(`Parent ID: ${child.parentId}\n`);

    // 2. Obtener todos los planes del niño
    console.log('📊 PLANES EXISTENTES');
    console.log('='.repeat(80));
    const plans = await db.collection('child_plans')
      .find({ childId: new ObjectId(CHILD_ID) })
      .sort({ createdAt: -1 })
      .toArray();

    if (plans.length === 0) {
      console.log('❌ No hay planes para este niño\n');
    } else {
      console.log(`Total de planes: ${plans.length}\n`);
      plans.forEach((plan, index) => {
        console.log(`Plan ${index + 1}:`);
        console.log(`  - Version: ${plan.planVersion}`);
        console.log(`  - Tipo: ${plan.planType}`);
        console.log(`  - Creado: ${plan.createdAt}`);
        console.log(`  - Creado (ISO): ${new Date(plan.createdAt).toISOString()}`);
        console.log(`  - Estado: ${plan.status}`);
        console.log('');
      });
    }

    // 3. Obtener el plan más reciente por fecha de creación
    if (plans.length > 0) {
      const latestPlan = plans[0]; // Ya está ordenado por createdAt desc
      console.log('🎯 PLAN MÁS RECIENTE (por fecha de creación)');
      console.log('='.repeat(80));
      console.log(`Version: ${latestPlan.planVersion}`);
      console.log(`Tipo: ${latestPlan.planType}`);
      console.log(`Fecha de creación: ${latestPlan.createdAt}`);
      console.log(`Fecha de creación (ISO): ${new Date(latestPlan.createdAt).toISOString()}\n`);

      // 4. Buscar eventos DESPUÉS del plan más reciente
      const afterDateISO = new Date(latestPlan.createdAt).toISOString();
      const nowISO = new Date().toISOString();

      console.log('🔍 BÚSQUEDA DE EVENTOS');
      console.log('='.repeat(80));
      console.log(`Buscando eventos DESPUÉS de: ${afterDateISO}`);
      console.log(`Hasta: ${nowISO}\n`);

      // CORRECCIÓN: childId se guarda como string, no como ObjectId
      const events = await db.collection('events')
        .find({
          childId: CHILD_ID,  // Usar string directamente
          startTime: {
            $gt: afterDateISO,
            $lte: nowISO
          }
        })
        .sort({ startTime: 1 })
        .toArray();

      console.log(`📅 EVENTOS ENCONTRADOS: ${events.length}`);
      console.log('='.repeat(80));

      if (events.length === 0) {
        console.log('❌ NO hay eventos después del último plan');
        console.log('');
        console.log('Posibles razones:');
        console.log('1. Los eventos fueron registrados ANTES de crear el plan');
        console.log('2. Los eventos tienen un formato de fecha diferente');
        console.log('3. Problema de zona horaria en las fechas\n');
      } else {
        console.log(`✅ Hay ${events.length} eventos después del último plan\n`);

        // Mostrar los primeros 10 eventos
        console.log('Primeros 10 eventos:');
        events.slice(0, 10).forEach((event, index) => {
          console.log(`${index + 1}. ${event.eventType} - ${event.startTime}`);
        });
        console.log('');

        // Estadísticas por tipo de evento
        const eventTypes = {};
        events.forEach(event => {
          eventTypes[event.eventType] = (eventTypes[event.eventType] || 0) + 1;
        });

        console.log('Eventos por tipo:');
        Object.entries(eventTypes).forEach(([type, count]) => {
          console.log(`  - ${type}: ${count}`);
        });
        console.log('');
      }

      // 5. Verificar eventos en todo el rango
      console.log('📊 ESTADÍSTICAS GENERALES DE EVENTOS');
      console.log('='.repeat(80));
      // CORRECCIÓN: childId se guarda como string
      const allEvents = await db.collection('events')
        .find({ childId: CHILD_ID })  // Usar string directamente
        .sort({ startTime: 1 })
        .toArray();

      console.log(`Total de eventos registrados: ${allEvents.length}`);
      if (allEvents.length > 0) {
        console.log(`Primer evento: ${allEvents[0].startTime} (${allEvents[0].eventType})`);
        console.log(`Último evento: ${allEvents[allEvents.length - 1].startTime} (${allEvents[allEvents.length - 1].eventType})`);
        console.log('');

        // Contar eventos antes y después del plan
        const eventsBeforePlan = allEvents.filter(e => e.startTime <= afterDateISO).length;
        const eventsAfterPlan = allEvents.filter(e => e.startTime > afterDateISO).length;

        console.log(`Eventos ANTES del último plan: ${eventsBeforePlan}`);
        console.log(`Eventos DESPUÉS del último plan: ${eventsAfterPlan}`);
        console.log('');

        // Mostrar eventos alrededor de la fecha del plan
        console.log('Eventos cercanos a la fecha del plan:');
        const planDate = new Date(latestPlan.createdAt);
        const dayBefore = new Date(planDate);
        dayBefore.setDate(dayBefore.getDate() - 1);
        const dayAfter = new Date(planDate);
        dayAfter.setDate(dayAfter.getDate() + 1);

        const nearEvents = allEvents.filter(e => {
          const eventDate = new Date(e.startTime);
          return eventDate >= dayBefore && eventDate <= dayAfter;
        });

        nearEvents.forEach(event => {
          const eventDate = new Date(event.startTime);
          const isAfter = event.startTime > afterDateISO;
          const symbol = isAfter ? '✅' : '❌';
          console.log(`  ${symbol} ${event.eventType} - ${event.startTime} ${isAfter ? '(DESPUÉS)' : '(ANTES)'}`);
        });
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('FIN DEL DEBUG');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

debugPlanValidation();
