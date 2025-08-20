# 🤖 Happy Dreamers - Preguntas de Prueba para AI Assistant

*Archivo de testing comprensivo para verificar funcionalidad de todos los agentes AI con los niños creados*

---

## 👶 **PERFILES DE NIÑOS CREADOS**

### **Sofía González** 
- **Edad**: 2 años (nacida 2023-03-15)
- **Perfil**: "dormilona" - Le encanta dormir, siestas largas
- **Plan**: Creado hace 1 mes (21 julio 2025) - Plan Inicial activo
- **Características**: Despierta tarde (7:30), siestas de 2 horas, 12h de sueño nocturno
- **ID**: `68a61767b67a4429652bfe63`

### **Diego Martínez**
- **Edad**: 2 años (nacida 2022-11-20) 
- **Perfil**: "activo" - Muy energético, madrugador
- **Plan**: Creado 5 agosto 2025 - Plan Inicial activo
- **Características**: Despierta temprano (6:30-7:00), dificultad para dormir, muy activo
- **ID**: `68a61767b67a4429652bfe64`

### **Isabella López**
- **Edad**: 1 año (nacida 2024-01-10)
- **Perfil**: "sensible" - Reactiva al ambiente, despertares nocturnos
- **Plan**: Creado 31 julio 2025 - Plan Inicial activo  
- **Características**: Muchos despertares nocturnos, necesita calma, 13h de sueño
- **ID**: `68a61767b67a4429652bfe65`

### **Mateo Rodríguez**
- **Edad**: 3+ años (nacido 2021-08-05)
- **Perfil**: "maduro" - Mayor, sin siestas, rutina establecida
- **Plan**: Creado 26 julio 2025 - Plan Inicial activo
- **Características**: Sin siestas, 10h de sueño nocturno, rutina independiente
- **ID**: `68a61767b67a4429652bfe66`

### **Emma Fernández** 
- **Edad**: Bebé (nacida 2024-06-30)
- **Perfil**: "bebe_modelo" - Patrón ideal de bebé
- **Plan**: No tiene plan creado aún
- **Características**: Muchas siestas, tomas nocturnas, 14h de sueño total
- **ID**: `68a61767b67a4429652bfe67`

---

## 🎯 **AGENTE 1: RAG ASSISTANT** (`/dashboard/assistant`)

*Asistente principal con conocimiento RAG + datos específicos del niño*

### **SOFÍA GONZÁLEZ - Perfil Dormilona**

#### **Preguntas Básicas**
```
¿Cuál es la rutina ideal para Sofía?
```
**Output esperado**: Debe mencionar su plan activo (horario 19:30-7:30), siesta larga de 2h, personalizado para perfil dormilona

```
¿Por qué Sofía duerme tanto comparada con otros niños?
```
**Output esperado**: Explicar variaciones individuales, temperamento dormilón, mencionar que es normal para su edad y perfil

```
¿Está Sofía siguiendo bien su plan de sueño?
```
**Output esperado**: Comparar datos recientes con plan del 21 julio, mencionar adherencia a horarios 19:30/7:30

#### **Preguntas con RAG Knowledge**
```
¿Cuántas horas debe dormir un niño de 2 años como Sofía?
```
**Output esperado**: Citar fuentes RAG sobre sueño infantil (12-14h para 2 años), mencionar que Sofía está bien con 12h

```
¿Qué técnicas funcionan mejor para niños dormilones como Sofía?
```
**Output esperado**: Usar conocimiento RAG sobre técnicas para diferentes temperamentos, personalizar para perfil dormilón

#### **Preguntas de Análisis**
```
Analiza los patrones de sueño recientes de Sofía
```
**Output esperado**: Procesar eventos de abril-agosto, mostrar estadísticas, comparar con plan activo

```
¿Debería ajustarse el plan de Sofía basado en sus datos actuales?
```
**Output esperado**: Análisis comparativo plan vs realidad, sugerir ajustes si es necesario

---

### **DIEGO MARTÍNEZ - Perfil Activo**

#### **Preguntas Desafío**
```
Diego no se puede dormir por las noches, ¿qué puedo hacer?
```
**Output esperado**: Estrategias específicas para niños activos, técnicas de relajación, ajuste de rutina pre-sueño

```
¿Por qué Diego se despierta tan temprano?
```
**Output esperado**: Explicar patrones de niños activos, factores ambientales, sugerencias para horarios

```
¿Cómo calmar a Diego antes de dormir?
```
**Output esperado**: Técnicas específicas para temperamento activo, rutina de relajación, actividades calmantes

#### **Preguntas con Datos**
```
Compara el patrón de Diego con su plan actual
```
**Output esperado**: Análisis de adherencia al plan del 5 agosto, identificar desviaciones, sugerencias

```
¿Está Diego durmiendo suficientes horas?
```
**Output esperado**: Calcular horas totales de sus eventos, comparar con goal de 11h, evaluación

