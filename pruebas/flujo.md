# Flujo Completo de Pacientes - Happy Dreamers 🌙

## 📋 Resumen del Sistema

Happy Dreamers es una plataforma de seguimiento de sueño infantil que combina:
- **Registro de eventos** por padres
- **Análisis estadístico** automático  
- **Consultas médicas** especializadas
- **Planes personalizados** evolutivos con IA y RAG

---

## 🚀 FLUJO COMPLETO PASO A PASO

### **FASE 1: REGISTRO Y CONFIGURACIÓN INICIAL**

#### 1.1 Registro de Usuario (Parent)
```
POST /api/auth/register
{
  "name": "María García",
  "email": "maria@ejemplo.com", 
  "password": "password123",
  "role": "parent"
}
```
**Resultado**: Usuario creado con array `children: []` vacío

#### 1.2 Creación de Niño
```
POST /api/children
{
  "firstName": "Sofia",
  "lastName": "García",
  "birthDate": "2022-03-15"
}
```
**Proceso Backend**:
1. Crea documento en colección `children`
2. **ACTUALIZA** usuario con `$addToSet: { children: childId }`
3. Retorna childId para vincular con cuestionario

#### 1.3 Completar Cuestionario Detallado
```
POST /api/survey
{
  "childId": "64abc123...",
  "surveyData": {
    "informacionFamiliar": {
      "papa": { "nombre": "Carlos", "edad": 35, ... },
      "mama": { "nombre": "María", "edad": 33, ... }
    },
    "dinamicaFamiliar": {
      "cantidadHijos": 2,
      "hijosInfo": [...],
      "quienSeLevaantaNoche": "Ambos padres"
    },
    "historial": {
      "embarazoPlaneado": true,
      "tipoParto": "Cesárea",
      "pediatraConfirmaCapacidadDormir": true
    },
    "desarrolloSalud": {
      "edadCaminar": 14,
      "alimentacion": "Leche materna y fórmula"
    },
    "actividadFisica": {
      "vePantallas": true,
      "pantallasTiempo": "2 horas/día"
    },
    "rutinaHabitos": {
      "rutinaAntesAcostarse": "Baño, cuento, canción",
      "horaDormir": "20:30",
      "haceSiestas": true,
      "dondeDuermeNoche": "Cuna/corral en su cuarto"
    }
  }
}
```

---

### **FASE 2: REGISTRO DE EVENTOS DIARIOS**

#### 2.1 Eventos de Sueño Básicos
```
POST /api/events
{
  "childId": "64abc123...",
  "eventType": "sleep_start",
  "startTime": "2025-01-15T20:45:00Z",
  "notes": "Se durmió fácilmente después del cuento"
}

POST /api/events  
{
  "childId": "64abc123...",
  "eventType": "wake_up", 
  "startTime": "2025-01-16T07:15:00Z",
  "mood": "feliz"
}
```

#### 2.2 Eventos Adicionales
```
// Alimentación
POST /api/events
{
  "eventType": "feeding",
  "feedingType": "breast_milk",
  "duration": 25,
  "notes": "Comió bien"
}

// Despertar nocturno
POST /api/events
{
  "eventType": "night_waking", 
  "duration": 15,
  "notes": "Lloró 5 minutos, volvió a dormir"
}

// Siesta
POST /api/events
{
  "eventType": "nap_start",
  "startTime": "2025-01-16T14:00:00Z"
}
```

---

### **FASE 3: GENERACIÓN DEL PLAN INICIAL (PLAN 0)**

#### 3.1 Condiciones para Plan 0
- Niño tiene cuestionario completado
- Al menos 1-2 semanas de eventos registrados
- Admin accede a `/dashboard/consultas`

#### 3.2 Proceso de Generación
```
POST /api/consultas/plans
{
  "userId": "688ce146d2d5ff9616549d86",
  "childId": "64abc123...",
  "planType": "initial"
}
```

**Proceso Backend**:
1. **Obtener datos del niño** con survey completo
2. **Calcular estadísticas** usando `processSleepStatistics()`:
   ```javascript
   const stats = {
     avgSleepDuration: "11h 30m",
     avgWakeTime: "07:15", 
     totalEvents: 45,
     dominantMood: "tranquilo",
     consistencyScore: 75
   }
   ```
