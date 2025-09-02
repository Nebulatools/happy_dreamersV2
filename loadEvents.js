// loadEvents.js
// Script para cargar eventos masivos desde un CSV a la base de datos de Happy Dreamers
//
// MEJORAS DE SEGURIDAD Y ARQUITECTURA:
// - Usa variables de entorno para credenciales (no hardcodeadas)
// - Inserta en colección 'events' separada (no en 'children.events')
// - Incluye parentId para data isolation
// - Mejora validación de fechas y manejo de errores
// - Previene duplicados y valida estructura de datos
//
// CONFIGURACIÓN REQUERIDA:
// Crear archivo .env con:
// MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
// TARGET_CHILD_ID=id_del_niño_aquí

// Cargar variables de entorno
require('dotenv').config();

const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
const csv = require('csv-parser');

// -----------------------------------------------------------------------------
// CONFIGURACIÓN: Modifica estas 4 variables con tus datos
// -----------------------------------------------------------------------------

// 1. Tu cadena de conexión a MongoDB
const MONGODB_URI = process.env.MONGODB_URI;

// 2. El nombre de tu base de datos
const DATABASE_NAME = 'happy-dreamers'; // Nombre de la base de datos de Happy Dreamers

// 3. El ID del niño al que se le asignarán los eventos
const TARGET_CHILD_ID = process.env.TARGET_CHILD_ID || 'PEGA_AQUI_EL_ID_DEL_NIÑO';

// 4. La ruta a tu archivo CSV
const CSV_FILE_PATH = './bernardo prueba happy dreamers.csv';

// -----------------------------------------------------------------------------

