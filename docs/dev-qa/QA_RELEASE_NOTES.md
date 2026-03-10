# QA Release Notes — Sprint 6: Admin UX Hub + Diagnostic Pipeline

**Fecha:** 2026-02-26 (actualizado 2026-03-02)
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

## PARTE 0: Configuracion Inicial de la Base de Datos QA

> **IMPORTANTE**: Los usuarios (mariana@admin.com y eljulius@nebulastudios.io) ya existen en la BD de QA.
> Solo falta crear el nino de prueba y llenar su cuestionario. Sigue estos pasos en orden.

### Paso 0.1: Levantar la app

1. Asegurate de que el archivo `.env.local` apunte a la base de datos de QA
2. Ejecuta `npm run dev` para levantar la app en `localhost:3000`
3. Confirma que la app carga en el navegador (deberia mostrar la pantalla de login)

### Paso 0.2: Crear nino E2E TestChild

**PEGAR EN CLAUDE:**

```
Necesito crear el nino de prueba E2E TestChild directamente en MongoDB.

1. Conectate a la base de datos MongoDB usando la URI de .env.local
2. Busca el userId del padre eljulius@nebulastudios.io en la coleccion "users"
3. Crea el nino con insertOne en la coleccion "children":

db.children.insertOne({
  firstName: "E2E",
  lastName: "TestChild",
  birthDate: "2024-09-15",
  parentId: ObjectId("<parentId>"),
  createdAt: new Date(),
  updatedAt: new Date()
})

4. Luego vincula el nino al padre actualizando el array children del usuario:

db.users.updateOne(
  { _id: ObjectId("<parentId>") },
  { $addToSet: { children: ObjectId("<childId>") }, $set: { updatedAt: new Date() } }
)

5. Muestra el childId resultante — lo necesitaremos para todo el test.
```

**Verificar:**
- [ ] Se creo el nino y tienes su `childId`
- [ ] El nino tiene aproximadamente 18 meses de edad (nacido Sep 2024)

### Paso 0.3: Completar el cuestionario (survey) del nino

Este paso es **critico** — sin el survey, el diagnostico no tendra datos de contexto medico ni familiar.

**PEGAR EN CLAUDE:**

