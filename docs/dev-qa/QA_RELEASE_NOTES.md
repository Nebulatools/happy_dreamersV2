# QA Release Notes - Sprint 4A + 4B (Actualizado con Fixes)

**Fecha:** 2026-02-09 (actualizado)
**Sprint:** Panel de Diagnostico + Mejoras Survey + Pasante AI Extendido + Fixes QA
**URL:** http://localhost:3000

---

## Resumen de Cambios

### Sprint 4A - Item 4: Panel de Diagnostico

| Componente | Descripcion | Estado |
|------------|-------------|--------|
| Rutas | `/dashboard/diagnosticos` y `/dashboard/diagnosticos/[childId]` | COMPLETADO |
| G1 Horario | Validacion de horarios vs plan activo | COMPLETADO |
| G2 Medico | Indicadores de reflujo, apnea, RLS | COMPLETADO |
| G3 Alimentacion | Clasificacion AI de alimentos | COMPLETADO |
| G4 Ambiental | Pantallas, temperatura, colecho, cambios | COMPLETADO |
| Pasante AI | Resumen descriptivo on-demand | COMPLETADO |
| CTAs | Editar Plan / Generar Nuevo Plan | COMPLETADO |

### Sprint 4B - Mejoras Survey y Pasante AI

| Componente | Descripcion | Estado |
|------------|-------------|--------|
| Reflujo Details | Sub-checkboxes condicionales | COMPLETADO |
| Restless Leg | 3 checkboxes nuevos + ferritina | COMPLETADO |
| Humedad | Campo select (seca/normal/humeda) | COMPLETADO |
| Hermanos | Lista con nombre + fecha nacimiento | COMPLETADO |
| Pasante AI | Analisis de texto libre (eventos + chat) | COMPLETADO |

---

# SPRINT 4A - PANEL DE DIAGNOSTICO

## TEST 1: Acceso Admin-Only

**Ruta:** `/dashboard/diagnosticos`

### Pasos

1. Login como USUARIO/PADRE (eljulius@nebulastudios.io / juls0925)
2. Intentar acceder a `/dashboard/diagnosticos`

### Verificar

- [ ] Usuario padre NO puede ver la pagina
- [ ] Muestra mensaje de error o redirige al dashboard

### Verificar como Admin

1. Login como ADMIN (mariana@admin.com / password)
2. Acceder a `/dashboard/diagnosticos`

- [ ] Admin SI puede ver la lista de ninos
- [ ] Cada nino tiene link al panel de diagnostico

---

## TEST 2: Panel de Diagnostico - Vista General

**Ruta:** `/dashboard/diagnosticos/[childId]`

### Pasos

1. Login como ADMIN
2. Seleccionar un nino con plan activo
3. Ir a su panel de diagnostico

### Verificar

- [ ] Se muestra el perfil del nino (nombre, edad, plan activo)
- [ ] Se muestran 4 tarjetas/grupos de validacion (G1, G2, G3, G4)
- [ ] Cada grupo tiene indicador de estado (ok verde, warning amarillo, alert rojo)
- [ ] Si el nino NO tiene plan activo, muestra mensaje bloqueante

---

## TEST 3: G1 - Validacion de Horario

**Ruta:** `/dashboard/diagnosticos/[childId]` > Seccion G1

### Verificar Reglas

- [ ] Compara hora real de despertar vs hora meta del plan
- [ ] Muestra alerta si desvio es > ±15 minutos
- [ ] Alerta si despertar es antes de 6:00 AM
- [ ] Valida duracion de noche segun edad (11h hasta 2.5 anos)
- [ ] Valida ventanas de sueno por tabla de edad

### Verificar Siestas (segun edad del nino)

| Edad | Siestas Esperadas | Verificar |
|------|-------------------|-----------|
| 6 meses | 3 siestas | [ ] Valida ventanas 1.5, 2, 2.5, 2.5-3 hrs |
| 8-9 meses | 2 siestas | [ ] Valida ventanas 3, 3, 2.5-3 hrs |
| 15-18 meses | 1 siesta | [ ] Siesta no antes de 12 PM |
| >3 anos | 0 siestas | [ ] Alerta si siesta despues de 2 PM |

### Verificar UI

- [ ] Criterios que pasan muestran check verde
- [ ] Criterios que fallan muestran X roja o warning amarillo
- [ ] Click en criterio muestra detalle en modal

---

## TEST 4: G2 - Indicadores Medicos

