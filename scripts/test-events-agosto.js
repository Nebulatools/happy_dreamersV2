/**
 * Script para crear eventos de prueba del 1 de agosto 2025 para Bernardo
 * ID del niño: 68ad0476b98bdbe0f7ff5941
 */

// Función para registrar evento
async function registrarEvento(eventData) {
  try {
    const response = await fetch('/api/children/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || errorData.details || 'Error al registrar evento');
    }

    const result = await response.json();
    console.log(`✅ Evento ${eventData.eventType} registrado:`, result);
    return result;
  } catch (error) {
    console.error(`❌ Error al registrar evento ${eventData.eventType}:`, error.message);
    return null;
  }
}

// Eventos de prueba del 1 de agosto 2025
const eventosAgoste1 = [
  // 1. Despertar matutino - 6:30 AM
  {
    childId: '68ad0476b98bdbe0f7ff5941',
    eventType: 'wake',
    startTime: '2025-08-01T06:30:00.000Z',
    notes: 'Despertó naturalmente, de buen humor'
  },

  // 2. Alimentación matutina - 7:00 AM (30 min)
  {
    childId: '68ad0476b98bdbe0f7ff5941',
    eventType: 'feeding',
    startTime: '2025-08-01T07:00:00.000Z',
    endTime: '2025-08-01T07:30:00.000Z',
    feedingType: 'bottle',
    feedingAmount: 150,
    feedingDuration: 25,
    babyState: 'awake',
    feedingNotes: 'Se tomó todo el biberón, eructó bien'
  },

  // 3. Actividad extra - Paseo matutino - 8:00 AM
  {
    childId: '68ad0476b98bdbe0f7ff5941',
    eventType: 'extra_activities',
    startTime: '2025-08-01T08:00:00.000Z',
    activityDescription: 'Paseo por el parque',
    activityDuration: 60,
    activityImpact: 'positive',
    activityNotes: 'Disfrutó mucho el aire fresco y los sonidos de la naturaleza'
  },

  // 4. Siesta matutina - 9:30 AM a 11:00 AM
  {
    childId: '68ad0476b98bdbe0f7ff5941',
    eventType: 'nap',
    startTime: '2025-08-01T09:30:00.000Z',
    endTime: '2025-08-01T11:00:00.000Z',
    sleepDelay: 10,
    emotionalState: 'tranquilo'
  },

  // 5. Alimentación del mediodía - 11:30 AM
  {
    childId: '68ad0476b98bdbe0f7ff5941',
    eventType: 'feeding',
    startTime: '2025-08-01T11:30:00.000Z',
    endTime: '2025-08-01T12:00:00.000Z',
    feedingType: 'bottle',
    feedingAmount: 180,
    feedingDuration: 30,
    babyState: 'awake',
    feedingNotes: 'Buen apetito, terminó todo'
  },

  // 6. Medicamento - Vitaminas - 12:15 PM
  {
    childId: '68ad0476b98bdbe0f7ff5941',
    eventType: 'medication',
    startTime: '2025-08-01T12:15:00.000Z',
    medicationName: 'Vitamina D',
    medicationDose: '2 gotas',
    medicationTime: '2025-08-01T12:15:00.000Z',
    medicationNotes: 'Vitamina diaria como indica el pediatra'
  },

  // 7. Siesta de la tarde - 2:00 PM a 4:30 PM
  {
    childId: '68ad0476b98bdbe0f7ff5941',
    eventType: 'nap',
    startTime: '2025-08-01T14:00:00.000Z',
    endTime: '2025-08-01T16:30:00.000Z',
    sleepDelay: 15,
    emotionalState: 'tranquilo'
  },

  // 8. Alimentación de la tarde - 5:00 PM
  {
    childId: '68ad0476b98bdbe0f7ff5941',
    eventType: 'feeding',
    startTime: '2025-08-01T17:00:00.000Z',
    endTime: '2025-08-01T17:25:00.000Z',
    feedingType: 'bottle',
    feedingAmount: 160,
    feedingDuration: 20,
    babyState: 'awake',
    feedingNotes: 'Un poco distraído pero terminó la mayor parte'
  },

  // 9. Actividad extra - Baño relajante - 6:30 PM
  {
    childId: '68ad0476b98bdbe0f7ff5941',
    eventType: 'extra_activities',
    startTime: '2025-08-01T18:30:00.000Z',
    activityDescription: 'Baño relajante con aceites',
    activityDuration: 30,
    activityImpact: 'positive',
    activityNotes: 'Le encanta el agua tibia, muy relajante'
  },

  // 10. Alimentación nocturna - 7:30 PM
  {
    childId: '68ad0476b98bdbe0f7ff5941',
    eventType: 'feeding',
    startTime: '2025-08-01T19:30:00.000Z',
    endTime: '2025-08-01T20:00:00.000Z',
    feedingType: 'bottle',
    feedingAmount: 200,
    feedingDuration: 30,
    babyState: 'awake',
    feedingNotes: 'Última toma antes de dormir, tomó todo lentamente'
  },

  // 11. Dormir nocturno - 8:00 PM
  {
    childId: '68ad0476b98bdbe0f7ff5941',
    eventType: 'sleep',
    startTime: '2025-08-01T20:00:00.000Z',
    sleepDelay: 20,
    emotionalState: 'tranquilo',
    notes: 'Se durmió después de un rato de arrullos, rutina nocturna completa'
  },

  // 12. Despertar nocturno - 2:30 AM (2 de agosto)
  {
    childId: '68ad0476b98bdbe0f7ff5941',
    eventType: 'night_waking',
    startTime: '2025-08-02T02:30:00.000Z',
    awakeDelay: 45,
    emotionalState: 'inquieto',
    notes: 'Despertó llorando, tardó en calmarse y volver a dormir'
  },

  // 13. Toma nocturna - 3:00 AM
  {
    childId: '68ad0476b98bdbe0f7ff5941',
    eventType: 'feeding',
    startTime: '2025-08-02T03:00:00.000Z',
    endTime: '2025-08-02T03:20:00.000Z',
    feedingType: 'bottle',
    feedingAmount: 120,
    feedingDuration: 20,
    babyState: 'asleep',
    feedingNotes: 'Toma nocturna, se durmió mientras tomaba'
  }
];

// Función principal
async function crearEventosPrueba() {
  console.log('🚀 Iniciando creación de eventos de prueba para el 1 de agosto 2025...');
  console.log(`👶 Niño: Bernardo (ID: 68ad0476b98bdbe0f7ff5941)`);
  console.log(`📅 Fecha: 1 de agosto 2025`);
  console.log(`📊 Total de eventos: ${eventosAgoste1.length}`);
  console.log('---');

  let exitosos = 0;
  let fallidos = 0;

  for (const evento of eventosAgoste1) {
    const resultado = await registrarEvento(evento);
    if (resultado) {
      exitosos++;
    } else {
      fallidos++;
    }
    
    // Esperar un poco entre eventos para evitar saturar la API
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('---');
  console.log('📈 Resumen:');
  console.log(`✅ Eventos exitosos: ${exitosos}`);
  console.log(`❌ Eventos fallidos: ${fallidos}`);
  console.log('🏁 Proceso completado');
}

// Ejecutar si está en el navegador
if (typeof window !== 'undefined') {
  // Agregar botón para ejecutar desde el navegador
  const button = document.createElement('button');
  button.textContent = 'Crear Eventos de Prueba - 1 Agosto 2025';
  button.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 9999; padding: 10px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;';
  button.onclick = crearEventosPrueba;
  document.body.appendChild(button);
}

// Exportar para uso en Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { crearEventosPrueba, eventosAgoste1 };
}