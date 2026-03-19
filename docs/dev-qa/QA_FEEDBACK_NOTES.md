# QA Feedback Notes

**Fecha:** 2026-03-10
**Sprint:** Sprint 6




## PARTE 3: Dashboard Admin

### CHECKPOINT 3: Metricas Principales

1. Click en **Dashboard** en el sidebar

**Verificar:**
- [ ] Se ven tarjetas de metricas arriba: Total de Pacientes, Pacientes Activos, Alertas Clinicas, Nuevos del Mes
- [ ] Al hacer click/hover en "Total de Pacientes", muestra desglose: activos, inactivos, archivados

### CHECKPOINT 4: Tabs del Dashboard

1. Observa los tabs debajo de las metricas

**Verificar:**
- [ ] Tab "Todos los Pacientes" muestra lista de ninos ordenada **A→Z** (de arriba hacia abajo)
- [ ] Cada nino muestra nombre y badges (plan activo, actividad reciente, etc.)
- [ ] Tab "Actividad Reciente" muestra ninos con eventos en las ultimas 48 horas
- [ ] Si hay alertas clinicas, se muestran con severidad y descripcion (ej: "Medico: Ronca")
- [ ] Click en un nino de la lista navega a su Patient Hub

---

## PARTE 4: Lista de Pacientes y Tabs de Status

### CHECKPOINT 5: Master-Detail y Tabs

1. Click en **Pacientes** en el sidebar

**Verificar:**
- [ ] Se ve layout de 2 paneles: lista de familias a la izquierda, detalle a la derecha
- [ ] Debajo del buscador hay 4 tabs: **Activos**, **Inactivos**, **Archivados**, **Todos**
- [ ] Cada tab muestra un conteo entre parentesis (ej: "Activos (5)")
- [ ] El tab "Activos" esta seleccionado por default
- [ ] Las familias estan ordenadas **A→Z** (de arriba hacia abajo)
- [ ] Al hacer click en una familia, el panel derecho muestra sus ninos

### CHECKPOINT 6: Busqueda y Filtrado

1. Escribe un nombre en el buscador del panel izquierdo
2. Luego borra el texto
3. Cambia entre los tabs Activos → Inactivos → Archivados → Todos

**Verificar:**
- [ ] La busqueda filtra familias en tiempo real
- [ ] Al borrar el texto, vuelven todas las familias del tab activo
- [ ] El tab "Todos" muestra TODAS las familias sin importar status
- [ ] El tab "Inactivos" muestra solo familias con ninos sin actividad reciente (30+ dias) y sin plan
- [ ] Los conteos de cada tab se corresponden con la realidad

### CHECKPOINT 7: Badges de Status en Tarjetas

1. Estando en tab "Todos", selecciona una familia y observa las tarjetas de ninos en el panel derecho

**Verificar:**
- [ ] Ninos sin plan activo muestran badge ambar "Sin plan"
- [ ] Ninos con plan activo NO muestran badge "Sin plan"
- [ ] Ninos archivados muestran badge con icono de archivo
- [ ] Las tarjetas de ninos inactivos/archivados se ven con opacidad reducida (mas tenues)

---

## PARTE 5: Archivar y Restaurar Pacientes

### CHECKPOINT 8: Archivar un Nino

1. En tab "Activos", selecciona una familia
2. En una tarjeta de nino, busca el boton de archivar (icono de caja/archivo)
3. Click en archivar

**Verificar:**
- [ ] Aparece dialogo de confirmacion preguntando si quieres archivar
- [ ] Al confirmar, el nino desaparece del tab "Activos"
- [ ] Al ir al tab "Archivados", el nino aparece ahi
- [ ] Los conteos de los tabs se actualizaron correctamente

### CHECKPOINT 9: Restaurar un Nino

1. En tab "Archivados", selecciona la familia del nino que archivaste
2. Click en el boton de restaurar (icono de deshacer)

**Verificar:**
- [ ] Aparece dialogo de confirmacion
- [ ] Al confirmar, el nino desaparece de "Archivados" y vuelve a "Activos"
- [ ] Los conteos se actualizan

---

## PARTE 6: Auto-Reactivacion

> Verifica que registrar un evento como **padre** desarchiva automaticamente al nino.

### Paso 6.1: Preparar

1. Como admin, archiva un nino (CHECKPOINT 8)
2. Anota cual nino archivaste

### Paso 6.2: Registrar evento como padre

