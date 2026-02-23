---
title: "feat: Enhance Survey with Structured Typical Day and Feeding Data"
type: feat
status: active
date: 2026-02-23
---

# feat: Enhance Survey with Structured Typical Day and Feeding Data

## Overview

Reestructurar el cuestionario de Happy Dreamers para capturar datos estructurados del "dia tipico" del nino (patrones de sueno y alimentacion), reemplazando el campo de texto libre actual. Los datos estructurados alimentan el motor de diagnosticos (G1/G3) para que Mariana tenga una visualizacion completa del patron del nino desde la primera consulta, sin depender de eventos registrados. Adicionalmente, agregar seccion de documentos medicos en el perfil del paciente.

## Problem Statement / Motivation

Los padres nuevos solo llenan el cuestionario antes de su primera consulta. No registran eventos hasta que inicia el coaching. Actualmente, el campo "Describe un dia tipico (24 horas)" es texto libre que Mariana lee manualmente y que NO alimenta el motor de diagnosticos. Esto deja a Mariana sin datos estructurados para su diagnostico inicial.

## Proposed Solution

4 cambios principales:

1. **Step 6 restructure**: Reemplazar `diaTipico` (texto libre) con campos estructurados de despertar, siestas, bedtime, despertares nocturnos, tomas nocturnas
2. **Step 4 enhancement**: Agregar alimentacion estructurada (solidos + leche) despues de las preguntas existentes
3. **Documents section**: Seccion simple de documentos en el perfil del paciente (admin only)
4. **Diagnostics bridge**: Actualizar `flattenSurveyData()` para derivar campos planos de los arrays estructurados

## Technical Considerations

### Architecture Impacts

- **Survey wizard** (`components/survey/SurveyWizard.tsx`): Sin cambios en la orquestacion. Solo cambian los step components y la validacion.
- **Types** (`types/models.ts`): Agregar nuevos campos a `desarrolloSalud` y `rutinaHabitos`. Todos opcionales para backward compatibility.
- **Validation** (`components/survey/validation/`): Extender para soportar arrays de objetos.
- **Diagnostics** (`app/api/admin/diagnostics/[childId]/route.ts`): Actualizar `flattenSurveyData()` para derivar campos planos desde arrays.
- **Patient Hub** (`app/dashboard/paciente/[childId]/PatientHubClient.tsx`): Agregar tab de Documentos.

### Backward Compatibility (CRITICO)

Todas las encuestas existentes tienen `diaTipico` como texto libre. La estrategia:

1. **Mantener `diaTipico`** como campo opcional "Notas adicionales" al final de Step 6
2. **Agregar campos estructurados nuevos** como opcionales
3. **NO migrar datos viejos**: Si el padre re-abre una encuesta vieja, ve los campos estructurados vacios + su texto original en "Notas adicionales"
4. **Validacion**: Remover `diaTipico` de campos requeridos. Hacer requeridos solo `horaDespertarManana` y `horaAcostarBebe` (que ya existe)
5. **localStorage stale**: Si hay datos viejos en localStorage, el merge ignora campos nuevos (quedan undefined/vacios). Sin crash.

### Storage para Documentos

**Decision: Vercel Blob Storage** - El proyecto ya esta desplegado en Vercel. Es la opcion mas simple, no requiere nuevos servicios ni credenciales complejas. Solo agregar `@vercel/blob` y la variable `BLOB_READ_WRITE_TOKEN`.

### Performance

- Los formularios dinamicos usan state local del step, no re-renderizan todo el wizard
- Los archivos tienen limite de 10MB, evitando uploads pesados
- `flattenSurveyData()` se ejecuta solo al solicitar diagnostico (no en cada page load)

### Security

- Documentos solo accesibles via admin (verificacion de rol en API)
- Archivos validados por tipo (PDF, JPG, PNG) y tamano (10MB max)
- No se exponen URLs de Vercel Blob directamente; acceso via API con auth check
- Datos de ninos protegidos bajo las mismas reglas RBAC existentes

## Field Name Contract

### Nuevos campos en `rutinaHabitos` (Step 6)