---

### **ISABELLA LÓPEZ - Perfil Sensible**

#### **Preguntas Específicas**
```
Isabella se despierta mucho en la noche, ¿es normal?
```
**Output esperado**: Explicar despertares en bebés sensibles, cuándo preocuparse, estrategias de manejo

```
¿Qué ambiente es mejor para Isabella?
```
**Output esperado**: Recomendaciones para niños sensibles (ruido, luz, temperatura), personalizar ambiente

```
¿Cómo establecer rutina con un bebé sensible como Isabella?
```
**Output esperado**: Técnicas graduales, consistencia, adaptación para temperamento sensible

#### **Análisis de Patrones**
```
Analiza los despertares nocturnos de Isabella
```
**Output esperado**: Procesar eventos "night_waking", identificar patrones, frecuencia, duración

```
¿Isabella necesita más o menos estimulación durante el día?
```
**Output esperado**: Evaluar actividades diurnas vs calidad nocturna, balance estimulación-calma

---

### **MATEO RODRÍGUEZ - Perfil Maduro**

#### **Preguntas de Transición**
```
¿Cuándo debe dejar Mateo las siestas completamente?
```
**Output esperado**: Información sobre transición 3-4 años, señales de madurez, plan sin siestas

```
¿Está Mateo listo para rutina más independiente?
```
**Output esperado**: Evaluar madurez, habilidades, sugerir pasos hacia independencia

```
¿10 horas de sueño son suficientes para Mateo?
```
**Output esperado**: Comparar con recomendaciones para 3+ años, evaluar si está descansado

#### **Desarrollo**
```
¿Qué habilidades de sueño puede desarrollar Mateo a su edad?
```
**Output esperado**: Habilidades apropiadas para 3+ años, auto-regulación, rutinas independientes

---

### **EMMA FERNÁNDEZ - Bebé Modelo**

#### **Preguntas de Bebé**
```
¿Cuántas siestas necesita Emma a su edad?
```
**Output esperado**: Información para 8 meses, 2-3 siestas, duración apropiada

```
¿Son normales las tomas nocturnas para Emma?
```
**Output esperado**: Patrones normales 6-12 meses, cuándo esperar mejoras

```
¿Cómo establecer horarios con Emma?
```
**Output esperado**: Flexibilidad para bebés, señales de sueño, rutina gradual

---

## 📊 **AGENTE 2: SLEEP ANALYSIS INSIGHTS** (`/api/sleep-analysis/insights`)

*Análisis cuantitativo de patrones vs planes*

### **Consultas Universales para Todos los Niños**

```
GET /api/sleep-analysis/insights?childId=[ID_DEL_NIÑO]
```

#### **Para Sofía González**
**Output esperado**:
- Comparación plan vs realidad (horario 19:30-7:30)
- Métricas de adherencia al plan del 21 julio
- Insights sobre consistencia de horarios
- Recomendaciones basadas en desviaciones

#### **Para Diego Martínez**  
**Output esperado**:
- Análisis de latencia de sueño (tardanza en dormirse)
- Comparación despertares tempranos vs plan
- Métricas de actividad pre-sueño
- Recomendaciones para niño activo

#### **Para Isabella López**
**Output esperado**:
- Estadísticas de despertares nocturnos
- Patrones de sensibilidad ambiental
- Calidad vs cantidad de sueño
- Insights sobre factores disruptivos

#### **Para Mateo Rodríguez**
**Output esperado**:
- Confirmación de eliminación exitosa de siestas  
- Consistencia en rutina nocturna
- Suficiencia de 10h de sueño
- Independencia en rutina

#### **Para Emma Fernández** *(Sin plan)*
**Output esperado**:
- Análisis de patrones naturales
- Comparación con normas de desarrollo
- Recomendación para crear primer plan
- Identificación de ventanas de sueño

---

## 💬 **AGENTE 3: CHAT SIMPLE** (`/api/chat`)

*Chat básico con información del niño*

### **Preguntas Informativas**

```
POST /api/chat
{
  "message": "¿Qué información tienes sobre [nombre]?",
  "childId": "[ID_DEL_NIÑO]"
}
```

#### **Outputs Esperados por Niño**

**Sofía**: Edad, temperamento dormilón, datos de survey, estadísticas recientes

**Diego**: Temperamento activo, desafíos de sueño, información de survey

**Isabella**: Sensibilidad, patrones de despertares, desarrollo apropiado

**Mateo**: Madurez, transición sin siestas, independencia

**Emma**: Desarrollo de bebé, patrones emergentes, necesidades básicas

### **Preguntas de Consejos Rápidos**

```
"Dame 3 consejos rápidos para [nombre]"
```

**Output esperado**: Consejos personalizados según perfil y edad de cada niño

---

## 🩺 **AGENTE 4: CONSULTAS ANALYSIS** (`/api/consultas/analyze`)

