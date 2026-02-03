# ESPECIFICACIÓN TÉCNICA: ÍTEM 4 - PANEL DE DIAGNÓSTICO (ESTADÍSTICAS)

## Vision

Este módulo es un **motor de validación** que cruza la bitácora en tiempo real con las respuestas del cuestionario y las reglas clínicas de Happy Dreamers. Permite a Mariana auditar el progreso de cada niño y tomar decisiones informadas sobre su plan de sueño.

**Audiencia:** Solo Admin (Mariana). Los padres NO deben ver este panel.

**Ubicación:** Dashboard Admin > Estadísticas de Sueño

**Prerequisito:** El niño debe tener un **plan activo**. Sin plan, el panel está bloqueado.

---

## Decisiones de Entrevista

| Decisión | Valor | Fuente |
|----------|-------|--------|
| Tolerancia desvío horario | ±15 min (sleep, wake, siestas) | Feedback doctora + entrevista |
| UX al clickear alerta | Modal overlay (solo lectura + navegación) | Entrevista usuario |
| Frecuencia resumen AI | On-demand (botón) | Entrevista usuario |
| Acceso sin plan activo | Bloqueado | Entrevista usuario |
| Despertar mínimo | 6:00 AM para todos | Feedback doctora |
| Visibilidad del panel | Solo admin | Entrevista usuario |
| Umbral alerta G2 | 1 solo indicador dispara | Entrevista usuario |
| Clasificación alimentos G3 | AI en tiempo real (texto libre) | Entrevista usuario |
| Fallback AI clasificación | Guardar sin clasificar | Entrevista usuario |
| Alcance AI Pasante | Descriptivo + recomendaciones generales | Entrevista usuario |
| Permisos campos médicos | Editables por padres y admin desde survey | Entrevista usuario |

---

## Estrategia de Implementación Progresiva

### Este Sprint (Item 4):
Implementar el **panel completo** con toda la lógica de validación usando **validación defensiva**:

```typescript
// Ejemplo de validación defensiva
function validateReflujo(surveyData) {
  const indicadores = []

  // Campos que YA existen en el survey
  if (surveyData.reflujoColicos === true) indicadores.push('reflujo')
  if (surveyData.percentilBajo === true) indicadores.push('peso_bajo')
  if (surveyData.congestioNasal === true) indicadores.push('congestion')

  // Campos que AÚN NO existen (será undefined, no afecta validación)
  if (surveyData.posicionVertical === true) indicadores.push('posicion_vertical')
  if (surveyData.vomitaFrecuente === true) indicadores.push('vomito')

  return {
    alert: indicadores.length >= 1,  // Con 1 ya alerta
    indicadores,
    pendientes: 6  // Indicadores que esperan datos del survey
  }
}
```

### Lo que se obtiene en este sprint:
- ✅ **Panel funcional al 100%** con datos actuales
- ✅ **G1 (Horario)**: Totalmente funcional (100% de datos disponibles)
- ✅ **G2 (Médico)**: Funcional parcial (~70% de indicadores disponibles)
- ✅ **G3 (Alimentación)**: Clasificación AI + validación básica de frecuencias
- ✅ **G4 (Ambiental)**: Casi completo (90% de datos disponibles)
- ✅ **Pasante AI**: Funciona con datos disponibles
- ✅ **Deep linking**: Navega hacia eventos y survey existente

### UI del Panel mostrará:
```
G2 - MÉDICO
├─ Reflujo: ⚠️ 3 de 9 indicadores detectados
│  └─ ℹ️ 6 indicadores pendientes de datos del survey
├─ Apnea: ✅ Datos completos, sin alertas
└─ Restless Leg: ⚠️ 2 de 6 indicadores detectados
   └─ ℹ️ 4 indicadores pendientes
```

### Sprint Posterior (Item 4B - Survey):
- Agregar los **11 campos faltantes** al survey
- **No requiere cambios en el panel** - automáticamente empezará a usarlos
- Solo actualizar el mensaje "X indicadores pendientes" → desaparece

---

## 1. Cabecera: Perfil Clínico del Paciente

Tarjeta de información persistente en el `top` de la pantalla. Contextualiza el análisis de Mariana.

### Campos Requeridos

**Generales:**
- Nombre del niño
- Edad actual (meses/años)
- Nombres de los padres y edades
- Número de hermanos y **edades individuales** de cada uno ⚠️ *Pendiente sprint 4B*

**Status:**
- Plan vigente y versión
- Etapa actual del proceso

**Alertas Críticas (Banderas Rojas):**
- Última consulta médica y qué se hizo ⚠️ *Pendiente definir ubicación*
- Temas médicos (último update) ⚠️ *Pendiente definir ubicación*
- Alergias ✅ *Ya existe en survey*
- Reflujo/Cólicos ✅ *Ya existe en survey*
- Ferritina ⚠️ *Pendiente sprint 4B*
- Temas de Neuro-desarrollo ✅ *Ya existe en survey*

### Nota para Desarrollo: Registro Médico Admin

> Se necesita un espacio donde las doctoras puedan registrar pruebas y consultas médicas realizadas. Esto alimenta las "banderas rojas" del perfil. **Pendiente definir**: ¿campo libre en el detalle del niño? ¿sección nueva en admin? ¿timeline de notas médicas?

---

## 2. Los 4 Grupos de Control (Semaforización)

4 tarjetas de resumen que actúan como **indicadores de salud del plan**.

---

### Grupo 1: Horario (Schedule)

**Fuente de datos:** Eventos de sueño/siesta/wake en la Bitácora + Plan activo del niño.

**Disponibilidad de datos:** ✅ 100% (todos los datos existen)

#### Reglas Generales

