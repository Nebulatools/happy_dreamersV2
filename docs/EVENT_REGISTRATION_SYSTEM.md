# Sistema de Registro de Eventos - Happy Dreamers 🌙

## 📋 Descripción General

Sistema dual de registro de eventos que ofrece dos modos de operación:
- **Modo Simple (Recomendado)**: Interfaz simplificada con ciclo unificado de sueño
- **Modo Manual (Avanzado)**: Acceso completo a todos los tipos de eventos

## 🏗️ Arquitectura del Sistema

### Estructura de Componentes

```
/components/events/
├── /primary/                    # Componentes del modo simple
│   ├── UnifiedSleepCycle.tsx   # Ciclo unificado dormir/despertar
│   ├── PrimaryFeedingButton.tsx # Botón principal de alimentación
│   ├── SimplePrimaryMode.tsx    # Interfaz principal del modo simple
│   └── SimpleSleepDelaySelector.tsx # Selector de tiempo para dormirse
│
├── /manual/                     # Componentes del modo manual (preservados)
│   └── [Componentes existentes]
│
├── /shared/                     # Componentes compartidos
│   └── GuidedNotesField.tsx    # Campo de notas con placeholders guiados
│
└── EventRegistrationDualMode.tsx # Orquestador principal del sistema dual

/contexts/
└── EventRegistrationModeContext.tsx # Gestión del modo activo
```

## 🎯 Modo Simple (Principal)

### Características Principales

#### Ciclo Unificado de Sueño
- **UN SOLO BOTÓN** que alterna entre estados
- Estados: "SE DURMIÓ" ↔ "SE DESPERTÓ"
- Auto-clasificación según horario:
  - 🌙 **Sueño Nocturno**: 19:00 - 10:00 (se registra como `sleep`)
  - ☀️ **Siesta**: 10:00 - 19:00 (se registra como `nap`)

#### Registro Preciso de Tiempos
1. **Hora de Acostarse**: Capturada cuando se presiona el botón
2. **Tiempo de Latencia**: Cuánto tardó en dormirse (0-120 min)
3. **Hora Real de Sueño**: Calculada como hora_acostarse + minutos_delay

#### Datos Registrados
```javascript
{
  bedtime: "2025-01-27T20:00:00Z",    // Hora que se acostó
  startTime: "2025-01-27T20:15:00Z",  // Hora que se durmió
  sleepDelay: 15,                     // Minutos que tardó
  emotionalState: "calm",              // Estado emocional
  eventType: "sleep" | "nap",         // Tipo según horario
  wakeWindow: 180,                     // Minutos despierto antes
}
```

### Alimentación como Evento Primario
- Botón prominente de alimentación
- Modal especializado con subtipos:
  - Pecho / Biberón / Sólidos
- Pregunta crítica para tomas nocturnas (23:00-05:00):
  - ¿Bebé dormido o despierto?

### Eventos Secundarios
- Medicamentos
- Actividades Extra
- Acceso discreto mediante botones pequeños

## 🔧 Modo Manual (Avanzado)

### Características
- Acceso completo a TODOS los tipos de eventos
- Selector de fecha/hora completo
- Todos los campos opcionales disponibles
- Para registros retroactivos o casos especiales

### Casos de Uso
- Registro de eventos olvidados
- Eventos complejos o múltiples
- Corrección de registros anteriores
- Preferencia personal del usuario

## 🔄 Sistema de Cambio de Modos

### Persistencia de Preferencias
- Guarda preferencia en `localStorage`
- Recuerda el último modo usado
- Switch visual claro entre modos

### Indicadores Visuales
- Badge indicando modo activo
- Texto descriptivo del modo
- Botón de cambio siempre visible

## 📊 Clasificación Automática de Eventos

### Lógica de Horarios

| Hora | Tipo de Evento | Color en Calendario | Texto del Botón |
|------|----------------|---------------------|-----------------|
| 19:00 - 10:00 | Sueño Nocturno (`sleep`) | Azul 🔵 | "SE DURMIÓ" |
| 10:00 - 19:00 | Siesta (`nap`) | Naranja 🟠 | "INICIAR SIESTA" |

