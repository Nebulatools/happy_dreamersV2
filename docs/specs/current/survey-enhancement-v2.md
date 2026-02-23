# Feature: Mejora del Cuestionario para Primera Consulta

## Vision

Los padres nuevos que llegan a Happy Dreamers solo tienen el cuestionario como fuente de datos antes de su primera consulta con Mariana. Actualmente, el survey captura informacion general pero NO captura suficiente detalle sobre el patron diario real del nino (horarios de sueno, alimentacion estructurada, asociaciones de sueno).

**Problema**: Mariana llega a la primera consulta sin poder visualizar el patron real del nino. El campo "Describe un dia tipico (24 horas)" es texto libre y no se puede parsear ni alimentar al motor de diagnosticos.

**Solucion**: Reestructurar el cuestionario para capturar datos estructurados del "dia tipico" del nino, de forma que los datos alimenten el panel de diagnosticos (G1-G4) como si fueran eventos registrados. Ademas, agregar seccion de documentos medicos y opcion de "No aplica" en preguntas condicionales.

---

## Componentes del Feature

### 1. Reestructurar Step 6: Rutina de Sueno → "Dia Tipico Estructurado"

**Reemplazar** el campo de texto libre "Describe un dia tipico" con preguntas estructuradas:

#### A. Despertar por la manana
- Hora habitual de despertar (time picker)
- Despierta solo o lo despiertan? (radio: Solo / Lo despiertan)
- Despierta de buen humor? (radio: Si / No / A veces)

#### B. Siestas
- Cuantas siestas toma al dia? (number: 0-4)
- **Por cada siesta** (formulario dinamico segun cantidad):
  - A que hora empiezan a tratar de dormirlo? (time picker)
  - Como y donde lo duermen? (texto libre)
  - A que hora se duerme realmente? (time picker)
  - A que hora despierta / cuanto duerme? (time picker o duracion en minutos)

#### C. Bedtime (Hora de dormir en la noche)
- A que hora lo acuestan? (time picker)
- Que hacen para que se duerma? (texto libre - DETALLADO, campo grande)
- A que hora se duerme realmente? (time picker)

#### D. Despertares nocturnos
- Se despierta durante la noche? (radio: Si / No)
- Si si: Cuantas veces? (number: 1-10)
- **Por cada despertar** (formulario dinamico, max 3-4 detallados):
  - A que hora despierta? (time picker)
  - Que hacen para que se vuelva a dormir? (texto libre - DETALLADO)
  - A que hora se vuelve a dormir? (time picker)

#### E. Tomas nocturnas
- Tiene tomas nocturnas? (radio: Si / No)
- Si si: Cuantas? (number: 1-5)
- **Por cada toma nocturna**:
  - Cuanto come? (texto libre o ml/oz)
  - Se duerme durante la toma? (radio: Si / No / A veces)
  - Cuanto tarda en volverse a dormir? (minutos)
  - Que hacen para que duerma? (texto libre)

**Nota**: Los campos de texto libre para "que hacen para dormirlo" son criticos para Mariana. Deben ser campos textarea grandes que inviten al padre a ser detallado.

---

### 2. Mejorar Step 4: Alimentacion Estructurada

**Agregar** despues de las preguntas existentes de alimentacion:

#### A. Solidos (condicional: solo si come solidos = Si)
- Cuantas comidas solidas al dia? (number: 1-5)
- **Por cada comida** (formulario dinamico):
  - Que comida es? (radio: Desayuno / Comida / Cena / Snack)
  - A que hora? (time picker)
  - Que come tipicamente? (texto libre)

#### B. Tomas de leche/formula
- Cuantas tomas de leche al dia? (number: 0-10)
- De cuanto es cada toma? (ml u oz, con selector de unidad)
- **Por cada toma** (formulario dinamico, o al menos horarios generales):
  - A que hora? (time picker)
  - Nota: si son muchas tomas, capturar al menos las principales

**Estos datos alimentan directamente las validaciones G3 del motor de diagnosticos** (frecuencia de comidas por edad, onzas maximas, gaps entre comidas, grupos nutricionales).

---

### 3. Opcion "No Aplica" / Saltar Preguntas

- Agregar a preguntas que pueden no aplicar segun edad o contexto del nino
- Implementar como: campo vacio (dejar en blanco) en lugar de opcion explicita "N/A"
- Logica: si el padre no llena un campo opcional, se trata como "no aplica" en el diagnostico
- NO mostrar "No aplica" en los resultados del diagnostico (evitar ruido)
- Preguntas que aplican: lactancia (si el nino ya no toma pecho), siestas (si ya no duerme siesta), tomas nocturnas, etc.

---

### 4. Seccion de Documentos del Paciente

- **Ubicacion**: Dentro del perfil del paciente (vista admin), boton "+" arriba a la derecha
- **Quien sube**: Solo admin (Mariana)
- **Tipos de archivo**: PDF, JPG, PNG (estudios medicos, recetas, resultados de laboratorio)
- **UI simple**: Lista de documentos con nombre, fecha de subida, icono de tipo, boton de ver/descargar
- **Sin complejidad**: No necesita categorias, tags, ni busqueda. Solo subir, ver y eliminar.

---

## Flujo del Usuario

### Padre nuevo llenando survey:
1. Llena Steps 1-3 como actualmente (info familiar, dinamica, historial)
2. **Step 4 mejorado**: Llena info de desarrollo/salud + nueva seccion de alimentacion estructurada
3. Step 5 como actualmente (actividad fisica)
4. **Step 6 reestructurado**: En lugar de texto libre "24 horas", llena campos estructurados de despertar, siestas, bedtime, despertares nocturnos, tomas nocturnas
5. Completa y envia