- El horario puede variar **±15 minutos** — fuera de ese margen es alerta
- Tolerancia aplica a: `sleep`, `wake`, `nap` (eventos de dormir)
- La noche dura **11 horas** hasta los 2.5 años (regulada por la hora de despertar)
- La noche disminuye **30 min por año** a partir de los 3 años
- **Nunca** proponer un despertar antes de las **6:00 AM**
- Si la hora de despertar es muy variable, asignar lo más temprano después de las 6 AM
  - Ejemplo: rango 5 AM-8 AM → asignar 6:15 AM
- Todos los límites de "no siesta antes de X" y "no siesta después de X" se ajustan según la hora de despertar asignada

#### Reducción de Noche por Edad

| Edad | Duración Noche |
|------|----------------|
| Hasta 2.5 años | 11 hrs |
| 3 años | 11.5-12 hrs |
| 4 años | 11-11.5 hrs |
| 5 años | 10.5-11 hrs |
| 6 años | 10-10.5 hrs |

#### Lógica de Validación

1. **Desvío de Despertar:** Si `hora_despertar_real` se desvía más de **±15 min** de la `hora_meta` del plan, marcar alerta.

2. **Límite Inferior:** Si el despertar ocurre **antes de las 6:00 AM**, marcar alerta. Es fijo para todos.

3. **Duración de Noche:** Comparar horas de sueño nocturno real vs esperado por edad (tabla de reducción). Alertar si difiere más de 30 min.

4. **Ventanas de Sueño:** Comparar duración de ventanas de vigilia registradas vs parámetros ideales por edad (ver tabla de horarios).

5. **Siestas Fuera de Rango:** Alertar si:
   - Siesta ocurre antes de la hora mínima permitida por edad (8 AM, 9 AM o 12 PM)
   - Siesta ocurre menos de X horas antes de bedtime (2.5, 3.5 o 4 hrs según edad)
   - Siesta excede duración máxima permitida por edad

6. **Bandera Roja 3+ Años:** Siesta después de las 2 PM en niños mayores de 3 años.

#### Alertas Especiales por Edad Temprana

**Pre-4 Meses:**
- No hay promedios estables. Rango normal 14-17 hrs (aceptable 11-19 hrs)
- **Alerta:** Si duerme menos de 14 hrs en total

**4-6 Meses:**
- Sueño aún irregular. Total esperado: 12-15 hrs
- **Alerta:** Si duerme menos de 12 hrs en total
- **Alerta:** Si tomas de pecho están más espaciadas de 3 hrs entre sí
- **Alerta:** Si ventanas de vigilia exceden 2.5 hrs

#### Tabla de Horarios por Edad

##### 6 Meses — 3 siestas, 5 leches, 2 sólidos

| Actividad | Hora | Notas |
|-----------|------|-------|
| Despertar | 6:00 AM | |
| Biberón/pecho 1 | 6:15 AM | Al despertar |
| Ventana 1 | 1.5-2 hrs | |
| Siesta 1 | 8:00-9:30 AM | Máx 1.5 hrs (mín 45 min). NO ANTES DE 8 AM |
| Biberón/pecho 2 | 9:30 AM | Al despertar de siesta |
| Sólido 1 | 10:45 AM | |
| Ventana 2 | 2 hrs | |
| Siesta 2 | 11:30 AM-1:00 PM | Máx 1.5 hrs (hasta 2 hrs si la anterior fue ≤45 min) |
| Biberón/pecho 3 | 1:00 PM | Al despertar |
| Biberón/pecho 4 | 3:30 PM | Antes de siesta |
| Ventana 3 | 2.5 hrs | |
| Siesta 3 | 3:30-4:30 PM | 1 hr (hasta 1.5 hrs si la anterior fue ≤45 min) |
| Sólido 2 | 4:30 PM | No siestas 2.5 hrs antes de bedtime. Máx 5 PM despierto |
| Biberón/pecho 5 | 6:00 PM | |
| Ventana 4 | 2.5-3 hrs | |
| Rutina | 6:15 PM | 30 min antes de acostarse |
| Acostarlo | 6:45 PM | 15 min antes de dormir |
| Dormido | 7:00 PM | |

##### 7 Meses — 3 siestas, 4 leches, 3 sólidos

| Actividad | Hora | Notas |
|-----------|------|-------|
| Despertar | 6:00 AM | |
| Biberón/pecho 1 | 6:15 AM | Al despertar |
| Desayuno | 7:15 AM | |
| Ventana 1 | 1.5-2 hrs | |
| Siesta 1 | 8:00-9:30 AM | Máx 1.5 hrs (mín 45 min). NO ANTES DE 8 AM |
| Biberón/pecho 2 | 10:30 AM | Al despertar de siesta |
| Ventana 2 | 2 hrs | |
| Siesta 2 | 11:30 AM-1:00 PM | Máx 1.5 hrs (hasta 2 hrs si la anterior fue ≤45 min) |
| Comida | 1:00 PM | |
| Biberón/pecho 3 | 2:30 PM | |
| Ventana 3 | 2.5 hrs | |
| Siesta 3 | 3:30-4:30 PM | 1 hr (hasta 1.5 hrs si la anterior fue ≤45 min) |
| Cena | 4:30 PM | No siestas 2.5 hrs antes de bedtime. Máx 5 PM despierto |
| Biberón/pecho 4 | 6:00 PM | |
| Ventana 4 | 2.5-3 hrs | |
| Rutina | 6:15 PM | 30 min antes de acostarse |
| Acostarlo | 6:45 PM | |
| Dormido | 7:00 PM | |

##### 8-9 Meses — Transición a 2 siestas

