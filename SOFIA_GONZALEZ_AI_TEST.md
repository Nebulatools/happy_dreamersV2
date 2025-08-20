# 🌙 Sofía González - Preguntas de Prueba para AI Assistant

*Testing completo de todos los agentes con Sofía González específicamente*

---

## 👑 **PERFIL: SOFÍA GONZÁLEZ**

- **Edad**: 2 años (nacida 15 marzo 2023)
- **Perfil**: "dormilona" - Le encanta dormir, siestas largas
- **Plan Activo**: Creado hace 1 mes (21 julio 2025) - Plan Inicial #0
- **Horarios**: Duerme 19:30-7:30 (12h), siesta 13:30-15:30 (2h)
- **Temperamento**: Tranquila, dormilona, fácil de calmar
- **ID**: `68a61767b67a4429652bfe63`

---

## 🤖 **AGENTE 1: RAG ASSISTANT** 
*Dashboard → Assistant (seleccionar Sofía)*

### **PREGUNTAS BÁSICAS**

```
¿Cuál es la rutina ideal para Sofía?
```
**Output esperado**: Mencionar plan activo (19:30-7:30), siesta 2h, rutina personalizada para perfil dormilón

```
¿Está Sofía siguiendo bien su plan de sueño?
```
**Output esperado**: Comparar datos recientes con plan del 21 julio, evaluar adherencia

```
¿Por qué Sofía duerme tanto comparada con otros niños?
```
**Output esperado**: Explicar variaciones individuales, temperamento dormilón, normalidad para su edad

```
¿Cuánto debe dormir Sofía a su edad?
```
**Output esperado**: 12-14h para 2 años, confirmar que Sofía está en rango normal

```
¿Qué pasa si Sofía duerme más de lo recomendado?
```
**Output esperado**: Evaluar si afecta alertness, apetito, desarrollo social

### **PREGUNTAS DE RUTINA**

```
¿A qué hora debería acostar a Sofía?
```
**Output esperado**: Confirmar 19:30 según su plan, explicar por qué es apropiado

```
¿Cuánto tiempo debe durar la siesta de Sofía?
```
**Output esperado**: 2h actual es apropiado, explicar beneficios para niños dormilones

```
¿Qué rutina de acostarse funciona mejor para Sofía?
```
**Output esperado**: Rutina relajante: baño, cuentos, música suave (según su plan)

```
¿Debería despertar a Sofía si duerme mucho?
```
**Output esperado**: Evaluar según alertness diurna y horarios familiares

### **PREGUNTAS DE PROBLEMAS**

```
Sofía no quiere irse a dormir a las 7:30 PM
```
**Output esperado**: Estrategias para transición gradual, mantener consistencia

```
¿Qué hago si Sofía se despierta muy temprano?
```
**Output esperado**: Evaluar ambiente, posibles causas, ajustes graduales

```
Sofía está durmiendo siestas de 3 horas, ¿es mucho?
```
**Output esperado**: Evaluar si afecta sueño nocturno, ajustar si necesario

```
¿Cómo afecta el temperamento dormilón de Sofía a su desarrollo?
```
**Output esperado**: Balance sueño vs actividades sociales, desarrollo típico

### **PREGUNTAS CON CONOCIMIENTO RAG**

```
¿Qué técnicas funcionan mejor para niños dormilones como Sofía?
```
**Output esperado**: Usar conocimiento RAG, personalizar para temperamento específico

```
¿Cuáles son las señales de que Sofía está durmiendo bien?
```
**Output esperado**: Indicadores de sueño reparador, alertness diurna

```
¿Cómo puedo optimizar el ambiente de sueño para Sofía?
```
**Output esperado**: Temperatura, luz, ruido, comfort según best practices

### **PREGUNTAS DE ANÁLISIS**

```
Analiza los patrones de sueño recientes de Sofía
```
**Output esperado**: Procesar eventos abril-agosto, estadísticas, tendencias

```
¿Debería ajustarse el plan de Sofía basado en sus datos actuales?
```
**Output esperado**: Comparación plan vs realidad, sugerencias de mejora

```
Compara el sueño de Sofía con niños de su edad
```
**Output esperado**: Benchmarks, percentiles, contexto de normalidad

---

## 📊 **AGENTE 2: SLEEP ANALYSIS INSIGHTS**
*API Call: `/api/sleep-analysis/insights?childId=68a61767b67a4429652bfe63`*

### **MÉTRICAS ESPERADAS**