**Ruta:** `/dashboard/diagnosticos/[childId]` > Seccion G2

### Verificar Umbral de Activacion

- [ ] Con 1 SOLO indicador presente, ya se dispara la alerta del grupo
- [ ] El grupo tiene 3 subsecciones: Reflujo, Apnea/Alergias, Restless Leg

### 4.1 Indicadores de Reflujo

- [ ] Detecta "reflujo" o "colicos" del survey
- [ ] Detecta percentil bajo de peso
- [ ] Detecta congestion nasal
- [ ] Detecta dermatitis/eczema
- [ ] (Sprint 4B) Detecta sub-checkboxes: vomita frecuente, llora al comer, arquea espalda

### 4.2 Indicadores de Apnea/Alergias

- [ ] Detecta congestion nasal, infecciones oido
- [ ] Detecta ronquidos
- [ ] Detecta respiracion por boca
- [ ] Detecta inquieto segunda parte de noche (despues de medianoche)
- [ ] Detecta sudoracion nocturna
- [ ] Detecta mucha pipi nocturna
- [ ] Detecta pesadillas al final de la noche

### 4.3 Indicadores de Restless Leg (RLS)

- [ ] Detecta inquieto primera parte de noche
- [ ] Detecta terrores nocturnos
- [ ] Detecta tarda >30 min en dormirse
- [ ] (Sprint 4B) Detecta pataleo nocturno
- [ ] (Sprint 4B) Detecta piernas inquietas
- [ ] (Sprint 4B) Detecta ferritina < 50 ng/mL (si dato disponible)

### Verificar Datos Pendientes

- [ ] Si faltan indicadores del survey, muestra "X indicadores pendientes"
- [ ] Indicadores sin datos muestran estado "warning" con mensaje claro

---

## TEST 5: G3 - Validacion de Alimentacion

**Ruta:** `/dashboard/diagnosticos/[childId]` > Seccion G3

### Verificar Clasificacion AI

- [ ] Eventos de tipo "feeding" con notas se clasifican automaticamente
- [ ] Clasificacion en grupos: proteina, carbohidratos, grasa, fibra
- [ ] Si AI no puede clasificar, muestra "sin clasificar"

### Verificar Reglas por Edad

| Edad | Verificar |
|------|-----------|
| 6-9 meses | [ ] Minimo 3-5 tomas de leche |
| 6-9 meses | [ ] Solidos: Proteina + Fibra + (Grasa O Carbo) |
| 9+ meses comida | [ ] Proteina + Grasa + Carbo + Fibra |
| 9+ meses snack | [ ] Fibra + (Grasa O Carbo) |
| 12+ meses | [ ] Alerta si leche > 16 oz diarias |

### Verificar UI

- [ ] Muestra resumen de comidas del dia
- [ ] Indica si grupos nutricionales estan completos
- [ ] Muestra alerta si falta alguna categoria

---

## TEST 6: G4 - Factores Ambientales

**Ruta:** `/dashboard/diagnosticos/[childId]` > Seccion G4

### Verificar Indicadores

#### Pantallas
- [ ] Alerta si >1 hora de pantalla al dia
- [ ] Alerta si pantallas 2 horas antes de bedtime
- [ ] Dato viene del survey campo tiempo de pantalla

#### Temperatura
- [ ] OK si temperatura entre 22-25°C
- [ ] Alerta si fuera de rango
- [ ] Dato viene del survey

#### Humedad (Sprint 4B)
- [ ] OK si humedad es "normal"
- [ ] Warning si humedad es "seca" o "humeda"
- [ ] Si no hay dato, no alerta (campo opcional)

#### Depresion Post-Parto
- [ ] Siempre muestra si esta marcado en survey
- [ ] Es indicador informativo (no necesariamente alerta)

#### Colecho
- [ ] Alerta si se detecta colecho (riesgo SIDS)
- [ ] Dato viene del survey

#### Cambios Recientes
- [ ] Detecta keywords en notas de eventos y chat
- [ ] Keywords: kinder, guarderia, hermano, mudanza, separacion, viaje
- [ ] Muestra los cambios detectados en el panel

---

## TEST 7: Deep Links y Modal de Detalle

**Ruta:** Click en cualquier criterio del panel

### Verificar

- [ ] Al hacer click en un criterio, abre modal overlay
- [ ] Modal es solo lectura (no se puede editar)
- [ ] Muestra desglose del criterio
- [ ] Si el dato viene del survey, muestra link al campo del survey
- [ ] Si el dato viene de evento, muestra link al evento
- [ ] Se puede cerrar el modal con X o click fuera