| Actividad | Hora | Notas |
|-----------|------|-------|
| Despertar | 6:00 AM | |
| Biberón/pecho 1 | 6:15 AM | Al despertar |
| Desayuno | 8:15 AM | |
| Ventana 1 | 3 hrs | |
| Siesta 1 | 9:15-10:45 AM | Máx 1.5 hrs (mín 45 min). NO ANTES DE 9 AM |
| Biberón/pecho 2 | 10:30 AM | Al despertar de siesta |
| Comida | 1:00 PM | |
| Ventana 2 | 3 hrs | |
| Siesta 2 | 1:45-3:15 PM | Máx 1.5 hrs (hasta 2 hrs si la anterior fue ≤45 min) |
| Biberón/pecho 3 | 3:30 PM | No siestas 3.5 hrs antes de bedtime. Máx 4 PM despierto |
| Cena | 5:00 PM | |
| Biberón/pecho 4 | 6:00 PM | |
| Ventana 3 | 2.5-3 hrs | |
| Rutina | 6:15 PM | |
| Acostarlo | 6:45 PM | |
| Dormido | 7:00 PM | |

##### 9 Meses — Introducción de snack, 3 leches, 4 sólidos

| Actividad | Hora | Notas |
|-----------|------|-------|
| Despertar | 6:00 AM | |
| Biberón/pecho 1 | 6:15 AM | Al despertar |
| Desayuno | 8:15 AM | |
| Ventana 1 | 3 hrs | |
| Siesta 1 | 9:15-10:45 AM | Máx 1.5 hrs (mín 45 min). NO ANTES DE 9 AM |
| Snack | 10:30 AM | |
| Comida | 1:00 PM | |
| Ventana 2 | 3 hrs | |
| Siesta 2 | 1:45-3:15 PM | Máx 1.5 hrs (hasta 2 hrs si la anterior fue ≤45 min) |
| Biberón/pecho 2 | 3:30 PM | No siestas 3.5 hrs antes de bedtime. Máx 4 PM despierto |
| Cena | 5:00 PM | |
| Biberón/pecho 3 | 6:00 PM | |
| Ventana 3 | 2.5-3 hrs | |
| Rutina | 6:15 PM | |
| Acostarlo | 6:45 PM | |
| Dormido | 7:00 PM | |

##### 11-12 Meses — Se recorta siesta 1, se agrega snack, 2 leches, 5 sólidos

| Actividad | Hora | Notas |
|-----------|------|-------|
| Despertar | 6:00 AM | |
| Biberón/pecho 1 | 6:15 AM | Al despertar |
| Desayuno | 8:15 AM | |
| Ventana 1 | 3 hrs | |
| Siesta 1 | 9:15-10:15 AM | **Máx 1 hr.** NO ANTES DE 9 AM |
| Biberón/pecho 2 | 10:30 AM | Al despertar de siesta |
| Comida | 1:00 PM | |
| Ventana 2 | 3.5 hrs | |
| Siesta 2 | 1:45-3:15 PM | Máx 1.5 hrs (hasta 2 hrs si la anterior fue ≤45 min) |
| Snack | 3:30 PM | No siestas 3.5 hrs antes de bedtime. Máx 4 PM despierto |
| Cena | 5:00 PM | |
| Biberón/pecho 3 | 6:00 PM | |
| Ventana 3 | 2.5-3 hrs | |
| Rutina | 6:15 PM | |
| Acostarlo | 6:45 PM | |
| Dormido | 7:00 PM | |

##### 12 Meses — Primero desayuno, luego leche

| Actividad | Hora | Notas |
|-----------|------|-------|
| Despertar | 6:00 AM | |
| Desayuno | 6:30 AM | Leche opcional después del desayuno |
| Ventana 1 | 3 hrs | |
| Siesta 1 | 9:15-10:15 AM | **Máx 1 hr.** NO ANTES DE 9 AM |
| Biberón/pecho | 10:30 AM | Al despertar de siesta |
| Comida | 1:00 PM | |
| Ventana 2 | 3.5 hrs | |
| Siesta 2 | 1:45-3:15 PM | Máx 1.5 hrs (hasta 2 hrs si la anterior fue ≤45 min) |
| Snack | 3:30 PM | No siestas 3.5 hrs antes de bedtime. Máx 4 PM despierto |
| Cena | 5:00 PM | |
| Biberón/pecho | 6:00 PM | Opcional |
| Ventana 3 | 2.5-3 hrs | |
| Rutina | 6:15 PM | |
| Acostarlo | 6:45 PM | |
| Dormido | 7:00 PM | |

##### 15-18 Meses — Transición a 1 siesta

> A partir de los 12 meses la alimentación se mantiene igual. **Si toma más de 16 oz de leche en 24 hrs, es bandera roja.**

| Actividad | Hora | Notas |
|-----------|------|-------|
| Despertar | 6:00 AM | |
| Desayuno | 6:30 AM | Leche opcional después |
| Snack | 9:00 AM | |
| Comida | 11:45 AM | |
| Ventana | 6 hrs | |
| Siesta | 12:15-2:45/3:15 PM | Máx 3 hrs (prom 2.5). NO ANTES DE 12 PM |
| Snack | 3:30 PM | No siestas 4 hrs antes de bedtime. Máx 3:15 PM despierto |
| Cena | 5:45 PM | Leche opcional después |
| Ventana | 4-4.5 hrs | 4 hrs con siesta de 3h, 4.5 hrs con siesta de 2.5h |
| Rutina | 6:15 PM | |
| Acostarlo | 6:45 PM | |
| Dormido | 7:00 PM | |

##### 18 Meses a 2 Años — Igual que 15-18 meses

##### 2-2.5 Años