### Mariana en primera consulta:
1. Abre el perfil del paciente (nino)
2. Ve el panel de diagnosticos (G1-G4) ya alimentado con datos del survey
3. G1 (Horarios): Muestra patron de sueno basado en datos estructurados del survey
4. G3 (Nutricion): Muestra patron de alimentacion basado en datos del survey
5. Puede subir documentos medicos que traiga el padre (boton "+")
6. Tiene toda la info para dar su diagnostico inicial

### Datos del survey → Diagnosticos:
- Los datos estructurados del survey se parsean y alimentan las reglas de validacion G1-G4
- NO se generan eventos visuales en el calendario
- Solo alimentan el panel de diagnosticos para la primera consulta
- Una vez que el padre empieza coaching y registra eventos reales, esos reemplazan los datos del survey

---

## UI/UX

### Step 6 reestructurado:
- Secciones colapsables: Despertar, Siestas, Bedtime, Despertares Nocturnos, Tomas Nocturnas
- Formularios dinamicos para siestas y despertares (agregar/quitar con boton "+"/"-")
- Time pickers consistentes con el resto de la app
- Campos de texto libre grandes (min 3 lineas) para "que hacen para dormirlo"
- Indicador visual de progreso dentro del step

### Step 4 alimentacion:
- Seccion condicional que aparece solo si come solidos
- Formulario dinamico para comidas (agregar/quitar)
- Selector de unidad (ml/oz) para tomas de leche

### Documentos:
- Boton "+" discreto arriba a la derecha del perfil del paciente
- Modal simple: drag & drop o seleccionar archivo
- Lista con: nombre del archivo, fecha, icono de tipo, acciones (ver/eliminar)

### Estados:
- **Loading**: Skeleton mientras carga datos del survey
- **Error**: "Error al guardar. Intenta de nuevo." (toast)
- **Exito**: "Cuestionario guardado correctamente" (toast)
- **Vacio**: Mensajes guia por seccion ("Agrega las siestas de tu hijo/a")

---

## Edge Cases

### Siestas y despertares variables:
- El padre dice "a veces 1 siesta, a veces 2" → Capturar lo MAS COMUN. Agregar nota.
- Demasiados despertares nocturnos → Limitar formulario dinamico a 5, con campo "tiene mas?"

### Nino que no come solidos (< 6 meses):
- Toda la seccion de solidos se oculta
- Solo se muestran tomas de leche

### Nino sin siestas:
- Si siestas = 0, no mostrar formulario dinamico de siestas
- Marcar como "sin siestas" en diagnostico

### Nino sin despertares nocturnos:
- Si "se despierta durante la noche" = No, saltar toda la seccion de despertares
- Lo mismo para tomas nocturnas

### Survey incompleto:
- El padre puede guardar progreso parcial y volver despues
- Los datos parciales se muestran en diagnostico con indicador de "incompleto"

### Documentos: archivo muy grande:
- Limite de 10MB por archivo
- Mensaje claro si excede: "El archivo es demasiado grande. Maximo 10MB."

---

## Alcance

### MVP (Primera version)
- [ ] Reestructurar Step 6 con campos de dia tipico (despertar, siestas, bedtime, despertares, tomas nocturnas)
- [ ] Agregar seccion de alimentacion estructurada en Step 4 (solidos + leche)
- [ ] Parsear datos del survey para alimentar panel de diagnosticos G1 y G3
- [ ] Opcion de dejar campos en blanco (no aplica implicito)
- [ ] Seccion simple de documentos en perfil del paciente (admin only)

### Diferido (Futuro)
- Generar "eventos simulados" del survey para visualizar en calendario
- Logica de skip rules avanzada por edad del nino
- Categorias y tags para documentos
- Padres pueden subir documentos desde su vista
- Comparacion visual "survey vs eventos reales" una vez que inicia coaching
- Color coding para items pendientes vs completados en el survey

---

## Exito

- Mariana puede ver el patron de sueno y alimentacion de un nino NUEVO desde la primera consulta, sin necesidad de que registren eventos
- Los padres completan el survey sin confundirse (campos claros, condicionales inteligentes)
- El panel de diagnosticos (G1-G4) muestra alertas relevantes basadas en datos del survey
- Mariana puede subir y consultar documentos medicos facilmente

---

## Notas de la Entrevista

### Contexto clave:
- Los padres nuevos NO registran eventos. Solo llenan el cuestionario.
- Mariana necesita ver el patron del nino ANTES del coaching.
- El cuestionario debe ser equivalente a "una semana de eventos registrados".
- Los campos de "que hiciste para dormirlo" son texto libre - Mariana los lee manualmente.
- Los datos del survey alimentan SOLO el diagnostico, NO generan eventos visuales.
- Los documentos son simples: subir, ver, eliminar. Sin complejidad.

### Decisiones tomadas:
- Step 6 se reestructura completamente (reemplaza texto libre con campos estructurados)
- Step 4 se extiende con alimentacion detallada
- "No aplica" se maneja dejando campos en blanco, no como opcion explicita
- Documentos solo los sube el admin (Mariana)
- MVP no incluye eventos simulados en calendario

### Trade-offs:
- Formularios dinamicos (siestas, despertares, comidas) agregan complejidad al survey pero son necesarios para capturar la variabilidad real
- Texto libre vs opciones predefinidas para "como lo duermes": se opta por texto libre porque Mariana necesita el detalle narrativo, no datos categorizados