---

## TEST 8: Pasante AI - Analisis On-Demand

**Ruta:** `/dashboard/diagnosticos/[childId]` > Seccion Pasante AI

### Pasos

1. Localizar la seccion "Analisis del Pasante AI"
2. Click en boton "Analizar"

### Verificar

- [ ] Muestra estado de carga mientras genera
- [ ] Despues de unos segundos, muestra el resumen AI
- [ ] Resumen describe la situacion del nino
- [ ] Incluye recomendaciones generales (NO medicas directas)
- [ ] Boton "Regenerar" permite volver a analizar

### Verificar Contenido del Resumen

- [ ] Menciona alertas de los 4 grupos si existen
- [ ] Cruza informacion entre grupos (ej: reflujo + despertares)
- [ ] NO da dosis de medicamentos
- [ ] NO da horarios especificos (eso es trabajo de Mariana)
- [ ] Usa lenguaje descriptivo, no tecnico

### (Sprint 4B) Verificar Texto Libre

Si el nino tiene notas de eventos o mensajes de chat de los ultimos 14 dias:

- [ ] Indica "(incluye analisis de texto libre)" en la descripcion
- [ ] El resumen incluye seccion "Hallazgos del texto libre"
- [ ] Extrae sintomas mencionados en el texto
- [ ] Detecta cambios familiares mencionados

---

## TEST 9: CTAs - Editar Plan / Generar Nuevo Plan

**Ruta:** Final del panel de diagnostico

### Verificar

- [ ] Boton "Editar Plan Actual" visible
- [ ] Click redirige al editor del plan activo del nino
- [ ] Boton "Generar Nuevo Plan" visible (puede ser placeholder)

---

# SPRINT 4B - MEJORAS AL SURVEY

## TEST 10: Checkboxes Condicionales de Reflujo

**Ruta:** Survey > Paso de Desarrollo y Salud

### Pasos

1. Login como USUARIO/PADRE
2. Ir a editar el survey del nino
3. Navegar al paso de Desarrollo y Salud
4. Localizar seccion de problemas del hijo

### Verificar

- [ ] Existe checkbox "Reflujo" en la lista de problemas
- [ ] Al marcar "Reflujo", aparecen sub-checkboxes debajo (indentados)
- [ ] Sub-checkboxes disponibles:
  - [ ] "Vomita frecuentemente"
  - [ ] "Arquea la espalda al comer"
  - [ ] "Llora al comer o despues"
- [ ] Al DESMARCAR "Reflujo", los sub-checkboxes desaparecen
- [ ] Los sub-checkboxes seleccionados se limpian al desmarcar reflujo
- [ ] Al guardar survey, los datos persisten correctamente

---

## TEST 11: Checkboxes de Restless Leg Syndrome

**Ruta:** Survey > Paso de Desarrollo y Salud

### Pasos

1. Login como USUARIO/PADRE
2. Ir al survey del nino
3. Navegar al paso de Desarrollo y Salud
4. Localizar seccion de Sindrome de Piernas Inquietas

### Verificar

- [ ] Existe seccion separada para "Sindrome de Piernas Inquietas"
- [ ] Contiene 3 checkboxes:
  - [ ] "Pataleo nocturno al dormirse"
  - [ ] "Piernas inquietas que necesitan movimiento"
  - [ ] "Despierta quejandose de las piernas"
- [ ] Cada checkbox puede marcarse independientemente
- [ ] Al guardar, los datos persisten

---

## TEST 12: Campo de Ferritina

**Ruta:** Survey > Paso de Desarrollo y Salud

### Pasos

1. Login como USUARIO/PADRE
2. Ir al survey del nino
3. Navegar al paso de Desarrollo y Salud
4. Localizar seccion de informacion medica adicional

### Verificar

- [ ] Campo numerico "Nivel de ferritina (ng/mL)"
- [ ] Placeholder dice "Ej: 45"
- [ ] Campo NO es obligatorio
- [ ] Acepta valores numericos positivos
- [ ] Muestra texto de ayuda sobre el umbral (< 50 ng/mL es bajo)
- [ ] Al guardar, el valor persiste

### Verificar Integracion con G2

1. Ingresar valor < 50 (ej: 35)
2. Guardar survey
3. Login como ADMIN
4. Ir al panel de diagnostico del nino

- [ ] G2 muestra alerta de ferritina baja
- [ ] Indica el valor exacto ingresado