**Adherencia al Plan**:
- Bedtime consistency (19:30 target)
- Wake time consistency (7:30 target) 
- Nap duration vs 2h goal
- Sleep efficiency percentage

**Insights de Calidad**:
- Sleep latency (tiempo para dormirse)
- Night wakings frequency
- Total sleep time vs goal (12h)
- Nap timing consistency

**Comparaciones**:
- Actual vs planned schedule
- Week-over-week trends
- Seasonal variations
- Weekend vs weekday patterns

**Recomendaciones**:
- Areas of improvement
- Schedule adjustments
- Environmental optimizations
- Routine enhancements

---

## 💬 **AGENTE 3: CHAT SIMPLE**
*API Call: `/api/chat` with childId*

### **PREGUNTAS INFORMATIVAS**

```
POST /api/chat
{
  "message": "¿Qué información tienes sobre Sofía?",
  "childId": "68a61767b67a4429652bfe63"
}
```

**Output esperado**: Edad, perfil dormilón, datos de survey, estadísticas básicas

```
POST /api/chat  
{
  "message": "Dame 3 consejos rápidos para Sofía",
  "childId": "68a61767b67a4429652bfe63"
}
```

**Output esperado**: Consejos específicos para temperamento dormilón

```
POST /api/chat
{
  "message": "¿Cuáles son los hábitos actuales de Sofía?",
  "childId": "68a61767b67a4429652bfe63"
}
```

**Output esperado**: Rutinas, horarios, características de sueño

---

## 🩺 **AGENTE 4: CONSULTAS ANALYSIS**
*API Call: `/api/consultas/analyze`*

### **TRANSCRIPT DE PRUEBA #1: Exceso de Sueño**

```
POST /api/consultas/analyze
{
  "transcript": "Doctora, estoy preocupada porque Sofía está durmiendo demasiado. Se acuesta a las 7:30 PM y no se despierta hasta las 8:30 AM. También hace siestas de 3 horas en la tarde. Sus amiguitas del jardín duermen mucho menos. ¿Será que tiene algún problema? Durante el día está feliz y juega normal, pero me da miedo que algo esté mal.",
  "childId": "68a61767b67a4429652bfe63"
}
```

**Output esperado**:
- **Análisis**: "Patrón de sueño elevado pero dentro de rango normal para temperamento dormilón"
- **Recomendaciones**: "Mantener rutina actual si desarrollo y alertness son normales"
- **Identificar**: Fortalezas del perfil dormilón, tranquilizar a padres

### **TRANSCRIPT DE PRUEBA #2: Resistencia a Dormir**

```
POST /api/consultas/analyze  
{
  "transcript": "Doctor, últimamente Sofía no se quiere acostar a las 7:30 PM como siempre. Llora y dice que no tiene sueño. Antes se dormía súper fácil. No sé si cambiar el horario o mantenerlo. También noto que se despierta un poquito más tarde, como a las 8:00 AM en vez de 7:30 AM. ¿Será que está creciendo y necesita menos sueño?",
  "childId": "68a61767b67a4429652bfe63"
}
```

**Output esperado**:
- **Análisis**: "Posible transición de necesidades de sueño o fase de desarrollo"
- **Recomendaciones**: "Ajuste gradual de horario, observar patrones 1-2 semanas"
- **Plan**: Sugerencias específicas para mantener rutina con flexibilidad

### **TRANSCRIPT DE PRUEBA #3: Cambios Ambientales**

```
POST /api/consultas/analyze
{
  "transcript": "Doctora, nos mudamos hace 2 semanas y Sofía ha tenido problemas para adaptarse. Antes dormía perfecto en su cuna, pero ahora en su nueva cama se levanta varias veces en la noche. También escucha ruidos nuevos de la calle. Durante el día hace su siesta normal, pero las noches son difíciles. ¿Cómo puedo ayudarla a adaptarse?",
  "childId": "68a61767b67a4429652bfe63"
}
```

**Output esperado**:
- **Análisis**: "Interrupción temporal por cambio ambiental, patrón común en transiciones"
- **Recomendaciones**: "Estrategias de adaptación gradual, optimización de nuevo ambiente"
- **Timeline**: Expectativas realistas de adaptación (2-4 semanas típico)

---

## 🔧 **AGENTE 5: PLANES** 
*Dashboard → Consultas → Plans (seleccionar Sofía)*

### **VERIFICACIONES DEL PLAN ACTIVO**

```
Mostrar plan actual de Sofía
```

