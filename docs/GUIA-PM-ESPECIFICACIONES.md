# Guia para el PM: Captura de Especificaciones con Gemini

Esta guia explica como documentar problemas y necesidades de usuarios usando Gemini, para que el equipo tecnico pueda implementar los cambios correctamente.

---

## Resumen del Flujo

```
Tu (PM) recibes feedback → Chateas con Gemini → Documento de Sprint → Equipo tecnico
```

**Tu responsabilidad:** Capturar QUE quieren los usuarios
**Responsabilidad del equipo tecnico:** Decidir COMO implementarlo

---

## Paso 1: Configurar tu Gem en Gemini

1. Ve a [gemini.google.com](https://gemini.google.com)
2. Haz clic en "Gems" en el menu lateral
3. Crea un nuevo Gem llamado "Especificaciones de Sprint"
4. Copia TODO el contenido del archivo `PROMPT-GEMINI-SPRINT.md`
5. Pegalo en las instrucciones del Gem
6. Guarda el Gem

**Nota:** Solo necesitas hacer esto una vez. El Gem recuerda las instrucciones.

---

## Paso 2: Usar el Gem Durante la Semana

### Cuando recibas feedback de un usuario:

1. Abre tu Gem "Especificaciones de Sprint"
2. Escribe "nuevo item"
3. Cuenta lo que te dijeron (puede ser vago, Gemini te ayudara a aclarar)
4. Responde las preguntas de Gemini
5. Si tienes capturas de pantalla, subilas

### Ejemplo de conversacion:

```
TU: nuevo item

GEMINI: Perfecto, cuéntame qué problema o necesidad quieres documentar.

TU: Los papas dicen que cuando registran algo a las 2am aparece mal

GEMINI: Entiendo que hay un problema con eventos registrados en la madrugada.
Ayúdame a entender mejor:
1. ¿Qué significa "aparece mal"? ¿Aparece en el día incorrecto? ¿No aparece?
   ¿Se ve diferente?

TU: Aparece en el dia equivocado. Lo registran el sabado a las 2am pero
esperan verlo en el viernes

GEMINI: Ahora entiendo. El evento de las 2am del sábado aparece en la columna
del sábado, pero el usuario espera verlo en el viernes porque considera que
esa madrugada es "parte de la noche del viernes".

Antes de documentarlo, necesito saber:
1. ¿Esto afecta a todos los usuarios o solo algunos?
2. ¿Qué tan urgente es? (1-5)

[...continúa hasta completar]
```

---

## Paso 3: Agregar Capturas de Pantalla

Cuando tengas una captura que muestre el problema:

1. Sube la imagen al chat con Gemini
2. Explica brevemente qué muestra
3. Gemini la analizara y te hara preguntas

**Importante:** Gemini describira la imagen en detalle. Esta descripcion es crucial porque el equipo tecnico NO vera la imagen, solo la descripcion.

### Que incluir en la captura:
- La pantalla completa (no solo un pedazo)
- El problema visible si es posible
- El contexto de navegacion (menu, tabs, etc.)

### Ejemplo:

```
TU: [sube imagen]
Esta es la pantalla del calendario donde aparece el problema

GEMINI: Analicé la captura. Veo:
- Pantalla: Calendario en vista semanal
- Encabezado: "Semana del 6 al 12 de Enero"
- Columnas: Lun, Mar, Mie, Jue, Vie, Sab, Dom
- En la columna del Sábado hay un evento a las 02:00 con ícono morado
- El usuario esperaba ver este evento en la columna del Viernes

¿Es correcta mi interpretación?
```

---

## Paso 4: Revisar el Documento

En cualquier momento puedes decir:

- **"ver documento"** → Te muestra todo lo que llevas documentado
- **"revisar item 3"** → Editar un item especifico
- **"eliminar item 2"** → Quitar algo que ya no aplica

### Cuándo revisar:
- Al final de cada dia (opcional)
- Antes de agregar items relacionados
- Al final de la semana (obligatorio)

---

## Paso 5: Generar Documento Final

Cuando termines la semana:

1. Di **"listo para entregar"**
2. Gemini genera el documento formateado
3. Revisa que todo este correcto
4. Copia el documento y envialo al equipo tecnico

### El documento incluira:
- Resumen ejecutivo
- Cada item con:
  - Descripcion del problema
  - Pasos para reproducirlo
  - Que espera el usuario vs que pasa
  - Casos especiales
  - Criterio de exito
  - Descripciones de imagenes (si hay)

---

## Tips para Documentar Mejor

### DO (Hacer):
- Describe lo que el usuario VE y HACE
- Incluye citas textuales de usuarios cuando puedas
- Sube capturas de pantalla siempre que sea posible
- Menciona si el problema es frecuente o raro
- Indica la prioridad basada en impacto al usuario

### DON'T (No hacer):
- No intentes proponer soluciones tecnicas
- No uses terminos como "API", "base de datos", "backend"
- No asumas que el equipo sabe el contexto
- No combines multiples problemas en un solo item

### Ejemplo bueno:
> "Cuando el papa toca el boton azul de 'Guardar', la pantalla se queda
> cargando por 30 segundos y luego muestra un error rojo que dice
> 'Error de conexion'. Esto le paso a Maria 3 veces ayer."

### Ejemplo malo:
> "El API esta fallando y hay que revisar el endpoint de eventos"

---

## Flujo Semanal Recomendado

```
Lunes-Jueves:
  └── Recibes feedback → Lo agregas al Gem → Sigues con tu dia

Viernes:
  ├── Di "ver documento" y revisa todo
  ├── Completa informacion faltante
  └── Di "listo para entregar"

Lunes siguiente:
  └── Equipo tecnico recibe documento y hace preguntas de clarificacion
```

---

## Preguntas Frecuentes

**¿Puedo agregar items en diferentes conversaciones?**
Si, pero es mejor usar la misma conversacion para mantener contexto. Si cierras el chat, di "ver documento" al inicio para que Gemini recuerde donde ibamos.

**¿Que pasa si no tengo capturas?**
Esta bien. Describe el problema lo mejor que puedas. Gemini te ayudara a detallar la ubicacion con preguntas.

**¿Puedo agregar items urgentes a mitad de sprint?**
Si. Marcalo con prioridad 5 y menciona que es urgente. El equipo tecnico decidira si puede incluirlo.

**¿Que hago si el equipo tecnico no entiende algo?**
Ellos te haran preguntas de clarificacion. Puedes volver al Gem y agregar mas detalles si es necesario.

---

## Contacto

Si tienes dudas sobre como usar este sistema, contacta al equipo tecnico.