---

## TEST 13: Campo de Humedad

**Ruta:** Survey > Paso de Rutina y Habitos

### Pasos

1. Login como USUARIO/PADRE
2. Ir al survey del nino
3. Navegar al paso de Rutina y Habitos
4. Localizar seccion de ambiente de la habitacion (despues de temperatura)

### Verificar

- [ ] Campo select "Humedad de la habitacion"
- [ ] Opciones: "Seca", "Normal", "Humeda"
- [ ] Campo NO es obligatorio (puede dejarse vacio)
- [ ] Al guardar, la seleccion persiste

### Verificar Integracion con G4

1. Seleccionar "Seca" o "Humeda"
2. Guardar survey
3. Login como ADMIN
4. Ir al panel de diagnostico del nino

- [ ] G4 muestra warning para humedad no optima
- [ ] "Normal" no muestra warning

---

## TEST 14: Lista de Hermanos

**Ruta:** Survey > Paso de Dinamica Familiar

### Pasos

1. Login como USUARIO/PADRE
2. Ir al survey del nino
3. Navegar al paso de Dinamica Familiar
4. Localizar seccion de hermanos

### Verificar UI

- [ ] Existe boton "Agregar hermano"
- [ ] Al agregar, aparece fila con campos:
  - [ ] Nombre (texto)
  - [ ] Fecha de nacimiento (date picker)
  - [ ] Checkbox "Es el que necesita ayuda" (opcional)
  - [ ] Boton eliminar (X o icono trash)
- [ ] La edad se calcula y muestra automaticamente
- [ ] Se pueden agregar hasta 10 hermanos
- [ ] Despues de 10, el boton "Agregar" desaparece
- [ ] Se puede eliminar cualquier hermano de la lista

### Verificar Persistencia

1. Agregar 2-3 hermanos con datos completos
2. Guardar survey
3. Salir y volver a entrar al survey

- [ ] Los hermanos agregados persisten
- [ ] Los nombres estan correctos
- [ ] Las fechas estan correctas
- [ ] Las edades se calculan correctamente

### Verificar Edad Calculada

- [ ] Nino de 6 meses muestra "6 meses"
- [ ] Nino de 18 meses muestra "1 ano y 6 meses"
- [ ] Nino de 36 meses muestra "3 anos"

---

## TEST 15: Pasante AI - Analisis de Texto Libre (Sprint 4B)

**Ruta:** Panel de Diagnostico > Pasante AI

### Prerrequisito

El nino debe tener:
- Eventos con notas en los ultimos 14 dias
- Y/O mensajes de chat en los ultimos 14 dias

### Pasos

1. Login como ADMIN
2. Ir al panel de diagnostico de un nino con texto libre
3. Verificar que indica "(incluye analisis de texto libre)"
4. Click en "Analizar"

### Verificar

- [ ] El resumen incluye seccion "Hallazgos del texto libre:"
- [ ] Extrae sintomas mencionados en notas (ej: "vomita despues del biberon")
- [ ] Detecta cambios de vida mencionados (ej: "empezamos guarderia")
- [ ] Relaciona hallazgos con los grupos G1-G4
- [ ] NO inventa informacion que no esta en el texto

### Sin Texto Libre

Si el nino NO tiene notas ni chat:

- [ ] NO muestra "(incluye analisis de texto libre)"
- [ ] Resumen se genera normalmente sin esa seccion

---

# PRUEBAS DE INTEGRACION

## TEST 16: Flujo Completo - Nuevo Survey a Diagnostico

### Pasos

1. Login como PADRE
2. Crear nuevo nino O editar survey existente
3. Llenar campos nuevos:
   - Marcar "Reflujo" + sub-checkboxes
   - Marcar checkboxes de RLS
   - Ingresar ferritina (ej: 40)
   - Seleccionar humedad "Seca"
   - Agregar 1 hermano
4. Guardar survey
5. Logout
6. Login como ADMIN
7. Ir al panel de diagnostico del nino

### Verificar

- [ ] G2 detecta indicadores de reflujo con detalles
- [ ] G2 detecta indicadores de RLS
- [ ] G2 muestra alerta de ferritina baja (< 50)
- [ ] G4 muestra warning de humedad seca
- [ ] Pasante AI incluye estos hallazgos en su resumen

---

## TEST 17: Compatibilidad con Surveys Existentes

**Objetivo:** Verificar que surveys antiguos sin los nuevos campos funcionan correctamente

### Pasos