**Output esperado**:
- **Plan Inicial** creado 21 julio 2025
- **Horarios**: bedtime 19:30, wake 7:30, siesta 13:30-15:30
- **Objetivos**: 12h sueño nocturno, siesta 2h, latencia <15 min
- **Recomendaciones**: Rutina consistente, ambiente tranquilo, música suave

```
¿Se puede generar un Plan 1 para Sofía?
```

**Output esperado**: 
- "Sin análisis nuevos" - necesita transcript analysis para Plan 1
- Botón deshabilitado hasta nueva consulta

### **GENERACIÓN DE NUEVO PLAN (Solo si hay transcript analizado)**

```
Generar Plan 1 basado en análisis reciente
```

**Output esperado** (si hay análisis disponible):
- Plan actualizado con ajustes basados en transcript
- Horarios modificados según necesidades identificadas
- Nuevos objetivos y recomendaciones

---

## 🏥 **AGENTE 6: HISTORIAL DE CONSULTAS**
*Dashboard → Consultas → History (seleccionar Sofía)*

### **VERIFICAR HISTORIAL**

```
Ver historial de consultas de Sofía
```

**Output esperado**:
- Lista de análisis realizados
- Fechas y resúmenes de cada consulta
- Progressión histórica de recomendaciones

---

## 📈 **AGENTE 7: ESTADÍSTICAS DE SUEÑO**
*Dashboard → Sleep Statistics (seleccionar Sofía)*

### **MÉTRICAS DISPONIBLES**

**Estadísticas Esperadas**:
- Duración promedio de sueño nocturno
- Hora promedio de acostarse y despertar
- Duración y consistencia de siestas
- Frecuencia de despertares nocturnos
- Latencia promedio de sueño
- Comparación con goals del plan

**Visualizaciones**:
- Gráficos de tendencias (abril-agosto 2025)
- Heatmaps de horarios
- Comparaciones semana vs fin de semana
- Progreso hacia objetivos del plan

---

## ✅ **CHECKLIST DE VERIFICACIÓN PARA SOFÍA**

### **Datos Básicos** 
- [ ] Reconoce nombre "Sofía González"
- [ ] Identifica edad correcta (2 años)
- [ ] Menciona perfil "dormilona"
- [ ] Referencia ID correcto del niño

### **Plan Activo**
- [ ] Muestra Plan Inicial del 21 julio 2025  
- [ ] Horarios correctos (19:30-7:30, siesta 13:30-15:30)
- [ ] Objetivos apropiados (12h nocturno, 2h siesta)
- [ ] Estado "activo" del plan

### **Análisis de Datos**
- [ ] Procesa eventos de abril-agosto 2025
- [ ] Calcula estadísticas apropiadas
- [ ] Compara con métricas del plan
- [ ] Genera insights personalizados

### **Conocimiento RAG**
- [ ] Usa fuentes de conocimiento médico
- [ ] Personaliza recomendaciones generales
- [ ] Mantiene consistencia científica
- [ ] Adapta consejos a perfil dormilón

### **Funcionalidad por Agente**
- [ ] **RAG Assistant**: Conversación inteligente
- [ ] **Sleep Analysis**: Métricas cuantitativas  
- [ ] **Chat Simple**: Info básica rápida
- [ ] **Consultas**: Análisis de transcripts
- [ ] **Planes**: Gestión de planes activos
- [ ] **Historial**: Tracking de consultas
- [ ] **Estadísticas**: Visualización de datos

---

## 🎯 **INSTRUCCIONES DE USO**

1. **Seleccionar Sofía** en el dashboard (ID: `68a61767b67a4429652bfe63`)
2. **Ir al agente específico** que quieres probar
3. **Copiar pregunta exacta** de este documento
4. **Verificar respuesta** contra output esperado
5. **Marcar ✅ o ❌** en el checklist
6. **Reportar problemas** si no coincide la respuesta

---

## 🚀 **FLUJO DE TESTING RECOMENDADO**

1. **RAG Assistant** - Preguntas conversacionales generales
2. **Sleep Analysis** - Métricas y análisis cuantitativo
3. **Plans** - Verificar plan activo y estructura
4. **Consultas Analysis** - Procesar los 3 transcripts de prueba
5. **Chat Simple** - Consultas básicas rápidas
6. **Estadísticas** - Visualizaciones y trends
7. **Historial** - Seguimiento histórico

---

*Testing específico para Sofía González - Sistema Happy Dreamers*  
*Última actualización: Agosto 2025*