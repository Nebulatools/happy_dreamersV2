# QA Release Notes — Sprint 6: Admin UX Hub + Diagnostic Pipeline

**Fecha:** 2026-02-26
**URL:** https://happy-dreamers-v2.vercel.app (o localhost:3000)
**Branch QA:** `QA`

---

## Como Usar Esta Guia

Esta guia es una **simulacion end-to-end** del flujo completo de Mariana.
En vez de verificar items individuales, vas a recorrer todo el sistema como si fueras Mariana atendiendo a un paciente.

**Instrucciones:**
1. Abre Claude Code en el proyecto Happy Dreamers
2. Copia y pega los bloques de codigo que dicen **"PEGAR EN CLAUDE"** en tu sesion
3. Claude llenara datos automaticamente (eventos, APIs, etc.)
4. En los **CHECKPOINT HUMANO** tu verificas visualmente que todo se ve bien
5. Marca cada checkpoint con OK o FALLA

**Tiempo estimado:** 30-40 minutos

---

## Credenciales

| Rol | Email | Password |
|-----|-------|----------|
| Admin | mariana@admin.com | password |

---

## Estado Inicial del Nino de Prueba

El nino **E2E TestChild** ya existe en el sistema con un **cuestionario (survey) completado**.
Esto es intencional — simula que los papas ya llenaron el cuestionario inicial.

**Lo que SI tiene desde el inicio:**
- Cuestionario completado (datos del survey: informacion medica, habitos, entorno)
- Por eso, al entrar al Diagnostico veras alertas del survey (ej: indicadores medicos, entorno)
- Esto es **normal y esperado** — el diagnostico siempre muestra resultados del survey

**Lo que NO tiene (empieza en cero):**
- 0 eventos (se crearan en PARTE 4)
- 0 planes (se creara en PARTE 7)
- 0 analisis del Pasante AI (se generara en PARTE 5)

---

## PARTE 1: Navegacion y Sidebar

### CHECKPOINT HUMANO 1: Login y Sidebar

1. Abre el navegador en la app
2. Login como `mariana@admin.com` / `password`

**Verificar:**
- [ ] El sidebar tiene estas opciones principales: Dashboard, Pacientes, Consultas, Diagnosticos, Asistente, Calendario, Reportes
- [ ] NO aparecen: Ayuda, Contacto
- [ ] Configuracion esta fijada en la PARTE DE ABAJO del sidebar (pegado al fondo)
- [ ] El header muestra el icono de busqueda (lupa) en la esquina superior derecha

---

## PARTE 2: Busqueda y Lista de Pacientes

### CHECKPOINT HUMANO 2: Busqueda Child-Centric

1. Click en el icono de busqueda (lupa) en el header
2. Escribe "E2E" en el buscador

**Verificar:**
- [ ] Aparece "E2E TestChild" en los resultados
- [ ] Al hacer click, navega a la vista de ese nino

### CHECKPOINT HUMANO 3: Lista de Pacientes

1. Ir a Pacientes en el sidebar

**Verificar:**
- [ ] Se ve una lista de pacientes en formato master-detail (lista a la izquierda, detalle a la derecha)
- [ ] Cada paciente muestra nombre del nino y edad
- [ ] Al hacer click en un paciente, el detalle se actualiza a la derecha

---

## PARTE 3: Patient Hub — Tabs

### CHECKPOINT HUMANO 4: Patient Hub de E2E TestChild

1. Desde la lista de pacientes, click en E2E TestChild
2. O navegar directo a `/dashboard/paciente/[childId]` del E2E TestChild

**Verificar:**
- [ ] Se ven 6 tabs: Resumen, Diagnostico, Bitacora, Consultas, Encuesta, Documentos
- [ ] El header muestra: flecha "Pacientes", nombre "E2E TestChild", edad
- [ ] El tab "Resumen" esta seleccionado por default
- [ ] Se ven tarjetas de metricas: Hora de Despertar, Sueno nocturno, Hora de Acostarse, Despertares por Noche

---

## PARTE 4: Crear Datos de Prueba (Automatizado)