*Análisis de transcripts de consultas*

### **Transcripts de Prueba**

#### **Para Sofía (Dormilona)**
```
POST /api/consultas/analyze
{
  "transcript": "Doctora, Sofía está durmiendo demasiado. Se acuesta a las 7:30 PM y no se despierta hasta las 8:30 AM. También hace siestas de 3 horas. ¿Es normal? Sus amigas duermen menos.",
  "childId": "68a61767b67a4429652bfe63"
}
```

**Output esperado**: 
- Análisis: "Patrón de sueño elevado pero dentro de rango normal"
- Recomendaciones: "Mantener rutina si está feliz y alerta"
- Identificar fortalezas del perfil dormilón

#### **Para Diego (Activo)**
```
POST /api/consultas/analyze  
{
  "transcript": "Doctor, Diego no se puede dormir. Se acuesta a las 8 PM pero hasta las 10 PM está corriendo en su cama. Necesita que me quede con él. Se levanta a las 5:30 AM súper activo.",
  "childId": "68a61767b67a4429652bfe64"
}
```

**Output esperado**:
- Análisis: "Temperamento activo requiere rutina de transición más larga"
- Recomendaciones: "Implementar período de calma 1 hora antes"
- Sugerencias específicas para niños activos

#### **Para Isabella (Sensible)**
```
POST /api/consultas/analyze
{
  "transcript": "Doctora, Isabella se despierta cada 2 horas llorando. Cualquier ruido la despierta. Durante el día está irritable. No sé qué hacer.",
  "childId": "68a61767b67a4429652bfe65"
}
```

**Output esperado**:
- Análisis: "Sensibilidad ambiental elevada afecta consolidación del sueño"
- Recomendaciones: "Optimizar ambiente (ruido blanco, blackout)"
- Plan gradual de mejora

#### **Para Mateo (Maduro)**
```
POST /api/consultas/analyze
{
  "transcript": "Doctor, Mateo ya no quiere hacer siesta y en el jardín me dicen que es normal. Pero se porta mal en las tardes. ¿Debería forzar la siesta?",
  "childId": "68a61767b67a4429652bfe66"  
}
```

**Output esperado**:
- Análisis: "Transición natural apropiada para edad"
- Recomendaciones: "Eliminar siesta, adelantar bedtime 30-60 min"
- Estrategias para manejar irritabilidad vespertina

---

## 🧪 **PREGUNTAS DE INTEGRACIÓN AVANZADA**

### **Cross-Child Comparisons**
```
¿En qué se diferencias los patrones de Sofía y Diego?
```
**Output esperado**: Comparación temperamentos, horarios, desafíos específicos

### **Plan Evolution** 
```
¿Qué plan seguiría después del Plan 0 de Sofía?
```
**Output esperado**: Evolución basada en progreso, ajustes graduales

### **Family Dynamics**
```
¿Cómo manejar rutinas diferentes para Isabella y Mateo en la misma casa?
```
**Output esperado**: Estrategias para múltiples niños, coordinación de horarios

### **Development Stages**
```
¿Cuándo Emma tendrá patrones similares a Isabella?
```
**Output esperado**: Progresión esperada por edad, hitos de desarrollo

---

## ✅ **CHECKLIST DE VERIFICACIÓN**

### **Funcionamiento Básico**
- [ ] Assistant responde con información específica del niño
- [ ] Sleep Analysis genera insights cuantitativos  
- [ ] Chat Simple proporciona información básica
- [ ] Consultas Analysis procesa transcripts correctamente

### **Personalización por Niño**
- [ ] Sofía: Menciona perfil dormilón y plan activo
- [ ] Diego: Identifica desafíos de temperamento activo
- [ ] Isabella: Reconoce sensibilidad ambiental
- [ ] Mateo: Aborda madurez y transición
- [ ] Emma: Considera etapa de bebé

### **Integración de Datos**
- [ ] Referencias a planes activos cuando existen
- [ ] Uso de eventos históricos (abril-agosto 2025)
- [ ] Comparaciones con métricas apropiadas por edad
- [ ] Recomendaciones basadas en datos reales

### **Conocimiento RAG**
- [ ] Cita fuentes de knowledge base
- [ ] Aplica best practices de sueño infantil
- [ ] Personaliza recomendaciones generales
- [ ] Mantiene consistencia con literatura médica

---

## 📝 **INSTRUCCIONES DE USO**

1. **Seleccionar niño** en el dashboard (usar IDs proporcionados)
2. **Copiar preguntas** directamente al chat/assistant
3. **Verificar outputs** contra expectativas documentadas
4. **Reportar discrepancias** si las respuestas no coinciden
5. **Iterar** con variaciones de las preguntas base

---

*Documento creado para testing exhaustivo del sistema Happy Dreamers AI*  
*Última actualización: Agosto 2025*