```
Necesito llenar el survey completo del nino E2E TestChild directamente en MongoDB.

1. Primero conectate a la base de datos MongoDB de este proyecto (usa la URI de .env.local)
2. Busca el childId del nino E2E TestChild en la coleccion "children"
3. Ejecuta el siguiente updateOne sobre ese documento para poblar surveyData con las 6 secciones:

db.children.updateOne(
  { _id: ObjectId("<childId>") },
  {
    $set: {
      "surveyData.informacionFamiliar": {
        "papa": {
          "nombre": "Julius",
          "edad": 35,
          "ocupacion": "Desarrollador",
          "direccion": "Av. Tecnologico 123, Monterrey",
          "ciudad": "Monterrey",
          "telefono": "81-1234-5678",
          "email": "eljulius@nebulastudios.io",
          "trabajaFueraCasa": true,
          "horaRegresoTrabajo": "18:00",
          "tieneAlergias": false
        },
        "mama": {
          "nombre": "Ana",
          "edad": 32,
          "ocupacion": "Disenadora",
          "mismaDireccionPapa": true,
          "telefono": "81-8765-4321",
          "email": "ana@test.com",
          "trabajaFueraCasa": true,
          "puedeDormir": true,
          "pensamientosNegativos": false,
          "tieneAlergias": false
        },
        "primaryCaregiver": "mother"
      },
      "surveyData.dinamicaFamiliar": {
        "otrosResidentes": "Nadie mas, solo papa y mama",
        "hijosInfo": [],
        "cantidadHijos": 0,
        "contactoPrincipal": "mama",
        "comoSupiste": "Recomendacion de pediatra",
        "librosConsultados": "Ninguno",
        "metodosContra": "Ninguno",
        "otroAsesor": false,
        "quienAtiende": "Mama durante el dia, papa en las noches"
      },
      "surveyData.historial": {
        "nombreHijo": "E2E TestChild",
        "fechaNacimiento": "2024-09-15",
        "pesoHijo": "3.2",
        "tallaHijo": "50",
        "genero": "masculino",
        "embarazoPlaneado": true,
        "problemasEmbarazo": false,
        "condicionesEmbarazo": ["ninguna"],
        "tipoParto": "vaginal",
        "complicacionesParto": false,
        "nacioTermino": true,
        "problemasNacer": false,
        "pediatra": "Dr. Rodriguez",
        "pediatraTelefono": "81-5555-0000",
        "pediatraEmail": "rodriguez@pediatra.com",
        "pediatraDescarto": true,
        "pediatraConfirma": true,
        "tratamientoMedico": false
      },
      "surveyData.desarrolloSalud": {
        "rodarMeses": 4,
        "sentarseMeses": 6,
        "gatearMeses": 8,
        "pararseMeses": 10,
        "caminarMeses": 12,
        "hijoUtiliza": "ambas",
        "alimentacion": "materna-formula",
        "alimentacionIntroduccion": 4,
        "comeSolidos": true,
        "problemasLactancia": false,
        "asesoriaLactancia": false,
        "edadAlimentacionComplementaria": 6,
        "numeroComidasSolidas": 3,
        "comidasSolidasDetalle": [
          { "tipoComida": "desayuno", "hora": "08:00", "queComeTipicamente": "Cereal con fruta" },
          { "tipoComida": "comida", "hora": "12:30", "queComeTipicamente": "Verduras con pollo" },
          { "tipoComida": "cena", "hora": "18:30", "queComeTipicamente": "Sopa o pure de verduras" }
        ],
        "numeroTomasLeche": 3,
        "cantidadPorToma": 180,
        "unidadToma": "ml",
        "tomasLecheDetalle": [
          { "hora": "07:00" },
          { "hora": "15:00" },
          { "hora": "20:00" }
        ],
        "problemasHijo": [],
        "situacionesHijo": []
      },
      "surveyData.actividadFisica": {
        "vePantallas": true,
        "pantallasDetalle": "30 minutos de videos infantiles por la tarde",
        "practicaActividad": true,
        "actividadesLista": [
          { "nombre": "Caminar en el parque", "duracionMinutos": 30 },
          { "nombre": "Juego libre en el piso", "duracionMinutos": 45 }
        ],
        "actividadesDespierto": "Juega con bloques, camina por la casa, lee cuentos con mama",
        "signosIrritabilidad": false
      },
      "surveyData.rutinaHabitos": {
        "horaDespertarManana": "07:00",
        "despiertaSolo": "si",
        "despiertaBuenHumor": "si",
        "vaKinder": false,
        "quienCuida": "Mama durante el dia",
        "quienCuidaNoche": "Ambos papas",
        "dondeDuermeSalida": "En la carriola o en brazos",
        "rutinaDormir": "Bano a las 19:30, piyama, biberon, cuento corto",
        "horaDormir": "19:30",
        "duermeSolo": false,
        "comoLograDormir": "Lo mecen en brazos y lo acuestan en la cuna cuando esta somnoliento",
        "horaAcostarBebe": "20:00",
        "queHaceParaDormir": "Toma biberon y escucha cuento, luego lo mecen",
        "horaRealDormidoNoche": "20:30",
        "tiempoDormir": "30 minutos",
        "tomaSiestas": true,
        "numeroSiestas": 1,
        "duracionTotalSiestas": "90",
        "dondeSiestas": "En la cuna de su cuarto",
        "siestasDetalle": [
          { "hora": "10:00", "duracion": 90 }
        ],
        "despiertaNoche": true,
        "vecesDespierta": 1,
        "tiempoDespierto": "15 minutos",
        "desdeCuandoDespierta": "Desde los 12 meses",
        "queHacesDespierta": "Palmaditas en la espalda hasta que se vuelve a dormir",
        "despertaresDetalle": [
          { "hora": "02:00", "duracion": 15 }
        ],
        "tieneTomasNocturnas": false,
        "oscuridadCuarto": "lamparita",
        "colorLamparita": "rojo",
        "ruidoBlanco": false,
        "temperaturaCuarto": "22",
        "humedadHabitacion": "media",
        "tipoPiyama": "Piyama de algodon manga larga",
        "usaSaco": false,
        "teQuedasHastaDuerma": true
      },
      "surveyData.completed": true,
      "surveyData.completedAt": new Date(),
      "surveyData.lastUpdated": new Date(),
      "updatedAt": new Date()
    }
  }
)

Reemplaza <childId> con el ObjectId real del nino E2E TestChild.
Confirma que el modifiedCount sea 1.
Luego verifica haciendo un findOne para confirmar que surveyData.completed === true.
```