Ahora vamos a simular un dia completo de un bebe para que haya datos en el diagnostico.

### PEGAR EN CLAUDE:

```
Necesito que crees eventos de prueba para E2E TestChild usando la API.
Login como mariana@admin.com / password.

Primero, obten el childId del E2E TestChild consultando la base de datos o la API GET /api/children.

Luego, crea estos 8 eventos usando POST /api/children/events (con fetch desde el navegador o curl):

1. WAKE — Despertar manana a las 07:00 de hoy
2. FEEDING (bottle) — Biberon 6oz a las 07:30
3. NAP — Siesta de 10:00 a 11:30 (90 min), sleepDelay: 5, emotionalState: "tranquilo"
4. FEEDING (solids) — Comida solida a las 12:00, feedingAmount: 150g
5. FEEDING (bottle) — Biberon 5oz a las 15:00
6. FEEDING (solids) — Cena a las 18:00, feedingAmount: 120g
7. SLEEP — Sueno nocturno a las 20:30, sleepDelay: 10, emotionalState: "tranquilo"
8. NIGHT_WAKING — Despertar nocturno a las 02:00, awakeDelay: 15, emotionalState: "inquieto"

Usa la fecha de HOY para todos los eventos.
Muestra un resumen de los eventos creados al terminar.
NO pidas confirmacion, solo crealos.
```

### CHECKPOINT HUMANO 5: Verificar Eventos en Bitacora

1. Ve al tab "Bitacora" del Patient Hub

**Verificar:**
- [ ] Se ven los 8 eventos en el calendario de hoy
- [ ] Los iconos son correctos (luna para sleep, sol para wake, tenedor para feeding, etc.)
- [ ] El evento de sueno nocturno aparece como sesion larga
- [ ] La siesta aparece en su horario correcto (10:00-11:30)

---

## PARTE 5: Diagnostico con Datos Reales

### CHECKPOINT HUMANO 6: Panel de Diagnostico

1. Ve al tab "Diagnostico"

**Verificar:**
- [ ] Se ve el ProfileHeader con nombre, edad y datos del nino
- [ ] Se ven 4 grupos: G1 Horario, G2 Medico, G3 Nutricion, G4 Ambiental
- [ ] Las tarjetas de G1-G4 estan COLAPSADAS por default (solo se ve el titulo y semaforo)
- [ ] G1 muestra datos reales (hora de despertar, bedtime, siesta) NO "0/7 datos"
- [ ] G3 muestra las tomas de leche y comidas que registramos
- [ ] Al hacer click en una tarjeta, se expande mostrando los criterios detallados

### CHECKPOINT HUMANO 7: Pasante AI

1. Scroll hasta la seccion "Analisis del Pasante AI" (al final del diagnostico)
2. Click en "Analizar"
3. Espera 30-60 segundos

**Verificar:**
- [ ] Aparece un analisis descriptivo del estado del nino
- [ ] El analisis menciona datos reales: hora de despertar, duracion de siesta, alimentacion
- [ ] NO dice "Dra. Mariana" (debe decir solo "Mariana" o "Especialista")
- [ ] Si el survey no marca reflujo, el analisis NO menciona reflujo
- [ ] Despues de generar, aparece boton "Regenerar"

### CHECKPOINT HUMANO 8: Historial del Pasante AI

1. Despues de que se genero el analisis, busca debajo: "Analisis anteriores (N)"
2. Si existe, click para expandir

**Verificar:**
- [ ] Si habia analisis previos, se muestran como lista colapsable
- [ ] Cada entrada muestra: fecha relativa ("Hace 2h", "Ayer"), contexto ("Plan v1 · 8 eventos")
- [ ] Click en una entrada expande el texto completo del analisis pasado
- [ ] El analisis que acabas de generar NO se duplica (no aparece arriba Y en el historial)

---

## PARTE 6: Consultas — Flujo Wizard Completo

### CHECKPOINT HUMANO 9: Tabs de Consultas

1. Ve al tab "Consultas" del Patient Hub