```typescript
// --- DESPERTAR ---
horaDespertarManana: string          // "07:00" - time picker
despiertaSolo: "solo" | "lo_despiertan"
despiertaBuenHumor: "si" | "no" | "a_veces"

// --- SIESTAS (mantener campos planos existentes + agregar detalle) ---
// tomaSiestas: boolean              // YA EXISTE - mantener
// numeroSiestas: string             // YA EXISTE - mantener
siestasDetalle: Array<{
  horaIntentoDomir: string           // "09:30" - time picker
  comoYDondeDuermen: string          // texto libre
  horaRealDormido: string            // "10:00" - time picker
  horaDespertoSiesta: string         // "11:00" - time picker
}>

// --- BEDTIME (mantener campos existentes + agregar detalle) ---
// horaAcostarBebe: string           // YA EXISTE - mantener
queHaceParaDormir: string            // texto libre DETALLADO
horaRealDormidoNoche: string         // "21:30" - time picker

// --- DESPERTARES NOCTURNOS (mantener campos existentes + agregar detalle) ---
// despiertaNoche: boolean           // YA EXISTE - mantener
// vecesDespierta: string            // YA EXISTE - mantener
despertaresDetalle: Array<{
  horaDespertar: string              // "02:00" - time picker
  queHaceParaDormir: string          // texto libre DETALLADO
  horaVolvioaDormir: string          // "02:45" - time picker
}>

// --- TOMAS NOCTURNAS ---
tieneTomasNocturnas: boolean
numeroTomasNocturnas: number
tomasNocturnasDetalle: Array<{
  cuantoComio: string                // texto libre o "120ml"
  seDurmioEnToma: "si" | "no" | "a_veces"
  minutosEnVolverADormir: number
  queHaceParaDormir: string          // texto libre
}>

// --- NOTAS (reemplaza diaTipico como campo requerido) ---
// diaTipico: string                 // YA EXISTE - mantener como opcional, renombrar en UI a "Notas adicionales"
```

### Nuevos campos en `desarrolloSalud` (Step 4)

```typescript
// --- SOLIDOS (condicional: comeSolidos === true) ---
numeroComidasSolidas: number         // 1-5
comidasSolidasDetalle: Array<{
  tipoComida: "desayuno" | "comida" | "cena" | "snack"
  hora: string                       // "08:00" - time picker
  queComeTipicamente: string         // texto libre
}>

// --- LECHE/FORMULA ---
numeroTomasLeche: number             // 0-10
cantidadPorToma: number              // en ml
unidadToma: "ml" | "oz"             // selector de unidad
tomasLecheDetalle: Array<{
  hora: string                       // "06:00" - time picker
}>
```

### Derivacion en `flattenSurveyData()`

```typescript
// Derivar campos planos para G1/G3 desde arrays:
if (flat.siestasDetalle?.length) {
  flat.numeroSiestas = String(flat.siestasDetalle.length)
  flat.tomaSiestas = true
}
if (flat.comidasSolidasDetalle?.length) {
  flat.numeroComidasSolidas = flat.comidasSolidasDetalle.length
}
if (flat.tomasLecheDetalle?.length) {
  flat.numeroTomasLeche = flat.tomasLecheDetalle.length
}
```

## Acceptance Criteria

### Functional Requirements

- [ ] Step 6 muestra campos estructurados: despertar (hora, solo/despertaron, humor), siestas (dinamico), bedtime (hora acostaron, que hicieron, hora real), despertares nocturnos (dinamico), tomas nocturnas (dinamico)
- [ ] Step 4 muestra alimentacion estructurada: solidos (condicional, dinamico) y tomas de leche (dinamico)
- [ ] Formularios dinamicos permiten agregar/quitar items (max 4 siestas, max 5 despertares, max 5 tomas nocturnas, max 5 comidas solidas, max 10 tomas leche)
- [ ] Campos de texto libre para "que hiciste para dormirlo" son textarea grandes (min 3 lineas)
- [ ] Campos opcionales pueden dejarse en blanco sin bloquear navegacion
- [ ] Panel de diagnosticos G1 muestra datos de sueno del survey cuando no hay eventos registrados
- [ ] Panel de diagnosticos G3 muestra datos de alimentacion del survey cuando no hay eventos registrados
- [ ] Admin puede subir documentos (PDF, JPG, PNG, max 10MB) en perfil del paciente
- [ ] Admin puede ver lista de documentos y eliminarlos
- [ ] Encuestas existentes con `diaTipico` texto se muestran correctamente (texto en "Notas adicionales", campos estructurados vacios)