| Actividad | Hora | Notas |
|-----------|------|-------|
| Despertar | 6:00 AM | |
| Desayuno | 6:30 AM | Leche opcional |
| Snack | 9:00 AM | |
| Comida | 11:45 AM | |
| Ventana | 6 hrs | |
| Siesta | 12:15-2:15/2:45 PM | Máx 2.5 hrs (prom 2). NO ANTES DE 12 PM |
| Snack | 3:00 PM | No siestas 4 hrs antes de bedtime. Máx 2:45 PM despierto |
| Cena | 5:45 PM | Leche opcional |
| Ventana | 5 hrs | |
| Rutina | 6:15 PM | |
| Acostarlo | 6:45 PM | |
| Dormido | 7:00 PM | |

##### 2.5 Años

| Actividad | Hora | Notas |
|-----------|------|-------|
| Despertar | 6:00 AM | |
| Desayuno | 6:30 AM | Leche opcional |
| Snack | 9:00 AM | |
| Comida | 11:45 AM | |
| Ventana | 6 hrs | |
| Siesta | 12:15-1:45/2:15 PM | Máx 2 hrs (prom 1.5). NO ANTES DE 12 PM |
| Snack | 3:30 PM | No siestas 4 hrs antes de bedtime. Máx 2:45 PM despierto |
| Cena | 5:45 PM | Leche opcional |
| Ventana | 5.5 hrs | |
| Rutina | 6:15 PM | |
| Acostarlo | 6:45 PM | |
| Dormido | 7:00 PM | |

##### 2.9-3.3 Años — Noche se recorta a 10-10.5 hrs

| Actividad | Hora | Notas |
|-----------|------|-------|
| Despertar | 6:00 AM | |
| Desayuno | 6:30 AM | Leche opcional |
| Snack | 9:00 AM | |
| Comida | 11:45 AM | |
| Ventana | 6 hrs | |
| Siesta | 12:15-1:45 PM | Máx 1.5 hrs. NO ANTES DE 12 PM |
| Snack | 3:30 PM | No siestas 4 hrs antes de bedtime. Máx 2:00 PM despierto |
| Cena | 5:45 PM | Leche opcional |
| Ventana | 6 hrs | |
| Rutina | 6:30/7:00 PM | |
| Acostarlo | 7:00/7:30 PM | |
| Dormido | 7:30/8:00 PM | |

##### 3-3.5 Años — Se elimina siesta, noche 11.5-12 hrs

| Actividad | Hora | Notas |
|-----------|------|-------|
| Despertar | 6:00 AM | |
| Desayuno | 6:30 AM | Leche opcional |
| Snack | 9:00 AM | |
| Comida | 11:45 AM | |
| Snack | 3:30 PM | |
| Cena | 5:00 PM | Leche opcional |
| Ventana | 12-12.5 hrs (sin siesta) | |
| Rutina | 5:45 PM | |
| Acostarlo | 6:00/6:15 PM | |
| Dormido | 6:00/6:30 PM | |

#### Tabla Resumen de Validación G1

| Edad | Siestas | Ventanas | Siesta Máx | No Siesta Antes | No Siesta X hrs Pre-Bedtime | Leche Mín | Sólidos Mín |
|------|---------|----------|-----------|-----------------|----------------------------|-----------|-------------|
| 0-3 m | Variable | 45-90 min | - | - | - | - | 0 |
| 4-6 m | Variable | 1-2 hrs | - | - | - | cada 3 hrs | 0 |
| 6 m | 3 | 1.5, 2, 2.5, 2.5-3 hrs | 1.5 hrs | 8 AM | 2.5 hrs | 5 (cada 3 hrs) | 2 |
| 7 m | 3 | 1.5-2, 2, 2.5, 2.5-3 hrs | 1.5 hrs | 8 AM | 2.5 hrs | 4 (cada 4 hrs) | 3 |
| 8-9 m | 2 | 3, 3, 2.5-3 hrs | 1.5 hrs | 9 AM | 3.5 hrs | 3 | 3-4 |
| 9-11 m | 2 | 3, 3, 2.5-3 hrs | 1.5 hrs | 9 AM | 3.5 hrs | 3 | 4 |
| 11-12 m | 2 | 3, 3.5, 2.5-3 hrs | 1h (S1) 1.5h (S2) | 9 AM | 3.5 hrs | 2 | 5 |
| 12 m | 2 | 3, 3.5, 2.5-3 hrs | 1h (S1) 1.5h (S2) | 9 AM | 3.5 hrs | 2 (opcionales) | 5 |
| 15-18 m | 1 | 6, 4-4.5 hrs | 3 hrs | 12 PM | 4 hrs | Máx 16 oz | 5 |
| 18m-2a | 1 | 6, 4-4.5 hrs | 3 hrs | 12 PM | 4 hrs | Máx 16 oz | 5 |
| 2-2.5a | 1 | 6, 5 hrs | 2.5 hrs | 12 PM | 4 hrs | Máx 16 oz | 5 |
| 2.5a | 1 | 6, 5.5 hrs | 2 hrs | 12 PM | 4 hrs | Máx 16 oz | 5 |
| 2.9-3.3a | 1 | 6, 6 hrs | 1.5 hrs | 12 PM | 4 hrs | Máx 16 oz | 5 |
| 3-3.5a | 0 | 12-12.5 hrs | N/A | N/A | N/A | Opcional | 5 |

---

### Grupo 2: Médico

**Fuente de datos:** Cuestionario (surveyData) + bitácora de eventos para patrones de sueño.

**Disponibilidad de datos:** ⚠️ ~70% (7 de 11 indicadores faltantes en survey)