1. Usar un nino que tenga survey ANTES de Sprint 4B
2. NO editar el survey
3. Login como ADMIN
4. Ir al panel de diagnostico

### Verificar

- [ ] Panel carga sin errores
- [ ] G2 muestra indicadores que SI existen
- [ ] Indicadores nuevos muestran "Dato no disponible" (no error)
- [ ] G4 humedad muestra "No especificada" (no error)
- [ ] Pasante AI funciona aunque falten datos nuevos

---

## TEST 18: Errores y Edge Cases

### API Errors

1. Desconectar internet
2. Intentar "Analizar" con Pasante AI

- [ ] Muestra mensaje de error claro
- [ ] Boton "Reintentar" visible
- [ ] No crashea la pagina

### Campos Vacios

1. Editar survey
2. Dejar ferritina vacia
3. Dejar humedad sin seleccionar
4. Guardar

- [ ] Survey guarda sin error
- [ ] Panel de diagnostico carga sin error

### Valores Limite

1. Ingresar ferritina = 0
2. Ingresar ferritina = 500

- [ ] Valores se guardan correctamente
- [ ] Panel interpreta correctamente (0 = bajo, 500 = normal)

---

---

# FIXES QA - Ajustes Post-Testing (2026-02-09)

Estos tests validan los ajustes realizados en base al feedback de QA documentado en `QA_FEEDBACK_NOTES.md`.

## FIX-TEST 1: Criterios expandibles en G1 y G4

**Ruta:** `/dashboard/diagnosticos/[childId]`
**Fix:** El texto "+X criterios mas" en las tarjetas G1 y G4 ahora es clickeable y expande/colapsa los criterios ocultos.

### Pasos

1. Login como ADMIN (mariana@admin.com / password)
2. Ir al panel de diagnostico de un nino con plan activo
3. Localizar la tarjeta G1 (Validacion de Horario)
4. Verificar que muestra los primeros 5 criterios
5. Buscar el texto "+X criterios mas" debajo de la lista

### Verificar Expandir

- [ ] El texto "+X criterios mas" tiene cursor pointer (mano) al hacer hover
- [ ] El texto tiene color azul y feedback visual de hover (fondo azul claro)
- [ ] Al hacer click, se muestran TODOS los criterios del grupo
- [ ] Aparece boton "Mostrar menos" despues de expandir
- [ ] Al hacer click en "Mostrar menos", se colapsa a 5 criterios de nuevo

### Verificar en G4

1. Localizar la tarjeta G4 (Factores Ambientales)
2. Si tiene mas de 5 criterios, repetir los pasos anteriores

- [ ] G4 tambien tiene boton expandible si tiene >5 criterios
- [ ] El comportamiento es identico al de G1

### Verificar que G2 y G3 no se afectan

- [ ] Si G2 o G3 tienen <=5 criterios, NO muestran boton de expandir
- [ ] Si tienen >5, el boton funciona correctamente tambien

---

## FIX-TEST 2: Crash resuelto en Dinamica Familiar del Survey

**Ruta:** Survey > Paso de Dinamica Familiar
**Fix:** Se corrigio un crash (ErrorBoundary "Algo salio mal") al navegar a la seccion de Dinamica Familiar, causado por `hijosInfo` sin inicializar en surveys existentes.

### Pasos con Survey Existente (SIN hermanos previos)

1. Login como USUARIO/PADRE (eljulius@nebulastudios.io / juls0925)
2. Ir al survey de un nino que ya tenia survey ANTES de este fix
3. Navegar al paso "Dinamica Familiar"

### Verificar

- [ ] La pagina carga sin error (NO muestra "Algo salio mal")
- [ ] La seccion de hermanos se muestra vacia (sin hermanos)
- [ ] El boton "Agregar" hermano esta visible y funcional

### Pasos con Survey Nuevo

1. Crear un nino nuevo O iniciar survey desde cero
2. Navegar al paso "Dinamica Familiar"

### Verificar

- [ ] La pagina carga sin error
- [ ] La seccion de hermanos se muestra vacia

### Pasos para Agregar Hermanos

1. Click en area de agregar hermano
2. Ingresar nombre: "Sofia"
3. Ingresar fecha de nacimiento
4. Click en "Agregar"

### Verificar

- [ ] El hermano aparece en la lista
- [ ] La edad se calcula automaticamente
- [ ] Se puede agregar un segundo hermano
- [ ] Se puede eliminar un hermano con el boton trash
- [ ] Al guardar survey, los hermanos persisten
- [ ] Al volver a entrar al survey, los hermanos siguen ahi