3. **Buscar en RAG** knowledge base:
   - Patrones de sueño para edad específica
   - Rutinas recomendadas
   - Mejores prácticas pediátricas
4. **Generar plan con OpenAI GPT-4**:
   ```json
   {
     "schedule": {
       "bedtime": "20:30",
       "wakeTime": "07:00", 
       "meals": [
         {"time": "07:30", "type": "desayuno", "description": "..."},
         {"time": "12:00", "type": "almuerzo", "description": "..."}
       ],
       "naps": [
         {"time": "14:00", "duration": 90, "description": "Siesta principal"}
       ]
     },
     "objectives": [
       "Consolidar sueño nocturno de 11 horas continuas",
       "Establecer rutina de siesta consistente"
     ],
     "recommendations": [
       "Mantener rutina pre-sueño de 30 minutos",
       "Limitar pantallas 2 horas antes de dormir"
     ]
   }
   ```

#### 3.3 Resultado Plan 0
```javascript
// Guardado en collection 'child_plans'
{
  "_id": ObjectId("..."),
  "childId": ObjectId("64abc123..."),
  "userId": ObjectId("688ce146d2d5ff9616549d86"),
  "planNumber": 0,
  "planType": "initial",
  "title": "Plan Inicial para Sofia",
  "schedule": { ... },
  "objectives": [...],
  "recommendations": [...],
  "basedOn": "survey_stats_rag",
  "sourceData": {
    "surveyDataUsed": true,
    "childStatsUsed": true, 
    "ragSources": ["guia-sueno-infantil.pdf", "rutinas-2-años.txt"],
    "ageInMonths": 22,
    "totalEvents": 45
  },
  "status": "active",
  "createdAt": "2025-01-15T10:30:00Z"
}
```

---

### **FASE 4: SEGUIMIENTO Y REGISTRO CONTINUO**

#### 4.1 Implementación del Plan 0
- **Padres siguen** horarios del plan inicial
- **Registran eventos** según rutina establecida:
  ```
  20:30 - sleep_start (siguiendo plan)
  07:00 - wake_up (objetivo del plan)  
  14:00 - nap_start (horario planificado)
  15:30 - nap_end (duración 90min según plan)
  ```

#### 4.2 Monitoreo de Progreso  
- Sistema calcula estadísticas **desde último plan**
- Métricas de adherencia al plan:
  ```javascript
  const progressStats = {
    planAdherence: 85%, // % eventos que siguen horarios del plan
    sleepConsistency: 78%, // variación en horarios
    avgBedtimeVariation: "±15 minutos",
    planObjectivesProgress: {
      "sueño_continuo_11h": "75% logrado",
      "siesta_consistente": "90% logrado" 
    }
  }
  ```

---

### **FASE 5: CONSULTA MÉDICA Y ANÁLISIS**

#### 5.1 Admin Programa Consulta
- Acceso a `/dashboard/consultas`
- Selecciona usuario y niño específico
- Tiene contexto completo: Plan 0 + eventos desde plan

#### 5.2 Realización de Consulta
```
POST /api/consultas/analyze
{
  "userId": "688ce146d2d5ff9616549d86",
  "childId": "64abc123...",
  "transcript": "
    Doctor: Buenos días María, ¿cómo ha ido Sofia con el plan inicial?
    
    Madre: Hola doctor. En general bien, pero tenemos algunas dificultades. 
    El horario de dormir a las 8:30 PM funciona muy bien, ella se duerme 
    fácilmente. Pero el despertar a las 7:00 AM es imposible para nosotros 
    porque yo trabajo desde las 6:30 AM.
    
    Doctor: Entiendo. ¿A qué hora despierta naturalmente Sofia?
    
    Madre: Normalmente entre 7:30 y 8:00 AM. ¿Podríamos ajustar el plan 
    para despertar a las 8:00 AM? También, la siesta de las 2:00 PM a veces 
    interfiere con la hora de recoger a su hermano del colegio.
    
    Doctor: Perfecto, podemos hacer esos ajustes. Propongo despertar a las 
    8:00 AM y mover la siesta a las 1:30 PM. ¿Te parece viable?
    
    Madre: Sí, eso funcionaría mucho mejor para nuestra rutina familiar.
    
    Doctor: Excelente. También veo que ha mejorado mucho la consistencia 
    del sueño nocturno. ¿Cómo va con el tiempo de pantallas?
    
    Madre: Hemos logrado reducirlo, pero aún vemos TV hasta las 7:00 PM. 
    ¿Está bien?
    
    Doctor: Ideal sería hasta las 6:30 PM para el nuevo horario. ¿Creen 
    que puedan intentarlo?
    
    Madre: Sí, podemos intentar cenar más temprano y terminar pantallas 
    a las 6:30 PM.
    
    Doctor: Perfecto. Entonces acordamos: despertar 8:00 AM, siesta 1:30 PM, 
    y pantallas hasta 6:30 PM máximo.
  "
}
```