**Verificar:**
- [ ] El comando reporto `modifiedCount: 1`
- [ ] Al entrar como admin al Patient Hub > tab "Encuesta", se ven los datos del survey

### Paso 0.4: Verificar setup completo

1. Login como **mariana@admin.com** / **password**
2. Ve a **Pacientes** en el sidebar

**Verificar:**
- [ ] Aparece E2E TestChild en la lista de pacientes
- [ ] Al hacer click en E2E TestChild, se ve su Patient Hub
- [ ] El tab "Encuesta" muestra los datos del survey que llenaste

> Una vez completado PARTE 0, tienes todo listo para empezar el test E2E.
> A partir de aqui el nino tiene: 1 survey completado, 0 eventos, 0 planes, 0 analisis AI.

---

## Credenciales

| Rol | Email | Password |
|-----|-------|----------|
| Admin | mariana@admin.com | password |
| Padre | eljulius@nebulastudios.io | juls0925 |

---

## Estado Inicial del Nino de Prueba (despues de PARTE 0)

El nino **E2E TestChild** existe en el sistema con un **cuestionario (survey) completado**.
Esto simula que los papas ya llenaron el cuestionario inicial.

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
Necesito crear 8 eventos de prueba para E2E TestChild directamente en MongoDB.

1. Conectate a la base de datos MongoDB usando la URI de .env.local
2. Busca el childId del nino E2E TestChild y el parentId (su padre) en la coleccion "children"
3. Usa la fecha de HOY para todos los eventos. Construye los timestamps en formato ISO con offset de America/Monterrey (-06:00)
4. Inserta los 8 eventos con insertMany en la coleccion "events":

db.events.insertMany([
  {
    _id: ObjectId(),
    childId: ObjectId("<childId>"),
    parentId: ObjectId("<parentId>"),
    createdBy: ObjectId("<parentId>"),
    eventType: "wake",
    emotionalState: "neutral",
    startTime: "<HOY>T07:00:00-06:00",
    endTime: "<HOY>T07:00:00-06:00",
    notes: "",
    createdAt: new Date().toISOString()
  },
  {
    _id: ObjectId(),
    childId: ObjectId("<childId>"),
    parentId: ObjectId("<parentId>"),
    createdBy: ObjectId("<parentId>"),
    eventType: "feeding",
    feedingType: "bottle",
    feedingSubtype: "bottle",
    feedingAmount: 180,
    babyState: "awake",
    isNightFeeding: false,
    feedingContext: "awake",
    startTime: "<HOY>T07:30:00-06:00",
    notes: "Biberon 6oz",
    createdAt: new Date().toISOString()
  },
  {
    _id: ObjectId(),
    childId: ObjectId("<childId>"),
    parentId: ObjectId("<parentId>"),
    createdBy: ObjectId("<parentId>"),
    eventType: "nap",
    emotionalState: "tranquilo",
    sleepDelay: 5,
    startTime: "<HOY>T10:00:00-06:00",
    endTime: "<HOY>T11:30:00-06:00",
    duration: 85,
    durationReadable: "1h 25m",
    notes: "",
    createdAt: new Date().toISOString()
  },
  {
    _id: ObjectId(),
    childId: ObjectId("<childId>"),
    parentId: ObjectId("<parentId>"),
    createdBy: ObjectId("<parentId>"),
    eventType: "feeding",
    feedingType: "solids",
    feedingSubtype: "solids",
    feedingAmount: 150,
    babyState: "awake",
    isNightFeeding: false,
    feedingContext: "awake",
    startTime: "<HOY>T12:00:00-06:00",
    notes: "Comida solida 150g",
    createdAt: new Date().toISOString()
  },
  {
    _id: ObjectId(),
    childId: ObjectId("<childId>"),
    parentId: ObjectId("<parentId>"),
    createdBy: ObjectId("<parentId>"),
    eventType: "feeding",
    feedingType: "bottle",
    feedingSubtype: "bottle",
    feedingAmount: 150,
    babyState: "awake",
    isNightFeeding: false,
    feedingContext: "awake",
    startTime: "<HOY>T15:00:00-06:00",
    notes: "Biberon 5oz",
    createdAt: new Date().toISOString()
  },
  {
    _id: ObjectId(),
    childId: ObjectId("<childId>"),
    parentId: ObjectId("<parentId>"),
    createdBy: ObjectId("<parentId>"),
    eventType: "feeding",
    feedingType: "solids",
    feedingSubtype: "solids",
    feedingAmount: 120,
    babyState: "awake",
    isNightFeeding: false,
    feedingContext: "awake",
    startTime: "<HOY>T18:00:00-06:00",
    notes: "Cena 120g",
    createdAt: new Date().toISOString()
  },
  {
    _id: ObjectId(),
    childId: ObjectId("<childId>"),
    parentId: ObjectId("<parentId>"),
    createdBy: ObjectId("<parentId>"),
    eventType: "sleep",
    emotionalState: "tranquilo",
    sleepDelay: 10,
    startTime: "<HOY>T20:30:00-06:00",
    notes: "",
    createdAt: new Date().toISOString()
  },
  {
    _id: ObjectId(),
    childId: ObjectId("<childId>"),
    parentId: ObjectId("<parentId>"),
    createdBy: ObjectId("<parentId>"),
    eventType: "night_waking",
    emotionalState: "inquieto",
    awakeDelay: 15,
    startTime: "<HOY+1>T02:00:00-06:00",
    notes: "",
    createdAt: new Date().toISOString()
  }
])

