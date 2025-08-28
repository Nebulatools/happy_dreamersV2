// loadEvents.js
// Script para cargar eventos masivos desde un CSV a la base de datos de Happy Dreamers

const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
const csv = require('csv-parser');

// -----------------------------------------------------------------------------
// CONFIGURACIÓN: Modifica estas 4 variables con tus datos
// -----------------------------------------------------------------------------

// 1. Tu cadena de conexión a MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ventas:Piano81370211@cluster0.hf4ej.mongodb.net/happy-dreamers?retryWrites=true&w=majority&appName=Cluster0';

// 2. El nombre de tu base de datos
const DATABASE_NAME = 'happy-dreamers'; // Nombre de la base de datos de Happy Dreamers

// 3. El ID del niño al que se le asignarán los eventos
const TARGET_CHILD_ID = '68ad0476b98bdbe0f7ff5941'; // ID de Bernardo

// 4. La ruta a tu archivo CSV
const CSV_FILE_PATH = './bernardo prueba happy dreamers.csv';

// -----------------------------------------------------------------------------

// Función para combinar fecha y hora en un objeto Date de JavaScript
// Maneja el formato 'MM/DD/YY' y horas como '8:00' o '12:45'
const parseDateTime = (eventDate, timeStr) => {
  if (!eventDate || !timeStr) return null;
  // El formato MM/DD/YY no es estándar, lo reconstruimos
  const [month, day, year] = eventDate.split('/');
  const fullYear = `20${year}`; // Asumimos años 20xx
  const dateString = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timeStr.padStart(5, '0')}:00`;
  const date = new Date(dateString);
  // Validamos si la fecha es válida
  return isNaN(date.getTime()) ? null : date;
};


async function main() {
  if (TARGET_CHILD_ID === 'PEGA_AQUI_EL_ID_DEL_NIÑO') {
    console.error('❌ Error: Debes configurar el TARGET_CHILD_ID en el script.');
    return;
  }

  const client = new MongoClient(MONGODB_URI);
  console.log('🚀 Iniciando script de carga masiva...');
  console.log(`📊 Cargando eventos para el niño con ID: ${TARGET_CHILD_ID}`);
  console.log(`📁 Leyendo archivo CSV: ${CSV_FILE_PATH}`);

  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB.');
    const db = client.db(DATABASE_NAME);
    const childrenCollection = db.collection('children');

    // Verificar que el niño existe
    const child = await childrenCollection.findOne({ _id: new ObjectId(TARGET_CHILD_ID) });
    if (!child) {
      console.error(`❌ Error: No se encontró ningún niño con ID: ${TARGET_CHILD_ID}`);
      return;
    }
    console.log(`✅ Niño encontrado: ${child.firstName} ${child.lastName || ''}`);

    const eventsToInsert = [];

    // Usamos una Promise para asegurar que la lectura del CSV termine antes de la inserción
    await new Promise((resolve, reject) => {
      fs.createReadStream(CSV_FILE_PATH)
        .pipe(csv())
        .on('data', (row) => {
          // --- Construcción del objeto del evento ---
          const event = {
            _id: new ObjectId(), // Generamos un nuevo ID para cada evento
            eventType: row.eventType,
            startTime: parseDateTime(row['eventDate (MM/DD/YYYY)'], row.startTime),
            endTime: parseDateTime(row['eventDate (MM/DD/YYYY)'], row.endTime),
            emotionalState: row.emotionalState || null,
            notes: row.notes || null,
            sleepDelay: row.sleepDelay ? parseInt(row.sleepDelay, 10) : null,
            feedingType: row.feedingType || null,
            createdAt: new Date(),
            updatedAt: new Date()
            // ... Agrega aquí cualquier otro campo del CSV que quieras procesar
            // Ejemplo:
            // medicationName: row.medicationName || null,
            // activityDescription: row.activityDescription || null,
          };
          
          // Limpiamos campos nulos para no ensuciar la base de datos
          Object.keys(event).forEach(key => {
            if (event[key] === null || event[key] === '' || (typeof event[key] === 'number' && isNaN(event[key]))) {
              delete event[key];
            }
          });

          eventsToInsert.push(event);
        })
        .on('end', () => {
          console.log(`✅ Lectura del archivo CSV completada. Se procesaron ${eventsToInsert.length} eventos.`);
          resolve();
        })
        .on('error', reject);
    });

    if (eventsToInsert.length > 0) {
      console.log(`⏳ Insertando ${eventsToInsert.length} eventos para ${child.firstName}...`);

      const result = await childrenCollection.updateOne(
        { _id: new ObjectId(TARGET_CHILD_ID) },
        { $push: { events: { $each: eventsToInsert } } }
      );
      
      if (result.modifiedCount > 0) {
        console.log('🎉 ¡Éxito! Los eventos han sido agregados correctamente.');
        
        // Mostrar resumen
        const updatedChild = await childrenCollection.findOne({ _id: new ObjectId(TARGET_CHILD_ID) });
        console.log(`📈 Total de eventos para ${child.firstName}: ${updatedChild.events ? updatedChild.events.length : 0}`);
      } else {
        console.warn('⚠️ Advertencia: No se modificó ningún documento. Verifica que el TARGET_CHILD_ID sea correcto.');
      }
    } else {
      console.log('No se encontraron eventos para insertar.');
    }

  } catch (error) {
    console.error('❌ Ocurrió un error durante el proceso:', error);
  } finally {
    await client.close();
    console.log('🔌 Conexión a MongoDB cerrada.');
  }
}

// Ejecutar el script
main();