1. **Cierra sesion** del admin
2. Login como `eljulius@nebulastudios.io` / `juls0925`
3. Selecciona el nino que archivaste (si es su hijo)
4. Registra cualquier evento desde la UI (ej: alimentacion con biberon)

### CHECKPOINT 10: Verificar Reactivacion

1. **Cierra sesion** del padre
2. Login como `mariana@admin.com` / `password`
3. Ve a **Pacientes**

**Verificar:**
- [ ] El nino que archivaste ahora aparece de nuevo en tab "Activos"
- [ ] Ya NO aparece en tab "Archivados"

> **Nota:** Si el nino archivado no es hijo de eljulius, puedes omitir esta prueba. La auto-reactivacion funciona cuando un padre registra un evento via la API.

---

## PARTE 7: Patient Hub — Resumen

### CHECKPOINT 11: Tabs del Patient Hub

1. Desde **Pacientes**, click en un nino para entrar a su Patient Hub

**Verificar:**
- [ ] Se ven 6 tabs: **Resumen**, **Diagnostico**, **Bitacora**, **Consultas**, **Encuesta**, **Documentos**
- [ ] El header muestra flecha atras "Pacientes", nombre del nino y su edad
- [ ] El tab "Resumen" esta seleccionado por default
- [ ] Se ven tarjetas de metricas de sueno (Hora de Despertar, Sueno nocturno, etc.)
- [ ] Si el nino tiene plan activo, las tarjetas comparan contra el plan ("Hora ideal del plan: XX:XX")

---

## PARTE 8: Patient Hub — Diagnostico

### CHECKPOINT 12: Panel de Diagnostico

1. Click en tab "Diagnostico"

**Verificar:**
- [ ] Se ve el ProfileHeader con nombre, edad y datos del nino
- [ ] Se ven 4 grupos de validacion: G1 Horario, G2 Medico, G3 Nutricion, G4 Ambiental
- [ ] Las tarjetas G1-G4 estan **colapsadas** por default (solo titulo y semaforo)
- [ ] Al hacer click en una tarjeta, se expande mostrando criterios detallados
- [ ] G2 (Medico): Si el nino NO tiene survey, NO muestra indicadores medicos falsos
- [ ] G4 (Ambiental): Si el survey dice que el nino comparte cuarto, muestra con quien

### CHECKPOINT 13: Pasante AI

1. Scroll abajo hasta "Analisis del Pasante AI"
2. Click en "Analizar" (o "Regenerar" si ya existia uno)
3. Espera 30-60 segundos

**Verificar:**
- [ ] Aparece loading state mientras analiza
- [ ] El analisis menciona datos reales del nino (horarios, alimentacion, etc.)
- [ ] NO dice "Dra. Mariana" (debe usar "Mariana" o "Especialista")
- [ ] Despues de generar, aparece boton "Regenerar"
- [ ] Si hay analisis previos, se muestran abajo como "Analisis anteriores (N)" colapsable
- [ ] Cada entrada del historial muestra fecha relativa y contexto

---

## PARTE 9: Patient Hub — Bitacora

### CHECKPOINT 14: Calendario de Eventos

1. Click en tab "Bitacora"

**Verificar:**
- [ ] Se ve un calendario con los eventos del nino
- [ ] Los iconos de eventos son correctos (luna para sleep, sol para wake, tenedor para feeding)
- [ ] Los eventos de sueno nocturno aparecen como sesiones largas (barras anchas)
- [ ] Las siestas aparecen en su horario correcto

### CHECKPOINT 15: Banner de Plan Activo y Vista de Analisis

1. Si el nino tiene plan activo, observa si hay un banner arriba del calendario
2. Busca si hay una vista de "Analisis" (grid multi-dia)

**Verificar:**
- [ ] Si hay plan activo: se ve un banner colapsable con horarios del plan (bedtime, wake, siestas)
- [ ] Si hay vista de analisis: muestra varios dias lado a lado con resumen diario
- [ ] Los colores de texto de los eventos de "Hoy" en la vista diaria son **legibles** (no blanco sobre blanco)

---

## PARTE 10: Patient Hub — Consultas (Wizard)

### CHECKPOINT 16: Tabs de Consultas

1. Click en tab "Consultas"

**Verificar:**
- [ ] Los sub-tabs estan en este ORDEN: **Transcript**, **Analisis**, **Plan**, **Historial**
- [ ] El tab "Transcript" esta seleccionado por default

### CHECKPOINT 17: Generar Analisis desde Transcript