---

## FIX-TEST 3: Ferritina correctamente detectada en G2

**Ruta:** Survey > Desarrollo y Salud + Panel de Diagnostico G2
**Fix:** El evaluador custom de ferritina ahora se ejecuta correctamente. Antes, el motor de validacion usaba logica generica (`valor > 0`) en lugar del umbral correcto (`valor < 50`).

### Pasos - Ferritina BAJA (debe alertar)

1. Login como USUARIO/PADRE
2. Ir al survey del nino
3. Navegar al paso "Desarrollo y Salud"
4. Localizar el campo "Nivel de ferritina (ng/mL)"
5. Ingresar valor: **35**
6. Guardar survey
7. Logout
8. Login como ADMIN (mariana@admin.com / password)
9. Ir a `/dashboard/diagnosticos/[childId]` del mismo nino

### Verificar

- [ ] G2 muestra alerta en seccion "Sindrome de Piernas Inquietas"
- [ ] Aparece criterio "Ferritina baja (<50 ng/mL)" con status rojo/alerta
- [ ] El mensaje indica el valor detectado

### Pasos - Ferritina NORMAL (no debe alertar)

1. Login como USUARIO/PADRE
2. Cambiar ferritina a: **75**
3. Guardar survey
4. Login como ADMIN
5. Ir al panel de diagnostico

### Verificar

- [ ] G2 NO muestra alerta de ferritina
- [ ] El criterio de ferritina muestra status verde/ok

### Pasos - Ferritina VACIA

1. Login como USUARIO/PADRE
2. Borrar el campo de ferritina (dejarlo vacio)
3. Guardar survey
4. Login como ADMIN
5. Ir al panel de diagnostico

### Verificar

- [ ] G2 NO crashea
- [ ] El criterio de ferritina muestra "Dato no disponible" o status pendiente

---

## FIX-TEST 4: Datos del Survey llegan correctamente al Diagnostico

**Ruta:** Survey (todos los pasos) + Panel de Diagnostico (G2 + G4)
**Fix:** Se descubrio y corrigio un problema critico donde TODOS los datos del survey estaban inaccesibles para el motor de diagnostico. El survey guarda datos anidados por seccion pero el diagnostico los buscaba de forma plana. Se agrego una funcion `flattenSurveyData()` que resuelve el mapeo.

### IMPORTANTE: Este es el fix mas critico. Si este falla, G2 y G4 no pueden leer ningun dato del survey.

### Pasos - Verificar G2 (Indicadores Medicos)

1. Login como USUARIO/PADRE
2. Ir al survey del nino, paso "Desarrollo y Salud"
3. Marcar los siguientes checkboxes:
   - [x] Reflujo/colicos
   - [x] Congestion nasal
   - [x] Ronca
4. Guardar survey
5. Logout
6. Login como ADMIN
7. Ir a `/dashboard/diagnosticos/[childId]`

### Verificar G2

- [ ] G2 muestra indicadores de Reflujo detectados (reflujo, congestion)
- [ ] G2 muestra indicadores de Apnea detectados (congestion, ronca)
- [ ] Los indicadores tienen status rojo/alerta (al menos 1 detectado)
- [ ] El resumen del grupo menciona las condiciones detectadas

### Pasos - Verificar G4 (Factores Ambientales)

1. Login como USUARIO/PADRE
2. Ir al survey del nino, paso "Rutina y Habitos"
3. Configurar:
   - Humedad: seleccionar "Seca"
   - Temperatura: ingresar "28" (fuera de rango 22-25)
   - Donde duerme: seleccionar opciones que incluyan "cama padres" (colecho)
   - Comparte habitacion: seleccionar "Si"
4. Ir al paso "Informacion Familiar"
5. En seccion de la mama, marcar "Pensamientos negativos": Si
6. Guardar survey
7. Login como ADMIN
8. Ir al panel de diagnostico

### Verificar G4

- [ ] G4 muestra warning de humedad seca
- [ ] G4 muestra alerta de temperatura fuera de rango (28 > 25)
- [ ] G4 muestra warning de colecho detectado
- [ ] G4 muestra warning de comparte cuarto
- [ ] G4 muestra alerta de depresion post-parto
- [ ] Cada factor tiene su mensaje descriptivo

### Pasos - Verificar G2 sub-checkboxes (Reflujo Details)