### Non-Functional Requirements

- [ ] Responsive en mobile (formularios dinamicos no se desbordan)
- [ ] Auto-save a localStorage funciona con los nuevos campos
- [ ] Sin breaking changes en encuestas existentes completadas
- [ ] Time pickers consistentes con el resto de la app (input type="time")

## Dependencies & Risks

| Riesgo | Probabilidad | Impacto | Mitigacion |
|--------|-------------|---------|------------|
| localStorage stale con schema viejo | Alta | Bajo | Merge shallow preserva datos viejos, campos nuevos quedan undefined |
| Validacion de arrays no soportada | Alta | Medio | Extender validators.ts antes de implementar steps |
| Vercel Blob requiere token | Baja | Alto | Agregar `BLOB_READ_WRITE_TOKEN` a env vars |
| Step 6 demasiado largo con todo el detalle | Media | Medio | Usar secciones colapsables |
| Campos planos de G1/G3 se rompen | Media | Alto | Mantener campos existentes Y agregar arrays. Derivar en flattenSurveyData() |

## Implementation Plan

### Phase 1: Foundation (Types + Validation + Component Shared)

**Objetivo**: Preparar la base para los cambios en los steps.

#### Task 1.1: Actualizar SurveyData types
- **Archivo**: `types/models.ts`
- **Cambios**: Agregar nuevos campos opcionales a `desarrolloSalud` y `rutinaHabitos`
- **Criterio**: TypeScript compila sin errores, campos existentes intactos

#### Task 1.2: Crear componente DynamicListField
- **Archivo nuevo**: `components/survey/DynamicListField.tsx`
- **Patron**: Basado en `SiblingsList.tsx`, generalizado para naps/wakings/feedings
- **Props**: `items`, `onAdd`, `onRemove`, `onChange`, `maxItems`, `renderItem`, `addLabel`
- **Criterio**: Componente reutilizable que maneja add/remove con animacion simple

#### Task 1.3: Extender validacion para arrays
- **Archivos**: `components/survey/validation/schemas.ts`, `components/survey/validation/validators.ts`
- **Cambios**: Soporte para validar arrays de objetos, actualizar schema de Step 6 (remover `diaTipico` como requerido)
- **Criterio**: validateStep funciona con campos array

### Phase 2: Step 4 - Alimentacion Estructurada

**Objetivo**: Agregar preguntas de alimentacion detallada.

#### Task 2.1: Implementar seccion de solidos en HealthDevStep
- **Archivo**: `components/survey/steps/HealthDevStep.tsx`
- **Ubicacion**: Despues de `edadAlimentacionComplementaria` (linea ~355)
- **Campos**: numeroComidasSolidas, comidasSolidasDetalle (dinamico)
- **Condicional**: Solo visible si `comeSolidos === true`
- **Criterio**: Padre puede agregar 1-5 comidas solidas con tipo, hora y descripcion

#### Task 2.2: Implementar seccion de tomas de leche en HealthDevStep
- **Archivo**: `components/survey/steps/HealthDevStep.tsx`
- **Ubicacion**: Despues de la seccion de solidos
- **Campos**: numeroTomasLeche, cantidadPorToma, unidadToma, tomasLecheDetalle (dinamico)
- **Criterio**: Padre puede agregar tomas de leche con hora y cantidad

### Phase 3: Step 6 - Dia Tipico Estructurado

**Objetivo**: Reestructurar el step completo.

#### Task 3.1: Implementar seccion Despertar
- **Archivo**: `components/survey/steps/RoutineHabitsStep.tsx`
- **Cambios**: Reemplazar `diaTipico` textarea por campos estructurados de despertar
- **Campos**: horaDespertarManana, despiertaSolo, despiertaBuenHumor
- **Criterio**: Campos funcionales con time picker