Reemplaza <childId>, <parentId>, <HOY> (formato YYYY-MM-DD de hoy) y <HOY+1> (manana, porque las 02:00 son de madrugada).
Confirma que se insertaron 8 documentos.
Muestra un resumen de los eventos creados.
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
Necesito crear un Plan v1 para E2E TestChild directamente en MongoDB.

1. Conectate a la base de datos MongoDB usando la URI de .env.local
2. Busca el childId de E2E TestChild y el userId de su padre (parentId) en la coleccion "children"
3. Busca el userId del admin mariana@admin.com en la coleccion "users"
4. Inserta el plan en la coleccion "child_plans":

db.child_plans.insertOne({
  childId: ObjectId("<childId>"),
  userId: ObjectId("<parentId>"),
  createdBy: ObjectId("<adminId>"),
  planNumber: 1,
  planVersion: "1",
  planType: "event_based",
  title: "Plan de sueno - Semana 1",
  schedule: {
    bedtime: "20:30",
    wakeTime: "07:00",
    meals: [
      { time: "07:30", type: "desayuno", description: "Cereal + fruta + lacteo" },
      { time: "12:00", type: "almuerzo", description: "Proteina + verdura + cereal" },
      { time: "15:30", type: "merienda", description: "Fruta + lacteo" },
      { time: "18:30", type: "cena", description: "Proteina + verdura + grasa saludable" }
    ],
    activities: [],
    naps: [
      { time: "10:00", duration: 90, description: "Siesta de la manana" }
    ]
  },
  objectives: [
    "Consolidar hora de dormir a las 20:30 con rutina predecible",
    "Reducir despertar nocturno gradualmente con tecnica de palmaditas",
    "Mantener siesta matutina de 90 minutos"
  ],
  recommendations: [
    "Iniciar rutina nocturna a las 19:30: bano, pijama, biberon, cuento",
    "Mantener cuarto oscuro con lamparita roja tenue",
    "En despertar nocturno, esperar 2 minutos antes de intervenir"
  ],
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date()
})

5. Confirma que el plan se inserto correctamente y muestra el planId.
```

### CHECKPOINT HUMANO 12: Plan Visible

1. Recarga la pagina del Patient Hub
2. Ve al tab Consultas -> sub-tab Plan

**Verificar:**
- [ ] Se ve el plan activo con horarios del bebe
- [ ] El plan muestra schedule con bedtime, wake time, siestas
- [ ] Las descripciones de comidas usan **combinaciones de grupos alimenticios** (ej: "Proteina + verdura + cereal"), NO alimentos especificos (ej: "Avena con platano") ni genericos (ej: "Comida balanceada")

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
| 0.2 | Crear E2E TestChild | Setup BD | |
| 0.3 | Completar survey del nino | Setup BD | |
| 0.4 | Verificar setup completo | Setup BD | |
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
