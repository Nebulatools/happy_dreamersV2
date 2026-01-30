# ESPECIFICACIÓN TÉCNICA: ÍTEM 4 - PANEL DE DIAGNÓSTICO (ESTADÍSTICAS)

## Vision

Este módulo es un **motor de validación** que cruza la bitácora en tiempo real con las respuestas del cuestionario y las reglas clínicas de Happy Dreamers. Permite a Mariana auditar el progreso de cada niño y tomar decisiones informadas sobre su plan de sueño.

**Audiencia:** Solo Admin (Mariana). Los padres NO deben ver este panel.

**Ubicación:** Dashboard Admin > Estadísticas de Sueño

**Prerequisito:** El niño debe tener un **plan activo**. Sin plan, el panel está bloqueado.

---

## Visibilidad por Rol

| Componente | Admin | Padres | Ubicación |
|------------|-------|--------|-----------|
| Tarjeta Info Paciente (Médica) | Sí | No | Dashboard Admin > Estadísticas |
| Semáforo G1-G4 (Alertas) | Sí | No | Dashboard Admin > Estadísticas |
| Resumen "Pasante AI" | Sí | No | Dashboard Admin > Estadísticas |
| Acciones de Planes (Edit/AI) | Sí | No | Dashboard Admin > Estadísticas |
| Bitácora Narrativa (Sin Alertas) | Sí | Sí | Admin (Bitácora Diaria) / Padres (Home) |

**Importante para Front-end:** En la vista de Mariana, los eventos narrativos deben poder mostrar el **badge de alerta rojo** si el motor de validación detecta un fallo (ej. despertar fuera del margen de 15 min).

---

## Decisiones de Entrevista

| Decisión | Valor | Fuente |
|----------|-------|--------|
| Tolerancia desvío horario | +/- 15 minutos | Feedback doctora |
| UX al clickear alerta | Modal overlay | Entrevista usuario |
| Frecuencia resumen AI | On-demand (botón) | Entrevista usuario |
| Acceso sin plan activo | Bloqueado | Entrevista usuario |
| Despertar mínimo | 6:00 AM para todos | Feedback doctora |

---

## 1. Cabecera: Perfil Clínico del Paciente

Tarjeta de información persistente en el `top` de la pantalla. Contextualiza el análisis de Mariana.

### Campos Requeridos

**Generales:**
- Nombre del niño
- Edad actual (meses/años)
- Nombres de los padres y edades
- Número de hermanos y **edades individuales** de cada uno

**Status:**
- Plan vigente y versión
- Etapa actual del proceso

**Alertas Críticas (Banderas Rojas):**
- Última consulta médica y qué se hizo
- Temas médicos (último update)
- Alergias
- Reflujo/Cólicos
- Ferritina
- Temas de Neuro-desarrollo

### Nota para Desarrollo: Registro Médico Admin

> Se necesita un espacio donde las doctoras puedan registrar pruebas y consultas médicas realizadas. Esto alimenta las "banderas rojas" del perfil. **Pendiente definir**: ¿campo libre en el detalle del niño? ¿sección nueva en admin?

---

## 2. Los 4 Grupos de Control (Semaforización)

4 tarjetas de resumen que actúan como **indicadores de salud del plan**.

---

### Grupo 1: Horario (Schedule)

**Fuente de datos:** Eventos de sueño/siesta/wake en la Bitácora + Plan activo del niño.

#### Reglas Generales

- El horario puede variar **+/- 15 minutos** — fuera de ese margen es alerta
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

1. **Desvío de Despertar:** Si `hora_despertar_real` se desvía más de **15 min** de la `hora_meta` del plan, marcar alerta.

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

G2 no evalúa campos aislados sino **patrones diagnósticos**. Varios síntomas se comparten entre condiciones pero en distintos contextos (ej: "inquieto en la noche" aparece en apneas Y restless leg, pero en diferentes partes de la noche).

#### 2.1 Indicadores de Reflujo

Alertar si el survey o la bitácora muestran **2 o más** de:

- Solo tolera estar en posición vertical
- Llora al despertar y nada lo calma más que el pecho
- Vomita frecuentemente
- Tomas de pecho muy frecuentes día y/o noche (cada 45-60 min constantemente)
- No sube de peso o percentil bajo de peso
- Irritable frecuentemente
- Congestión nasal
- Dermatitis (eczema)
- Factor hereditario: un padre con alergia = 60% probabilidad; ambos padres = 90%

#### 2.2 Indicadores de Apneas / Alergias

Alertar si el survey o la bitácora muestran **2 o más** de:

- Congestión nasal
- Infecciones de oído frecuentes
- Ronca
- Dermatitis / eczema
- Respira por la boca
- Inquieto durante la noche (**sobre todo en la segunda parte de la noche**)
- Sudoración nocturna
- Mucha pipí en la noche (se para a hacer pipí o pañales mojados; debería durar toda la noche)
- Insomnio
- Despertares aumentan en frecuencia en **segunda parte de la noche**
- Despierta asustado
- Respira por la boca

#### 2.3 Indicadores de Restless Leg Syndrome

Alertar si el survey o la bitácora muestran **2 o más** de:

- Siestas desorganizadas (cortas o batallan para un horario predecible)
- Inquieto en la **primera parte de la noche**
- Terrores nocturnos
- Batallan en bedtime (tarda más de 30 min en dormirse)
- Patalea al dormirse
- Busca actividad física en bedtime (caminar, gatear, pararse)

#### Caducidad de Datos

Verificar la fecha de respuesta del survey. Si el dato tiene más de **30 días**, marcar como "Dato por actualizar".

#### Nota: Síntomas Compartidos

Algunos síntomas aparecen en múltiples condiciones. La diferenciación clave es **en qué parte de la noche** ocurren:

| Síntoma | Reflujo | Apneas | Restless Leg |
|---------|---------|--------|--------------|
| Inquieto en la noche | - | 2da parte | 1ra parte |
| Congestión nasal | Sí | Sí | - |
| Dermatitis/eczema | Sí | Sí | - |
| Despertares frecuentes | - | 2da parte | - |

---

### Grupo 3: Alimentación

**Fuente de datos:** Eventos de feeding en la Bitácora + Edad del niño.

#### Tabla de Requisitos por Edad

| Edad | Tomas Leche (mín) | Intervalo Leche | Sólidos (mín) | Oz Totales (biberón) |
|------|-------------------|-----------------|---------------|---------------------|
| 6 m | 5 | cada 3 hrs | 2 | 22-24 oz |
| 7 m | 4 | cada 4 hrs | 3 | 22-24 oz |
| 8-9 m | 3-4 | cada 4 hrs | 3-4 | 16-24 oz |
| 9-11 m | 3 | cada 5 hrs | 4 | 16-24 oz |
| 11-12 m | 2 | - | 5 | máx 16 oz |
| 12+ m | Opcional | - | 5 | máx 16 oz |

**Notas:**
- Aplica igual para pecho o biberón. Es el mínimo necesario de leche en el día.
- Para **pecho**, se valida cantidad de **tomas** (no oz).
- Para **biberón**, se valida **oz totales** del día.
- A partir de los 12 meses la alimentación no cambia.

#### Lógica de Validación

1. **Frecuencia de Leche:** Validar que el número de tomas de leche (pecho o biberón) cumpla el mínimo según edad.

2. **Cantidad de Leche (solo biberón):** Sumar oz del día y validar contra el rango por edad.

3. **Frecuencia de Sólidos:** Validar que el número de eventos de sólidos cumpla el mínimo según edad.

4. **Intervalo entre Tomas:** Alertar si pasan más horas de las indicadas entre tomas de leche.

5. **Muchas Horas sin Comer:** Alertar si hay gaps prolongados sin ningún evento de alimentación.

6. **Leche NO Sustituye Sólido:** Alertar si hay una toma de leche en horario de comida sólida sin el sólido correspondiente.

7. **Bandera Roja 12+ Meses:** Si toma más de 16 oz de leche en 24 hrs.

#### Reglas Importantes

- **Tomas nocturnas:** Son INDEPENDIENTES del conteo diurno. No afectan las validaciones del día.
- **Snacks:** Son parte del conteo de sólidos, no se relacionan con la leche.

---

### Grupo 4: Ambiental / Emocional

**Fuente de datos:** Cuestionario (surveyData) + Notas de eventos + Chat.

#### Reglas de Alerta

| Factor | Condición de Alerta | Tipo |
|--------|---------------------|------|
| Pantallas | Más de 1 hr en el día **y/o** 2 hrs antes de bedtime | Alerta |
| Temperatura | Fuera de rango **22-25°C** | Alerta |
| Humedad | Fuera de rango **40-60%** | Sugerencia (revisar) |
| Depresión post-parto | Siempre | Alerta (referir a profesional) |
| Colecho | Siempre | Informativo (enviar recomendaciones de seguridad y prevención del SIDS) |
| Comparte cuarto | Si comparte con alguien más | Informativo |
| Cambios importantes recientes | Hermanito, kínder, mudanza, etc. | Alerta |

#### Detección de Cambios en Texto Libre

> **Importante:** Hay que considerar las notas que agregan en texto dentro de los eventos y en la ventana de chat para captar temas como cambio de año, kínder, hermano nuevo, mudanza, etc.

Esto implica:
- Escanear campo `notes` de eventos recientes
- Escanear mensajes de chat recientes
- Buscar palabras clave: "kínder", "escuela", "hermano", "hermanito", "mudanza", "cambio", "nuevo", "separación", etc.