G2 no evalúa campos aislados sino **patrones diagnósticos**. Varios síntomas se comparten entre condiciones pero en distintos contextos (ej: "inquieto en la noche" aparece en apneas Y restless leg, pero en diferentes partes de la noche).

#### Umbral de Activación

**Con 1 solo indicador presente ya se dispara la alerta.** Esto permite detectar temprano patrones médicos que requieren atención.

#### 2.1 Indicadores de Reflujo

**Campos disponibles en survey actual:** ✅ 4 de 9

Alertar si el survey o la bitácora muestran **1 o más** de:

- ✅ Reflujo/cólicos (línea 74 CSV)
- ✅ Percentil bajo de peso (línea 39 CSV)
- ✅ Congestión nasal (línea 83 CSV)
- ✅ Dermatitis/eczema (línea 84 CSV)
- ⚠️ Solo tolera estar en posición vertical *Pendiente sprint 4B*
- ⚠️ Llora al despertar y nada lo calma más que el pecho *Pendiente sprint 4B*
- ⚠️ Vomita frecuentemente *Pendiente sprint 4B*
- ⚠️ Tomas de pecho muy frecuentes (cada 45-60 min) *Pendiente sprint 4B*
- ✅ Irritable frecuentemente (línea 90 CSV, genérica)
- ✅ Factor hereditario: alergias de padres (líneas 12, 23 CSV)

#### 2.2 Indicadores de Apneas / Alergias

**Campos disponibles en survey actual:** ✅ 10 de 12

Alertar si el survey o la bitácora muestran **1 o más** de:

- ✅ Congestión nasal (línea 83 CSV)
- ✅ Infecciones de oído frecuentes (línea 80 CSV)
- ✅ Ronca (línea 68 CSV)
- ✅ Dermatitis/eczema (línea 84 CSV)
- ✅ Respira por la boca (línea 69 CSV)
- ✅ Inquieto durante la noche en **segunda parte** (línea 72 CSV)
- ✅ Sudoración nocturna (línea 73 CSV)
- ✅ Mucha pipí en la noche (línea 66 CSV)
- ⚠️ Insomnio *Detectar de eventos de la bitácora*
- ✅ Despertares aumentan en frecuencia en **segunda parte de la noche** *Detectar de eventos*
- ⚠️ Despierta asustado *Pendiente sprint 4B*
- ✅ Pesadillas al final de la noche (línea 76 CSV)

#### 2.3 Indicadores de Restless Leg Syndrome

**Campos disponibles en survey actual:** ✅ 3 de 6

Alertar si el survey o la bitácora muestran **1 o más** de:

- ⚠️ Siestas desorganizadas (cortas o sin horario predecible) *Calcular de eventos*
- ✅ Inquieto en la **primera parte de la noche** (línea 71 CSV)
- ✅ Terrores nocturnos (línea 76 CSV, "al principio de la noche")
- ✅ Tarda más de 30 min en dormirse (línea 109 CSV)
- ⚠️ Patalea al dormirse *Pendiente sprint 4B*
- ⚠️ Busca actividad física en bedtime (caminar, gatear, pararse) *Pendiente sprint 4B*

#### Campos Faltantes (Sprint 4B)

Total: **7 campos** a agregar al survey

**G2 - Reflujo (4):**
1. Solo tolera estar en posición vertical
2. Llora al despertar y nada lo calma más que el pecho
3. Vomita frecuentemente
4. Tomas de pecho muy frecuentes (cada 45-60 min)

**G2 - Apnea (1):**
5. Despierta asustado

**G2 - Restless Leg (2):**
6. Patalea al dormirse
7. Busca actividad física en bedtime

#### Caducidad de Datos

Verificar la fecha de respuesta del survey. Si el dato tiene más de **30 días**, marcar como "Dato por actualizar".

#### Nota: Diferenciación Primera vs Segunda Parte de Noche

**Pendiente definir:** ¿Cómo determinar "primera" vs "segunda" parte de la noche?
- Opción 1: Antes/después de medianoche
- Opción 2: Primeras 4 horas vs resto
- Opción 3: Primeras 50% de la duración total vs últimas 50%

---

### Grupo 3: Alimentación

**Fuente de datos:** Eventos de feeding en la Bitácora + Edad del niño + Clasificación AI.

**Disponibilidad de datos:** ✅ 90% (falta campos de oz y frecuencia detallada)

#### Clasificación AI de Alimentos (Texto Libre)

Los padres escriben **texto libre** al registrar eventos de sólidos. La AI clasifica **en tiempo real** los alimentos en los 4 grupos nutricionales.

**Flujo de clasificación:**

```typescript
// Cuando el padre registra: "Pollo con arroz y brócoli"
1. POST /api/children/events con feedingNotes: "Pollo con arroz y brócoli"
2. Backend llama a AI para clasificar:
   - "Pollo" → Proteína
   - "Arroz" → Carbohidrato
   - "Brócoli" → Fibra
3. Backend guarda en evento:
   {
     feedingType: "solids",
     feedingNotes: "Pollo con arroz y brócoli",
     nutritionGroups: ["proteina", "carbohidrato", "fibra"],
     aiClassified: true
   }
4. Si AI no puede clasificar (ej: "papilla comercial"):
   {
     feedingType: "solids",
     feedingNotes: "papilla comercial",
     nutritionGroups: [],
     aiClassified: false  // Se guardó sin clasificar
   }
```

**Los 4 Grupos Nutricionales:**
1. **Proteína** (carne, pollo, pescado, huevo, legumbres)
2. **Carbohidrato** (arroz, pasta, pan, tortilla, papa)
3. **Grasa** (aguacate, aceite, mantequilla, nueces)
4. **Fibra** (verduras, frutas)

