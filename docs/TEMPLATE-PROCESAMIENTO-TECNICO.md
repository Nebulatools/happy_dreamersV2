# Template de Procesamiento Tecnico - Claude

Este documento define el proceso que Claude debe seguir cuando recibe un Documento de Sprint del PM.

---

## Principio Fundamental

> **NO ASUMIR. PREGUNTAR PRIMERO.**

El documento viene de alguien que no es tecnico. Puede tener ambiguedades, informacion incompleta, o descripciones que pueden interpretarse de multiples formas.

**Antes de investigar codigo, Claude DEBE hacer una entrevista de validacion.**

---

## Proceso de 4 Fases

### FASE A: Lectura y Comprension

**Objetivo:** Entender el documento sin tomar acciones

1. Leer el documento completo de principio a fin
2. Identificar cuantos items hay
3. Para cada item, anotar mentalmente:
   - ¿Entiendo el problema?
   - ¿Se donde buscar en el codigo?
   - ¿Hay algo ambiguo o que pueda interpretarse de varias formas?

**Output:** Lista de dudas y ambiguedades

---

### FASE B: Entrevista de Validacion (CRITICO)

**Objetivo:** Aclarar TODAS las dudas antes de tocar codigo

Claude usa `AskUserQuestion` para hacer preguntas estructuradas.
**NO hay limite de rondas.** Claude pregunta hasta que no tenga dudas.

#### Ronda 1: Confirmacion de Alcance

Preguntas tipicas:
- "Veo X items en el documento. ¿Todos son para este sprint o hay prioridades?"
- "El item 3 menciona [cosa]. ¿Esto afecta tambien a [otra cosa relacionada]?"
- "¿Hay algun item que sea bloqueante para los demas?"

#### Ronda 2: Clarificacion por Item

Para cada item con ambiguedad:
- "En el item sobre [titulo], cuando dices [frase del PM] te refieres a [opcion A] o [opcion B]?"
- "La descripcion menciona [pantalla]. ¿Es la misma que [otra pantalla similar]?"
- "El criterio de exito dice [X]. ¿Hay algun caso especial que deba considerar?"

#### Ronda 3+: Solicitud de Imagenes

Si la descripcion de Gemini no es suficiente:
- "La descripcion del item 2 menciona un tooltip cortado, pero no tengo claro en que parte de la pantalla. ¿Puedes enviarme la captura original?"
- "Necesito ver la imagen del item 4 para entender la disposicion de los elementos."

**Nota:** El usuario puede enviar imagenes. Claude es multimodal y puede analizarlas.

#### Ronda Final: Validacion de Entendimiento

Antes de investigar codigo:
- "Dejame confirmar lo que entendi de cada item: [resumen estructurado]"
- "¿Hay algo que no mencione que sea importante?"
- "¿Estamos listos para que investigue el codigo?"

---

### FASE C: Investigacion Tecnica

**Objetivo:** Encontrar donde implementar los cambios

**SOLO SE EJECUTA DESPUES DE LA FASE B**

1. **Buscar archivos relacionados** basandose en:
   - Descripciones de UI (nombres de pantallas, botones, textos)
   - Flujos de usuario mencionados
   - Componentes visuales descritos en las imagenes

2. **Trazar rutas de codigo:**
   - ¿Que componentes renderizan esta UI?
   - ¿Que API endpoints se llaman?
   - ¿Que logica de negocio esta involucrada?

3. **Identificar dependencias:**
   - ¿Este cambio afecta otros componentes?
   - ¿Hay tests que deban actualizarse?
   - ¿Hay conflictos con otros items del sprint?

**Output:** Mapa de archivos afectados por cada item

---

### FASE D: Propuesta Tecnica

**Objetivo:** Presentar plan de implementacion para aprobacion

Para cada item, documentar:

1. **Archivos a modificar:**
   ```
   Item 1: Tooltip cortado
   - components/calendar/EventGlobe.tsx (lineas ~45-80)
   - Razon: Aqui se renderiza el tooltip
   ```

2. **Complejidad estimada:**
   - Simple (< 1 hora)
   - Media (1-4 horas)
   - Compleja (4+ horas)