**Verificar:**
- [ ] Los sub-tabs estan en este ORDEN: Transcript, Analisis, Plan, Historial
- [ ] El tab "Transcript" esta seleccionado por default

### PEGAR EN CLAUDE:

```
Dame un transcript de prueba simulando una consulta de Mariana con la mama de E2E TestChild.
El transcript debe ser de 15-20 lineas, en espanol, simulando un dialogo real.
Que mencione:
- El bebe se despierta a las 7am
- Toma biberon de 6oz en la manana
- Hace una siesta de 1.5 horas a media manana
- Come solidos 2 veces al dia (variedad normal)
- Se duerme a las 8:30pm con rutina de bano + cuento
- Tuvo 1 despertar nocturno donde lo calmaron con palmaditas
- La mama pregunta si el despertar nocturno es normal

Muestra SOLO el texto del transcript para que yo lo copie y pegue.
```

### CHECKPOINT HUMANO 10: Pegar Transcript y Analizar

1. Copia el transcript que Claude te dio
2. Pegalo en el campo de texto del tab "Transcript"
3. Click en "Generar Analisis Completo"
4. Espera 30-60 segundos

**Verificar:**
- [ ] Aparece un loading state mientras analiza
- [ ] Al terminar, automaticamente salta al tab "Analisis"
- [ ] El analisis muestra DOS secciones: "Analisis de la Consulta" y "Plan de Mejoramiento"
- [ ] NO aparece informacion tecnica (IDs, tiempo en milisegundos, "knowledge base RAG", "Informacion del Reporte")
- [ ] Al final del analisis aparece un card: "Siguiente paso" con boton "Ir al Plan"

### CHECKPOINT HUMANO 11: CTA Siguiente Paso

1. Click en el boton "Ir al Plan"

**Verificar:**
- [ ] Navega automaticamente al tab "Plan"
- [ ] Se ve el gestor de planes (PlanManager)

---

## PARTE 7: Crear Plan desde el Analisis

### PEGAR EN CLAUDE:

```
Necesito crear un Plan v1 para E2E TestChild usando la API de Happy Dreamers.

1. Obten el childId del E2E TestChild y el userId de su padre
2. Verifica si ya hay un plan activo: GET /api/consultas/plans?childId=[childId]
3. Si no hay plan activo, crea uno: POST /api/consultas/plans con:
   - childId del E2E TestChild
   - userId del padre
   - planType: "Progresion"
   - transcript: "Consulta de seguimiento: bebe despierta 7am, siesta 1.5h, bedtime 8:30pm con rutina bano+cuento, 1 despertar nocturno"
4. Activa el plan: PATCH /api/consultas/plans/[planId] con status: "active"

Muestra el planId y confirma que quedo activo.
```

### CHECKPOINT HUMANO 12: Plan Visible

1. Recarga la pagina del Patient Hub
2. Ve al tab Consultas -> sub-tab Plan

**Verificar:**
- [ ] Se ve el plan activo con horarios del bebe
- [ ] El plan muestra schedule con bedtime, wake time, siestas
- [ ] El vocabulario de comidas es variado (no solo "desayuno/comida/cena" repetitivo)

---

## PARTE 8: Diagnostico con Plan Activo

### CHECKPOINT HUMANO 13: Diagnostico Actualizado con Plan

1. Ve al tab "Diagnostico" del Patient Hub
2. Regenera el analisis del Pasante AI (click "Regenerar")

**Verificar:**
- [ ] En G1 (Horario), la referencia de bedtime viene del PLAN activo
- [ ] ProfileHeader muestra referencia al plan activo
- [ ] El Pasante AI ahora menciona el plan y compara adherencia del bebe

### CHECKPOINT HUMANO 14: Historial del Pasante AI Crece

1. Despues de regenerar, verifica la seccion "Analisis anteriores"

**Verificar:**
- [ ] El historial ahora tiene al menos 2 entradas
- [ ] El nuevo muestra contexto "Plan v1 · X eventos"
- [ ] Los anteriores siguen accesibles expandiendo cada uno