#### Task 3.2: Implementar seccion Siestas (dinamica)
- **Archivo**: `components/survey/steps/RoutineHabitsStep.tsx`
- **Cambios**: Integrar con campos existentes `tomaSiestas`/`numeroSiestas` + agregar `siestasDetalle`
- **Usa**: DynamicListField de Task 1.2
- **Campos por siesta**: horaIntentoDomir, comoYDondeDuermen, horaRealDormido, horaDespertoSiesta
- **Max**: 4 siestas
- **Criterio**: Formulario dinamico funcional, condicional a `tomaSiestas === true`

#### Task 3.3: Implementar seccion Bedtime detallada
- **Archivo**: `components/survey/steps/RoutineHabitsStep.tsx`
- **Cambios**: Agregar campos de detalle al bedtime existente
- **Campos**: queHaceParaDormir (textarea grande), horaRealDormidoNoche
- **Criterio**: Campo textarea invita al padre a ser detallado

#### Task 3.4: Implementar seccion Despertares Nocturnos (dinamica)
- **Archivo**: `components/survey/steps/RoutineHabitsStep.tsx`
- **Cambios**: Integrar con campos existentes `despiertaNoche`/`vecesDespierta` + agregar `despertaresDetalle`
- **Usa**: DynamicListField
- **Campos por despertar**: horaDespertar, queHaceParaDormir (textarea), horaVolvioaDormir
- **Max**: 5 despertares
- **Criterio**: Formulario dinamico condicional a `despiertaNoche === true`

#### Task 3.5: Implementar seccion Tomas Nocturnas (dinamica)
- **Archivo**: `components/survey/steps/RoutineHabitsStep.tsx`
- **Cambios**: Agregar nueva seccion de tomas nocturnas
- **Campos**: tieneTomasNocturnas, tomasNocturnasDetalle (cuantoComio, seDurmioEnToma, minutosEnVolverADormir, queHaceParaDormir)
- **Max**: 5 tomas
- **Criterio**: Formulario dinamico condicional

#### Task 3.6: Reorganizar Step 6 con secciones colapsables
- **Archivo**: `components/survey/steps/RoutineHabitsStep.tsx`
- **Cambios**: Organizar en secciones colapsables: Despertar | Siestas | Bedtime | Despertares Nocturnos | Tomas Nocturnas | Ambiente (existente) | Otros (existente)
- **Mover `diaTipico`** al final como "Notas adicionales sobre el dia tipico" (opcional)
- **Criterio**: Step 6 es navegable sin scroll infinito

### Phase 4: Diagnostics Bridge

**Objetivo**: Los datos nuevos alimentan G1/G3.

#### Task 4.1: Actualizar flattenSurveyData()
- **Archivo**: `app/api/admin/diagnostics/[childId]/route.ts`
- **Cambios**: Agregar logica de derivacion que genere campos planos desde arrays estructurados
- **Mapeo**: `siestasDetalle.length → numeroSiestas`, `comidasSolidasDetalle.length → numeroComidasSolidas`, etc.
- **Criterio**: G1 y G3 reciben datos como si fueran los campos planos existentes

#### Task 4.2: Agregar reglas G3 para nuevos campos de alimentacion
- **Archivo**: `lib/diagnostic/rules/nutrition-rules.ts`
- **Cambios**: Nuevas validaciones que usen `numeroComidasSolidas`, `numeroTomasLeche`, `cantidadPorToma` del survey
- **Criterio**: G3 genera alertas de nutricion basadas en datos del survey cuando no hay eventos

#### Task 4.3: Verificar reglas G1 con nuevos campos de sueno
- **Archivo**: `lib/diagnostic/rules/schedule-rules.ts`
- **Cambios**: Verificar que `horaDespertarManana` se mapee a `horaDespertar` en flatten, o agregar fallback
- **Criterio**: G1 muestra datos de sueno del survey correctamente

### Phase 5: Documentos del Paciente

**Objetivo**: Seccion simple de upload en perfil admin.