#### 5.3 Proceso de Análisis Backend
1. **Obtener estadísticas actuales** desde Plan 0
2. **Analizar transcript completo** con GPT-4 especializado:
   - Extrae situación actual reportada
   - Identifica problemas y limitaciones
   - Detecta acuerdos y horarios finales negociados
   - Considera viabilidad práctica familiar
3. **Generar reporte integral**:
   ```json
   {
     "analysis": "Sofia ha mostrado excelente progreso con el Plan 0, especialmente en la consolidación del sueño nocturno y facilidad para dormirse a las 20:30. Sin embargo, la familia ha identificado dos limitaciones prácticas importantes: el despertar a las 7:00 AM no es viable debido al horario laboral de la madre (6:30 AM), y la siesta a las 14:00 interfiere con recoger al hermano del colegio. Los padres reportan que Sofia despierta naturalmente entre 7:30-8:00 AM, lo que sugiere que su ritmo circadiano natural permite un ajuste viable.",
     
     "recommendations": "Basándose en los acuerdos alcanzados en la consulta, se recomienda: 1) Ajustar hora de despertar a las 8:00 AM (acordado como viable para la familia), 2) Mover siesta a las 13:30 PM para evitar conflictos con rutina escolar, 3) Establecer límite de pantallas hasta las 18:30 PM máximo para mantener la rutina pre-sueño efectiva. Estos cambios mantienen la estructura exitosa del plan actual mientras se adaptan a las necesidades prácticas familiares."
   }
   ```

---

### **FASE 6: GENERACIÓN DE PLAN ACTUALIZADO (PLAN 1+)**

#### 6.1 Proceso de Actualización
```
POST /api/consultas/plans  
{
  "userId": "688ce146d2d5ff9616549d86",
  "childId": "64abc123...",
  "planType": "transcript_based",
  "reportId": "64def456..." // ID del análisis anterior
}
```

#### 6.2 Backend Process Plan 1
1. **Obtener Plan 0** como base
2. **Extraer cambios específicos** del transcript:
   ```json
   {
     "wakeTime": "08:00", // Acordado en consulta
     "napTime": "13:30",  // Acordado para rutina escolar  
     "screenTimeCutoff": "18:30", // Acordado como viable
     "bedtime": "20:30" // Mantener (funciona bien)
   }
   ```
3. **Generar Plan 1** con IA especializada:
   - Usa Plan 0 como base
   - **PRIORIZA horarios acordados** en transcript
   - Mantiene elementos exitosos del plan anterior
   - Ajusta objetivos según nuevos horarios

#### 6.3 Resultado Plan 1
```javascript
{
  "_id": ObjectId("..."),
  "planNumber": 1,
  "planType": "transcript_based", 
  "title": "Plan 1 para Sofia (Actualización)",
  "schedule": {
    "bedtime": "20:30", // Mantenido (exitoso)
    "wakeTime": "08:00", // CAMBIADO según consulta
    "meals": [
      {"time": "08:30", "type": "desayuno"}, // Ajustado +30min
      {"time": "12:30", "type": "almuerzo"}, // Ajustado para nueva siesta
    ],
    "naps": [
      {"time": "13:30", "duration": 90} // CAMBIADO según consulta
    ]
  },
  "objectives": [
    "Mantener sueño nocturno consolidado con nuevo horario 20:30-08:00",
    "Adaptar siesta 13:30-15:00 sin interferir rutina escolar familiar"  
  ],
  "recommendations": [
    "Terminar tiempo de pantalla a las 18:30 máximo",
    "Mantener rutina pre-sueño efectiva (baño, cuento, canción)",
    "Ajustar horarios de comidas gradualmente al nuevo despertar"
  ],
  "basedOn": "transcript_analysis",
  "transcriptAnalysis": {
    "reportId": ObjectId("64def456..."),
    "improvements": [
      "Mejor adaptación a horario laboral familiar",
      "Eliminación de conflictos con rutina escolar"
    ],
    "adjustments": [
      "Despertar: 07:00 → 08:00 (horario natural del niño)",
      "Siesta: 14:00 → 13:30 (evita conflicto escolar)",
      "Límite pantallas: 19:00 → 18:30 (rutina pre-sueño)"
    ],
    "previousPlanNumber": 0
  },
  "status": "active", // Plan 0 marcado como "superseded"
  "createdAt": "2025-02-01T15:45:00Z"
}
```