**Nota del survey CSV línea 60:** Los 4 grupos nutricionales ya están documentados en el diseño del survey como "proteína, grasa, cereal, fibra".

#### Tabla de Requisitos por Edad

##### Bebidas (Leche/Pecho/Biberón)

| Edad | Tomas Leche (mín) | Intervalo Leche | Oz Totales (biberón) |
|------|-------------------|-----------------|---------------------|
| 6 m | 5 | cada 3 hrs | 22-24 oz |
| 7 m | 4 | cada 4 hrs | 22-24 oz |
| 8-9 m | 3-4 | cada 4 hrs | 16-24 oz |
| 9-11 m | 3 | cada 5 hrs | 16-24 oz |
| 11-12 m | 2 | - | máx 16 oz |
| 12+ m | Opcional | - | máx 16 oz |

**Notas:**
- Aplica igual para pecho o biberón
- Para **pecho**: validar cantidad de **tomas** (no oz)
- Para **biberón**: validar **oz totales** del día
- A partir de los 12 meses la alimentación no cambia

##### Sólidos (Comidas + Snacks)

**De 6-9 meses (comidas):**
- Cada comida debe tener: **Proteína + Fibra + (Grasa O Carbohidrato)**
- Mínimo de comidas: 2 (6m), 3 (7m), 3-4 (8-9m)

**De 9+ meses (comidas):**
- Cada comida debe tener: **Proteína + Grasa + Carbohidrato + Fibra** (los 4 grupos)
- Mínimo de comidas: 4 (9-11m), 5 (11-12m), 5 (12m+)

**De 9+ meses (snacks):**
- Cada snack debe tener: **Fibra + (Grasa O Carbohidrato)**
- Los snacks NO requieren proteína

#### Lógica de Validación

1. **Frecuencia de Leche:** Validar que el número de tomas de leche (pecho o biberón) cumpla el mínimo según edad.

2. **Cantidad de Leche (solo biberón):** Sumar oz del día y validar contra el rango por edad. ⚠️ *Campo `feedingAmount` en oz pendiente de capturar consistentemente*

3. **Frecuencia de Sólidos:** Validar que el número de eventos de sólidos (comidas + snacks) cumpla el mínimo según edad.

4. **Grupos Nutricionales en Comidas:** Validar que cada comida de sólidos contenga los grupos requeridos según edad (ver tabla arriba).

5. **Grupos Nutricionales en Snacks:** Validar que cada snack contenga Fibra + (Grasa O Carbo).

6. **Intervalo entre Tomas:** Alertar si pasan más horas de las indicadas entre tomas de leche.

7. **Muchas Horas sin Comer:** Alertar si hay gaps prolongados sin ningún evento de alimentación.

8. **Leche NO Sustituye Sólido:** Alertar si hay una toma de leche en horario de comida sólida sin el sólido correspondiente.

9. **Bandera Roja 12+ Meses:** Si toma más de 16 oz de leche en 24 hrs.

#### Reglas Importantes

- **Tomas nocturnas:** Son INDEPENDIENTES del conteo diurno. No afectan las validaciones del día. Se detectan con el flag `isNightFeeding === true` que ya existe en los eventos.
- **Snacks:** Son parte del conteo de sólidos. A partir de 9 meses se validan con reglas propias (Fibra + Grasa/Carbo).
- **Alertas:** Solo visibles para admin. Validación se ejecuta **por día** (no por evento individual).

#### Campos Faltantes (Sprint 4B)

Total: **2 áreas** a mejorar

**G3 - Bebidas (1):**
1. Captura consistente de oz en eventos de biberón (campo `feedingAmount` existe pero no siempre se usa)

**G3 - Sólidos (1):**
2. El sistema de clasificación AI de grupos nutricionales es completamente nuevo

---

### Grupo 4: Ambiental / Emocional

**Fuente de datos:** Cuestionario (surveyData) + Notas de eventos + Chat.

**Disponibilidad de datos:** ✅ 90% (solo falta campo de humedad)

#### Reglas de Alerta

| Factor | Condición de Alerta | Tipo | Disponible |
|--------|---------------------|------|------------|
| Pantallas | Más de 1 hr en el día **y/o** 2 hrs antes de bedtime | Alerta | ✅ Línea 87 CSV |
| Temperatura | Fuera de rango **22-25°C** | Alerta | ✅ Línea 102 CSV |
| Humedad | Fuera de rango **40-60%** | Sugerencia (revisar) | ⚠️ Falta campo |
| Depresión post-parto | Siempre | Alerta (referir) | ✅ Líneas 24-26 CSV |
| Colecho | Siempre | Informativo (SIDS) | ✅ Línea 106 CSV |
| Comparte cuarto | Si comparte con alguien más | Informativo | ✅ Línea 107 CSV |
| Cambios importantes recientes | Hermanito, kínder, mudanza, etc. | Alerta | ✅ Línea 126 CSV |

#### Detección de Cambios en Texto Libre

> **Importante:** Hay que considerar las notas que agregan en texto dentro de los eventos y en la ventana de chat para captar temas como cambio de año, kínder, hermano nuevo, mudanza, etc.

**Estrategia de detección:** Búsqueda de **keywords** en:
- Campo `notes` de eventos recientes (últimos 7-14 días)
- Mensajes de chat recientes

**Keywords a buscar:**
- Kínder/guardería: "kinder", "guarderia", "escuela", "preescolar"
- Hermanitos: "hermano", "hermanito", "hermana", "bebé nuevo", "nacimiento"
- Mudanza: "mudanza", "cambio de casa", "nueva casa", "mudarnos"
- Otros: "separación", "divorcio", "viaje", "vacaciones", "enfermedad"

