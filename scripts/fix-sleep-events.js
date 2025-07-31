// Script para corregir eventos de sueño y despertar nocturno que tienen sleepDelay pero no endTime
// Esto asegura que los bloques se visualicen correctamente en el calendario

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;

async function fixSleepEvents() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Conectado a MongoDB');
    
    const db = client.db();
    const collection = db.collection('children');
    
    // Buscar todos los niños
    const children = await collection.find({}).toArray();
    
    let totalEventsFixed = 0;
    
    for (const child of children) {
      if (!child.events || child.events.length === 0) continue;
      
      let eventsUpdated = false;
      const updatedEvents = child.events.map(event => {
        // Procesar eventos tipo "sleep" o "night_waking" que tienen sleepDelay pero no endTime
        if ((event.eventType === 'sleep' || event.eventType === 'night_waking') && 
            event.sleepDelay && event.sleepDelay > 0 && !event.endTime && event.startTime) {
          console.log(`Corrigiendo evento ${event.eventType} de ${child.firstName}: sleepDelay=${event.sleepDelay} minutos`);
          
          // Calcular endTime basado en startTime + sleepDelay
          const startDate = new Date(event.startTime);
          const endDate = new Date(startDate.getTime() + (event.sleepDelay * 60 * 1000));
          
          totalEventsFixed++;
          eventsUpdated = true;
          
          return {
            ...event,
            endTime: endDate.toISOString()
          };
        }
        return event;
      });
      
      // Actualizar el documento si hubo cambios
      if (eventsUpdated) {
        await collection.updateOne(
          { _id: child._id },
          { $set: { events: updatedEvents } }
        );
        console.log(`Actualizado niño: ${child.firstName} ${child.lastName}`);
      }
    }
    
    console.log(`\nProceso completado. Total de eventos corregidos: ${totalEventsFixed}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

// Ejecutar el script
fixSleepEvents();