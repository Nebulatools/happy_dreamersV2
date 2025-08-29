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
// Maneja el formato 'MM/DD/YY' o 'MM/DD/YYYY' y horas como '8:00' o '12:45'
const parseDateTime = (eventDate, timeStr) => {
  if (!eventDate || !timeStr) return null;
  
  // El formato MM/DD/YY o MM/DD/YYYY no es estándar, lo reconstruimos
  const [month, day, yearRaw] = eventDate.split('/');
  
  // Determinar si el año tiene 2 o 4 dígitos
  let fullYear;
  if (yearRaw.length === 2) {
    // Año corto (YY) - asumimos 20xx
    fullYear = `20${yearRaw}`;
  } else {
    // Año completo (YYYY)
    fullYear = yearRaw;
  }
  
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

    const rawEvents = [];
    let skippedEvents = 0;
    let lastValidDate = null; // Para manejar eventos sin fecha

    // Primero, leemos todos los eventos del CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(CSV_FILE_PATH)
        .pipe(csv())
        .on('data', (row) => {
          // Verificar si el evento tiene fecha o usar la última fecha válida
          let eventDate = row['eventDate (MM/DD/YYYY)'];
          
          // Si no hay fecha pero hay una fecha válida previa, usarla
          if (!eventDate || eventDate.trim() === '') {
            if (lastValidDate) {
              eventDate = lastValidDate;
              console.log(`⚠️ Evento sin fecha, usando fecha anterior: ${eventDate}`);
            } else {
              console.log(`⚠️ Saltando evento sin fecha: tipo=${row.eventType}, hora=${row.startTime}`);
              skippedEvents++;
              return; // Saltar este evento
            }
          } else {
            // Guardar esta fecha como la última válida
            lastValidDate = eventDate;
          }
          
          // Verificar que tenga al menos el tipo de evento y hora de inicio
          if (!row.eventType || !row.startTime) {
            console.log(`⚠️ Saltando evento incompleto: tipo=${row.eventType}, fecha=${eventDate}`);
            skippedEvents++;
            return;
          }
          
          // Almacenar el evento crudo con toda su información
          rawEvents.push({
            ...row,
            eventDate: eventDate
          });
        })
        .on('end', () => {
          console.log(`✅ Lectura del archivo CSV completada. Se leyeron ${rawEvents.length} registros.`);
          if (skippedEvents > 0) {
            console.log(`⚠️ Se saltaron ${skippedEvents} eventos por datos incompletos o fechas inválidas.`);
          }
          resolve();
        })
        .on('error', reject);
    });

    // Ahora procesamos los eventos, uniendo dormir con despertar
    const eventsToInsert = [];
    const processedIndices = new Set(); // Para rastrear qué eventos ya procesamos

    for (let i = 0; i < rawEvents.length; i++) {
      // Si ya procesamos este evento, saltarlo
      if (processedIndices.has(i)) continue;
      
      const row = rawEvents[i];
      
      // Si es un evento de dormir, buscar su correspondiente despertar
      if (row.eventType === 'dormir' || row.eventType === 'sleep') {
        let wakeEvent = null;
        let wakeIndex = -1;
        
        // Buscar el siguiente evento de despertar
        for (let j = i + 1; j < rawEvents.length; j++) {
          if (rawEvents[j].eventType === 'despertar' || rawEvents[j].eventType === 'wake') {
            wakeEvent = rawEvents[j];
            wakeIndex = j;
            break;
          }
        }
        
        // Crear evento de sueño combinado
        const sleepEvent = {
          _id: new ObjectId(),
          eventType: 'dormir', // Normalizamos el tipo de evento
          startTime: parseDateTime(row.eventDate, row.startTime),
          endTime: wakeEvent ? parseDateTime(wakeEvent.eventDate, wakeEvent.startTime) : null,
          emotionalState: row.emotionalState || null,
          notes: row.notes || null,
          sleepDelay: row.sleepDelay ? parseInt(row.sleepDelay, 10) : null,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Verificar que startTime se haya parseado correctamente
        if (!sleepEvent.startTime) {
          console.log(`⚠️ Error parseando fecha/hora del evento dormir: fecha=${row.eventDate}, hora=${row.startTime}`);
          skippedEvents++;
          continue;
        }
        
        // Si encontramos el evento de despertar, marcarlo como procesado
        if (wakeIndex !== -1) {
          processedIndices.add(wakeIndex);
          console.log(`✅ Uniendo evento dormir (${row.startTime}) con despertar (${wakeEvent.startTime})`);
        } else {
          console.log(`⚠️ Evento dormir sin despertar correspondiente: ${row.startTime}`);
        }
        
        // Limpiar campos nulos
        Object.keys(sleepEvent).forEach(key => {
          if (sleepEvent[key] === null || sleepEvent[key] === '' || (typeof sleepEvent[key] === 'number' && isNaN(sleepEvent[key]))) {
            delete sleepEvent[key];
          }
        });
        
        eventsToInsert.push(sleepEvent);
        processedIndices.add(i);
        
      } else if (row.eventType === 'despertar' || row.eventType === 'wake') {
        // Si es un evento de despertar suelto (sin dormir previo), lo saltamos
        console.log(`⚠️ Evento despertar sin dormir previo: ${row.startTime}`);
        processedIndices.add(i);
        
      } else {
        // Para otros tipos de eventos, procesarlos normalmente
        const event = {
          _id: new ObjectId(),
          eventType: row.eventType,
          startTime: parseDateTime(row.eventDate, row.startTime),
          endTime: row.endTime ? parseDateTime(row.eventDate, row.endTime) : null,
          emotionalState: row.emotionalState || null,
          notes: row.notes || null,
          feedingType: row.feedingType || null,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Verificar que startTime se haya parseado correctamente
        if (!event.startTime) {
          console.log(`⚠️ Error parseando fecha/hora: fecha=${row.eventDate}, hora=${row.startTime}`);
          skippedEvents++;
          continue;
        }
        
        // Limpiar campos nulos
        Object.keys(event).forEach(key => {
          if (event[key] === null || event[key] === '' || (typeof event[key] === 'number' && isNaN(event[key]))) {
            delete event[key];
          }
        });
        
        eventsToInsert.push(event);
        processedIndices.add(i);
      }
    }

    console.log(`📊 Total de eventos procesados: ${eventsToInsert.length} eventos.`);

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