1. Escribe o pega un texto de prueba en el campo de transcript (puede ser cualquier texto que simule una consulta medica, ej: "La mama comenta que el bebe se despierta a las 7am, toma biberon, hace una siesta a media manana, y se duerme a las 8:30pm.")
2. Click en "Generar Analisis Completo"
3. Espera 30-60 segundos

**Verificar:**
- [ ] Aparece loading state mientras analiza
- [ ] Al terminar, salta automaticamente al tab "Analisis"
- [ ] El analisis NO muestra informacion tecnica (IDs, milisegundos, "knowledge base RAG")
- [ ] Al final aparece un CTA: "Siguiente paso" con boton **"Ir al Plan"**
- [ ] Click en "Ir al Plan" navega al sub-tab "Plan"

### CHECKPOINT 18: Plan y Alimentacion

1. En el sub-tab "Plan", observa si hay un plan activo

**Verificar:**
- [ ] Si hay plan: muestra horarios (bedtime, wake, siestas, comidas)
- [ ] Las descripciones de comidas usan **grupos alimenticios** (ej: "Proteina + verdura + cereal"), NO alimentos especificos ni genericos
- [ ] Si no hay plan, se ve el gestor para crear uno

---

## PARTE 11: Patient Hub — Encuesta y Documentos

### CHECKPOINT 19: Tab Encuesta

1. Click en tab "Encuesta"

**Verificar:**
- [ ] Si el nino tiene survey completado, se ven las respuestas organizadas por seccion
- [ ] Si no tiene survey, se ve un estado vacio apropiado (no un crash)

### CHECKPOINT 20: Tab Documentos

1. Click en tab "Documentos"

**Verificar:**
- [ ] Se ve la interfaz de gestion de documentos RAG
- [ ] No hay crash al cargar el tab (puede estar vacio si no hay docs)

---

## PARTE 12: Cuestionario (Survey) como Padre

### CHECKPOINT 21: Estructura del Cuestionario

1. **Cierra sesion** del admin
2. Login como `eljulius@nebulastudios.io` / `juls0925`
3. Si hay un nino sin survey completado, entra a llenar el cuestionario
4. Si todos los ninos ya tienen survey, solo navega a la seccion de survey para verificar la estructura

**Verificar:**
- [ ] Las secciones estan organizadas por temas (Informacion Familiar, Historial, Desarrollo, Rutina, etc.)
- [ ] La seccion de **Rutina y Habitos** tiene un dia tipico estructurado con horarios
- [ ] La seccion de **Alimentacion** permite detallar: tipo de comida, horario y que come tipicamente
- [ ] Se pueden agregar/quitar items dinamicamente (siestas, comidas, tomas de leche)
- [ ] En la seccion de entorno de sueno, hay un **selector de unidad de temperatura**: C (Celsius) o F (Fahrenheit)
- [ ] Al cambiar entre C y F, el valor de temperatura se **convierte automaticamente**
- [ ] Si seleccionas F, el placeholder dice "Ej: 72" y el rango cambia a 50-104

---

## Resumen de Checkpoints

| # | Checkpoint | Area |
|---|-----------|------|
| 1 | Sidebar simplificado | Navegacion |
| 2 | Busqueda global | Header |
| 3 | Metricas dashboard | Dashboard |
| 4 | Tabs dashboard | Dashboard |
| 5 | Master-detail y tabs status | Pacientes |
| 6 | Busqueda y filtrado | Pacientes |
| 7 | Badges de status | Pacientes |
| 8 | Archivar nino | Pacientes |
| 9 | Restaurar nino | Pacientes |
| 10 | Auto-reactivacion | Pacientes |
| 11 | Patient Hub tabs | Patient Hub |
| 12 | Panel diagnostico | Diagnostico |
| 13 | Pasante AI | Diagnostico |
| 14 | Calendario eventos | Bitacora |
| 15 | Plan banner + analisis | Bitacora |
| 16 | Tabs consultas | Consultas |
| 17 | Generar analisis | Consultas |
| 18 | Plan y alimentacion | Consultas |
| 19 | Tab encuesta | Encuesta |
| 20 | Tab documentos | Documentos |
| 21 | Cuestionario como padre | Survey |

**Total: 21 checkpoints**

---

## Si Algo Falla

Anota en `QA_FEEDBACK_NOTES.md`:
1. Numero de checkpoint donde fallo
2. Que esperabas ver vs que viste
3. Screenshot si es posible
4. Si hay error en consola (F12), copia el mensaje
