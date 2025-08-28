⏺ 🔍 TIPOS DE EVENTOS DISPONIBLES 
  ACTUALMENTE EN LA BASE DE DATOS

  Basado en mi análisis del código
  backend de Happy Dreamers, estos son
  TODOS los tipos de eventos que están
  realmente implementados y disponibles:

  ---
  📋 TIPOS DE EVENTOS DEFINIDOS EN EL 
  CÓDIGO

  🎯 Enum Principal: SleepEventType

  // types/models.ts - Línea 216-225
  export enum SleepEventType {
    BEDTIME = "bedtime",              // 
  🛏️ Hora de acostarse
    WAKE_UP = "wake_up",              // 
  ⏰ Despertar matutino  
    NAP_START = "nap_start",          // 
  😴 Inicio de siesta
    NAP_END = "nap_end",              // 
  🌅 Fin de siesta
    NIGHT_WAKING = "night_waking",    // 
  🌙 Despertar nocturno
    NIGHTMARE = "nightmare",          // 
  😰 Pesadilla
    SLEEP_WALKING = "sleep_walking",  // 
  🚶 Sonambulismo
    OTHER = "other"                   // 
  ❓ Otros eventos
  }

  ---
  🔍 TIPOS DE EVENTOS REALMENTE 
  UTILIZADOS EN EL BACKEND

  📊 Análisis de Uso en APIs

  1. API /api/events/route.ts

  ✅ Acepta todos los tipos del enum 
  SleepEventType
  // Validación en el backend
  const validEventTypes = [
    "bedtime",
    "wake_up",
    "nap_start",
    "nap_end",
    "night_waking",
    "nightmare",
    "sleep_walking",
    "other"
  ]

  2. Validación en Formularios 
  (lib/validations/event.ts)

  ✅ Campo eventType acepta string libre
  eventType: z.string({
    required_error: "Por favor selecciona
   un tipo de evento",
  })
  // NO hay restricción específica a los 
  valores del enum

  3. Cálculos de Estadísticas 
  (lib/sleep-calculations.ts)

  ✅ Reconoce tipos específicos para 
  cálculos
  // Tipos reconocidos en cálculos 
  automáticos:
  - "bedtime" → para calcular hora
  promedio de acostarse
  - "wake_up" → para calcular hora
  promedio de despertar
  - "nap_start" + "nap_end" → para
  calcular duración de siestas
  - "night_waking" → para contar
  despertares nocturnos

  ---
  🗃️ CONSULTA DIRECTA A BASE DE DATOS

  Para verificar qué tipos están 
  realmente almacenados en tu base de
  datos:

  // Query para obtener TODOS los tipos 
  de eventos únicos
  db.events.distinct("type")

  // Query para contar eventos por tipo
  db.events.aggregate([
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ])

  // Query para ver eventos tipo "other" 
  con sus notas
  db.events.find(
    { type: "other" },
    { type: 1, notes: 1, createdAt: 1 }
  ).sort({ createdAt: -1 }).limit(10)

  ---
  📝 CAMPOS ADICIONALES DISPONIBLES POR 
  EVENTO

  🔧 Estructura Completa de Evento

  // Campos que SÍ están implementados y 
  se usan:
  {
    _id: ObjectId,
    childId: ObjectId,           // ✅ 
  OBLIGATORIO
    userId: ObjectId,            // ✅ 
  OBLIGATORIO  
    type: string,                // ✅ 
  OBLIGATORIO - uno de los 8 tipos
    date: Date,                  // ✅ 
  OBLIGATORIO
    time: string,                // ✅ 
  OBLIGATORIO - formato "HH:MM"
    duration?: number,           // ✅ 
  OPCIONAL - minutos
    quality?: 1|2|3|4|5,        // ✅ 
  OPCIONAL - calidad del sueño
    notes?: string,              // ✅ 
  OPCIONAL - texto libre
    symptoms?: string[],         // ✅ 
  OPCIONAL - array de síntomas
    mood?: string,               // ✅ 
  OPCIONAL - estado emocional
    createdAt: Date,             // ✅ 
  AUTO-GENERADO
    updatedAt: Date              // ✅ 
  AUTO-GENERADO
  }

  📊 Estados Emocionales (mood) 
  Disponibles

  // Valores permitidos para mood:
  "feliz" | "tranquilo" | "irritable" |
  "cansado"

  ---
  ⚡ EVENTOS ESPECIALES EN FORMULARIOS

  🎯 Campos Dinámicos por Tipo de Evento

  Para type: "bedtime"

  // Campos adicionales en validación de 
  formulario:
  {
    sleepDelay?: number,           // 
  Tiempo para conciliar sueño (0-180 min)
    nightWakingCount?: number,     // 
  Cantidad de despertares (0-10)
    extraActivities?: string[]     // 
  Actividades adicionales
  }

  Para todos los tipos

  // Campos comunes disponibles:
  {
    emotionalState: string,        // 
  Estado emocional (OBLIGATORIO en form)
    startTime: string,             // 
  Hora de inicio (OBLIGATORIO)
    endTime?: string,              // 
  Hora de fin (OPCIONAL)
    duration?: number,             // 
  Duración calculada (OPCIONAL)
    notes?: string                 // 
  Notas libres (OPCIONAL)
  }

  ---
  🔍 TIPOS DE EVENTOS EN DIFERENTES 
  MÓDULOS

  📈 En Estadísticas 
  (processSleepStatistics)

  ✅ Tipos reconocidos para análisis
  // Eventos que generan estadísticas 
  automáticas:
  "bedtime"      → Promedio hora
  acostarse
  "wake_up"      → Promedio hora
  despertar
  "nap_start"    → Inicio de siestas
  "nap_end"      → Fin de siestas
  "night_waking" → Conteo de
  interrupciones

  📊 En Dashboard y Reportes

  ✅ Todos los 8 tipos se muestran en 
  interfaces
  // Iconos y labels por tipo:
  "bedtime" → "🛏️ Hora de acostarse"
  "wake_up" → "⏰ Despertar"
  "nap_start" → "😴 Inicio de siesta"
  "nap_end" → "🌅 Fin de siesta"
  "night_waking" → "🌙 Despertar 
  nocturno"
  "nightmare" → "😰 Pesadilla"
  "sleep_walking" → "🚶 Sonambulismo"
  "other" → "❓ Otro"

  ---
  ✅ RESUMEN FINAL: TIPOS DISPONIBLES 
  ACTUALMENTE

  | Tipo               | Valor en DB
  | Usado en APIs | Usado en Stats |
  Usado en UI |
  |--------------------|-----------------
  |---------------|----------------|-----
  --------|
  | Hora de acostarse  | "bedtime"
  | ✅             | ✅              | ✅
             |
  | Despertar matutino | "wake_up"
  | ✅             | ✅              | ✅
             |
  | Inicio de siesta   | "nap_start"
  | ✅             | ✅              | ✅
             |
  | Fin de siesta      | "nap_end"
  | ✅             | ✅              | ✅
             |
  | Despertar nocturno | "night_waking"
  | ✅             | ✅              | ✅
             |
  | Pesadilla          | "nightmare"
  | ✅             | ❌              | ✅
             |
  | Sonambulismo       | "sleep_walking"
  | ✅             | ❌              | ✅
             |
  | Otros eventos      | "other"
  | ✅             | ❌              | ✅
             |

  TOTAL: 8 tipos de eventos están 
  completamente implementados y 
  funcionando en el backend de Happy 
  Dreamers.

  Todos están relacionados con patrones 
  de sueño y no hay tipos de eventos para
   alimentación, medicamentos o 
  actividades como entidades separadas en
   el sistema actual.