---

### **FASE 7: CICLO EVOLUTIVO CONTINUO**

#### 7.1 Implementación Plan 1
- Padres siguen **nuevos horarios acordados**
- Registran eventos según **rutina actualizada**
- Sistema monitorea adherencia y progreso

#### 7.2 Futuras Consultas (Plan 2, 3, N...)
- **Cada consulta** genera nuevo análisis
- **Cada plan** se basa en el anterior + cambios del transcript
- **Evolución progresiva** adaptándose a crecimiento del niño
- **Historial completo** disponible para contexto médico

#### 7.3 Métricas de Evolución
```javascript
const evolutionMetrics = {
  totalPlans: 3,
  currentPlan: 2,
  progressOverTime: {
    plan0: { adherence: 75%, satisfaction: 80% },
    plan1: { adherence: 90%, satisfaction: 95% },
    plan2: { adherence: 85%, satisfaction: 90% }
  },
  keyImprovements: [
    "Horarios más realistas para familia",
    "Mejor adaptación al crecimiento",
    "Mayor consistencia en rutinas"
  ]
}
```

---

## 🔄 RESUMEN DEL FLUJO COMPLETO

### **Estados del Sistema por Fase**:

| Fase | Usuario | Niño | Eventos | Plan | Estado |
|------|---------|------|---------|------|--------|
| 1 | ✅ Registrado | ✅ Creado + Survey | - | - | Configuración |
| 2 | ✅ | ✅ | ✅ Registro diario | - | Recolección datos |
| 3 | ✅ | ✅ | ✅ (1-2 semanas) | ✅ Plan 0 | Plan inicial |
| 4 | ✅ | ✅ | ✅ Siguiendo plan | ✅ Plan 0 activo | Seguimiento |
| 5 | ✅ | ✅ | ✅ Datos acumulados | ✅ Plan 0 | Consulta médica |
| 6 | ✅ | ✅ | ✅ Continua | ✅ Plan 1 activo | Plan actualizado |
| N | ✅ | ✅ | ✅ Histórico completo | ✅ Plan N | Evolución continua |

### **Flujo de Datos Clave**:
1. **Survey** → Plan 0 (base inicial)
2. **Eventos** → Estadísticas → Análisis consulta  
3. **Transcript** → Acuerdos → Plan N+1
4. **Plan anterior** → Plan nuevo (evolución incremental)

### **Integración de Sistemas**:
- **RAG Knowledge Base**: Mejores prácticas pediátricas
- **Estadísticas Automatizadas**: Métricas objetivas de progreso
- **IA Especializada**: Análisis y generación de planes personalizada
- **Workflow Médico**: Consultas estructuradas con seguimiento

---

## 💡 **BENEFICIOS DEL FLUJO EVOLUTIVO**

✅ **Personalización Progressive**: Cada plan mejora el anterior  
✅ **Adaptación Familiar**: Considera limitaciones prácticas reales  
✅ **Evidencia Objetiva**: Decisiones basadas en datos y estadísticas  
✅ **Contexto Médico**: Historial completo para profesionales  
✅ **Escalabilidad**: Funciona para múltiples niños por familia  
✅ **Seguimiento Longitudinal**: Evolución del desarrollo infantil  

Este flujo garantiza que cada niño tenga un plan personalizado que evoluciona con su crecimiento y se adapta a las necesidades familiares reales. 🌟