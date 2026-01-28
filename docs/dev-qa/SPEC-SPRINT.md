# ESPECIFICACIÓN TÉCNICA: ÍTEM 4 - PANEL DE DIAGNÓSTICO (ESTADÍSTICAS)

## Vision

Este módulo no es solo un visualizador de gráficas; es un **motor de validación** que cruza la bitácora en tiempo real con las respuestas del cuestionario y las reglas de salud de Happy Dreamers.

**Audiencia:** Solo Admin (Mariana). Los padres NO deben ver este panel.

**Ubicación:** Dashboard Admin > Estadísticas de Sueño

---

## Visibilidad por Rol

| Componente | Admin | Padres | Ubicación |
|------------|-------|--------|-----------|
| Tarjeta Info Paciente (Médica) | Sí | No | Dashboard Admin > Estadísticas |
| Semáforo G1-G4 (Alertas) | Sí | No | Dashboard Admin > Estadísticas |
| Resumen "Pasante AI" | Sí | No | Dashboard Admin > Estadísticas |
| Acciones de Planes (Edit/AI) | Sí | No | Dashboard Admin > Estadísticas |
| Bitácora Narrativa (Sin Alertas) | Sí | Sí | Admin (Bitácora Diaria) / Padres (Home) |

**Importante para Front-end:** Aunque el Ítem 1 (Narrativa) es compartido, en la vista de Mariana, los eventos narrativos deben poder mostrar el **badge de alerta rojo** si el motor de validación del Ítem 4 detecta un fallo (ej. despertar fuera del margen de X min).

---

## 1. Cabecera: Perfil Clínico del Paciente

Ubicada en el `top` de la pantalla de estadísticas. Debe servir para contextualizar el análisis de Mariana.

### Componente

Tarjeta de información persistente.

### Campos Requeridos

**Generales:**
- Nombre del niño
- Edad actual (meses/años)
- Nombres de los padres y edades
- Número de hermanos y sus edades

**Status:**
- Plan vigente
- Etapa actual del proceso

**Alertas Críticas (Banderas):**
Mostrar resaltados los antecedentes médicos:
- Alergias
- Reflujo/Cólicos
- Ferritina
- Temas de Neuro-desarrollo

---

## 2. Los 4 Grupos de Control (Semaforización)

Implementar 4 tarjetas de resumen que actúen como **indicadores de salud del plan**. Cada una tiene una lógica de validación distinta basada en el Google Sheet provisto y las pizarras.

### Grupo 1: Horario (Schedule)

**Fuente de datos:** Eventos de Sueño en la Bitácora.

**Lógica de validación:**

1. **Desvío de Despertar:** Si `hora_despertar_real` se desvía más de X min de la `hora_meta`, marcar alerta.

2. **Límite Inferior:** Si el despertar ocurre **antes de las 06:00 AM**, marcar alerta.

3. **Correlación de Sueño:** Validar la regla: si el niño despierta a las 06:30 AM, su hora de dormir no debe exceder las 19:30 PM para mantener el ciclo.

4. **Ventanas de Sueño:** Comparar la duración de las ventanas de vigilia registradas contra los parámetros ideales por edad.

---

### Grupo 2: Médico

**Fuente de datos:** Cuestionario (Respuestas con Grupo = 2).

**Lógica de validación:**

- Consultar la columna **"Condición"** del Spreadsheet. Ejemplo: Si la respuesta a "Ronca" es "Sí", activar alerta.

- **Caducidad:** Verificar la fecha de respuesta. Si el dato es de una etapa anterior o tiene más de 30 días, marcar como "Dato por actualizar".

---

### Grupo 3: Alimentación

**Fuente de datos:** Bitácora de Sólidos + Cuestionario (Grupo = 3).

**Lógica de validación:**

1. **Cumplimiento Nutricional:** Verificar que en el registro diario existan los 4 grupos:
   - Proteína (Animal/Vegetal)
   - Grasa
   - Cereal
   - Fibra

2. **Estructura de Snacks:** El sistema debe validar que los snacks (ej. 9:00 AM) incluyan Cereal + Grasa + Fibra.