3. **Riesgos identificados:**
   - "Este cambio podria afectar tambien a [otro componente]"
   - "Necesitamos verificar en [dispositivo/resolucion]"

4. **Orden de implementacion sugerido:**
   - Dependencias entre items
   - Que hacer primero

**Output:** Plan tecnico estructurado para aprobacion del usuario

---

## Ejemplo Completo de Entrevista

```
USUARIO: [Pega documento de sprint con 4 items]

CLAUDE: Recibi el documento de sprint. Veo 4 items. Antes de investigar
el codigo, necesito aclarar algunos puntos:

**Pregunta 1 - Alcance:**
¿Todos los items son para este sprint o hay alguno que pueda esperar?

USUARIO: Todos son para este sprint, pero el item 2 es el mas urgente.

CLAUDE: Entendido, priorizare el item 2. Ahora sobre detalles especificos:

**Pregunta 2 - Item 2 (Tooltip cortado):**
La descripcion dice "el tooltip se sale de la pantalla".
¿Esto pasa:
- Solo en eventos de la manana (lado izquierdo)?
- Solo en eventos de la noche (lado derecho)?
- En todos los eventos?

USUARIO: Solo en eventos que estan muy a la derecha de la pantalla.

CLAUDE: Perfecto. ¿Tienes la captura original? La descripcion de Gemini
dice "esquina superior izquierda" pero mencionas que pasa a la derecha.
Quiero asegurarme de entender correctamente.

USUARIO: [Sube imagen]

CLAUDE: Ahora veo claramente. El evento esta en la columna del domingo
(extremo derecho) y el tooltip se abre hacia la derecha, saliendose
del viewport.

**Pregunta 3 - Item 4 (Iconos de alimentacion):**
Mencionan "separar liquidos de solidos". ¿Los usuarios ya registran
esta diferencia o es funcionalidad nueva?

USUARIO: Ya existe en el formulario, pero visualmente se ve igual.
Queremos iconos diferentes.

CLAUDE: Entendido. Entonces el cambio es solo visual (iconos diferentes),
no en la logica de registro.

**Confirmacion final:**
Dejame resumir lo que entendi:
1. Item 1: [resumen]
2. Item 2: Tooltip se sale a la derecha, solucion: posicionarlo arriba o izquierda
3. Item 3: [resumen]
4. Item 4: Cambio visual de iconos, liquidos vs solidos

¿Es correcto? ¿Puedo investigar el codigo?

USUARIO: Si, correcto. Adelante.

CLAUDE: [Ahora procede a FASE C - Investigacion Tecnica]
```

---

## Checklist de Procesamiento

Antes de empezar a implementar, verificar:

- [ ] Lei el documento completo
- [ ] Identifique todas las ambiguedades
- [ ] Hice preguntas de alcance
- [ ] Aclare cada item dudoso
- [ ] Solicite imagenes si fueron necesarias
- [ ] Resumi mi entendimiento y el usuario confirmo
- [ ] Investigue archivos relevantes
- [ ] Presente plan tecnico
- [ ] Usuario aprobo el plan

---

## Errores Comunes a Evitar

1. **Asumir ubicacion de codigo**
   - MAL: "El calendario esta en components/calendar/"
   - BIEN: Preguntar y luego verificar con Grep/Glob

2. **Asumir alcance**
   - MAL: "Este cambio solo afecta esta pantalla"
   - BIEN: "¿Este cambio debe aplicarse tambien a [pantalla similar]?"

3. **Asumir prioridad**
   - MAL: Empezar por el primer item
   - BIEN: Preguntar cual es mas urgente

4. **No pedir imagenes**
   - MAL: Trabajar solo con descripcion textual ambigua
   - BIEN: "Puedes enviarme la captura para confirmar?"

5. **Investigar codigo antes de aclarar**
   - MAL: Buscar archivos inmediatamente
   - BIEN: Entrevista completa → Confirmacion → Investigacion

---

## Integracion con CLAUDE.md

Este proceso debe seguirse SIEMPRE que se reciba un documento de sprint.
Es parte del workflow estandar definido en CLAUDE.md:

```
SESSION-CONTEXT.md → Documento de Sprint → Entrevista → Plan → Implementacion
```
