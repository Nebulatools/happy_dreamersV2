const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env' });

async function getJakitoEvents() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI no está definida');
    return;
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB\n');

    const db = client.db('jaco_db_ultimate_2025');

    // Ver qué bases de datos existen
    const adminDb = client.db().admin();
    const dbs = await adminDb.listDatabases();
    console.log('📊 Bases de datos disponibles:');
    dbs.databases.forEach(db => console.log('  -', db.name));
    console.log('');

    // Listar colecciones en happy_dreamers
    const collections = await db.listCollections().toArray();
    console.log('📚 Colecciones en happy_dreamers:');
    collections.forEach(coll => console.log('  -', coll.name));
    console.log('');

    // Listar todos los usuarios
    const allUsers = await db.collection('users').find({}).toArray();
    console.log('👥 Usuarios en la base de datos:');
    allUsers.forEach(user => {
      console.log(`  - ${user.email} (${user.name || 'Sin nombre'}) - ${user.role}`);
    });
    console.log('');

    // Buscar al padre por email
    const parent = await db.collection('users').findOne({
      email: 'ventas@jacoagency.io'
    });

    console.log('👨 Información del padre:');
    console.log('  Email:', parent?.email);
    console.log('  Nombre:', parent?.name);
    console.log('  ID:', parent?._id);
    console.log('');

    // Buscar todos los niños del padre
    const children = await db.collection('children').find({
      parentId: parent?._id
    }).toArray();

    console.log(`👶 Niños encontrados: ${children.length}\n`);

    let jakitoChild = null;
    children.forEach((child, index) => {
      console.log(`--- Niño ${index + 1} ---`);
      console.log('  Nombre:', child.firstName, child.lastName);
      console.log('  ID:', child._id);
      console.log('  Fecha nacimiento:', child.birthDate);
      console.log('');

      if (child.firstName?.toLowerCase().includes('jakito') ||
          child.firstName?.toLowerCase().includes('jaco')) {
        jakitoChild = child;
      }
    });

    if (!jakitoChild) {
      console.log('❌ No se encontró a Jakito');
      return;
    }

    console.log(`\n✅ Jakito encontrado! ID real: ${jakitoChild._id}\n`);

    // Buscar eventos de Jakito con su ID correcto
    const events = await db.collection('events').find({
      childId: jakitoChild._id
    }).sort({ startTime: -1 }).toArray();

    console.log(`📊 Total eventos encontrados: ${events.length}\n`);

    // Mostrar estructura de primer evento
    if (events.length > 0) {
      console.log('📋 Estructura del primer evento:');
      console.log(JSON.stringify(events[0], null, 2));
      console.log('\n');
    }

    console.log('📅 Primeros 10 eventos (ordenados del más reciente al más antiguo):\n');

    events.slice(0, 10).forEach((event, index) => {
      console.log(`--- Evento ${index + 1} ---`);
      console.log('ID:', event._id);
      console.log('Tipo:', event.eventType || event.type);
      console.log('Inicio:', event.startTime);
      console.log('Fin:', event.endTime || 'N/A');
      console.log('Duración:', event.duration ? event.duration + ' min' : 'N/A');
      console.log('Estado emocional:', event.emotionalState || 'N/A');
      console.log('Notas:', event.notes || 'N/A');
      if (event.sleepDelay) console.log('Delay antes de dormir:', event.sleepDelay + ' min');
      console.log('');
    });

    // Calcular estadísticas detalladas
    const eventTypes = {};
    const emotionalStates = {};
    let totalDuration = 0;
    let eventsWithDuration = 0;
    let sleepEvents = 0;
    let napEvents = 0;
    let feedingEvents = 0;
    let sleepDelaySum = 0;
    let sleepDelayCount = 0;

    events.forEach(event => {
      // Tipos de evento
      const type = event.eventType || 'unknown';
      eventTypes[type] = (eventTypes[type] || 0) + 1;

      // Estados emocionales
      if (event.emotionalState) {
        emotionalStates[event.emotionalState] = (emotionalStates[event.emotionalState] || 0) + 1;
      }

      // Duraciones
      if (event.duration) {
        totalDuration += event.duration;
        eventsWithDuration++;
      }

      // Contadores especiales
      if (event.eventType === 'sleep') sleepEvents++;
      if (event.eventType === 'nap') napEvents++;
      if (event.eventType === 'feeding') feedingEvents++;

      // Sleep delay
      if (event.sleepDelay) {
        sleepDelaySum += event.sleepDelay;
        sleepDelayCount++;
      }
    });

    console.log('\n📈 Estadísticas completas de Jakito:\n');

    console.log('📊 Por tipo de evento:');
    Object.entries(eventTypes).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
      const percentage = ((count / events.length) * 100).toFixed(1);
      console.log(`  - ${type}: ${count} (${percentage}%)`);
    });

    console.log('\n😊 Por estado emocional:');
    Object.entries(emotionalStates).sort((a, b) => b[1] - a[1]).forEach(([state, count]) => {
      const percentage = ((count / events.length) * 100).toFixed(1);
      console.log(`  - ${state}: ${count} (${percentage}%)`);
    });

    console.log('\n⏱️ Métricas de duración:');
    console.log(`  - Total eventos con duración: ${eventsWithDuration}`);
    console.log(`  - Duración promedio: ${eventsWithDuration > 0 ? (totalDuration / eventsWithDuration).toFixed(1) : 0} min`);
    console.log(`  - Delay promedio antes de dormir: ${sleepDelayCount > 0 ? (sleepDelaySum / sleepDelayCount).toFixed(1) : 0} min`);

    console.log('\n🌙 Resumen de sueño:');
    console.log(`  - Total eventos de sueño nocturno: ${sleepEvents}`);
    console.log(`  - Total eventos de siesta: ${napEvents}`);
    console.log(`  - Total eventos de alimentación: ${feedingEvents}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

getJakitoEvents();