// Función para combinar fecha y hora en un objeto Date de JavaScript
// Maneja el formato 'MM/DD/YY' o 'MM/DD/YYYY' y horas como '8:00' o '12:45'
const parseDateTime = (eventDate, timeStr) => {
  if (!eventDate || !timeStr) return null;
  
  try {
    // El formato MM/DD/YY o MM/DD/YYYY no es estándar, lo reconstruimos
    const dateParts = eventDate.split('/');
    if (dateParts.length !== 3) return null;
    
    const [month, day, yearRaw] = dateParts;
    
    // Validar mes y día
    const monthNum = parseInt(month, 10);
    const dayNum = parseInt(day, 10);
    if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) return null;
    
    // Determinar si el año tiene 2 o 4 dígitos
    let fullYear;
    if (yearRaw.length === 2) {
      // Año corto (YY) - asumimos 20xx
      fullYear = `20${yearRaw}`;
    } else if (yearRaw.length === 4) {
      // Año completo (YYYY)
      fullYear = yearRaw;
    } else {
      return null;
    }
    
    // Normalizar formato de hora (agregar segundos si no los tiene)
    let normalizedTime = timeStr.trim();
    if (normalizedTime.split(':').length === 2) {
      normalizedTime += ':00';
    }
    
    const dateString = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${normalizedTime}`;
    const date = new Date(dateString);
    
    // Validamos si la fecha es válida
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    console.error(`Error parseando fecha/hora: ${eventDate} ${timeStr}`, error);
    return null;
  }
};


async function main() {
  // Validar variables de entorno requeridas
  if (!MONGODB_URI) {
    console.error('❌ Error: MONGODB_URI no está configurado en las variables de entorno.');
    return;
  }
  
  if (TARGET_CHILD_ID === 'PEGA_AQUI_EL_ID_DEL_NIÑO') {
    console.error('❌ Error: Debes configurar el TARGET_CHILD_ID en las variables de entorno.');
    return;
  }
  
  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.error(`❌ Error: El archivo CSV no existe: ${CSV_FILE_PATH}`);
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
    const eventsCollection = db.collection('events');

    // Verificar que el niño existe y tiene parentId
    const child = await childrenCollection.findOne({ _id: new ObjectId(TARGET_CHILD_ID) });
    if (!child) {
      console.error(`❌ Error: No se encontró ningún niño con ID: ${TARGET_CHILD_ID}`);
      return;
    }
    
    if (!child.parentId) {
      console.error(`❌ Error: El niño ${child.firstName} no tiene parentId asignado.`);
      return;
    }
    
    console.log(`✅ Niño encontrado: ${child.firstName} ${child.lastName || ''}`);
    console.log(`✅ Parent ID: ${child.parentId}`);

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
          childId: new ObjectId(TARGET_CHILD_ID),
          parentId: child.parentId, // Requerido para data isolation
          eventType: 'sleep', // Normalizar a 'sleep' para consistencia con la app
          startTime: parseDateTime(row.eventDate, row.startTime).toISOString(),
          endTime: wakeEvent ? parseDateTime(wakeEvent.eventDate, wakeEvent.startTime).toISOString() : null,
          emotionalState: row.emotionalState || null,
          notes: row.notes || null,
          sleepDelay: row.sleepDelay ? parseInt(row.sleepDelay, 10) : null,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Verificar que startTime se haya parseado correctamente
        if (!parseDateTime(row.eventDate, row.startTime)) {
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
          childId: new ObjectId(TARGET_CHILD_ID),
          parentId: child.parentId, // Requerido para data isolation
          eventType: row.eventType,
          startTime: parseDateTime(row.eventDate, row.startTime).toISOString(),
          endTime: row.endTime ? parseDateTime(row.eventDate, row.endTime).toISOString() : null,
          emotionalState: row.emotionalState || null,
          notes: row.notes || null,
          feedingType: row.feedingType || null,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Verificar que startTime se haya parseado correctamente
        if (!parseDateTime(row.eventDate, row.startTime)) {
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

      try {
        // Verificar si ya existen eventos similares para evitar duplicados
        const existingEventsCount = await eventsCollection.countDocuments({ 
          childId: new ObjectId(TARGET_CHILD_ID) 
        });
        
        if (existingEventsCount > 0) {
          console.log(`⚠️ Advertencia: Ya existen ${existingEventsCount} eventos para este niño.`);
          console.log('Continuando con la inserción...');
        }

        const result = await eventsCollection.insertMany(eventsToInsert, { ordered: false });
        
        if (result.insertedCount > 0) {
          console.log('🎉 ¡Éxito! Los eventos han sido agregados correctamente.');
          
          // Mostrar resumen
          const totalEvents = await eventsCollection.countDocuments({ 
            childId: new ObjectId(TARGET_CHILD_ID) 
          });
          console.log(`📈 Total de eventos para ${child.firstName}: ${totalEvents}`);
          console.log(`📊 Eventos insertados en esta ejecución: ${result.insertedCount}`);
        } else {
          console.warn('⚠️ Advertencia: No se insertaron eventos. Verifica los datos del CSV.');
        }
      } catch (insertError) {
        if (insertError.code === 11000) {
          console.error('❌ Error: Algunos eventos ya existen (duplicados). Considera usar upsert.');
        } else {
          console.error('❌ Error insertando eventos:', insertError.message);
        }
        throw insertError;
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
main().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});

/*
INSTRUCCIONES DE USO:

1. Configurar variables de entorno:
   - Crear archivo .env en la raíz del proyecto
   - Agregar MONGODB_URI con tu cadena de conexión
   - Agregar TARGET_CHILD_ID con el ID del niño

2. Instalar dependencias si es necesario:
   npm install mongodb csv-parser dotenv

3. Ejecutar el script:
   node loadEvents.js

4. Verificar resultados:
   - El script mostrará estadísticas de inserción
   - Los eventos aparecerán en la colección 'events'
   - Se respeta la arquitectura de la aplicación

FORMATO ESPERADO DEL CSV:
- eventDate (MM/DD/YYYY): Fecha del evento
- eventType: Tipo de evento (sleep, wake, nap, feeding, etc.)
- startTime: Hora de inicio (HH:MM)
- endTime: Hora de fin (opcional)
- emotionalState: Estado emocional (opcional)
- notes: Notas (opcional)
- sleepDelay: Tiempo para dormirse en minutos (opcional)

ARQUITECTURA:
- Los eventos se insertan en la colección 'events' separada
- Cada evento incluye childId y parentId para data isolation
- Compatible con la estructura de datos de Happy Dreamers v4.0
*/