---

## 3. Comportamiento de Alertas (UX para Mariana)

### Visual

Si una sola condición dentro de un grupo falla, la tarjeta del grupo muestra **indicador rojo**.

### Interacción (Modal Overlay)

- Al hacer clic en el indicador rojo, se abre un **modal overlay** con el desglose de los **Criterios Fuera de Control**.
- Cada criterio tiene un link directo que lleva a Mariana a:
  - La respuesta específica en el cuestionario, O
  - El evento exacto en la bitácora que disparó la alerta

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

Entregar un resumen que **contextualice las fallas** cruzando datos de grupos diferentes.

### Lógica

- Si no hay eventos de bitácora, la IA analiza solo el cuestionario.
- Si hay eventos, los interpreta dentro del contexto del cuestionario.
  - Ejemplo: "El niño despierta temprano y se detectaron indicadores de reflujo (vómito frecuente, congestión nasal). Esto podría estar afectando la segunda parte de la noche."

### Restricción

El resumen debe ser **informativo para Mariana**, no debe dar recomendaciones médicas directas.

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
}

interface CriterionResult {
  name: string
  passed: boolean
  value?: any
  expected?: any
  sourceType: 'survey' | 'event' | 'calculated' | 'chat'
  sourceId?: string  // Para deep linking
  condition?: 'reflux' | 'apnea_allergy' | 'restless_leg'  // Solo G2
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
```

### Datos de Referencia (Constantes)

Las tablas de horarios por edad, requisitos de alimentación y reglas de validación deben almacenarse como **constantes en código** (no en BD), ya que son reglas clínicas fijas que solo cambian con actualizaciones de la doctora.

```typescript
// lib/diagnostics/age-schedules.ts
// lib/diagnostics/nutrition-rules.ts
// lib/diagnostics/medical-indicators.ts
// lib/diagnostics/environmental-rules.ts
```

---

## Endpoints API

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/admin/diagnostics/[childId]` | GET | Obtener diagnóstico completo (los 4 grupos) |
| `/api/admin/diagnostics/[childId]/validate` | POST | Forzar revalidación |
| `/api/admin/diagnostics/[childId]/ai-summary` | POST | Generar resumen AI (on-demand) |

---

## Cambios Necesarios al Survey

Campos que posiblemente faltan o necesitan actualizarse en el cuestionario para alimentar G2 y G4:

1. **Reflujo:** Posición vertical, vómito frecuente, percentil de peso
2. **Apneas:** Respiración bucal, sudoración nocturna, pipí nocturna, despierta asustado
3. **Restless Leg:** Pataleo al dormirse, busca actividad física en bedtime
4. **Ambiental:** Humedad del cuarto, si comparte cuarto con alguien
5. **Cambios recientes:** Campo abierto para eventos importantes (hermanito, kínder, mudanza)
6. **Hermanos:** Agregar campo de edades individuales (actualmente solo hay `cantidadHijos`)
7. **Registro médico admin:** Espacio para que las doctoras registren pruebas y consultas médicas realizadas

---

## Dudas Pendientes

### Confirmadas pero requieren precisión

1. **G2 - Umbral de activación:** El spec define los indicadores de cada condición médica, pero **¿cuántos indicadores deben estar presentes para disparar la alerta?** (Asumí 2 o más — confirmar con doctora).

2. **G2 - Ferritina:** Aparece en las banderas del perfil clínico pero NO en los indicadores de G2. **¿Hay un umbral numérico para ferritina?** ¿Se captura en el survey?

3. **G2 - Primera vs segunda parte de la noche:** Para diferenciar apneas (2da parte) de restless leg (1ra parte), **¿cómo definimos "primera" y "segunda" parte?** ¿Antes/después de medianoche? ¿Primeras 4 horas vs resto?

4. **G3 - Grupos nutricionales:** El spec original mencionaba validar 4 grupos (Proteína, Grasa, Cereal, Fibra). La doctora no confirmó esto — se enfocó en frecuencia y cantidad. **¿Se implementa la validación de grupos nutricionales o solo frecuencia/cantidad?**

5. **G4 - NLP en notas y chat:** La doctora indica revisar texto libre de eventos y chat para detectar cambios ambientales. **¿Implementar como búsqueda de keywords simple o con LLM?** Keywords es más rápido y predecible para MVP.

6. **Perfil - Registro médico admin:** La doctora necesita un espacio para registrar pruebas y consultas. **¿Dónde vive esto?** ¿Campo en el detalle del niño? ¿Sección nueva? ¿Timeline de notas médicas?

7. **Survey - Campos nuevos:** Se identificaron 7 áreas donde faltan campos en el survey. **¿Se agregan en este sprint o en uno posterior?** Impacta el alcance significativamente.