### Ventanas de Sueño
- Cálculo automático del tiempo despierto entre sueños
- Métrica importante para análisis profesional
- Visible en la descripción del botón principal

## 🔐 Validaciones y Seguridad

### Validaciones de Datos
- Tiempos coherentes (hora fin > hora inicio)
- Delay de sueño: 0-120 minutos
- Estados emocionales predefinidos
- Campos obligatorios según tipo de evento

### Manejo de Errores
- Validación defensiva de fechas
- Mensajes de error en español
- Recuperación automática de estados
- Prevención de registros duplicados

## 💾 Integración con Backend

### API Endpoints
- `POST /api/children/events` - Crear evento
- `GET /api/children/events` - Obtener eventos
- `PUT /api/children/events` - Actualizar evento
- `DELETE /api/children/events` - Eliminar evento

### Estructura de Datos MongoDB
```javascript
{
  _id: ObjectId,
  childId: String,
  eventType: String,        // 'sleep', 'nap', 'wake', 'feeding', etc.
  startTime: Date,          // Hora real del evento
  bedtime: Date,           // Hora de acostarse (para sueño)
  sleepDelay: Number,      // Minutos para dormirse
  emotionalState: String,   // 'calm', 'restless', 'upset'
  notes: String,           // Notas opcionales
  wakeWindow: Number,      // Minutos despierto antes
  createdAt: Date,
  parentId: String
}
```

## 🎨 Experiencia de Usuario

### Flujo Principal (Modo Simple)
1. Padre presiona "SE DURMIÓ" cuando acuesta al niño
2. Sistema captura hora exacta de acostarse
3. Padre indica cuánto tardó en dormirse (opciones rápidas)
4. Opcional: Estado emocional y notas
5. Confirmar → Sistema registra con tiempos precisos

### Feedback Visual
- Colores dinámicos según hora del día
- Estados visuales claros (durmiendo/despierto)
- Confirmaciones con toast notifications
- Tiempos calculados mostrados en tiempo real

## 🚀 Características Técnicas

### Performance
- Componentes memoizados
- Estado local con localStorage
- Cálculos optimizados de fechas
- Renderizado condicional eficiente

### Accesibilidad
- Botones grandes y táctiles
- Contraste adecuado de colores
- Textos descriptivos claros
- Soporte para navegación con teclado

### Responsive Design
- Mobile-first approach
- Adaptación a diferentes tamaños
- Touch-friendly en dispositivos móviles
- Desktop optimizado para productividad

## 📈 Métricas y Análisis

### Datos Capturados para Análisis
- Latencia de sueño (tiempo para dormirse)
- Duración total de sueño
- Ventanas de vigilia entre sueños
- Patrones de siestas vs sueño nocturno
- Estados emocionales al dormir
- Frecuencia de despertares nocturnos

### Valor Médico
- Identificación de patrones de sueño
- Detección de problemas de latencia
- Análisis de ventanas de sueño óptimas
- Correlación con estados emocionales
- Base para recomendaciones personalizadas

## 🔄 Próximas Mejoras Planificadas

1. **Despertar Nocturno como Sub-evento**
   - Registro dentro del ciclo de sueño
   - No como evento separado

2. **Métricas Avanzadas**
   - Dashboard de ventanas de sueño
   - Tendencias de latencia
   - Comparación con promedios

3. **Integración con IA**
   - Recomendaciones basadas en patrones
   - Alertas de anomalías
   - Predicciones de sueño

## 📝 Notas de Implementación

### Decisiones de Diseño
- Modo simple por defecto para reducir fricción
- Preservación completa del modo manual
- Sin referencias a nombres específicos en UI
- Placeholders guiados para mejor captura de datos

### Consideraciones de Seguridad
- Validación client y server-side
- Sanitización de inputs
- Manejo seguro de fechas
- Protección de datos infantiles

---

*Última actualización: 27 de Enero, 2025*
*Sistema en producción y funcionando correctamente*