1. Login como USUARIO/PADRE
2. Ir al survey, paso "Desarrollo y Salud"
3. Marcar "Reflujo/colicos" (si no esta marcado)
4. Marcar sub-checkboxes que aparecen:
   - [x] Vomita frecuentemente
   - [x] Arquea la espalda
5. Guardar survey
6. Login como ADMIN
7. Ir al panel de diagnostico

### Verificar Sub-checkboxes en G2

- [ ] G2 seccion Reflujo detecta "Vomita frecuentemente"
- [ ] G2 seccion Reflujo detecta "Arquea la espalda"
- [ ] El conteo de indicadores aumenta correctamente

### Pasos - Verificar G2 RLS sub-checkboxes

1. Login como USUARIO/PADRE
2. Ir al survey, paso "Desarrollo y Salud"
3. Marcar checkboxes de Sindrome de Piernas Inquietas:
   - [x] Pataleo nocturno
   - [x] Piernas inquietas
4. Ingresar ferritina: 30
5. Guardar survey
6. Login como ADMIN
7. Ir al panel de diagnostico

### Verificar RLS en G2

- [ ] G2 seccion Piernas Inquietas detecta "Pataleo nocturno"
- [ ] G2 seccion Piernas Inquietas detecta "Piernas inquietas"
- [ ] G2 seccion Piernas Inquietas detecta "Ferritina baja"
- [ ] Status del grupo es alerta (rojo)

---

## FIX-TEST 5: Pasante AI integra notas de Bitacora

**Ruta:** Panel de Diagnostico > Seccion Pasante AI
**Fix:** Se corrigio el pipeline de datos: la API ahora retorna `freeTextData` (notas de eventos + mensajes de chat) y el componente lo pasa al Pasante AI para incluirlo en el analisis.

### Prerrequisito

El nino debe tener:
- Eventos con notas en los ultimos 14 dias (ej: "Hoy vomito despues del biberon")
- Y/O mensajes de chat en los ultimos 14 dias

### Pasos para Crear Notas

1. Login como USUARIO/PADRE
2. Registrar un evento (ej: alimentacion) con notas descriptivas
   - Ejemplo nota: "Vomito despues de la leche, estuvo inquieto toda la noche"
3. Guardar el evento

### Pasos para Verificar

1. Login como ADMIN
2. Ir a `/dashboard/diagnosticos/[childId]`
3. Scroll hasta la seccion "Analisis del Pasante AI"
4. Verificar que indica "(incluye analisis de texto libre)" si hay notas
5. Click en "Analizar"

### Verificar

- [ ] Antes de analizar, indica "(incluye analisis de texto libre)" si hay notas disponibles
- [ ] El resumen AI menciona hallazgos del texto libre
- [ ] Si la nota dice "vomito", el resumen lo relaciona con reflujo/alimentacion
- [ ] Si la nota menciona "guarderia" o "mudanza", detecta cambio de vida
- [ ] El resumen NO inventa informacion que no esta en las notas

### Sin Notas

Si el nino NO tiene notas ni mensajes de chat recientes:

- [ ] NO muestra "(incluye analisis de texto libre)"
- [ ] El resumen se genera normalmente sin seccion de texto libre
- [ ] No hay error ni crash

---

## FIX-TEST 6: Survey Existente sin Campos Nuevos No Causa Error

**Ruta:** Panel de Diagnostico
**Fix:** Validacion defensiva en todo el pipeline: surveys antiguos que no tienen los campos nuevos (ferritina, humedad, reflujoDetails, hermanos) no causan crash.

### Pasos

1. Usar un nino que tenga survey completado ANTES de los cambios de Sprint 4B
2. NO editar su survey
3. Login como ADMIN
4. Ir a `/dashboard/diagnosticos/[childId]`

### Verificar

- [ ] El panel de diagnostico carga sin errores
- [ ] G2 muestra los indicadores que SI existian antes (reflujo como checkbox, congestion, etc.)
- [ ] Indicadores nuevos (ferritina, RLS sub-checkboxes) muestran "Dato no disponible" o "Pendiente"
- [ ] G4 humedad muestra "No especificada" (sin error ni alerta)
- [ ] Pasante AI funciona correctamente aunque falten datos nuevos

### Verificar Survey Dinamica Familiar

1. Login como USUARIO/PADRE
2. Ir al survey del nino (SIN campos nuevos)
3. Navegar a "Dinamica Familiar"

- [ ] La pagina carga sin crash (el fix de hijosInfo previene el error)
- [ ] La seccion de hermanos esta vacia pero funcional