3. **Lactancia:** Validar si el tipo (Pecho/Biberón) corresponde a lo recomendado por edad.

---

### Grupo 4: Ambiental / Emocional

**Fuente de datos:** Cuestionario (Grupo = 4).

**Lógica de validación:**

Evaluar variables de entorno según las condiciones del Spreadsheet:
- Temperatura
- Uso de pantallas
- Depresión post-parto
- Dinámica familiar

---

## 3. Comportamiento de Alertas (UX para Mariana)

### Visual

Si una sola condición dentro de un grupo falla, la tarjeta del grupo debe mostrar un **indicador rojo**.

### Interacción (Deep Linking)

- Al hacer clic en el indicador rojo, se abre un desglose de los **Criterios Fuera de Control**.

- Cada criterio debe tener un link directo que lleve a Mariana a:
  - La respuesta específica en el cuestionario, O
  - El evento exacto en la bitácora que disparó la alerta

---

## 4. El "Pasante AI" (Resumen Ejecutivo)

Motor de procesamiento de lenguaje natural (LLM) que debe recibir como input:
- JSON del perfil
- Alertas de los 4 grupos
- Eventos de los últimos 7 días

### Misión

Entregar un resumen que contextualice la falla.

### Lógica

- Si no hay eventos de bitácora, la IA analiza solo el cuestionario.
- Si hay eventos, los interpreta dentro del contexto del cuestionario.
  - Ejemplo: "El niño despierta temprano porque se detectó reflujo en el cuestionario médico".

### Restricción

El resumen debe ser informativo para Mariana, **no debe dar recomendaciones médicas directas**.

---

## 5. Cierre del Ciclo: Gestión de Planes

Al final de la pantalla de Estadísticas, habilitar dos triggers de acción (CTAs contextuales).

**Ubicación:** Estos botones aparecen justo al final, después de que Mariana ha leído el análisis del "Pasante AI". La idea es que Mariana no tenga que salir de la pantalla de Estadísticas para tomar una decisión tras ver el diagnóstico.

### Acción Manual (Editar)

**Botón "Editar Plan Actual"**

- Acceso directo que redirige a Mariana al editor del plan que el niño tiene activo en ese momento.
- Permite hacer ajustes manuales basándose en el análisis.

### Acción AI (Generar)

**Botón "Generar Nuevo Plan (AI)"**

- Trigger para que la IA proponga un **Plan v2.0**.
- La IA debe comparar los avances entre el plan anterior y los datos actuales para proponer el ajuste de etapa.

### Contexto en el Dashboard

Aunque en el menú lateral existe la sección general de "Planes", estos botones en la vista de Estadísticas son **atajos contextuales** para cerrar el ciclo de auditoría del niño que se está consultando.

### Flujo de Uso

1. Mariana entra a **Estadísticas**.
2. Revisa el **Semáforo G1-G4** y el **Pasante AI**.
3. **Al final de esa misma página**, encuentra los botones para actuar sobre el plan.

---

## Arquitectura de Datos Sugerida

### Colecciones Involucradas

| Colección | Uso en Ítem 4 |
|-----------|---------------|
| `children` | Perfil clínico, surveyData |
| `events` | Bitácora para validaciones G1 y G3 |
| `childPlans` | Plan vigente, versiones |
| `users` | Datos de padres |

### Estructura de Validación (Propuesta)

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
  sourceType: 'survey' | 'event' | 'calculated'
  sourceId?: string  // Para deep linking
}

interface Alert {
  group: 'g1' | 'g2' | 'g3' | 'g4'
  criterion: string
  message: string
  deepLink: {
    type: 'survey' | 'event'
    id: string
    field?: string
  }
}
```

---

## Endpoints API Sugeridos

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/admin/diagnostics/[childId]` | GET | Obtener diagnóstico completo |
| `/api/admin/diagnostics/[childId]/validate` | POST | Forzar revalidación |
| `/api/admin/diagnostics/[childId]/ai-summary` | POST | Generar resumen AI |

---

## Siguiente Paso

Definir los validadores específicos para cada criterio de los grupos G1-G4, basándose en el Google Sheet de reglas de Happy Dreamers.