---

## PARTE 9: Tab Resumen con Plan

### CHECKPOINT HUMANO 15: Metricas vs Plan

1. Ve al tab "Resumen"

**Verificar:**
- [ ] Las tarjetas muestran comparacion contra el plan:
  - "Hora ideal del plan: XX:XX" con badge de diferencia
  - "Duracion ideal del plan: XXh XXm"
- [ ] Los datos coinciden con los eventos que creamos (despertar 7:00, bedtime 20:30, siesta 1.5h)
- [ ] Seccion "Maximos y minimos semanales" muestra datos

---

## PARTE 10: Historial de Consultas

### CHECKPOINT HUMANO 16: Historial

1. Ve al tab Consultas -> sub-tab "Historial"

**Verificar:**
- [ ] Se muestra al menos 1 consulta en el historial (la que generamos con el transcript)
- [ ] Cada entrada muestra fecha y resumen

---

## PARTE 11: Survey (Verificacion Visual)

### CHECKPOINT HUMANO 17: Tab de Encuesta

1. Ve al tab "Encuesta"

**Verificar:**
- [ ] Se muestra el survey/cuestionario del nino
- [ ] Si tiene datos, se ven las respuestas
- [ ] Si no tiene datos, se ve un estado vacio apropiado

---

## Resumen de Checkpoints

| # | Checkpoint | Area | Status |
|---|-----------|------|--------|
| 1 | Login y Sidebar | Navegacion | |
| 2 | Busqueda Child-Centric | Header | |
| 3 | Lista de Pacientes | Pacientes | |
| 4 | Patient Hub Tabs | Patient Hub | |
| 5 | Eventos en Bitacora | Bitacora | |
| 6 | Panel de Diagnostico | Diagnostico | |
| 7 | Pasante AI | Diagnostico | |
| 8 | Historial Pasante AI | Diagnostico | |
| 9 | Tabs de Consultas | Consultas | |
| 10 | Transcript y Analisis | Consultas | |
| 11 | CTA Siguiente Paso | Consultas | |
| 12 | Plan Visible | Consultas/Plan | |
| 13 | Diagnostico con Plan | Diagnostico | |
| 14 | Historial AI Crece | Diagnostico | |
| 15 | Metricas vs Plan | Resumen | |
| 16 | Historial Consultas | Consultas | |
| 17 | Tab Encuesta | Encuesta | |

---

## Si Algo Falla

Anota en `QA_FEEDBACK_NOTES.md`:
1. Numero de checkpoint donde fallo
2. Que esperabas ver vs que viste
3. Screenshot si es posible
4. Si es un error de consola, copia el mensaje

---

## Archivos Modificados en Este Sprint

<details>
<summary>96 archivos (click para expandir)</summary>

**Nuevos:**
- `app/dashboard/paciente/*` (7 archivos) — Patient Hub
- `components/dashboard/header-utility-bar.tsx` — Header con busqueda
- `hooks/use-admin-search.ts` — Hook de busqueda
- `hooks/use-notifications.ts` — Notificaciones
- `components/survey/DynamicListField.tsx` — Listas dinamicas survey
- `lib/diagnostic/plan-formatter.ts` — Formateador de plan para AI
- `app/api/children/[id]/documents/route.ts` — API documentos

**Modificados significativamente:**
- `components/dashboard/sidebar.tsx` — Simplificado
- `components/dashboard/header.tsx` — Unificado
- `components/survey/steps/RoutineHabitsStep.tsx` — Dia tipico reestructurado
- `components/survey/steps/HealthDevStep.tsx` — Alimentacion estructurada
- `app/api/admin/diagnostics/[childId]/route.ts` — 8 pipeline fixes
- `components/consultas/AnalysisReport.tsx` — UX cleanup
- `components/diagnostic/AIAnalysis/PasanteAISection.tsx` — Historial

**Eliminados:**
- `app/dashboard/transcripts/page.tsx`
- `app/dashboard/ayuda/page.tsx`
- `app/dashboard/contacto/page.tsx`

</details>
