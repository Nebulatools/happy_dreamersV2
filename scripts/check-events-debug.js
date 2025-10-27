// Script temporal para verificar eventos después del Plan 0
const { MongoClient, ObjectId } = require('mongodb');

const uri = "mongodb+srv://javiersuarezsauco:aQ75iKuiGsLLr6Bg@cluster0.jgpgc.mongodb.net/happy_dreamers?retryWrites=true&w=majority";

async function checkEvents() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB');

    const db = client.db('happy_dreamers');

    // 1. Buscar el Plan 0 más reciente
    const plan0 = await db.collection('child_plans')
      .findOne({ planNumber: 0 }, { sort: { createdAt: -1 } });

    if (!plan0) {
      console.log('❌ No se encontró Plan 0');
      return;
    }

    console.log('\n📋 Plan 0 encontrado:');
    console.log('ID:', plan0._id);
    console.log('Fecha de creación:', plan0.createdAt);
    console.log('Hora ISO:', plan0.createdAt.toISOString());
    console.log('childId:', plan0.childId);

    // 2. Buscar eventos DESPUÉS de la creación del Plan 0
    const afterDateISO = plan0.createdAt.toISOString();
    const nowISO = new Date().toISOString();

    console.log('\n🔍 Buscando eventos entre:', afterDateISO, 'y', nowISO);

    const eventsAfter = await db.collection('events')
      .find({
        childId: plan0.childId,
        startTime: {
          $gt: afterDateISO,
          $lte: nowISO
        }
      })
      .sort({ startTime: 1 })
      .toArray();

    console.log('\n✨ Eventos DESPUÉS del Plan 0:', eventsAfter.length);
    eventsAfter.forEach((e, i) => {
      console.log(`${i + 1}. ${e.eventType} - ${e.startTime}`);
    });

    // 3. Mostrar TODOS los eventos del 25/10/2025
    const allEvents25 = await db.collection('events')
      .find({
        childId: plan0.childId,
        startTime: { $regex: '^2025-10-25' }
      })
      .sort({ startTime: 1 })
      .toArray();

    console.log('\n📅 TODOS los eventos del 25/10/2025:', allEvents25.length);
    allEvents25.forEach((e, i) => {
      console.log(`${i + 1}. ${e.eventType} - ${e.startTime} (ID: ${e._id})`);
    });

    // 4. Comparar con la hora de creación del plan
    console.log('\n🕐 Análisis de tiempos:');
    console.log('Hora de creación del Plan 0:', new Date(plan0.createdAt).toLocaleString('es-ES'));

    allEvents25.forEach((e, i) => {
      const eventDate = new Date(e.startTime);
      const planDate = new Date(plan0.createdAt);
      const isAfter = eventDate > planDate;
      console.log(`\n${i + 1}. ${e.eventType}`);
      console.log(`   Hora evento: ${eventDate.toLocaleString('es-ES')}`);
      console.log(`   ¿Después del plan?: ${isAfter ? '✅ SÍ' : '❌ NO'}`);
      console.log(`   Diferencia: ${Math.round((eventDate - planDate) / 1000 / 60)} minutos`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

checkEvents();