**Nota:** Se implementa con búsqueda de keywords simple (no LLM) para MVP. Es más rápido, predecible y suficiente para detectar menciones explícitas.

#### Campos Faltantes (Sprint 4B)

Total: **1 campo**

**G4 - Ambiental (1):**
1. Humedad del cuarto (40-60%)

---

## 3. Comportamiento de Alertas (UX para Mariana)

### Visual

Si una sola condición dentro de un grupo falla, la tarjeta del grupo muestra **indicador rojo**.

En grupos con datos parciales (G2, G3, G4), mostrar también un **mensaje informativo**:

```
⚠️ 3 de 9 indicadores detectados
ℹ️ 6 indicadores pendientes de datos del survey
```

### Interacción (Modal Overlay)

- Al hacer clic en el indicador rojo, se abre un **modal overlay** con el desglose de los **Criterios Fuera de Control**.
- El modal es **solo lectura** - NO permite editar datos
- Cada criterio tiene un **link de navegación** que lleva a Mariana a:
  - La respuesta específica en el cuestionario, O
  - El evento exacto en la bitácora que disparó la alerta
  - Esto permite analizar todo el contexto desde el calendario o el survey

### Niveles de Severidad

| Nivel | Visual | Significado |
|-------|--------|-------------|
| `ok` | Verde | Todos los criterios del grupo pasan |
| `warning` | Amarillo | Dato caduco o informativo (ej: colecho, comparte cuarto) |
| `alert` | Rojo | Uno o más criterios fallan |

---

## 4. El "Pasante AI" (Resumen Ejecutivo)

Motor LLM que recibe como input:
- JSON del perfil del niño
- Alertas de los 4 grupos con sus criterios
- Eventos de los últimos 7 días

### Misión

Entregar un resumen **descriptivo + recomendaciones generales** que contextualice las fallas cruzando datos de grupos diferentes.

### Estilo de Respuesta

**Descriptivo + Recomendaciones Generales:**
- Explica QUÉ está pasando y POR QUÉ
- Sugiere acciones generales
- NO da recomendaciones médicas directas
- NO da ajustes específicos del plan (eso es trabajo de Mariana)

**Ejemplo:**
```
El niño presenta patrón de siestas cortas (<45 min) y despertares frecuentes
en la segunda parte de la noche. Se detectaron también indicadores de reflujo
(vómito frecuente, congestión nasal).

Recomendaciones generales:
- Considera revisar ventanas de vigilia (actualmente 2.5 hrs, podrían ser cortas)
- El reflujo podría estar afectando la calidad del sueño nocturno
- Evaluar si el patrón de alimentación nocturna está relacionado con el reflujo
```

### Lógica

- Si no hay eventos de bitácora, la IA analiza solo el cuestionario.
- Si hay eventos, los interpreta dentro del contexto del cuestionario.

### Frecuencia

**On-demand:** Se genera solo cuando Mariana presiona el botón "Analizar". No se ejecuta automáticamente.

---

## 5. Cierre del Ciclo: Gestión de Planes

Al final de la pantalla de Estadísticas, dos CTAs contextuales.

**Ubicación:** Después del análisis del "Pasante AI". Mariana no tiene que salir de Estadísticas para actuar.

### Botón "Editar Plan Actual"

- Redirige al editor del plan activo del niño.
- Permite ajustes manuales basándose en el análisis.

### Botón "Generar Nuevo Plan (AI)"

- Trigger para que la IA proponga un **Plan v2.0**.
- La IA compara avances entre el plan anterior y datos actuales.
- Propone ajuste de etapa si corresponde.

### Flujo de Uso

1. Mariana entra a **Estadísticas**.
2. Revisa **Semáforo G1-G4** y **Pasante AI**.
3. Al final de la página, actúa sobre el plan.

---

## Arquitectura de Datos

### Colecciones Involucradas

| Colección | Uso en Ítem 4 |
|-----------|---------------|
| `children` | Perfil clínico, surveyData, edad |
| `events` | Bitácora para G1, G3, y texto libre para G4 |
| `childPlans` | Plan vigente, versiones, hora meta |
| `users` | Datos de padres |
| `chatMessages` | Texto libre para detección G4 |

### Estructura de Validación

```typescript
interface DiagnosticResult {
  childId: string
  timestamp: Date
  groups: {
    g1_schedule: GroupValidation
    g2_medical: GroupValidation
    g3_nutrition: GroupValidation
    g4_environmental: GroupValidation
  }
  aiSummary?: string
  alerts: Alert[]
}

interface GroupValidation {
  status: 'ok' | 'warning' | 'alert'
  criteria: CriterionResult[]
  dataCompleteness?: {
    available: number
    total: number
    pending: string[]  // Lista de indicadores pendientes
  }
}

interface CriterionResult {
  name: string
  passed: boolean
  value?: any
  expected?: any
  sourceType: 'survey' | 'event' | 'calculated' | 'chat'
  sourceId?: string  // Para deep linking
  condition?: 'reflux' | 'apnea_allergy' | 'restless_leg'  // Solo G2
  dataAvailable: boolean  // True si el campo existe en el survey/eventos
}

interface Alert {
  group: 'g1' | 'g2' | 'g3' | 'g4'
  criterion: string
  severity: 'alert' | 'warning' | 'info'
  message: string
  deepLink: {
    type: 'survey' | 'event' | 'chat'
    id: string
    field?: string
  }
}

interface NutritionClassification {
  eventId: string
  feedingNotes: string
  nutritionGroups: ('proteina' | 'carbohidrato' | 'grasa' | 'fibra')[]
  aiClassified: boolean  // False si AI no pudo clasificar
  classifiedAt: Date
}
```

