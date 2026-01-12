# Notas de testing en QA - Happy Dreamers

**Fecha:** 2026-01-12

### TEST A: Duraciones Positivas en Tabla (FIX DURACIONES NEGATIVAS)

- Se validó cambio en perfil user pero las columnas adicionales agregadas sólo se ven en desktop view, en mobile view no aparecen.

### TEST B: Registro Manual NO Afecta Botones En Vivo

- En registro manuales de evento el modal no muestra captura de fecha y hora de término del evento (y en siesta lo muestra si se selecciona un checkbox opcional).

- Cambio de texto en modal de dormir y siesta, en lugar de "hora de dormir" que diga "hora de acostarse".

### TEST C: endTime se Calcula en Registro En Vivo

- Captura de alimentación en biberón asume duración default de 15 min.

- Validar cómo asumir la hora de evento rápido en la que se captura un evento, si se toma siempre como hora inicio, como hora fin, o debería preguntarme cuál de las dos sería.

### TEST 1: Bug UTC en Edicion de Eventos (CORREGIDO)

- Edición de eventos ya modifica horarios, falta mostrar campos de fecha y hora en color normal en lugar de color gris que hace pensar que los campos están bloqueados y no se pueden editar.