#### Task 5.1: Instalar dependencia y configurar Vercel Blob
- **Cambios**: `npm install @vercel/blob`, agregar `BLOB_READ_WRITE_TOKEN` a .env.local
- **Criterio**: Blob storage accesible

#### Task 5.2: Crear API de documentos
- **Archivo nuevo**: `app/api/children/[id]/documents/route.ts`
- **Endpoints**:
  - `GET` - listar documentos del nino
  - `POST` - subir documento (formData, solo admin)
  - `DELETE` - eliminar documento (solo admin)
- **Coleccion MongoDB**: `childDocuments` (childId, fileName, fileUrl, fileType, fileSize, uploadedBy, uploadedAt)
- **Criterio**: CRUD funcional con validacion de rol admin

#### Task 5.3: Crear tab Documentos en Patient Hub
- **Archivo nuevo**: `app/dashboard/paciente/[childId]/tabs/DocumentosTab.tsx`
- **Cambios en**: `PatientHubClient.tsx` (agregar tab al array TABS)
- **UI**: Lista de documentos + boton "+" arriba a la derecha + modal de upload (drag & drop o seleccionar)
- **Criterio**: Admin puede subir, ver y eliminar documentos

### Phase 6: QA y Polish

#### Task 6.1: Verificar backward compatibility
- Abrir encuesta existente con datos viejos, confirmar que no se rompe
- Verificar que localStorage stale no causa crash
- Confirmar que SurveyEditModal funciona con nuevos campos

#### Task 6.2: Verificar responsive en mobile
- Step 4 y Step 6 con formularios dinamicos en pantalla pequena
- Documentos tab en mobile

#### Task 6.3: Verificar flujo completo
- Padre nuevo llena survey completo con datos estructurados
- Admin ve diagnostico alimentado por datos del survey
- Admin sube documento en perfil del paciente

## System-Wide Impact

### Interaction Graph
1. Padre llena survey → `POST /api/survey` → `children.surveyData` actualizado
2. Admin pide diagnostico → `GET /api/admin/diagnostics/[childId]` → `flattenSurveyData()` → G1/G3 rules leen campos planos
3. Admin sube documento → `POST /api/children/[id]/documents` → Vercel Blob + MongoDB metadata

### Error Propagation
- Survey save falla → toast "Error al guardar" + datos preservados en localStorage
- Documento muy grande → validacion client-side (10MB) + server-side → toast de error
- Blob upload falla → API retorna 500 → toast "Error al subir documento"

### State Lifecycle Risks
- **localStorage stale**: Merge shallow, campos nuevos quedan undefined. Sin crash.
- **Survey parcial guardada**: `isPartialSave: true` preserva data, campos vacios son normales.
- **Documento huerfano**: Si metadata se guarda pero Blob falla (o viceversa), limpiar en catch.

## References & Research

### Internal References
- Survey wizard: `components/survey/SurveyWizard.tsx`
- Step 4: `components/survey/steps/HealthDevStep.tsx`
- Step 6: `components/survey/steps/RoutineHabitsStep.tsx`
- Types: `types/models.ts:161-354`
- Validation: `components/survey/validation/schemas.ts`
- Dynamic list pattern: `components/survey/SiblingsList.tsx`
- Diagnostics flatten: `app/api/admin/diagnostics/[childId]/route.ts`
- G1 rules: `lib/diagnostic/rules/schedule-rules.ts`
- G3 rules: `lib/diagnostic/rules/nutrition-rules.ts`
- Patient Hub: `app/dashboard/paciente/[childId]/PatientHubClient.tsx`
- File upload pattern: `app/api/rag/upload/route.ts`
- Survey API: `app/api/survey/route.ts`
- Survey edit API: `app/api/children/[id]/survey/route.ts`

### Institutional Learnings
- UTC date bug: Usar `buildLocalDate()` para time pickers (`lib/datetime.ts`)
- Event type duplication: NO crear tipos nuevos, usar flags
- useSession crash: Usar server component para auth gating en paginas nuevas

### Spec Document
- `docs/specs/current/survey-enhancement-v2.md`