### Datos de Referencia (Constantes)

Las tablas de horarios por edad, requisitos de alimentación y reglas de validación deben almacenarse como **constantes en código** (no en BD), ya que son reglas clínicas fijas que solo cambian con actualizaciones de la doctora.

```typescript
// lib/diagnostics/age-schedules.ts
// lib/diagnostics/nutrition-rules.ts
// lib/diagnostics/medical-indicators.ts
// lib/diagnostics/environmental-rules.ts
// lib/diagnostics/ai-classifier.ts  // Para clasificación de alimentos
```

---

## Endpoints API

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/admin/diagnostics/[childId]` | GET | Obtener diagnóstico completo (los 4 grupos) |
| `/api/admin/diagnostics/[childId]/validate` | POST | Forzar revalidación |
| `/api/admin/diagnostics/[childId]/ai-summary` | POST | Generar resumen AI (on-demand) |
| `/api/admin/diagnostics/classify-food` | POST | Clasificar alimento en grupos nutricionales (tiempo real) |

---

## Cambios Necesarios al Survey (Sprint 4B)

Total de **11 campos** identificados como faltantes:

### G2 - Indicadores Médicos (7 campos)

**Reflujo (4):**
1. Solo tolera estar en posición vertical
2. Llora al despertar y nada lo calma más que el pecho
3. Vomita frecuentemente
4. Tomas de pecho muy frecuentes (cada 45-60 min constantemente)

**Apnea (1):**
5. Despierta asustado

**Restless Leg (2):**
6. Patalea al dormirse
7. Busca actividad física en bedtime (caminar, gatear, pararse)

### G3 - Alimentación (0 campos)

Los grupos nutricionales ya están documentados en el survey (línea 60 CSV). Solo falta implementar el sistema de clasificación AI.

### G4 - Ambiental (1 campo)

8. Humedad del cuarto (40-60%)

### Perfil del Paciente (2 campos)

9. Edades individuales de hermanos (actualmente solo existe `cantidadHijos`)
10. Ferritina como campo separado y numérico

### Registro Médico Admin (1 funcionalidad)

11. Espacio para que doctoras registren pruebas y consultas médicas

**Pendiente definir ubicación:** ¿Campo libre en detalle del niño? ¿Sección nueva? ¿Timeline de notas médicas?

---

## Campos del Survey que YA EXISTEN

Basado en análisis del CSV del cuestionario:

### G2 - Médico (Muy completo ~70%)

**Reflujo:**
- ✅ Reflujo/cólicos directo (línea 74)
- ✅ Percentil bajo peso (línea 39)
- ✅ Congestión nasal (línea 83)
- ✅ Dermatitis/eczema (línea 84)
- ✅ Alergias de padres (líneas 12, 23)
- ✅ Irritabilidad (línea 90)

**Apneas/Alergias:**
- ✅ Ronca (línea 68)
- ✅ Respira por boca (línea 69)
- ✅ Inquieto segunda parte noche (línea 72)
- ✅ Sudoración (línea 73)
- ✅ Mucha pipí noche (línea 66)
- ✅ Infecciones oído (línea 80)
- ✅ Pesadillas al final (línea 76)

**Restless Leg:**
- ✅ Inquieto primera parte noche (línea 71)
- ✅ Terrores nocturnos (línea 76)
- ✅ Tarda >30min dormirse (línea 109)

### G3 - Alimentación

- ✅ Grupos nutricionales documentados (línea 60: "proteína, grasa, cereal, fibra")
- ✅ Tipo de alimentación (línea 58)
- ✅ Percentil (línea 39)

### G4 - Ambiental (~90%)

- ✅ Pantallas (línea 87)
- ✅ Temperatura cuarto (línea 102)
- ✅ Depresión post-parto (líneas 24-26)
- ✅ Dónde duerme/colecho (línea 106)
- ✅ Comparte cuarto (línea 107)
- ✅ Cambios recientes (línea 126)

### Perfil

- ✅ Medicamentos genérico (línea 50: "tratamiento médico")

---

## Dudas Pendientes

### Resueltas en Entrevista

1. ✅ **Tolerancia horario:** ±15 min aplica a sleep, wake, siestas
2. ✅ **UX alertas:** Modal overlay solo lectura + navegación
3. ✅ **Resumen AI:** On-demand, descriptivo + recomendaciones generales
4. ✅ **Acceso sin plan:** Bloqueado
5. ✅ **G2 Umbral:** 1 solo indicador ya dispara alerta
6. ✅ **G3 Clasificación:** AI en tiempo real (texto libre)
7. ✅ **G3 Fallback AI:** Guardar sin clasificar
8. ✅ **G3 Grupos:** Proteína, Carbo, Grasa, Fibra (confirmado)
9. ✅ **G3 Reglas por edad:**
   - 6-9m: Proteína + Fibra + (Grasa O Carbo)
   - 9+m comidas: Proteína + Grasa + Carbo + Fibra
   - 9+m snacks: Fibra + (Grasa O Carbo)
10. ✅ **Visibilidad:** Panel completo solo admin
11. ✅ **Campos médicos:** Vienen del survey, editables por padres y admin
12. ✅ **Medicamentos:** Usar lógica actual, no más complejo

### Aún Pendientes

1. **G2 - Primera vs segunda parte de la noche:** ¿Cómo definir? ¿Antes/después medianoche? ¿Primeras 4h vs resto? ¿50% duración vs 50%?

2. **Perfil - Registro médico admin:** ¿Dónde vive? ¿Campo en detalle del niño? ¿Sección nueva? ¿Timeline de notas médicas?

3. **G2 - Ferritina:** ¿Hay umbral numérico? ¿Cómo se valida?