---

## Credenciales de Testing

| Rol | Email | Password |
|-----|-------|----------|
| Admin | mariana@admin.com | password |
| Usuario/Padre | eljulius@nebulastudios.io | juls0925 |

---

## Archivos Modificados

### Sprint 4A - Panel de Diagnostico

| Archivo | Cambio |
|---------|--------|
| `app/dashboard/diagnosticos/page.tsx` | Pagina lista de ninos (admin-only) |
| `app/dashboard/diagnosticos/[childId]/page.tsx` | Panel de diagnostico por nino |
| `components/diagnostic/DiagnosticPanel.tsx` | Componente principal |
| `components/diagnostic/ValidationGroups/*.tsx` | Grupos G1, G2, G3, G4 |
| `components/diagnostic/AIAnalysis/PasanteAISection.tsx` | Seccion Pasante AI |
| `lib/diagnostic/types.ts` | Interfaces de diagnostico |
| `lib/diagnostic/validation-engine.ts` | Motor de validacion |
| `lib/diagnostic/rules/*.ts` | Reglas por grupo |
| `lib/diagnostic/pasante-ai-prompt.ts` | Prompt del Pasante AI |
| `app/api/admin/diagnostics/route.ts` | API diagnostico |
| `app/api/admin/diagnostics/ai-summary/route.ts` | API resumen AI |

### Sprint 4B - Survey + Pasante AI Extendido

| Archivo | Cambio |
|---------|--------|
| `types/models.ts` | Nuevos campos: reflujoDetails, restlessLegSyndrome, nivelFerritina, humedadHabitacion |
| `components/survey/steps/HealthDevStep.tsx` | Sub-checkboxes reflujo, RLS section, campo ferritina |
| `components/survey/steps/RoutineHabitsStep.tsx` | Campo humedad (select) |
| `components/survey/SiblingsList.tsx` | NUEVO: Componente lista de hermanos |
| `components/survey/steps/FamilyDynamicsStep.tsx` | Integracion SiblingsList |
| `lib/diagnostic/medical-indicators.ts` | Indicadores habilitados + evaluador ferritina |
| `lib/diagnostic/environmental-rules.ts` | Humedad como select |
| `lib/diagnostic/rules/environmental-rules.ts` | Evaluacion humedad select |
| `lib/diagnostic/pasante-ai-prompt.ts` | Analisis texto libre (800 tokens) |
| `app/api/admin/diagnostics/ai-summary/route.ts` | Recibe freeTextData |
| `components/diagnostic/AIAnalysis/PasanteAISection.tsx` | Muestra indicador texto libre |

---

## Reporte de Bugs

Si encuentras un bug, documenta en `QA_FEEDBACK_NOTES.md`:

1. **Test #:** Numero del test que fallo
2. **Ruta:** URL donde ocurrio
3. **Pasos para reproducir:** Numerados
4. **Resultado esperado:** Que deberia pasar
5. **Resultado actual:** Que paso realmente
6. **Screenshot:** Si es visual
7. **Consola:** Errores en DevTools (F12)

---

### Fixes QA (2026-02-09)

| Archivo | Cambio | Fix |
|---------|--------|-----|
| `components/diagnostic/ValidationGroupCard.tsx` | Expand/collapse con useState para criterios ocultos | FIX-TEST 1 |
| `components/survey/hooks/useSurveyForm.ts` | Inicializacion `dinamicaFamiliar: { hijosInfo: [] }` | FIX-TEST 2 |
| `components/survey/steps/FamilyDynamicsStep.tsx` | `Array.isArray()` defensivo para hijosInfo | FIX-TEST 2 |
| `components/survey/SiblingsList.tsx` | Validacion defensiva de rawValue en componente | FIX-TEST 2 |
| `lib/diagnostic/rules/medical-rules.ts` | Llamada a evaluator custom + getNestedValue() dot-notation | FIX-TEST 3, 4 |
| `app/api/admin/diagnostics/[childId]/route.ts` | flattenSurveyData() + freeTextData en response | FIX-TEST 4, 5 |
| `lib/diagnostic/types.ts` | Campo freeTextData en interfaz DiagnosticResult | FIX-TEST 5 |
| `app/dashboard/diagnosticos/[childId]/DiagnosticPanelClient.tsx` | Prop freeTextData a PasanteAISection | FIX-TEST 5 |

---

*Generado el 2026-02-04 - Sprint 4A + 4B | Actualizado 2026-02-09 con Fixes QA*
