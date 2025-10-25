const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env' });

async function calculateWakeTime() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db('jaco_db_ultimate_2025');

    // Cargar eventos de sleep de Jakito
    const events = await db.collection('events').find({
      childId: new ObjectId('68d1af5315d0e9b1cc189544')
    }).toArray();

    // Filtrar eventos de sleep que tengan endTime (hora de despertar)
    const sleepsWithWake = events.filter(e =>
      e.eventType === 'sleep' && e.endTime
    );

    console.log('🌙 Eventos de sueño con hora de despertar:', sleepsWithWake.length);

    if (sleepsWithWake.length > 0) {
      // Calcular hora promedio de despertar (endTime)
      const wakeHours = sleepsWithWake.map(e => {
        const wakeTime = new Date(e.endTime);
        let hour = wakeTime.getHours() + wakeTime.getMinutes() / 60;
        // Si es temprano en la mañana (0-6 AM), considerar como parte del ciclo anterior
        if (hour <= 6) hour += 24;
        return hour;
      });

      const avgWakeHour = wakeHours.reduce((a, b) => a + b, 0) / wakeHours.length;
      const finalWakeHour = avgWakeHour % 24;

      const hours = Math.floor(finalWakeHour);
      const minutes = Math.round((finalWakeHour - hours) * 60);

      console.log('\n⏰ Hora promedio de DESPERTAR (endTime de sleep):', hours.toString().padStart(2, '0') + ':' + minutes.toString().padStart(2, '0'));

      // Mostrar algunos ejemplos
      console.log('\n📋 Ejemplos de despertares:');
      sleepsWithWake.slice(0, 5).forEach((e, i) => {
        const start = new Date(e.startTime);
        const end = new Date(e.endTime);
        const duration = Math.round((end - start) / (1000 * 60));
        console.log(`  ${i+1}. Durmió: ${start.toISOString()} → Despertó: ${end.toISOString()} (${duration} min)`);
      });

      // Calcular también la hora promedio de dormirse (startTime)
      const sleepHours = sleepsWithWake.map(e => {
        const sleepTime = new Date(e.startTime);
        let hour = sleepTime.getHours() + sleepTime.getMinutes() / 60;
        if (hour <= 6) hour += 24;
        return hour;
      });

      const avgSleepHour = sleepHours.reduce((a, b) => a + b, 0) / sleepHours.length;
      const finalSleepHour = avgSleepHour % 24;

      const sleepH = Math.floor(finalSleepHour);
      const sleepM = Math.round((finalSleepHour - sleepH) * 60);

      console.log('\n🌙 Hora promedio de DORMIRSE (startTime de sleep):', sleepH.toString().padStart(2, '0') + ':' + sleepM.toString().padStart(2, '0'));
    }

  } finally {
    await client.close();
  }
}

calculateWakeTime();
